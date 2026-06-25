import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { MessagingService } from './messaging.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/user.entity';

@ApiTags('Messages')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('messages')
export class MessagingController {
  constructor(private readonly messagingService: MessagingService) {}

  @Get()
  @ApiOperation({ summary: 'List user conversations with latest message preview' })
  @ApiResponse({ status: 200, description: 'Returns conversation previews' })
  async getConversations(@Request() req) {
    return this.messagingService.getUserConversations(req.user.userId);
  }

  @Get(':conversationId')
  @ApiOperation({ summary: 'Get paginated message history for a conversation' })
  @ApiParam({ name: 'conversationId', type: String })
  @ApiResponse({ status: 200, description: 'Returns message history' })
  async getConversationHistory(
    @Param('conversationId') conversationId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
    @Request() req,
  ) {
    return this.messagingService.getConversationHistory(conversationId, req.user.userId, page, limit);
  }

  @Post(':conversationId/read')
  @ApiOperation({ summary: 'Mark all messages in conversation as read' })
  @ApiParam({ name: 'conversationId', type: String })
  @ApiResponse({ status: 200, description: 'Messages marked as read' })
  async markAsRead(@Param('conversationId') conversationId: string, @Request() req) {
    return this.messagingService.markConversationAsRead(conversationId, req.user.userId);
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get total unread message count' })
  @ApiResponse({ status: 200, description: 'Returns unread count' })
  async getUnreadCount(@Request() req) {
    return this.messagingService.getUnreadCount(req.user.userId);
  }
}