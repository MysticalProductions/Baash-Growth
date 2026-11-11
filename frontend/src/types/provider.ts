import { WalletChannel } from './wallet';

export interface ProviderConfiguration {
  id: string;
  channel: WalletChannel;
  providerName: string;
  credentials: Record<string, any>;
  isActive: boolean;
  isSandbox: boolean;
  lastTestedAt?: string;
  lastTestStatus?: 'SUCCESS' | 'FAILED';
  lastTestError?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChannelPricing {
  id: string;
  channel: WalletChannel;
  sellingCreditsPerUnit: number;
  estimatedProviderCost: number;
  currency: string;
  updatedAt: string;
}

export interface ConnectionTestResult {
  success: boolean;
  message: string;
  latencyMs?: number;
  details?: Record<string, any>;
}
