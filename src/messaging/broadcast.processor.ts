import { Processor, WorkerHost } from '@nestjs/bull';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Logger } from '@nestjs/common';
import { Broadcast } from '../entities/broadcast.entity';
import { Message, MessageType } from '../entities/message.entity';
import { User } from '../users/user.entity';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { In } from 'typeorm';

@Processor('broadcast-queue')
export class BroadcastProcessor extends WorkerHost {
  private readonly logger = new Logger(BroadcastProcessor.name);

  constructor(
    @InjectRepository(Broadcast)
    private broadcastRepository: Repository<Broadcast>,
    @InjectRepository(Message)
    private messageRepository: Repository<Message>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {
    super();
  }

  async process(job: { data: { broadcastId: string } }) {
    const { broadcastId } = job.data;
    this.logger.log(`Processing broadcast ${broadcastId}`);

    const broadcast = await this.broadcastRepository.findOne({
      where: { id: broadcastId },
    });
    if (!broadcast) {
      this.logger.warn(`Broadcast ${broadcastId} not found`);
      return;
    }

    const users = await this.getTargetUsers(
      broadcast.targetAudience,
      broadcast.targetUserIds,
    );

    const messages = users.map((user) =>
      this.messageRepository.create({
        conversationId: `broadcast-${broadcastId}-${user.id}`,
        senderId: broadcast.adminId,
        recipientId: user.id,
        body: broadcast.body,
        type: MessageType.BROADCAST,
        broadcastId,
      }),
    );

    await this.messageRepository.save(messages);
    await this.broadcastRepository.update(broadcastId, {
      recipientCount: users.length,
      status: 'SENT',
    });

    this.logger.log(
      `Broadcast ${broadcastId} sent to ${users.length} users`,
    );
  }

  private async getTargetUsers(
    targetAudience: string,
    targetUserIds?: string[],
  ): Promise<User[]> {
    if (targetAudience === 'SPECIFIC_USERS' && targetUserIds) {
      return this.userRepository.find({ where: { id: In(targetUserIds) } });
    }

    if (targetAudience === 'ALL') {
      return this.userRepository.find();
    }

    if (targetAudience === 'KYC_APPROVED') {
      return this.userRepository.find({ where: { kycTier: 'FULL' } });
    }

    if (targetAudience === 'UNVERIFIED') {
      return this.userRepository.find({ where: { kycTier: 'UNVERIFIED' } });
    }

    return [];
  }
}
