export interface SendMessagePayload {
  recipientId: string;
  customerId?: string;
  destination: string; // phone in E.164 or email address
  content: string; // text body or rendered HTML
  subject?: string; // for Email
  templateId?: string;
  templateName?: string;
  templateCategory?: string;
  language?: string;
  variables?: Record<string, string>;
  metadata?: Record<string, any>;
}

export interface SendMessageResult {
  success: boolean;
  providerMessageId?: string;
  status: 'SUBMITTED' | 'ACCEPTED' | 'DELIVERED' | 'FAILED';
  creditsCharged: number;
  errorCode?: string;
  errorMessage?: string;
  rawResponse?: any;
}

export interface ConnectionTestResult {
  success: boolean;
  message: string;
  details?: Record<string, any>;
  latencyMs?: number;
}

export interface ICommunicationProvider {
  readonly channel: 'SMS' | 'WHATSAPP' | 'EMAIL';
  readonly name: string;

  send(payload: SendMessagePayload, config: any): Promise<SendMessageResult>;
  testConnection(config: any): Promise<ConnectionTestResult>;
  calculateCredits(content: string, variables?: Record<string, string>): number;
}
