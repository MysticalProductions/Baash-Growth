import React, { useState, useEffect } from 'react';
import {
  Radio,
  Smartphone,
  MessageSquare,
  Mail,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Save,
  ShieldCheck,
  Server,
  Zap,
  Info,
} from 'lucide-react';
import api from '../../services/api';
import { ProviderConfiguration, ConnectionTestResult } from '../../types/provider';
import { WalletChannel } from '../../types/wallet';

export const AdminProvidersPage: React.FC = () => {
  const [providers, setProviders] = useState<ProviderConfiguration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [testingChannel, setTestingChannel] = useState<WalletChannel | null>(null);
  const [testResults, setTestResults] = useState<Record<string, ConnectionTestResult>>({});
  const [savingChannel, setSavingChannel] = useState<WalletChannel | null>(null);

  // Form edit state for each channel
  const [formState, setFormState] = useState<Record<string, {
    credentials: Record<string, string>;
    isActive: boolean;
    isSandbox: boolean;
  }>>({});

  const fetchProviders = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/admin/providers');
      const data: ProviderConfiguration[] = res.data || res;
      setProviders(data);

      const initialForms: any = {};
      data.forEach((p) => {
        initialForms[p.channel] = {
          credentials: { ...(p.credentials || {}) },
          isActive: p.isActive,
          isSandbox: p.isSandbox,
        };
      });
      setFormState(initialForms);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load provider configurations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProviders();
  }, []);

  const handleTestConnection = async (channel: WalletChannel) => {
    try {
      setTestingChannel(channel);
      const res = await api.post(`/admin/providers/${channel}/test`);
      const result: ConnectionTestResult = res.data || res;
      setTestResults((prev) => ({ ...prev, [channel]: result }));
    } catch (err: any) {
      setTestResults((prev) => ({
        ...prev,
        [channel]: {
          success: false,
          message: err.response?.data?.message || 'Connection test failed',
        },
      }));
    } finally {
      setTestingChannel(null);
    }
  };

  const handleSaveConfig = async (channel: WalletChannel) => {
    const state = formState[channel];
    if (!state) return;

    try {
      setSavingChannel(channel);
      const payload = {
        providerName: channel === 'SMS' ? 'MSG91' : channel === 'WHATSAPP' ? 'META_WHATSAPP' : 'AMAZON_SES',
        credentials: state.credentials,
        isActive: state.isActive,
        isSandbox: state.isSandbox,
      };

      await api.put(`/admin/providers/${channel}`, payload);
      alert(`${channel} provider settings saved successfully!`);
      await fetchProviders();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to save provider settings');
    } finally {
      setSavingChannel(null);
    }
  };

  const updateCred = (channel: WalletChannel, key: string, value: string) => {
    setFormState((prev) => ({
      ...prev,
      [channel]: {
        ...prev[channel],
        credentials: {
          ...prev[channel]?.credentials,
          [key]: value,
        },
      },
    }));
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-white tracking-tight">Communication Providers</h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-baash-purple/20 text-baash-purpleLight border border-baash-purple/30 font-semibold">
              Platform Gateways
            </span>
          </div>
          <p className="text-sm text-baash-textMuted mt-1">
            Centrally manage and test official enterprise integrations for MSG91, Meta WhatsApp Cloud API, and Amazon SES.
          </p>
        </div>

        <button
          onClick={fetchProviders}
          disabled={loading}
          className="p-2.5 bg-baash-darkBg hover:bg-baash-cardBorder border border-baash-cardBorder rounded-lg text-baash-textMuted hover:text-white transition-colors self-start sm:self-auto"
          title="Refresh"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">
          {error}
        </div>
      )}

      {/* Security Notice */}
      <div className="p-4 rounded-xl bg-baash-black border border-baash-cardBorder flex items-start gap-3">
        <ShieldCheck size={20} className="text-emerald-400 shrink-0 mt-0.5" />
        <div className="text-xs text-baash-textMuted space-y-1">
          <span className="font-semibold text-white">Multi-Tenant Credential Isolation:</span>
          <p>
            Provider credentials are kept securely on the central Baash Platform server. Vendors never receive or manage these API keys. Credit consumption is strictly deducted and accounted for before dispatch.
          </p>
        </div>
      </div>

      {/* Provider Cards */}
      <div className="space-y-6">
        {/* 1. MSG91 (SMS) */}
        <div className="p-6 bg-baash-darkBg border border-baash-cardBorder rounded-xl space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-baash-cardBorder">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <Smartphone size={22} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <span>MSG91 SMS Gateway</span>
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                    TRAI DLT Compliant
                  </span>
                </h2>
                <p className="text-xs text-baash-textMuted">Official MSG91 Flow & SendSMS API endpoint</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-xs text-baash-textMuted cursor-pointer">
                <input
                  type="checkbox"
                  checked={formState['SMS']?.isSandbox ?? true}
                  onChange={(e) =>
                    setFormState((prev) => ({
                      ...prev,
                      SMS: { ...prev.SMS, isSandbox: e.target.checked },
                    }))
                  }
                  className="rounded bg-baash-black border-baash-cardBorder text-baash-purple focus:ring-0"
                />
                <span>Sandbox / Mock Mode</span>
              </label>

              <button
                onClick={() => handleTestConnection('SMS')}
                disabled={testingChannel === 'SMS'}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-baash-black hover:bg-baash-cardBorder border border-baash-cardBorder rounded-lg text-white font-semibold text-xs transition-colors cursor-pointer"
              >
                <Zap size={14} className={testingChannel === 'SMS' ? 'animate-bounce text-amber-400' : 'text-emerald-400'} />
                <span>{testingChannel === 'SMS' ? 'Testing...' : 'Test Connection'}</span>
              </button>
            </div>
          </div>

          {/* Test Result Alert */}
          {testResults['SMS'] && (
            <div
              className={`p-3 rounded-lg text-xs flex items-center justify-between ${
                testResults['SMS'].success
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
              }`}
            >
              <div className="flex items-center gap-2">
                {testResults['SMS'].success ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                <span>{testResults['SMS'].message}</span>
              </div>
              {testResults['SMS'].latencyMs !== undefined && (
                <span className="font-mono text-[11px] text-baash-textMuted">
                  {testResults['SMS'].latencyMs}ms latency
                </span>
              )}
            </div>
          )}

          {/* Form Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-baash-textMuted uppercase mb-1">
                MSG91 Auth Key *
              </label>
              <input
                type="text"
                value={formState['SMS']?.credentials?.authKey || ''}
                onChange={(e) => updateCred('SMS', 'authKey', e.target.value)}
                placeholder="msg91_••••••••••••"
                className="w-full px-3 py-2 bg-baash-black border border-baash-cardBorder rounded-lg text-white text-xs font-mono focus:outline-none focus:border-baash-purple"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-baash-textMuted uppercase mb-1">
                Sender ID (6-char Header) *
              </label>
              <input
                type="text"
                maxLength={6}
                value={formState['SMS']?.credentials?.senderId || ''}
                onChange={(e) => updateCred('SMS', 'senderId', e.target.value.toUpperCase())}
                placeholder="BAASHG"
                className="w-full px-3 py-2 bg-baash-black border border-baash-cardBorder rounded-lg text-white text-xs font-mono uppercase focus:outline-none focus:border-baash-purple"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-baash-textMuted uppercase mb-1">
                DLT Principal Entity ID
              </label>
              <input
                type="text"
                value={formState['SMS']?.credentials?.dltEntityId || ''}
                onChange={(e) => updateCred('SMS', 'dltEntityId', e.target.value)}
                placeholder="1201159000000123456"
                className="w-full px-3 py-2 bg-baash-black border border-baash-cardBorder rounded-lg text-white text-xs font-mono focus:outline-none focus:border-baash-purple"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-baash-textMuted uppercase mb-1">
                Default Flow / Template ID
              </label>
              <input
                type="text"
                value={formState['SMS']?.credentials?.defaultTemplateId || ''}
                onChange={(e) => updateCred('SMS', 'defaultTemplateId', e.target.value)}
                placeholder="64d23fa98e1b12345678"
                className="w-full px-3 py-2 bg-baash-black border border-baash-cardBorder rounded-lg text-white text-xs font-mono focus:outline-none focus:border-baash-purple"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-baash-textMuted uppercase mb-1">
                API Endpoint / Gateway URL
              </label>
              <input
                type="text"
                value={formState['SMS']?.credentials?.apiEndpoint || 'https://control.msg91.com/api/v5/flow/'}
                onChange={(e) => updateCred('SMS', 'apiEndpoint', e.target.value)}
                placeholder="https://control.msg91.com/api/v5/flow/"
                className="w-full px-3 py-2 bg-baash-black border border-baash-cardBorder rounded-lg text-white text-xs font-mono focus:outline-none focus:border-baash-purple"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={() => handleSaveConfig('SMS')}
              disabled={savingChannel === 'SMS'}
              className="flex items-center gap-1.5 px-4 py-2 bg-baash-purple hover:bg-baash-purple/90 rounded-lg text-white font-bold text-xs transition-colors cursor-pointer"
            >
              <Save size={14} />
              <span>{savingChannel === 'SMS' ? 'Saving...' : 'Save SMS Configuration'}</span>
            </button>
          </div>
        </div>

        {/* 2. Meta WhatsApp Cloud API */}
        <div className="p-6 bg-baash-darkBg border border-baash-cardBorder rounded-xl space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-baash-cardBorder">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-500/20 text-green-400 flex items-center justify-center">
                <MessageSquare size={22} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <span>Meta WhatsApp Business Cloud API</span>
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-green-500/15 text-green-400 border border-green-500/30">
                    Official Graph API v21.0
                  </span>
                </h2>
                <p className="text-xs text-baash-textMuted">Direct integration with Meta Graph Cloud endpoint</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-xs text-baash-textMuted cursor-pointer">
                <input
                  type="checkbox"
                  checked={formState['WHATSAPP']?.isSandbox ?? true}
                  onChange={(e) =>
                    setFormState((prev) => ({
                      ...prev,
                      WHATSAPP: { ...prev.WHATSAPP, isSandbox: e.target.checked },
                    }))
                  }
                  className="rounded bg-baash-black border-baash-cardBorder text-baash-purple focus:ring-0"
                />
                <span>Sandbox / Mock Mode</span>
              </label>

              <button
                onClick={() => handleTestConnection('WHATSAPP')}
                disabled={testingChannel === 'WHATSAPP'}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-baash-black hover:bg-baash-cardBorder border border-baash-cardBorder rounded-lg text-white font-semibold text-xs transition-colors cursor-pointer"
              >
                <Zap size={14} className={testingChannel === 'WHATSAPP' ? 'animate-bounce text-amber-400' : 'text-green-400'} />
                <span>{testingChannel === 'WHATSAPP' ? 'Testing...' : 'Test Connection'}</span>
              </button>
            </div>
          </div>

          {testResults['WHATSAPP'] && (
            <div
              className={`p-3 rounded-lg text-xs flex items-center justify-between ${
                testResults['WHATSAPP'].success
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
              }`}
            >
              <div className="flex items-center gap-2">
                {testResults['WHATSAPP'].success ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                <span>{testResults['WHATSAPP'].message}</span>
              </div>
              {testResults['WHATSAPP'].latencyMs !== undefined && (
                <span className="font-mono text-[11px] text-baash-textMuted">
                  {testResults['WHATSAPP'].latencyMs}ms latency
                </span>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-baash-textMuted uppercase mb-1">
                Meta App ID
              </label>
              <input
                type="text"
                value={formState['WHATSAPP']?.credentials?.metaAppId || ''}
                onChange={(e) => updateCred('WHATSAPP', 'metaAppId', e.target.value)}
                placeholder="123456789012345"
                className="w-full px-3 py-2 bg-baash-black border border-baash-cardBorder rounded-lg text-white text-xs font-mono focus:outline-none focus:border-baash-purple"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-baash-textMuted uppercase mb-1">
                Graph API Version
              </label>
              <input
                type="text"
                value={formState['WHATSAPP']?.credentials?.apiVersion || 'v21.0'}
                onChange={(e) => updateCred('WHATSAPP', 'apiVersion', e.target.value)}
                placeholder="v21.0"
                className="w-full px-3 py-2 bg-baash-black border border-baash-cardBorder rounded-lg text-white text-xs font-mono focus:outline-none focus:border-baash-purple"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-baash-textMuted uppercase mb-1">
                WhatsApp Business Account ID (WABA ID) *
              </label>
              <input
                type="text"
                value={formState['WHATSAPP']?.credentials?.wabaId || ''}
                onChange={(e) => updateCred('WHATSAPP', 'wabaId', e.target.value)}
                placeholder="109827364519283"
                className="w-full px-3 py-2 bg-baash-black border border-baash-cardBorder rounded-lg text-white text-xs font-mono focus:outline-none focus:border-baash-purple"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-baash-textMuted uppercase mb-1">
                Phone Number ID *
              </label>
              <input
                type="text"
                value={formState['WHATSAPP']?.credentials?.phoneNumberId || ''}
                onChange={(e) => updateCred('WHATSAPP', 'phoneNumberId', e.target.value)}
                placeholder="102938475610293"
                className="w-full px-3 py-2 bg-baash-black border border-baash-cardBorder rounded-lg text-white text-xs font-mono focus:outline-none focus:border-baash-purple"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-baash-textMuted uppercase mb-1">
                Webhook Verification Token
              </label>
              <input
                type="text"
                value={formState['WHATSAPP']?.credentials?.webhookVerifyToken || 'baash_whatsapp_webhook_verify_token'}
                onChange={(e) => updateCred('WHATSAPP', 'webhookVerifyToken', e.target.value)}
                placeholder="baash_whatsapp_webhook_verify_token"
                className="w-full px-3 py-2 bg-baash-black border border-baash-cardBorder rounded-lg text-white text-xs font-mono focus:outline-none focus:border-baash-purple"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-baash-textMuted uppercase mb-1">
                Permanent System User Access Token *
              </label>
              <input
                type="text"
                value={formState['WHATSAPP']?.credentials?.accessToken || ''}
                onChange={(e) => updateCred('WHATSAPP', 'accessToken', e.target.value)}
                placeholder="EAAG••••••••••••"
                className="w-full px-3 py-2 bg-baash-black border border-baash-cardBorder rounded-lg text-white text-xs font-mono focus:outline-none focus:border-baash-purple"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={() => handleSaveConfig('WHATSAPP')}
              disabled={savingChannel === 'WHATSAPP'}
              className="flex items-center gap-1.5 px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-white font-bold text-xs transition-colors cursor-pointer"
            >
              <Save size={14} />
              <span>{savingChannel === 'WHATSAPP' ? 'Saving...' : 'Save WhatsApp Configuration'}</span>
            </button>
          </div>
        </div>

        {/* 3. Amazon SES (Email) */}
        <div className="p-6 bg-baash-darkBg border border-baash-cardBorder rounded-xl space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-baash-cardBorder">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center">
                <Mail size={22} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <span>Amazon Simple Email Service (SES)</span>
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-sky-500/15 text-sky-400 border border-sky-500/30">
                    AWS SDK / SigV4
                  </span>
                </h2>
                <p className="text-xs text-baash-textMuted">Enterprise high-deliverability transactional & broadcast email</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-xs text-baash-textMuted cursor-pointer">
                <input
                  type="checkbox"
                  checked={formState['EMAIL']?.isSandbox ?? true}
                  onChange={(e) =>
                    setFormState((prev) => ({
                      ...prev,
                      EMAIL: { ...prev.EMAIL, isSandbox: e.target.checked },
                    }))
                  }
                  className="rounded bg-baash-black border-baash-cardBorder text-baash-purple focus:ring-0"
                />
                <span>Sandbox / Mock Mode</span>
              </label>

              <button
                onClick={() => handleTestConnection('EMAIL')}
                disabled={testingChannel === 'EMAIL'}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-baash-black hover:bg-baash-cardBorder border border-baash-cardBorder rounded-lg text-white font-semibold text-xs transition-colors cursor-pointer"
              >
                <Zap size={14} className={testingChannel === 'EMAIL' ? 'animate-bounce text-amber-400' : 'text-sky-400'} />
                <span>{testingChannel === 'EMAIL' ? 'Testing...' : 'Test Connection'}</span>
              </button>
            </div>
          </div>

          {testResults['EMAIL'] && (
            <div
              className={`p-3 rounded-lg text-xs flex items-center justify-between ${
                testResults['EMAIL'].success
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
              }`}
            >
              <div className="flex items-center gap-2">
                {testResults['EMAIL'].success ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                <span>{testResults['EMAIL'].message}</span>
              </div>
              {testResults['EMAIL'].latencyMs !== undefined && (
                <span className="font-mono text-[11px] text-baash-textMuted">
                  {testResults['EMAIL'].latencyMs}ms latency
                </span>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-baash-textMuted uppercase mb-1">
                AWS Region *
              </label>
              <input
                type="text"
                value={formState['EMAIL']?.credentials?.region || 'ap-south-1'}
                onChange={(e) => updateCred('EMAIL', 'region', e.target.value)}
                placeholder="ap-south-1"
                className="w-full px-3 py-2 bg-baash-black border border-baash-cardBorder rounded-lg text-white text-xs font-mono focus:outline-none focus:border-baash-purple"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-baash-textMuted uppercase mb-1">
                Verified Sender Email (From) *
              </label>
              <input
                type="text"
                value={formState['EMAIL']?.credentials?.fromEmail || 'growth@baash.in'}
                onChange={(e) => updateCred('EMAIL', 'fromEmail', e.target.value)}
                placeholder="growth@baash.in"
                className="w-full px-3 py-2 bg-baash-black border border-baash-cardBorder rounded-lg text-white text-xs font-mono focus:outline-none focus:border-baash-purple"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-baash-textMuted uppercase mb-1">
                Configuration Set (Optional)
              </label>
              <input
                type="text"
                value={formState['EMAIL']?.credentials?.configurationSet || ''}
                onChange={(e) => updateCred('EMAIL', 'configurationSet', e.target.value)}
                placeholder="e.g. baash-growth-reputation-events"
                className="w-full px-3 py-2 bg-baash-black border border-baash-cardBorder rounded-lg text-white text-xs font-mono focus:outline-none focus:border-baash-purple"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-baash-textMuted uppercase mb-1">
                AWS Access Key ID *
              </label>
              <input
                type="text"
                value={formState['EMAIL']?.credentials?.accessKeyId || ''}
                onChange={(e) => updateCred('EMAIL', 'accessKeyId', e.target.value)}
                placeholder="AKIA••••••••••••"
                className="w-full px-3 py-2 bg-baash-black border border-baash-cardBorder rounded-lg text-white text-xs font-mono focus:outline-none focus:border-baash-purple"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-baash-textMuted uppercase mb-1">
                AWS Secret Access Key *
              </label>
              <input
                type="text"
                value={formState['EMAIL']?.credentials?.secretAccessKey || ''}
                onChange={(e) => updateCred('EMAIL', 'secretAccessKey', e.target.value)}
                placeholder="aws_secret_key_••••••••"
                className="w-full px-3 py-2 bg-baash-black border border-baash-cardBorder rounded-lg text-white text-xs font-mono focus:outline-none focus:border-baash-purple"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={() => handleSaveConfig('EMAIL')}
              disabled={savingChannel === 'EMAIL'}
              className="flex items-center gap-1.5 px-4 py-2 bg-sky-600 hover:bg-sky-700 rounded-lg text-white font-bold text-xs transition-colors cursor-pointer"
            >
              <Save size={14} />
              <span>{savingChannel === 'EMAIL' ? 'Saving...' : 'Save SES Configuration'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
