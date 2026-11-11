import { IsNotEmpty, IsOptional, IsString, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSegmentDto {
  @ApiProperty({ example: 'Delhi VIP Customers' })
  @IsString()
  @IsNotEmpty({ message: 'Segment name is required' })
  name: string;

  @ApiPropertyOptional({ example: 'Customers in Delhi with VIP tag and active WhatsApp consent' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    example: {
      city: 'Delhi',
      tagIds: ['vip-tag-id'],
      whatsAppConsent: 'OPTED_IN',
    },
  })
  @IsObject()
  @IsNotEmpty({ message: 'Filter rules object is required' })
  filters: Record<string, any>;
}

export class UpdateSegmentDto {
  @ApiPropertyOptional({ example: 'Delhi VIP Customers Updated' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  filters?: Record<string, any>;
}
