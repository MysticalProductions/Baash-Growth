import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { Mail, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';

export const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const res = await api.post('/auth/forgot-password', { email });
      setMessage(res.message);
      if (res.resetToken) {
        setResetToken(res.resetToken);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to submit reset request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="baash-card p-8 shadow-baash-card border border-baash-cardBorder">
      <div className="mb-6 text-center">
        <h2 className="text-2xl font-black text-white tracking-tight">Reset Password</h2>
        <p className="text-sm text-baash-textMuted mt-1">
          Enter your registered email to receive a recovery token
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-3 text-red-400 text-xs">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {message ? (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-start gap-3">
            <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-white">{message}</p>
              {resetToken && (
                <div className="mt-3 p-3 bg-baash-black rounded-lg border border-baash-cardBorder break-all">
                  <p className="text-[11px] text-baash-textMuted mb-1 font-mono">Development Reset Token:</p>
                  <code className="text-xs text-baash-pink select-all">{resetToken}</code>
                </div>
              )}
            </div>
          </div>

          {resetToken && (
            <Link
              to={`/reset-password?token=${resetToken}`}
              className="w-full baash-btn-primary block text-center py-2.5 text-sm"
            >
              Proceed to Reset Password Now
            </Link>
          )}

          <Link
            to="/login"
            className="flex items-center justify-center gap-2 text-xs text-baash-textMuted hover:text-white pt-4 transition-colors"
          >
            <ArrowLeft size={14} />
            <span>Return to Login</span>
          </Link>
        </div>
      ) : (
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

          <button
            type="submit"
            disabled={loading}
            className="w-full baash-btn-primary flex items-center justify-center gap-2 mt-4 py-3 cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
            ) : (
              <span>Send Reset Instructions</span>
            )}
          </button>

          <Link
            to="/login"
            className="flex items-center justify-center gap-2 text-xs text-baash-textMuted hover:text-white pt-4 transition-colors"
          >
            <ArrowLeft size={14} />
            <span>Back to Login</span>
          </Link>
        </form>
      )}
    </div>
  );
};
