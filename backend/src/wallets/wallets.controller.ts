import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { WalletsService } from './wallets.service';
import { WalletFilterDto } from './dto/wallet.dto';
import { CurrentTenant } from '../common/decorators/current-tenant.decorator';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { TenantGuard } from '../common/guards/tenant.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { WalletChannel } from '@prisma/client';

@ApiTags('Vendor Wallets')
@ApiBearerAuth()
@UseGuards(TenantGuard, PermissionsGuard)
@Controller('wallets')
export class WalletsController {
  constructor(private readonly walletsService: WalletsService) {}

  @Get()
  @RequirePermissions('campaign:read')
  @ApiOperation({ summary: 'Get all 3 communication credit wallets (SMS, WhatsApp, Email) for the vendor' })
  async getVendorWallets(@CurrentTenant() vendorId: string) {
    return this.walletsService.getVendorWallets(vendorId);
  }

  @Get('transactions/:id')
  @RequirePermissions('campaign:read')
  @ApiOperation({ summary: 'Get specific wallet transaction details' })
  async getTransactionDetails(
    @CurrentTenant() vendorId: string,
    @Param('id') transactionId: string,
  ) {
    return this.walletsService.getTransactionById(vendorId, transactionId);
  }

  @Get(':channel')
  @RequirePermissions('campaign:read')
  @ApiOperation({ summary: 'Get specific channel wallet balance and metrics' })
  @ApiParam({ name: 'channel', enum: WalletChannel })
  async getChannelWallet(
    @CurrentTenant() vendorId: string,
    @Param('channel') channel: WalletChannel,
  ) {
    return this.walletsService.getChannelWallet(vendorId, channel);
  }

  @Get(':channel/transactions')
  @RequirePermissions('campaign:read')
  @ApiOperation({ summary: 'Get paginated transaction ledger for a channel wallet' })
  @ApiParam({ name: 'channel', enum: WalletChannel })
  async getChannelTransactions(
    @CurrentTenant() vendorId: string,
    @Param('channel') channel: WalletChannel,
    @Query() query: WalletFilterDto,
  ) {
    return this.walletsService.getTransactions(vendorId, channel, query);
  }
}

@ApiTags('Vendor Transactions')
@ApiBearerAuth()
@UseGuards(TenantGuard, PermissionsGuard)
@Controller('transactions')
export class TransactionsController {
  constructor(private readonly walletsService: WalletsService) {}

  @Get()
  @RequirePermissions('campaign:read')
  @ApiOperation({ summary: 'Get global transaction ledger for the vendor across all channels' })
  async getAllTransactions(
    @CurrentTenant() vendorId: string,
    @Query() query: WalletFilterDto,
  ) {
    return this.walletsService.getTransactions(vendorId, undefined, query);
  }

  @Get(':id')
  @RequirePermissions('campaign:read')
  @ApiOperation({ summary: 'Get specific transaction details by ID' })
  async getTransactionById(
    @CurrentTenant() vendorId: string,
    @Param('id') transactionId: string,
  ) {
    return this.walletsService.getTransactionById(vendorId, transactionId);
  }
}
