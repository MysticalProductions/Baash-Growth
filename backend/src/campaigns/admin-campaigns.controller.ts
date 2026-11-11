import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CampaignsService } from './campaigns.service';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';

@ApiTags('Admin — Campaign Monitoring & Reports')
@ApiBearerAuth()
@UseGuards(PermissionsGuard)
@RequirePermissions('platform:admin')
@Controller('admin')
export class AdminCampaignsController {
  constructor(private readonly campaignsService: CampaignsService) {}

  @Get('campaign-reports')
  @ApiOperation({ summary: 'Admin: Overview of all campaigns across all vendors, deliverability stats' })
  async getCampaignReports() {
    return this.campaignsService.getAdminCampaignOverview();
  }

  @Get('provider-monitoring')
  @ApiOperation({ summary: 'Admin: Gateway health, webhook event volume, failure rates, and error logs' })
  async getProviderMonitoring() {
    return this.campaignsService.getProviderMonitoring();
  }

  @Get('campaigns/:id')
  @ApiOperation({ summary: 'Admin: Inspect single campaign across any vendor' })
  async getSingleCampaign(@Param('id') campaignId: string) {
    return this.campaignsService.getCampaignDetails(campaignId);
  }
}
