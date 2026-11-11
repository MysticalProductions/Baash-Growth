import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import api from '../../services/api';
import { Lock, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';

export const ResetPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [token, setToken] = useState(searchParams.get('token') || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const urlToken = searchParams.get('token');
    if (urlToken) {
      setToken(urlToken);
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      await api.post('/auth/reset-password', {
        token,
        password,
      });
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Failed to reset password. The token may be expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="baash-card p-8 shadow-baash-card border border-baash-cardBorder">
      <div className="mb-6 text-center">
        <h2 className="text-2xl font-black text-white tracking-tight">Set New Password</h2>
        <p className="text-sm text-baash-textMuted mt-1">
          Create a strong password for your BAASH account
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-3 text-red-400 text-xs">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {success ? (
        <div className="space-y-6 text-center">
          <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
            <CheckCircle2 size={28} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Password Updated</h3>
            <p className="text-sm text-baash-textMuted mt-1">
              Your password has been securely reset. You can now log into your workspace.
            </p>
          </div>
          <button
            onClick={() => navigate('/login')}
            className="w-full baash-btn-primary py-3"
          >
            Go to Login
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-baash-textMuted uppercase tracking-wider mb-2">
              Reset Security Token
            </label>
            <input
              type="text"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Paste recovery token"
              required
              className="w-full bg-baash-darkBg border border-baash-cardBorder rounded-xl px-4 py-2.5 text-xs font-mono text-white placeholder-baash-textMuted/60 focus:outline-none focus:border-baash-purple focus:ring-1 focus:ring-baash-purple transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-baash-textMuted uppercase tracking-wider mb-2">
              New Password
            </label>
            <div className="relative">
              <Lock size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-baash-textMuted" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                required
                className="w-full bg-baash-darkBg border border-baash-cardBorder rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-baash-textMuted/60 focus:outline-none focus:border-baash-purple focus:ring-1 focus:ring-baash-purple transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-baash-textMuted uppercase tracking-wider mb-2">
              Confirm New Password
            </label>
            <div className="relative">
              <Lock size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-baash-textMuted" />
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat new password"
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
                <span>Update Password</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>

          <Link
            to="/login"
            className="flex items-center justify-center gap-2 text-xs text-baash-textMuted hover:text-white pt-4 transition-colors"
          >
            Cancel and Return
          </Link>
        </form>
      )}
    </div>
  );
};
