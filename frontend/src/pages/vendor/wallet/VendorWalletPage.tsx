import React, { useState, useEffect, useCallback } from 'react';
import {
  Wallet,
  CreditCard,
  Plus,
  RefreshCw,
  Search,
  Filter,
  ArrowDownLeft,
  ArrowUpRight,
  Eye,
  Smartphone,
  MessageSquare,
  Mail,
  Receipt,
  Calendar,
  X,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';
import api from '../../../services/api';
import {
  VendorWallet,
  WalletTransaction,
  WalletChannel,
  TransactionType,
  TransactionDirection,
} from '../../../types/wallet';
import { BuyCreditsModal } from './BuyCreditsModal';
import { TransactionDetailModal } from './TransactionDetailModal';

export const VendorWalletPage: React.FC = () => {
  const [wallets, setWallets] = useState<VendorWallet[]>([]);
  const [summary, setSummary] = useState({
    totalAvailable: 0,
    totalPurchased: 0,
    totalConsumed: 0,
  });
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [totalTransactions, setTotalTransactions] = useState(0);
  const [loading, setLoading] = useState(true);
  const [txLoading, setTxLoading] = useState(false);
  const [error, setError] = useState('');

  // Transaction Filters
  const [channelFilter, setChannelFilter] = useState<WalletChannel | ''>('');
  const [typeFilter, setTypeFilter] = useState<TransactionType | ''>('');
  const [directionFilter, setDirectionFilter] = useState<TransactionDirection | ''>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  // Modals
  const [isBuyModalOpen, setIsBuyModalOpen] = useState(false);
  const [selectedBuyChannel, setSelectedBuyChannel] = useState<WalletChannel>('SMS');
  const [selectedTransaction, setSelectedTransaction] = useState<WalletTransaction | null>(null);

  const fetchWallets = async () => {
    try {
      const res = await api.get('/wallets');
      const walletData = res?.wallets ? res : (res?.data || {});
      setWallets(walletData.wallets || []);
      setSummary(
        walletData.summary || {
          totalAvailable: 0,
          totalPurchased: 0,
          totalConsumed: 0,
        },
      );
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load wallet balances');
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactions = useCallback(async () => {
    setTxLoading(true);
    try {
      const params: Record<string, any> = {
        page,
        limit,
      };
      if (channelFilter) params.channel = channelFilter;
      if (typeFilter) params.type = typeFilter;
      if (directionFilter) params.direction = directionFilter;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const res = await api.get('/transactions', { params });
      const txList = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : (res?.data?.data || []));
      setTransactions(txList);
      setTotalTransactions(res?.total ?? res?.data?.total ?? txList.length);
    } catch (err: any) {
      console.error('Failed to load transactions:', err);
    } finally {
      setTxLoading(false);
    }
  }, [channelFilter, typeFilter, directionFilter, startDate, endDate, page, limit]);

  useEffect(() => {
    fetchWallets();
  }, []);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const handleOpenBuy = (targetChannel: WalletChannel) => {
    setSelectedBuyChannel(targetChannel);
    setIsBuyModalOpen(true);
  };

  const handleResetFilters = () => {
    setChannelFilter('');
    setTypeFilter('');
    setDirectionFilter('');
    setStartDate('');
    setEndDate('');
    setPage(1);
  };

  const getWalletByChannel = (ch: WalletChannel): VendorWallet | undefined => {
    return wallets.find((w) => w.channel === ch);
  };

  const totalPages = Math.ceil(totalTransactions / limit) || 1;

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center gap-3 text-[#9E9E9E]">
        <div className="w-8 h-8 border-2 border-[#7B35E8] border-t-transparent rounded-full animate-spin" />
        <span className="text-sm">Loading communication wallets...</span>
      </div>
    );
  }

  const smsWallet = getWalletByChannel('SMS');
  const whatsAppWallet = getWalletByChannel('WHATSAPP');
  const emailWallet = getWalletByChannel('EMAIL');

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white tracking-tight">Communication Wallet</h1>
            <span className="px-2.5 py-0.5 bg-[#7B35E8]/15 border border-[#7B35E8]/30 rounded-full text-xs font-semibold text-[#7B35E8]">
              Prepaid Credit Ledger
            </span>
          </div>
          <p className="text-xs text-[#9E9E9E] mt-1">
            Manage your dedicated SMS, WhatsApp, and Email credit balances and audit ledger
          </p>
        </div>

        <button
          onClick={() => handleOpenBuy('SMS')}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#7B35E8] hover:bg-[#6824D3] text-white rounded-xl text-xs font-bold shadow-lg shadow-[#7B35E8]/20 transition-all self-start sm:self-auto"
        >
          <CreditCard className="w-4 h-4" />
          Buy Communication Credits
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}

      {/* 3 Channel Wallet Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* SMS WALLET */}
        <div className="p-6 bg-[#12121A] border border-[#232336] rounded-2xl flex flex-col justify-between space-y-5 hover:border-blue-500/40 transition-colors shadow-xl">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">SMS Wallet</h3>
                  <span className="text-[10px] text-[#9E9E9E] font-mono">GSM-7 & DLT Compliant</span>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                ACTIVE
              </span>
            </div>

            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#9E9E9E]">
                Available Credits
              </span>
              <p className="text-3xl font-extrabold text-white mt-1">
                {(smsWallet?.availableCredits ?? 0).toLocaleString()}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-3 border-t border-[#1A1A2E] text-xs">
              <div className="p-2 bg-[#1A1A2E]/50 rounded-lg">
                <span className="text-[10px] text-[#9E9E9E] block">Reserved</span>
                <span className="font-bold text-white font-mono">
                  {(smsWallet?.reservedCredits ?? 0).toLocaleString()}
                </span>
              </div>
              <div className="p-2 bg-[#1A1A2E]/50 rounded-lg">
                <span className="text-[10px] text-[#9E9E9E] block">Purchased</span>
                <span className="font-bold text-emerald-400 font-mono">
                  {(smsWallet?.totalPurchased ?? 0).toLocaleString()}
                </span>
              </div>
              <div className="p-2 bg-[#1A1A2E]/50 rounded-lg">
                <span className="text-[10px] text-[#9E9E9E] block">Consumed</span>
                <span className="font-bold text-[#D1D1DB] font-mono">
                  {(smsWallet?.totalConsumed ?? 0).toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => handleOpenBuy('SMS')}
            className="w-full py-2 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-blue-400 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Buy SMS Credits
          </button>
        </div>

        {/* WHATSAPP WALLET */}
        <div className="p-6 bg-[#12121A] border border-[#232336] rounded-2xl flex flex-col justify-between space-y-5 hover:border-emerald-500/40 transition-colors shadow-xl">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">WhatsApp Wallet</h3>
                  <span className="text-[10px] text-[#9E9E9E] font-mono">Meta Conversation Credits</span>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                ACTIVE
              </span>
            </div>

            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#9E9E9E]">
                Available Credits
              </span>
              <p className="text-3xl font-extrabold text-white mt-1">
                {(whatsAppWallet?.availableCredits ?? 0).toLocaleString()}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-3 border-t border-[#1A1A2E] text-xs">
              <div className="p-2 bg-[#1A1A2E]/50 rounded-lg">
                <span className="text-[10px] text-[#9E9E9E] block">Reserved</span>
                <span className="font-bold text-white font-mono">
                  {(whatsAppWallet?.reservedCredits ?? 0).toLocaleString()}
                </span>
              </div>
              <div className="p-2 bg-[#1A1A2E]/50 rounded-lg">
                <span className="text-[10px] text-[#9E9E9E] block">Purchased</span>
                <span className="font-bold text-emerald-400 font-mono">
                  {(whatsAppWallet?.totalPurchased ?? 0).toLocaleString()}
                </span>
              </div>
              <div className="p-2 bg-[#1A1A2E]/50 rounded-lg">
                <span className="text-[10px] text-[#9E9E9E] block">Consumed</span>
                <span className="font-bold text-[#D1D1DB] font-mono">
                  {(whatsAppWallet?.totalConsumed ?? 0).toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => handleOpenBuy('WHATSAPP')}
            className="w-full py-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Buy WhatsApp Credits
          </button>
        </div>

        {/* EMAIL WALLET */}
        <div className="p-6 bg-[#12121A] border border-[#232336] rounded-2xl flex flex-col justify-between space-y-5 hover:border-purple-500/40 transition-colors shadow-xl">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Email Wallet</h3>
                  <span className="text-[10px] text-[#9E9E9E] font-mono">High-Deliverability Pool</span>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20">
                ACTIVE
              </span>
            </div>

            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#9E9E9E]">
                Available Credits
              </span>
              <p className="text-3xl font-extrabold text-white mt-1">
                {(emailWallet?.availableCredits ?? 0).toLocaleString()}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-3 border-t border-[#1A1A2E] text-xs">
              <div className="p-2 bg-[#1A1A2E]/50 rounded-lg">
                <span className="text-[10px] text-[#9E9E9E] block">Reserved</span>
                <span className="font-bold text-white font-mono">
                  {(emailWallet?.reservedCredits ?? 0).toLocaleString()}
                </span>
              </div>
              <div className="p-2 bg-[#1A1A2E]/50 rounded-lg">
                <span className="text-[10px] text-[#9E9E9E] block">Purchased</span>
                <span className="font-bold text-emerald-400 font-mono">
                  {(emailWallet?.totalPurchased ?? 0).toLocaleString()}
                </span>
              </div>
              <div className="p-2 bg-[#1A1A2E]/50 rounded-lg">
                <span className="text-[10px] text-[#9E9E9E] block">Consumed</span>
                <span className="font-bold text-[#D1D1DB] font-mono">
                  {(emailWallet?.totalConsumed ?? 0).toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => handleOpenBuy('EMAIL')}
            className="w-full py-2 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-purple-400 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Buy Email Credits
          </button>
        </div>
      </div>

      {/* Transaction History Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Receipt className="w-5 h-5 text-[#7B35E8]" />
              Wallet Transaction Ledger
            </h3>
            <p className="text-xs text-[#9E9E9E] mt-0.5">
              Immutable double-entry audit records for all credit purchases, debits, and adjustments
            </p>
          </div>
          <button
            onClick={() => {
              fetchWallets();
              fetchTransactions();
            }}
            className="p-2 rounded-xl bg-[#1A1A2E] border border-[#2A2A40] text-[#9E9E9E] hover:text-white transition-colors self-start sm:self-auto"
            title="Refresh Ledger"
          >
            <RefreshCw className={`w-4 h-4 ${txLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Filter Toolbar */}
        <div className="p-4 bg-[#12121A] border border-[#232336] rounded-2xl flex flex-wrap items-center gap-3 text-xs">
          {/* Channel */}
          <select
            value={channelFilter}
            onChange={(e) => {
              setChannelFilter(e.target.value as any);
              setPage(1);
            }}
            className="px-3 py-1.5 bg-[#1A1A2E] border border-[#2A2A40] rounded-xl text-white text-xs focus:outline-none focus:border-[#7B35E8]"
          >
            <option value="">All Channels</option>
            <option value="SMS">SMS</option>
            <option value="WHATSAPP">WhatsApp</option>
            <option value="EMAIL">Email</option>
          </select>

          {/* Type */}
          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value as any);
              setPage(1);
            }}
            className="px-3 py-1.5 bg-[#1A1A2E] border border-[#2A2A40] rounded-xl text-white text-xs focus:outline-none focus:border-[#7B35E8]"
          >
            <option value="">All Types</option>
            <option value="PURCHASE">Purchase</option>
            <option value="ADMIN_ADJUSTMENT">Admin Adjustment</option>
            <option value="CAMPAIGN_RESERVATION">Campaign Reservation</option>
            <option value="CAMPAIGN_CAPTURE">Campaign Capture</option>
            <option value="REFUND">Refund</option>
          </select>

          {/* Direction */}
          <select
            value={directionFilter}
            onChange={(e) => {
              setDirectionFilter(e.target.value as any);
              setPage(1);
            }}
            className="px-3 py-1.5 bg-[#1A1A2E] border border-[#2A2A40] rounded-xl text-white text-xs focus:outline-none focus:border-[#7B35E8]"
          >
            <option value="">All Directions</option>
            <option value="CREDIT">Credits Added (+)</option>
            <option value="DEBIT">Credits Deducted (-)</option>
          </select>

          {/* Date range */}
          <div className="flex items-center gap-1.5">
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPage(1);
              }}
              className="px-2.5 py-1.5 bg-[#1A1A2E] border border-[#2A2A40] rounded-xl text-white text-xs"
            />
            <span className="text-[#6E6E82]">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPage(1);
              }}
              className="px-2.5 py-1.5 bg-[#1A1A2E] border border-[#2A2A40] rounded-xl text-white text-xs"
            />
          </div>

          {(channelFilter || typeFilter || directionFilter || startDate || endDate) && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="p-2 text-[#9E9E9E] hover:text-white bg-[#1A1A2E] rounded-xl border border-[#2A2A40] transition-colors"
              title="Reset filters"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Ledger Table */}
        <div className="bg-[#12121A] border border-[#232336] rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-[#161622] text-[#9E9E9E] border-b border-[#232336]">
                  <th className="py-3 px-4 uppercase font-semibold">Transaction ID</th>
                  <th className="py-3 px-4 uppercase font-semibold">Date & Time</th>
                  <th className="py-3 px-4 uppercase font-semibold">Channel</th>
                  <th className="py-3 px-4 uppercase font-semibold">Type</th>
                  <th className="py-3 px-4 uppercase font-semibold">Description</th>
                  <th className="py-3 px-4 uppercase font-semibold text-right">Credits</th>
                  <th className="py-3 px-4 uppercase font-semibold text-right">Balance After</th>
                  <th className="py-3 px-4 uppercase font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#232336] text-white">
                {txLoading ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-[#9E9E9E]">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <div className="w-6 h-6 border-2 border-[#7B35E8] border-t-transparent rounded-full animate-spin" />
                        <span>Loading transactions...</span>
                      </div>
                    </td>
                  </tr>
                ) : transactions.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-16 text-center text-[#6E6E82]">
                      <Receipt className="w-10 h-10 mx-auto mb-2 opacity-40" />
                      <p className="text-sm font-semibold text-white">No transactions recorded</p>
                      <p className="text-xs text-[#9E9E9E] mt-0.5">
                        {channelFilter || typeFilter
                          ? 'Try adjusting your filters'
                          : 'Purchase a credit package to start using communications.'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  (Array.isArray(transactions) ? transactions : []).map((tx) => {
                    const isCredit = tx.direction === 'CREDIT';
                    return (
                      <tr key={tx.id} className="hover:bg-[#161622]/60 transition-colors">
                        <td className="py-3 px-4 font-mono text-[#9E9E9E]">
                          {tx.id.slice(0, 8)}...
                        </td>
                        <td className="py-3 px-4 text-[#D1D1DB] whitespace-nowrap">
                          {new Date(tx.createdAt).toLocaleString()}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              tx.channel === 'SMS'
                                ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                : tx.channel === 'WHATSAPP'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                            }`}
                          >
                            {tx.channel}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-semibold text-white text-[11px]">
                            {tx.type.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-[#D1D1DB] max-w-xs truncate" title={tx.description}>
                          {tx.description}
                        </td>
                        <td
                          className={`py-3 px-4 text-right font-mono font-bold ${
                            isCredit ? 'text-emerald-400' : 'text-red-400'
                          }`}
                        >
                          {isCredit ? '+' : '-'}
                          {tx.credits.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-white font-semibold">
                          {tx.balanceAfter.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => setSelectedTransaction(tx)}
                            className="p-1.5 text-[#9E9E9E] hover:text-[#7B35E8] rounded-lg hover:bg-[#1A1A2E] transition-colors"
                            title="View Transaction Details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex flex-col sm:flex-row items-center justify-between px-6 py-4 border-t border-[#232336] bg-[#0E0E17] gap-3">
            <span className="text-xs text-[#9E9E9E]">
              Showing {(page - 1) * limit + 1}–{Math.min(page * limit, totalTransactions)} of{' '}
              {totalTransactions} ledger records
            </span>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="p-1.5 bg-[#1A1A2E] hover:bg-[#232336] disabled:opacity-40 text-white rounded-lg border border-[#2A2A40]"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs text-white px-2">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="p-1.5 bg-[#1A1A2E] hover:bg-[#232336] disabled:opacity-40 text-white rounded-lg border border-[#2A2A40]"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Buy Credits Modal */}
      <BuyCreditsModal
        isOpen={isBuyModalOpen}
        onClose={() => setIsBuyModalOpen(false)}
        defaultChannel={selectedBuyChannel}
        onPurchaseSuccess={() => {
          fetchWallets();
          fetchTransactions();
        }}
      />

      {/* Transaction Details Modal */}
      <TransactionDetailModal
        isOpen={Boolean(selectedTransaction)}
        onClose={() => setSelectedTransaction(null)}
        transaction={selectedTransaction}
      />
    </div>
  );
};

