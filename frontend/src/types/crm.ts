export type CustomerSource =
  | 'MANUAL_ENTRY'
  | 'CSV_IMPORT'
  | 'WEBSITE'
  | 'BOOKING'
  | 'EVENT_REGISTRATION'
  | 'OTHER';

export type Gender = 'MALE' | 'FEMALE' | 'OTHER' | 'PREFER_NOT_TO_SAY';

export type ConsentChannel = 'SMS' | 'WHATSAPP' | 'EMAIL';

export type ConsentStatus = 'OPTED_IN' | 'OPTED_OUT' | 'UNKNOWN';

export type TemplateChannel = 'SMS' | 'WHATSAPP' | 'EMAIL';

export type WhatsAppCategory = 'MARKETING' | 'UTILITY' | 'AUTHENTICATION';

export type MetaApprovalStatus = 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED';

export type MessageStatus = 'QUEUED' | 'SENT' | 'DELIVERED' | 'FAILED' | 'READ';

export interface CustomerTag {
  id: string;
  vendorId: string;
  name: string;
  color?: string;
  createdAt: string;
  _count?: {
    assignments: number;
  };
}

export interface CustomerConsent {
  id: string;
  customerId: string;
  channel: ConsentChannel;
  status: ConsentStatus;
  source?: string;
  consentTimestamp?: string;
  optOutTimestamp?: string;
  notes?: string;
  updatedAt: string;
}

export interface Customer {
  id: string;
  vendorId: string;
  fullName: string;
  phone?: string;
  email?: string;
  gender?: Gender;
  dateOfBirth?: string;
  city?: string;
  state?: string;
  source: CustomerSource;
  notes?: string;
  tags?: CustomerTag[];
  consents?: CustomerConsent[];
  createdAt: string;
  updatedAt: string;
}

export interface CustomerSegment {
  id: string;
  vendorId: string;
  name: string;
  description?: string;
  filters: Record<string, any>;
  matchedCustomerCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface MessageTemplate {
  id: string;
  vendorId?: string;
  channel: TemplateChannel;
  name: string;
  category?: WhatsAppCategory;
  language?: string;
  subject?: string;
  content: string;
  plainTextContent?: string;
  metaStatus: MetaApprovalStatus;
  variables?: string[];
  smsStats?: {
    characterCount: number;
    segmentCount: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface MessageHistory {
  id: string;
  vendorId: string;
  customerId: string;
  channel: ConsentChannel;
  campaignName?: string;
  messageContent: string;
  content?: string;
  status: MessageStatus;
  providerId?: string;
  providerMessageId?: string;
  isDemo: boolean;
  createdAt: string;
  sentAt?: string;
}

