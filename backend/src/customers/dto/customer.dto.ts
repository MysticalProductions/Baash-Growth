import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsArray,
  IsEnum,
  IsBoolean,
  ValidateIf,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CustomerSource, Gender, ConsentStatus, ConsentChannel } from '@prisma/client';

export class CreateCustomerDto {
  @ApiProperty({ example: 'Aditya Sharma' })
  @IsString()
  @IsNotEmpty({ message: 'Customer name is required' })
  fullName: string;

  @ApiPropertyOptional({ example: '+91 98765 43210' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ example: 'aditya.sharma@gmail.com' })
  @IsEmail({}, { message: 'Invalid email address' })
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ enum: Gender, example: Gender.MALE })
  @IsEnum(Gender)
  @IsOptional()
  gender?: Gender;

  @ApiPropertyOptional({ example: '1995-08-15' })
  @IsString()
  @IsOptional()
  dateOfBirth?: string;

  @ApiPropertyOptional({ example: 'New Delhi' })
  @IsString()
  @IsOptional()
  city?: string;

  @ApiPropertyOptional({ example: 'Delhi' })
  @IsString()
  @IsOptional()
  state?: string;

  @ApiPropertyOptional({ enum: CustomerSource, default: CustomerSource.MANUAL_ENTRY })
  @IsEnum(CustomerSource)
  @IsOptional()
  source?: CustomerSource;

  @ApiPropertyOptional({ example: 'Prefers evening communications' })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({ example: ['c1b48b1c-...'] })
  @IsArray()
  @IsOptional()
  tagIds?: string[];

  @ApiPropertyOptional({ default: false })
  @IsBoolean()
  @IsOptional()
  allowDuplicateConfirmed?: boolean;
}

export class UpdateCustomerDto {
  @ApiPropertyOptional({ example: 'Aditya Sharma' })
  @IsString()
  @IsOptional()
  fullName?: string;

  @ApiPropertyOptional({ example: '+91 98765 43210' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ example: 'aditya.sharma@gmail.com' })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ enum: Gender })
  @IsEnum(Gender)
  @IsOptional()
  gender?: Gender;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  dateOfBirth?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  city?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  state?: string;

  @ApiPropertyOptional({ enum: CustomerSource })
  @IsEnum(CustomerSource)
  @IsOptional()
  source?: CustomerSource;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional()
  @IsArray()
  @IsOptional()
  tagIds?: string[];

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  allowDuplicateConfirmed?: boolean;
}

export class BulkDeleteDto {
  @ApiProperty({ example: ['uuid-1', 'uuid-2'] })
  @IsArray()
  @IsNotEmpty({ message: 'Customer IDs array is required' })
  customerIds: string[];
}

export class BulkTagDto {
  @ApiProperty({ example: ['uuid-1', 'uuid-2'] })
  @IsArray()
  @IsNotEmpty({ message: 'Customer IDs array is required' })
  customerIds: string[];

  @ApiProperty({ example: ['tag-uuid-1'] })
  @IsArray()
  @IsNotEmpty({ message: 'Tag IDs array is required' })
  tagIds: string[];

  @ApiPropertyOptional({ enum: ['add', 'remove', 'replace'], default: 'add' })
  @IsString()
  @IsOptional()
  action?: 'add' | 'remove' | 'replace';
}

export class UpdateConsentDto {
  @ApiProperty({ enum: ConsentChannel, example: ConsentChannel.SMS })
  @IsEnum(ConsentChannel)
  channel: ConsentChannel;

  @ApiProperty({ enum: ConsentStatus, example: ConsentStatus.OPTED_IN })
  @IsEnum(ConsentStatus)
  status: ConsentStatus;

  @ApiPropertyOptional({ example: 'Website opt-in checkbox' })
  @IsString()
  @IsOptional()
  source?: string;

  @ApiPropertyOptional({ example: 'Customer consented via booking form' })
  @IsString()
  @IsOptional()
  notes?: string;
}
