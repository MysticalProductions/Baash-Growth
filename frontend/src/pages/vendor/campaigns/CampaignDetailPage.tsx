import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  RefreshCw,
  Download,
  Smartphone,
  MessageSquare,
  Mail,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  Eye,
  Search,
  Filter,
  Send,
  ShieldCheck,
  Ban,
  FileText,
  User,
} from 'lucide-react';
import api from '../../../services/api';
import { Campaign, CampaignRecipient, RecipientStatus } from '../../../types/campaign';
import { WalletChannel } from '../../../types/wallet';

export const CampaignDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [recipients, setRecipients] = useState<CampaignRecipient[]>([]);
  const [loading, setLoading] = useState(true);
  const [recipientsLoading, setRecipientsLoading] = useState(false);
  const [error, setError] = useState('');
  const [recipientStatus, setRecipientStatus] = useState<RecipientStatus | ''>('');
  const [recipientSearch, setRecipientSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [exporting, setExporting] = useState(false);

  const fetchCampaign = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError('');
      const res = await api.get(`/campaigns/${id}`);
      setCampaign(res.data || res);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load campaign');
    } finally {
      setLoading(false);
    }
  }, [id]);

  const fetchRecipients = useCallback(async () => {
    if (!id) return;
    try {
      setRecipientsLoading(true);
      const params: any = { page, limit: 20 };
      if (recipientStatus) params.status = recipientStatus;
      if (recipientSearch) params.search = recipientSearch;

      const res = await api.get(`/campaigns/${id}/recipients`, { params });
      const data = res.data || res;
      setRecipients(data.data || []);
      setTotalPages(data.meta?.totalPages || 1);
    } catch (err: any) {
      console.error('Failed to load recipients', err);
    } finally {
      setRecipientsLoading(false);
    }
  }, [id, page, recipientStatus, recipientSearch]);

  useEffect(() => {
    fetchCampaign();
  }, [fetchCampaign]);

  useEffect(() => {
    fetchRecipients();
  }, [fetchRecipients]);

  // Polling for live status when campaign is processing or queued
  useEffect(() => {
    if (campaign?.status === 'PROCESSING' || campaign?.status === 'QUEUED') {
      const interval = setInterval(() => {
        fetchCampaign();
        fetchRecipients();
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [campaign?.status, fetchCampaign, fetchRecipients]);

  const handleExportCsv = async () => {
    if (!id) return;
    try {
      setExporting(true);
      const res = await api.get(`/campaigns/${id}/export`, { responseType: 'blob' });
      const blob = new Blob([res], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `campaign-${campaign?.name || id}-recipients.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert('Failed to export CSV report');
    } finally {
      setExporting(false);
    }
  };

  const getChannelBadge = (ch: WalletChannel) => {
    switch (ch) {
      case 'SMS':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Smartphone size={13} /> SMS (MSG91)
          </span>
        );
      case 'WHATSAPP':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-green-500/10 text-green-400 border border-green-500/20">
            <MessageSquare size={13} /> WhatsApp Business Cloud
          </span>
        );
      case 'EMAIL':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-sky-500/10 text-sky-400 border border-sky-500/20">
            <Mail size={13} /> Amazon SES
          </span>
        );
    }
  };

  const getRecipientBadge = (status: RecipientStatus) => {
    switch (status) {
      case 'DELIVERED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-500/15 text-emerald-400">
            <CheckCircle2 size={11} /> Delivered
          </span>
        );
      case 'READ':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-cyan-500/15 text-cyan-400">
            <Eye size={11} /> Read
          </span>
        );
      case 'SUBMITTED':
      case 'ACCEPTED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-amber-500/15 text-amber-400">
            <Clock size={11} /> Sent / Queued
          </span>
        );
      case 'FAILED':
      case 'UNDELIVERED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-rose-500/15 text-rose-400">
            <XCircle size={11} /> Failed
          </span>
        );
      case 'EXCLUDED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-zinc-800 text-zinc-400">
            <Ban size={11} /> Excluded
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-zinc-800 text-zinc-400">
            Pending
          </span>
        );
    }
  };

  if (loading && !campaign) {
    return (
      <div className="py-24 flex flex-col items-center justify-center text-baash-textMuted">
        <RefreshCw size={28} className="animate-spin text-baash-purple mb-2" />
        <p className="text-sm">Loading campaign details...</p>
      </div>
    );
  }

  if (error || !campaign) {
    return (
      <div className="p-8 text-center text-rose-400">
        <p>{error || 'Campaign not found'}</p>
        <button
          onClick={() => navigate('/vendor/campaigns')}
          className="mt-4 px-4 py-2 bg-baash-cardBorder rounded text-white text-xs font-bold"
        >
          Back to Campaigns
        </button>
      </div>
    );
  }

  const sent = campaign.sentCount;
  const total = campaign.eligibleRecipients;
  const deliveryPct = total > 0 ? Math.min(100, Math.round((sent / total) * 100)) : 0;

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/vendor/campaigns')}
            className="p-2 bg-baash-darkBg hover:bg-baash-cardBorder border border-baash-cardBorder rounded-lg text-baash-textMuted hover:text-white transition-colors"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-black text-white tracking-tight">{campaign.name}</h1>
              {getChannelBadge(campaign.channel)}
            </div>
            <div className="text-xs text-baash-textMuted mt-1">
              Created on{' '}
              {new Date(campaign.createdAt).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
              {campaign.completedAt && (
                <span>
                  {' '}
                  • Completed in{' '}
                  {Math.round(
                    (new Date(campaign.completedAt).getTime() - new Date(campaign.startedAt || campaign.createdAt).getTime()) /
                      1000,
                  )}{' '}
                  seconds
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              fetchCampaign();
              fetchRecipients();
            }}
            className="p-2.5 bg-baash-darkBg hover:bg-baash-cardBorder border border-baash-cardBorder rounded-lg text-baash-textMuted hover:text-white transition-colors"
            title="Refresh"
          >
            <RefreshCw size={16} />
          </button>

          <button
            onClick={handleExportCsv}
            disabled={exporting}
            className="flex items-center gap-2 px-4 py-2.5 bg-baash-darkBg hover:bg-baash-cardBorder border border-baash-cardBorder rounded-lg text-white font-bold text-sm transition-colors cursor-pointer"
          >
            <Download size={16} />
            <span>{exporting ? 'Exporting...' : 'Export Recipients CSV'}</span>
          </button>
        </div>
      </div>

      {/* Metrics Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        <div className="p-4 rounded-xl bg-baash-darkBg border border-baash-cardBorder">
          <span className="text-[11px] font-semibold uppercase text-baash-textMuted">Eligible Target</span>
          <div className="text-2xl font-black text-white mt-1">{campaign.eligibleRecipients}</div>
          <span className="text-[10px] text-zinc-500">{campaign.excludedRecipients} excluded</span>
        </div>

        <div className="p-4 rounded-xl bg-baash-darkBg border border-baash-cardBorder">
          <span className="text-[11px] font-semibold uppercase text-cyan-400">Dispatched</span>
          <div className="text-2xl font-black text-white mt-1">{campaign.sentCount}</div>
          <span className="text-[10px] text-cyan-400/80">{deliveryPct}% progress</span>
        </div>

        <div className="p-4 rounded-xl bg-baash-darkBg border border-baash-cardBorder">
          <span className="text-[11px] font-semibold uppercase text-emerald-400">Delivered</span>
          <div className="text-2xl font-black text-emerald-400 mt-1">{campaign.deliveredCount}</div>
          <span className="text-[10px] text-emerald-500/80">Confirmed DLR</span>
        </div>

        <div className="p-4 rounded-xl bg-baash-darkBg border border-baash-cardBorder">
          <span className="text-[11px] font-semibold uppercase text-baash-pink">Read / Opened</span>
          <div className="text-2xl font-black text-baash-pink mt-1">{campaign.readCount}</div>
          <span className="text-[10px] text-baash-textMuted">Read receipts</span>
        </div>

        <div className="p-4 rounded-xl bg-baash-darkBg border border-baash-cardBorder">
          <span className="text-[11px] font-semibold uppercase text-rose-400">Failed</span>
          <div className="text-2xl font-black text-rose-400 mt-1">{campaign.failedCount}</div>
          <span className="text-[10px] text-rose-400/80">Delivery errors</span>
        </div>

        <div className="p-4 rounded-xl bg-baash-darkBg border border-baash-cardBorder">
          <span className="text-[11px] font-semibold uppercase text-baash-purpleLight">Credits Used</span>
          <div className="text-2xl font-black text-baash-purpleLight mt-1">{campaign.consumedCredits}</div>
          <span className="text-[10px] text-emerald-400">
            {campaign.releasedCredits > 0 ? `+${campaign.releasedCredits} refunded` : 'Captured'}
          </span>
        </div>
      </div>

      {/* Message Content Preview Card */}
      <div className="p-5 bg-baash-darkBg border border-baash-cardBorder rounded-xl space-y-3">
        <div className="flex items-center justify-between text-xs font-semibold text-baash-textMuted">
          <span className="flex items-center gap-1.5 uppercase tracking-wider text-white">
            <FileText size={14} className="text-baash-purpleLight" /> Broadcast Content Preview
          </span>
          {campaign.subject && (
            <span className="text-baash-purpleLight font-semibold">Subject: {campaign.subject}</span>
          )}
        </div>
        <div className="p-4 bg-baash-black rounded-lg border border-baash-cardBorder/60 text-sm text-zinc-200 font-mono whitespace-pre-wrap">
          {campaign.content}
        </div>
      </div>

      {/* Recipients Table Section */}
      <div className="p-5 bg-baash-darkBg border border-baash-cardBorder rounded-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <span>Recipient Delivery Logs</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-baash-cardBorder text-baash-textMuted">
              {recipients.length} shown
            </span>
          </h2>

          <div className="flex items-center gap-3">
            {/* Search destination */}
            <div className="relative w-64">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-baash-textMuted" />
              <input
                type="text"
                placeholder="Search phone or email..."
                value={recipientSearch}
                onChange={(e) => {
                  setRecipientSearch(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-9 pr-3 py-1.5 bg-baash-black border border-baash-cardBorder rounded-lg text-white text-xs focus:outline-none focus:border-baash-purple"
              />
            </div>

            {/* Status filter */}
            <select
              value={recipientStatus}
              onChange={(e) => {
                setRecipientStatus(e.target.value as any);
                setPage(1);
              }}
              className="px-3 py-1.5 bg-baash-black border border-baash-cardBorder rounded-lg text-baash-textMuted text-xs focus:outline-none focus:border-baash-purple"
            >
              <option value="">All Statuses</option>
              <option value="DELIVERED">Delivered</option>
              <option value="SUBMITTED">Submitted</option>
              <option value="READ">Read</option>
              <option value="FAILED">Failed</option>
              <option value="EXCLUDED">Excluded</option>
            </select>
          </div>
        </div>

        {/* Recipients Table */}
        <div className="rounded-lg border border-baash-cardBorder overflow-hidden">
          {recipientsLoading ? (
            <div className="py-12 flex flex-col items-center justify-center text-baash-textMuted">
              <RefreshCw size={24} className="animate-spin text-baash-purple mb-2" />
              <p className="text-xs">Loading recipient logs...</p>
            </div>
          ) : recipients.length === 0 ? (
            <div className="py-12 text-center text-xs text-baash-textMuted">
              No recipients match the filter criteria.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-baash-black/40 text-baash-textMuted uppercase font-semibold border-b border-baash-cardBorder">
                  <tr>
                    <th className="py-3 px-4">Recipient</th>
                    <th className="py-3 px-4">Destination</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Credits</th>
                    <th className="py-3 px-4">Gateway Message ID</th>
                    <th className="py-3 px-4">Delivery Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-baash-cardBorder/60">
                  {recipients.map((r) => (
                    <tr key={r.id} className="hover:bg-baash-cardBorder/20 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-bold text-white flex items-center gap-1.5">
                          <User size={13} className="text-baash-textMuted" />
                          <span>{r.customer?.fullName || 'Target Recipient'}</span>
                        </div>
                        {r.customer?.city && (
                          <div className="text-[10px] text-baash-textMuted ml-4">{r.customer.city}</div>
                        )}
                      </td>

                      <td className="py-3 px-4 font-mono text-zinc-300">{r.destination}</td>

                      <td className="py-3 px-4">{getRecipientBadge(r.status)}</td>

                      <td className="py-3 px-4 font-bold text-white">{r.actualCredits}</td>

                      <td className="py-3 px-4 font-mono text-[11px] text-baash-textMuted">
                        {r.providerMessageId ? (
                          <span className="text-zinc-300">{r.providerMessageId}</span>
                        ) : (
                          <span className="text-zinc-600">—</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-[11px]">
                        {r.errorCode ? (
                          <span className="text-rose-400 font-semibold">
                            {r.errorCode}: {r.errorMessage}
                          </span>
                        ) : r.deliveredAt ? (
                          <span className="text-emerald-400">
                            Delivered at {new Date(r.deliveredAt).toLocaleTimeString()}
                          </span>
                        ) : r.submittedAt ? (
                          <span className="text-amber-400">
                            Sent at {new Date(r.submittedAt).toLocaleTimeString()}
                          </span>
                        ) : (
                          <span className="text-zinc-500">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-2 text-xs text-baash-textMuted">
            <span>
              Page {page} of {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="px-3 py-1 bg-baash-cardBorder/50 hover:bg-baash-cardBorder disabled:opacity-40 rounded"
              >
                Previous
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
                className="px-3 py-1 bg-baash-cardBorder/50 hover:bg-baash-cardBorder disabled:opacity-40 rounded"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
