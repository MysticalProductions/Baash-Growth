import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import {
  Building,
  Mail,
  Phone,
  MapPin,
  ShieldCheck,
  Save,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
} from 'lucide-react';

export const VendorSettingsPage: React.FC = () => {
  const { user, refreshProfile } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState(false);

  const [form, setForm] = useState({
    businessName: '',
    businessEmail: '',
    businessPhone: '',
    businessAddress: '',
    businessLogo: '',
  });

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await api.get('/vendor/profile');
      const data = res?.businessName ? res : (res?.data || {});
      setProfile(data);
      setForm({
        businessName: data.businessName || '',
        businessEmail: data.businessEmail || '',
        businessPhone: data.businessPhone || '',
        businessAddress: data.businessAddress || '',
        businessLogo: data.businessLogo || '',
      });
    } catch (err: any) {
      setError(err.message || 'Failed to fetch vendor profile');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      await api.put('/vendor/profile', form);
      setSuccess(true);
      await refreshProfile();
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to update vendor profile');
    } finally {
      setSaving(false);
    }
  };

  const handleCopyTenantId = () => {
    if (profile?.id) {
      navigator.clipboard.writeText(profile.id);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-10 h-10 border-2 border-baash-cardBorder border-t-baash-purple rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-black text-white tracking-tight">Workspace Settings</h2>
        <p className="text-sm text-baash-textMuted mt-1">
          Manage your business information and multi-tenant isolation parameters.
        </p>
      </div>

      {success && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
          <CheckCircle2 size={16} />
          <span>Workspace profile updated successfully.</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* Tenant Identity Card */}
      <div className="baash-card p-6 border border-baash-cardBorder bg-baash-darkBg/60">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-baash-purple/20 border border-baash-purple/40 text-baash-purpleLight flex items-center justify-center">
              <ShieldCheck size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white">Tenant UUID Scoping</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
                  {profile?.status}
                </span>
              </div>
              <p className="text-xs text-baash-textMuted font-mono mt-0.5">{profile?.id}</p>
            </div>
          </div>

          <button
            onClick={handleCopyTenantId}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-baash-cardBg hover:bg-baash-cardBorder border border-baash-cardBorder text-xs text-white transition-colors"
          >
            {copiedId ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
            <span>{copiedId ? 'Copied' : 'Copy Tenant ID'}</span>
          </button>
        </div>
      </div>

      {/* Profile Form */}
      <form onSubmit={handleSubmit} className="baash-card p-6 md:p-8 border border-baash-cardBorder space-y-6">
        <div className="border-b border-baash-cardBorder pb-4">
          <h3 className="text-base font-bold text-white">Business Details</h3>
          <p className="text-xs text-baash-textMuted mt-0.5">
            This information appears on communication campaign sender headers and receipts.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-xs font-semibold text-baash-textMuted uppercase mb-2">
              Business Legal Name *
            </label>
            <input
              type="text"
              required
              value={form.businessName}
              onChange={(e) => setForm({ ...form, businessName: e.target.value })}
              className="w-full bg-baash-darkBg border border-baash-cardBorder rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-baash-purple"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-baash-textMuted uppercase mb-2">
              Official Contact Email *
            </label>
            <input
              type="email"
              required
              value={form.businessEmail}
              onChange={(e) => setForm({ ...form, businessEmail: e.target.value })}
              className="w-full bg-baash-darkBg border border-baash-cardBorder rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-baash-purple"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-baash-textMuted uppercase mb-2">
              Customer Support Phone
            </label>
            <input
              type="text"
              value={form.businessPhone}
              onChange={(e) => setForm({ ...form, businessPhone: e.target.value })}
              placeholder="+91 98765 43210"
              className="w-full bg-baash-darkBg border border-baash-cardBorder rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-baash-purple"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-baash-textMuted uppercase mb-2">
              Brand Logo URL (Optional)
            </label>
            <input
              type="text"
              value={form.businessLogo}
              onChange={(e) => setForm({ ...form, businessLogo: e.target.value })}
              placeholder="https://..."
              className="w-full bg-baash-darkBg border border-baash-cardBorder rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-baash-purple"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-baash-textMuted uppercase mb-2">
            Registered Business Address
          </label>
          <textarea
            rows={3}
            value={form.businessAddress}
            onChange={(e) => setForm({ ...form, businessAddress: e.target.value })}
            placeholder="Full physical office or store location"
            className="w-full bg-baash-darkBg border border-baash-cardBorder rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-baash-purple"
          />
        </div>

        <div className="pt-4 border-t border-baash-cardBorder flex items-center justify-end">
          <button
            type="submit"
            disabled={saving}
            className="baash-btn-primary flex items-center gap-2 text-sm px-6 py-2.5 cursor-pointer disabled:opacity-50"
          >
            {saving ? (
              <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
            ) : (
              <>
                <Save size={16} />
                <span>Save Workspace Changes</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
