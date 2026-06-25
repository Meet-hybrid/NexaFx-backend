import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { User } from '../users/user.entity';
import { Transaction } from '../transactions/entities/transaction.entity';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { ReportsModule } from './reports/reports.module';
import { DataRequest } from '../users/entities/data-request.entity';
import { TransactionLimitsModule } from '../transactions/transaction-limits.module';
import { AdminMessagingController } from './admin-messaging.controller';
import { MessagingModule } from '../messaging/messaging.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Transaction, DataRequest]),
    AuditLogsModule,
    ReportsModule,
    TransactionLimitsModule,
    MessagingModule,
  ],
  controllers: [AdminController, AdminMessagingController],
  providers: [AdminService],
})
export class AdminModule {}
