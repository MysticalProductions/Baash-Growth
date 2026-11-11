export type WalletChannel = 'SMS' | 'WHATSAPP' | 'EMAIL';

export type PackageStatus = 'ACTIVE' | 'INACTIVE';

export type TransactionType =
  | 'PURCHASE'
  | 'CAMPAIGN_RESERVATION'
  | 'CAMPAIGN_CAPTURE'
  | 'RESERVATION_RELEASE'
  | 'REFUND'
  | 'ADMIN_ADJUSTMENT';

export type TransactionDirection = 'CREDIT' | 'DEBIT';

export type PurchaseStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED'
  | 'REFUNDED';

export type PaymentStatus =
  | 'CREATED'
  | 'AUTHORIZED'
  | 'CAPTURED'
  | 'FAILED'
  | 'REFUNDED';

export interface VendorWallet {
  id: string;
  vendorId: string;
  channel: WalletChannel;
  availableCredits: number;
  reservedCredits: number;
  totalPurchased: number;
  totalConsumed: number;
  totalRefunded: number;
  lastTransactionAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreditPackage {
  id: string;
  name: string;
  channel: WalletChannel;
  credits: number;
  price: number;
  gstPercentage: number;
  gstAmount: number;
  finalPrice: number;
  description?: string;
  status: PackageStatus;
  createdAt: string;
  updatedAt: string;
  purchaseCount?: number;
}

export interface WalletTransaction {
  id: string;
  vendorId: string;
  walletId: string;
  channel: WalletChannel;
  type: TransactionType;
  direction: TransactionDirection;
  credits: number;
  balanceBefore: number;
  balanceAfter: number;
  referenceType?: string;
  referenceId?: string;
  description: string;
  idempotencyKey?: string;
  metadata?: any;
  createdAt: string;
  vendor?: {
    id: string;
    businessName: string;
    businessEmail: string;
  };
}

export interface CreditPurchase {
  id: string;
  vendorId: string;
  packageId?: string;
  channel: WalletChannel;
  credits: number;
  basePrice: number;
  gstPercentage: number;
  gstAmount: number;
  totalAmount: number;
  currency: string;
  status: PurchaseStatus;
  paymentMethod?: string;
  idempotencyKey?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  package?: CreditPackage;
}

export interface WalletSummaryReports {
  summary: {
    totalRevenue: number;
    totalBaseRevenue: number;
    totalGstCollected: number;
    totalCreditsSold: number;
    totalPurchasesCount: number;
    completedPurchasesCount: number;
  };
  channelBreakdown: {
    SMS: { creditsSold: number; revenue: number; purchasesCount: number };
    WHATSAPP: { creditsSold: number; revenue: number; purchasesCount: number };
    EMAIL: { creditsSold: number; revenue: number; purchasesCount: number };
  };
  recentTransactions: WalletTransaction[];
}

