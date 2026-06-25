import { BroadcastStatus, BroadcastTargetAudience } from '../entities/broadcast.entity';

export class BroadcastResponseDto {
  id: string;
  adminId: string;
  subject: string;
  body: string;
  targetAudience: BroadcastTargetAudience;
  targetUserIds: string[] | null;
  status: BroadcastStatus;
  sentAt: Date | null;
  recipientCount: number;
  createdAt: Date;
  updatedAt: Date;
  admin?: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
  };
}