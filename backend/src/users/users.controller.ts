import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Param,
  Body,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { UsersService } from './users.service';
import {
  InviteStaffDto,
  AcceptInvitationDto,
  UpdateStaffDto,
  UpdateStaffStatusDto,
} from './dto/users.dto';
import { CurrentTenant } from '../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { Public } from '../common/decorators/public.decorator';
import { TenantGuard } from '../common/guards/tenant.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';

@ApiTags('Vendor — Staff & User Management')
@Controller('vendor/users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @ApiBearerAuth()
  @UseGuards(TenantGuard, PermissionsGuard)
  @Get()
  @RequirePermissions('user:read')
  @ApiOperation({ summary: 'List all staff members and pending invitations in the vendor workspace' })
  async getStaff(@CurrentTenant() vendorId: string) {
    return this.usersService.getVendorStaff(vendorId);
  }

  @ApiBearerAuth()
  @UseGuards(TenantGuard, PermissionsGuard)
  @Post('invite')
  @RequirePermissions('user:invite')
  @ApiOperation({ summary: 'Invite a team member to join the vendor workspace' })
  async inviteStaff(
    @CurrentTenant() vendorId: string,
    @CurrentUser('id') invitedById: string,
    @Body() dto: InviteStaffDto,
    @Req() req: Request,
  ) {
    const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    return this.usersService.inviteStaff(vendorId, dto, invitedById, ip, userAgent);
  }

  @Public()
  @Get('invitation/:token')
  @ApiOperation({ summary: 'Inspect invitation details using token' })
  async getInvitation(@Param('token') token: string) {
    return this.usersService.getInvitationByToken(token);
  }

  @Public()
  @Post('accept-invitation')
  @ApiOperation({ summary: 'Accept invitation, create password, and join workspace' })
  async acceptInvitation(@Body() dto: AcceptInvitationDto, @Req() req: Request) {
    const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    return this.usersService.acceptInvitation(dto, ip, userAgent);
  }

  @ApiBearerAuth()
  @UseGuards(TenantGuard, PermissionsGuard)
  @Put(':id')
  @RequirePermissions('user:write')
  @ApiOperation({ summary: 'Update staff member profile or custom permissions' })
  async updateStaff(
    @CurrentTenant() vendorId: string,
    @Param('id') targetUserId: string,
    @CurrentUser('id') actorUserId: string,
    @Body() dto: UpdateStaffDto,
    @Req() req: Request,
  ) {
    const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    return this.usersService.updateStaff(vendorId, targetUserId, dto, actorUserId, ip, userAgent);
  }

  @ApiBearerAuth()
  @UseGuards(TenantGuard, PermissionsGuard)
  @Patch(':id/status')
  @RequirePermissions('user:status')
  @ApiOperation({ summary: 'Change staff member status (ACTIVE, INACTIVE, SUSPENDED)' })
  async updateStaffStatus(
    @CurrentTenant() vendorId: string,
    @Param('id') targetUserId: string,
    @CurrentUser('id') actorUserId: string,
    @Body() dto: UpdateStaffStatusDto,
    @Req() req: Request,
  ) {
    const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    return this.usersService.updateStaffStatus(vendorId, targetUserId, dto, actorUserId, ip, userAgent);
  }

  @ApiBearerAuth()
  @UseGuards(TenantGuard, PermissionsGuard)
  @Delete(':id')
  @RequirePermissions('user:write')
  @ApiOperation({ summary: 'Revoke access and remove staff member from vendor workspace' })
  async removeStaff(
    @CurrentTenant() vendorId: string,
    @Param('id') targetUserId: string,
    @CurrentUser('id') actorUserId: string,
    @Req() req: Request,
  ) {
    const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    return this.usersService.removeStaff(vendorId, targetUserId, actorUserId, ip, userAgent);
  }
}
