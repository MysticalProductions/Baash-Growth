import React, { useState, useEffect, useCallback } from 'react';
import {
  Receipt,
  Search,
  Filter,
  RefreshCw,
  Eye,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';
import api from '../../services/api';
import {
  WalletTransaction,
  WalletChannel,
  TransactionType,
  TransactionDirection,
} from '../../types/wallet';
import { TransactionDetailModal } from '../vendor/wallet/TransactionDetailModal';

export const AdminTransactionsPage: React.FC = () => {
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  // Filters
  const [channelFilter, setChannelFilter] = useState<WalletChannel | ''>('');
  const [typeFilter, setTypeFilter] = useState<TransactionType | ''>('');
  const [directionFilter, setDirectionFilter] = useState<TransactionDirection | ''>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);

  const [selectedTransaction, setSelectedTransaction] = useState<WalletTransaction | null>(null);

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
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

      const res = await api.get('/admin/transactions', { params });
      setTransactions(res.data.data || []);
      setTotal(res.data.total || 0);
    } catch (err: any) {
      console.error('Failed to load admin transactions:', err);
    } finally {
      setLoading(false);
    }
  }, [channelFilter, typeFilter, directionFilter, startDate, endDate, page, limit]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const handleResetFilters = () => {
    setChannelFilter('');
    setTypeFilter('');
    setDirectionFilter('');
    setStartDate('');
    setEndDate('');
    setPage(1);
  };

  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white tracking-tight">Platform Transaction Ledger</h1>
            <span className="px-2.5 py-0.5 bg-[#7B35E8]/15 border border-[#7B35E8]/30 rounded-full text-xs font-semibold text-[#7B35E8]">
              {total} Total Records
            </span>
          </div>
          <p className="text-xs text-[#9E9E9E] mt-1">
            Global double-entry audit history across all business workspaces
          </p>
        </div>

        <button
          onClick={fetchTransactions}
          className="p-2.5 rounded-xl bg-[#1A1A2E] border border-[#2A2A40] text-[#9E9E9E] hover:text-white transition-colors self-start sm:self-auto"
          title="Refresh"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Filters */}
      <div className="p-4 bg-[#12121A] border border-[#232336] rounded-2xl flex flex-wrap items-center gap-3 text-xs">
        <select
          value={channelFilter}
          onChange={(e) => {
            setChannelFilter(e.target.value as any);
            setPage(1);
          }}
          className="px-3 py-1.5 bg-[#1A1A2E] border border-[#2A2A40] rounded-xl text-white text-xs"
        >
          <option value="">All Channels</option>
          <option value="SMS">SMS</option>
          <option value="WHATSAPP">WhatsApp</option>
          <option value="EMAIL">Email</option>
        </select>

        <select
          value={typeFilter}
          onChange={(e) => {
            setTypeFilter(e.target.value as any);
            setPage(1);
          }}
          className="px-3 py-1.5 bg-[#1A1A2E] border border-[#2A2A40] rounded-xl text-white text-xs"
        >
          <option value="">All Types</option>
          <option value="PURCHASE">Purchase</option>
          <option value="ADMIN_ADJUSTMENT">Admin Adjustment</option>
          <option value="CAMPAIGN_RESERVATION">Campaign Reservation</option>
          <option value="CAMPAIGN_CAPTURE">Campaign Capture</option>
          <option value="REFUND">Refund</option>
        </select>

        <select
          value={directionFilter}
          onChange={(e) => {
            setDirectionFilter(e.target.value as any);
            setPage(1);
          }}
          className="px-3 py-1.5 bg-[#1A1A2E] border border-[#2A2A40] rounded-xl text-white text-xs"
        >
          <option value="">All Directions</option>
          <option value="CREDIT">Credits Added (+)</option>
          <option value="DEBIT">Credits Deducted (-)</option>
        </select>

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
            className="p-2 text-[#9E9E9E] hover:text-white bg-[#1A1A2E] rounded-xl border border-[#2A2A40]"
            title="Reset filters"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-[#12121A] border border-[#232336] rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-[#161622] text-[#9E9E9E] border-b border-[#232336]">
                <th className="py-3 px-4 uppercase font-semibold">Vendor Workspace</th>
                <th className="py-3 px-4 uppercase font-semibold">Timestamp</th>
                <th className="py-3 px-4 uppercase font-semibold">Channel</th>
                <th className="py-3 px-4 uppercase font-semibold">Type</th>
                <th className="py-3 px-4 uppercase font-semibold">Description</th>
                <th className="py-3 px-4 uppercase font-semibold text-right">Credits</th>
                <th className="py-3 px-4 uppercase font-semibold text-right">Balance After</th>
                <th className="py-3 px-4 uppercase font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#232336] text-white">
              {loading ? (
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
                    No transactions found.
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => {
                  const isCredit = tx.direction === 'CREDIT';
                  return (
                    <tr key={tx.id} className="hover:bg-[#161622]/60 transition-colors">
                      <td className="py-3 px-4">
                        <span className="font-bold text-white block">
                          {tx.vendor?.businessName || 'Unknown Vendor'}
                        </span>
                        <span className="text-[10px] text-[#9E9E9E]">
                          {tx.vendor?.businessEmail}
                        </span>
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
                      <td className="py-3 px-4 font-semibold text-white">
                        {tx.type.replace('_', ' ')}
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
                          title="View Details"
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
            Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total} records
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

      <TransactionDetailModal
        isOpen={Boolean(selectedTransaction)}
        onClose={() => setSelectedTransaction(null)}
        transaction={selectedTransaction}
      />
    </div>
  );
};

