import {
  IsString,
  IsEnum,
  IsOptional,
  Matches,
  IsArray,
  IsBoolean,
  IsDateString,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { WalletChannel, AudienceType, CampaignStatus } from '@prisma/client';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const emptyStringToUndefined = ({ value }: { value: any }) =>
  value === '' || value === null || value === 'none' || value === undefined ? undefined : value;

const emptyArrayToUndefined = ({ value }: { value: any }) =>
  !value || (Array.isArray(value) && value.length === 0) ? undefined : value;

export class CreateCampaignDto {
  @ApiProperty({ description: 'Campaign name', example: 'Summer Special Festival Offer' })
  @IsString()
  @MinLength(3)
  name: string;

  @ApiProperty({ enum: WalletChannel, description: 'Channel (SMS, WHATSAPP, EMAIL)', example: 'WHATSAPP' })
  @IsEnum(WalletChannel)
  channel: WalletChannel;

  @ApiPropertyOptional({ description: 'Optional Message Template ID' })
  @IsOptional()
  @Transform(emptyStringToUndefined)
  @Matches(UUID_REGEX, { message: 'templateId must be a valid UUID' })
  templateId?: string;

  @ApiPropertyOptional({ description: 'Email subject line (required for Email campaigns)' })
  @ValidateIf((o) => o.channel === WalletChannel.EMAIL)
  @Transform(emptyStringToUndefined)
  @IsString()
  subject?: string;

  @ApiProperty({ description: 'Campaign message body (or template fallback)' })
  @IsString()
  @MinLength(1)
  content: string;

  @ApiProperty({ enum: AudienceType, description: 'Audience targeting type', example: 'ALL_CUSTOMERS' })
  @IsEnum(AudienceType)
  audienceType: AudienceType;

  @ApiPropertyOptional({ description: 'Customer Segment ID when audienceType is SEGMENT' })
  @IsOptional()
  @Transform(emptyStringToUndefined)
  @Matches(UUID_REGEX, { message: 'segmentId must be a valid UUID' })
  segmentId?: string;

  @ApiPropertyOptional({ description: 'Customer Tag IDs when audienceType is TAGS', type: [String] })
  @IsOptional()
  @Transform(emptyArrayToUndefined)
  @IsArray()
  tagIds?: string[];

  @ApiPropertyOptional({ description: 'Manual Customer IDs when audienceType is MANUAL', type: [String] })
  @IsOptional()
  @Transform(emptyArrayToUndefined)
  @IsArray()
  customerIds?: string[];

  @ApiPropertyOptional({ description: 'Scheduled dispatch ISO timestamp' })
  @IsOptional()
  @Transform(emptyStringToUndefined)
  @IsDateString()
  scheduledAt?: string;

  @ApiPropertyOptional({ description: 'Whether to dispatch immediately upon creation', default: true })
  @IsOptional()
  @IsBoolean()
  sendImmediately?: boolean;
}

export class EstimateCampaignDto {
  @ApiProperty({ enum: WalletChannel, description: 'Channel', example: 'SMS' })
  @IsEnum(WalletChannel)
  channel: WalletChannel;

  @ApiPropertyOptional({ description: 'Template ID' })
  @IsOptional()
  @Transform(emptyStringToUndefined)
  @Matches(UUID_REGEX, { message: 'templateId must be a valid UUID' })
  templateId?: string;

  @ApiProperty({ description: 'Message content for segment calculation' })
  @IsString()
  content: string;

  @ApiProperty({ enum: AudienceType, description: 'Audience type', example: 'ALL_CUSTOMERS' })
  @IsEnum(AudienceType)
  audienceType: AudienceType;

  @ApiPropertyOptional({ description: 'Segment ID' })
  @IsOptional()
  @Transform(emptyStringToUndefined)
  @Matches(UUID_REGEX, { message: 'segmentId must be a valid UUID' })
  segmentId?: string;

  @ApiPropertyOptional({ description: 'Tag IDs', type: [String] })
  @IsOptional()
  @Transform(emptyArrayToUndefined)
  @IsArray()
  tagIds?: string[];

  @ApiPropertyOptional({ description: 'Customer IDs', type: [String] })
  @IsOptional()
  @Transform(emptyArrayToUndefined)
  @IsArray()
  customerIds?: string[];
}

export class CampaignFilterDto {
  @ApiPropertyOptional({ enum: WalletChannel })
  @IsOptional()
  @Transform(({ value }) => (!value || value === '' || value === 'ALL' ? undefined : value))
  @IsEnum(WalletChannel)
  channel?: WalletChannel;

  @ApiPropertyOptional({ enum: CampaignStatus })
  @IsOptional()
  @Transform(({ value }) => (!value || value === '' || value === 'ALL' ? undefined : value))
  @IsEnum(CampaignStatus)
  status?: CampaignStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(emptyStringToUndefined)
  @IsString()
  search?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Transform(({ value }) => (value ? parseInt(value, 10) : 1))
  page?: number;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Transform(({ value }) => (value ? parseInt(value, 10) : 20))
  limit?: number;
}

export class UpdateCampaignDto {
  @ApiPropertyOptional({ description: 'Campaign name' })
  @IsOptional()
  @IsString()
  @MinLength(3)
  name?: string;

  @ApiPropertyOptional({ description: 'Message body' })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({ description: 'Email subject' })
  @IsOptional()
  @Transform(emptyStringToUndefined)
  @IsString()
  subject?: string;

  @ApiPropertyOptional({ enum: AudienceType })
  @IsOptional()
  @IsEnum(AudienceType)
  audienceType?: AudienceType;

  @ApiPropertyOptional({ description: 'Segment ID' })
  @IsOptional()
  @Transform(emptyStringToUndefined)
  @Matches(UUID_REGEX, { message: 'segmentId must be a valid UUID' })
  segmentId?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @Transform(emptyArrayToUndefined)
  @IsArray()
  tagIds?: string[];
}

export class ScheduleCampaignDto {
  @ApiProperty({ description: 'Scheduled ISO timestamp', example: '2026-11-15T10:00:00.000Z' })
  @IsDateString()
  scheduledAt: string;
}

