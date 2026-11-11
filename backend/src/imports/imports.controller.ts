import { Controller, Get, Post, Param, Body, Res, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { ImportsService } from './imports.service';
import { CsvPreviewDto, CsvConfirmDto } from './dto/import.dto';
import { CurrentTenant } from '../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { TenantGuard } from '../common/guards/tenant.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';

@ApiTags('Customer CSV Import')
@ApiBearerAuth()
@UseGuards(TenantGuard, PermissionsGuard)
@Controller('customers/import')
export class ImportsController {
  constructor(private readonly importsService: ImportsService) {}

  @Get('template')
  @RequirePermissions('customer:read')
  @ApiOperation({ summary: 'Download standard sample CSV template for customer upload' })
  async downloadTemplate(@Res() res: Response) {
    const csvContent = this.importsService.getSampleTemplateCsv();
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="baash_customer_import_template.csv"');
    res.send(csvContent);
  }

  @Post('preview')
  @RequirePermissions('customer:write')
  @ApiOperation({ summary: 'Parse, validate, and preview CSV customer upload records' })
  async previewImport(
    @CurrentTenant() vendorId: string,
    @Body() dto: CsvPreviewDto,
  ) {
    return this.importsService.previewImport(vendorId, dto);
  }

  @Post('confirm')
  @RequirePermissions('customer:write')
  @ApiOperation({ summary: 'Confirm and execute customer batch import' })
  async confirmImport(
    @CurrentTenant() vendorId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CsvConfirmDto,
    @Req() req: Request,
  ) {
    const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress;
    return this.importsService.confirmImport(vendorId, dto, userId, ip);
  }

  @Get(':id')
  @RequirePermissions('customer:read')
  @ApiOperation({ summary: 'Get details and error logs of past import batch' })
  async getImportDetails(
    @CurrentTenant() vendorId: string,
    @Param('id') importId: string,
  ) {
    return this.importsService.getImportDetails(vendorId, importId);
  }
}
