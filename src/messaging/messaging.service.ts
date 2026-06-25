import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Repository, In } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Message, MessageType } from './entities/message.entity';
import { Broadcast, BroadcastTargetAudience, BroadcastStatus } from './entities/broadcast.entity';
import { CreateMessageDto } from './dto/create-message.dto';
import { CreateBroadcastDto } from './dto/create-broadcast.dto';
import { MessageResponseDto, ConversationPreviewDto } from './dto/message-response.dto';
import { BroadcastResponseDto } from './dto/broadcast-response.dto';
import { User, UserRole, UserKycTier } from '../users/user.entity';
import FormData from 'form-data';
import Mailgun from 'mailgun.js';
import { ConfigService } from '@nestjs/config';
import { forwardRef, Inject } from '@nestjs/common';
import { MessagingGateway } from './messaging.gateway';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

@Injectable()
export class MessagingService {
  private readonly logger = new Logger(MessagingService.name);
  private userLastConnected: Map<string, Date> = new Map();

  constructor(
    @InjectRepository(Message)
    private messageRepository: Repository<Message>,
    @InjectRepository(Broadcast)
    private broadcastRepository: Repository<Broadcast>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private configService: ConfigService,
    @Inject(forwardRef(() => MessagingGateway))
    private messagingGateway: MessagingGateway,
    @InjectQueue('broadcast-queue')
    private broadcastQueue: Queue,
  ) {}

  async createDirectMessage(
    adminId: string,
    userId: string,
    body: string,
    attachmentKeys?: string[],
  ): Promise<MessageResponseDto> {
    const conversationId = this.generateConversationId(adminId, userId);

    const message = this.messageRepository.create({
      conversationId,
      senderId: adminId,
      recipientId: userId,
      body,
      attachmentKeys,
      type: MessageType.DIRECT,
    });

    const saved = await this.messageRepository.save(message);

    const messageDto = this.toMessageResponseDto(saved);
    this.messagingGateway.emitNewMessage(messageDto).catch((err) => {
      this.logger.error('Failed to emit WebSocket message:', err);
    });

    const isOffline = this.isUserOffline(userId);
    if (isOffline) {
      const user = await this.userRepository.findOne({ where: { id: userId } });
      if (user) {
        await this.sendDirectMessageEmail(user.email, body);
      }
    }

    return messageDto;
  }

  recordUserConnection(userId: string): void {
    this.userLastConnected.set(userId, new Date());
  }

  private isUserOffline(userId: string): boolean {
    const lastConnected = this.userLastConnected.get(userId);
    if (!lastConnected) return true;
    return Date.now() - lastConnected.getTime() > 5 * 60 * 1000;
  }

  async getUserConversations(userId: string): Promise<ConversationPreviewDto[]> {
    const messages = await this.messageRepository.find({
      where: { recipientId: userId },
      order: { createdAt: 'DESC' },
    });

    const conversationMap = new Map<string, Message[]>();
    for (const msg of messages) {
      const existing = conversationMap.get(msg.conversationId) || [];
      existing.push(msg);
      conversationMap.set(msg.conversationId, existing);
    }

    const uniqueParticipants = new Set<string>();
    for (const msgs of conversationMap.values()) {
      if (msgs[0].senderId !== userId) uniqueParticipants.add(msgs[0].senderId);
    }

    const participants = await this.userRepository.find({
      where: { id: In(Array.from(uniqueParticipants)) },
    });

    const participantMap = new Map<string, User>();
    participants.forEach((p) => participantMap.set(p.id, p));

    return Array.from(conversationMap.entries()).map(([conversationId, msgs]) => {
      const participantId = msgs[0].senderId !== userId ? msgs[0].senderId : msgs[0].recipientId;
      const participant = participantMap.get(participantId) || null;
      const unreadCount = msgs.filter((m) => !m.isRead && m.recipientId === userId).length;

      return {
        conversationId,
        participant: participant
          ? {
              id: participant.id,
              email: participant.email,
              firstName: participant.firstName,
              lastName: participant.lastName,
            }
          : null,
        lastMessage: this.toMessageResponseDto(msgs[0]),
        unreadCount,
      };
    });
  }

  async getConversationHistory(
    conversationId: string,
    userId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<{
    data: MessageResponseDto[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const messages = await this.messageRepository.find({
      where: { conversationId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    const total = await this.messageRepository.count({ where: { conversationId } });

    return {
      data: messages.map((m) => this.toMessageResponseDto(m)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async markConversationAsRead(conversationId: string, userId: string): Promise<{ updated: number }> {
    const result = await this.messageRepository.update(
      { conversationId, recipientId: userId, isRead: false },
      { isRead: true, readAt: new Date() },
    );
    return { updated: result.affected || 0 };
  }

  async getUnreadCount(userId: string): Promise<{ count: number }> {
    const count = await this.messageRepository.count({
      where: { recipientId: userId, isRead: false },
    });
    return { count };
  }

  async getAdminConversations(adminId: string): Promise<ConversationPreviewDto[]> {
    const messages = await this.messageRepository.find({
      where: { senderId: adminId },
      order: { createdAt: 'DESC' },
    });

    const conversationMap = new Map<string, Message[]>();
    for (const msg of messages) {
      const existing = conversationMap.get(msg.conversationId) || [];
      existing.push(msg);
      conversationMap.set(msg.conversationId, existing);
    }

    const uniqueParticipants = new Set<string>();
    for (const msgs of conversationMap.values()) {
      if (msgs[0].recipientId) uniqueParticipants.add(msgs[0].recipientId);
    }

    const participants = await this.userRepository.find({
      where: { id: In(Array.from(uniqueParticipants)) },
    });

    const participantMap = new Map<string, User>();
    participants.forEach((p) => participantMap.set(p.id, p));

    return Array.from(conversationMap.entries()).map(([conversationId, msgs]) => {
      const participantId = msgs[0].recipientId;
      const participant = participantMap.get(participantId) || null;
      const unreadCount = msgs.filter((m) => !m.isRead && m.recipientId === adminId).length;

      return {
        conversationId,
        participant: participant
          ? {
              id: participant.id,
              email: participant.email,
              firstName: participant.firstName,
              lastName: participant.lastName,
            }
          : null,
        lastMessage: this.toMessageResponseDto(msgs[0]),
        unreadCount,
      };
    });
  }

  async getUserConversationHistory(
    adminId: string,
    userId: string,
    page: number = 1,
    limit: number = 50,
  ): Promise<{
    data: MessageResponseDto[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const conversationId = this.generateConversationId(adminId, userId);
    return this.getConversationHistory(conversationId, adminId, page, limit);
  }

  async createBroadcast(
    adminId: string,
    dto: CreateBroadcastDto,
  ): Promise<BroadcastResponseDto> {
    let targetUserIds: string[] | null = null;
    let recipientCount = 0;

    if (dto.targetAudience === BroadcastTargetAudience.SPECIFIC_USERS && dto.targetUserIds) {
      targetUserIds = dto.targetUserIds;
      recipientCount = dto.targetUserIds.length;
    }

    const broadcast = this.broadcastRepository.create({
      adminId,
      subject: dto.subject,
      body: dto.body,
      targetAudience: dto.targetAudience,
      targetUserIds,
      status: BroadcastStatus.DRAFT,
      recipientCount,
    });

    const saved = await this.broadcastRepository.save(broadcast);

    await this.broadcastQueue.add(
      'process-broadcast',
      { broadcastId: saved.id },
      { attempts: 3, backoff: { type: 'exponential', delay: 1000 } },
    );

    return this.toBroadcastResponseDto(saved);
  }

  async getBroadcasts(): Promise<BroadcastResponseDto[]> {
    const broadcasts = await this.broadcastRepository.find({
      order: { createdAt: 'DESC' },
    });
    return broadcasts.map((b) => this.toBroadcastResponseDto(b));
  }

  private generateConversationId(userId1: string, userId2: string): string {
    return [userId1, userId2].sort().join('-');
  }

  private generateBroadcastConversationId(broadcastId: string, userId: string): string {
    return `broadcast-${broadcastId}-${userId}`;
  }

  private async getEmailPreference(userId: string): Promise<boolean> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    return !!user;
  }

  private async sendBroadcastEmail(to: string, subject: string, body: string): Promise<void> {
    await this.sendEmail(to, subject, body);
  }

  private async sendDirectMessageEmail(to: string, body: string): Promise<void> {
    const subject = 'New message from NexaFX admin';
    await this.sendEmail(to, subject, body);
  }

  private async sendEmail(to: string, subject: string, body: string): Promise<void> {
    const apiKey = this.configService.get<string>('MAILGUN_API_KEY');
    const domain = this.configService.get<string>('MAILGUN_DOMAIN');
    const fromEmail = this.configService.get<string>('MAILGUN_FROM_EMAIL');

    if (!apiKey || !domain || !fromEmail) {
      this.logger.warn('Mailgun configuration not set, skipping email');
      return;
    }

    const skipEmail = this.configService.get<string>('SKIP_EMAIL_SENDING');
    if (skipEmail === 'true') {
      this.logger.log(`[MESSAGING DEV] Email would be sent to ${to}: ${subject}`);
      return;
    }

    try {
      const mailgun = new Mailgun(FormData);
      const client = mailgun.client({ username: 'api', key: apiKey });

      await client.messages.create(domain, {
        from: `NexaFX <${fromEmail}>`,
        to,
        subject,
        text: body,
      });

      this.logger.log(`Email sent to ${to}`);
    } catch (error) {
      this.logger.error(`Failed to send email to ${to}:`, error);
    }
  }

  private toMessageResponseDto(message: Message): MessageResponseDto {
    return {
      id: message.id,
      conversationId: message.conversationId,
      senderId: message.senderId,
      recipientId: message.recipientId,
      body: message.body,
      attachmentKeys: message.attachmentKeys,
      isRead: message.isRead,
      readAt: message.readAt,
      type: message.type,
      broadcastId: message.broadcastId,
      createdAt: message.createdAt,
    };
  }

  private toBroadcastResponseDto(broadcast: Broadcast): BroadcastResponseDto {
    return {
      id: broadcast.id,
      adminId: broadcast.adminId,
      subject: broadcast.subject,
      body: broadcast.body,
      targetAudience: broadcast.targetAudience,
      targetUserIds: broadcast.targetUserIds,
      status: broadcast.status,
      sentAt: broadcast.sentAt,
      recipientCount: broadcast.recipientCount,
      createdAt: broadcast.createdAt,
      updatedAt: broadcast.updatedAt,
    };
  }
}