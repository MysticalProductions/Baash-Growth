import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import api from '../../services/api';
import { UserCheck, Lock, User, Phone, CheckCircle2, AlertCircle } from 'lucide-react';

export const AcceptInvitationPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const token = searchParams.get('token') || '';

  const [invitation, setInvitation] = useState<{
    email: string;
    vendorName: string;
    roleName: string;
  } | null>(null);

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setError('Missing invitation token. Please check your invitation link.');
      setVerifying(false);
      return;
    }

    const checkToken = async () => {
      try {
        const data = await api.get(`/vendor/users/invitation/${token}`);
        setInvitation(data);
      } catch (err: any) {
        setError(err.message || 'Invitation is invalid or has expired');
      } finally {
        setVerifying(false);
      }
    };

    checkToken();
  }, [token]);

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
      await api.post('/vendor/users/accept-invitation', {
        token,
        fullName,
        phone,
        password,
      });
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Failed to accept invitation');
    } finally {
      setLoading(false);
    }
  };

  if (verifying) {
    return (
      <div className="baash-card p-8 text-center">
        <div className="w-10 h-10 border-2 border-baash-cardBorder border-t-baash-purple rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-sm text-baash-textMuted">Verifying invitation credentials...</p>
      </div>
    );
  }

  return (
    <div className="baash-card p-8 shadow-baash-card border border-baash-cardBorder">
      <div className="mb-6 text-center">
        <div className="w-12 h-12 rounded-full bg-baash-purple/20 border border-baash-purple/40 text-baash-purple flex items-center justify-center mx-auto mb-3">
          <UserCheck size={24} />
        </div>
        <h2 className="text-2xl font-black text-white tracking-tight">Team Invitation</h2>
        {invitation ? (
          <p className="text-sm text-baash-textMuted mt-1">
            Join <strong className="text-white">{invitation.vendorName}</strong> as{' '}
            <strong className="text-baash-pink">{invitation.roleName}</strong>
          </p>
        ) : (
          <p className="text-sm text-baash-textMuted mt-1">Accept your team invitation</p>
        )}
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
            <h3 className="text-lg font-bold text-white">Invitation Accepted!</h3>
            <p className="text-sm text-baash-textMuted mt-1">
              Your account has been created and assigned to {invitation?.vendorName}. You can now sign in.
            </p>
          </div>
          <button
            onClick={() => navigate('/login')}
            className="w-full baash-btn-primary py-3"
          >
            Sign In to Workspace
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-baash-textMuted uppercase tracking-wider mb-2">
              Invited Email Address
            </label>
            <input
              type="text"
              value={invitation?.email || ''}
              disabled
              className="w-full bg-baash-black border border-baash-cardBorder/60 rounded-xl px-4 py-2.5 text-sm text-baash-textMuted cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-baash-textMuted uppercase tracking-wider mb-2">
              Your Full Name
            </label>
            <div className="relative">
              <User size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-baash-textMuted" />
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Priya Patel"
                required
                className="w-full bg-baash-darkBg border border-baash-cardBorder rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-baash-textMuted/60 focus:outline-none focus:border-baash-purple focus:ring-1 focus:ring-baash-purple transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-baash-textMuted uppercase tracking-wider mb-2">
              Contact Phone (Optional)
            </label>
            <div className="relative">
              <Phone size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-baash-textMuted" />
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 00000"
                className="w-full bg-baash-darkBg border border-baash-cardBorder rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-baash-textMuted/60 focus:outline-none focus:border-baash-purple focus:ring-1 focus:ring-baash-purple transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-baash-textMuted uppercase tracking-wider mb-2">
              Create Password
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
              Confirm Password
            </label>
            <div className="relative">
              <Lock size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-baash-textMuted" />
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat password"
                required
                className="w-full bg-baash-darkBg border border-baash-cardBorder rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-baash-textMuted/60 focus:outline-none focus:border-baash-purple focus:ring-1 focus:ring-baash-purple transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full baash-btn-secondary flex items-center justify-center gap-2 mt-6 py-3 cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
            ) : (
              <span>Complete Setup & Join Team</span>
            )}
          </button>
        </form>
      )}
    </div>
  );
};
