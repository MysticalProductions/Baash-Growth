import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateVendorDto, UpdateVendorDto, UpdateVendorStatusDto } from './dto/admin.dto';
import { VendorStatus, VendorUserStatus } from '@prisma/client';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async getDashboardMetrics() {
    const [
      totalVendors,
      activeVendors,
      inactiveVendors,
      suspendedVendors,
      pendingVendors,
      totalUsers,
      totalCustomers,
      totalCampaigns,
      completedCampaigns,
      recentVendors,
      recentLogs,
      purchases,
      campaignAgg,
      channelPricing,
      topVendorsByUsage,
    ] = await Promise.all([
      this.prisma.vendor.count(),
      this.prisma.vendor.count({ where: { status: VendorStatus.ACTIVE } }),
      this.prisma.vendor.count({ where: { status: VendorStatus.INACTIVE } }),
      this.prisma.vendor.count({ where: { status: VendorStatus.SUSPENDED } }),
      this.prisma.vendor.count({ where: { status: VendorStatus.PENDING } }),
      this.prisma.user.count(),
      this.prisma.customer.count(),
      this.prisma.campaign.count(),
      this.prisma.campaign.count({ where: { status: 'COMPLETED' } }),
      this.prisma.vendor.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: { vendorUsers: true, customers: true, customerSegments: true, campaigns: true },
          },
        },
      }),
      this.prisma.auditLog.findMany({
        take: 8,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { fullName: true, email: true } },
          vendor: { select: { businessName: true } },
        },
      }),
      this.prisma.creditPurchase.findMany({
        select: {
          id: true,
          channel: true,
          status: true,
          totalAmount: true,
          basePrice: true,
          gstAmount: true,
          credits: true,
          vendorId: true,
        },
      }),
      this.prisma.campaign.aggregate({
        _sum: {
          totalRecipients: true,
          sentCount: true,
          deliveredCount: true,
          failedCount: true,
          consumedCredits: true,
        },
      }),
      this.prisma.channelPricing.findMany(),
      this.prisma.vendor.findMany({
        take: 5,
        orderBy: { wallets: { _count: 'desc' } },
        include: {
          wallets: {
            select: { channel: true, availableCredits: true, totalConsumed: true },
          },
        },
      }),
    ]);

    // Financial calculations
    let totalRevenue = 0;
    let totalBaseRevenue = 0;
    let totalGstCollected = 0;
    let totalCreditsSold = 0;
    let successfulPurchasesCount = 0;
    let pendingPurchasesCount = 0;

    const revenueByChannel: Record<string, { revenue: number; credits: number }> = {
      SMS: { revenue: 0, credits: 0 },
      WHATSAPP: { revenue: 0, credits: 0 },
      EMAIL: { revenue: 0, credits: 0 },
    };

    purchases.forEach((p) => {
      if (p.status === 'COMPLETED') {
        const amt = Number(p.totalAmount);
        totalRevenue += amt;
        totalBaseRevenue += Number(p.basePrice);
        totalGstCollected += Number(p.gstAmount);
        totalCreditsSold += p.credits;
        successfulPurchasesCount++;

        if (revenueByChannel[p.channel]) {
          revenueByChannel[p.channel].revenue += amt;
          revenueByChannel[p.channel].credits += p.credits;
        }
      } else if (p.status === 'PENDING') {
        pendingPurchasesCount++;
      }
    });

    // Communication Usage & Provider Cost Estimation
    const totalSent = campaignAgg._sum.sentCount || 0;
    const totalDelivered = campaignAgg._sum.deliveredCount || 0;
    const totalFailed = campaignAgg._sum.failedCount || 0;
    const totalCreditsConsumed = campaignAgg._sum.consumedCredits || 0;

    // Estimate provider costs based on ChannelPricing
    let estimatedProviderCost = 0;
    channelPricing.forEach((cp) => {
      const costPerUnit = Number(cp.estimatedProviderCost);
      // Rough attribution based on selling unit
      estimatedProviderCost += (totalCreditsConsumed / 3) * costPerUnit;
    });

    const communicationGrossProfit = Math.max(0, totalCreditsConsumed - estimatedProviderCost);
    const grossMarginPercentage =
      totalCreditsConsumed > 0 ? Math.round((communicationGrossProfit / totalCreditsConsumed) * 100) : 0;

    const deliverySuccessRate =
      totalSent > 0 ? Math.round((totalDelivered / totalSent) * 100) : 100;

    return {
      metrics: {
        platform: {
          totalVendors,
          activeVendors,
          inactiveVendors,
          suspendedVendors,
          pendingVendors,
          totalUsers,
          totalCustomers,
          totalCampaigns,
          completedCampaigns,
        },
        revenue: {
          totalRevenue,
          totalBaseRevenue,
          totalGstCollected,
          totalCreditsSold,
          successfulPurchasesCount,
          pendingPurchasesCount,
          revenueByChannel,
        },
        usage: {
          totalSent,
          totalDelivered,
          totalFailed,
          totalCreditsConsumed,
          deliverySuccessRate,
        },
        businessPerformance: {
          totalCreditsConsumedRevenue: totalCreditsConsumed,
          estimatedProviderCost: Math.round(estimatedProviderCost * 100) / 100,
          communicationGrossProfit: Math.round(communicationGrossProfit * 100) / 100,
          grossMarginPercentage,
        },
      },
      topVendorsByUsage: topVendorsByUsage.map((v) => ({
        id: v.id,
        businessName: v.businessName,
        totalConsumed: v.wallets.reduce((s, w) => s + w.totalConsumed, 0),
        availableCredits: v.wallets.reduce((s, w) => s + w.availableCredits, 0),
      })),
      recentVendors,
      recentLogs,
    };
  }

  async getAuditLogs(params: {
    vendorId?: string;
    userId?: string;
    action?: string;
    entityType?: string;
    page?: number;
    limit?: number;
  }) {
    const { vendorId, userId, action, entityType, page = 1, limit = 50 } = params;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (vendorId) where.vendorId = vendorId;
    if (userId) where.userId = userId;
    if (action) where.action = { contains: action, mode: 'insensitive' };
    if (entityType) where.entityType = { contains: entityType, mode: 'insensitive' };

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, fullName: true, email: true } },
          vendor: { select: { id: true, businessName: true } },
        },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      data: logs,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getVendors(params: {
    search?: string;
    status?: VendorStatus;
    page?: number;
    limit?: number;
  }) {
    const { search, status, page = 1, limit = 10 } = params;
    const safePage = Math.max(1, Number(page) || 1);
    const safeLimit = Math.max(1, Number(limit) || 10);
    const skip = (safePage - 1) * safeLimit;

    const where: any = {};
    if (status && (status as any) !== 'ALL' && Object.values(VendorStatus).includes(status)) {
      where.status = status;
    }
    if (search && search.trim() !== '') {
      where.OR = [
        { businessName: { contains: search.trim(), mode: 'insensitive' } },
        { businessEmail: { contains: search.trim(), mode: 'insensitive' } },
        { businessPhone: { contains: search.trim(), mode: 'insensitive' } },
      ];
    }

    const [vendors, total] = await Promise.all([
      this.prisma.vendor.findMany({
        where,
        skip,
        take: safeLimit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: {
              vendorUsers: true,
              invitations: true,
              customers: true,
              customerSegments: true,
            },
          },
          vendorUsers: {
            take: 3,
            include: {
              user: {
                select: {
                  id: true,
                  fullName: true,
                  email: true,
                  userRoles: {
                    include: {
                      role: true,
                    },
                  },
                },
              },
            },
          },
        },
      }),
      this.prisma.vendor.count({ where }),
    ]);

    return {
      vendors,
      pagination: {
        total,
        page: safePage,
        limit: safeLimit,
        totalPages: Math.ceil(total / safeLimit),
      },
    };
  }

  async getVendorById(id: string) {
    const vendor = await this.prisma.vendor.findUnique({
      where: { id },
      include: {
        vendorUsers: {
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                email: true,
                phone: true,
                isActive: true,
                lastLoginAt: true,
                userRoles: {
                  include: {
                    role: true,
                  },
                },
              },
            },
          },
        },
        invitations: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            role: true,
          },
        },
        _count: {
          select: {
            vendorUsers: true,
            invitations: true,
            auditLogs: true,
            customers: true,
            customerSegments: true,
          },
        },
      },
    });

    if (!vendor) {
      throw new NotFoundException(`Vendor with ID ${id} not found`);
    }

    return vendor;
  }

  async createVendor(dto: CreateVendorDto, currentUserId: string, ip?: string, userAgent?: string) {
    // Check if vendor email is taken
    const existingVendor = await this.prisma.vendor.findUnique({
      where: { businessEmail: dto.businessEmail.toLowerCase().trim() },
    });

    if (existingVendor) {
      throw new ConflictException('A vendor with this business email already exists');
    }

    // Hash admin password or generate default
    const password = dto.adminPassword || 'VendorAdmin@2026';
    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(password, salt);

    // Get VENDOR_ADMIN role
    const vendorAdminRole = await this.prisma.role.findUnique({
      where: { name: 'VENDOR_ADMIN' },
    });

    if (!vendorAdminRole) {
      throw new BadRequestException('System role VENDOR_ADMIN is missing. Please run database seed.');
    }

    // Execute in a transaction for complete atomicity
    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Create Vendor
      const vendor = await tx.vendor.create({
        data: {
          businessName: dto.businessName.trim(),
          businessEmail: dto.businessEmail.toLowerCase().trim(),
          businessPhone: dto.businessPhone?.trim(),
          businessLogo: dto.businessLogo,
          businessAddress: dto.businessAddress?.trim(),
          status: dto.status || VendorStatus.ACTIVE,
        },
      });

      // 2. Create or find Admin User
      let user = await tx.user.findUnique({
        where: { email: dto.adminEmail.toLowerCase().trim() },
      });

      if (!user) {
        user = await tx.user.create({
          data: {
            email: dto.adminEmail.toLowerCase().trim(),
            fullName: dto.adminName.trim(),
            passwordHash,
            isActive: true,
            isEmailVerified: true,
          },
        });
      }

      // 3. Assign VENDOR_ADMIN role to user
      await tx.userRole.upsert({
        where: {
          userId_roleId: {
            userId: user.id,
            roleId: vendorAdminRole.id,
          },
        },
        update: {},
        create: {
          userId: user.id,
          roleId: vendorAdminRole.id,
        },
      });

      // 4. Link User to Vendor
      const vendorUser = await tx.vendorUser.create({
        data: {
          vendorId: vendor.id,
          userId: user.id,
          status: VendorUserStatus.ACTIVE,
        },
      });

      // 5. Initialize all 3 channel wallets for vendor
      await Promise.all(
        ['SMS', 'WHATSAPP', 'EMAIL'].map((ch: any) =>
          tx.vendorWallet.create({
            data: {
              vendorId: vendor.id,
              channel: ch,
              availableCredits: 0,
              reservedCredits: 0,
              totalPurchased: 0,
              totalConsumed: 0,
              totalRefunded: 0,
            },
          }),
        ),
      );

      return { vendor, user, vendorUser };
    });

    // Write audit log
    await this.auditService.log({
      userId: currentUserId,
      vendorId: result.vendor.id,
      action: 'VENDOR_CREATED',
      entityType: 'Vendor',
      entityId: result.vendor.id,
      ipAddress: ip,
      userAgent,
      metadata: {
        businessName: result.vendor.businessName,
        adminEmail: dto.adminEmail,
      },
    });

    return result.vendor;
  }

  async updateVendor(
    id: string,
    dto: UpdateVendorDto,
    currentUserId: string,
    ip?: string,
    userAgent?: string,
  ) {
    const existing = await this.prisma.vendor.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Vendor with ID ${id} not found`);
    }

    if (dto.businessEmail && dto.businessEmail !== existing.businessEmail) {
      const emailTaken = await this.prisma.vendor.findUnique({
        where: { businessEmail: dto.businessEmail.toLowerCase().trim() },
      });
      if (emailTaken) {
        throw new ConflictException('This business email is already registered to another vendor');
      }
    }

    const updated = await this.prisma.vendor.update({
      where: { id },
      data: {
        businessName: dto.businessName ? dto.businessName.trim() : undefined,
        businessEmail: dto.businessEmail ? dto.businessEmail.toLowerCase().trim() : undefined,
        businessPhone: dto.businessPhone !== undefined ? dto.businessPhone?.trim() : undefined,
        businessLogo: dto.businessLogo !== undefined ? dto.businessLogo : undefined,
        businessAddress: dto.businessAddress !== undefined ? dto.businessAddress?.trim() : undefined,
      },
    });

    await this.auditService.log({
      userId: currentUserId,
      vendorId: id,
      action: 'VENDOR_UPDATED',
      entityType: 'Vendor',
      entityId: id,
      ipAddress: ip,
      userAgent,
      metadata: { changes: dto },
    });

    return updated;
  }

  async updateVendorStatus(
    id: string,
    dto: UpdateVendorStatusDto,
    currentUserId: string,
    ip?: string,
    userAgent?: string,
  ) {
    const existing = await this.prisma.vendor.findUnique({
      where: { id },
      include: { vendorUsers: true },
    });

    if (!existing) {
      throw new NotFoundException(`Vendor with ID ${id} not found`);
    }

    const updated = await this.prisma.vendor.update({
      where: { id },
      data: { status: dto.status },
    });

    // If suspending or deactivating vendor, revoke all active refresh tokens for its users
    if (dto.status === VendorStatus.SUSPENDED || dto.status === VendorStatus.INACTIVE) {
      const userIds = existing.vendorUsers.map((vu) => vu.userId);
      if (userIds.length > 0) {
        await this.prisma.refreshToken.updateMany({
          where: { userId: { in: userIds } },
          data: { isRevoked: true },
        });
      }
    }

    await this.auditService.log({
      userId: currentUserId,
      vendorId: id,
      action: 'VENDOR_STATUS_CHANGED',
      entityType: 'Vendor',
      entityId: id,
      ipAddress: ip,
      userAgent,
      metadata: {
        previousStatus: existing.status,
        newStatus: dto.status,
        reason: dto.reason,
      },
    });

    return updated;
  }
}
