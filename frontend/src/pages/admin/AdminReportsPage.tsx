import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  CircleDollarSign,
  Send,
  ShieldCheck,
  Building,
  RefreshCw,
  Calendar,
  Smartphone,
  MessageSquare,
  Mail,
  ArrowUpRight,
  Download,
} from 'lucide-react';
import api from '../../services/api';
import { WalletChannel } from '../../types/wallet';

export const AdminReportsPage: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchReports = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/admin/dashboard');
      setData(res.data || res);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load business reports');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const metrics = data?.metrics;
  const platform = metrics?.platform;
  const revenue = metrics?.revenue;
  const usage = metrics?.usage;
  const business = metrics?.businessPerformance;
  const topVendors = data?.topVendorsByUsage || [];

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-white tracking-tight">System Reports & Intelligence</h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-baash-purple/20 text-baash-purpleLight border border-baash-purple/30 font-semibold">
              Platform Analytics
            </span>
          </div>
          <p className="text-sm text-baash-textMuted mt-1">
            Financial revenue intelligence, gateway traffic performance, gross margins, and vendor communication usage.
          </p>
        </div>

        <button
          onClick={fetchReports}
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

      {/* Financial & Margin Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-xl bg-baash-darkBg border border-baash-cardBorder">
          <div className="flex items-center justify-between text-baash-textMuted mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Credit Sales Revenue</span>
            <CircleDollarSign size={18} className="text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-white">
            ₹{revenue?.totalRevenue ? revenue.totalRevenue.toLocaleString() : '0'}
          </div>
          <p className="text-xs text-baash-textMuted mt-1">
            {revenue?.successfulPurchasesCount || 0} successful packages purchased
          </p>
        </div>

        <div className="p-5 rounded-xl bg-baash-darkBg border border-baash-cardBorder">
          <div className="flex items-center justify-between text-baash-textMuted mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Estimated Gateway Cost</span>
            <TrendingUp size={18} className="text-amber-400" />
          </div>
          <div className="text-2xl font-black text-white">
            ₹{business?.estimatedProviderCost ? business.estimatedProviderCost.toLocaleString() : '0'}
          </div>
          <p className="text-xs text-baash-textMuted mt-1">Payable to MSG91, Meta & AWS</p>
        </div>

        <div className="p-5 rounded-xl bg-baash-darkBg border border-baash-cardBorder">
          <div className="flex items-center justify-between text-baash-textMuted mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Gross Communication Margin</span>
            <ShieldCheck size={18} className="text-baash-pink" />
          </div>
          <div className="text-2xl font-black text-emerald-400">
            ₹{business?.communicationGrossProfit ? business.communicationGrossProfit.toLocaleString() : '0'}
          </div>
          <p className="text-xs text-emerald-400/90 mt-1">
            {business?.grossMarginPercentage || 0}% estimated gross profit margin
          </p>
        </div>

        <div className="p-5 rounded-xl bg-baash-darkBg border border-baash-cardBorder">
          <div className="flex items-center justify-between text-baash-textMuted mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Confirmed Deliveries</span>
            <Send size={18} className="text-cyan-400" />
          </div>
          <div className="text-2xl font-black text-white">
            {usage?.totalDelivered ? usage.totalDelivered.toLocaleString() : '0'}
          </div>
          <p className="text-xs text-cyan-400/80 mt-1">
            {usage?.deliverySuccessRate || 100}% overall platform delivery rate
          </p>
        </div>
      </div>

      {/* Revenue Breakdown by Communication Channel */}
      <div className="rounded-xl bg-baash-darkBg border border-baash-cardBorder p-5 space-y-4">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <span>Channel Revenue & Package Sales</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* SMS Channel */}
          <div className="p-4 rounded-xl bg-baash-black border border-baash-cardBorder space-y-2">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 font-bold text-white text-sm">
                <Smartphone size={16} className="text-emerald-400" /> SMS Route
              </span>
              <span className="text-xs font-bold text-emerald-400">
                ₹{revenue?.revenueByChannel?.SMS?.revenue?.toLocaleString() || 0}
              </span>
            </div>
            <div className="text-xs text-baash-textMuted">
              Credits Sold: <span className="font-semibold text-white">{revenue?.revenueByChannel?.SMS?.credits?.toLocaleString() || 0}</span>
            </div>
          </div>

          {/* WhatsApp Channel */}
          <div className="p-4 rounded-xl bg-baash-black border border-baash-cardBorder space-y-2">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 font-bold text-white text-sm">
                <MessageSquare size={16} className="text-green-400" /> WhatsApp Route
              </span>
              <span className="text-xs font-bold text-green-400">
                ₹{revenue?.revenueByChannel?.WHATSAPP?.revenue?.toLocaleString() || 0}
              </span>
            </div>
            <div className="text-xs text-baash-textMuted">
              Credits Sold: <span className="font-semibold text-white">{revenue?.revenueByChannel?.WHATSAPP?.credits?.toLocaleString() || 0}</span>
            </div>
          </div>

          {/* Email Channel */}
          <div className="p-4 rounded-xl bg-baash-black border border-baash-cardBorder space-y-2">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 font-bold text-white text-sm">
                <Mail size={16} className="text-sky-400" /> Email Route
              </span>
              <span className="text-xs font-bold text-sky-400">
                ₹{revenue?.revenueByChannel?.EMAIL?.revenue?.toLocaleString() || 0}
              </span>
            </div>
            <div className="text-xs text-baash-textMuted">
              Credits Sold: <span className="font-semibold text-white">{revenue?.revenueByChannel?.EMAIL?.credits?.toLocaleString() || 0}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Top Vendors by Usage Table */}
      <div className="rounded-xl bg-baash-darkBg border border-baash-cardBorder overflow-hidden">
        <div className="p-5 border-b border-baash-cardBorder">
          <h2 className="text-base font-bold text-white">Top Business Vendors by Volume</h2>
          <p className="text-xs text-baash-textMuted mt-0.5">
            Credit consumption and active wallet balance across all channels.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-baash-black/40 text-baash-textMuted text-xs uppercase tracking-wider border-b border-baash-cardBorder">
              <tr>
                <th className="py-3 px-5">Vendor Workspace</th>
                <th className="py-3 px-5">Total Credits Consumed</th>
                <th className="py-3 px-5">Available Balance</th>
                <th className="py-3 px-5 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-baash-cardBorder/60">
              {topVendors.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-xs text-baash-textMuted">
                    No vendor usage recorded yet.
                  </td>
                </tr>
              ) : (
                topVendors.map((v: any) => (
                  <tr key={v.id} className="hover:bg-baash-cardBorder/20 transition-colors">
                    <td className="py-3.5 px-5 font-bold text-white flex items-center gap-2">
                      <Building size={14} className="text-baash-textMuted" />
                      <span>{v.businessName}</span>
                    </td>
                    <td className="py-3.5 px-5 text-baash-purpleLight font-bold">
                      {v.totalConsumed.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-5 text-white font-mono">
                      {v.availableCredits.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-5 text-right">
                      <span className="inline-block px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-500/15 text-emerald-400">
                        Active
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
