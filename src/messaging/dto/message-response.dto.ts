import { MessageType } from '../entities/message.entity';

export class MessageResponseDto {
  id: string;
  conversationId: string;
  senderId: string;
  recipientId: string | null;
  body: string;
  attachmentKeys: string[] | null;
  isRead: boolean;
  readAt: Date | null;
  type: MessageType;
  broadcastId: string | null;
  createdAt: Date;
  sender?: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
  };
}

export class ConversationPreviewDto {
  conversationId: string;
  participant: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
  };
  lastMessage: MessageResponseDto;
  unreadCount: number;
}