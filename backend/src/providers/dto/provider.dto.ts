import { IsString, IsOptional, IsBoolean, IsEnum, IsNumber, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { WalletChannel } from '@prisma/client';

export class UpdateProviderConfigDto {
  @ApiProperty({ description: 'Provider identifier name', example: 'MSG91' })
  @IsString()
  providerName: string;

  @ApiProperty({ description: 'Channel credentials object' })
  credentials: Record<string, any>;

  @ApiPropertyOptional({ description: 'Whether this provider is currently active for dispatch' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Whether to force sandbox/simulation mode' })
  @IsOptional()
  @IsBoolean()
  isSandbox?: boolean;
}

export class UpdateChannelPricingDto {
  @ApiProperty({ description: 'Selling credits per communication unit', example: 1.0 })
  @IsNumber()
  @Min(0.01)
  sellingCreditsPerUnit: number;

  @ApiProperty({ description: 'Estimated provider unit cost in INR', example: 0.15 })
  @IsNumber()
  @Min(0.0)
  estimatedProviderCost: number;
}
