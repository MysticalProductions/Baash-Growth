import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { UpdateVendorProfileDto } from './dto/vendor.dto';

@Injectable()
export class VendorsService {
  private readonly logger = new Logger(VendorsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async getProfile(vendorId: string) {
    const vendor = await this.prisma.vendor.findUnique({
      where: { id: vendorId },
      include: {
        _count: {
          select: {
            vendorUsers: true,
            invitations: true,
          },
        },
      },
    });

    if (!vendor) {
      throw new NotFoundException('Vendor profile not found');
    }

    return vendor;
  }

  async updateProfile(
    vendorId: string,
    dto: UpdateVendorProfileDto,
    userId: string,
    ip?: string,
    userAgent?: string,
  ) {
    const existing = await this.prisma.vendor.findUnique({
      where: { id: vendorId },
    });

    if (!existing) {
      throw new NotFoundException('Vendor profile not found');
    }

    if (dto.businessEmail && dto.businessEmail !== existing.businessEmail) {
      const emailTaken = await this.prisma.vendor.findUnique({
        where: { businessEmail: dto.businessEmail.toLowerCase().trim() },
      });
      if (emailTaken) {
        throw new ConflictException('This business email is already associated with another vendor');
      }
    }

    const updated = await this.prisma.vendor.update({
      where: { id: vendorId },
      data: {
        businessName: dto.businessName ? dto.businessName.trim() : undefined,
        businessEmail: dto.businessEmail ? dto.businessEmail.toLowerCase().trim() : undefined,
        businessPhone: dto.businessPhone !== undefined ? dto.businessPhone?.trim() : undefined,
        businessLogo: dto.businessLogo !== undefined ? dto.businessLogo : undefined,
        businessAddress: dto.businessAddress !== undefined ? dto.businessAddress?.trim() : undefined,
      },
    });

    await this.auditService.log({
      userId,
      vendorId,
      action: 'VENDOR_PROFILE_UPDATED',
      entityType: 'Vendor',
      entityId: vendorId,
      ipAddress: ip,
      userAgent,
      metadata: { changes: dto },
    });

    return updated;
  }

  async getDashboard(vendorId: string) {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [
      vendor,
      staffCount,
      pendingInvites,
      totalCustomers,
      newCustomersThisMonth,
      smsConsentCount,
      whatsAppConsentCount,
      emailConsentCount,
      totalSegments,
      vendorWallets,
      campaignAgg,
      totalCampaignsCount,
    ] = await Promise.all([
      this.prisma.vendor.findUnique({ where: { id: vendorId } }),
      this.prisma.vendorUser.count({
        where: { vendorId, status: 'ACTIVE' },
      }),
      this.prisma.invitation.count({
        where: { vendorId, status: 'PENDING' },
      }),
      this.prisma.customer.count({
        where: { vendorId },
      }),
      this.prisma.customer.count({
        where: {
          vendorId,
          createdAt: { gte: startOfMonth },
        },
      }),
      this.prisma.customerConsent.count({
        where: {
          customer: { vendorId },
          channel: 'SMS',
          status: 'OPTED_IN',
        },
      }),
      this.prisma.customerConsent.count({
        where: {
          customer: { vendorId },
          channel: 'WHATSAPP',
          status: 'OPTED_IN',
        },
      }),
      this.prisma.customerConsent.count({
        where: {
          customer: { vendorId },
          channel: 'EMAIL',
          status: 'OPTED_IN',
        },
      }),
      this.prisma.customerSegment.count({
        where: { vendorId },
      }),
      this.prisma.vendorWallet.findMany({
        where: { vendorId },
      }),
      this.prisma.campaign.aggregate({
        where: { vendorId },
        _sum: {
          sentCount: true,
          deliveredCount: true,
          failedCount: true,
          consumedCredits: true,
        },
      }),
      this.prisma.campaign.count({ where: { vendorId } }),
    ]);

    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }

    const smsWallet = vendorWallets.find((w) => w.channel === 'SMS');
    const whatsAppWallet = vendorWallets.find((w) => w.channel === 'WHATSAPP');
    const emailWallet = vendorWallets.find((w) => w.channel === 'EMAIL');

    const totalSent = campaignAgg._sum.sentCount || 0;
    const totalDelivered = campaignAgg._sum.deliveredCount || 0;
    const totalFailed = campaignAgg._sum.failedCount || 0;
    const deliveryRate = totalSent > 0 ? `${Math.round((totalDelivered / totalSent) * 100)}%` : '100%';

    return {
      vendor: {
        id: vendor.id,
        businessName: vendor.businessName,
        businessEmail: vendor.businessEmail,
        status: vendor.status,
      },
      staffOverview: {
        activeStaffCount: staffCount,
        pendingInvitationsCount: pendingInvites,
      },
      crmMetrics: {
        totalCustomers,
        newCustomersThisMonth,
        smsConsentCount,
        whatsAppConsentCount,
        emailConsentCount,
        totalSegments,
      },
      channelWallets: {
        smsCredits: {
          balance: smsWallet?.availableCredits || 0,
          reserved: smsWallet?.reservedCredits || 0,
          totalPurchased: smsWallet?.totalPurchased || 0,
          totalConsumed: smsWallet?.totalConsumed || 0,
        },
        whatsAppCredits: {
          balance: whatsAppWallet?.availableCredits || 0,
          reserved: whatsAppWallet?.reservedCredits || 0,
          totalPurchased: whatsAppWallet?.totalPurchased || 0,
          totalConsumed: whatsAppWallet?.totalConsumed || 0,
        },
        emailCredits: {
          balance: emailWallet?.availableCredits || 0,
          reserved: emailWallet?.reservedCredits || 0,
          totalPurchased: emailWallet?.totalPurchased || 0,
          totalConsumed: emailWallet?.totalConsumed || 0,
        },
      },
      campaignSummary: {
        totalCampaigns: totalCampaignsCount,
        messagesSent: totalSent,
        messagesDelivered: totalDelivered,
        messagesFailed: totalFailed,
        avgDeliveryRate: deliveryRate,
      },
    };
  }

  /**
   * Complete Vendor Analytics Engine with Date Range Filtering
   */
  async getVendorAnalytics(vendorId: string, query: { range?: string; startDate?: string; endDate?: string }) {
    const now = new Date();
    let fromDate: Date | undefined;
    let toDate: Date | undefined = now;

    if (query.range === 'today') {
      fromDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    } else if (query.range === '7d') {
      fromDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (query.range === '30d') {
      fromDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    } else if (query.range === 'this_month') {
      fromDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
    } else if (query.range === 'custom' && query.startDate) {
      fromDate = new Date(query.startDate);
      if (query.endDate) {
        toDate = new Date(query.endDate);
        toDate.setHours(23, 59, 59, 999);
      }
    } else {
      // Default 30 days
      fromDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    const campaignWhere: any = { vendorId };
    const customerWhere: any = { vendorId };
    const txWhere: any = { vendorId };

    if (fromDate) {
      campaignWhere.createdAt = { gte: fromDate, lte: toDate };
      customerWhere.createdAt = { gte: fromDate, lte: toDate };
      txWhere.createdAt = { gte: fromDate, lte: toDate };
    }

    const [
      totalCustomers,
      newCustomersInRange,
      campaignsInRange,
      channelUsageGroup,
      vendorWallets,
      recentCampaigns,
      recentTransactions,
    ] = await Promise.all([
      this.prisma.customer.count({ where: { vendorId } }),
      this.prisma.customer.count({ where: customerWhere }),
      this.prisma.campaign.findMany({
        where: campaignWhere,
        select: {
          id: true,
          name: true,
          channel: true,
          status: true,
          sentCount: true,
          deliveredCount: true,
          readCount: true,
          failedCount: true,
          consumedCredits: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.campaign.groupBy({
        by: ['channel'],
        where: campaignWhere,
        _sum: {
          sentCount: true,
          deliveredCount: true,
          failedCount: true,
          consumedCredits: true,
        },
        _count: { id: true },
      }),
      this.prisma.vendorWallet.findMany({ where: { vendorId } }),
      this.prisma.campaign.findMany({
        where: { vendorId },
        take: 5,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.walletTransaction.findMany({
        where: { vendorId },
        take: 5,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const totalSent = campaignsInRange.reduce((s, c) => s + c.sentCount, 0);
    const totalDelivered = campaignsInRange.reduce((s, c) => s + c.deliveredCount, 0);
    const totalFailed = campaignsInRange.reduce((s, c) => s + c.failedCount, 0);
    const totalRead = campaignsInRange.reduce((s, c) => s + c.readCount, 0);
    const totalCreditsConsumed = campaignsInRange.reduce((s, c) => s + c.consumedCredits, 0);
    const deliveryRate = totalSent > 0 ? Math.round((totalDelivered / totalSent) * 100) : 100;

    const channelStats = {
      SMS: { sent: 0, delivered: 0, failed: 0, credits: 0, campaigns: 0 },
      WHATSAPP: { sent: 0, delivered: 0, failed: 0, credits: 0, campaigns: 0 },
      EMAIL: { sent: 0, delivered: 0, failed: 0, credits: 0, campaigns: 0 },
    };

    channelUsageGroup.forEach((g) => {
      if (channelStats[g.channel]) {
        channelStats[g.channel].sent = g._sum.sentCount || 0;
        channelStats[g.channel].delivered = g._sum.deliveredCount || 0;
        channelStats[g.channel].failed = g._sum.failedCount || 0;
        channelStats[g.channel].credits = g._sum.consumedCredits || 0;
        channelStats[g.channel].campaigns = g._count.id;
      }
    });

    const walletBalances = {
      SMS: { available: 0, reserved: 0 },
      WHATSAPP: { available: 0, reserved: 0 },
      EMAIL: { available: 0, reserved: 0 },
    };

    vendorWallets.forEach((w) => {
      if (walletBalances[w.channel]) {
        walletBalances[w.channel].available = w.availableCredits;
        walletBalances[w.channel].reserved = w.reservedCredits;
      }
    });

    return {
      timeframe: {
        range: query.range || '30d',
        fromDate: fromDate?.toISOString(),
        toDate: toDate?.toISOString(),
      },
      summary: {
        totalCustomers,
        newCustomersInRange,
        totalCampaigns: campaignsInRange.length,
        totalSent,
        totalDelivered,
        totalFailed,
        totalRead,
        deliveryRate,
        totalCreditsConsumed,
      },
      channelStats,
      walletBalances,
      recentCampaigns,
      recentTransactions,
    };
  }
}
