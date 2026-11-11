import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  Req,
  Res,
  UseGuards,
  Header,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { CustomersService } from './customers.service';
import {
  CreateCustomerDto,
  UpdateCustomerDto,
  BulkDeleteDto,
  BulkTagDto,
  UpdateConsentDto,
} from './dto/customer.dto';
import { CurrentTenant } from '../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { TenantGuard } from '../common/guards/tenant.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { CustomerSource, ConsentStatus } from '@prisma/client';

@ApiTags('Customer CRM')
@ApiBearerAuth()
@UseGuards(TenantGuard, PermissionsGuard)
@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get()
  @RequirePermissions('customer:read')
  @ApiOperation({ summary: 'List and filter customers with pagination' })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'tagIds', required: false, isArray: true, type: String })
  @ApiQuery({ name: 'city', required: false, type: String })
  @ApiQuery({ name: 'state', required: false, type: String })
  @ApiQuery({ name: 'source', required: false, enum: CustomerSource })
  @ApiQuery({ name: 'hasPhone', required: false, type: Boolean })
  @ApiQuery({ name: 'hasEmail', required: false, type: Boolean })
  @ApiQuery({ name: 'smsConsent', required: false, enum: ConsentStatus })
  @ApiQuery({ name: 'whatsAppConsent', required: false, enum: ConsentStatus })
  @ApiQuery({ name: 'emailConsent', required: false, enum: ConsentStatus })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getCustomers(
    @CurrentTenant() vendorId: string,
    @Query('search') search?: string,
    @Query('tagIds') tagIds?: string | string[],
    @Query('city') city?: string,
    @Query('state') state?: string,
    @Query('source') source?: CustomerSource,
    @Query('hasPhone') hasPhone?: string,
    @Query('hasEmail') hasEmail?: string,
    @Query('smsConsent') smsConsent?: ConsentStatus,
    @Query('whatsAppConsent') whatsAppConsent?: ConsentStatus,
    @Query('emailConsent') emailConsent?: ConsentStatus,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    const formattedTagIds = tagIds
      ? Array.isArray(tagIds)
        ? tagIds
        : [tagIds]
      : undefined;

    return this.customersService.getCustomers(vendorId, {
      search,
      tagIds: formattedTagIds,
      city,
      state,
      source,
      hasPhone: hasPhone !== undefined ? hasPhone === 'true' : undefined,
      hasEmail: hasEmail !== undefined ? hasEmail === 'true' : undefined,
      smsConsent,
      whatsAppConsent,
      emailConsent,
      page: Number(page),
      limit: Number(limit),
    });
  }

  @Get('export')
  @RequirePermissions('customer:read')
  @ApiOperation({ summary: 'Export vendor customer directory as CSV' })
  async exportCustomers(@CurrentTenant() vendorId: string, @Res() res: Response) {
    const csvData = await this.customersService.exportCustomersCsv(vendorId);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="customers_export_${new Date().toISOString().split('T')[0]}.csv"`,
    );
    res.send(csvData);
  }

  @Post()
  @RequirePermissions('customer:write')
  @ApiOperation({ summary: 'Create a new customer profile' })
  async createCustomer(
    @CurrentTenant() vendorId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateCustomerDto,
    @Req() req: Request,
  ) {
    const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    return this.customersService.createCustomer(vendorId, dto, userId, ip, userAgent);
  }

  @Get(':id')
  @RequirePermissions('customer:read')
  @ApiOperation({ summary: 'Get detailed customer profile' })
  async getCustomerById(
    @CurrentTenant() vendorId: string,
    @Param('id') customerId: string,
  ) {
    return this.customersService.getCustomerById(vendorId, customerId);
  }

  @Put(':id')
  @RequirePermissions('customer:write')
  @ApiOperation({ summary: 'Update customer profile' })
  async updateCustomer(
    @CurrentTenant() vendorId: string,
    @Param('id') customerId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateCustomerDto,
    @Req() req: Request,
  ) {
    const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    return this.customersService.updateCustomer(vendorId, customerId, dto, userId, ip, userAgent);
  }

  @Delete(':id')
  @RequirePermissions('customer:write')
  @ApiOperation({ summary: 'Delete a customer' })
  async deleteCustomer(
    @CurrentTenant() vendorId: string,
    @Param('id') customerId: string,
    @CurrentUser('id') userId: string,
    @Req() req: Request,
  ) {
    const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress;
    return this.customersService.deleteCustomer(vendorId, customerId, userId, ip);
  }

  @Post('bulk-delete')
  @RequirePermissions('customer:write')
  @ApiOperation({ summary: 'Bulk delete selected customer records' })
  async bulkDelete(
    @CurrentTenant() vendorId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: BulkDeleteDto,
    @Req() req: Request,
  ) {
    const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress;
    return this.customersService.bulkDelete(vendorId, dto, userId, ip);
  }

  @Post('bulk-tag')
  @RequirePermissions('customer:write')
  @ApiOperation({ summary: 'Bulk assign, remove, or replace tags for selected customers' })
  async bulkTag(
    @CurrentTenant() vendorId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: BulkTagDto,
  ) {
    return this.customersService.bulkTag(vendorId, dto, userId);
  }

  @Get(':id/consent')
  @RequirePermissions('customer:read')
  @ApiOperation({ summary: 'Get customer channel marketing consent records' })
  async getConsent(
    @CurrentTenant() vendorId: string,
    @Param('id') customerId: string,
  ) {
    return this.customersService.getConsent(vendorId, customerId);
  }

  @Put(':id/consent')
  @RequirePermissions('customer:write')
  @ApiOperation({ summary: 'Update customer channel marketing consent status' })
  async updateConsent(
    @CurrentTenant() vendorId: string,
    @Param('id') customerId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateConsentDto,
    @Req() req: Request,
  ) {
    const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress;
    return this.customersService.updateConsent(vendorId, customerId, dto, userId, ip);
  }

  @Get(':id/messages')
  @RequirePermissions('customer:read')
  @ApiOperation({ summary: 'Get customer communication history' })
  async getMessageHistory(
    @CurrentTenant() vendorId: string,
    @Param('id') customerId: string,
  ) {
    return this.customersService.getMessageHistory(vendorId, customerId);
  }
}
