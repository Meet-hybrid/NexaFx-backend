import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class BroadcastResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  adminId: string;

  @ApiProperty()
  subject: string;

  @ApiProperty()
  body: string;

  @ApiProperty({ enum: ['ALL', 'KYC_APPROVED', 'UNVERIFIED', 'SPECIFIC_USERS'] })
  targetAudience: string;

  @ApiPropertyOptional({ type: [String] })
  targetUserIds?: string[];

  @ApiProperty({ enum: ['DRAFT', 'SENT'] })
  status: string;

  @ApiPropertyOptional()
  sentAt?: Date;

  @ApiProperty()
  recipientCount: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
