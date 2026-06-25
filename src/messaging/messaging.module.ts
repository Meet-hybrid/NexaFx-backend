import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { MessagingController } from './messaging.controller';
import { MessagingService } from './messaging.service';
import { MessagingGateway } from './messaging.gateway';
import { BroadcastProcessor } from './broadcast.processor';
import { Message } from './entities/message.entity';
import { Broadcast } from './entities/broadcast.entity';
import { User } from '../users/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Message, Broadcast, User]),
    BullModule.registerQueue({
      name: 'broadcast-queue',
    }),
  ],
  controllers: [MessagingController],
  providers: [MessagingService, MessagingGateway, BroadcastProcessor],
  exports: [MessagingService, MessagingGateway],
})
export class MessagingModule {}
