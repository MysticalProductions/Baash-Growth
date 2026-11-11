import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsArray,
  IsEnum,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { VendorUserStatus } from '@prisma/client';

export class InviteStaffDto {
  @ApiProperty({ example: 'staff.member@acme.com' })
  @IsEmail({}, { message: 'A valid email address is required' })
  @IsNotEmpty({ message: 'Email address is required' })
  email: string;

  @ApiPropertyOptional({ example: 'VENDOR_STAFF' })
  @IsString()
  @IsOptional()
  roleName?: string;

  @ApiPropertyOptional({
    example: ['customer:read', 'customer:write', 'campaign:read', 'campaign:write'],
    description: 'Specific permissions assigned to the invited staff member',
  })
  @IsArray()
  @IsOptional()
  permissions?: string[];
}

export class AcceptInvitationDto {
  @ApiProperty({ example: 'inv-tok-9843b...' })
  @IsString()
  @IsNotEmpty({ message: 'Invitation token is required' })
  token: string;

  @ApiProperty({ example: 'Kavita Rao' })
  @IsString()
  @IsNotEmpty({ message: 'Full name is required' })
  fullName: string;

  @ApiProperty({ example: 'SecureStaff@2026' })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  password: string;

  @ApiPropertyOptional({ example: '+91 91234 56789' })
  @IsString()
  @IsOptional()
  phone?: string;
}

export class UpdateStaffDto {
  @ApiPropertyOptional({ example: 'Kavita Rao' })
  @IsString()
  @IsOptional()
  fullName?: string;

  @ApiPropertyOptional({ example: '+91 91234 56789' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ example: ['customer:read', 'campaign:read'] })
  @IsArray()
  @IsOptional()
  permissions?: string[];
}

export class UpdateStaffStatusDto {
  @ApiProperty({ enum: VendorUserStatus, example: VendorUserStatus.ACTIVE })
  @IsEnum(VendorUserStatus, { message: 'Valid status is required (ACTIVE, INACTIVE, SUSPENDED)' })
  status: VendorUserStatus;
}
