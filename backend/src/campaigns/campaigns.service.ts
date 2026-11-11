import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { ProvidersService } from '../providers/providers.service';
import {
  WalletChannel,
  AudienceType,
  CampaignStatus,
  RecipientStatus,
  TransactionType,
  TransactionDirection,
  ConsentStatus,
  ConsentChannel,
  MessageStatus,
} from '@prisma/client';
import {
  CreateCampaignDto,
  EstimateCampaignDto,
  CampaignFilterDto,
  UpdateCampaignDto,
  ScheduleCampaignDto,
} from './dto/campaign.dto';

@Injectable()
export class CampaignsService {
  private readonly logger = new Logger(CampaignsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly providersService: ProvidersService,
  ) {}

  /**
   * Resolve and screen customer audience based on targeting, consent, and suppression
   */
  async resolveAudience(
    vendorId: string,
    params: {
      audienceType: AudienceType;
      channel: WalletChannel;
      segmentId?: string;
      tagIds?: string[];
      customerIds?: string[];
    },
  ) {
    let rawCustomers: any[] = [];

    if (params.audienceType === AudienceType.ALL_CUSTOMERS) {
      rawCustomers = await this.prisma.customer.findMany({
        where: { vendorId },
        include: {
          consents: true,
          tagAssignments: { include: { tag: true } },
        },
      });
    } else if (params.audienceType === AudienceType.TAGS && params.tagIds?.length) {
      rawCustomers = await this.prisma.customer.findMany({
        where: {
          vendorId,
          tagAssignments: {
            some: { tagId: { in: params.tagIds } },
          },
        },
        include: {
          consents: true,
          tagAssignments: { include: { tag: true } },
        },
      });
    } else if (params.audienceType === AudienceType.MANUAL && params.customerIds?.length) {
      rawCustomers = await this.prisma.customer.findMany({
        where: {
          vendorId,
          id: { in: params.customerIds },
        },
        include: {
          consents: true,
          tagAssignments: { include: { tag: true } },
        },
      });
    } else if (params.audienceType === AudienceType.SEGMENT && params.segmentId) {
      const segment = await this.prisma.customerSegment.findUnique({
        where: { id: params.segmentId },
      });
      if (!segment || segment.vendorId !== vendorId) {
        throw new NotFoundException('Customer segment not found');
      }

      // Filter based on segment JSON criteria (city, state, source, tags)
      const filters = segment.filters as Record<string, any>;
      const whereClause: any = { vendorId };

      if (filters?.city) whereClause.city = { contains: filters.city, mode: 'insensitive' };
      if (filters?.state) whereClause.state = { contains: filters.state, mode: 'insensitive' };
      if (filters?.source) whereClause.source = filters.source;
      if (filters?.tag) {
        whereClause.tagAssignments = {
          some: { tag: { name: { contains: filters.tag, mode: 'insensitive' } } },
        };
      }

      rawCustomers = await this.prisma.customer.findMany({
        where: whereClause,
        include: {
          consents: true,
          tagAssignments: { include: { tag: true } },
        },
      });
    } else {
      rawCustomers = await this.prisma.customer.findMany({
        where: { vendorId },
        include: {
          consents: true,
          tagAssignments: { include: { tag: true } },
        },
      });
    }

    // Screen each customer for channel validity, consent, and suppression
    const eligible: any[] = [];
    const excluded: { customer: any; reason: string; destination: string }[] = [];

    const consentChannel =
      params.channel === WalletChannel.SMS
        ? ConsentChannel.SMS
        : params.channel === WalletChannel.WHATSAPP
        ? ConsentChannel.WHATSAPP
        : ConsentChannel.EMAIL;

    for (const cust of rawCustomers) {
      let destination = '';
      if (params.channel === WalletChannel.EMAIL) {
        destination = cust.email?.trim() || '';
        if (!destination || !destination.includes('@')) {
          excluded.push({ customer: cust, reason: 'MISSING_OR_INVALID_EMAIL', destination });
          continue;
        }
      } else {
        destination = cust.phone?.trim() || '';
        if (!destination || destination.length < 10) {
          excluded.push({ customer: cust, reason: 'MISSING_OR_INVALID_PHONE', destination });
          continue;
        }
      }

      // Check Consent
      const consent = cust.consents.find((c: any) => c.channel === consentChannel);
      if (consent && consent.status === ConsentStatus.OPTED_OUT) {
        excluded.push({ customer: cust, reason: 'CONSENT_OPTED_OUT', destination });
        continue;
      }

      // Check Suppression
      const isSuppressed = await this.providersService.isDestinationSuppressed(
        params.channel,
        destination,
        vendorId,
      );
      if (isSuppressed) {
        excluded.push({ customer: cust, reason: 'DESTINATION_SUPPRESSED', destination });
        continue;
      }

      eligible.push({
        customer: cust,
        destination,
      });
    }

    return {
      totalFound: rawCustomers.length,
      eligible,
      excluded,
    };
  }

  /**
   * Estimate audience and credit cost for a proposed campaign
   */
  async estimateCampaign(vendorId: string, dto: EstimateCampaignDto) {
    const audience = await this.resolveAudience(vendorId, {
      audienceType: dto.audienceType,
      channel: dto.channel,
      segmentId: dto.segmentId,
      tagIds: dto.tagIds,
      customerIds: dto.customerIds,
    });

    // Calculate credits per recipient based on content length/segments
    const creditsPerRecipient = this.providersService.calculateCredits(
      dto.channel,
      dto.content,
      { name: 'Customer Name', city: 'Bengaluru' },
    );

    const totalEstimatedCredits = audience.eligible.length * creditsPerRecipient;

    // Check Vendor Wallet
    const wallet = await this.prisma.vendorWallet.findUnique({
      where: {
        vendorId_channel: {
          vendorId,
          channel: dto.channel,
        },
      },
    });

    const availableCredits = wallet?.availableCredits ?? 0;
    const hasSufficientBalance = availableCredits >= totalEstimatedCredits;
    const creditsShortfall = Math.max(0, totalEstimatedCredits - availableCredits);

    return {
      channel: dto.channel,
      totalRecipientsFound: audience.totalFound,
      eligibleCount: audience.eligible.length,
      excludedCount: audience.excluded.length,
      excludedBreakdown: audience.excluded.reduce((acc: any, curr) => {
        acc[curr.reason] = (acc[curr.reason] || 0) + 1;
        return acc;
      }, {}),
      creditsPerRecipient,
      totalEstimatedCredits,
      wallet: {
        availableCredits,
        reservedCredits: wallet?.reservedCredits ?? 0,
        hasSufficientBalance,
        creditsShortfall,
      },
    };
  }

  /**
   * Create, validate, reserve wallet credits, and initiate campaign
   */
  async createCampaign(vendorId: string, dto: CreateCampaignDto) {
    // 1. Resolve audience
    const audience = await this.resolveAudience(vendorId, {
      audienceType: dto.audienceType,
      channel: dto.channel,
      segmentId: dto.segmentId,
      tagIds: dto.tagIds,
      customerIds: dto.customerIds,
    });

    if (audience.eligible.length === 0) {
      throw new BadRequestException(
        'No eligible recipients found for this campaign targeting. Please review customer contact details and consent status.',
      );
    }

    // 2. Calculate estimated credits
    const creditsPerRecipient = this.providersService.calculateCredits(
      dto.channel,
      dto.content,
    );
    const estimatedCredits = audience.eligible.length * creditsPerRecipient;

    // 3. Atomically check and reserve credits from Vendor Wallet
    const campaign = await this.prisma.$transaction(async (tx) => {
      const wallet = await tx.vendorWallet.findUnique({
        where: {
          vendorId_channel: {
            vendorId,
            channel: dto.channel,
          },
        },
      });

      if (!wallet || wallet.availableCredits < estimatedCredits) {
        const available = wallet?.availableCredits ?? 0;
        throw new BadRequestException(
          `Insufficient ${dto.channel} wallet credits. Required: ${estimatedCredits}, Available: ${available}. Please purchase credit packages.`,
        );
      }

      // Reserve credits: available -= estimated, reserved += estimated
      const updatedWallet = await tx.vendorWallet.update({
        where: { id: wallet.id },
        data: {
          availableCredits: { decrement: estimatedCredits },
          reservedCredits: { increment: estimatedCredits },
          lastTransactionAt: new Date(),
        },
      });

      // Record Wallet Transaction (CAMPAIGN_RESERVATION)
      await tx.walletTransaction.create({
        data: {
          vendorId,
          walletId: wallet.id,
          channel: dto.channel,
          type: TransactionType.CAMPAIGN_RESERVATION,
          direction: TransactionDirection.DEBIT,
          credits: estimatedCredits,
          balanceBefore: wallet.availableCredits,
          balanceAfter: updatedWallet.availableCredits,
          referenceType: 'campaign',
          referenceId: dto.name,
          description: `Reserved ${estimatedCredits} credits for campaign "${dto.name}" (${audience.eligible.length} recipients)`,
        },
      });

      const initialStatus = dto.sendImmediately ? CampaignStatus.QUEUED : CampaignStatus.SCHEDULED;

      // Create Campaign
      const newCampaign = await tx.campaign.create({
        data: {
          vendorId,
          name: dto.name,
          channel: dto.channel,
          templateId: dto.templateId,
          subject: dto.subject,
          content: dto.content,
          audienceType: dto.audienceType,
          segmentId: dto.segmentId,
          status: initialStatus,
          scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
          totalRecipients: audience.totalFound,
          eligibleRecipients: audience.eligible.length,
          excludedRecipients: audience.excluded.length,
          estimatedCredits,
          reservedCredits: estimatedCredits,
        },
      });

      // Create CampaignRecipient records
      const recipientCreates: any[] = [];

      // Eligible recipients
      for (const item of audience.eligible) {
        recipientCreates.push({
          campaignId: newCampaign.id,
          customerId: item.customer.id,
          destination: item.destination,
          status: RecipientStatus.PENDING,
          estimatedCredits: creditsPerRecipient,
          variableValues: {
            name: item.customer.fullName || 'Customer',
            city: item.customer.city || '',
            state: item.customer.state || '',
          },
        });
      }

      // Excluded recipients
      for (const item of audience.excluded) {
        recipientCreates.push({
          campaignId: newCampaign.id,
          customerId: item.customer.id,
          destination: item.destination || 'N/A',
          status: RecipientStatus.EXCLUDED,
          estimatedCredits: 0,
          errorCode: item.reason,
          errorMessage: `Excluded from dispatch: ${item.reason}`,
        });
      }

      await tx.campaignRecipient.createMany({
        data: recipientCreates,
      });

      return newCampaign;
    });

    // 4. If sendImmediately, trigger execution in the background
    if (dto.sendImmediately) {
      setImmediate(() => {
        this.executeCampaign(campaign.id, vendorId).catch((err) => {
          this.logger.error(`Error executing campaign ${campaign.id}: ${err.message}`, err.stack);
        });
      });
    }

    return campaign;
  }

  /**
   * Background Execution Engine for Campaign Dispatch
   */
  async executeCampaign(campaignId: string, vendorId: string) {
    this.logger.log(`Starting execution for campaign ${campaignId}...`);

    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
      include: {
        template: true,
        recipients: {
          where: { status: RecipientStatus.PENDING },
        },
      },
    });

    if (!campaign || campaign.vendorId !== vendorId) {
      this.logger.error(`Campaign ${campaignId} not found or vendor mismatch`);
      return;
    }

    // Mark as PROCESSING
    await this.prisma.campaign.update({
      where: { id: campaignId },
      data: {
        status: CampaignStatus.PROCESSING,
        startedAt: new Date(),
      },
    });

    let sentCount = 0;
    let deliveredCount = 0;
    let failedCount = 0;
    let totalCreditsCharged = 0;

    const consentChannel =
      campaign.channel === WalletChannel.SMS
        ? ConsentChannel.SMS
        : campaign.channel === WalletChannel.WHATSAPP
        ? ConsentChannel.WHATSAPP
        : ConsentChannel.EMAIL;

    // Process in batches of 50
    const chunkSize = 50;
    for (let i = 0; i < campaign.recipients.length; i += chunkSize) {
      const chunk = campaign.recipients.slice(i, i + chunkSize);

      await Promise.all(
        chunk.map(async (recipient) => {
          try {
            // Render variable substitutions
            const vars = (recipient.variableValues as Record<string, string>) || {};
            let rendered = campaign.content;
            for (const [k, v] of Object.entries(vars)) {
              rendered = rendered.replace(new RegExp(`{{${k}}}`, 'g'), v);
            }

            const sendResult = await this.providersService.dispatchMessage(campaign.channel, {
              recipientId: recipient.id,
              customerId: recipient.customerId || undefined,
              destination: recipient.destination,
              content: rendered,
              subject: campaign.subject || undefined,
              templateId: campaign.templateId || undefined,
              templateName: campaign.template?.name || undefined,
              templateCategory: campaign.template?.category || undefined,
              language: campaign.template?.language || 'en',
              variables: vars,
            });

            if (sendResult.success) {
              sentCount++;
              if (sendResult.status === 'DELIVERED') deliveredCount++;
              totalCreditsCharged += sendResult.creditsCharged;

              await this.prisma.campaignRecipient.update({
                where: { id: recipient.id },
                data: {
                  status: sendResult.status === 'DELIVERED' ? RecipientStatus.DELIVERED : RecipientStatus.SUBMITTED,
                  providerMessageId: sendResult.providerMessageId,
                  actualCredits: sendResult.creditsCharged,
                  renderedContent: rendered,
                  submittedAt: new Date(),
                  deliveredAt: sendResult.status === 'DELIVERED' ? new Date() : null,
                },
              });

              // Also record in customer message history for single view of communication
              if (recipient.customerId) {
                await this.prisma.messageHistory.create({
                  data: {
                    vendorId,
                    customerId: recipient.customerId,
                    channel: consentChannel,
                    campaignName: campaign.name,
                    messageContent: rendered,
                    status: MessageStatus.SENT,
                    providerId: sendResult.providerMessageId,
                  },
                });
              }
            } else {
              failedCount++;
              await this.prisma.campaignRecipient.update({
                where: { id: recipient.id },
                data: {
                  status: RecipientStatus.FAILED,
                  errorCode: sendResult.errorCode || 'DISPATCH_FAILED',
                  errorMessage: sendResult.errorMessage,
                  actualCredits: 0,
                  renderedContent: rendered,
                },
              });
            }
          } catch (err: any) {
            failedCount++;
            await this.prisma.campaignRecipient.update({
              where: { id: recipient.id },
              data: {
                status: RecipientStatus.FAILED,
                errorCode: 'UNHANDLED_EXCEPTION',
                errorMessage: err.message,
                actualCredits: 0,
              },
            });
          }
        }),
      );
    }

    // Capture consumed credits and release unused reserved credits
    const reservedCredits = campaign.reservedCredits;
    const creditsToCapture = totalCreditsCharged;
    const creditsToRelease = Math.max(0, reservedCredits - creditsToCapture);

    await this.prisma.$transaction(async (tx) => {
      const wallet = await tx.vendorWallet.findUnique({
        where: {
          vendorId_channel: {
            vendorId,
            channel: campaign.channel,
          },
        },
      });

      if (wallet) {
        // Adjust wallet
        const updatedWallet = await tx.vendorWallet.update({
          where: { id: wallet.id },
          data: {
            reservedCredits: { decrement: reservedCredits },
            totalConsumed: { increment: creditsToCapture },
            availableCredits: { increment: creditsToRelease },
            lastTransactionAt: new Date(),
          },
        });

        // 1. Transaction: CAMPAIGN_CAPTURE
        if (creditsToCapture > 0) {
          await tx.walletTransaction.create({
            data: {
              vendorId,
              walletId: wallet.id,
              channel: campaign.channel,
              type: TransactionType.CAMPAIGN_CAPTURE,
              direction: TransactionDirection.DEBIT,
              credits: creditsToCapture,
              balanceBefore: wallet.availableCredits,
              balanceAfter: updatedWallet.availableCredits,
              referenceType: 'campaign',
              referenceId: campaign.id,
              description: `Captured ${creditsToCapture} credits for delivered campaign "${campaign.name}" (${sentCount} sent)`,
            },
          });
        }

        // 2. Transaction: RESERVATION_RELEASE (if unused credits released)
        if (creditsToRelease > 0) {
          await tx.walletTransaction.create({
            data: {
              vendorId,
              walletId: wallet.id,
              channel: campaign.channel,
              type: TransactionType.RESERVATION_RELEASE,
              direction: TransactionDirection.CREDIT,
              credits: creditsToRelease,
              balanceBefore: updatedWallet.availableCredits - creditsToRelease,
              balanceAfter: updatedWallet.availableCredits,
              referenceType: 'campaign',
              referenceId: campaign.id,
              description: `Released ${creditsToRelease} unused reserved credits from campaign "${campaign.name}"`,
            },
          });
        }
      }

      const finalStatus =
        sentCount === 0 && failedCount > 0
          ? CampaignStatus.FAILED
          : failedCount > 0
          ? CampaignStatus.PARTIALLY_COMPLETED
          : CampaignStatus.COMPLETED;

      await tx.campaign.update({
        where: { id: campaignId },
        data: {
          status: finalStatus,
          sentCount,
          deliveredCount,
          failedCount,
          consumedCredits: creditsToCapture,
          releasedCredits: creditsToRelease,
          completedAt: new Date(),
        },
      });
    });

    this.logger.log(
      `Campaign ${campaignId} finished. Sent: ${sentCount}, Failed: ${failedCount}, Credits Captured: ${creditsToCapture}, Released: ${creditsToRelease}`,
    );
  }

  /**
   * Cancel queued or scheduled campaign and release reserved credits
   */
  async cancelCampaign(campaignId: string, vendorId: string) {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
    });

    if (!campaign || campaign.vendorId !== vendorId) {
      throw new NotFoundException('Campaign not found');
    }

    if (
      campaign.status !== CampaignStatus.SCHEDULED &&
      campaign.status !== CampaignStatus.QUEUED &&
      campaign.status !== CampaignStatus.DRAFT
    ) {
      throw new BadRequestException(
        `Cannot cancel campaign in ${campaign.status} status. Only scheduled or queued campaigns can be cancelled.`,
      );
    }

    // Release reserved credits
    const reservedCredits = campaign.reservedCredits;

    await this.prisma.$transaction(async (tx) => {
      if (reservedCredits > 0) {
        const wallet = await tx.vendorWallet.findUnique({
          where: {
            vendorId_channel: {
              vendorId,
              channel: campaign.channel,
            },
          },
        });

        if (wallet) {
          const updatedWallet = await tx.vendorWallet.update({
            where: { id: wallet.id },
            data: {
              reservedCredits: { decrement: reservedCredits },
              availableCredits: { increment: reservedCredits },
              lastTransactionAt: new Date(),
            },
          });

          await tx.walletTransaction.create({
            data: {
              vendorId,
              walletId: wallet.id,
              channel: campaign.channel,
              type: TransactionType.RESERVATION_RELEASE,
              direction: TransactionDirection.CREDIT,
              credits: reservedCredits,
              balanceBefore: wallet.availableCredits,
              balanceAfter: updatedWallet.availableCredits,
              referenceType: 'campaign',
              referenceId: campaign.id,
              description: `Released all ${reservedCredits} reserved credits due to cancellation of campaign "${campaign.name}"`,
            },
          });
        }
      }

      await tx.campaign.update({
        where: { id: campaignId },
        data: {
          status: CampaignStatus.CANCELLED,
          releasedCredits: reservedCredits,
          reservedCredits: 0,
        },
      });
    });

    return { message: 'Campaign cancelled and reserved credits returned to available wallet balance' };
  }

  /**
   * Get vendor campaigns with filtering and pagination
   */
  async getVendorCampaigns(vendorId: string, query: CampaignFilterDto) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const skip = (page - 1) * limit;

    const where: any = { vendorId };
    if (query.channel && (query.channel as any) !== 'ALL') where.channel = query.channel;
    if (query.status && (query.status as any) !== 'ALL') where.status = query.status;
    if (query.search && query.search.trim() !== '') {
      where.name = { contains: query.search.trim(), mode: 'insensitive' };
    }

    const [campaigns, total] = await Promise.all([
      this.prisma.campaign.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          template: { select: { id: true, name: true } },
          segment: { select: { id: true, name: true } },
        },
      }),
      this.prisma.campaign.count({ where }),
    ]);

    return {
      data: campaigns,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get detailed single campaign metrics and metadata
   */
  async getCampaignDetails(campaignId: string, vendorId?: string) {
    const where: any = { id: campaignId };
    if (vendorId) where.vendorId = vendorId;

    const campaign = await this.prisma.campaign.findUnique({
      where,
      include: {
        template: true,
        segment: true,
        recipients: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            customer: {
              select: { id: true, fullName: true, phone: true, email: true },
            },
          },
        },
      },
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    return campaign;
  }

  /**
   * Get paginated recipients for campaign
   */
  async getCampaignRecipients(
    campaignId: string,
    vendorId: string,
    query: { status?: RecipientStatus; search?: string; page?: number; limit?: number },
  ) {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
      select: { vendorId: true },
    });

    if (!campaign || campaign.vendorId !== vendorId) {
      throw new NotFoundException('Campaign not found');
    }

    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const skip = (page - 1) * limit;

    const where: any = { campaignId };
    if (query.status && (query.status as any) !== 'ALL') where.status = query.status;
    if (query.search && query.search.trim() !== '') {
      where.destination = { contains: query.search.trim(), mode: 'insensitive' };
    }

    const [recipients, total] = await Promise.all([
      this.prisma.campaignRecipient.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'asc' },
        include: {
          customer: {
            select: { id: true, fullName: true, phone: true, email: true, city: true },
          },
        },
      }),
      this.prisma.campaignRecipient.count({ where }),
    ]);

    return {
      data: recipients,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Export all campaign recipients to CSV format
   */
  async exportCampaignRecipientsCsv(campaignId: string, vendorId: string): Promise<string> {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
      select: { vendorId: true, name: true },
    });

    if (!campaign || campaign.vendorId !== vendorId) {
      throw new NotFoundException('Campaign not found');
    }

    const recipients = await this.prisma.campaignRecipient.findMany({
      where: { campaignId },
      include: {
        customer: { select: { fullName: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    const headers = [
      'Customer Name',
      'Destination',
      'Status',
      'Credits Charged',
      'Provider Message ID',
      'Error Code',
      'Error Message',
      'Submitted At',
      'Delivered At',
    ];

    const rows = recipients.map((r) => [
      `"${(r.customer?.fullName || '').replace(/"/g, '""')}"`,
      `"${r.destination}"`,
      r.status,
      r.actualCredits,
      `"${r.providerMessageId || ''}"`,
      `"${r.errorCode || ''}"`,
      `"${(r.errorMessage || '').replace(/"/g, '""')}"`,
      r.submittedAt ? r.submittedAt.toISOString() : '',
      r.deliveredAt ? r.deliveredAt.toISOString() : '',
    ]);

    return [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
  }

  /**
   * Admin Platform Campaign Overview & Aggregated Reports
   */
  async getAdminCampaignOverview() {
    const [totalCampaigns, completedCount, failedCount, totalRecipientsAgg, channelStats] =
      await Promise.all([
        this.prisma.campaign.count(),
        this.prisma.campaign.count({ where: { status: CampaignStatus.COMPLETED } }),
        this.prisma.campaign.count({ where: { status: CampaignStatus.FAILED } }),
        this.prisma.campaign.aggregate({
          _sum: {
            totalRecipients: true,
            sentCount: true,
            deliveredCount: true,
            failedCount: true,
            consumedCredits: true,
          },
        }),
        this.prisma.campaign.groupBy({
          by: ['channel'],
          _count: { id: true },
          _sum: {
            sentCount: true,
            deliveredCount: true,
            failedCount: true,
            consumedCredits: true,
          },
        }),
      ]);

    const recentCampaigns = await this.prisma.campaign.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        vendor: { select: { id: true, businessName: true, businessEmail: true } },
      },
    });

    return {
      summary: {
        totalCampaigns,
        completedCount,
        failedCount,
        totalRecipients: totalRecipientsAgg._sum.totalRecipients || 0,
        totalSent: totalRecipientsAgg._sum.sentCount || 0,
        totalDelivered: totalRecipientsAgg._sum.deliveredCount || 0,
        totalFailed: totalRecipientsAgg._sum.failedCount || 0,
        totalConsumedCredits: totalRecipientsAgg._sum.consumedCredits || 0,
        deliveryRatePercentage:
          totalRecipientsAgg._sum.sentCount && totalRecipientsAgg._sum.sentCount > 0
            ? Math.round(
                ((totalRecipientsAgg._sum.deliveredCount || 0) / totalRecipientsAgg._sum.sentCount) * 100,
              )
            : 100,
      },
      channelBreakdown: channelStats.map((cs) => ({
        channel: cs.channel,
        campaignCount: cs._count.id,
        sent: cs._sum.sentCount || 0,
        delivered: cs._sum.deliveredCount || 0,
        failed: cs._sum.failedCount || 0,
        creditsConsumed: cs._sum.consumedCredits || 0,
      })),
      recentCampaigns,
    };
  }

  /**
   * Update draft or scheduled campaign
   */
  async updateCampaign(campaignId: string, vendorId: string, dto: UpdateCampaignDto) {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
    });

    if (!campaign || campaign.vendorId !== vendorId) {
      throw new NotFoundException('Campaign not found');
    }

    if (campaign.status !== CampaignStatus.DRAFT && campaign.status !== CampaignStatus.SCHEDULED) {
      throw new BadRequestException(`Cannot edit campaign in ${campaign.status} status`);
    }

    const updated = await this.prisma.campaign.update({
      where: { id: campaignId },
      data: {
        name: dto.name,
        content: dto.content,
        subject: dto.subject,
        audienceType: dto.audienceType,
        segmentId: dto.segmentId,
      },
    });

    await this.prisma.campaignAuditLog.create({
      data: {
        campaignId,
        vendorId,
        action: 'CAMPAIGN_UPDATED',
        details: { updatedFields: Object.keys(dto) },
      },
    });

    return updated;
  }

  /**
   * Delete draft campaign (or cancel and delete scheduled campaign)
   */
  async deleteCampaign(campaignId: string, vendorId: string) {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
    });

    if (!campaign || campaign.vendorId !== vendorId) {
      throw new NotFoundException('Campaign not found');
    }

    if (campaign.status !== CampaignStatus.DRAFT && campaign.status !== CampaignStatus.SCHEDULED && campaign.status !== CampaignStatus.CANCELLED) {
      throw new BadRequestException(`Cannot delete campaign in ${campaign.status} status`);
    }

    // If scheduled with reserved credits, release them first
    if (campaign.reservedCredits > 0) {
      await this.cancelCampaign(campaignId, vendorId);
    }

    await this.prisma.campaign.delete({
      where: { id: campaignId },
    });

    return { message: 'Campaign deleted successfully' };
  }

  /**
   * Send existing draft or queued campaign
   */
  async sendCampaign(campaignId: string, vendorId: string) {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
    });

    if (!campaign || campaign.vendorId !== vendorId) {
      throw new NotFoundException('Campaign not found');
    }

    if (campaign.status === CampaignStatus.PROCESSING || campaign.status === CampaignStatus.COMPLETED) {
      throw new BadRequestException(`Campaign is already ${campaign.status.toLowerCase()}`);
    }

    setImmediate(() => {
      this.executeCampaign(campaignId, vendorId).catch((err) => {
        this.logger.error(`Error executing campaign ${campaignId}: ${err.message}`, err.stack);
      });
    });

    return { message: 'Campaign dispatch initiated', campaignId };
  }

  /**
   * Schedule campaign for future dispatch
   */
  async scheduleCampaign(campaignId: string, vendorId: string, scheduledAt: string) {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
    });

    if (!campaign || campaign.vendorId !== vendorId) {
      throw new NotFoundException('Campaign not found');
    }

    if (campaign.status !== CampaignStatus.DRAFT && campaign.status !== CampaignStatus.SCHEDULED) {
      throw new BadRequestException(`Cannot schedule campaign in ${campaign.status} status`);
    }

    const updated = await this.prisma.campaign.update({
      where: { id: campaignId },
      data: {
        status: CampaignStatus.SCHEDULED,
        scheduledAt: new Date(scheduledAt),
      },
    });

    return updated;
  }

  /**
   * Get detailed report for a single campaign
   */
  async getCampaignReport(campaignId: string, vendorId?: string) {
    const campaign = await this.getCampaignDetails(campaignId, vendorId);
    const recipients = await this.prisma.campaignRecipient.groupBy({
      by: ['status'],
      where: { campaignId },
      _count: { id: true },
      _sum: { actualCredits: true },
    });

    const breakdown = recipients.reduce((acc: any, curr) => {
      acc[curr.status] = {
        count: curr._count.id,
        credits: curr._sum.actualCredits || 0,
      };
      return acc;
    }, {});

    return {
      campaign: {
        id: campaign.id,
        name: campaign.name,
        channel: campaign.channel,
        status: campaign.status,
        createdAt: campaign.createdAt,
        startedAt: campaign.startedAt,
        completedAt: campaign.completedAt,
      },
      counts: {
        total: campaign.totalRecipients,
        eligible: campaign.eligibleRecipients,
        excluded: campaign.excludedRecipients,
        sent: campaign.sentCount,
        delivered: campaign.deliveredCount,
        read: campaign.readCount,
        failed: campaign.failedCount,
      },
      financials: {
        estimatedCredits: campaign.estimatedCredits,
        reservedCredits: campaign.reservedCredits,
        consumedCredits: campaign.consumedCredits,
        releasedCredits: campaign.releasedCredits,
      },
      statusBreakdown: breakdown,
    };
  }

  /**
   * Admin: Provider health and monitoring
   */
  async getProviderMonitoring() {
    const [providers, recentEvents, recentFailures] = await Promise.all([
      this.prisma.providerConfiguration.findMany({
        orderBy: { channel: 'asc' },
      }),
      this.prisma.providerWebhookEvent.findMany({
        take: 20,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.campaignRecipient.findMany({
        where: { status: RecipientStatus.FAILED },
        take: 15,
        orderBy: { createdAt: 'desc' },
        include: {
          campaign: { select: { name: true, channel: true } },
        },
      }),
    ]);

    const eventStats = await this.prisma.providerWebhookEvent.groupBy({
      by: ['provider', 'eventType'],
      _count: { id: true },
    });

    return {
      providers: providers.map((p) => ({
        channel: p.channel,
        providerName: p.providerName,
        isActive: p.isActive,
        isSandbox: p.isSandbox,
        lastTestedAt: p.lastTestedAt,
        lastTestStatus: p.lastTestStatus,
        lastTestError: p.lastTestError,
      })),
      webhookEventStats: eventStats.map((es) => ({
        provider: es.provider,
        eventType: es.eventType,
        count: es._count.id,
      })),
      recentEvents: recentEvents.map((e) => ({
        id: e.id,
        provider: e.provider,
        eventType: e.eventType,
        processed: e.processed,
        processedAt: e.processedAt,
        createdAt: e.createdAt,
      })),
      recentFailures: recentFailures.map((f) => ({
        id: f.id,
        campaignName: f.campaign?.name,
        channel: f.campaign?.channel,
        destination: f.destination,
        errorCode: f.errorCode,
        errorMessage: f.errorMessage,
        createdAt: f.createdAt,
      })),
    };
  }
}
