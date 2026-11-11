import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Megaphone,
  Plus,
  Search,
  Filter,
  RefreshCw,
  Smartphone,
  MessageSquare,
  Mail,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  Eye,
  ChevronRight,
  TrendingUp,
  Send,
  Ban,
  ShieldCheck,
} from 'lucide-react';
import api from '../../../services/api';
import { Campaign, CampaignStatus } from '../../../types/campaign';
import { WalletChannel } from '../../../types/wallet';

export const CampaignsListingPage: React.FC = () => {
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [channelFilter, setChannelFilter] = useState<WalletChannel | ''>('');
  const [statusFilter, setStatusFilter] = useState<CampaignStatus | ''>('');
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const fetchCampaigns = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const params: any = {};
      if (channelFilter) params.channel = channelFilter;
      if (statusFilter) params.status = statusFilter;
      if (search) params.search = search;

      const res = await api.get('/campaigns', { params });
      const campaignList = Array.isArray(res) ? res : (Array.isArray(res?.data) ? res.data : []);
      setCampaigns(campaignList);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load campaigns');
    } finally {
      setLoading(false);
    }
  }, [channelFilter, statusFilter, search]);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  const handleCancelCampaign = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to cancel campaign "${name}"? Reserved wallet credits will be immediately refunded.`)) {
      return;
    }
    try {
      setCancellingId(id);
      await api.post(`/campaigns/${id}/cancel`);
      await fetchCampaigns();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to cancel campaign');
    } finally {
      setCancellingId(null);
    }
  };

  // Aggregated Stats
  const totalDispatched = campaigns.reduce((acc, c) => acc + c.sentCount, 0);
  const totalDelivered = campaigns.reduce((acc, c) => acc + c.deliveredCount, 0);
  const totalCredits = campaigns.reduce((acc, c) => acc + c.consumedCredits, 0);
  const deliveryRate = totalDispatched > 0 ? Math.round((totalDelivered / totalDispatched) * 100) : 100;

  const getChannelBadge = (ch: WalletChannel) => {
    switch (ch) {
      case 'SMS':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Smartphone size={13} /> SMS
          </span>
        );
      case 'WHATSAPP':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-500/10 text-green-400 border border-green-500/20">
            <MessageSquare size={13} /> WhatsApp
          </span>
        );
      case 'EMAIL':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-sky-500/10 text-sky-400 border border-sky-500/20">
            <Mail size={13} /> Email
          </span>
        );
    }
  };

  const getStatusBadge = (status: CampaignStatus) => {
    switch (status) {
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 size={12} /> Completed
          </span>
        );
      case 'PROCESSING':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-bold bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
            <RefreshCw size={12} className="animate-spin" /> Dispatching
          </span>
        );
      case 'QUEUED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
            <Clock size={12} /> Queued
          </span>
        );
      case 'SCHEDULED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-bold bg-purple-500/15 text-baash-purpleLight border border-purple-500/30">
            <Clock size={12} /> Scheduled
          </span>
        );
      case 'PARTIALLY_COMPLETED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
            <AlertTriangle size={12} /> Partial
          </span>
        );
      case 'FAILED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30">
            <XCircle size={12} /> Failed
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-bold bg-zinc-800 text-zinc-400 border border-zinc-700">
            <Ban size={12} /> Cancelled
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-bold bg-zinc-800 text-zinc-400">
            Draft
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-white tracking-tight">Marketing Campaigns</h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-baash-purple/20 text-baash-purpleLight border border-baash-purple/30 font-semibold">
              Live Gateway Dispatch
            </span>
          </div>
          <p className="text-sm text-baash-textMuted mt-1">
            Broadcast personalized SMS, WhatsApp Business, and Email campaigns with automatic wallet reservation.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchCampaigns()}
            disabled={loading}
            className="p-2.5 bg-baash-darkBg hover:bg-baash-cardBorder border border-baash-cardBorder rounded-lg text-baash-textMuted hover:text-white transition-colors"
            title="Refresh list"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>

          <button
            onClick={() => navigate('/vendor/campaigns/create')}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-baash-purple to-baash-pink hover:opacity-90 rounded-lg text-white font-bold text-sm shadow-lg shadow-baash-purple/20 transition-all cursor-pointer"
          >
            <Plus size={16} />
            <span>Create Campaign</span>
          </button>
        </div>
      </div>

      {/* Metrics Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-baash-darkBg border border-baash-cardBorder">
          <div className="flex items-center justify-between text-baash-textMuted mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Campaigns</span>
            <Megaphone size={16} className="text-baash-purpleLight" />
          </div>
          <div className="text-2xl font-black text-white">{campaigns.length}</div>
          <p className="text-xs text-baash-textMuted mt-1">All multi-channel broadcasts</p>
        </div>

        <div className="p-4 rounded-xl bg-baash-darkBg border border-baash-cardBorder">
          <div className="flex items-center justify-between text-baash-textMuted mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Messages Dispatched</span>
            <Send size={16} className="text-cyan-400" />
          </div>
          <div className="text-2xl font-black text-white">{totalDispatched.toLocaleString()}</div>
          <p className="text-xs text-baash-textMuted mt-1">{totalDelivered.toLocaleString()} confirmed delivered</p>
        </div>

        <div className="p-4 rounded-xl bg-baash-darkBg border border-baash-cardBorder">
          <div className="flex items-center justify-between text-baash-textMuted mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Delivery Rate</span>
            <TrendingUp size={16} className="text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400">{deliveryRate}%</div>
          <p className="text-xs text-baash-textMuted mt-1">Provider confirmation</p>
        </div>

        <div className="p-4 rounded-xl bg-baash-darkBg border border-baash-cardBorder">
          <div className="flex items-center justify-between text-baash-textMuted mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Credits Captured</span>
            <ShieldCheck size={16} className="text-baash-pink" />
          </div>
          <div className="text-2xl font-black text-white">{totalCredits.toLocaleString()}</div>
          <p className="text-xs text-baash-textMuted mt-1">Deducted on successful send</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-xl bg-baash-darkBg border border-baash-cardBorder flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-baash-textMuted" />
          <input
            type="text"
            placeholder="Search campaigns by name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-baash-black border border-baash-cardBorder rounded-lg text-white text-sm focus:outline-none focus:border-baash-purple"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto">
          {/* Channel Filter */}
          <div className="flex items-center gap-1.5 bg-baash-black p-1 rounded-lg border border-baash-cardBorder">
            <button
              onClick={() => setChannelFilter('')}
              className={`px-3 py-1.5 rounded text-xs font-bold transition-colors ${
                channelFilter === '' ? 'bg-baash-cardBorder text-white' : 'text-baash-textMuted hover:text-white'
              }`}
            >
              All Channels
            </button>
            <button
              onClick={() => setChannelFilter('SMS')}
              className={`px-3 py-1.5 rounded text-xs font-bold transition-colors ${
                channelFilter === 'SMS' ? 'bg-emerald-500/20 text-emerald-400' : 'text-baash-textMuted hover:text-white'
              }`}
            >
              SMS
            </button>
            <button
              onClick={() => setChannelFilter('WHATSAPP')}
              className={`px-3 py-1.5 rounded text-xs font-bold transition-colors ${
                channelFilter === 'WHATSAPP' ? 'bg-green-500/20 text-green-400' : 'text-baash-textMuted hover:text-white'
              }`}
            >
              WhatsApp
            </button>
            <button
              onClick={() => setChannelFilter('EMAIL')}
              className={`px-3 py-1.5 rounded text-xs font-bold transition-colors ${
                channelFilter === 'EMAIL' ? 'bg-sky-500/20 text-sky-400' : 'text-baash-textMuted hover:text-white'
              }`}
            >
              Email
            </button>
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 bg-baash-black border border-baash-cardBorder rounded-lg text-baash-textMuted text-xs font-semibold focus:outline-none focus:border-baash-purple"
          >
            <option value="">All Statuses</option>
            <option value="COMPLETED">Completed</option>
            <option value="PROCESSING">Processing</option>
            <option value="QUEUED">Queued</option>
            <option value="SCHEDULED">Scheduled</option>
            <option value="FAILED">Failed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">
          {error}
        </div>
      )}

      {/* Campaigns Table */}
      <div className="rounded-xl bg-baash-darkBg border border-baash-cardBorder overflow-hidden">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-baash-textMuted">
            <RefreshCw size={28} className="animate-spin text-baash-purple mb-3" />
            <p className="text-sm">Loading campaigns...</p>
          </div>
        ) : campaigns.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center text-center px-4">
            <div className="w-16 h-16 rounded-full bg-baash-cardBorder/40 flex items-center justify-center text-baash-purpleLight mb-4">
              <Megaphone size={28} />
            </div>
            <h3 className="text-lg font-bold text-white mb-1">No campaigns found</h3>
            <p className="text-sm text-baash-textMuted max-w-sm mb-6">
              You haven't launched any broadcast campaigns yet. Reach out to your customers via SMS, WhatsApp, or Email.
            </p>
            <button
              onClick={() => navigate('/vendor/campaigns/create')}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-baash-purple to-baash-pink hover:opacity-90 rounded-lg text-white font-bold text-sm shadow-lg shadow-baash-purple/20 transition-all cursor-pointer"
            >
              <Plus size={16} /> Create Your First Campaign
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-baash-black/40 text-baash-textMuted text-xs uppercase tracking-wider border-b border-baash-cardBorder">
                <tr>
                  <th className="py-3.5 px-4 font-semibold">Campaign Name</th>
                  <th className="py-3.5 px-4 font-semibold">Channel</th>
                  <th className="py-3.5 px-4 font-semibold">Targeting</th>
                  <th className="py-3.5 px-4 font-semibold">Delivery Progress</th>
                  <th className="py-3.5 px-4 font-semibold">Credits</th>
                  <th className="py-3.5 px-4 font-semibold">Status</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-baash-cardBorder/60">
                {(Array.isArray(campaigns) ? campaigns : []).map((camp) => {
                  const sent = camp.sentCount;
                  const total = camp.eligibleRecipients;
                  const pct = total > 0 ? Math.min(100, Math.round((sent / total) * 100)) : 0;

                  return (
                    <tr key={camp.id} className="hover:bg-baash-cardBorder/20 transition-colors">
                      {/* Name & Date */}
                      <td className="py-4 px-4">
                        <div className="font-bold text-white hover:text-baash-purpleLight transition-colors cursor-pointer" onClick={() => navigate(`/vendor/campaigns/${camp.id}`)}>
                          {camp.name}
                        </div>
                        <div className="text-xs text-baash-textMuted mt-0.5">
                          {new Date(camp.createdAt).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </td>

                      {/* Channel */}
                      <td className="py-4 px-4">
                        {getChannelBadge(camp.channel)}
                      </td>

                      {/* Targeting */}
                      <td className="py-4 px-4">
                        <div className="text-xs font-semibold text-zinc-300">
                          {camp.audienceType === 'ALL_CUSTOMERS'
                            ? 'All Customers'
                            : camp.audienceType === 'SEGMENT'
                            ? `Segment: ${camp.segment?.name || 'Custom'}`
                            : camp.audienceType === 'TAGS'
                            ? 'Targeted Tags'
                            : 'Manual List'}
                        </div>
                        <div className="text-[11px] text-baash-textMuted">
                          {camp.eligibleRecipients} eligible ({camp.excludedRecipients} excluded)
                        </div>
                      </td>

                      {/* Delivery Progress */}
                      <td className="py-4 px-4 min-w-[160px]">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-zinc-300 font-medium">
                            {camp.sentCount} / {camp.eligibleRecipients} sent
                          </span>
                          <span className="text-baash-textMuted font-bold">{pct}%</span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-baash-black overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              camp.failedCount > 0 ? 'bg-amber-400' : 'bg-gradient-to-r from-baash-purple to-baash-pink'
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        {camp.deliveredCount > 0 && (
                          <div className="text-[11px] text-emerald-400/90 mt-1">
                            ✓ {camp.deliveredCount} confirmed delivered
                          </div>
                        )}
                      </td>

                      {/* Credits */}
                      <td className="py-4 px-4">
                        <div className="font-bold text-white">
                          {camp.consumedCredits} <span className="text-xs font-normal text-baash-textMuted">used</span>
                        </div>
                        {camp.releasedCredits > 0 && (
                          <div className="text-[11px] text-emerald-400">
                            +{camp.releasedCredits} refunded
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-4 px-4">
                        {getStatusBadge(camp.status)}
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {(camp.status === 'SCHEDULED' || camp.status === 'QUEUED') && (
                            <button
                              onClick={() => handleCancelCampaign(camp.id, camp.name)}
                              disabled={cancellingId === camp.id}
                              className="px-2.5 py-1 text-xs font-semibold text-rose-400 hover:bg-rose-500/10 rounded border border-rose-500/20 transition-colors"
                            >
                              {cancellingId === camp.id ? 'Cancelling...' : 'Cancel'}
                            </button>
                          )}

                          <button
                            onClick={() => navigate(`/vendor/campaigns/${camp.id}`)}
                            className="p-1.5 text-baash-textMuted hover:text-white hover:bg-baash-cardBorder rounded transition-colors"
                            title="View Campaign Details"
                          >
                            <Eye size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
