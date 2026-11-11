import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsPositive, IsString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { WalletChannel, TransactionType, TransactionDirection } from '@prisma/client';
import { Type } from 'class-transformer';

export class WalletFilterDto {
  @ApiPropertyOptional({ enum: WalletChannel })
  @IsEnum(WalletChannel)
  @IsOptional()
  channel?: WalletChannel;

  @ApiPropertyOptional({ enum: TransactionType })
  @IsEnum(TransactionType)
  @IsOptional()
  type?: TransactionType;

  @ApiPropertyOptional({ enum: TransactionDirection })
  @IsEnum(TransactionDirection)
  @IsOptional()
  direction?: TransactionDirection;

  @ApiPropertyOptional({ example: '2026-01-01' })
  @IsString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({ example: '2026-12-31' })
  @IsString()
  @IsOptional()
  endDate?: string;

  @ApiPropertyOptional({ default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  limit?: number = 20;
}

export class AdjustWalletDto {
  @ApiProperty({ description: 'Target Vendor UUID' })
  @IsString()
  @IsNotEmpty({ message: 'Vendor ID is required' })
  vendorId: string;

  @ApiProperty({ enum: WalletChannel, example: WalletChannel.SMS })
  @IsEnum(WalletChannel)
  channel: WalletChannel;

  @ApiProperty({ example: 1000, description: 'Number of credits to adjust' })
  @Type(() => Number)
  @IsInt()
  @IsPositive({ message: 'Credits quantity must be a positive integer' })
  quantity: number;

  @ApiProperty({ enum: TransactionDirection, example: TransactionDirection.CREDIT })
  @IsEnum(TransactionDirection)
  action: TransactionDirection; // CREDIT or DEBIT

  @ApiProperty({
    example: 'Complimentary trial credit top-up authorized by Baash management',
    description: 'Mandatory reason for manual adjustment',
  })
  @IsString()
  @IsNotEmpty({ message: 'Mandatory adjustment reason is required' })
  reason: string;
}
