import { IsNotEmpty, IsOptional, IsString, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TemplateChannel, WhatsAppCategory } from '@prisma/client';

export class CreateTemplateDto {
  @ApiProperty({ enum: TemplateChannel, example: TemplateChannel.SMS })
  @IsEnum(TemplateChannel)
  channel: TemplateChannel;

  @ApiProperty({ example: 'Weekend VIP Special Offer' })
  @IsString()
  @IsNotEmpty({ message: 'Template name is required' })
  name: string;

  @ApiPropertyOptional({ enum: WhatsAppCategory })
  @IsEnum(WhatsAppCategory)
  @IsOptional()
  category?: WhatsAppCategory;

  @ApiPropertyOptional({ default: 'en' })
  @IsString()
  @IsOptional()
  language?: string;

  @ApiPropertyOptional({ example: 'Exclusive Experience Offer for {{customer_name}}' })
  @IsString()
  @IsOptional()
  subject?: string;

  @ApiProperty({ example: 'Hi {{customer_name}}, enjoy 20% off your next visit at {{vendor_name}}!' })
  @IsString()
  @IsNotEmpty({ message: 'Content body is required' })
  content: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  plainTextContent?: string;
}

export class UpdateTemplateDto {
  @ApiPropertyOptional({ example: 'Weekend Special Offer v2' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ enum: WhatsAppCategory })
  @IsEnum(WhatsAppCategory)
  @IsOptional()
  category?: WhatsAppCategory;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  language?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  subject?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  content?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  plainTextContent?: string;
}
