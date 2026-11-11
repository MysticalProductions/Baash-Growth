import { Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { TemplatesService } from './templates.service';
import { CreateTemplateDto, UpdateTemplateDto } from './dto/template.dto';
import { CurrentTenant } from '../common/decorators/current-tenant.decorator';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { TenantGuard } from '../common/guards/tenant.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { TemplateChannel } from '@prisma/client';

@ApiTags('Message Templates')
@ApiBearerAuth()
@UseGuards(TenantGuard, PermissionsGuard)
@Controller('templates')
export class TemplatesController {
  constructor(private readonly templatesService: TemplatesService) {}

  @Get()
  @RequirePermissions('campaign:read')
  @ApiOperation({ summary: 'List all message templates available for the vendor' })
  @ApiQuery({ name: 'channel', required: false, enum: TemplateChannel })
  async getTemplates(
    @CurrentTenant() vendorId: string,
    @Query('channel') channel?: TemplateChannel,
  ) {
    return this.templatesService.getTemplates(vendorId, channel);
  }

  @Post()
  @RequirePermissions('campaign:write')
  @ApiOperation({ summary: 'Create a new SMS, WhatsApp, or Email message template' })
  async createTemplate(
    @CurrentTenant() vendorId: string,
    @Body() dto: CreateTemplateDto,
  ) {
    return this.templatesService.createTemplate(vendorId, dto);
  }

  @Get(':id')
  @RequirePermissions('campaign:read')
  @ApiOperation({ summary: 'Get template content, dynamic variables, and SMS segment stats' })
  async getTemplateById(
    @CurrentTenant() vendorId: string,
    @Param('id') templateId: string,
  ) {
    return this.templatesService.getTemplateById(vendorId, templateId);
  }

  @Put(':id')
  @RequirePermissions('campaign:write')
  @ApiOperation({ summary: 'Update a message template' })
  async updateTemplate(
    @CurrentTenant() vendorId: string,
    @Param('id') templateId: string,
    @Body() dto: UpdateTemplateDto,
  ) {
    return this.templatesService.updateTemplate(vendorId, templateId, dto);
  }

  @Delete(':id')
  @RequirePermissions('campaign:write')
  @ApiOperation({ summary: 'Delete a template' })
  async deleteTemplate(
    @CurrentTenant() vendorId: string,
    @Param('id') templateId: string,
  ) {
    return this.templatesService.deleteTemplate(vendorId, templateId);
  }
}
