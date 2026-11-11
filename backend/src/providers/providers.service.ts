import { Injectable, Logger, NotFoundException, BadRequestException, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { WalletChannel } from '@prisma/client';
import { Msg91SmsProvider, Msg91Config } from './sms/msg91.provider';
import { MetaWhatsAppProvider, MetaWhatsAppConfig } from './whatsapp/meta.provider';
import { AmazonSesEmailProvider, AmazonSesConfig } from './email/ses.provider';
import {
  ICommunicationProvider,
  SendMessagePayload,
  SendMessageResult,
  ConnectionTestResult,
} from './interfaces/provider.interface';
import { UpdateProviderConfigDto, UpdateChannelPricingDto } from './dto/provider.dto';

@Injectable()
export class ProvidersService implements OnModuleInit {
  private readonly logger = new Logger(ProvidersService.name);
  private readonly providerMap = new Map<WalletChannel, ICommunicationProvider>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly msg91Provider: Msg91SmsProvider,
    private readonly metaProvider: MetaWhatsAppProvider,
    private readonly sesProvider: AmazonSesEmailProvider,
  ) {
    this.providerMap.set(WalletChannel.SMS, this.msg91Provider);
    this.providerMap.set(WalletChannel.WHATSAPP, this.metaProvider);
    this.providerMap.set(WalletChannel.EMAIL, this.sesProvider);
  }

  async onModuleInit() {
    await this.ensureDefaultConfigurations();
  }

  /**
   * Seed default provider configurations and channel pricing if not present
   */
  async ensureDefaultConfigurations() {
    try {
      // 1. Providers
      const defaultProviders = [
        {
          channel: WalletChannel.SMS,
          providerName: 'MSG91',
          isActive: true,
          isSandbox: true,
          credentials: {
            authKey: 'msg91_demo_auth_key_sandbox',
            senderId: 'BAASHG',
            dltEntityId: '1201159000000123456',
            defaultTemplateId: '64d23fa98e1b12345678',
          },
        },
        {
          channel: WalletChannel.WHATSAPP,
          providerName: 'META_WHATSAPP',
          isActive: true,
          isSandbox: true,
          credentials: {
            wabaId: '109827364519283',
            phoneNumberId: '102938475610293',
            accessToken: 'EAAG_demo_access_token_meta_whatsapp_sandbox',
            apiVersion: 'v21.0',
          },
        },
        {
          channel: WalletChannel.EMAIL,
          providerName: 'AMAZON_SES',
          isActive: true,
          isSandbox: true,
          credentials: {
            region: 'ap-south-1',
            accessKeyId: 'AKIA_DEMO_SANDBOX_KEY',
            secretAccessKey: 'aws_secret_key_demo_sandbox_value_12345',
            fromEmail: 'growth@baash.in',
          },
        },
      ];

      for (const prov of defaultProviders) {
        const existing = await this.prisma.providerConfiguration.findUnique({
          where: { channel: prov.channel },
        });
        if (!existing) {
          await this.prisma.providerConfiguration.create({
            data: {
              channel: prov.channel,
              providerName: prov.providerName,
              isActive: prov.isActive,
              isSandbox: prov.isSandbox,
              credentials: prov.credentials,
              lastTestedAt: new Date(),
              lastTestStatus: 'SUCCESS',
            },
          });
          this.logger.log(`Initialized default provider configuration for ${prov.channel}`);
        }
      }

      // 2. Channel Pricing
      const defaultPricing = [
        {
          channel: WalletChannel.SMS,
          sellingCreditsPerUnit: 1.0,
          estimatedProviderCost: 0.16,
        },
        {
          channel: WalletChannel.WHATSAPP,
          sellingCreditsPerUnit: 1.0,
          estimatedProviderCost: 0.45,
        },
        {
          channel: WalletChannel.EMAIL,
          sellingCreditsPerUnit: 1.0,
          estimatedProviderCost: 0.008,
        },
      ];

      for (const pr of defaultPricing) {
        const existing = await this.prisma.channelPricing.findUnique({
          where: { channel: pr.channel },
        });
        if (!existing) {
          await this.prisma.channelPricing.create({
            data: {
              channel: pr.channel,
              sellingCreditsPerUnit: pr.sellingCreditsPerUnit,
              estimatedProviderCost: pr.estimatedProviderCost,
            },
          });
          this.logger.log(`Initialized default pricing for ${pr.channel}`);
        }
      }
    } catch (e: any) {
      this.logger.warn(`Could not seed default providers/pricing: ${e.message}`);
    }
  }

  /**
   * Helper to mask sensitive keys in credentials
   */
  private maskCredentials(credentials: Record<string, any>): Record<string, any> {
    const masked: Record<string, any> = {};
    const sensitiveKeys = ['authkey', 'accesstoken', 'secretaccesskey', 'password', 'api_key', 'apikey'];

    for (const [key, val] of Object.entries(credentials || {})) {
      if (typeof val === 'string' && sensitiveKeys.some((s) => key.toLowerCase().includes(s))) {
        if (val.length <= 8) {
          masked[key] = '••••••••';
        } else {
          masked[key] = `${val.slice(0, 4)}••••••••${val.slice(-4)}`;
        }
      } else {
        masked[key] = val;
      }
    }
    return masked;
  }

  /**
   * Get all provider configurations with masked credentials for Admin UI
   */
  async getAllAdminProviders() {
    const configs = await this.prisma.providerConfiguration.findMany({
      orderBy: { channel: 'asc' },
    });

    return configs.map((cfg) => ({
      ...cfg,
      credentials: this.maskCredentials(cfg.credentials as Record<string, any>),
    }));
  }

  /**
   * Get internal raw provider configuration
   */
  async getRawProviderConfig(channel: WalletChannel) {
    const config = await this.prisma.providerConfiguration.findUnique({
      where: { channel },
    });
    if (!config) {
      throw new NotFoundException(`Provider configuration for channel ${channel} not found`);
    }
    return config;
  }

  /**
   * Update provider configuration (preserving masked secrets if not changed)
   */
  async updateProviderConfig(channel: WalletChannel, dto: UpdateProviderConfigDto) {
    const existing = await this.prisma.providerConfiguration.findUnique({
      where: { channel },
    });

    let mergedCredentials = { ...(dto.credentials || {}) };

    if (existing && existing.credentials) {
      const oldCreds = existing.credentials as Record<string, any>;
      // If client sent back masked placeholder, keep existing value
      for (const [key, val] of Object.entries(mergedCredentials)) {
        if (typeof val === 'string' && val.includes('••••••••')) {
          mergedCredentials[key] = oldCreds[key];
        }
      }
    }

    const updated = await this.prisma.providerConfiguration.upsert({
      where: { channel },
      create: {
        channel,
        providerName: dto.providerName,
        credentials: mergedCredentials,
        isActive: dto.isActive !== undefined ? dto.isActive : true,
        isSandbox: dto.isSandbox !== undefined ? dto.isSandbox : false,
      },
      update: {
        providerName: dto.providerName,
        credentials: mergedCredentials,
        isActive: dto.isActive !== undefined ? dto.isActive : undefined,
        isSandbox: dto.isSandbox !== undefined ? dto.isSandbox : undefined,
        updatedAt: new Date(),
      },
    });

    return {
      ...updated,
      credentials: this.maskCredentials(updated.credentials as Record<string, any>),
    };
  }

  /**
   * Live test connection for a specific communication channel
   */
  async testProviderConnection(channel: WalletChannel): Promise<ConnectionTestResult> {
    const config = await this.getRawProviderConfig(channel);
    const provider = this.providerMap.get(channel);

    if (!provider) {
      throw new BadRequestException(`No active provider implementation for channel ${channel}`);
    }

    const testResult = await provider.testConnection({
      ...(config.credentials as Record<string, any>),
      isSandbox: config.isSandbox,
    });

    // Update test results in database
    await this.prisma.providerConfiguration.update({
      where: { channel },
      data: {
        lastTestedAt: new Date(),
        lastTestStatus: testResult.success ? 'SUCCESS' : 'FAILED',
        lastTestError: testResult.success ? null : testResult.message,
      },
    });

    return testResult;
  }

  /**
   * Check if destination is suppressed
   */
  async isDestinationSuppressed(channel: WalletChannel, destination: string, vendorId?: string): Promise<boolean> {
    const normalized = destination.trim().toLowerCase();
    const count = await this.prisma.suppressionRecord.count({
      where: {
        channel,
        destination: normalized,
        OR: [{ vendorId: null }, { vendorId: vendorId || undefined }],
      },
    });
    return count > 0;
  }

  /**
   * Dispatch a message through the configured channel provider
   */
  async dispatchMessage(channel: WalletChannel, payload: SendMessagePayload): Promise<SendMessageResult> {
    const provider = this.providerMap.get(channel);
    if (!provider) {
      return {
        success: false,
        status: 'FAILED',
        creditsCharged: 0,
        errorCode: 'UNSUPPORTED_CHANNEL',
        errorMessage: `Unsupported communication channel ${channel}`,
      };
    }

    // Check suppression
    const isSuppressed = await this.isDestinationSuppressed(channel, payload.destination);
    if (isSuppressed) {
      return {
        success: false,
        status: 'FAILED',
        creditsCharged: 0,
        errorCode: 'RECIPIENT_SUPPRESSED',
        errorMessage: `Destination ${payload.destination} is in the suppression list (bounced or unsubscribed)`,
      };
    }

    const config = await this.getRawProviderConfig(channel);
    if (!config.isActive) {
      return {
        success: false,
        status: 'FAILED',
        creditsCharged: 0,
        errorCode: 'PROVIDER_INACTIVE',
        errorMessage: `Channel provider for ${channel} is currently disabled by administrator`,
      };
    }

    return provider.send(payload, {
      ...(config.credentials as Record<string, any>),
      isSandbox: config.isSandbox,
    });
  }

  /**
   * Calculate required credits for a given channel and content
   */
  calculateCredits(channel: WalletChannel, content: string, variables?: Record<string, string>): number {
    const provider = this.providerMap.get(channel);
    if (!provider) return 1;
    return provider.calculateCredits(content, variables);
  }

  /**
   * Channel Pricing Management
   */
  async getAllChannelPricing() {
    return this.prisma.channelPricing.findMany({
      orderBy: { channel: 'asc' },
    });
  }

  async updateChannelPricing(channel: WalletChannel, dto: UpdateChannelPricingDto) {
    return this.prisma.channelPricing.upsert({
      where: { channel },
      create: {
        channel,
        sellingCreditsPerUnit: dto.sellingCreditsPerUnit,
        estimatedProviderCost: dto.estimatedProviderCost,
      },
      update: {
        sellingCreditsPerUnit: dto.sellingCreditsPerUnit,
        estimatedProviderCost: dto.estimatedProviderCost,
        updatedAt: new Date(),
      },
    });
  }
}
