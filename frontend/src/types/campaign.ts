import { WalletChannel } from './wallet';

export type CampaignStatus =
  | 'DRAFT'
  | 'SCHEDULED'
  | 'QUEUED'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'PARTIALLY_COMPLETED'
  | 'FAILED'
  | 'CANCELLED';

export type RecipientStatus =
  | 'PENDING'
  | 'SUBMITTED'
  | 'ACCEPTED'
  | 'DELIVERED'
  | 'FAILED'
  | 'UNDELIVERED'
  | 'READ'
  | 'EXCLUDED';

export type AudienceType = 'ALL_CUSTOMERS' | 'SEGMENT' | 'TAGS' | 'MANUAL';

export interface Campaign {
  id: string;
  vendorId: string;
  name: string;
  channel: WalletChannel;
  templateId?: string;
  subject?: string;
  content: string;
  audienceType: AudienceType;
  segmentId?: string;
  audienceFilters?: Record<string, any>;
  status: CampaignStatus;
  scheduledAt?: string;
  startedAt?: string;
  completedAt?: string;
  totalRecipients: number;
  eligibleRecipients: number;
  excludedRecipients: number;
  sentCount: number;
  deliveredCount: number;
  failedCount: number;
  readCount: number;
  estimatedCredits: number;
  reservedCredits: number;
  consumedCredits: number;
  releasedCredits: number;
  isSimulated: boolean;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  template?: {
    id: string;
    name: string;
    category?: string;
    language?: string;
  };
  segment?: {
    id: string;
    name: string;
  };
  recipients?: CampaignRecipient[];
  vendor?: {
    id: string;
    businessName: string;
    businessEmail: string;
  };
}

export interface CampaignRecipient {
  id: string;
  campaignId: string;
  customerId?: string;
  destination: string;
  status: RecipientStatus;
  providerMessageId?: string;
  estimatedCredits: number;
  actualCredits: number;
  variableValues?: Record<string, string>;
  renderedContent?: string;
  errorCode?: string;
  errorMessage?: string;
  submittedAt?: string;
  deliveredAt?: string;
  readAt?: string;
  createdAt: string;
  customer?: {
    id: string;
    fullName: string;
    phone?: string;
    email?: string;
    city?: string;
  };
}

export interface CampaignEstimate {
  channel: WalletChannel;
  totalRecipientsFound: number;
  eligibleCount: number;
  excludedCount: number;
  excludedBreakdown: Record<string, number>;
  creditsPerRecipient: number;
  totalEstimatedCredits: number;
  wallet: {
    availableCredits: number;
    reservedCredits: number;
    hasSufficientBalance: boolean;
    creditsShortfall: number;
  };
}
