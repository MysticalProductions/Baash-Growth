import {
  Controller,
  Get,
  Put,
  Body,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Request } from 'express';
import { VendorsService } from './vendors.service';
import { UpdateVendorProfileDto } from './dto/vendor.dto';
import { CurrentTenant } from '../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { TenantGuard } from '../common/guards/tenant.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';

@ApiTags('Vendor — Workspace & Profile')
@ApiBearerAuth()
@UseGuards(TenantGuard, PermissionsGuard)
@Controller('vendor')
export class VendorsController {
  constructor(private readonly vendorsService: VendorsService) {}

  @Get('profile')
  @RequirePermissions('vendor:read')
  @ApiOperation({ summary: 'Get current vendor business profile' })
  async getProfile(@CurrentTenant() vendorId: string) {
    return this.vendorsService.getProfile(vendorId);
  }

  @Put('profile')
  @RequirePermissions('vendor:write')
  @ApiOperation({ summary: 'Update current vendor business profile' })
  async updateProfile(
    @CurrentTenant() vendorId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateVendorProfileDto,
    @Req() req: Request,
  ) {
    const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    return this.vendorsService.updateProfile(vendorId, dto, userId, ip, userAgent);
  }

  @Get('dashboard')
  @RequirePermissions('vendor:read')
  @ApiOperation({ summary: 'Get current vendor workspace dashboard overview' })
  async getDashboard(@CurrentTenant() vendorId: string) {
    return this.vendorsService.getDashboard(vendorId);
  }

  @Get('analytics')
  @RequirePermissions('vendor:read')
  @ApiOperation({ summary: 'Get vendor communication analytics with date range filters' })
  @ApiQuery({ name: 'range', required: false, enum: ['today', '7d', '30d', 'this_month', 'custom'] })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  async getAnalytics(
    @CurrentTenant() vendorId: string,
    @Query('range') range?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.vendorsService.getVendorAnalytics(vendorId, { range, startDate, endDate });
  }
}
