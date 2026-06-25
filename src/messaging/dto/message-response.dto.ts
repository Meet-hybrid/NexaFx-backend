import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class MessageResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  conversationId: string;

  @ApiProperty()
  senderId: string;

  @ApiProperty()
  recipientId: string;

  @ApiProperty()
  body: string;

  @ApiPropertyOptional()
  attachmentKeys?: string[];

  @ApiProperty()
  isRead: boolean;

  @ApiProperty()
  readAt: Date | null;

  @ApiProperty({ enum: ['DIRECT', 'BROADCAST'] })
  type: string;

  @ApiPropertyOptional()
  broadcastId?: string;

  @ApiProperty()
  createdAt: Date;
}

export class ConversationPreviewDto {
  @ApiProperty()
  conversationId: string;

  @ApiProperty()
  participant: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  } | null;

  @ApiProperty()
  lastMessage: MessageResponseDto;

  @ApiProperty()
  unreadCount: number;
}
