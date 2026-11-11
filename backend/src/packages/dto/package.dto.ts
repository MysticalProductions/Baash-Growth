import { IsEnum, IsInt, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { WalletChannel, PackageStatus } from '@prisma/client';
import { Type } from 'class-transformer';

export class CreatePackageDto {
  @ApiProperty({ example: 'SMS Growth Package' })
  @IsString()
  @IsNotEmpty({ message: 'Package name is required' })
  name: string;

  @ApiProperty({ enum: WalletChannel, example: WalletChannel.SMS })
  @IsEnum(WalletChannel)
  channel: WalletChannel;

  @ApiProperty({ example: 5000, description: 'Number of communication credits' })
  @Type(() => Number)
  @IsInt()
  @IsPositive({ message: 'Credits must be a positive integer' })
  credits: number;

  @ApiProperty({ example: 1199, description: 'Base price in INR excluding GST' })
  @Type(() => Number)
  @IsNumber()
  @IsPositive({ message: 'Price must be a positive number' })
  price: number;

  @ApiPropertyOptional({ example: 18.0, default: 18.0, description: 'GST percentage rate' })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  gstPercentage?: number = 18.0;

  @ApiPropertyOptional({ example: 'Ideal for growing businesses running weekly promotional SMS broadcasts' })
  @IsString()
  @IsOptional()
  description?: string;
}

export class UpdatePackageDto {
  @ApiPropertyOptional({ example: 'SMS Growth Package Updated' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ enum: WalletChannel })
  @IsEnum(WalletChannel)
  @IsOptional()
  channel?: WalletChannel;

  @ApiPropertyOptional({ example: 6000 })
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  @IsOptional()
  credits?: number;

  @ApiPropertyOptional({ example: 1299 })
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  @IsOptional()
  price?: number;

  @ApiPropertyOptional({ example: 18.0 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  gstPercentage?: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ enum: PackageStatus })
  @IsEnum(PackageStatus)
  @IsOptional()
  status?: PackageStatus;
}

export class UpdatePackageStatusDto {
  @ApiProperty({ enum: PackageStatus, example: PackageStatus.ACTIVE })
  @IsEnum(PackageStatus)
  status: PackageStatus;
}
