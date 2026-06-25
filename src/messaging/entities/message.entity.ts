import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

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
  senderId: string;

  @Column('uuid', { nullable: true })
  recipientId: string;

  @Column('text')
  body: string;

  @Column('text', { nullable: true })
  attachmentKeys: string[];

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
  broadcastId: string;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;
}
