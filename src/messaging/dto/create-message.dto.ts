import { IsString, IsUUID, IsOptional, IsArray, IsEnum } from 'class-validator';
import { MessageType } from '../entities/message.entity';

export class CreateMessageDto {
  @IsUUID()
  conversationId: string;

  @IsUUID()
  senderId: string;

  @IsUUID()
  @IsOptional()
  recipientId?: string;

  @IsString()
  body: string;

  @IsArray()
  @IsOptional()
  attachmentKeys?: string[];

  @IsEnum(MessageType)
  @IsOptional()
  type?: MessageType;

  @IsUUID()
  @IsOptional()
  broadcastId?: string;
}