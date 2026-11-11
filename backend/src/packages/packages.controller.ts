import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { PackagesService } from './packages.service';
import { WalletChannel } from '@prisma/client';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { TenantGuard } from '../common/guards/tenant.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';

@ApiTags('Credit Packages (Vendor)')
@ApiBearerAuth()
@UseGuards(TenantGuard, PermissionsGuard)
@Controller('credit-packages')
export class PackagesController {
  constructor(private readonly packagesService: PackagesService) {}

  @Get()
  @RequirePermissions('campaign:read')
  @ApiOperation({ summary: 'List active credit packages for vendors, optionally filtered by channel' })
  @ApiQuery({ name: 'channel', required: false, enum: WalletChannel })
  async getActivePackages(@Query('channel') channel?: WalletChannel) {
    return this.packagesService.getActivePackages(channel);
  }

  @Get(':id')
  @RequirePermissions('campaign:read')
  @ApiOperation({ summary: 'Get details of a credit package' })
  async getPackageById(@Param('id') packageId: string) {
    return this.packagesService.getPackageById(packageId);
  }
}
