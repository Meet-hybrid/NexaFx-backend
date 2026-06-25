import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UseGuards, Logger, forwardRef, Inject } from '@nestjs/common';
import { WsJwtGuard } from '../gateways/ws-jwt.guard';
import { MessagingService } from './messaging.service';

@WebSocketGateway({
  namespace: '/messages',
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3001',
    credentials: true,
  },
})
@UseGuards(WsJwtGuard)
export class MessagingGateway implements OnGatewayInit {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(MessagingGateway.name);

  constructor(
    @Inject(forwardRef(() => MessagingService))
    private readonly messagingService: MessagingService,
  ) {}

  afterInit() {
    this.logger.log('MessagingGateway initialized');
  }

  @SubscribeMessage('subscribe')
  async handleSubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { userId?: string },
  ) {
    const userId = client.handshake.auth?.userId || data?.userId;
    if (!userId) {
      client.emit('error', { message: 'User ID is required' });
      return;
    }
    client.join(`user:${userId}`);
    this.messagingService.recordUserConnection(userId);
    this.logger.log(`Client ${client.id} subscribed to user:${userId}`);
  }

  @SubscribeMessage('unsubscribe')
  async handleUnsubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { userId?: string },
  ) {
    const userId = client.handshake.auth?.userId || data?.userId;
    if (!userId) return;
    client.leave(`user:${userId}`);
    this.logger.log(`Client ${client.id} unsubscribed from user:${userId}`);
  }

  async emitNewMessage(message: any) {
    this.server.to(`user:${message.recipientId}`).emit('message.new', message);
    this.logger.debug(`Emitted message.new to user:${message.recipientId}`);
  }
}
