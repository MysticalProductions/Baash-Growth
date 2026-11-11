import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTagDto {
  @ApiProperty({ example: 'VIP' })
  @IsString()
  @IsNotEmpty({ message: 'Tag name is required' })
  name: string;

  @ApiPropertyOptional({ example: '#7B35E8' })
  @IsString()
  @IsOptional()
  color?: string;
}

export class UpdateTagDto {
  @ApiPropertyOptional({ example: 'VIP Customer' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ example: '#F72585' })
  @IsString()
  @IsOptional()
  color?: string;
}
