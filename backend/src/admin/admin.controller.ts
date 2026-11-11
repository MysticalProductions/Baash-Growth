import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Param,
  Body,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Request } from 'express';
import { AdminService } from './admin.service';
import { WalletsService } from '../wallets/wallets.service';
import { CreateVendorDto, UpdateVendorDto, UpdateVendorStatusDto } from './dto/admin.dto';
import { AdjustWalletDto, WalletFilterDto } from '../wallets/dto/wallet.dto';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { VendorStatus } from '@prisma/client';

@ApiTags('Admin — Platform Management')
@ApiBearerAuth()
@UseGuards(PermissionsGuard)
@Controller('admin')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly walletsService: WalletsService,
  ) {}

  @Get('dashboard')
  @RequirePermissions('platform:admin')
  @ApiOperation({ summary: 'Get Baash Platform overview metrics and latest activity' })
  async getDashboard() {
    return this.adminService.getDashboardMetrics();
  }

  @Get('vendors')
  @RequirePermissions('platform:admin')
  @ApiOperation({ summary: 'List all registered vendors with search, status filters, and pagination' })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, enum: VendorStatus })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getVendors(
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
  ) {
    const validStatus =
      status && status !== 'ALL' && Object.values(VendorStatus).includes(status as VendorStatus)
        ? (status as VendorStatus)
        : undefined;
    return this.adminService.getVendors({
      search,
      status: validStatus,
      page: Number(page) || 1,
      limit: Number(limit) || 10,
    });
  }

  @Post('vendors')
  @RequirePermissions('platform:admin')
  @ApiOperation({ summary: 'Create a new business vendor workspace and provision admin account' })
  async createVendor(
    @Body() dto: CreateVendorDto,
    @CurrentUser('id') currentUserId: string,
    @Req() req: Request,
  ) {
    const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    return this.adminService.createVendor(dto, currentUserId, ip, userAgent);
  }

  @Get('vendors/:id')
  @RequirePermissions('platform:admin')
  @ApiOperation({ summary: 'Get detailed vendor record with users, staff, and activity' })
  async getVendorById(@Param('id') id: string) {
    return this.adminService.getVendorById(id);
  }

  @Put('vendors/:id')
  @RequirePermissions('platform:admin')
  @ApiOperation({ summary: 'Update business vendor profile details' })
  async updateVendor(
    @Param('id') id: string,
    @Body() dto: UpdateVendorDto,
    @CurrentUser('id') currentUserId: string,
    @Req() req: Request,
  ) {
    const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    return this.adminService.updateVendor(id, dto, currentUserId, ip, userAgent);
  }

  @Patch('vendors/:id/status')
  @RequirePermissions('platform:admin')
  @ApiOperation({ summary: 'Change vendor status (ACTIVE, INACTIVE, SUSPENDED, PENDING)' })
  async updateVendorStatus(
    @Param('id') id: string,
    @Body() dto: UpdateVendorStatusDto,
    @CurrentUser('id') currentUserId: string,
    @Req() req: Request,
  ) {
    const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    return this.adminService.updateVendorStatus(id, dto, currentUserId, ip, userAgent);
  }

  // --- PART 3: ADMIN WALLETS & TRANSACTIONS MANAGEMENT ---

  @Get('wallets')
  @RequirePermissions('platform:admin')
  @ApiOperation({ summary: 'Admin: List all vendor wallets with SMS, WhatsApp, and Email balances' })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getAdminWallets(
    @Query('search') search?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.walletsService.getAdminWalletsOverview(search, page, limit);
  }

  @Get('wallets/reconciliation')
  @RequirePermissions('platform:admin')
  @ApiOperation({ summary: 'Admin: Audit and reconcile all vendor wallets against immutable double-entry ledger' })
  @ApiQuery({ name: 'vendorId', required: false, type: String })
  async getWalletReconciliation(@Query('vendorId') vendorId?: string) {
    return this.walletsService.reconcileWallets(vendorId);
  }

  @Get('wallets/:vendorId')
  @RequirePermissions('platform:admin')
  @ApiOperation({ summary: 'Admin: Get specific vendor wallets and balances' })
  async getVendorWalletsAdmin(@Param('vendorId') vendorId: string) {
    return this.walletsService.getVendorWallets(vendorId);
  }

  @Get('transactions')
  @RequirePermissions('platform:admin')
  @ApiOperation({ summary: 'Admin: View global wallet transaction history across all vendors' })
  async getAdminTransactions(@Query() query: WalletFilterDto & { vendorId?: string }) {
    return this.walletsService.getAdminTransactions(query);
  }

  @Post('wallets/adjust')
  @RequirePermissions('platform:admin')
  @ApiOperation({ summary: 'Admin: Manually credit or debit a vendor wallet with mandatory reason and audit log' })
  async adjustWallet(
    @Body() dto: AdjustWalletDto,
    @CurrentUser('id') adminUserId: string,
  ) {
    return this.walletsService.adjustWalletByAdmin(adminUserId, dto);
  }

  @Get('wallet-reports')
  @RequirePermissions('platform:admin')
  @ApiOperation({ summary: 'Admin: Get financial and credit sales summary reports' })
  async getWalletReports() {
    return this.walletsService.getAdminWalletReports();
  }

  @Get('audit-logs')
  @RequirePermissions('platform:admin')
  @ApiOperation({ summary: 'Admin: View system-wide security, administrative, and vendor audit logs' })
  @ApiQuery({ name: 'vendorId', required: false, type: String })
  @ApiQuery({ name: 'userId', required: false, type: String })
  @ApiQuery({ name: 'action', required: false, type: String })
  @ApiQuery({ name: 'entityType', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getAuditLogs(
    @Query('vendorId') vendorId?: string,
    @Query('userId') userId?: string,
    @Query('action') action?: string,
    @Query('entityType') entityType?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 50,
  ) {
    return this.adminService.getAuditLogs({
      vendorId,
      userId,
      action,
      entityType,
      page: Number(page),
      limit: Number(limit),
    });
  }
}
