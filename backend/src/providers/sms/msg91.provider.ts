import { Injectable, Logger } from '@nestjs/common';
import {
  ICommunicationProvider,
  SendMessagePayload,
  SendMessageResult,
  ConnectionTestResult,
} from '../interfaces/provider.interface';

export interface Msg91Config {
  authKey: string;
  senderId: string;
  dltEntityId?: string;
  defaultTemplateId?: string;
  isSandbox?: boolean;
}

@Injectable()
export class Msg91SmsProvider implements ICommunicationProvider {
  readonly channel = 'SMS' as const;
  readonly name = 'MSG91';
  private readonly logger = new Logger(Msg91SmsProvider.name);

  // Standard GSM-7 character set regex
  private readonly gsm7Regex =
    /^[@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞ\x1bÆæßÉ !"#¤%&'()*+,\-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà^{}\\[~\]|€]*$/;

  /**
   * Determine if text contains non-GSM7 characters (requiring UCS-2/Unicode encoding)
   */
  isUnicode(text: string): boolean {
    return !this.gsm7Regex.test(text);
  }

  /**
   * Calculate required SMS segments based on TRAI GSM-7 and Unicode segment limits
   */
  calculateCredits(content: string, variables?: Record<string, string>): number {
    let text = content;
    if (variables) {
      for (const [key, value] of Object.entries(variables)) {
        text = text.replace(new RegExp(`{{${key}}}`, 'g'), value);
      }
    }

    const length = text.length;
    if (length === 0) return 1;

    const isUni = this.isUnicode(text);
    if (isUni) {
      // Unicode: 70 chars for 1 segment, 67 chars per segment for multi-part
      if (length <= 70) return 1;
      return Math.ceil(length / 67);
    } else {
      // GSM-7: 160 chars for 1 segment, 153 chars per segment for multi-part
      if (length <= 160) return 1;
      return Math.ceil(length / 153);
    }
  }

  /**
   * Normalize Indian phone numbers to E.164 without leading plus for MSG91
   */
  normalizePhoneNumber(phone: string): string {
    const cleaned = phone.replace(/[^0-9]/g, '');
    if (cleaned.length === 10) {
      return `91${cleaned}`;
    }
    if (cleaned.length === 12 && cleaned.startsWith('91')) {
      return cleaned;
    }
    return cleaned;
  }

  /**
   * Send SMS via official MSG91 API or mock sandbox
   */
  async send(payload: SendMessagePayload, config: Msg91Config): Promise<SendMessageResult> {
    const destination = this.normalizePhoneNumber(payload.destination);
    const creditsCharged = this.calculateCredits(payload.content, payload.variables);

    // If sandbox or dummy key, safely simulate real delivery
    if (config.isSandbox || !config.authKey || config.authKey.includes('demo') || config.authKey.includes('mock')) {
      this.logger.log(`[MSG91 SANDBOX] SMS sent to ${destination}. Segments: ${creditsCharged}. Content: ${payload.content.slice(0, 50)}...`);
      return {
        success: true,
        providerMessageId: `msg91_sbx_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        status: 'SUBMITTED',
        creditsCharged,
        rawResponse: { type: 'success', message: 'Sandbox SMS queued successfully', simulated: true },
      };
    }

    try {
      const templateId = payload.templateId || config.defaultTemplateId;
      const url = 'https://control.msg91.com/api/v5/flow/';

      const requestBody = {
        template_id: templateId,
        sender: config.senderId,
        short_url: '0',
        mobiles: destination,
        dlt_entity_id: config.dltEntityId,
        ...payload.variables,
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'authkey': config.authKey,
          'content-type': 'application/json',
          'accept': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const responseData = (await response.json()) as any;

      if (!response.ok || responseData.type === 'error') {
        const errorMsg = responseData.message || `MSG91 HTTP Error ${response.status}`;
        this.logger.error(`[MSG91 ERROR] ${errorMsg}`);
        return {
          success: false,
          status: 'FAILED',
          creditsCharged: 0,
          errorCode: 'MSG91_DISPATCH_FAILED',
          errorMessage: errorMsg,
          rawResponse: responseData,
        };
      }

      return {
        success: true,
        providerMessageId: responseData.message || `msg91_${Date.now()}`,
        status: 'SUBMITTED',
        creditsCharged,
        rawResponse: responseData,
      };
    } catch (error: any) {
      this.logger.error(`[MSG91 EXCEPTION] ${error.message}`);
      return {
        success: false,
        status: 'FAILED',
        creditsCharged: 0,
        errorCode: 'PROVIDER_NETWORK_ERROR',
        errorMessage: error.message || 'Failed to connect to MSG91 API',
      };
    }
  }

  /**
   * Test connection to MSG91 API
   */
  async testConnection(config: Msg91Config): Promise<ConnectionTestResult> {
    const startTime = Date.now();

    if (!config.authKey) {
      return {
        success: false,
        message: 'MSG91 Auth Key is required',
        latencyMs: 0,
      };
    }

    if (config.isSandbox || config.authKey.includes('demo') || config.authKey.includes('mock')) {
      return {
        success: true,
        message: 'MSG91 Sandbox Credentials Verified (Simulated Mode Active)',
        details: {
          mode: 'SANDBOX',
          senderId: config.senderId || 'BAASHG',
          dltEntityId: config.dltEntityId || 'DLT_DEMO_ENTITY',
        },
        latencyMs: 12,
      };
    }

    try {
      const response = await fetch('https://control.msg91.com/api/v5/balance', {
        method: 'GET',
        headers: {
          'authkey': config.authKey,
        },
      });

      const latencyMs = Date.now() - startTime;
      const data = (await response.json()) as any;

      if (!response.ok || data.type === 'error') {
        return {
          success: false,
          message: data.message || 'Invalid MSG91 Auth Key or Sender configuration',
          latencyMs,
          details: data,
        };
      }

      return {
        success: true,
        message: 'Successfully connected to MSG91 SMS gateway',
        latencyMs,
        details: {
          balance: data,
          senderId: config.senderId,
          dltEntityId: config.dltEntityId,
        },
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Connection failed: ${err.message}`,
        latencyMs: Date.now() - startTime,
      };
    }
  }
}
