import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Response } from 'express';
import { CampaignsService } from './campaigns.service';
import {
  CreateCampaignDto,
  EstimateCampaignDto,
  CampaignFilterDto,
  UpdateCampaignDto,
  ScheduleCampaignDto,
} from './dto/campaign.dto';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { TenantGuard } from '../common/guards/tenant.guard';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RecipientStatus } from '@prisma/client';

@ApiTags('Vendor Campaigns — Multi-Channel Dispatch')
@ApiBearerAuth()
@UseGuards(TenantGuard, PermissionsGuard)
@Controller('campaigns')
export class CampaignsController {
  constructor(private readonly campaignsService: CampaignsService) {}

  @Get()
  @RequirePermissions('campaign:read')
  @ApiOperation({ summary: 'List all campaigns for current vendor with filters' })
  async getCampaigns(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: CampaignFilterDto,
  ) {
    return this.campaignsService.getVendorCampaigns(user.vendorId!, query);
  }

  @Post('estimate')
  @RequirePermissions('campaign:read')
  @ApiOperation({ summary: 'Estimate audience, segment credits, and check wallet sufficiency' })
  async estimateCampaign(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: EstimateCampaignDto,
  ) {
    return this.campaignsService.estimateCampaign(user.vendorId!, dto);
  }

  @Post()
  @RequirePermissions('campaign:write')
  @ApiOperation({ summary: 'Create a new campaign, reserve wallet credits, and dispatch' })
  async createCampaign(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateCampaignDto,
  ) {
    return this.campaignsService.createCampaign(user.vendorId!, dto);
  }

  @Get(':id')
  @RequirePermissions('campaign:read')
  @ApiOperation({ summary: 'Get detailed campaign metrics and recipient preview' })
  async getCampaign(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') campaignId: string,
  ) {
    return this.campaignsService.getCampaignDetails(campaignId, user.vendorId!);
  }

  @Put(':id')
  @RequirePermissions('campaign:write')
  @ApiOperation({ summary: 'Update draft or scheduled campaign details' })
  async updateCampaign(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') campaignId: string,
    @Body() dto: UpdateCampaignDto,
  ) {
    return this.campaignsService.updateCampaign(campaignId, user.vendorId!, dto);
  }

  @Delete(':id')
  @RequirePermissions('campaign:write')
  @ApiOperation({ summary: 'Delete a draft or cancelled campaign' })
  async deleteCampaign(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') campaignId: string,
  ) {
    return this.campaignsService.deleteCampaign(campaignId, user.vendorId!);
  }

  @Post(':id/estimate')
  @RequirePermissions('campaign:read')
  @ApiOperation({ summary: 'Estimate audience and credit cost for a campaign' })
  async estimateCampaignById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') campaignId: string,
  ) {
    const campaign = await this.campaignsService.getCampaignDetails(campaignId, user.vendorId!);
    return this.campaignsService.estimateCampaign(user.vendorId!, {
      channel: campaign.channel,
      content: campaign.content,
      audienceType: campaign.audienceType,
      templateId: campaign.templateId || undefined,
      segmentId: campaign.segmentId || undefined,
    });
  }

  @Post(':id/validate-audience')
  @RequirePermissions('campaign:read')
  @ApiOperation({ summary: 'Validate audience eligibility and exclusion breakdown for campaign' })
  async validateAudience(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') campaignId: string,
  ) {
    const campaign = await this.campaignsService.getCampaignDetails(campaignId, user.vendorId!);
    return this.campaignsService.resolveAudience(user.vendorId!, {
      channel: campaign.channel,
      audienceType: campaign.audienceType,
      segmentId: campaign.segmentId || undefined,
    });
  }

  @Post(':id/send')
  @RequirePermissions('campaign:send')
  @ApiOperation({ summary: 'Trigger dispatch for an existing draft or queued campaign' })
  async sendCampaign(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') campaignId: string,
  ) {
    return this.campaignsService.sendCampaign(campaignId, user.vendorId!);
  }

  @Post(':id/schedule')
  @RequirePermissions('campaign:send')
  @ApiOperation({ summary: 'Schedule an existing draft campaign for future dispatch' })
  async scheduleCampaign(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') campaignId: string,
    @Body() dto: ScheduleCampaignDto,
  ) {
    return this.campaignsService.scheduleCampaign(campaignId, user.vendorId!, dto.scheduledAt);
  }

  @Get(':id/report')
  @RequirePermissions('campaign:read')
  @ApiOperation({ summary: 'Detailed delivery analytics and financial accounting report' })
  async getCampaignReport(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') campaignId: string,
  ) {
    return this.campaignsService.getCampaignReport(campaignId, user.vendorId!);
  }

  @Post(':id/cancel')
  @RequirePermissions('campaign:send')
  @ApiOperation({ summary: 'Cancel a scheduled or queued campaign and refund reserved credits' })
  async cancelCampaign(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') campaignId: string,
  ) {
    return this.campaignsService.cancelCampaign(campaignId, user.vendorId!);
  }

  @Get(':id/recipients')
  @RequirePermissions('campaign:read')
  @ApiOperation({ summary: 'List paginated recipients and individual delivery statuses' })
  @ApiQuery({ name: 'status', required: false, enum: RecipientStatus })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getRecipients(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') campaignId: string,
    @Query('status') status?: RecipientStatus,
    @Query('search') search?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.campaignsService.getCampaignRecipients(campaignId, user.vendorId!, {
      status,
      search,
      page,
      limit,
    });
  }

  @Get(':id/export')
  @RequirePermissions('campaign:read')
  @ApiOperation({ summary: 'Export campaign recipient delivery report to CSV' })
  async exportCsv(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') campaignId: string,
    @Res() res: Response,
  ) {
    const csvContent = await this.campaignsService.exportCampaignRecipientsCsv(
      campaignId,
      user.vendorId!,
    );

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="campaign-${campaignId}-recipients.csv"`,
    );
    res.send(csvContent);
  }
}
