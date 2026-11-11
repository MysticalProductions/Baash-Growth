import React, { useState, useEffect, useCallback } from 'react';
import { Outlet, NavLink, Link, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Filter,
  Megaphone,
  FileText,
  Wallet,
  Receipt,
  BarChart3,
  Settings,
  UserCheck,
  LogOut,
  Bell,
  Menu,
  X,
  ExternalLink,
  Building,
  Plus,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

const NAV_ITEMS: { name: string; path: string; icon: any; badge?: string }[] = [
  { name: 'Overview', path: '/vendor/overview', icon: LayoutDashboard },
  { name: 'Customers', path: '/vendor/customers', icon: Users },
  { name: 'Segments', path: '/vendor/segments', icon: Filter },
  { name: 'Templates', path: '/vendor/templates', icon: FileText },
  { name: 'Communication Wallet', path: '/vendor/wallet', icon: Wallet },
  { name: 'Transactions', path: '/vendor/transactions', icon: Receipt },
  { name: 'Campaigns', path: '/vendor/campaigns', icon: Megaphone },
  { name: 'Analytics', path: '/vendor/analytics', icon: BarChart3 },
  { name: 'Team & Staff', path: '/vendor/team', icon: UserCheck },
  { name: 'Settings', path: '/vendor/settings', icon: Settings },
];

export const VendorLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [walletBalances, setWalletBalances] = useState<{
    sms: number;
    whatsapp: number;
    email: number;
  }>({ sms: 0, whatsapp: 0, email: 0 });
  const [walletsLoading, setWalletsLoading] = useState(true);

  const fetchWalletBalances = useCallback(async () => {
    try {
      const res = await api.get('/wallets');
      const walletData = res?.wallets ? res : (res?.data || {});
      const list: any[] = walletData.wallets || (Array.isArray(res) ? res : []);
      const smsWallet = list.find((w: any) => w.channel === 'SMS');
      const waWallet = list.find((w: any) => w.channel === 'WHATSAPP');
      const emailWallet = list.find((w: any) => w.channel === 'EMAIL');
      setWalletBalances({
        sms: smsWallet?.availableCredits ?? 0,
        whatsapp: waWallet?.availableCredits ?? 0,
        email: emailWallet?.availableCredits ?? 0,
      });
    } catch (err) {
      console.error('Failed to load top bar wallet balances', err);
    } finally {
      setWalletsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWalletBalances();

    const handleWalletUpdated = () => fetchWalletBalances();
    window.addEventListener('baash:wallet-updated', handleWalletUpdated);
    const interval = setInterval(fetchWalletBalances, 30000);

    return () => {
      window.removeEventListener('baash:wallet-updated', handleWalletUpdated);
      clearInterval(interval);
    };
  }, [fetchWalletBalances]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-baash-black flex flex-col md:flex-row text-white">
      {/* Mobile Top Bar */}
      <div className="md:hidden flex items-center justify-between p-4 bg-baash-darkBg border-b border-baash-cardBorder">
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="BAASH" className="h-7 w-auto object-contain" />
          <span className="font-extrabold text-sm tracking-tight">{user?.vendorName || 'GROWTH'}</span>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 text-baash-textMuted hover:text-white"
        >
          {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Sidebar Navigation */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-baash-darkBg border-r border-baash-cardBorder flex flex-col justify-between transition-transform duration-200 md:static md:translate-x-0 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div>
          {/* Logo & Vendor Identity Header */}
          <div className="p-6 border-b border-baash-cardBorder/60">
            <div className="flex items-center gap-3 mb-3">
              <img src="/logo.png" alt="BAASH" className="h-8 w-auto object-contain" />
              <div className="flex items-center gap-1.5">
                <span className="text-base font-black tracking-tight text-white">BAASH</span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-baash-purple/20 text-baash-purpleLight border border-baash-purple/30 uppercase">
                  Growth
                </span>
              </div>
            </div>

            {/* Vendor Business Tag */}
            <div className="p-2.5 rounded-xl bg-baash-cardBg border border-baash-cardBorder/80 flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-baash-purple/20 border border-baash-purple/40 flex items-center justify-center text-baash-purpleLight shrink-0">
                <Building size={14} />
              </div>
              <div className="truncate">
                <p className="text-xs font-semibold text-white truncate">
                  {user?.vendorName || 'Vendor Workspace'}
                </p>
                <p className="text-[10px] text-baash-textMuted">Active Workspace</p>
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1">
            <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-baash-textMuted/70">
              Workspace Modules
            </div>
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all group ${
                      isActive
                        ? 'bg-baash-purple text-white shadow-baash-glow'
                        : 'text-baash-textMuted hover:text-white hover:bg-baash-cardBg'
                    }`
                  }
                >
                  <div className="flex items-center gap-3">
                    <Icon size={18} className="transition-transform group-hover:scale-110" />
                    <span>{item.name}</span>
                  </div>
                  {item.badge && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/5 text-baash-textMuted border border-white/5">
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* User Footer Profile & Logout */}
        <div className="p-4 border-t border-baash-cardBorder/60 bg-baash-black/40">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-baash-purple to-baash-pink flex items-center justify-center font-bold text-white text-sm shrink-0">
                {user?.fullName?.charAt(0) || 'V'}
              </div>
              <div className="truncate">
                <p className="text-xs font-semibold text-white truncate">{user?.fullName}</p>
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-baash-pink font-semibold">
                    {user?.role === 'VENDOR_ADMIN' ? 'Vendor Admin' : 'Staff Member'}
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={handleLogout}
              title="Sign out"
              className="p-2 text-baash-textMuted hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="h-16 bg-baash-darkBg/80 backdrop-blur-md border-b border-baash-cardBorder px-6 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <h1 className="text-sm font-semibold text-white flex items-center gap-2">
              <span>{user?.vendorName || 'Vendor Portal'}</span>
            </h1>
            <span className="hidden sm:inline-block text-xs px-2 py-0.5 rounded-full bg-baash-teal/10 text-baash-tealLight border border-baash-teal/20">
              Multi-Tenant Isolated
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Quick Credit Overview Pill */}
            <Link
              to="/vendor/wallet"
              title="Click to view wallets or purchase communication credits"
              className="hidden sm:flex items-center gap-3 px-3 py-1.5 rounded-xl bg-baash-cardBg hover:bg-baash-cardBorder/60 border border-baash-cardBorder text-xs transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-400 group-hover:scale-110 transition-transform"></span>
                <span className="text-baash-textMuted">SMS:</span>
                <span className="font-semibold text-white">
                  {walletsLoading ? '...' : walletBalances.sms.toLocaleString()}
                </span>
              </div>
              <div className="w-px h-3 bg-baash-cardBorder"></div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 group-hover:scale-110 transition-transform"></span>
                <span className="text-baash-textMuted">WA:</span>
                <span className="font-semibold text-white">
                  {walletsLoading ? '...' : walletBalances.whatsapp.toLocaleString()}
                </span>
              </div>
              <div className="w-px h-3 bg-baash-cardBorder"></div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-sky-400 group-hover:scale-110 transition-transform"></span>
                <span className="text-baash-textMuted">Email:</span>
                <span className="font-semibold text-white">
                  {walletsLoading ? '...' : walletBalances.email.toLocaleString()}
                </span>
              </div>
            </Link>

            <button
              onClick={handleLogout}
              className="flex items-center gap-2 text-xs font-medium text-baash-textMuted hover:text-white px-3 py-1.5 rounded-lg hover:bg-baash-cardBg transition-colors"
            >
              <LogOut size={14} />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </header>

        {/* Page Outlet */}
        <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
