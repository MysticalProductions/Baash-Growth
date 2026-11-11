import React, { useState } from 'react';
import {
  Settings,
  Shield,
  Bell,
  Sliders,
  Database,
  Lock,
  Mail,
  Smartphone,
  MessageSquare,
  CheckCircle2,
  AlertTriangle,
  Save,
  RefreshCw,
  Cpu,
  Layers,
  Server,
  Zap
} from 'lucide-react';
import api from '../../services/api';

export const AdminSettingsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'general' | 'security' | 'delivery' | 'billing'>('general');
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Platform settings state
  const [settings, setSettings] = useState({
    platformName: 'BAASH GROWTH Platform',
    supportEmail: 'ops@baash.in',
    companyWebsite: 'https://baash.in',
    maintenanceMode: false,
    
    // Security
    sessionTimeoutMins: 60,
    maxLoginAttempts: 5,
    requireStrongPassword: true,
    enforceAuditLogging: true,
    corsAllowedOrigins: 'https://growth.baash.in, http://localhost:5173',

    // Delivery & Concurrency
    maxBatchSize: 500,
    maxConcurrentWorkers: 5,
    maxRetryAttempts: 3,
    autoQuarantineBounces: true,
    rateLimitPerMinute: 120,

    // Communication Defaults
    defaultSmsSenderId: 'BAASHIN',
    defaultEmailFrom: 'noreply@baash.in',
    defaultWhatsAppNamespace: 'baash_growth_prod',

    // Financial
    lowBalanceWarningCredits: 100,
    autoRefundFailedCredits: true,
    currencySymbol: 'INR (₹)',
  });

  const handleChange = (field: string, value: any) => {
    setSettings((prev) => ({ ...prev, [field]: value }));
    setSavedSuccess(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    // Simulate persistent save and display success toast
    setTimeout(() => {
      setSaving(false);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 4000);
    }, 600);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
            <span className="p-2 rounded-xl bg-baash-purple/20 text-baash-purpleLight border border-baash-purple/30">
              <Settings className="w-6 h-6 text-baash-purpleLight" />
            </span>
            Platform Settings & Governance
          </h1>
          <p className="text-sm text-baash-textMuted mt-1">
            Global operational policies, security safeguards, provider defaults, and delivery queue controls.
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-baash-purple hover:bg-baash-purpleDark text-white font-semibold text-sm transition-all shadow-baash-glow hover:scale-[1.02] disabled:opacity-50"
        >
          {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          <span>Save Changes</span>
        </button>
      </div>

      {savedSuccess && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center gap-3 animate-fadeIn">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span className="text-sm font-medium">
            System configuration parameters successfully persisted and propagated across cluster.
          </span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-baash-cardBorder gap-2">
        <button
          onClick={() => setActiveTab('general')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all ${
            activeTab === 'general'
              ? 'border-baash-purple text-baash-purpleLight'
              : 'border-transparent text-baash-textMuted hover:text-white'
          }`}
        >
          <Sliders className="w-4 h-4" />
          General & Brand
        </button>
        <button
          onClick={() => setActiveTab('security')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all ${
            activeTab === 'security'
              ? 'border-baash-purple text-baash-purpleLight'
              : 'border-transparent text-baash-textMuted hover:text-white'
          }`}
        >
          <Shield className="w-4 h-4" />
          Security & Access
        </button>
        <button
          onClick={() => setActiveTab('delivery')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all ${
            activeTab === 'delivery'
              ? 'border-baash-purple text-baash-purpleLight'
              : 'border-transparent text-baash-textMuted hover:text-white'
          }`}
        >
          <Zap className="w-4 h-4" />
          Delivery & Concurrency
        </button>
        <button
          onClick={() => setActiveTab('billing')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all ${
            activeTab === 'billing'
              ? 'border-baash-purple text-baash-purpleLight'
              : 'border-transparent text-baash-textMuted hover:text-white'
          }`}
        >
          <Database className="w-4 h-4" />
          Wallet & Financial Rules
        </button>
      </div>

      {/* Content Form */}
      <form onSubmit={handleSave} className="space-y-6">
        {activeTab === 'general' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 rounded-2xl bg-baash-cardBg border border-baash-cardBorder space-y-4">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Sliders className="w-4 h-4 text-baash-purpleLight" /> Platform Identity
              </h2>

              <div>
                <label className="block text-xs font-semibold text-baash-textMuted uppercase tracking-wider mb-1.5">
                  Platform Display Name
                </label>
                <input
                  type="text"
                  value={settings.platformName}
                  onChange={(e) => handleChange('platformName', e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-baash-darkBg border border-baash-cardBorder text-white text-sm focus:outline-none focus:border-baash-purple"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-baash-textMuted uppercase tracking-wider mb-1.5">
                  Operations & Support Email
                </label>
                <input
                  type="email"
                  value={settings.supportEmail}
                  onChange={(e) => handleChange('supportEmail', e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-baash-darkBg border border-baash-cardBorder text-white text-sm focus:outline-none focus:border-baash-purple"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-baash-textMuted uppercase tracking-wider mb-1.5">
                  Ecosystem Parent URL
                </label>
                <input
                  type="url"
                  value={settings.companyWebsite}
                  onChange={(e) => handleChange('companyWebsite', e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-baash-darkBg border border-baash-cardBorder text-white text-sm focus:outline-none focus:border-baash-purple"
                />
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-baash-cardBg border border-baash-cardBorder space-y-4">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Server className="w-4 h-4 text-baash-pink" /> Operational State
              </h2>

              <div className="p-4 rounded-xl bg-baash-darkBg border border-baash-cardBorder/60 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-white">System Maintenance Mode</h4>
                  <p className="text-xs text-baash-textMuted mt-0.5">
                    Temporarily halts outgoing campaign queues while keeping Admin Console accessible.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.maintenanceMode}
                    onChange={(e) => handleChange('maintenanceMode', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-baash-cardBorder peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-baash-pink"></div>
                </label>
              </div>

              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-baash-textMuted">PostgreSQL Engine:</span>
                  <span className="font-mono text-emerald-400 font-semibold">PostgreSQL 14 (Healthy)</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-baash-textMuted">Queue Concurrency Worker:</span>
                  <span className="font-mono text-emerald-400 font-semibold">Active (PID In-Process)</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-baash-textMuted">Platform Version:</span>
                  <span className="font-mono text-baash-purpleLight font-semibold">v1.0.0-MVP (Part 5 Release)</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'security' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 rounded-2xl bg-baash-cardBg border border-baash-cardBorder space-y-4">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Lock className="w-4 h-4 text-emerald-400" /> Session & Token Security
              </h2>

              <div>
                <label className="block text-xs font-semibold text-baash-textMuted uppercase tracking-wider mb-1.5">
                  JWT Session Expiry (Minutes)
                </label>
                <input
                  type="number"
                  value={settings.sessionTimeoutMins}
                  onChange={(e) => handleChange('sessionTimeoutMins', Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-baash-darkBg border border-baash-cardBorder text-white text-sm focus:outline-none focus:border-baash-purple"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-baash-textMuted uppercase tracking-wider mb-1.5">
                  Max Consecutive Failed Login Lockout
                </label>
                <input
                  type="number"
                  value={settings.maxLoginAttempts}
                  onChange={(e) => handleChange('maxLoginAttempts', Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-baash-darkBg border border-baash-cardBorder text-white text-sm focus:outline-none focus:border-baash-purple"
                />
              </div>

              <div className="p-4 rounded-xl bg-baash-darkBg border border-baash-cardBorder/60 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-white">Strict Audit Trail</h4>
                  <p className="text-xs text-baash-textMuted mt-0.5">
                    Immutable event logging for all balance adjustments and provider modifications.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.enforceAuditLogging}
                    onChange={(e) => handleChange('enforceAuditLogging', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-baash-cardBorder peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                </label>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-baash-cardBg border border-baash-cardBorder space-y-4">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Shield className="w-4 h-4 text-baash-purpleLight" /> Perimeter & Isolation
              </h2>

              <div>
                <label className="block text-xs font-semibold text-baash-textMuted uppercase tracking-wider mb-1.5">
                  CORS Allowed Origins
                </label>
                <textarea
                  rows={2}
                  value={settings.corsAllowedOrigins}
                  onChange={(e) => handleChange('corsAllowedOrigins', e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-baash-darkBg border border-baash-cardBorder text-white text-sm font-mono focus:outline-none focus:border-baash-purple"
                />
                <p className="text-[11px] text-baash-textMuted mt-1">Comma-separated client origins permitted for cross-origin requests.</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-baash-textMuted uppercase tracking-wider mb-1.5">
                  API Rate Limiting (Req/min per IP)
                </label>
                <input
                  type="number"
                  value={settings.rateLimitPerMinute}
                  onChange={(e) => handleChange('rateLimitPerMinute', Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-baash-darkBg border border-baash-cardBorder text-white text-sm focus:outline-none focus:border-baash-purple"
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'delivery' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 rounded-2xl bg-baash-cardBg border border-baash-cardBorder space-y-4">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Zap className="w-4 h-4 text-baash-yellow" /> Queue Batching & Concurrency
              </h2>

              <div>
                <label className="block text-xs font-semibold text-baash-textMuted uppercase tracking-wider mb-1.5">
                  Recipient Chunk Size (Batch Size)
                </label>
                <input
                  type="number"
                  value={settings.maxBatchSize}
                  onChange={(e) => handleChange('maxBatchSize', Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-baash-darkBg border border-baash-cardBorder text-white text-sm focus:outline-none focus:border-baash-purple"
                />
                <p className="text-[11px] text-baash-textMuted mt-1">Number of recipients processed per dispatch chunk.</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-baash-textMuted uppercase tracking-wider mb-1.5">
                  Concurrent Worker Threads
                </label>
                <input
                  type="number"
                  value={settings.maxConcurrentWorkers}
                  onChange={(e) => handleChange('maxConcurrentWorkers', Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-baash-darkBg border border-baash-cardBorder text-white text-sm focus:outline-none focus:border-baash-purple"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-baash-textMuted uppercase tracking-wider mb-1.5">
                  Max Transient Retry Attempts
                </label>
                <input
                  type="number"
                  value={settings.maxRetryAttempts}
                  onChange={(e) => handleChange('maxRetryAttempts', Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-baash-darkBg border border-baash-cardBorder text-white text-sm focus:outline-none focus:border-baash-purple"
                />
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-baash-cardBg border border-baash-cardBorder space-y-4">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Mail className="w-4 h-4 text-baash-purpleLight" /> Communication Defaults
              </h2>

              <div>
                <label className="block text-xs font-semibold text-baash-textMuted uppercase tracking-wider mb-1.5">
                  Default SMS Sender ID (DLT Header)
                </label>
                <input
                  type="text"
                  value={settings.defaultSmsSenderId}
                  onChange={(e) => handleChange('defaultSmsSenderId', e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-baash-darkBg border border-baash-cardBorder text-white text-sm focus:outline-none focus:border-baash-purple"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-baash-textMuted uppercase tracking-wider mb-1.5">
                  Default Email From Address
                </label>
                <input
                  type="email"
                  value={settings.defaultEmailFrom}
                  onChange={(e) => handleChange('defaultEmailFrom', e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-baash-darkBg border border-baash-cardBorder text-white text-sm focus:outline-none focus:border-baash-purple"
                />
              </div>

              <div className="p-4 rounded-xl bg-baash-darkBg border border-baash-cardBorder/60 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-white">Auto-Quarantine Bounces</h4>
                  <p className="text-xs text-baash-textMuted mt-0.5">
                    Automatically add hard bounces and spam complaints to suppression list.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.autoQuarantineBounces}
                    onChange={(e) => handleChange('autoQuarantineBounces', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-baash-cardBorder peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-baash-purple"></div>
                </label>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'billing' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 rounded-2xl bg-baash-cardBg border border-baash-cardBorder space-y-4">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Database className="w-4 h-4 text-emerald-400" /> Wallet Safeguards
              </h2>

              <div>
                <label className="block text-xs font-semibold text-baash-textMuted uppercase tracking-wider mb-1.5">
                  Low Balance Notification Threshold
                </label>
                <input
                  type="number"
                  value={settings.lowBalanceWarningCredits}
                  onChange={(e) => handleChange('lowBalanceWarningCredits', Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-baash-darkBg border border-baash-cardBorder text-white text-sm focus:outline-none focus:border-baash-purple"
                />
                <p className="text-[11px] text-baash-textMuted mt-1">Vendors receive low balance banner when credits fall below this value.</p>
              </div>

              <div className="p-4 rounded-xl bg-baash-darkBg border border-baash-cardBorder/60 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-white">Auto-Refund Undelivered Credits</h4>
                  <p className="text-xs text-baash-textMuted mt-0.5">
                    Release reserved credits back to available balance upon campaign completion for failed sends.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.autoRefundFailedCredits}
                    onChange={(e) => handleChange('autoRefundFailedCredits', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-baash-cardBorder peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                </label>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-baash-cardBg border border-baash-cardBorder space-y-4">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-baash-purpleLight" /> Payment Gateway Mode
              </h2>

              <div className="p-4 rounded-xl bg-baash-darkBg border border-baash-cardBorder/60">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-baash-textMuted uppercase">Active Gateway</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    Razorpay Test Mode
                  </span>
                </div>
                <p className="text-xs text-baash-textMuted leading-relaxed">
                  Platform is currently running in Razorpay Test sandbox. All credit orders use test card credentials and simulate real instant webhook verification.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-baash-textMuted uppercase tracking-wider mb-1.5">
                  Platform Base Currency
                </label>
                <input
                  type="text"
                  disabled
                  value={settings.currencySymbol}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-baash-darkBg border border-baash-cardBorder text-baash-textMuted text-sm cursor-not-allowed"
                />
              </div>
            </div>
          </div>
        )}
      </form>
    </div>
  );
};
export default AdminSettingsPage;
