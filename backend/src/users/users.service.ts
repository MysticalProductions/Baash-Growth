import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import * as crypto from 'crypto';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import {
  InviteStaffDto,
  AcceptInvitationDto,
  UpdateStaffDto,
  UpdateStaffStatusDto,
} from './dto/users.dto';
import { InvitationStatus, VendorUserStatus } from '@prisma/client';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async getVendorStaff(vendorId: string) {
    const [members, pendingInvitations] = await Promise.all([
      this.prisma.vendorUser.findMany({
        where: { vendorId },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              fullName: true,
              phone: true,
              avatarUrl: true,
              isActive: true,
              lastLoginAt: true,
              createdAt: true,
              userRoles: {
                include: {
                  role: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.invitation.findMany({
        where: {
          vendorId,
          status: InvitationStatus.PENDING,
          expiresAt: { gt: new Date() },
        },
        include: {
          role: true,
          invitedBy: {
            select: { fullName: true, email: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const formattedMembers = members.map((vu) => ({
      membershipId: vu.id,
      userId: vu.user.id,
      email: vu.user.email,
      fullName: vu.user.fullName,
      phone: vu.user.phone,
      avatarUrl: vu.user.avatarUrl,
      status: vu.status,
      userIsActive: vu.user.isActive,
      role: vu.user.userRoles[0]?.role?.name || 'VENDOR_STAFF',
      roleDisplayName: vu.user.userRoles[0]?.role?.displayName || 'Vendor Staff',
      customPermissions: vu.customPermissions || [],
      lastLoginAt: vu.user.lastLoginAt,
      joinedAt: vu.createdAt,
    }));

    return {
      members: formattedMembers,
      pendingInvitations,
    };
  }

  async inviteStaff(
    vendorId: string,
    dto: InviteStaffDto,
    invitedById: string,
    ip?: string,
    userAgent?: string,
  ) {
    const email = dto.email.toLowerCase().trim();

    // Check if the user is already an active member of this vendor
    const existingMembership = await this.prisma.vendorUser.findFirst({
      where: {
        vendorId,
        user: { email },
      },
    });

    if (existingMembership) {
      throw new ConflictException('This user is already an active member of your vendor workspace');
    }

    // Role to assign (defaults to VENDOR_STAFF)
    const targetRoleName = dto.roleName || 'VENDOR_STAFF';
    const role = await this.prisma.role.findUnique({
      where: { name: targetRoleName },
    });

    if (!role) {
      throw new BadRequestException(`Role '${targetRoleName}' does not exist`);
    }

    // Invalidate existing pending invitations for this email in this vendor
    await this.prisma.invitation.updateMany({
      where: {
        vendorId,
        email,
        status: InvitationStatus.PENDING,
      },
      data: { status: InvitationStatus.REVOKED },
    });

    // Create 48-hour secure token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

    const invitation = await this.prisma.invitation.create({
      data: {
        vendorId,
        email,
        roleId: role.id,
        invitedById,
        token,
        status: InvitationStatus.PENDING,
        permissions: dto.permissions || [],
        expiresAt,
      },
      include: {
        role: true,
        vendor: {
          select: { businessName: true },
        },
      },
    });

    await this.auditService.log({
      userId: invitedById,
      vendorId,
      action: 'STAFF_INVITED',
      entityType: 'Invitation',
      entityId: invitation.id,
      ipAddress: ip,
      userAgent,
      metadata: {
        invitedEmail: email,
        role: role.name,
        permissions: dto.permissions,
      },
    });

    return {
      message: 'Staff invitation generated successfully',
      invitation: {
        id: invitation.id,
        email: invitation.email,
        vendorName: invitation.vendor.businessName,
        roleName: invitation.role.name,
        expiresAt: invitation.expiresAt,
        token: invitation.token, // Returned for easy verification & link generation
        inviteLink: `/accept-invitation?token=${invitation.token}`,
      },
    };
  }

  async getInvitationByToken(token: string) {
    const invitation = await this.prisma.invitation.findUnique({
      where: { token },
      include: {
        vendor: {
          select: { id: true, businessName: true, businessLogo: true },
        },
        role: {
          select: { name: true, displayName: true },
        },
      },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation token is invalid or has expired');
    }

    if (invitation.status !== InvitationStatus.PENDING || invitation.expiresAt < new Date()) {
      throw new BadRequestException('Invitation is no longer valid or has already been used');
    }

    return {
      email: invitation.email,
      vendorName: invitation.vendor.businessName,
      vendorLogo: invitation.vendor.businessLogo,
      roleName: invitation.role.displayName,
      expiresAt: invitation.expiresAt,
    };
  }

  async acceptInvitation(dto: AcceptInvitationDto, ip?: string, userAgent?: string) {
    const invitation = await this.prisma.invitation.findUnique({
      where: { token: dto.token },
      include: {
        role: true,
        vendor: true,
      },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    if (invitation.status !== InvitationStatus.PENDING || invitation.expiresAt < new Date()) {
      throw new BadRequestException('Invitation has expired or has already been accepted');
    }

    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(dto.password, salt);

    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Find or create user
      let user = await tx.user.findUnique({
        where: { email: invitation.email.toLowerCase() },
      });

      if (!user) {
        user = await tx.user.create({
          data: {
            email: invitation.email.toLowerCase(),
            fullName: dto.fullName.trim(),
            phone: dto.phone?.trim(),
            passwordHash,
            isActive: true,
            isEmailVerified: true,
          },
        });
      } else {
        user = await tx.user.update({
          where: { id: user.id },
          data: {
            fullName: dto.fullName.trim(),
            passwordHash,
            isActive: true,
            phone: dto.phone?.trim() || user.phone,
          },
        });
      }

      // 2. Assign role
      await tx.userRole.upsert({
        where: {
          userId_roleId: {
            userId: user.id,
            roleId: invitation.roleId,
          },
        },
        update: {},
        create: {
          userId: user.id,
          roleId: invitation.roleId,
        },
      });

      // 3. Link VendorUser membership
      const vendorUser = await tx.vendorUser.upsert({
        where: {
          vendorId_userId: {
            vendorId: invitation.vendorId,
            userId: user.id,
          },
        },
        update: {
          status: VendorUserStatus.ACTIVE,
          customPermissions: invitation.permissions || undefined,
        },
        create: {
          vendorId: invitation.vendorId,
          userId: user.id,
          status: VendorUserStatus.ACTIVE,
          customPermissions: invitation.permissions || undefined,
        },
      });

      // 4. Mark invitation accepted
      await tx.invitation.update({
        where: { id: invitation.id },
        data: { status: InvitationStatus.ACCEPTED },
      });

      return { user, vendorUser, vendor: invitation.vendor };
    });

    await this.auditService.log({
      userId: result.user.id,
      vendorId: result.vendor.id,
      action: 'INVITATION_ACCEPTED',
      entityType: 'Invitation',
      entityId: invitation.id,
      ipAddress: ip,
      userAgent,
      metadata: {
        email: invitation.email,
        vendorId: result.vendor.id,
      },
    });

    return {
      message: 'Invitation accepted successfully. You can now log into BAASH GROWTH.',
      email: result.user.email,
    };
  }

  async updateStaff(
    vendorId: string,
    targetUserId: string,
    dto: UpdateStaffDto,
    actorUserId: string,
    ip?: string,
    userAgent?: string,
  ) {
    const vendorUser = await this.prisma.vendorUser.findUnique({
      where: {
        vendorId_userId: {
          vendorId,
          userId: targetUserId,
        },
      },
    });

    if (!vendorUser) {
      throw new NotFoundException('Staff member not found in this vendor workspace');
    }

    if (dto.fullName || dto.phone) {
      await this.prisma.user.update({
        where: { id: targetUserId },
        data: {
          fullName: dto.fullName?.trim() || undefined,
          phone: dto.phone !== undefined ? dto.phone?.trim() : undefined,
        },
      });
    }

    if (dto.permissions !== undefined) {
      await this.prisma.vendorUser.update({
        where: { id: vendorUser.id },
        data: {
          customPermissions: dto.permissions,
        },
      });
    }

    await this.auditService.log({
      userId: actorUserId,
      vendorId,
      action: 'STAFF_UPDATED',
      entityType: 'User',
      entityId: targetUserId,
      ipAddress: ip,
      userAgent,
      metadata: { changes: dto },
    });

    return { message: 'Staff member updated successfully' };
  }

  async updateStaffStatus(
    vendorId: string,
    targetUserId: string,
    dto: UpdateStaffStatusDto,
    actorUserId: string,
    ip?: string,
    userAgent?: string,
  ) {
    if (targetUserId === actorUserId) {
      throw new BadRequestException('You cannot modify your own status');
    }

    const vendorUser = await this.prisma.vendorUser.findUnique({
      where: {
        vendorId_userId: {
          vendorId,
          userId: targetUserId,
        },
      },
    });

    if (!vendorUser) {
      throw new NotFoundException('Staff member not found in this vendor workspace');
    }

    const updated = await this.prisma.vendorUser.update({
      where: { id: vendorUser.id },
      data: { status: dto.status },
    });

    if (dto.status === VendorUserStatus.INACTIVE || dto.status === VendorUserStatus.SUSPENDED) {
      // Invalidate active sessions immediately
      await this.prisma.refreshToken.updateMany({
        where: { userId: targetUserId },
        data: { isRevoked: true },
      });
    }

    await this.auditService.log({
      userId: actorUserId,
      vendorId,
      action: 'STAFF_STATUS_CHANGED',
      entityType: 'VendorUser',
      entityId: vendorUser.id,
      ipAddress: ip,
      userAgent,
      metadata: {
        targetUserId,
        previousStatus: vendorUser.status,
        newStatus: dto.status,
      },
    });

    return updated;
  }

  async removeStaff(
    vendorId: string,
    targetUserId: string,
    actorUserId: string,
    ip?: string,
    userAgent?: string,
  ) {
    if (targetUserId === actorUserId) {
      throw new ForbiddenException('You cannot remove yourself from the workspace');
    }

    const vendorUser = await this.prisma.vendorUser.findUnique({
      where: {
        vendorId_userId: {
          vendorId,
          userId: targetUserId,
        },
      },
      include: {
        user: {
          include: {
            userRoles: {
              include: { role: true },
            },
          },
        },
      },
    });

    if (!vendorUser) {
      throw new NotFoundException('Staff member not found in this vendor workspace');
    }

    // Check if target is a Vendor Admin
    const isVendorAdmin = vendorUser.user.userRoles.some((ur) => ur.role.name === 'VENDOR_ADMIN');
    if (isVendorAdmin) {
      // Check if there are other Vendor Admins
      const otherAdmins = await this.prisma.vendorUser.count({
        where: {
          vendorId,
          userId: { not: targetUserId },
          user: {
            userRoles: {
              some: { role: { name: 'VENDOR_ADMIN' } },
            },
          },
        },
      });

      if (otherAdmins === 0) {
        throw new BadRequestException('Cannot remove the sole Vendor Administrator of this workspace');
      }
    }

    await this.prisma.vendorUser.delete({
      where: { id: vendorUser.id },
    });

    // Revoke their refresh tokens
    await this.prisma.refreshToken.updateMany({
      where: { userId: targetUserId },
      data: { isRevoked: true },
    });

    await this.auditService.log({
      userId: actorUserId,
      vendorId,
      action: 'STAFF_REMOVED',
      entityType: 'User',
      entityId: targetUserId,
      ipAddress: ip,
      userAgent,
    });

    return { message: 'Staff member removed from workspace' };
  }
}
