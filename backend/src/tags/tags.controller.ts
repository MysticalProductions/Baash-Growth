import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TagsService } from './tags.service';
import { CreateTagDto, UpdateTagDto } from './dto/tag.dto';
import { CurrentTenant } from '../common/decorators/current-tenant.decorator';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { TenantGuard } from '../common/guards/tenant.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';

@ApiTags('Customer Tags')
@ApiBearerAuth()
@UseGuards(TenantGuard, PermissionsGuard)
@Controller('tags')
export class TagsController {
  constructor(private readonly tagsService: TagsService) {}

  @Get()
  @RequirePermissions('customer:read')
  @ApiOperation({ summary: 'List all vendor tags' })
  async getTags(@CurrentTenant() vendorId: string) {
    return this.tagsService.getTags(vendorId);
  }

  @Post()
  @RequirePermissions('customer:write')
  @ApiOperation({ summary: 'Create a new vendor tag' })
  async createTag(@CurrentTenant() vendorId: string, @Body() dto: CreateTagDto) {
    return this.tagsService.createTag(vendorId, dto);
  }

  @Put(':id')
  @RequirePermissions('customer:write')
  @ApiOperation({ summary: 'Update tag name or color' })
  async updateTag(
    @CurrentTenant() vendorId: string,
    @Param('id') tagId: string,
    @Body() dto: UpdateTagDto,
  ) {
    return this.tagsService.updateTag(vendorId, tagId, dto);
  }

  @Delete(':id')
  @RequirePermissions('customer:write')
  @ApiOperation({ summary: 'Delete a tag' })
  async deleteTag(@CurrentTenant() vendorId: string, @Param('id') tagId: string) {
    return this.tagsService.deleteTag(vendorId, tagId);
  }
}
