import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import {
  Users,
  Megaphone,
  Send,
  CheckCircle2,
  Wallet,
  MessageSquare,
  Mail,
  UserPlus,
  Settings,
  Sparkles,
  RefreshCw,
  Building,
  Layers,
  FileText,
  ShieldCheck,
  ArrowRight,
  TrendingUp,
  Plus,
  Radio,
  Clock,
  AlertCircle,
  Receipt,
  ExternalLink,
} from 'lucide-react';
import { WalletChannel } from '../../types/wallet';
import { BuyCreditsModal } from './wallet/BuyCreditsModal';

export const VendorOverviewPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [data, setData] = useState<any>(null);
  const [recentCampaigns, setRecentCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Buy Credits Modal state
  const [isBuyModalOpen, setIsBuyModalOpen] = useState(false);
  const [selectedBuyChannel, setSelectedBuyChannel] = useState<WalletChannel>('WHATSAPP');

  const fetchDashboard = useCallback(async () => {
    try {
      const [dashRes, campRes] = await Promise.all([
        api.get('/vendor/dashboard').catch(() => null),
        api.get('/campaigns', { params: { limit: 5 } }).catch(() => null),
      ]);

      if (dashRes) {
        const payload = dashRes?.crmMetrics ? dashRes : (dashRes?.data || {});
        setData(payload);
      }

      if (campRes) {
        const list = Array.isArray(campRes) ? campRes : (Array.isArray(campRes?.data) ? campRes.data : []);
        setRecentCampaigns(list);
      }
    } catch (err) {
      console.error('Failed to fetch vendor dashboard:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();

    const handleWalletUpdated = () => fetchDashboard();
    window.addEventListener('baash:wallet-updated', handleWalletUpdated);

    return () => {
      window.removeEventListener('baash:wallet-updated', handleWalletUpdated);
    };
  }, [fetchDashboard]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchDashboard();
  };

  const handleOpenBuyModal = (channel: WalletChannel) => {
    setSelectedBuyChannel(channel);
    setIsBuyModalOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-10 h-10 border-2 border-baash-cardBorder border-t-baash-purple rounded-full animate-spin"></div>
      </div>
    );
  }

  // Safe extractions from structured vendor dashboard
  const crm = data?.crmMetrics || {
    totalCustomers: 0,
    newCustomersThisMonth: 0,
    smsConsentCount: 0,
    whatsAppConsentCount: 0,
    emailConsentCount: 0,
    totalSegments: 0,
  };

  const wallets = data?.channelWallets || {
    smsCredits: { balance: 0, reserved: 0, totalPurchased: 0, totalConsumed: 0 },
    whatsAppCredits: { balance: 0, reserved: 0, totalPurchased: 0, totalConsumed: 0 },
    emailCredits: { balance: 0, reserved: 0, totalPurchased: 0, totalConsumed: 0 },
  };

  const campaignSummary = data?.campaignSummary || {
    totalCampaigns: 0,
    messagesSent: 0,
    messagesDelivered: 0,
    messagesFailed: 0,
    avgDeliveryRate: '100%',
  };

  // Opt-in percentages
  const totalCust = Math.max(1, crm.totalCustomers);
  const waOptInPct = Math.min(100, Math.round((crm.whatsAppConsentCount / totalCust) * 100));
  const smsOptInPct = Math.min(100, Math.round((crm.smsConsentCount / totalCust) * 100));
  const emailOptInPct = Math.min(100, Math.round((crm.emailConsentCount / totalCust) * 100));

  return (
    <div className="space-y-8">
      {/* Welcome Banner & Quick Action Header */}
      <div className="baash-card p-6 md:p-8 border border-baash-cardBorder relative overflow-hidden bg-baash-card-glow">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-baash-purple/20 text-baash-purpleLight font-semibold border border-baash-purple/30">
                Workspace Dashboard
              </span>
              <span className="text-xs text-baash-textMuted">· Tenant ID: {user?.vendorId?.substring(0, 8)}...</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight">
              Welcome back, {user?.fullName || 'Vendor'}
            </h2>
            <p className="text-sm text-baash-textMuted mt-1 max-w-xl">
              Managing <strong className="text-white">{data?.vendor?.businessName || user?.vendorName}</strong>. 
              Here is your multi-channel marketing performance, customer CRM and communication credits.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleRefresh}
              className="p-2.5 rounded-xl bg-baash-cardBg border border-baash-cardBorder text-baash-textMuted hover:text-white transition-colors cursor-pointer"
              title="Refresh statistics"
            >
              <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
            </button>

            <button
              onClick={() => handleOpenBuyModal('WHATSAPP')}
              className="px-4 py-2.5 rounded-xl bg-baash-cardBg hover:bg-baash-cardBorder border border-baash-cardBorder text-white text-sm font-semibold flex items-center gap-2 transition-all cursor-pointer"
            >
              <Wallet size={16} className="text-baash-purpleLight" />
              <span>Buy Credits</span>
            </button>

            <Link
              to="/vendor/campaigns/create"
              className="baash-btn-primary flex items-center gap-2 text-sm shadow-lg shadow-baash-purple/20"
            >
              <Plus size={16} />
              <span>Create Campaign</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Row 1: Marketing & CRM KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Total Customers */}
        <div className="baash-card p-5 border border-baash-cardBorder relative overflow-hidden group hover:border-baash-purple/40 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-baash-textMuted uppercase tracking-wider">Total Customers</span>
            <div className="w-8 h-8 rounded-lg bg-baash-purple/10 text-baash-purple flex items-center justify-center">
              <Users size={16} />
            </div>
          </div>
          <p className="text-3xl font-black text-white mt-3 font-mono">
            {crm.totalCustomers.toLocaleString()}
          </p>
          <div className="flex items-center gap-1 text-[11px] text-emerald-400 mt-2 font-medium">
            <TrendingUp size={12} />
            <span>+{crm.newCustomersThisMonth} added this month</span>
          </div>
        </div>

        {/* Dynamic Segments */}
        <div className="baash-card p-5 border border-baash-cardBorder relative overflow-hidden group hover:border-baash-pink/40 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-baash-textMuted uppercase tracking-wider">Dynamic Segments</span>
            <div className="w-8 h-8 rounded-lg bg-baash-pink/10 text-baash-pink flex items-center justify-center">
              <Layers size={16} />
            </div>
          </div>
          <p className="text-3xl font-black text-white mt-3 font-mono">
            {crm.totalSegments}
          </p>
          <Link
            to="/vendor/segments"
            className="text-[11px] text-baash-textMuted group-hover:text-baash-pink mt-2 block transition-colors"
          >
            Target specific filters →
          </Link>
        </div>

        {/* Delivered Messages */}
        <div className="baash-card p-5 border border-baash-cardBorder relative overflow-hidden group hover:border-emerald-500/40 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Delivered Messages</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <CheckCircle2 size={16} />
            </div>
          </div>
          <p className="text-3xl font-black text-emerald-400 mt-3 font-mono">
            {campaignSummary.messagesDelivered.toLocaleString()}
          </p>
          <p className="text-[11px] text-emerald-500/80 mt-2 font-medium">
            Avg delivery rate: {campaignSummary.avgDeliveryRate}
          </p>
        </div>

        {/* Total Campaigns */}
        <div className="baash-card p-5 border border-baash-cardBorder relative overflow-hidden group hover:border-blue-500/40 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-baash-textMuted uppercase tracking-wider">Total Broadcasts</span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <Megaphone size={16} />
            </div>
          </div>
          <p className="text-3xl font-black text-white mt-3 font-mono">
            {campaignSummary.totalCampaigns}
          </p>
          <Link
            to="/vendor/campaigns"
            className="text-[11px] text-baash-textMuted group-hover:text-blue-400 mt-2 block transition-colors"
          >
            {campaignSummary.messagesSent} total messages dispatched →
          </Link>
        </div>
      </div>

      {/* Row 2: Communication Credit Wallets */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Wallet size={18} className="text-baash-purple" />
            <h3 className="text-base font-bold text-white">Communication Credit Wallets</h3>
          </div>
          <Link
            to="/vendor/wallet"
            className="text-xs text-baash-purple hover:text-baash-purpleLight font-semibold flex items-center gap-1"
          >
            <span>Manage All Wallets & Invoices</span>
            <ArrowRight size={14} />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {/* WhatsApp Wallet Card */}
          <div className="baash-card p-5 border border-baash-cardBorder bg-[#12121A]/80 hover:border-emerald-500/40 transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
                  WhatsApp Wallet
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
                  Meta Cloud API
                </span>
              </div>

              <div className="mt-4">
                <span className="text-xs text-baash-textMuted">Available Credits</span>
                <p className="text-3xl font-black text-white mt-1 font-mono">
                  {wallets.whatsAppCredits?.balance?.toLocaleString() ?? 0}
                </p>
              </div>

              <div className="mt-3 pt-3 border-t border-baash-cardBorder/60 flex items-center justify-between text-xs text-baash-textMuted">
                <span>Reserved: <strong className="text-white font-mono">{wallets.whatsAppCredits?.reserved ?? 0}</strong></span>
                <span>Consumed: <strong className="text-white font-mono">{wallets.whatsAppCredits?.totalConsumed ?? 0}</strong></span>
              </div>
            </div>

            <button
              onClick={() => handleOpenBuyModal('WHATSAPP')}
              className="mt-4 w-full py-2 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Plus size={14} /> Top Up WhatsApp Credits
            </button>
          </div>

          {/* SMS Wallet Card */}
          <div className="baash-card p-5 border border-baash-cardBorder bg-[#12121A]/80 hover:border-blue-500/40 transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-400"></span>
                  SMS Wallet
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-semibold">
                  MSG91 DLT
                </span>
              </div>

              <div className="mt-4">
                <span className="text-xs text-baash-textMuted">Available Credits</span>
                <p className="text-3xl font-black text-white mt-1 font-mono">
                  {wallets.smsCredits?.balance?.toLocaleString() ?? 0}
                </p>
              </div>

              <div className="mt-3 pt-3 border-t border-baash-cardBorder/60 flex items-center justify-between text-xs text-baash-textMuted">
                <span>Reserved: <strong className="text-white font-mono">{wallets.smsCredits?.reserved ?? 0}</strong></span>
                <span>Consumed: <strong className="text-white font-mono">{wallets.smsCredits?.totalConsumed ?? 0}</strong></span>
              </div>
            </div>

            <button
              onClick={() => handleOpenBuyModal('SMS')}
              className="mt-4 w-full py-2 bg-blue-500/15 hover:bg-blue-500/25 text-blue-400 border border-blue-500/30 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Plus size={14} /> Top Up SMS Credits
            </button>
          </div>

          {/* Email Wallet Card */}
          <div className="baash-card p-5 border border-baash-cardBorder bg-[#12121A]/80 hover:border-sky-500/40 transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-sky-400"></span>
                  Email Wallet
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20 font-semibold">
                  Amazon SES
                </span>
              </div>

              <div className="mt-4">
                <span className="text-xs text-baash-textMuted">Available Credits</span>
                <p className="text-3xl font-black text-white mt-1 font-mono">
                  {wallets.emailCredits?.balance?.toLocaleString() ?? 0}
                </p>
              </div>

              <div className="mt-3 pt-3 border-t border-baash-cardBorder/60 flex items-center justify-between text-xs text-baash-textMuted">
                <span>Reserved: <strong className="text-white font-mono">{wallets.emailCredits?.reserved ?? 0}</strong></span>
                <span>Consumed: <strong className="text-white font-mono">{wallets.emailCredits?.totalConsumed ?? 0}</strong></span>
              </div>
            </div>

            <button
              onClick={() => handleOpenBuyModal('EMAIL')}
              className="mt-4 w-full py-2 bg-sky-500/15 hover:bg-sky-500/25 text-sky-400 border border-sky-500/30 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Plus size={14} /> Top Up Email Credits
            </button>
          </div>
        </div>
      </div>

      {/* Row 3: Audience Opt-in Consent Coverage & Suppression Safeguards */}
      <div className="baash-card p-6 border border-baash-cardBorder">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-5">
          <div className="flex items-center gap-2">
            <ShieldCheck size={18} className="text-emerald-400" />
            <h3 className="text-base font-bold text-white">Customer Marketing Consent & Channel Reach</h3>
          </div>
          <span className="text-xs text-baash-textMuted">TRAI DLT & Meta Privacy Screening Active</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* WhatsApp Consent */}
          <div className="p-4 bg-baash-black rounded-xl border border-baash-cardBorder space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-white flex items-center gap-2">
                <Send size={14} className="text-emerald-400" /> WhatsApp Opted-In
              </span>
              <span className="font-bold text-emerald-400">{waOptInPct}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-baash-cardBorder overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all"
                style={{ width: `${waOptInPct}%` }}
              ></div>
            </div>
            <p className="text-[11px] text-baash-textMuted">
              {crm.whatsAppConsentCount} of {crm.totalCustomers} customers opted in for WhatsApp messages.
            </p>
          </div>

          {/* SMS Consent */}
          <div className="p-4 bg-baash-black rounded-xl border border-baash-cardBorder space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-white flex items-center gap-2">
                <MessageSquare size={14} className="text-blue-400" /> SMS DLT Opted-In
              </span>
              <span className="font-bold text-blue-400">{smsOptInPct}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-baash-cardBorder overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all"
                style={{ width: `${smsOptInPct}%` }}
              ></div>
            </div>
            <p className="text-[11px] text-baash-textMuted">
              {crm.smsConsentCount} of {crm.totalCustomers} customers eligible for promotional & utility SMS.
            </p>
          </div>

          {/* Email Consent */}
          <div className="p-4 bg-baash-black rounded-xl border border-baash-cardBorder space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-white flex items-center gap-2">
                <Mail size={14} className="text-sky-400" /> Email Verified
              </span>
              <span className="font-bold text-sky-400">{emailOptInPct}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-baash-cardBorder overflow-hidden">
              <div
                className="h-full bg-sky-500 rounded-full transition-all"
                style={{ width: `${emailOptInPct}%` }}
              ></div>
            </div>
            <p className="text-[11px] text-baash-textMuted">
              {crm.emailConsentCount} of {crm.totalCustomers} customers with valid verified email address.
            </p>
          </div>
        </div>
      </div>

      {/* Row 4: Recent Campaigns Feed */}
      <div className="baash-card p-6 border border-baash-cardBorder">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Megaphone size={18} className="text-baash-purple" />
            <h3 className="text-base font-bold text-white">Recent Marketing Broadcasts</h3>
          </div>
          <Link
            to="/vendor/campaigns"
            className="text-xs text-baash-purple hover:text-baash-purpleLight font-semibold flex items-center gap-1"
          >
            <span>View All Campaigns</span>
            <ArrowRight size={14} />
          </Link>
        </div>

        {recentCampaigns.length === 0 ? (
          <div className="p-8 text-center border border-dashed border-baash-cardBorder rounded-xl space-y-3">
            <Megaphone size={32} className="mx-auto text-baash-textMuted" />
            <h4 className="text-sm font-bold text-white">No campaigns launched yet</h4>
            <p className="text-xs text-baash-textMuted max-w-sm mx-auto">
              Launch your first multi-channel campaign to reach your customers via WhatsApp, SMS, or Email.
            </p>
            <Link
              to="/vendor/campaigns/create"
              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-baash-purple to-baash-pink text-white rounded-lg text-xs font-bold shadow-md hover:opacity-90 transition-all"
            >
              <Plus size={14} /> Create Campaign
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-baash-cardBorder text-baash-textMuted uppercase font-semibold text-[11px]">
                  <th className="pb-3">Campaign</th>
                  <th className="pb-3">Channel</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3">Audience</th>
                  <th className="pb-3">Delivered</th>
                  <th className="pb-3">Date</th>
                  <th className="pb-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-baash-cardBorder/60">
                {recentCampaigns.map((camp: any) => {
                  let statusBadgeClass = 'bg-baash-cardBorder text-baash-textMuted';
                  if (camp.status === 'COMPLETED') statusBadgeClass = 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
                  else if (camp.status === 'QUEUED' || camp.status === 'SENDING') statusBadgeClass = 'bg-blue-500/10 text-blue-400 border border-blue-500/20 animate-pulse';
                  else if (camp.status === 'SCHEDULED') statusBadgeClass = 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
                  else if (camp.status === 'FAILED') statusBadgeClass = 'bg-rose-500/10 text-rose-400 border border-rose-500/20';

                  return (
                    <tr key={camp.id} className="hover:bg-baash-cardBg/40 transition-colors">
                      <td className="py-3 font-semibold text-white">
                        <Link to={`/vendor/campaigns/${camp.id}`} className="hover:text-baash-purple transition-colors">
                          {camp.name}
                        </Link>
                      </td>
                      <td className="py-3">
                        <span className="font-semibold text-white">
                          {camp.channel}
                        </span>
                      </td>
                      <td className="py-3">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${statusBadgeClass}`}>
                          {camp.status}
                        </span>
                      </td>
                      <td className="py-3 font-mono text-baash-textMuted">
                        {camp.eligibleRecipients || camp.totalRecipients || 0}
                      </td>
                      <td className="py-3 font-mono text-emerald-400 font-semibold">
                        {camp.deliveredCount || 0}
                      </td>
                      <td className="py-3 text-baash-textMuted">
                        {new Date(camp.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                      </td>
                      <td className="py-3 text-right">
                        <Link
                          to={`/vendor/campaigns/${camp.id}`}
                          className="text-xs font-semibold text-baash-purple hover:text-baash-purpleLight"
                        >
                          Details →
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Row 5: Quick Launchpad Shortcuts */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Link
          to="/vendor/customers"
          className="baash-card p-4 border border-baash-cardBorder hover:border-baash-purple/50 transition-all flex items-start gap-3 group"
        >
          <div className="p-2.5 rounded-xl bg-baash-purple/10 text-baash-purple group-hover:scale-110 transition-transform">
            <Users size={18} />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white group-hover:text-baash-purple transition-colors">
              Customer Directory
            </h4>
            <p className="text-[11px] text-baash-textMuted mt-0.5">
              Import CSV, manage customer tags & consents.
            </p>
          </div>
        </Link>

        <Link
          to="/vendor/segments"
          className="baash-card p-4 border border-baash-cardBorder hover:border-baash-pink/50 transition-all flex items-start gap-3 group"
        >
          <div className="p-2.5 rounded-xl bg-baash-pink/10 text-baash-pink group-hover:scale-110 transition-transform">
            <Layers size={18} />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white group-hover:text-baash-pink transition-colors">
              Audience Segments
            </h4>
            <p className="text-[11px] text-baash-textMuted mt-0.5">
              Filter VIPs, active channels & cities.
            </p>
          </div>
        </Link>

        <Link
          to="/vendor/templates"
          className="baash-card p-4 border border-baash-cardBorder hover:border-emerald-500/50 transition-all flex items-start gap-3 group"
        >
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 group-hover:scale-110 transition-transform">
            <FileText size={18} />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white group-hover:text-emerald-400 transition-colors">
              Message Templates
            </h4>
            <p className="text-[11px] text-baash-textMuted mt-0.5">
              Draft SMS templates, WhatsApp & HTML emails.
            </p>
          </div>
        </Link>

        <Link
          to="/vendor/transactions"
          className="baash-card p-4 border border-baash-cardBorder hover:border-amber-500/50 transition-all flex items-start gap-3 group"
        >
          <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 group-hover:scale-110 transition-transform">
            <Receipt size={18} />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white group-hover:text-amber-400 transition-colors">
              Ledger & Invoices
            </h4>
            <p className="text-[11px] text-baash-textMuted mt-0.5">
              View credit purchase orders & GST receipts.
            </p>
          </div>
        </Link>
      </div>

      {/* Buy Credits Modal */}
      <BuyCreditsModal
        isOpen={isBuyModalOpen}
        onClose={() => setIsBuyModalOpen(false)}
        defaultChannel={selectedBuyChannel}
        onPurchaseSuccess={() => {
          fetchDashboard();
          setIsBuyModalOpen(false);
        }}
      />
    </div>
  );
};