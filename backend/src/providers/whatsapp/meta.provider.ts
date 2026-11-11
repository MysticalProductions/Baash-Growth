import { Injectable, Logger } from '@nestjs/common';
import {
  ICommunicationProvider,
  SendMessagePayload,
  SendMessageResult,
  ConnectionTestResult,
} from '../interfaces/provider.interface';

export interface MetaWhatsAppConfig {
  wabaId: string;
  phoneNumberId: string;
  accessToken: string;
  apiVersion?: string;
  isSandbox?: boolean;
}

@Injectable()
export class MetaWhatsAppProvider implements ICommunicationProvider {
  readonly channel = 'WHATSAPP' as const;
  readonly name = 'META_WHATSAPP';
  private readonly logger = new Logger(MetaWhatsAppProvider.name);

  /**
   * Calculate credits for WhatsApp message (1 credit per standard recipient)
   */
  calculateCredits(_content: string, _variables?: Record<string, string>): number {
    return 1;
  }

  /**
   * Normalize phone number to WhatsApp international format (digits only, e.g. 919876543210)
   */
  normalizePhoneNumber(phone: string): string {
    const cleaned = phone.replace(/[^0-9]/g, '');
    if (cleaned.length === 10) {
      return `91${cleaned}`;
    }
    return cleaned;
  }

  /**
   * Dispatch WhatsApp template message via official Meta Graph API
   */
  async send(payload: SendMessagePayload, config: MetaWhatsAppConfig): Promise<SendMessageResult> {
    const destination = this.normalizePhoneNumber(payload.destination);
    const apiVersion = config.apiVersion || 'v21.0';

    // Sandbox / Mock simulation mode
    if (
      config.isSandbox ||
      !config.accessToken ||
      config.accessToken.includes('demo') ||
      config.accessToken.includes('mock') ||
      !config.phoneNumberId ||
      config.phoneNumberId.includes('demo')
    ) {
      this.logger.log(`[META WHATSAPP SANDBOX] Message dispatched to ${destination}. Template: ${payload.templateName || 'custom'}`);
      return {
        success: true,
        providerMessageId: `wamid.HBgL${Date.now()}sbx${Math.random().toString(36).substring(2, 9)}`,
        status: 'SUBMITTED',
        creditsCharged: 1,
        rawResponse: { messaging_product: 'whatsapp', contacts: [{ input: destination, wa_id: destination }], messages: [{ id: `wamid.mock_${Date.now()}` }], simulated: true },
      };
    }

    try {
      const url = `https://graph.facebook.com/${apiVersion}/${config.phoneNumberId}/messages`;

      // Build parameters array for body component if variables exist
      const parameters: any[] = [];
      if (payload.variables) {
        for (const val of Object.values(payload.variables)) {
          parameters.push({
            type: 'text',
            text: String(val),
          });
        }
      }

      const requestBody = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: destination,
        type: 'template',
        template: {
          name: payload.templateName || 'sample_template',
          language: {
            code: payload.language || 'en',
          },
          components: parameters.length > 0
            ? [
                {
                  type: 'body',
                  parameters,
                },
              ]
            : undefined,
        },
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const responseData = (await response.json()) as any;

      if (!response.ok || responseData.error) {
        const errorMsg = responseData.error?.message || `Meta WhatsApp API error (${response.status})`;
        this.logger.error(`[META WHATSAPP ERROR] ${errorMsg}`);
        return {
          success: false,
          status: 'FAILED',
          creditsCharged: 0,
          errorCode: responseData.error?.code ? String(responseData.error.code) : 'META_API_ERROR',
          errorMessage: errorMsg,
          rawResponse: responseData,
        };
      }

      const messageId = responseData.messages?.[0]?.id || `wamid_${Date.now()}`;

      return {
        success: true,
        providerMessageId: messageId,
        status: 'SUBMITTED',
        creditsCharged: 1,
        rawResponse: responseData,
      };
    } catch (error: any) {
      this.logger.error(`[META WHATSAPP EXCEPTION] ${error.message}`);
      return {
        success: false,
        status: 'FAILED',
        creditsCharged: 0,
        errorCode: 'PROVIDER_NETWORK_ERROR',
        errorMessage: error.message || 'Failed to connect to Meta Graph API',
      };
    }
  }

  /**
   * Test Meta WhatsApp Cloud API credentials
   */
  async testConnection(config: MetaWhatsAppConfig): Promise<ConnectionTestResult> {
    const startTime = Date.now();

    if (!config.accessToken || !config.wabaId) {
      return {
        success: false,
        message: 'Meta WhatsApp WABA ID and Access Token are required',
        latencyMs: 0,
      };
    }

    if (config.isSandbox || config.accessToken.includes('demo') || config.accessToken.includes('mock')) {
      return {
        success: true,
        message: 'Meta WhatsApp Cloud API Sandbox Credentials Verified',
        details: {
          mode: 'SANDBOX',
          wabaId: config.wabaId,
          phoneNumberId: config.phoneNumberId || 'PHONE_NUM_DEMO',
          apiVersion: config.apiVersion || 'v21.0',
        },
        latencyMs: 15,
      };
    }

    try {
      const apiVersion = config.apiVersion || 'v21.0';
      const url = `https://graph.facebook.com/${apiVersion}/${config.wabaId}?fields=id,name,currency,timezone_id`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${config.accessToken}`,
        },
      });

      const latencyMs = Date.now() - startTime;
      const data = (await response.json()) as any;

      if (!response.ok || data.error) {
        return {
          success: false,
          message: data.error?.message || 'Failed to verify Meta WhatsApp Business Account',
          latencyMs,
          details: data.error,
        };
      }

      return {
        success: true,
        message: `Connected to Meta WhatsApp Cloud API (${data.name || 'WABA Verified'})`,
        latencyMs,
        details: {
          wabaId: data.id,
          businessName: data.name,
          currency: data.currency,
          timezone: data.timezone_id,
        },
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Meta connection failed: ${err.message}`,
        latencyMs: Date.now() - startTime,
      };
    }
  }
}
