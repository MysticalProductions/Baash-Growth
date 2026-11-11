import { IsEmail, IsNotEmpty, IsOptional, IsString, IsEnum, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { VendorStatus } from '@prisma/client';

const emptyStringToUndefined = ({ value }: { value: any }) =>
  value === '' || value === null || value === 'none' || value === undefined ? undefined : value;

export class CreateVendorDto {
  @ApiProperty({ example: 'Sunset Rooftop Lounge' })
  @IsString()
  @IsNotEmpty({ message: 'Business name is required' })
  businessName: string;

  @ApiProperty({ example: 'contact@sunsetlounge.in' })
  @IsEmail({}, { message: 'Valid business email is required' })
  @IsNotEmpty({ message: 'Business email is required' })
  businessEmail: string;

  @ApiPropertyOptional({ example: '+91 98765 12345' })
  @IsString()
  @IsOptional()
  @Transform(emptyStringToUndefined)
  businessPhone?: string;

  @ApiPropertyOptional({ example: 'https://images.unsplash.com/...' })
  @IsString()
  @IsOptional()
  @Transform(emptyStringToUndefined)
  businessLogo?: string;

  @ApiPropertyOptional({ example: 'Koramangala 4th Block, Bangalore' })
  @IsString()
  @IsOptional()
  @Transform(emptyStringToUndefined)
  businessAddress?: string;

  @ApiPropertyOptional({ enum: VendorStatus, default: VendorStatus.ACTIVE })
  @IsEnum(VendorStatus)
  @IsOptional()
  status?: VendorStatus;

  // Initial Vendor Admin credentials
  @ApiProperty({ example: 'Rohit Verma' })
  @IsString()
  @IsNotEmpty({ message: 'Admin contact person full name is required' })
  adminName: string;

  @ApiProperty({ example: 'rohit@sunsetlounge.in' })
  @IsEmail({}, { message: 'Valid admin login email is required' })
  @IsNotEmpty({ message: 'Admin login email is required' })
  adminEmail: string;

  @ApiPropertyOptional({ example: 'SunsetAdmin@2026' })
  @IsString()
  @IsOptional()
  @Transform(emptyStringToUndefined)
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  adminPassword?: string;
}

export class UpdateVendorDto {
  @ApiPropertyOptional({ example: 'Sunset Rooftop Lounge & Bar' })
  @IsString()
  @IsOptional()
  businessName?: string;

  @ApiPropertyOptional({ example: 'contact@sunsetlounge.in' })
  @IsEmail()
  @IsOptional()
  businessEmail?: string;

  @ApiPropertyOptional({ example: '+91 98765 12345' })
  @IsString()
  @IsOptional()
  @Transform(emptyStringToUndefined)
  businessPhone?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @Transform(emptyStringToUndefined)
  businessLogo?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @Transform(emptyStringToUndefined)
  businessAddress?: string;
}

export class UpdateVendorStatusDto {
  @ApiProperty({ enum: VendorStatus, example: VendorStatus.ACTIVE })
  @IsEnum(VendorStatus, { message: 'Valid status is required (ACTIVE, INACTIVE, SUSPENDED, PENDING)' })
  status: VendorStatus;

  @ApiPropertyOptional({ example: 'Account activated following KYC review' })
  @IsString()
  @IsOptional()
  @Transform(emptyStringToUndefined)
  reason?: string;
}
