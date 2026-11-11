import { IsEmail, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateVendorProfileDto {
  @ApiPropertyOptional({ example: 'Acme Experience Studio Ltd.' })
  @IsString()
  @IsOptional()
  businessName?: string;

  @ApiPropertyOptional({ example: 'contact@acme.com' })
  @IsEmail()
  @IsOptional()
  businessEmail?: string;

  @ApiPropertyOptional({ example: '+91 98765 43210' })
  @IsString()
  @IsOptional()
  businessPhone?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  businessLogo?: string;

  @ApiPropertyOptional({ example: '100 Feet Rd, Indiranagar, Bengaluru' })
  @IsString()
  @IsOptional()
  businessAddress?: string;
}
