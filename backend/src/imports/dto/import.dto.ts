import { IsArray, IsNotEmpty, IsOptional, IsString, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CsvPreviewDto {
  @ApiProperty({ description: 'Raw CSV text or base64 string' })
  @IsString()
  @IsNotEmpty({ message: 'CSV content is required' })
  csvData: string;

  @ApiPropertyOptional({ example: 'customers_upload.csv' })
  @IsString()
  @IsOptional()
  fileName?: string;
}

export class CsvConfirmDto {
  @ApiProperty({ description: 'Rows to import following review' })
  @IsArray()
  @IsNotEmpty({ message: 'Rows array is required' })
  rows: Array<{
    fullName: string;
    phone?: string;
    email?: string;
    city?: string;
    state?: string;
    gender?: string;
    tags?: string;
    notes?: string;
  }>;

  @ApiPropertyOptional({ default: 'customers_import.csv' })
  @IsString()
  @IsOptional()
  fileName?: string;

  @ApiPropertyOptional({ default: false, description: 'Skip duplicate records automatically' })
  @IsBoolean()
  @IsOptional()
  skipDuplicates?: boolean;
}
