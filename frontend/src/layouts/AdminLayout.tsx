import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Building2,
  Radio,
  Package,
  CircleDollarSign,
  Receipt,
  Wallet,
  Megaphone,
  BarChart3,
  Settings,
  LogOut,
  ShieldAlert,
  ShieldCheck,
  Scale,
  Bell,
  Menu,
  X,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const NAV_ITEMS: { name: string; path: string; icon: any; badge?: string }[] = [
  { name: 'Overview', path: '/admin/overview', icon: LayoutDashboard },
  { name: 'Vendors', path: '/admin/vendors', icon: Building2 },
  { name: 'Credit Packages', path: '/admin/credit-packages', icon: Package },
  { name: 'Wallets & Balances', path: '/admin/wallets', icon: Wallet },
  { name: 'Transactions', path: '/admin/transactions', icon: Receipt },
  { name: 'Ledger Reconciliation', path: '/admin/reconciliation', icon: Scale },
  { name: 'Communication Providers', path: '/admin/providers', icon: Radio },
  { name: 'Channel Pricing', path: '/admin/pricing', icon: CircleDollarSign },
  { name: 'Campaign Oversight', path: '/admin/campaigns', icon: Megaphone },
  { name: 'Reports & Analytics', path: '/admin/reports', icon: BarChart3 },
  { name: 'Audit Logs', path: '/admin/audit-logs', icon: ShieldAlert },
  { name: 'Platform Settings', path: '/admin/settings', icon: Settings },
];

export const AdminLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-baash-black flex flex-col md:flex-row text-white">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 bg-baash-darkBg border-b border-baash-cardBorder">
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="BAASH" className="h-7 w-auto object-contain" />
          <span className="font-extrabold text-sm tracking-tight">GROWTH ADMIN</span>
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
          {/* Logo & Brand Header */}
          <div className="p-6 border-b border-baash-cardBorder/60 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src="/logo.png" alt="BAASH" className="h-8 w-auto object-contain" />
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-base font-black tracking-tight text-white">BAASH</span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-baash-purple/20 text-baash-purpleLight border border-baash-purple/30 uppercase">
                    Growth
                  </span>
                </div>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span className="text-[10px] font-semibold text-baash-pink uppercase tracking-wider">
                    Super Admin
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1">
            <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-baash-textMuted/70">
              Platform Administration
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
                {user?.fullName?.charAt(0) || 'A'}
              </div>
              <div className="truncate">
                <p className="text-xs font-semibold text-white truncate">{user?.fullName}</p>
                <p className="text-[11px] text-baash-textMuted truncate">{user?.email}</p>
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
        {/* Top Navigation Bar */}
        <header className="h-16 bg-baash-darkBg/80 backdrop-blur-md border-b border-baash-cardBorder px-6 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <h1 className="text-sm font-semibold text-baash-textMuted">
              Platform Authority Console
            </h1>
            <span className="hidden sm:inline-block w-1 h-1 rounded-full bg-baash-cardBorder"></span>
            <span className="hidden sm:inline-block text-xs text-baash-textMuted">
              BAASH Ecosystem v1.0
            </span>
          </div>

          <div className="flex items-center gap-4">
            <a
              href="https://baash.in"
              target="_blank"
              rel="noreferrer"
              className="hidden sm:flex items-center gap-1.5 text-xs text-baash-textMuted hover:text-white px-2.5 py-1.5 rounded-lg border border-baash-cardBorder hover:border-baash-purple transition-all"
            >
              baash.in
              <ExternalLink size={12} />
            </a>

            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              All Services Operational
            </div>

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
