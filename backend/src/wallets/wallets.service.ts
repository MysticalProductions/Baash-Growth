import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { WalletChannel, TransactionType, TransactionDirection, Prisma } from '@prisma/client';
import { AdjustWalletDto, WalletFilterDto } from './dto/wallet.dto';

const ALL_CHANNELS: WalletChannel[] = [
  WalletChannel.SMS,
  WalletChannel.WHATSAPP,
  WalletChannel.EMAIL,
];

@Injectable()
export class WalletsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Guarantees that all 3 channel wallets exist for a vendor with 0 balance.
   */
  async ensureWalletsExist(vendorId: string, tx?: Prisma.TransactionClient) {
    const client = tx || this.prisma;
    const existing = await client.vendorWallet.findMany({
      where: { vendorId },
    });

    const existingChannels = new Set(existing.map((w) => w.channel));
    const missing = ALL_CHANNELS.filter((ch) => !existingChannels.has(ch));

    if (missing.length > 0) {
      await Promise.all(
        missing.map((ch) =>
          client.vendorWallet.create({
            data: {
              vendorId,
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
    }
  }

  /**
   * Retrieve all 3 wallets for a vendor with summary metrics.
   */
  async getVendorWallets(vendorId: string) {
    await this.ensureWalletsExist(vendorId);

    const wallets = await this.prisma.vendorWallet.findMany({
      where: { vendorId },
      orderBy: { channel: 'asc' },
    });

    // Calculate totals across wallets
    let totalAvailable = 0;
    let totalPurchased = 0;
    let totalConsumed = 0;

    wallets.forEach((w) => {
      totalAvailable += w.availableCredits;
      totalPurchased += w.totalPurchased;
      totalConsumed += w.totalConsumed;
    });

    return {
      wallets,
      summary: {
        totalAvailable,
        totalPurchased,
        totalConsumed,
      },
    };
  }

  /**
   * Retrieve a specific channel wallet for a vendor.
   */
  async getChannelWallet(vendorId: string, channel: WalletChannel) {
    await this.ensureWalletsExist(vendorId);

    const wallet = await this.prisma.vendorWallet.findUnique({
      where: {
        vendorId_channel: {
          vendorId,
          channel,
        },
      },
    });

    if (!wallet) {
      throw new NotFoundException(`Wallet for channel ${channel} not found`);
    }

    return wallet;
  }

  /**
   * Paginated transaction ledger for a vendor, filtered by channel, type, direction, and date range.
   */
  async getTransactions(
    vendorId: string,
    channel?: WalletChannel,
    filters: WalletFilterDto = {},
  ) {
    const { type, direction, startDate, endDate, page = 1, limit = 20 } = filters;
    const skip = (Number(page) - 1) * Number(limit);

    const where: Prisma.WalletTransactionWhereInput = {
      vendorId,
    };

    const effectiveChannel = channel || filters.channel;
    if (effectiveChannel && (effectiveChannel as any) !== 'ALL') {
      where.channel = effectiveChannel;
    }

    if (type && (type as any) !== 'ALL') {
      where.type = type;
    }

    if (direction) {
      where.direction = direction;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    const [transactions, total] = await Promise.all([
      this.prisma.walletTransaction.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.walletTransaction.count({ where }),
    ]);

    return {
      data: transactions,
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / Number(limit)) || 1,
    };
  }

  /**
   * Get transaction details by ID, enforcing multi-tenant isolation.
   */
  async getTransactionById(vendorId: string, transactionId: string) {
    const tx = await this.prisma.walletTransaction.findFirst({
      where: {
        id: transactionId,
        vendorId,
      },
      include: {
        wallet: true,
      },
    });

    if (!tx) {
      throw new NotFoundException('Transaction not found or access denied');
    }

    return tx;
  }

  /**
   * Credits a wallet with full ledger recording and idempotency protection.
   */
  async creditWallet(
    vendorId: string,
    channel: WalletChannel,
    credits: number,
    type: TransactionType,
    description: string,
    options?: {
      referenceType?: string;
      referenceId?: string;
      idempotencyKey?: string;
      metadata?: any;
    },
    tx?: Prisma.TransactionClient,
  ) {
    if (credits <= 0) {
      throw new BadRequestException('Credits to add must be greater than zero');
    }

    const execute = async (client: Prisma.TransactionClient) => {
      // 1. Idempotency Check
      if (options?.idempotencyKey) {
        const existingTx = await client.walletTransaction.findUnique({
          where: { idempotencyKey: options.idempotencyKey },
        });
        if (existingTx) {
          return existingTx; // Already processed idempotently
        }
      }

      await this.ensureWalletsExist(vendorId, client);

      const wallet = await client.vendorWallet.findUnique({
        where: {
          vendorId_channel: { vendorId, channel },
        },
      });

      if (!wallet) {
        throw new NotFoundException(`Wallet not found for vendor and channel ${channel}`);
      }

      const balanceBefore = wallet.availableCredits;
      const balanceAfter = balanceBefore + credits;

      // Update wallet
      await client.vendorWallet.update({
        where: { id: wallet.id },
        data: {
          availableCredits: balanceAfter,
          totalPurchased:
            type === TransactionType.PURCHASE
              ? wallet.totalPurchased + credits
              : wallet.totalPurchased,
          lastTransactionAt: new Date(),
        },
      });

      // Write immutable ledger entry
      const ledgerEntry = await client.walletTransaction.create({
        data: {
          vendorId,
          walletId: wallet.id,
          channel,
          type,
          direction: TransactionDirection.CREDIT,
          credits,
          balanceBefore,
          balanceAfter,
          referenceType: options?.referenceType,
          referenceId: options?.referenceId,
          description,
          idempotencyKey: options?.idempotencyKey,
          metadata: options?.metadata || Prisma.JsonNull,
        },
      });

      return ledgerEntry;
    };

    if (tx) {
      return execute(tx);
    } else {
      return this.prisma.$transaction(execute);
    }
  }

  /**
   * Debits a wallet with ledger recording, enforcing non-negative available balances.
   */
  async debitWallet(
    vendorId: string,
    channel: WalletChannel,
    credits: number,
    type: TransactionType,
    description: string,
    options?: {
      referenceType?: string;
      referenceId?: string;
      idempotencyKey?: string;
      metadata?: any;
    },
    tx?: Prisma.TransactionClient,
  ) {
    if (credits <= 0) {
      throw new BadRequestException('Credits to debit must be greater than zero');
    }

    const execute = async (client: Prisma.TransactionClient) => {
      // Idempotency check
      if (options?.idempotencyKey) {
        const existingTx = await client.walletTransaction.findUnique({
          where: { idempotencyKey: options.idempotencyKey },
        });
        if (existingTx) {
          return existingTx;
        }
      }

      await this.ensureWalletsExist(vendorId, client);

      const wallet = await client.vendorWallet.findUnique({
        where: {
          vendorId_channel: { vendorId, channel },
        },
      });

      if (!wallet) {
        throw new NotFoundException(`Wallet not found for channel ${channel}`);
      }

      if (wallet.availableCredits < credits) {
        throw new BadRequestException(
          `Insufficient ${channel} credits balance. Available: ${wallet.availableCredits}, Requested: ${credits}`,
        );
      }

      const balanceBefore = wallet.availableCredits;
      const balanceAfter = balanceBefore - credits;

      // Update wallet
      await client.vendorWallet.update({
        where: { id: wallet.id },
        data: {
          availableCredits: balanceAfter,
          totalConsumed: wallet.totalConsumed + credits,
          lastTransactionAt: new Date(),
        },
      });

      // Write immutable ledger entry
      const ledgerEntry = await client.walletTransaction.create({
        data: {
          vendorId,
          walletId: wallet.id,
          channel,
          type,
          direction: TransactionDirection.DEBIT,
          credits,
          balanceBefore,
          balanceAfter,
          referenceType: options?.referenceType,
          referenceId: options?.referenceId,
          description,
          idempotencyKey: options?.idempotencyKey,
          metadata: options?.metadata || Prisma.JsonNull,
        },
      });

      return ledgerEntry;
    };

    if (tx) {
      return execute(tx);
    } else {
      return this.prisma.$transaction(execute);
    }
  }

  /**
   * Manual credit adjustment by Baash Admin with mandatory audit logging.
   */
  async adjustWalletByAdmin(adminUserId: string, dto: AdjustWalletDto) {
    const { vendorId, channel, quantity, action, reason } = dto;

    if (!reason || reason.trim().length < 5) {
      throw new BadRequestException('A descriptive adjustment reason (minimum 5 characters) is mandatory');
    }

    return this.prisma.$transaction(async (tx) => {
      await this.ensureWalletsExist(vendorId, tx);

      const wallet = await tx.vendorWallet.findUnique({
        where: {
          vendorId_channel: { vendorId, channel },
        },
      });

      if (!wallet) {
        throw new NotFoundException('Vendor wallet not found');
      }

      const balanceBefore = wallet.availableCredits;
      let balanceAfter = balanceBefore;

      if (action === TransactionDirection.CREDIT) {
        balanceAfter = balanceBefore + quantity;
      } else {
        // Enforce critical business rule: No negative available balance
        if (balanceBefore < quantity) {
          throw new BadRequestException(
            `Debit of ${quantity} exceeds available ${channel} balance of ${balanceBefore}. Negative balances are strictly forbidden.`,
          );
        }
        balanceAfter = balanceBefore - quantity;
      }

      // Update wallet balance
      await tx.vendorWallet.update({
        where: { id: wallet.id },
        data: {
          availableCredits: balanceAfter,
          lastTransactionAt: new Date(),
        },
      });

      // Create ledger entry
      const transaction = await tx.walletTransaction.create({
        data: {
          vendorId,
          walletId: wallet.id,
          channel,
          type: TransactionType.ADMIN_ADJUSTMENT,
          direction: action,
          credits: quantity,
          balanceBefore,
          balanceAfter,
          referenceType: 'ADMIN_ADJUSTMENT',
          referenceId: adminUserId,
          description: `[Admin Manual ${action}]: ${reason.trim()}`,
        },
      });

      // Create audit log
      const auditLog = await tx.walletAuditLog.create({
        data: {
          vendorId,
          walletId: wallet.id,
          adminUserId,
          channel,
          action: `MANUAL_${action}`,
          credits: quantity,
          reason: reason.trim(),
          balanceBefore,
          balanceAfter,
        },
      });

      return {
        success: true,
        transaction,
        auditLog,
        wallet: {
          channel,
          balanceBefore,
          balanceAfter,
        },
      };
    });
  }

  /**
   * Admin: View all vendor wallets with their SMS, WhatsApp, and Email balances.
   */
  async getAdminWalletsOverview(search?: string, page = 1, limit = 20) {
    const skip = (Number(page) - 1) * Number(limit);
    const where: Prisma.VendorWhereInput = {};

    if (search && search.trim()) {
      where.OR = [
        { businessName: { contains: search.trim(), mode: 'insensitive' } },
        { businessEmail: { contains: search.trim(), mode: 'insensitive' } },
      ];
    }

    const [vendors, total] = await Promise.all([
      this.prisma.vendor.findMany({
        where,
        skip,
        take: Number(limit),
        include: {
          wallets: true,
        },
        orderBy: { businessName: 'asc' },
      }),
      this.prisma.vendor.count({ where }),
    ]);

    // Ensure all vendors have their 3 wallets represented
    const mapped = vendors.map((v) => {
      const sms = v.wallets.find((w) => w.channel === WalletChannel.SMS)?.availableCredits || 0;
      const whatsApp = v.wallets.find((w) => w.channel === WalletChannel.WHATSAPP)?.availableCredits || 0;
      const email = v.wallets.find((w) => w.channel === WalletChannel.EMAIL)?.availableCredits || 0;

      return {
        id: v.id,
        businessName: v.businessName,
        businessEmail: v.businessEmail,
        status: v.status,
        balances: {
          sms,
          whatsApp,
          email,
          total: sms + whatsApp + email,
        },
        wallets: v.wallets,
      };
    });

    return {
      vendors: mapped,
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / Number(limit)) || 1,
    };
  }

  /**
   * Admin: Get all transactions across vendors with filters.
   */
  async getAdminTransactions(filters: WalletFilterDto & { vendorId?: string }) {
    const { vendorId, channel, type, direction, startDate, endDate, page = 1, limit = 20 } = filters;
    const skip = (Number(page) - 1) * Number(limit);

    const where: Prisma.WalletTransactionWhereInput = {};

    if (vendorId) where.vendorId = vendorId;
    if (channel && (channel as any) !== 'ALL') where.channel = channel;
    if (type && (type as any) !== 'ALL') where.type = type;
    if (direction && (direction as any) !== 'ALL') where.direction = direction;

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    const [transactions, total] = await Promise.all([
      this.prisma.walletTransaction.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          vendor: {
            select: { id: true, businessName: true, businessEmail: true },
          },
        },
      }),
      this.prisma.walletTransaction.count({ where }),
    ]);

    return {
      data: transactions,
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / Number(limit)) || 1,
    };
  }

  /**
   * Admin: Summary metrics for total credits sold, revenue, and channel breakdown.
   */
  async getAdminWalletReports() {
    const [
      totalPurchasesCount,
      completedPurchases,
      channelStats,
      recentTransactions,
    ] = await Promise.all([
      this.prisma.creditPurchase.count(),
      this.prisma.creditPurchase.findMany({
        where: { status: 'COMPLETED' },
        select: {
          channel: true,
          credits: true,
          totalAmount: true,
          basePrice: true,
          gstAmount: true,
        },
      }),
      this.prisma.walletTransaction.groupBy({
        by: ['channel', 'type'],
        where: { direction: TransactionDirection.CREDIT },
        _sum: { credits: true },
      }),
      this.prisma.walletTransaction.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          vendor: { select: { businessName: true } },
        },
      }),
    ]);

    let totalRevenue = new Prisma.Decimal(0);
    let totalBaseRevenue = new Prisma.Decimal(0);
    let totalGstCollected = new Prisma.Decimal(0);
    let totalCreditsSold = 0;

    const channelBreakdown = {
      SMS: { creditsSold: 0, revenue: 0, purchasesCount: 0 },
      WHATSAPP: { creditsSold: 0, revenue: 0, purchasesCount: 0 },
      EMAIL: { creditsSold: 0, revenue: 0, purchasesCount: 0 },
    };

    completedPurchases.forEach((p) => {
      totalRevenue = totalRevenue.plus(p.totalAmount);
      totalBaseRevenue = totalBaseRevenue.plus(p.basePrice);
      totalGstCollected = totalGstCollected.plus(p.gstAmount);
      totalCreditsSold += p.credits;

      if (channelBreakdown[p.channel]) {
        channelBreakdown[p.channel].creditsSold += p.credits;
        channelBreakdown[p.channel].revenue += Number(p.totalAmount);
        channelBreakdown[p.channel].purchasesCount += 1;
      }
    });

    return {
      summary: {
        totalRevenue: Number(totalRevenue),
        totalBaseRevenue: Number(totalBaseRevenue),
        totalGstCollected: Number(totalGstCollected),
        totalCreditsSold,
        totalPurchasesCount,
        completedPurchasesCount: completedPurchases.length,
      },
      channelBreakdown,
      recentTransactions,
    };
  }

  /**
   * Admin: Complete Financial and Wallet Reconciliation Engine.
   * Compares stored wallet balances against immutable double-entry ledger transactions,
   * verifies active campaign reservations, and detects any accounting discrepancies.
   */
  async reconcileWallets(vendorId?: string) {
    const where: Prisma.VendorWalletWhereInput = {};
    if (vendorId) where.vendorId = vendorId;

    const wallets = await this.prisma.vendorWallet.findMany({
      where,
      include: {
        vendor: { select: { id: true, businessName: true, businessEmail: true } },
      },
      orderBy: { vendorId: 'asc' },
    });

    const reconciliationResults: any[] = [];
    let consistentWalletsCount = 0;
    let discrepanciesCount = 0;
    let totalStoredAvailable = 0;
    let totalStoredReserved = 0;
    let totalLedgerAvailable = 0;

    for (const wallet of wallets) {
      // 1. Fetch all immutable ledger transactions for this wallet
      const transactions = await this.prisma.walletTransaction.findMany({
        where: { walletId: wallet.id },
      });

      // Calculate ledger-derived balance
      let creditsIn = 0;
      let creditsOut = 0;
      transactions.forEach((tx) => {
        if (tx.direction === TransactionDirection.CREDIT) {
          creditsIn += tx.credits;
        } else if (tx.direction === TransactionDirection.DEBIT) {
          creditsOut += tx.credits;
        }
      });

      // Stored vs Ledger balance
      const ledgerDerivedAvailable = creditsIn - creditsOut;
      const availableDiscrepancy = wallet.availableCredits - ledgerDerivedAvailable;

      // 2. Audit active campaign reservations
      const activeCampaigns = await this.prisma.campaign.findMany({
        where: {
          vendorId: wallet.vendorId,
          channel: wallet.channel,
          status: { in: ['QUEUED', 'PROCESSING', 'SCHEDULED'] },
        },
        select: { id: true, name: true, reservedCredits: true, status: true },
      });

      const totalActiveCampaignReservations = activeCampaigns.reduce(
        (sum, c) => sum + c.reservedCredits,
        0,
      );
      const reservationDiscrepancy = wallet.reservedCredits - totalActiveCampaignReservations;

      const isConsistent = availableDiscrepancy === 0 && reservationDiscrepancy === 0;
      if (isConsistent) {
        consistentWalletsCount++;
      } else {
        discrepanciesCount++;
      }

      totalStoredAvailable += wallet.availableCredits;
      totalStoredReserved += wallet.reservedCredits;
      totalLedgerAvailable += ledgerDerivedAvailable;

      reconciliationResults.push({
        walletId: wallet.id,
        vendorId: wallet.vendorId,
        vendorName: wallet.vendor.businessName,
        channel: wallet.channel,
        balances: {
          storedAvailable: wallet.availableCredits,
          storedReserved: wallet.reservedCredits,
          totalPurchased: wallet.totalPurchased,
          totalConsumed: wallet.totalConsumed,
          totalRefunded: wallet.totalRefunded,
        },
        ledger: {
          totalCreditsIn: creditsIn,
          totalCreditsOut: creditsOut,
          ledgerDerivedAvailable,
          transactionCount: transactions.length,
        },
        activeReservations: {
          unsettledCampaignCount: activeCampaigns.length,
          totalReservedByCampaigns: totalActiveCampaignReservations,
          campaigns: activeCampaigns,
        },
        reconciliation: {
          isConsistent,
          availableDiscrepancy,
          reservationDiscrepancy,
          status: isConsistent ? 'BALANCED' : 'DISCREPANCY_DETECTED',
        },
      });
    }

    return {
      summary: {
        totalWalletsAudited: wallets.length,
        consistentWalletsCount,
        discrepanciesCount,
        status: discrepanciesCount === 0 ? 'HEALTHY' : 'DISCREPANCIES_DETECTED',
        totalStoredAvailable,
        totalStoredReserved,
        totalLedgerAvailable,
        netDiscrepancy: totalStoredAvailable - totalLedgerAvailable,
        auditedAt: new Date().toISOString(),
      },
      results: reconciliationResults,
    };
  }
}
