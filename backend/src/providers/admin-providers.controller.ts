import { Controller, Get, Put, Post, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ProvidersService } from './providers.service';
import { UpdateProviderConfigDto, UpdateChannelPricingDto } from './dto/provider.dto';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { WalletChannel } from '@prisma/client';

@ApiTags('Admin — Communication Providers & Pricing')
@ApiBearerAuth()
@UseGuards(PermissionsGuard)
@RequirePermissions('platform:admin')
@Controller('admin')
export class AdminProvidersController {
  constructor(private readonly providersService: ProvidersService) {}

  @Get('providers')
  @ApiOperation({ summary: 'Admin: List all communication provider configurations (credentials masked)' })
  async getProviders() {
    return this.providersService.getAllAdminProviders();
  }

  @Put('providers/:channel')
  @ApiOperation({ summary: 'Admin: Update provider credentials and settings for SMS, WhatsApp, or Email' })
  async updateProvider(
    @Param('channel') channel: WalletChannel,
    @Body() dto: UpdateProviderConfigDto,
  ) {
    return this.providersService.updateProviderConfig(channel, dto);
  }

  @Post('providers/:channel/test')
  @ApiOperation({ summary: 'Admin: Trigger live connection test to provider gateway' })
  async testProvider(@Param('channel') channel: WalletChannel) {
    return this.providersService.testProviderConnection(channel);
  }

  @Get('channel-pricing')
  @ApiOperation({ summary: 'Admin: Get current credit selling prices and provider costs' })
  async getPricing() {
    return this.providersService.getAllChannelPricing();
  }

  @Put('channel-pricing/:channel')
  @ApiOperation({ summary: 'Admin: Update credit selling price or provider unit cost' })
  async updatePricing(
    @Param('channel') channel: WalletChannel,
    @Body() dto: UpdateChannelPricingDto,
  ) {
    return this.providersService.updateChannelPricing(channel, dto);
  }
}
