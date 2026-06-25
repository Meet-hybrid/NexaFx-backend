import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BroadcastTargetAudience } from '../entities/broadcast.entity';

export class CreateBroadcastDto {
  @ApiProperty()
  subject: string;

  @ApiProperty()
  body: string;

  @ApiProperty({ enum: BroadcastTargetAudience })
  targetAudience: BroadcastTargetAudience;

  @ApiPropertyOptional({ type: [String] })
  targetUserIds?: string[];
}
