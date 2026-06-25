import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { MessagingService } from '../messaging/messaging.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/user.entity';
import { CreateBroadcastDto } from '../messaging/dto/create-broadcast.dto';

@ApiTags('Admin Messages')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin')
export class AdminMessagingController {
  constructor(private readonly messagingService: MessagingService) {}

  @Get('messages')
  @ApiOperation({ summary: 'List all user conversations with unread indicators' })
  @ApiResponse({ status: 200, description: 'Returns admin conversation list' })
  async getConversations(@Request() req) {
    return this.messagingService.getAdminConversations(req.user.userId);
  }

  @Post('messages/:userId')
  @ApiOperation({ summary: 'Send direct message to a user' })
  @ApiParam({ name: 'userId', type: String, description: 'User UUID' })
  @ApiResponse({ status: 201, description: 'Message sent successfully' })
  async sendMessage(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() body: { message: string; attachmentKeys?: string[] },
    @Request() req,
  ) {
    return this.messagingService.createDirectMessage(
      req.user.userId,
      userId,
      body.message,
      body.attachmentKeys,
    );
  }

  @Get('messages/:userId/history')
  @ApiOperation({ summary: 'Get full conversation history with a specific user' })
  @ApiParam({ name: 'userId', type: String, description: 'User UUID' })
  @ApiResponse({ status: 200, description: 'Returns conversation history' })
  async getUserHistory(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 50,
    @Request() req,
  ) {
    return this.messagingService.getUserConversationHistory(req.user.userId, userId, page, limit);
  }

  @Post('broadcasts')
  @ApiOperation({ summary: 'Create and send broadcast announcement' })
  @ApiResponse({ status: 201, description: 'Broadcast created and sent' })
  async createBroadcast(@Body() dto: CreateBroadcastDto, @Request() req) {
    return this.messagingService.createBroadcast(req.user.userId, dto);
  }

  @Get('broadcasts')
  @ApiOperation({ summary: 'List broadcasts with recipient count and status' })
  @ApiResponse({ status: 200, description: 'Returns broadcasts list' })
  async getBroadcasts() {
    return this.messagingService.getBroadcasts();
  }
}
