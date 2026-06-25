import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/user.entity';

export enum MessageType {
  DIRECT = 'DIRECT',
  BROADCAST = 'BROADCAST',
}

@Entity('messages')
@Index(['senderId', 'recipientId', 'createdAt'])
@Index(['recipientId', 'isRead'])
export class Message {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  conversationId: string;

  @Column('uuid')
  @Index()
  senderId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'senderId' })
  sender: User;

  @Column('uuid', { nullable: true })
  recipientId: string | null;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'recipientId' })
  recipient: User;

  @Column('text')
  body: string;

  @Column('text', { nullable: true })
  attachmentKeys: string[] | null;

  @Column('boolean', { default: false })
  isRead: boolean;

  @Column('timestamp with time zone', { nullable: true })
  readAt: Date | null;

  @Column({
    type: 'enum',
    enum: MessageType,
    default: MessageType.DIRECT,
  })
  type: MessageType;

  @Column('uuid', { nullable: true })
  broadcastId: string | null;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;
}