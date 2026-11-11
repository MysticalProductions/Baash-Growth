import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import {
  ICommunicationProvider,
  SendMessagePayload,
  SendMessageResult,
  ConnectionTestResult,
} from '../interfaces/provider.interface';

export interface AmazonSesConfig {
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  fromEmail: string;
  isSandbox?: boolean;
}

@Injectable()
export class AmazonSesEmailProvider implements ICommunicationProvider {
  readonly channel = 'EMAIL' as const;
  readonly name = 'AMAZON_SES';
  private readonly logger = new Logger(AmazonSesEmailProvider.name);

  /**
   * Calculate credits for email (1 credit per recipient)
   */
  calculateCredits(_content: string, _variables?: Record<string, string>): number {
    return 1;
  }

  /**
   * Helper to compute AWS SigV4 authorization header for Amazon SES Query / REST API
   */
  private signAwsRequest(
    method: string,
    endpoint: string,
    region: string,
    service: string,
    headers: Record<string, string>,
    body: string,
    accessKeyId: string,
    secretAccessKey: string,
  ): Record<string, string> {
    const now = new Date();
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
    const dateStamp = amzDate.slice(0, 8);

    const host = new URL(endpoint).host;
    const signedHeadersList = ['host', 'x-amz-date'];
    headers['host'] = host;
    headers['x-amz-date'] = amzDate;

    if (body) {
      headers['content-type'] = 'application/x-www-form-urlencoded';
      signedHeadersList.push('content-type');
    }

    signedHeadersList.sort();
    const signedHeaders = signedHeadersList.join(';');

    const canonicalHeaders = signedHeadersList
      .map((h) => `${h}:${headers[h].trim()}\n`)
      .join('');

    const payloadHash = crypto.createHash('sha256').update(body || '').digest('hex');

    const canonicalRequest = [
      method,
      '/',
      '',
      canonicalHeaders,
      signedHeaders,
      payloadHash,
    ].join('\n');

    const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
    const stringToSign = [
      'AWS4-HMAC-SHA256',
      amzDate,
      credentialScope,
      crypto.createHash('sha256').update(canonicalRequest).digest('hex'),
    ].join('\n');

    const kDate = crypto.createHmac('sha256', `AWS4${secretAccessKey}`).update(dateStamp).digest();
    const kRegion = crypto.createHmac('sha256', kDate).update(region).digest();
    const kService = crypto.createHmac('sha256', kRegion).update(service).digest();
    const kSigning = crypto.createHmac('sha256', kService).update('aws4_request').digest();
    const signature = crypto.createHmac('sha256', kSigning).update(stringToSign).digest('hex');

    const authHeader = `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
    headers['authorization'] = authHeader;

    return headers;
  }

  /**
   * Send Email via Amazon SES API or mock sandbox
   */
  async send(payload: SendMessagePayload, config: AmazonSesConfig): Promise<SendMessageResult> {
    const destination = payload.destination.trim().toLowerCase();
    const region = config.region || 'ap-south-1';
    const fromEmail = config.fromEmail || 'growth@baash.in';

    // Sandbox / mock mode
    if (
      config.isSandbox ||
      !config.accessKeyId ||
      config.accessKeyId.includes('demo') ||
      config.accessKeyId.includes('mock') ||
      !config.secretAccessKey ||
      config.secretAccessKey.includes('demo')
    ) {
      this.logger.log(`[AMAZON SES SANDBOX] Email dispatched to ${destination}. Subject: "${payload.subject || 'Campaign'}"`);
      return {
        success: true,
        providerMessageId: `0100018f${Date.now()}sbx${Math.random().toString(36).substring(2, 8)}-000000`,
        status: 'SUBMITTED',
        creditsCharged: 1,
        rawResponse: { MessageId: `ses_mock_${Date.now()}`, simulated: true },
      };
    }

    try {
      const endpoint = `https://email.${region}.amazonaws.com`;

      // Perform dynamic variable substitution in content
      let renderedHtml = payload.content;
      if (payload.variables) {
        for (const [key, val] of Object.entries(payload.variables)) {
          renderedHtml = renderedHtml.replace(new RegExp(`{{${key}}}`, 'g'), val);
        }
      }

      // Add default unsubscribe footer if not present
      if (!renderedHtml.includes('unsubscribe')) {
        renderedHtml += `<br/><br/><div style="font-size: 11px; color: #888; border-top: 1px solid #333; padding-top: 12px; margin-top: 24px;">To stop receiving these emails from this vendor, <a href="https://baash.in/unsubscribe?email=${encodeURIComponent(destination)}" style="color: #7B35E8;">unsubscribe here</a>.</div>`;
      }

      const params = new URLSearchParams();
      params.append('Action', 'SendEmail');
      params.append('Source', fromEmail);
      params.append('Destination.ToAddresses.member.1', destination);
      params.append('Message.Subject.Data', payload.subject || 'Notification from BAASH GROWTH');
      params.append('Message.Subject.Charset', 'UTF-8');
      params.append('Message.Body.Html.Data', renderedHtml);
      params.append('Message.Body.Html.Charset', 'UTF-8');

      const body = params.toString();
      const headers: Record<string, string> = {};

      this.signAwsRequest('POST', endpoint, region, 'ses', headers, body, config.accessKeyId, config.secretAccessKey);

      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body,
      });

      const responseText = await response.text();

      if (!response.ok) {
        this.logger.error(`[AMAZON SES ERROR] ${response.status}: ${responseText}`);
        return {
          success: false,
          status: 'FAILED',
          creditsCharged: 0,
          errorCode: 'SES_DISPATCH_FAILED',
          errorMessage: `Amazon SES dispatch rejected (${response.status})`,
          rawResponse: responseText,
        };
      }

      // Extract MessageId from XML response
      const messageIdMatch = responseText.match(/<MessageId>(.*?)<\/MessageId>/);
      const providerMessageId = messageIdMatch ? messageIdMatch[1] : `ses_${Date.now()}`;

      return {
        success: true,
        providerMessageId,
        status: 'SUBMITTED',
        creditsCharged: 1,
        rawResponse: { providerMessageId, rawXml: responseText },
      };
    } catch (error: any) {
      this.logger.error(`[AMAZON SES EXCEPTION] ${error.message}`);
      return {
        success: false,
        status: 'FAILED',
        creditsCharged: 0,
        errorCode: 'PROVIDER_NETWORK_ERROR',
        errorMessage: error.message || 'Failed to connect to Amazon SES API',
      };
    }
  }

  /**
   * Test connection to Amazon SES using GetSendQuota action
   */
  async testConnection(config: AmazonSesConfig): Promise<ConnectionTestResult> {
    const startTime = Date.now();

    if (!config.accessKeyId || !config.secretAccessKey) {
      return {
        success: false,
        message: 'Amazon SES Access Key ID and Secret Access Key are required',
        latencyMs: 0,
      };
    }

    if (
      config.isSandbox ||
      config.accessKeyId.includes('demo') ||
      config.accessKeyId.includes('mock') ||
      config.secretAccessKey.includes('demo')
    ) {
      return {
        success: true,
        message: 'Amazon SES Sandbox Credentials Verified (Simulated Mode Active)',
        details: {
          mode: 'SANDBOX',
          region: config.region || 'ap-south-1',
          fromEmail: config.fromEmail || 'growth@baash.in',
          max24HourSend: 50000,
          maxSendRate: 14.0,
        },
        latencyMs: 14,
      };
    }

    try {
      const region = config.region || 'ap-south-1';
      const endpoint = `https://email.${region}.amazonaws.com`;
      const params = new URLSearchParams({ Action: 'GetSendQuota' });
      const body = params.toString();
      const headers: Record<string, string> = {};

      this.signAwsRequest('POST', endpoint, region, 'ses', headers, body, config.accessKeyId, config.secretAccessKey);

      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body,
      });

      const responseText = await response.text();
      const latencyMs = Date.now() - startTime;

      if (!response.ok) {
        return {
          success: false,
          message: 'Amazon SES credentials or permissions rejected',
          latencyMs,
          details: { error: responseText },
        };
      }

      const quotaMatch = responseText.match(/<Max24HourSend>(.*?)<\/Max24HourSend>/);
      const max24HourSend = quotaMatch ? parseFloat(quotaMatch[1]) : undefined;

      return {
        success: true,
        message: `Successfully connected to Amazon SES (${region})`,
        latencyMs,
        details: {
          region,
          fromEmail: config.fromEmail,
          max24HourSend,
        },
      };
    } catch (err: any) {
      return {
        success: false,
        message: `SES connection failed: ${err.message}`,
        latencyMs: Date.now() - startTime,
      };
    }
  }
}
