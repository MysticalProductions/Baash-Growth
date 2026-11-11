import React, { useState, useEffect } from 'react';
import {
  Megaphone,
  Smartphone,
  MessageSquare,
  Mail,
  RefreshCw,
  TrendingUp,
  Send,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Building,
} from 'lucide-react';
import api from '../../services/api';
import { WalletChannel } from '../../types/wallet';

export const AdminCampaignsPage: React.FC = () => {
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchReports = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/admin/campaign-reports');
      setReport(res.data || res);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load campaign reports');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const getChannelBadge = (ch: WalletChannel) => {
    switch (ch) {
      case 'SMS':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/10 text-emerald-400">
            <Smartphone size={11} /> SMS
          </span>
        );
      case 'WHATSAPP':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-green-500/10 text-green-400">
            <MessageSquare size={11} /> WhatsApp
          </span>
        );
      case 'EMAIL':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-sky-500/10 text-sky-400">
            <Mail size={11} /> Email
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-white tracking-tight">Campaign Oversight & Analytics</h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-baash-purple/20 text-baash-purpleLight border border-baash-purple/30 font-semibold">
              Platform-Wide
            </span>
          </div>
          <p className="text-sm text-baash-textMuted mt-1">
            Global broadcast traffic, gateway deliverability health, and vendor communication volume.
          </p>
        </div>

        <button
          onClick={fetchReports}
          disabled={loading}
          className="p-2.5 bg-baash-darkBg hover:bg-baash-cardBorder border border-baash-cardBorder rounded-lg text-baash-textMuted hover:text-white transition-colors self-start sm:self-auto"
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
      {report?.summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-baash-darkBg border border-baash-cardBorder">
            <div className="flex items-center justify-between text-baash-textMuted mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Total Broadcasts</span>
              <Megaphone size={16} className="text-baash-purpleLight" />
            </div>
            <div className="text-2xl font-black text-white">{report.summary.totalCampaigns}</div>
            <p className="text-xs text-baash-textMuted mt-1">Across all registered vendors</p>
          </div>

          <div className="p-4 rounded-xl bg-baash-darkBg border border-baash-cardBorder">
            <div className="flex items-center justify-between text-baash-textMuted mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Messages Delivered</span>
              <Send size={16} className="text-cyan-400" />
            </div>
            <div className="text-2xl font-black text-white">
              {report.summary.totalDelivered.toLocaleString()}
            </div>
            <p className="text-xs text-baash-textMuted mt-1">
              Of {report.summary.totalSent.toLocaleString()} total dispatched
            </p>
          </div>

          <div className="p-4 rounded-xl bg-baash-darkBg border border-baash-cardBorder">
            <div className="flex items-center justify-between text-baash-textMuted mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Gateway Success Rate</span>
              <TrendingUp size={16} className="text-emerald-400" />
            </div>
            <div className="text-2xl font-black text-emerald-400">
              {report.summary.deliveryRatePercentage}%
            </div>
            <p className="text-xs text-baash-textMuted mt-1">Carrier delivery rate</p>
          </div>

          <div className="p-4 rounded-xl bg-baash-darkBg border border-baash-cardBorder">
            <div className="flex items-center justify-between text-baash-textMuted mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Total Credits Billed</span>
              <ShieldCheck size={16} className="text-baash-pink" />
            </div>
            <div className="text-2xl font-black text-white">
              {report.summary.totalConsumedCredits.toLocaleString()}
            </div>
            <p className="text-xs text-baash-textMuted mt-1">Wallet deductions captured</p>
          </div>
        </div>
      )}

      {/* Channel Breakdown */}
      {report?.channelBreakdown && (
        <div className="rounded-xl bg-baash-darkBg border border-baash-cardBorder overflow-hidden">
          <div className="p-5 border-b border-baash-cardBorder">
            <h2 className="text-base font-bold text-white">Performance by Communication Channel</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-baash-black/40 text-baash-textMuted text-xs uppercase tracking-wider border-b border-baash-cardBorder">
                <tr>
                  <th className="py-3 px-5">Channel</th>
                  <th className="py-3 px-5">Campaigns</th>
                  <th className="py-3 px-5">Sent</th>
                  <th className="py-3 px-5">Delivered</th>
                  <th className="py-3 px-5">Failed</th>
                  <th className="py-3 px-5">Credits Consumed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-baash-cardBorder/60">
                {report.channelBreakdown.map((cb: any) => (
                  <tr key={cb.channel} className="hover:bg-baash-cardBorder/20 transition-colors">
                    <td className="py-3.5 px-5 font-bold text-white flex items-center gap-2">
                      {getChannelBadge(cb.channel)}
                    </td>
                    <td className="py-3.5 px-5 font-bold text-zinc-300">{cb.campaignCount}</td>
                    <td className="py-3.5 px-5 text-white font-mono">{cb.sent.toLocaleString()}</td>
                    <td className="py-3.5 px-5 text-emerald-400 font-mono font-bold">
                      {cb.delivered.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-5 text-rose-400 font-mono">{cb.failed.toLocaleString()}</td>
                    <td className="py-3.5 px-5 text-baash-purpleLight font-bold">
                      {cb.creditsConsumed.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recent Platform Campaigns */}
      {report?.recentCampaigns && (
        <div className="rounded-xl bg-baash-darkBg border border-baash-cardBorder overflow-hidden">
          <div className="p-5 border-b border-baash-cardBorder">
            <h2 className="text-base font-bold text-white">Recent Global Broadcasts</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-baash-black/40 text-baash-textMuted uppercase tracking-wider border-b border-baash-cardBorder">
                <tr>
                  <th className="py-3 px-4">Vendor</th>
                  <th className="py-3 px-4">Campaign Name</th>
                  <th className="py-3 px-4">Channel</th>
                  <th className="py-3 px-4">Recipients</th>
                  <th className="py-3 px-4">Credits</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Dispatched At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-baash-cardBorder/60">
                {report.recentCampaigns.map((rc: any) => (
                  <tr key={rc.id} className="hover:bg-baash-cardBorder/20 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-white flex items-center gap-1.5">
                        <Building size={12} className="text-baash-textMuted" />
                        <span>{rc.vendor?.businessName || 'Vendor'}</span>
                      </div>
                      <div className="text-[10px] text-baash-textMuted">{rc.vendor?.businessEmail}</div>
                    </td>

                    <td className="py-3 px-4 font-semibold text-zinc-200">{rc.name}</td>

                    <td className="py-3 px-4">{getChannelBadge(rc.channel)}</td>

                    <td className="py-3 px-4">
                      <span className="font-bold text-white">{rc.sentCount}</span> /{' '}
                      <span className="text-baash-textMuted">{rc.eligibleRecipients}</span>
                    </td>

                    <td className="py-3 px-4 font-bold text-baash-purpleLight">{rc.consumedCredits}</td>

                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                          rc.status === 'COMPLETED'
                            ? 'bg-emerald-500/15 text-emerald-400'
                            : rc.status === 'FAILED'
                            ? 'bg-rose-500/15 text-rose-400'
                            : 'bg-zinc-800 text-zinc-400'
                        }`}
                      >
                        {rc.status}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-baash-textMuted">
                      {new Date(rc.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
