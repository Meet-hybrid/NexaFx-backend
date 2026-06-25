import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/user.entity';

export enum BroadcastTargetAudience {
  ALL = 'ALL',
  KYC_APPROVED = 'KYC_APPROVED',
  UNVERIFIED = 'UNVERIFIED',
  SPECIFIC_USERS = 'SPECIFIC_USERS',
}

export enum BroadcastStatus {
  DRAFT = 'DRAFT',
  SENT = 'SENT',
}

@Entity('broadcasts')
@Index(['adminId', 'createdAt'])
export class Broadcast {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  adminId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'adminId' })
  admin: User;

  @Column('varchar', { length: 255 })
  subject: string;

  @Column('text')
  body: string;

  @Column({
    type: 'enum',
    enum: BroadcastTargetAudience,
  })
  targetAudience: BroadcastTargetAudience;

  @Column('uuid', { array: true, nullable: true })
  targetUserIds: string[] | null;

  @Column({
    type: 'enum',
    enum: BroadcastStatus,
    default: BroadcastStatus.DRAFT,
  })
  status: BroadcastStatus;

  @Column('timestamp with time zone', { nullable: true })
  sentAt: Date | null;

  @Column('int', { default: 0 })
  recipientCount: number;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt: Date;
}
