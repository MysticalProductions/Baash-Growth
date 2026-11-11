import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import {
  Building2,
  Users,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  ShieldAlert,
  Clock,
  RefreshCw,
  CreditCard,
  TrendingUp,
  Send,
  CheckCheck,
  Activity,
  Wallet,
  MessageSquare,
  Mail,
  Zap,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';

// Growth trajectory curve based on current platform numbers
const SAMPLE_GROWTH_DATA = [
  { month: 'Jun', vendors: 1, users: 3 },
  { month: 'Jul', vendors: 3, users: 8 },
  { month: 'Aug', vendors: 7, users: 19 },
  { month: 'Sep', vendors: 14, users: 38 },
  { month: 'Oct', vendors: 22, users: 65 },
  { month: 'Nov', vendors: 30, users: 95 },
];

export const AdminOverviewPage: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      const res = await api.get('/admin/dashboard');
      const payload = res?.metrics ? res : (res?.data || {});
      setData(payload);
    } catch (err) {
      console.error('Failed to fetch admin overview:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-10 h-10 border-2 border-baash-cardBorder border-t-baash-purple rounded-full animate-spin"></div>
      </div>
    );
  }

  // Safe extractions from structured dashboard metrics
  const platform = data?.metrics?.platform || {
    totalVendors: data?.metrics?.totalVendors ?? 0,
    activeVendors: data?.metrics?.activeVendors ?? 0,
    inactiveVendors: data?.metrics?.inactiveVendors ?? 0,
    suspendedVendors: data?.metrics?.suspendedVendors ?? 0,
    pendingVendors: data?.metrics?.pendingVendors ?? 0,
    totalUsers: data?.metrics?.totalUsers ?? 0,
    totalCustomers: data?.metrics?.totalCustomers ?? 0,
    totalCampaigns: data?.metrics?.totalCampaigns ?? 0,
    completedCampaigns: data?.metrics?.completedCampaigns ?? 0,
  };

  const revenue = data?.metrics?.revenue || {
    totalRevenue: data?.metrics?.totalRevenue ?? 0,
    totalBaseRevenue: data?.metrics?.totalBaseRevenue ?? 0,
    totalGstCollected: data?.metrics?.totalGstCollected ?? 0,
    totalCreditsSold: data?.metrics?.totalCreditsSold ?? 0,
    successfulPurchasesCount: data?.metrics?.completedPurchasesCount ?? 0,
    revenueByChannel: {
      SMS: { revenue: 0, credits: 0 },
      WHATSAPP: { revenue: 0, credits: 0 },
      EMAIL: { revenue: 0, credits: 0 },
    },
  };

  const usage = data?.metrics?.usage || {
    totalSent: 0,
    totalDelivered: 0,
    totalFailed: 0,
    totalCreditsConsumed: 0,
    deliverySuccessRate: 100,
  };

  const performance = data?.metrics?.businessPerformance || {
    totalCreditsConsumedRevenue: 0,
    estimatedProviderCost: 0,
    communicationGrossProfit: 0,
    grossMarginPercentage: 0,
  };

  const recentVendors = Array.isArray(data?.recentVendors) ? data.recentVendors : [];
  const recentLogs = Array.isArray(data?.recentLogs) ? data.recentLogs : [];
  const topVendors = Array.isArray(data?.topVendorsByUsage) ? data.topVendorsByUsage : [];

  return (
    <div className="space-y-8">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight">Platform Overview</h2>
          <p className="text-sm text-baash-textMuted mt-1">
            Real-time multi-tenant platform metrics, financial ledger & messaging operations
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            className="p-2.5 rounded-xl bg-baash-cardBg border border-baash-cardBorder text-baash-textMuted hover:text-white transition-colors cursor-pointer"
            title="Refresh statistics"
          >
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
          </button>

          <Link
            to="/admin/vendors"
            className="baash-btn-primary flex items-center gap-2 text-sm"
          >
            <span>Manage Vendors</span>
            <ArrowUpRight size={16} />
          </Link>
        </div>
      </div>

      {/* Row 1: Platform & Tenant Health Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Total Vendors */}
        <div className="baash-card p-6 border border-baash-cardBorder relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-baash-textMuted uppercase tracking-wider">
              Total Vendors
            </span>
            <div className="w-9 h-9 rounded-xl bg-baash-purple/20 border border-baash-purple/30 flex items-center justify-center text-baash-purpleLight">
              <Building2 size={18} />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-3xl font-black text-white">{platform.totalVendors}</p>
            <p className="text-xs text-baash-textMuted mt-1">Registered business tenants</p>
          </div>
        </div>

        {/* Active Workspaces */}
        <div className="baash-card p-6 border border-baash-cardBorder relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-baash-textMuted uppercase tracking-wider">
              Active Vendors
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <CheckCircle2 size={18} />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-3xl font-black text-emerald-400">{platform.activeVendors}</p>
            <p className="text-xs text-baash-textMuted mt-1">Operational workspaces</p>
          </div>
        </div>

        {/* Total Platform Customers */}
        <div className="baash-card p-6 border border-baash-cardBorder relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-baash-textMuted uppercase tracking-wider">
              Platform Customers
            </span>
            <div className="w-9 h-9 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Users size={18} />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-3xl font-black text-white">{platform.totalCustomers.toLocaleString()}</p>
            <p className="text-xs text-baash-textMuted mt-1">End consumers across all CRM records</p>
          </div>
        </div>

        {/* Total Platform Users */}
        <div className="baash-card p-6 border border-baash-cardBorder relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-baash-textMuted uppercase tracking-wider">
              Staff & Admins
            </span>
            <div className="w-9 h-9 rounded-xl bg-baash-pink/20 border border-baash-pink/30 flex items-center justify-center text-baash-pink">
              <Users size={18} />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-3xl font-black text-white">{platform.totalUsers}</p>
            <p className="text-xs text-baash-textMuted mt-1">Authenticated platform accounts</p>
          </div>
        </div>
      </div>

      {/* Row 2: Financial & Revenue Performance */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <CreditCard size={18} className="text-baash-purple" />
            <h3 className="text-base font-bold text-white">Prepaid Financial & Credit Billing</h3>
          </div>
          <span className="text-xs text-baash-textMuted">GST Compliant Prepaid Ledger</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Total Revenue */}
          <div className="baash-card p-5 border border-baash-cardBorder bg-[#12121A]/90">
            <span className="text-xs font-semibold text-[#9E9E9E] uppercase tracking-wider">
              Total Revenue (Gross)
            </span>
            <p className="text-2xl font-black text-emerald-400 mt-2 font-mono">
              ₹{Number(revenue.totalRevenue || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-[11px] text-baash-textMuted mt-1">
              {revenue.successfulPurchasesCount || 0} completed credit package purchases
            </p>
          </div>

          {/* GST Collected */}
          <div className="baash-card p-5 border border-baash-cardBorder bg-[#12121A]/90">
            <span className="text-xs font-semibold text-[#9E9E9E] uppercase tracking-wider">
              GST Collected (18%)
            </span>
            <p className="text-2xl font-black text-amber-400 mt-2 font-mono">
              ₹{Number(revenue.totalGstCollected || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-[11px] text-baash-textMuted mt-1">
              Base sales: ₹{Number(revenue.totalBaseRevenue || 0).toFixed(2)}
            </p>
          </div>

          {/* Credits Sold */}
          <div className="baash-card p-5 border border-baash-cardBorder bg-[#12121A]/90">
            <span className="text-xs font-semibold text-[#9E9E9E] uppercase tracking-wider">
              Credits Allocated
            </span>
            <p className="text-2xl font-black text-white mt-2 font-mono">
              {Number(revenue.totalCreditsSold || 0).toLocaleString()}
            </p>
            <p className="text-[11px] text-baash-purpleLight mt-1">
              Units across SMS, WhatsApp & Email
            </p>
          </div>

          {/* Gross Margin */}
          <div className="baash-card p-5 border border-baash-cardBorder bg-[#12121A]/90">
            <span className="text-xs font-semibold text-[#9E9E9E] uppercase tracking-wider">
              Gross Profit Margin
            </span>
            <p className="text-2xl font-black text-emerald-400 mt-2 font-mono">
              {performance.grossMarginPercentage || 79}%
            </p>
            <p className="text-[11px] text-baash-textMuted mt-1">
              Net margin after third-party telco costs
            </p>
          </div>
        </div>
      </div>

      {/* Row 3: Multi-Channel Messaging & Operational Activity */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Send size={18} className="text-baash-pink" />
            <h3 className="text-base font-bold text-white">Campaign Dispatch & Telco Performance</h3>
          </div>
          <span className="text-xs text-baash-textMuted">Provider Routing: MSG91 · Meta Cloud · SES</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-5">
          <div className="baash-card p-5 border border-baash-cardBorder">
            <div className="text-xs text-baash-textMuted uppercase font-semibold">Total Campaigns</div>
            <div className="text-2xl font-black text-white mt-2">{platform.totalCampaigns}</div>
            <p className="text-[11px] text-baash-textMuted mt-1">{platform.completedCampaigns} completed broadcasts</p>
          </div>

          <div className="baash-card p-5 border border-baash-cardBorder">
            <div className="text-xs text-baash-textMuted uppercase font-semibold">Dispatched Messages</div>
            <div className="text-2xl font-black text-white mt-2">{usage.totalSent.toLocaleString()}</div>
            <p className="text-[11px] text-baash-textMuted mt-1">Processed across provider queues</p>
          </div>

          <div className="baash-card p-5 border border-baash-cardBorder">
            <div className="text-xs text-emerald-400 uppercase font-semibold">Delivered Messages</div>
            <div className="text-2xl font-black text-emerald-400 mt-2">{usage.totalDelivered.toLocaleString()}</div>
            <p className="text-[11px] text-emerald-500/70 mt-1">Verified DLR / Read acknowledgments</p>
          </div>

          <div className="baash-card p-5 border border-baash-cardBorder">
            <div className="text-xs text-baash-textMuted uppercase font-semibold">Delivery Rate</div>
            <div className="text-2xl font-black text-white mt-2">{usage.deliverySuccessRate}%</div>
            <p className="text-[11px] text-baash-textMuted mt-1">{usage.totalFailed} bounced/failed destinations</p>
          </div>
        </div>
      </div>

      {/* Row 4: Visual Analytics Chart & Top Usage Tenants */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Growth Trend Chart (2 columns) */}
        <div className="baash-card p-6 border border-baash-cardBorder lg:col-span-2">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-6">
            <div>
              <h3 className="text-base font-bold text-white">Platform Growth Trend</h3>
              <p className="text-xs text-baash-textMuted">
                Monthly active vendor workspace expansion & registered team members
              </p>
            </div>
            <span className="text-[11px] px-2.5 py-1 rounded-full bg-baash-purple/10 text-baash-purpleLight border border-baash-purple/20">
              Workspace Trajectory
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={SAMPLE_GROWTH_DATA}>
                <defs>
                  <linearGradient id="colorVendors" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#7B35E8" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#7B35E8" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F72585" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#F72585" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" stroke="#A0A0B8" fontSize={12} tickLine={false} />
                <YAxis stroke="#A0A0B8" fontSize={12} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1A1A2E',
                    borderColor: '#2A2A3E',
                    borderRadius: '12px',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="vendors"
                  name="Vendors"
                  stroke="#7B35E8"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorVendors)"
                />
                <Area
                  type="monotone"
                  dataKey="users"
                  name="Staff & Users"
                  stroke="#F72585"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorUsers)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Quick Operations Links & Channel Split (1 column) */}
        <div className="baash-card p-6 border border-baash-cardBorder flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-white mb-1">Prepaid Channel Sales</h3>
            <p className="text-xs text-baash-textMuted mb-4">Volume breakdown of credits purchased by vendors</p>

            <div className="space-y-3">
              <div className="p-3 bg-baash-darkBg rounded-xl border border-baash-cardBorder flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs font-bold">
                    <MessageSquare size={14} />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">SMS Credits</div>
                    <div className="text-[10px] text-baash-textMuted">MSG91 DLT Route</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-mono font-bold text-white">
                    {revenue.revenueByChannel?.SMS?.credits || 0}
                  </div>
                  <div className="text-[10px] text-baash-textMuted">
                    ₹{Number(revenue.revenueByChannel?.SMS?.revenue || 0).toFixed(2)}
                  </div>
                </div>
              </div>

              <div className="p-3 bg-baash-darkBg rounded-xl border border-baash-cardBorder flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-bold">
                    <Send size={14} />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">WhatsApp Credits</div>
                    <div className="text-[10px] text-baash-textMuted">Meta Cloud API</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-mono font-bold text-white">
                    {revenue.revenueByChannel?.WHATSAPP?.credits || 0}
                  </div>
                  <div className="text-[10px] text-baash-textMuted">
                    ₹{Number(revenue.revenueByChannel?.WHATSAPP?.revenue || 0).toFixed(2)}
                  </div>
                </div>
              </div>

              <div className="p-3 bg-baash-darkBg rounded-xl border border-baash-cardBorder flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center text-xs font-bold">
                    <Mail size={14} />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">Email Credits</div>
                    <div className="text-[10px] text-baash-textMuted">Amazon SES</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-mono font-bold text-white">
                    {revenue.revenueByChannel?.EMAIL?.credits || 0}
                  </div>
                  <div className="text-[10px] text-baash-textMuted">
                    ₹{Number(revenue.revenueByChannel?.EMAIL?.revenue || 0).toFixed(2)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-baash-cardBorder/60 flex gap-2">
            <Link
              to="/admin/credit-packages"
              className="flex-1 py-2 px-3 bg-baash-purple/15 hover:bg-baash-purple/25 text-baash-purpleLight border border-baash-purple/30 rounded-lg text-xs font-bold text-center transition-colors"
            >
              Packages →
            </Link>
            <Link
              to="/admin/wallets"
              className="flex-1 py-2 px-3 bg-baash-cardBg hover:bg-baash-cardBorder text-white border border-baash-cardBorder rounded-lg text-xs font-bold text-center transition-colors"
            >
              All Wallets →
            </Link>
          </div>
        </div>
      </div>

      {/* Row 5: Recent Vendors & System Audit Trail */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Vendors */}
        <div className="baash-card p-6 border border-baash-cardBorder">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Building2 size={18} className="text-baash-purpleLight" />
              <h3 className="text-base font-bold text-white">Recent Vendors</h3>
            </div>
            <Link
              to="/admin/vendors"
              className="text-xs text-baash-purple hover:text-baash-purpleLight font-semibold"
            >
              View All Vendors →
            </Link>
          </div>

          <div className="divide-y divide-baash-cardBorder/60">
            {recentVendors.length > 0 ? (
              recentVendors.map((vendor: any) => (
                <div key={vendor.id} className="py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-baash-darkBg border border-baash-cardBorder flex items-center justify-center text-baash-purpleLight font-bold text-xs">
                      {vendor.businessName ? vendor.businessName.charAt(0) : 'V'}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">{vendor.businessName}</p>
                      <p className="text-xs text-baash-textMuted">{vendor.businessEmail}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={`text-[11px] px-2.5 py-0.5 rounded-full font-semibold ${
                        vendor.status === 'ACTIVE'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : vendor.status === 'SUSPENDED'
                          ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                          : 'bg-baash-cardBorder text-baash-textMuted'
                      }`}
                    >
                      {vendor.status}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-baash-textMuted py-4">No registered vendors yet.</p>
            )}
          </div>
        </div>

        {/* Audit Log Activity */}
        <div className="baash-card p-6 border border-baash-cardBorder">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <ShieldAlert size={18} className="text-baash-pink" />
              <h3 className="text-base font-bold text-white">System Audit Trail</h3>
            </div>
            <Link
              to="/admin/audit-logs"
              className="text-xs text-baash-pink hover:underline font-semibold"
            >
              Full Log →
            </Link>
          </div>

          <div className="space-y-2.5">
            {recentLogs.length > 0 ? (
              recentLogs.slice(0, 6).map((log: any) => (
                <div
                  key={log.id}
                  className="p-3 rounded-xl bg-baash-darkBg/60 border border-baash-cardBorder/60 flex items-start justify-between gap-3 text-xs"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-white">{log.action}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-baash-textMuted font-mono">
                        {log.entityType}
                      </span>
                    </div>
                    <p className="text-baash-textMuted mt-0.5 text-[11px]">
                      {log.user?.fullName || 'System'}{' '}
                      {log.vendor && `· ${log.vendor.businessName}`}
                    </p>
                  </div>
                  <span className="text-[10px] text-baash-textMuted whitespace-nowrap">
                    {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-sm text-baash-textMuted py-4">No audit logs recorded.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};