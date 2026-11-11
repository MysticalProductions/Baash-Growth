import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Lock, Mail, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const user = await login(email, password);
      const from = (location.state as any)?.from?.pathname;
      if (from) {
        navigate(from, { replace: true });
      } else if (user.role === 'SUPER_ADMIN') {
        navigate('/admin/overview', { replace: true });
      } else {
        navigate('/vendor/overview', { replace: true });
      }
    } catch (err: any) {
      setError(err.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (quickEmail: string, quickPass: string) => {
    setEmail(quickEmail);
    setPassword(quickPass);
    setError(null);
  };

  return (
    <div className="baash-card p-8 shadow-baash-card border border-baash-cardBorder relative">
      <div className="mb-6 text-center">
        <h2 className="text-2xl font-black text-white tracking-tight">Sign In</h2>
        <p className="text-sm text-baash-textMuted mt-1">
          Access your BAASH GROWTH console
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-3 text-red-400 text-xs">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-baash-textMuted uppercase tracking-wider mb-2">
            Email Address
          </label>
          <div className="relative">
            <Mail size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-baash-textMuted" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@business.com"
              required
              className="w-full bg-baash-darkBg border border-baash-cardBorder rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-baash-textMuted/60 focus:outline-none focus:border-baash-purple focus:ring-1 focus:ring-baash-purple transition-all"
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-xs font-semibold text-baash-textMuted uppercase tracking-wider">
              Password
            </label>
            <Link
              to="/forgot-password"
              className="text-xs text-baash-purple hover:text-baash-purpleLight transition-colors font-medium"
            >
              Forgot Password?
            </Link>
          </div>
          <div className="relative">
            <Lock size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-baash-textMuted" />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              required
              className="w-full bg-baash-darkBg border border-baash-cardBorder rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-baash-textMuted/60 focus:outline-none focus:border-baash-purple focus:ring-1 focus:ring-baash-purple transition-all"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full baash-btn-primary flex items-center justify-center gap-2 mt-6 py-3 cursor-pointer disabled:opacity-50"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
          ) : (
            <>
              <span>Authenticate & Enter</span>
              <ArrowRight size={16} />
            </>
          )}
        </button>
      </form>

      {/* Quick Demo Fill Helper */}
      <div className="mt-8 pt-6 border-t border-baash-cardBorder/60">
        <p className="text-[11px] font-semibold text-baash-textMuted uppercase tracking-wider mb-3 text-center">
          ⚡ Quick Demo Credentials
        </p>
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => handleQuickLogin('admin@baash.in', 'BaashAdmin@2026')}
            className="px-2 py-2 rounded-lg bg-baash-darkBg hover:bg-baash-cardBorder border border-baash-cardBorder text-center transition-all group"
          >
            <p className="text-[11px] font-bold text-baash-purple group-hover:text-baash-purpleLight">Admin</p>
            <p className="text-[9px] text-baash-textMuted">Super Admin</p>
          </button>
          <button
            type="button"
            onClick={() => handleQuickLogin('vendor@acme.com', 'VendorAdmin@2026')}
            className="px-2 py-2 rounded-lg bg-baash-darkBg hover:bg-baash-cardBorder border border-baash-cardBorder text-center transition-all group"
          >
            <p className="text-[11px] font-bold text-baash-pink group-hover:text-baash-pinkDark">Vendor</p>
            <p className="text-[9px] text-baash-textMuted">Acme Admin</p>
          </button>
          <button
            type="button"
            onClick={() => handleQuickLogin('staff@acme.com', 'VendorStaff@2026')}
            className="px-2 py-2 rounded-lg bg-baash-darkBg hover:bg-baash-cardBorder border border-baash-cardBorder text-center transition-all group"
          >
            <p className="text-[11px] font-bold text-baash-tealLight group-hover:text-baash-teal">Staff</p>
            <p className="text-[9px] text-baash-textMuted">Acme Staff</p>
          </button>
        </div>
      </div>
    </div>
  );
};
