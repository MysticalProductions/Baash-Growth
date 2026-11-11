import { Controller, Get, Post, Put, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PackagesService } from './packages.service';
import { CreatePackageDto, UpdatePackageDto, UpdatePackageStatusDto } from './dto/package.dto';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';

@ApiTags('Credit Packages Management (Admin)')
@ApiBearerAuth()
@UseGuards(PermissionsGuard)
@RequirePermissions('platform:admin')
@Controller(['admin/credit-packages', 'admin/packages'])
export class AdminPackagesController {
  constructor(private readonly packagesService: PackagesService) {}

  @Get()
  @ApiOperation({ summary: 'Admin: List all credit packages (active and inactive) with purchase stats' })
  async getAllPackages() {
    return this.packagesService.getAllAdminPackages();
  }

  @Post()
  @ApiOperation({ summary: 'Admin: Create a new credit package' })
  async createPackage(@Body() dto: CreatePackageDto) {
    return this.packagesService.createPackage(dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Admin: Update an existing credit package' })
  async updatePackage(@Param('id') packageId: string, @Body() dto: UpdatePackageDto) {
    return this.packagesService.updatePackage(packageId, dto);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Admin: Toggle credit package active/inactive status' })
  async updatePackageStatus(
    @Param('id') packageId: string,
    @Body() dto: UpdatePackageStatusDto,
  ) {
    return this.packagesService.updatePackageStatus(packageId, dto.status);
  }
}
