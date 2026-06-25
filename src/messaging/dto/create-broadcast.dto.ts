import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsArray,
  IsUUID,
} from 'class-validator';
import { BroadcastTargetAudience } from '../entities/broadcast.entity';

export class CreateBroadcastDto {
  @IsString()
  @IsNotEmpty()
  subject: string;

  @IsString()
  @IsNotEmpty()
  body: string;

  @IsEnum(BroadcastTargetAudience)
  targetAudience: BroadcastTargetAudience;

  @IsArray()
  @IsUUID(undefined, { each: true })
  @IsOptional()
  targetUserIds?: string[];
}