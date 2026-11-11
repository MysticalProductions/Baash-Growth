import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Building,
  Smartphone,
  MessageSquare,
  Mail,
  Receipt,
  Info,
  Calendar,
} from 'lucide-react';
import api from '../../services/api';
import { WalletChannel } from '../../types/wallet';

export const AdminReconciliationPage: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchReconciliation = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/admin/wallets/reconciliation');
      setData(res.data || res);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to run financial reconciliation');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReconciliation();
  }, []);

  const summary = data?.summary;
  const results = data?.results || [];

  const getChannelIcon = (ch: WalletChannel) => {
    switch (ch) {
      case 'SMS':
        return <Smartphone size={14} className="text-emerald-400" />;
      case 'WHATSAPP':
        return <MessageSquare size={14} className="text-green-400" />;
      case 'EMAIL':
        return <Mail size={14} className="text-sky-400" />;
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-white tracking-tight">Financial & Wallet Reconciliation</h1>
            <span
              className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${
                summary?.discrepanciesCount === 0
                  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                  : 'bg-rose-500/15 text-rose-400 border-rose-500/30'
              }`}
            >
              {summary?.discrepanciesCount === 0 ? 'All Wallets Balanced' : 'Discrepancy Detected'}
            </span>
          </div>
          <p className="text-sm text-baash-textMuted mt-1">
            Real-time audit comparing database wallet balances against immutable double-entry ledger transactions and unsettled campaign reservations.
          </p>
        </div>

        <button
          onClick={fetchReconciliation}
          disabled={loading}
          className="p-2.5 bg-baash-darkBg hover:bg-baash-cardBorder border border-baash-cardBorder rounded-lg text-baash-textMuted hover:text-white transition-colors self-start sm:self-auto cursor-pointer"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">
          {error}
        </div>
      )}

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-baash-darkBg border border-baash-cardBorder">
            <div className="text-xs font-semibold uppercase text-baash-textMuted mb-1">Wallets Audited</div>
            <div className="text-2xl font-black text-white">{summary.totalWalletsAudited}</div>
            <p className="text-xs text-baash-textMuted mt-1">Across all registered tenants</p>
          </div>

          <div className="p-4 rounded-xl bg-baash-darkBg border border-baash-cardBorder">
            <div className="text-xs font-semibold uppercase text-emerald-400 mb-1">Consistent Wallets</div>
            <div className="text-2xl font-black text-emerald-400">{summary.consistentWalletsCount}</div>
            <p className="text-xs text-emerald-500/80 mt-1">Zero ledger discrepancy</p>
          </div>

          <div className="p-4 rounded-xl bg-baash-darkBg border border-baash-cardBorder">
            <div className="text-xs font-semibold uppercase text-rose-400 mb-1">Discrepancies Detected</div>
            <div className="text-2xl font-black text-white">{summary.discrepanciesCount}</div>
            <p className="text-xs text-baash-textMuted mt-1">Requires manual investigation</p>
          </div>

          <div className="p-4 rounded-xl bg-baash-darkBg border border-baash-cardBorder">
            <div className="text-xs font-semibold uppercase text-baash-purpleLight mb-1">Net Accounting Variance</div>
            <div className="text-2xl font-black text-baash-purpleLight">
              {summary.netDiscrepancy === 0 ? '0 Credits (Balanced)' : `${summary.netDiscrepancy} Credits`}
            </div>
            <p className="text-xs text-baash-textMuted mt-1">Stored vs. Ledger-derived</p>
          </div>
        </div>
      )}

      {/* Audit Methodology Notice */}
      <div className="p-4 rounded-xl bg-baash-black border border-baash-cardBorder flex items-start gap-3">
        <Info size={18} className="text-baash-purpleLight shrink-0 mt-0.5" />
        <div className="text-xs text-baash-textMuted space-y-1">
          <span className="font-semibold text-white">Reconciliation Rules:</span>
          <p>
            1. Every credit purchase or refund must match sum of CREDIT transactions. <br />
            2. Every campaign capture must match sum of DEBIT transactions. <br />
            3. Reserved balance must exactly equal the sum of uncompleted campaigns in QUEUED, PROCESSING, or SCHEDULED status.
          </p>
        </div>
      </div>

      {/* Reconciliation Results Table */}
      <div className="rounded-xl bg-baash-darkBg border border-baash-cardBorder overflow-hidden">
        <div className="p-5 border-b border-baash-cardBorder">
          <h2 className="text-base font-bold text-white">Tenant Wallet Balance Reconciliation</h2>
        </div>

        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-baash-textMuted">
            <RefreshCw size={24} className="animate-spin text-baash-purple mb-2" />
            <p className="text-xs">Reconciling ledger entries...</p>
          </div>
        ) : results.length === 0 ? (
          <div className="py-16 text-center text-xs text-baash-textMuted">
            No wallets found to reconcile.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-baash-black/40 text-baash-textMuted uppercase font-semibold border-b border-baash-cardBorder">
                <tr>
                  <th className="py-3 px-4">Vendor & Channel</th>
                  <th className="py-3 px-4">Stored Available</th>
                  <th className="py-3 px-4">Ledger Derived</th>
                  <th className="py-3 px-4">Stored Reserved</th>
                  <th className="py-3 px-4">Active Campaigns</th>
                  <th className="py-3 px-4">Variance</th>
                  <th className="py-3 px-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-baash-cardBorder/60">
                {results.map((row: any) => (
                  <tr key={row.walletId} className="hover:bg-baash-cardBorder/20 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-white flex items-center gap-1.5">
                        <Building size={12} className="text-baash-textMuted" />
                        <span>{row.vendorName}</span>
                      </div>
                      <div className="text-[11px] text-baash-textMuted flex items-center gap-1 mt-0.5">
                        {getChannelIcon(row.channel)}
                        <span>{row.channel}</span>
                      </div>
                    </td>

                    <td className="py-3 px-4 font-mono font-bold text-white">
                      {row.balances.storedAvailable.toLocaleString()}
                    </td>

                    <td className="py-3 px-4 font-mono text-zinc-300">
                      {row.ledger.ledgerDerivedAvailable.toLocaleString()}
                      <span className="text-[10px] text-baash-textMuted block">
                        ({row.ledger.transactionCount} txs)
                      </span>
                    </td>

                    <td className="py-3 px-4 font-mono text-amber-400">
                      {row.balances.storedReserved.toLocaleString()}
                    </td>

                    <td className="py-3 px-4 text-zinc-300">
                      {row.activeReservations.totalReservedByCampaigns.toLocaleString()}
                      <span className="text-[10px] text-baash-textMuted block">
                        ({row.activeReservations.unsettledCampaignCount} active campaigns)
                      </span>
                    </td>

                    <td className="py-3 px-4 font-mono font-bold">
                      {row.reconciliation.availableDiscrepancy === 0 ? (
                        <span className="text-emerald-400">0</span>
                      ) : (
                        <span className="text-rose-400">
                          {row.reconciliation.availableDiscrepancy > 0 ? '+' : ''}
                          {row.reconciliation.availableDiscrepancy}
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-right">
                      {row.reconciliation.isConsistent ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                          <CheckCircle2 size={11} /> Balanced
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30">
                          <AlertTriangle size={11} /> Discrepancy
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
