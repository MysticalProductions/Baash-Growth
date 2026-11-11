import { Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { SegmentsService } from './segments.service';
import { CreateSegmentDto, UpdateSegmentDto } from './dto/segment.dto';
import { CurrentTenant } from '../common/decorators/current-tenant.decorator';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { TenantGuard } from '../common/guards/tenant.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';

@ApiTags('Customer Segments')
@ApiBearerAuth()
@UseGuards(TenantGuard, PermissionsGuard)
@Controller('segments')
export class SegmentsController {
  constructor(private readonly segmentsService: SegmentsService) {}

  @Get()
  @RequirePermissions('customer:read')
  @ApiOperation({ summary: 'List all customer segments with live matching counts' })
  async getSegments(@CurrentTenant() vendorId: string) {
    return this.segmentsService.getSegments(vendorId);
  }

  @Post('preview')
  @RequirePermissions('customer:read')
  @ApiOperation({ summary: 'Preview live matching customer count for filter rules' })
  async previewFilters(
    @CurrentTenant() vendorId: string,
    @Body('filters') filters: Record<string, any>,
  ) {
    return this.segmentsService.previewFilters(vendorId, filters || {});
  }

  @Post()
  @RequirePermissions('customer:write')
  @ApiOperation({ summary: 'Create a dynamic customer segment' })
  async createSegment(
    @CurrentTenant() vendorId: string,
    @Body() dto: CreateSegmentDto,
  ) {
    return this.segmentsService.createSegment(vendorId, dto);
  }

  @Get(':id')
  @RequirePermissions('customer:read')
  @ApiOperation({ summary: 'Get segment definition and matching count' })
  async getSegmentById(
    @CurrentTenant() vendorId: string,
    @Param('id') segmentId: string,
  ) {
    return this.segmentsService.getSegmentById(vendorId, segmentId);
  }

  @Get(':id/customers')
  @RequirePermissions('customer:read')
  @ApiOperation({ summary: 'Evaluate and return customers currently matching segment rules' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getMatchingCustomers(
    @CurrentTenant() vendorId: string,
    @Param('id') segmentId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.segmentsService.getMatchingCustomers(vendorId, segmentId, page, limit);
  }

  @Put(':id')
  @RequirePermissions('customer:write')
  @ApiOperation({ summary: 'Update segment name, description, or filter rules' })
  async updateSegment(
    @CurrentTenant() vendorId: string,
    @Param('id') segmentId: string,
    @Body() dto: UpdateSegmentDto,
  ) {
    return this.segmentsService.updateSegment(vendorId, segmentId, dto);
  }

  @Delete(':id')
  @RequirePermissions('customer:write')
  @ApiOperation({ summary: 'Delete a segment' })
  async deleteSegment(
    @CurrentTenant() vendorId: string,
    @Param('id') segmentId: string,
  ) {
    return this.segmentsService.deleteSegment(vendorId, segmentId);
  }
}
