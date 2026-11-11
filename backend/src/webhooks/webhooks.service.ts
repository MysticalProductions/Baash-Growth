import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { RecipientStatus, WalletChannel } from '@prisma/client';

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Process MSG91 DLR delivery callback
   */
  async processMsg91Dlr(payload: any) {
    this.logger.log(`Processing MSG91 DLR callback: ${JSON.stringify(payload)}`);

    const eventId = payload.requestId || payload.uuid || `msg91_evt_${Date.now()}`;

    // Record webhook event idempotently
    const webhookEvent = await this.prisma.providerWebhookEvent.create({
      data: {
        provider: 'MSG91',
        eventId: String(eventId),
        eventType: 'DLR_STATUS',
        payload: payload,
      },
    });

    const statusStr = (payload.status || payload.desc || '').toUpperCase();
    const providerMessageId = payload.requestId || payload.messageId;

    if (providerMessageId) {
      const recipient = await this.prisma.campaignRecipient.findFirst({
        where: { providerMessageId },
        include: { campaign: true },
      });

      if (recipient) {
        if (statusStr.includes('DELIV')) {
          await this.prisma.campaignRecipient.update({
            where: { id: recipient.id },
            data: {
              status: RecipientStatus.DELIVERED,
              deliveredAt: new Date(),
            },
          });
          await this.prisma.campaign.update({
            where: { id: recipient.campaignId },
            data: { deliveredCount: { increment: 1 } },
          });
        } else if (statusStr.includes('FAIL') || statusStr.includes('REJECT') || statusStr.includes('UNDELIV')) {
          await this.prisma.campaignRecipient.update({
            where: { id: recipient.id },
            data: {
              status: RecipientStatus.FAILED,
              errorCode: statusStr,
              errorMessage: payload.desc || payload.reason || 'SMS failed delivery',
            },
          });
          await this.prisma.campaign.update({
            where: { id: recipient.campaignId },
            data: { failedCount: { increment: 1 } },
          });
        }
      }
    }

    await this.prisma.providerWebhookEvent.update({
      where: { id: webhookEvent.id },
      data: { processed: true, processedAt: new Date() },
    });

    return { received: true };
  }

  /**
   * Process Meta WhatsApp Cloud API status webhook
   */
  async processWhatsAppStatus(payload: any) {
    this.logger.log(`Processing Meta WhatsApp webhook payload`);

    const entries = payload.entry || [];
    for (const entry of entries) {
      for (const change of entry.changes || []) {
        const statuses = change.value?.statuses || [];
        for (const st of statuses) {
          const wamid = st.id;
          const status = st.status; // sent, delivered, read, failed

          await this.prisma.providerWebhookEvent.create({
            data: {
              provider: 'META_WHATSAPP',
              eventId: `${wamid}_${status}`,
              eventType: `WHATSAPP_${status.toUpperCase()}`,
              payload: st,
              processed: true,
              processedAt: new Date(),
            },
          });

          const recipient = await this.prisma.campaignRecipient.findFirst({
            where: { providerMessageId: wamid },
          });

          if (recipient) {
            if (status === 'delivered') {
              await this.prisma.campaignRecipient.update({
                where: { id: recipient.id },
                data: {
                  status: RecipientStatus.DELIVERED,
                  deliveredAt: new Date(),
                },
              });
              await this.prisma.campaign.update({
                where: { id: recipient.campaignId },
                data: { deliveredCount: { increment: 1 } },
              });
            } else if (status === 'read') {
              await this.prisma.campaignRecipient.update({
                where: { id: recipient.id },
                data: {
                  status: RecipientStatus.READ,
                  readAt: new Date(),
                },
              });
              await this.prisma.campaign.update({
                where: { id: recipient.campaignId },
                data: { readCount: { increment: 1 } },
              });
            } else if (status === 'failed') {
              const err = st.errors?.[0];
              await this.prisma.campaignRecipient.update({
                where: { id: recipient.id },
                data: {
                  status: RecipientStatus.FAILED,
                  errorCode: err?.code ? String(err.code) : 'WHATSAPP_FAILED',
                  errorMessage: err?.title || err?.message || 'WhatsApp message failed',
                },
              });
              await this.prisma.campaign.update({
                where: { id: recipient.campaignId },
                data: { failedCount: { increment: 1 } },
              });
            }
          }
        }
      }
    }

    return { received: true };
  }

  /**
   * Process Amazon SES SNS event notification (Deliveries, Bounces, Complaints)
   */
  async processSesNotification(payload: any) {
    this.logger.log(`Processing Amazon SES Notification`);

    // Handle SNS Subscription Confirmation
    if (payload.Type === 'SubscriptionConfirmation' && payload.SubscribeURL) {
      this.logger.log(`Confirming SNS subscription via URL: ${payload.SubscribeURL}`);
      await fetch(payload.SubscribeURL).catch((e) => this.logger.warn(`Failed to auto-confirm SNS: ${e.message}`));
      return { confirmed: true };
    }

    let sesMessage: any = payload;
    if (payload.Message && typeof payload.Message === 'string') {
      try {
        sesMessage = JSON.parse(payload.Message);
      } catch {
        sesMessage = payload;
      }
    }

    const eventType = sesMessage.notificationType || sesMessage.eventType;
    const mail = sesMessage.mail || {};
    const messageId = mail.messageId;

    await this.prisma.providerWebhookEvent.create({
      data: {
        provider: 'AMAZON_SES',
        eventId: `${messageId}_${eventType}_${Date.now()}`,
        eventType: `SES_${(eventType || 'EVENT').toUpperCase()}`,
        payload: sesMessage,
        processed: true,
        processedAt: new Date(),
      },
    });

    const recipient = await this.prisma.campaignRecipient.findFirst({
      where: { providerMessageId: messageId },
    });

    if (eventType === 'Bounce') {
      const bounce = sesMessage.bounce || {};
      const bouncedRecipients = bounce.bouncedRecipients || [];

      for (const br of bouncedRecipients) {
        const email = (br.emailAddress || '').trim().toLowerCase();
        if (email) {
          // Add to permanent suppression list
          await this.prisma.suppressionRecord.upsert({
            where: {
              channel_destination: {
                channel: WalletChannel.EMAIL,
                destination: email,
              },
            },
            update: { reason: `BOUNCE: ${bounce.bounceType || 'HardBounce'}` },
            create: {
              channel: WalletChannel.EMAIL,
              destination: email,
              reason: `BOUNCE: ${bounce.bounceType || 'HardBounce'}`,
              source: 'AMAZON_SES_SNS',
            },
          });
        }
      }

      if (recipient) {
        await this.prisma.campaignRecipient.update({
          where: { id: recipient.id },
          data: {
            status: RecipientStatus.FAILED,
            errorCode: 'SES_BOUNCE',
            errorMessage: `Email bounced (${bounce.bounceType || 'Permanent'})`,
          },
        });
        await this.prisma.campaign.update({
          where: { id: recipient.campaignId },
          data: { failedCount: { increment: 1 } },
        });
      }
    } else if (eventType === 'Complaint') {
      const complaint = sesMessage.complaint || {};
      const complainedRecipients = complaint.complainedRecipients || [];

      for (const cr of complainedRecipients) {
        const email = (cr.emailAddress || '').trim().toLowerCase();
        if (email) {
          await this.prisma.suppressionRecord.upsert({
            where: {
              channel_destination: {
                channel: WalletChannel.EMAIL,
                destination: email,
              },
            },
            update: { reason: 'COMPLAINT_SPAM_REPORT' },
            create: {
              channel: WalletChannel.EMAIL,
              destination: email,
              reason: 'COMPLAINT_SPAM_REPORT',
              source: 'AMAZON_SES_SNS',
            },
          });
        }
      }

      if (recipient) {
        await this.prisma.campaignRecipient.update({
          where: { id: recipient.id },
          data: {
            status: RecipientStatus.FAILED,
            errorCode: 'SES_COMPLAINT',
            errorMessage: 'Recipient marked email as spam/complaint',
          },
        });
      }
    } else if (eventType === 'Delivery') {
      if (recipient) {
        await this.prisma.campaignRecipient.update({
          where: { id: recipient.id },
          data: {
            status: RecipientStatus.DELIVERED,
            deliveredAt: new Date(),
          },
        });
        await this.prisma.campaign.update({
          where: { id: recipient.campaignId },
          data: { deliveredCount: { increment: 1 } },
        });
      }
    }

    return { received: true };
  }
}
