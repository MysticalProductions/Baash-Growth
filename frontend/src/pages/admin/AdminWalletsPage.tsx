import React, { useState, useEffect, useCallback } from 'react';
import {
  Wallet,
  Search,
  RefreshCw,
  Plus,
  Minus,
  AlertTriangle,
  Receipt,
  TrendingUp,
  DollarSign,
  Smartphone,
  MessageSquare,
  Mail,
  X,
  CheckCircle2,
  SlidersHorizontal,
} from 'lucide-react';
import api from '../../services/api';
import { WalletChannel, WalletSummaryReports, TransactionDirection } from '../../types/wallet';

export const AdminWalletsPage: React.FC = () => {
  const [vendors, setVendors] = useState<any[]>([]);
  const [totalVendors, setTotalVendors] = useState(0);
  const [reports, setReports] = useState<WalletSummaryReports | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  // Manual Adjustment Modal State
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [selectedVendorForAdjust, setSelectedVendorForAdjust] = useState<any | null>(null);
  const [adjustChannel, setAdjustChannel] = useState<WalletChannel>('SMS');
  const [adjustQuantity, setAdjustQuantity] = useState<number>(500);
  const [adjustAction, setAdjustAction] = useState<TransactionDirection>('CREDIT');
  const [adjustReason, setAdjustReason] = useState('');
  const [adjusting, setAdjusting] = useState(false);
  const [adjustError, setAdjustError] = useState('');

  const fetchWalletsAndReports = useCallback(async () => {
    setLoading(true);
    try {
      const [walletsRes, reportsRes] = await Promise.all([
        api.get('/admin/wallets', { params: { search: search.trim() || undefined, page, limit } }),
        api.get('/admin/wallet-reports'),
      ]);
      const walletsData = walletsRes?.vendors ? walletsRes : (walletsRes?.data || walletsRes || {});
      const reportsData = reportsRes?.totalWallets !== undefined ? reportsRes : (reportsRes?.data || reportsRes || null);
      setVendors(walletsData.vendors || []);
      setTotalVendors(walletsData.total || 0);
      setReports(reportsData);
    } catch (err: any) {
      console.error('Failed to load admin wallets:', err);
    } finally {
      setLoading(false);
    }
  }, [search, page, limit]);

  useEffect(() => {
    fetchWalletsAndReports();
  }, [fetchWalletsAndReports]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchWalletsAndReports();
  };

  const openAdjustModal = (vendor: any, preferredChannel: WalletChannel = 'SMS') => {
    setSelectedVendorForAdjust(vendor);
    setAdjustChannel(preferredChannel);
    setAdjustQuantity(500);
    setAdjustAction('CREDIT');
    setAdjustReason('');
    setAdjustError('');
    setIsAdjustModalOpen(true);
  };

  const handleExecuteAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVendorForAdjust) return;
    if (!adjustReason.trim() || adjustReason.trim().length < 5) {
      setAdjustError('A descriptive mandatory reason (minimum 5 characters) is required');
      return;
    }
    if (adjustQuantity <= 0) {
      setAdjustError('Quantity must be greater than zero');
      return;
    }

    setAdjusting(true);
    setAdjustError('');

    try {
      await api.post('/admin/wallets/adjust', {
        vendorId: selectedVendorForAdjust.id,
        channel: adjustChannel,
        quantity: Number(adjustQuantity),
        action: adjustAction,
        reason: adjustReason.trim(),
      });

      setIsAdjustModalOpen(false);
      fetchWalletsAndReports();
    } catch (err: any) {
      setAdjustError(err.response?.data?.message || 'Adjustment failed');
    } finally {
      setAdjusting(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white tracking-tight">Wallet Management</h1>
            <span className="px-2.5 py-0.5 bg-[#7B35E8]/15 border border-[#7B35E8]/30 rounded-full text-xs font-semibold text-[#7B35E8]">
              Platform Authority
            </span>
          </div>
          <p className="text-xs text-[#9E9E9E] mt-1">
            Global communication balances, cross-tenant credit audits, and manual ledger adjustments
          </p>
        </div>

        <button
          onClick={fetchWalletsAndReports}
          className="p-2.5 rounded-xl bg-[#1A1A2E] border border-[#2A2A40] text-[#9E9E9E] hover:text-white transition-colors self-start sm:self-auto"
          title="Refresh statistics"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Summary KPI Cards */}
      {reports && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 bg-[#12121A] border border-[#232336] rounded-2xl">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#9E9E9E]">
              Total Credit Revenue
            </span>
            <p className="text-2xl font-black text-emerald-400 mt-2 font-mono">
              ₹{reports.summary.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
            <span className="text-[10px] text-[#9E9E9E] mt-1 block">
              Base: ₹{reports.summary.totalBaseRevenue.toFixed(2)} • GST: ₹
              {reports.summary.totalGstCollected.toFixed(2)}
            </span>
          </div>

          <div className="p-5 bg-[#12121A] border border-[#232336] rounded-2xl">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#9E9E9E]">
              Total Credits Sold
            </span>
            <p className="text-2xl font-black text-white mt-2 font-mono">
              {reports.summary.totalCreditsSold.toLocaleString()}
            </p>
            <span className="text-[10px] text-emerald-400 mt-1 block">
              Across {reports.summary.completedPurchasesCount} completed orders
            </span>
          </div>

          <div className="p-5 bg-[#12121A] border border-[#232336] rounded-2xl">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#9E9E9E]">
              WhatsApp Credit Sales
            </span>
            <p className="text-2xl font-black text-white mt-2 font-mono">
              {reports.channelBreakdown.WHATSAPP.creditsSold.toLocaleString()}
            </p>
            <span className="text-[10px] text-emerald-400 mt-1 block">
              ₹{reports.channelBreakdown.WHATSAPP.revenue.toFixed(2)} revenue
            </span>
          </div>

          <div className="p-5 bg-[#12121A] border border-[#232336] rounded-2xl">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#9E9E9E]">
              SMS / Email Sales
            </span>
            <div className="mt-2 flex items-baseline gap-2 font-mono font-bold text-white text-lg">
              <span>{reports.channelBreakdown.SMS.creditsSold.toLocaleString()}</span>
              <span className="text-xs text-[#9E9E9E]">SMS</span>
              <span className="text-[#383854]">/</span>
              <span>{reports.channelBreakdown.EMAIL.creditsSold.toLocaleString()}</span>
              <span className="text-xs text-[#9E9E9E]">Email</span>
            </div>
            <span className="text-[10px] text-[#9E9E9E] mt-1 block">
              ₹{(reports.channelBreakdown.SMS.revenue + reports.channelBreakdown.EMAIL.revenue).toFixed(2)} total
            </span>
          </div>
        </div>
      )}

      {/* Vendor Wallets Table Section */}
      <div className="space-y-4">
        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="flex gap-2 max-w-md">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6E6E82]" />
            <input
              type="text"
              placeholder="Search vendor by business name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-[#12121A] border border-[#232336] rounded-xl text-white text-xs placeholder-[#6E6E82] focus:outline-none focus:border-[#7B35E8]"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-[#7B35E8] hover:bg-[#6824D3] text-white rounded-xl text-xs font-semibold"
          >
            Search
          </button>
        </form>

        <div className="bg-[#12121A] border border-[#232336] rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-[#161622] text-[#9E9E9E] border-b border-[#232336]">
                  <th className="py-3.5 px-4 uppercase font-semibold">Vendor Business</th>
                  <th className="py-3.5 px-4 uppercase font-semibold">Contact Email</th>
                  <th className="py-3.5 px-4 uppercase font-semibold text-right">SMS Balance</th>
                  <th className="py-3.5 px-4 uppercase font-semibold text-right">WhatsApp Balance</th>
                  <th className="py-3.5 px-4 uppercase font-semibold text-right">Email Balance</th>
                  <th className="py-3.5 px-4 uppercase font-semibold text-right">Total Available</th>
                  <th className="py-3.5 px-4 uppercase font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#232336] text-white">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-[#9E9E9E]">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <div className="w-6 h-6 border-2 border-[#7B35E8] border-t-transparent rounded-full animate-spin" />
                        <span>Loading vendor wallets...</span>
                      </div>
                    </td>
                  </tr>
                ) : vendors.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-16 text-center text-[#6E6E82]">
                      No vendor workspaces found.
                    </td>
                  </tr>
                ) : (
                  vendors.map((v) => (
                    <tr key={v.id} className="hover:bg-[#161622]/60 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-white">{v.businessName}</td>
                      <td className="py-3.5 px-4 text-[#D1D1DB]">{v.businessEmail}</td>
                      <td className="py-3.5 px-4 text-right font-mono text-blue-400 font-semibold">
                        {v.balances.sms.toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-emerald-400 font-semibold">
                        {v.balances.whatsApp.toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-purple-400 font-semibold">
                        {v.balances.email.toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-white font-extrabold text-sm">
                        {v.balances.total.toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => openAdjustModal(v, 'SMS')}
                          className="px-3 py-1.5 bg-[#7B35E8]/15 hover:bg-[#7B35E8]/25 text-[#7B35E8] border border-[#7B35E8]/30 rounded-lg text-xs font-semibold transition-colors"
                        >
                          Manual Adjustment
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* MANUAL CREDIT ADJUSTMENT MODAL */}
      {isAdjustModalOpen && selectedVendorForAdjust && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-md bg-[#12121A] border border-[#232336] rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#232336] pb-3">
              <div>
                <h3 className="text-base font-bold text-white">Manual Credit Adjustment</h3>
                <p className="text-xs text-[#9E9E9E] mt-0.5">
                  Target Vendor: <strong className="text-white">{selectedVendorForAdjust.businessName}</strong>
                </p>
              </div>
              <button
                onClick={() => setIsAdjustModalOpen(false)}
                className="text-[#9E9E9E] hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {adjustError && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs">
                {adjustError}
              </div>
            )}

            <form onSubmit={handleExecuteAdjustment} className="space-y-4 text-xs">
              {/* Channel */}
              <div>
                <label className="text-[#9E9E9E] block mb-1">Target Communication Channel</label>
                <select
                  value={adjustChannel}
                  onChange={(e) => setAdjustChannel(e.target.value as WalletChannel)}
                  className="w-full px-3 py-2 bg-[#1A1A2E] border border-[#2A2A40] rounded-xl text-white text-xs focus:outline-none focus:border-[#7B35E8]"
                >
                  <option value="SMS">SMS Wallet</option>
                  <option value="WHATSAPP">WhatsApp Wallet</option>
                  <option value="EMAIL">Email Wallet</option>
                </select>
              </div>

              {/* Action (Credit / Debit) */}
              <div>
                <label className="text-[#9E9E9E] block mb-1">Adjustment Action</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAdjustAction('CREDIT')}
                    className={`py-2 px-3 rounded-xl font-bold border transition-all flex items-center justify-center gap-1.5 ${
                      adjustAction === 'CREDIT'
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500'
                        : 'bg-[#1A1A2E] text-[#9E9E9E] border-[#2A2A40]'
                    }`}
                  >
                    <Plus className="w-3.5 h-3.5" /> Credit (+)
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustAction('DEBIT')}
                    className={`py-2 px-3 rounded-xl font-bold border transition-all flex items-center justify-center gap-1.5 ${
                      adjustAction === 'DEBIT'
                        ? 'bg-red-500/20 text-red-400 border-red-500'
                        : 'bg-[#1A1A2E] text-[#9E9E9E] border-[#2A2A40]'
                    }`}
                  >
                    <Minus className="w-3.5 h-3.5" /> Debit (-)
                  </button>
                </div>
              </div>

              {/* Quantity */}
              <div>
                <label className="text-[#9E9E9E] block mb-1">Quantity (Credits)</label>
                <input
                  type="number"
                  min={1}
                  value={adjustQuantity}
                  onChange={(e) => setAdjustQuantity(Number(e.target.value))}
                  required
                  className="w-full px-3 py-2 bg-[#1A1A2E] border border-[#2A2A40] rounded-xl text-white text-xs focus:outline-none focus:border-[#7B35E8]"
                />
              </div>

              {/* Mandatory Reason */}
              <div>
                <label className="text-[#9E9E9E] block mb-1">
                  Mandatory Adjustment Reason * (Audit Trail)
                </label>
                <textarea
                  rows={2}
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  placeholder="e.g. Complimentary test credits authorized by management"
                  required
                  className="w-full px-3 py-2 bg-[#1A1A2E] border border-[#2A2A40] rounded-xl text-white text-xs focus:outline-none focus:border-[#7B35E8]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#232336]">
                <button
                  type="button"
                  onClick={() => setIsAdjustModalOpen(false)}
                  className="px-4 py-2 bg-[#1A1A2E] hover:bg-[#232336] text-white rounded-xl text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={adjusting || !adjustReason.trim()}
                  className="px-5 py-2 bg-[#7B35E8] hover:bg-[#6824D3] disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-lg shadow-[#7B35E8]/20 transition-all"
                >
                  {adjusting ? 'Adjusting...' : 'Confirm Adjustment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

