import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  MessageSquare,
  Smartphone,
  Mail,
  CheckCircle2,
  XCircle,
  Clock,
  Calendar,
  Download,
  RefreshCw,
  Wallet,
  ArrowUpRight,
  ShieldCheck,
  Percent
} from 'lucide-react';
import api from '../../../services/api';

interface AnalyticsData {
  timeframe: string;
  summary: {
    totalCampaigns: number;
    totalSent: number;
    totalDelivered: number;
    totalFailed: number;
    avgDeliveryRate: number;
    totalCreditsUsed: number;
  };
  channelBreakdown: {
    SMS: { sent: number; delivered: number; failed: number; credits: number; deliveryRate: number };
    WHATSAPP: { sent: number; delivered: number; failed: number; credits: number; deliveryRate: number };
    EMAIL: { sent: number; delivered: number; failed: number; credits: number; deliveryRate: number };
  };
  recentPerformance: Array<{
    id: string;
    name: string;
    channel: 'SMS' | 'WHATSAPP' | 'EMAIL';
    status: string;
    totalRecipients: number;
    sentCount: number;
    deliveredCount: number;
    failedCount: number;
    creditsDeducted: number;
    createdAt: string;
    deliveryRate: number;
  }>;
  walletBalances: {
    SMS: { available: number; reserved: number };
    WHATSAPP: { available: number; reserved: number };
    EMAIL: { available: number; reserved: number };
  };
}

export const VendorAnalyticsPage: React.FC = () => {
  const [timeframe, setTimeframe] = useState<'today' | '7d' | '30d' | 'this_month'>('30d');
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAnalytics = async (tf = timeframe) => {
    try {
      setRefreshing(true);
      const res = await api.get('/vendor/analytics', { params: { timeframe: tf } });
      const analytics = res?.summary ? res : (res?.data?.summary ? res.data : (res?.data || res));
      setData(analytics);
    } catch (err) {
      console.error('Failed to load vendor analytics:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAnalytics(timeframe);
  }, [timeframe]);

  const handleExportCSV = () => {
    if (!data || !data.recentPerformance.length) return;
    const headers = ['Campaign ID', 'Name', 'Channel', 'Status', 'Recipients', 'Sent', 'Delivered', 'Failed', 'Delivery Rate (%)', 'Credits Used', 'Created At'];
    const rows = data.recentPerformance.map((c) => [
      c.id,
      `"${c.name.replace(/"/g, '""')}"`,
      c.channel,
      c.status,
      c.totalRecipients,
      c.sentCount,
      c.deliveredCount,
      c.failedCount,
      c.deliveryRate,
      c.creditsDeducted,
      new Date(c.createdAt).toISOString(),
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `baash_growth_analytics_${timeframe}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <div className="w-10 h-10 border-4 border-baash-cardBorder border-t-baash-purple rounded-full animate-spin"></div>
        <p className="mt-4 text-baash-textMuted text-sm font-medium">Aggregating campaign analytics...</p>
      </div>
    );
  }

  const summary = data?.summary || {
    totalCampaigns: 0,
    totalSent: 0,
    totalDelivered: 0,
    totalFailed: 0,
    avgDeliveryRate: 0,
    totalCreditsUsed: 0,
  };

  const channelBreakdown = data?.channelBreakdown || {
    SMS: { sent: 0, delivered: 0, failed: 0, credits: 0, deliveryRate: 0 },
    WHATSAPP: { sent: 0, delivered: 0, failed: 0, credits: 0, deliveryRate: 0 },
    EMAIL: { sent: 0, delivered: 0, failed: 0, credits: 0, deliveryRate: 0 },
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
            <span className="p-2 rounded-xl bg-baash-purple/20 text-baash-purpleLight border border-baash-purple/30">
              <BarChart3 className="w-6 h-6 text-baash-purpleLight" />
            </span>
            Campaign Performance & Analytics
          </h1>
          <p className="text-sm text-baash-textMuted mt-1">
            Real-time delivery confirmation, channel distribution, and credit consumption analytics.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Timeframe selector */}
          <div className="bg-baash-cardBg border border-baash-cardBorder rounded-xl p-1 flex items-center">
            {(['today', '7d', '30d', 'this_month'] as const).map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                  timeframe === tf
                    ? 'bg-baash-purple text-white shadow-sm'
                    : 'text-baash-textMuted hover:text-white'
                }`}
              >
                {tf === '7d' ? '7 Days' : tf === '30d' ? '30 Days' : tf.replace('_', ' ')}
              </button>
            ))}
          </div>

          <button
            onClick={() => fetchAnalytics()}
            disabled={refreshing}
            className="p-2.5 rounded-xl bg-baash-cardBg border border-baash-cardBorder hover:border-baash-purple text-baash-textMuted hover:text-white transition-all disabled:opacity-50"
            title="Refresh analytics"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-baash-cardBg border border-baash-cardBorder hover:border-baash-purple text-white text-xs font-semibold transition-all hover:scale-[1.02]"
          >
            <Download className="w-4 h-4 text-baash-purpleLight" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-baash-cardBg border border-baash-cardBorder relative overflow-hidden group hover:border-baash-purple/60 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-baash-textMuted uppercase tracking-wider">
              Total Dispatched
            </span>
            <div className="w-8 h-8 rounded-lg bg-baash-purple/20 border border-baash-purple/40 flex items-center justify-center text-baash-purpleLight">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-black text-white">{summary.totalSent.toLocaleString()}</span>
            <span className="text-xs text-baash-textMuted">messages</span>
          </div>
          <p className="mt-1 text-[11px] text-baash-textMuted">Across {summary.totalCampaigns} campaigns launched</p>
        </div>

        <div className="p-5 rounded-2xl bg-baash-cardBg border border-baash-cardBorder relative overflow-hidden group hover:border-emerald-500/60 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-baash-textMuted uppercase tracking-wider">
              Confirmed Delivered
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-black text-emerald-400">{summary.totalDelivered.toLocaleString()}</span>
            <span className="text-xs text-baash-textMuted">recipients</span>
          </div>
          <p className="mt-1 text-[11px] text-baash-textMuted">Verified via provider receipt webhooks</p>
        </div>

        <div className="p-5 rounded-2xl bg-baash-cardBg border border-baash-cardBorder relative overflow-hidden group hover:border-baash-pink/60 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-baash-textMuted uppercase tracking-wider">
              Average Delivery Rate
            </span>
            <div className="w-8 h-8 rounded-lg bg-baash-pink/20 border border-baash-pink/40 flex items-center justify-center text-baash-pink">
              <Percent className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-black text-white">{summary.avgDeliveryRate}%</span>
          </div>
          <p className="mt-1 text-[11px] text-baash-textMuted">
            {summary.totalFailed > 0 ? `${summary.totalFailed} bounced/undelivered` : 'Zero delivery failures'}
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-baash-cardBg border border-baash-cardBorder relative overflow-hidden group hover:border-baash-yellow/60 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-baash-textMuted uppercase tracking-wider">
              Credits Consumed
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-black text-white">{summary.totalCreditsUsed.toLocaleString()}</span>
            <span className="text-xs text-baash-textMuted">credits</span>
          </div>
          <p className="mt-1 text-[11px] text-baash-textMuted">Settled from communications wallets</p>
        </div>
      </div>

      {/* Channel Performance Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* SMS Card */}
        <div className="p-6 rounded-2xl bg-baash-cardBg border border-baash-cardBorder space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">SMS Gateway (MSG91)</h3>
                <span className="text-[10px] text-baash-textMuted">India DLT Compliant</span>
              </div>
            </div>
            <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
              {channelBreakdown.SMS.deliveryRate}% rate
            </span>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs text-baash-textMuted">
              <span>Delivery Health</span>
              <span className="text-white font-medium">{channelBreakdown.SMS.delivered} / {channelBreakdown.SMS.sent} sent</span>
            </div>
            <div className="w-full h-2 rounded-full bg-baash-darkBg overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-emerald-400 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, channelBreakdown.SMS.deliveryRate || 0)}%` }}
              ></div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-baash-cardBorder/60 text-center">
            <div>
              <p className="text-[10px] text-baash-textMuted">Sent</p>
              <p className="text-xs font-bold text-white mt-0.5">{channelBreakdown.SMS.sent}</p>
            </div>
            <div>
              <p className="text-[10px] text-baash-textMuted">Failed</p>
              <p className="text-xs font-bold text-red-400 mt-0.5">{channelBreakdown.SMS.failed}</p>
            </div>
            <div>
              <p className="text-[10px] text-baash-textMuted">Credits</p>
              <p className="text-xs font-bold text-baash-purpleLight mt-0.5">{channelBreakdown.SMS.credits}</p>
            </div>
          </div>
        </div>

        {/* WhatsApp Card */}
        <div className="p-6 rounded-2xl bg-baash-cardBg border border-baash-cardBorder space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">WhatsApp Business API</h3>
                <span className="text-[10px] text-baash-textMuted">Meta Cloud API</span>
              </div>
            </div>
            <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
              {channelBreakdown.WHATSAPP.deliveryRate}% rate
            </span>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs text-baash-textMuted">
              <span>Delivery Health</span>
              <span className="text-white font-medium">{channelBreakdown.WHATSAPP.delivered} / {channelBreakdown.WHATSAPP.sent} sent</span>
            </div>
            <div className="w-full h-2 rounded-full bg-baash-darkBg overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, channelBreakdown.WHATSAPP.deliveryRate || 0)}%` }}
              ></div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-baash-cardBorder/60 text-center">
            <div>
              <p className="text-[10px] text-baash-textMuted">Sent</p>
              <p className="text-xs font-bold text-white mt-0.5">{channelBreakdown.WHATSAPP.sent}</p>
            </div>
            <div>
              <p className="text-[10px] text-baash-textMuted">Failed</p>
              <p className="text-xs font-bold text-red-400 mt-0.5">{channelBreakdown.WHATSAPP.failed}</p>
            </div>
            <div>
              <p className="text-[10px] text-baash-textMuted">Credits</p>
              <p className="text-xs font-bold text-baash-purpleLight mt-0.5">{channelBreakdown.WHATSAPP.credits}</p>
            </div>
          </div>
        </div>

        {/* Email Card */}
        <div className="p-6 rounded-2xl bg-baash-cardBg border border-baash-cardBorder space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Amazon SES Email</h3>
                <span className="text-[10px] text-baash-textMuted">DKIM & SPF Verified</span>
              </div>
            </div>
            <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
              {channelBreakdown.EMAIL.deliveryRate}% rate
            </span>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs text-baash-textMuted">
              <span>Delivery Health</span>
              <span className="text-white font-medium">{channelBreakdown.EMAIL.delivered} / {channelBreakdown.EMAIL.sent} sent</span>
            </div>
            <div className="w-full h-2 rounded-full bg-baash-darkBg overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, channelBreakdown.EMAIL.deliveryRate || 0)}%` }}
              ></div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-baash-cardBorder/60 text-center">
            <div>
              <p className="text-[10px] text-baash-textMuted">Sent</p>
              <p className="text-xs font-bold text-white mt-0.5">{channelBreakdown.EMAIL.sent}</p>
            </div>
            <div>
              <p className="text-[10px] text-baash-textMuted">Failed</p>
              <p className="text-xs font-bold text-red-400 mt-0.5">{channelBreakdown.EMAIL.failed}</p>
            </div>
            <div>
              <p className="text-[10px] text-baash-textMuted">Credits</p>
              <p className="text-xs font-bold text-baash-purpleLight mt-0.5">{channelBreakdown.EMAIL.credits}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Wallet Balance Status Section */}
      {data?.walletBalances && (
        <div className="p-6 rounded-2xl bg-baash-cardBg border border-baash-cardBorder">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Wallet className="w-4 h-4 text-baash-purpleLight" /> Current Channel Balances
            </h2>
            <a
              href="/vendor/wallet"
              className="text-xs font-semibold text-baash-purpleLight hover:underline flex items-center gap-1"
            >
              Manage Wallets & Top-Up
              <ArrowUpRight className="w-3.5 h-3.5" />
            </a>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-baash-darkBg border border-baash-cardBorder/80">
              <div className="flex items-center justify-between text-xs text-baash-textMuted">
                <span className="flex items-center gap-1.5"><Smartphone className="w-3.5 h-3.5 text-blue-400" /> SMS Credits</span>
                {data.walletBalances.SMS.reserved > 0 && (
                  <span className="text-amber-400 text-[10px]">{data.walletBalances.SMS.reserved} reserved</span>
                )}
              </div>
              <p className="text-xl font-bold text-white mt-1">
                {data.walletBalances.SMS.available.toLocaleString()}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-baash-darkBg border border-baash-cardBorder/80">
              <div className="flex items-center justify-between text-xs text-baash-textMuted">
                <span className="flex items-center gap-1.5"><MessageSquare className="w-3.5 h-3.5 text-emerald-400" /> WhatsApp Credits</span>
                {data.walletBalances.WHATSAPP.reserved > 0 && (
                  <span className="text-amber-400 text-[10px]">{data.walletBalances.WHATSAPP.reserved} reserved</span>
                )}
              </div>
              <p className="text-xl font-bold text-white mt-1">
                {data.walletBalances.WHATSAPP.available.toLocaleString()}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-baash-darkBg border border-baash-cardBorder/80">
              <div className="flex items-center justify-between text-xs text-baash-textMuted">
                <span className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 text-purple-400" /> Email Credits</span>
                {data.walletBalances.EMAIL.reserved > 0 && (
                  <span className="text-amber-400 text-[10px]">{data.walletBalances.EMAIL.reserved} reserved</span>
                )}
              </div>
              <p className="text-xl font-bold text-white mt-1">
                {data.walletBalances.EMAIL.available.toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Recent Campaign Performance Table */}
      <div className="p-6 rounded-2xl bg-baash-cardBg border border-baash-cardBorder space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-400" /> Campaign Breakdown & Delivery Logs
          </h2>
          <span className="text-xs text-baash-textMuted">Showing {data?.recentPerformance.length || 0} campaigns</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-baash-cardBorder text-xs uppercase tracking-wider text-baash-textMuted">
                <th className="pb-3 font-semibold">Campaign</th>
                <th className="pb-3 font-semibold">Channel</th>
                <th className="pb-3 font-semibold">Status</th>
                <th className="pb-3 font-semibold text-center">Recipients</th>
                <th className="pb-3 font-semibold text-center">Delivered</th>
                <th className="pb-3 font-semibold text-center">Delivery Rate</th>
                <th className="pb-3 font-semibold text-right">Credits</th>
                <th className="pb-3 font-semibold text-right">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-baash-cardBorder/60">
              {data?.recentPerformance.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-baash-textMuted text-xs">
                    No campaigns launched during this selected timeframe.
                  </td>
                </tr>
              ) : (
                data?.recentPerformance.map((campaign) => (
                  <tr key={campaign.id} className="hover:bg-baash-darkBg/60 transition-colors">
                    <td className="py-3.5">
                      <a
                        href={`/vendor/campaigns/${campaign.id}`}
                        className="font-medium text-white hover:text-baash-purpleLight transition-colors"
                      >
                        {campaign.name}
                      </a>
                    </td>
                    <td className="py-3.5">
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-baash-darkBg border border-baash-cardBorder text-baash-textMuted">
                        {campaign.channel}
                      </span>
                    </td>
                    <td className="py-3.5">
                      <span
                        className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                          campaign.status === 'COMPLETED'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : campaign.status === 'PROCESSING'
                            ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                            : campaign.status === 'FAILED'
                            ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                            : 'bg-baash-cardBorder text-baash-textMuted'
                        }`}
                      >
                        {campaign.status}
                      </span>
                    </td>
                    <td className="py-3.5 text-center text-baash-textMuted font-mono text-xs">
                      {campaign.totalRecipients}
                    </td>
                    <td className="py-3.5 text-center text-emerald-400 font-mono text-xs font-semibold">
                      {campaign.deliveredCount}
                    </td>
                    <td className="py-3.5 text-center">
                      <span className="text-xs font-bold text-white">{campaign.deliveryRate}%</span>
                    </td>
                    <td className="py-3.5 text-right font-mono text-xs text-baash-purpleLight">
                      {campaign.creditsDeducted}
                    </td>
                    <td className="py-3.5 text-right text-xs text-baash-textMuted font-mono">
                      {new Date(campaign.createdAt).toLocaleDateString()}
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
export default VendorAnalyticsPage;
