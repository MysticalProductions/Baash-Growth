import React, { useState, useEffect } from 'react';
import {
  CircleDollarSign,
  Smartphone,
  MessageSquare,
  Mail,
  RefreshCw,
  Save,
  CheckCircle2,
  TrendingUp,
  Percent,
  HelpCircle,
} from 'lucide-react';
import api from '../../services/api';
import { ChannelPricing } from '../../types/provider';
import { WalletChannel } from '../../types/wallet';

export const AdminPricingPage: React.FC = () => {
  const [pricingList, setPricingList] = useState<ChannelPricing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [savingChannel, setSavingChannel] = useState<WalletChannel | null>(null);

  // Form states for inputs
  const [editState, setEditState] = useState<Record<string, { selling: number; cost: number }>>({});

  const fetchPricing = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/admin/channel-pricing');
      const data: ChannelPricing[] = res.data || res;
      setPricingList(data);

      const initial: any = {};
      data.forEach((p) => {
        initial[p.channel] = {
          selling: Number(p.sellingCreditsPerUnit),
          cost: Number(p.estimatedProviderCost),
        };
      });
      setEditState(initial);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load pricing');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPricing();
  }, []);

  const handleSave = async (channel: WalletChannel) => {
    const val = editState[channel];
    if (!val) return;

    try {
      setSavingChannel(channel);
      await api.put(`/admin/channel-pricing/${channel}`, {
        sellingCreditsPerUnit: Number(val.selling),
        estimatedProviderCost: Number(val.cost),
      });
      alert(`Pricing for ${channel} updated successfully`);
      await fetchPricing();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update channel pricing');
    } finally {
      setSavingChannel(null);
    }
  };

  const getChannelIcon = (ch: WalletChannel) => {
    switch (ch) {
      case 'SMS':
        return <Smartphone size={18} className="text-emerald-400" />;
      case 'WHATSAPP':
        return <MessageSquare size={18} className="text-green-400" />;
      case 'EMAIL':
        return <Mail size={18} className="text-sky-400" />;
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-white tracking-tight">Channel Unit Pricing</h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-baash-purple/20 text-baash-purpleLight border border-baash-purple/30 font-semibold">
              Credit Economics
            </span>
          </div>
          <p className="text-sm text-baash-textMuted mt-1">
            Configure credit charge rates and track gross margin against estimated provider costs.
          </p>
        </div>

        <button
          onClick={fetchPricing}
          disabled={loading}
          className="p-2.5 bg-baash-darkBg hover:bg-baash-cardBorder border border-baash-cardBorder rounded-lg text-baash-textMuted hover:text-white transition-colors self-start sm:self-auto"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">
          {error}
        </div>
      )}

      {/* Pricing Table Card */}
      <div className="rounded-xl bg-baash-darkBg border border-baash-cardBorder overflow-hidden">
        <div className="p-5 border-b border-baash-cardBorder">
          <h2 className="text-base font-bold text-white">Central Channel Billing Rates</h2>
          <p className="text-xs text-baash-textMuted mt-0.5">
            1 Credit equates to 1 Indian Rupee (INR) baseline for vendor purchases.
          </p>
        </div>

        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center text-baash-textMuted">
            <RefreshCw size={24} className="animate-spin text-baash-purple mb-2" />
            <p className="text-xs">Loading channel pricing...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-baash-black/40 text-baash-textMuted text-xs uppercase tracking-wider border-b border-baash-cardBorder">
                <tr>
                  <th className="py-3.5 px-5">Communication Channel</th>
                  <th className="py-3.5 px-5">Selling Credits / Unit</th>
                  <th className="py-3.5 px-5">Estimated Provider Cost (INR)</th>
                  <th className="py-3.5 px-5">Estimated Gross Margin</th>
                  <th className="py-3.5 px-5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-baash-cardBorder/60">
                {(['SMS', 'WHATSAPP', 'EMAIL'] as WalletChannel[]).map((ch) => {
                  const state = editState[ch] || { selling: 1, cost: 0.2 };
                  const selling = Number(state.selling) || 1;
                  const cost = Number(state.cost) || 0.2;
                  const marginInr = selling - cost;
                  const marginPct = selling > 0 ? Math.round((marginInr / selling) * 100) : 0;

                  return (
                    <tr key={ch} className="hover:bg-baash-cardBorder/20 transition-colors">
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-baash-black border border-baash-cardBorder flex items-center justify-center">
                            {getChannelIcon(ch)}
                          </div>
                          <div>
                            <span className="font-bold text-white text-base">{ch}</span>
                            <div className="text-xs text-baash-textMuted">
                              {ch === 'SMS'
                                ? 'Per 160-character segment'
                                : ch === 'WHATSAPP'
                                ? 'Per conversation message'
                                : 'Per verified email recipient'}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-5">
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            step="0.1"
                            min="0.1"
                            value={state.selling}
                            onChange={(e) =>
                              setEditState((prev) => ({
                                ...prev,
                                [ch]: { ...prev[ch], selling: parseFloat(e.target.value) || 0 },
                              }))
                            }
                            className="w-24 px-3 py-1.5 bg-baash-black border border-baash-cardBorder rounded text-white font-mono font-bold text-sm focus:outline-none focus:border-baash-purple"
                          />
                          <span className="text-xs text-baash-textMuted">Credits</span>
                        </div>
                      </td>

                      <td className="py-4 px-5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-baash-textMuted">₹</span>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={state.cost}
                            onChange={(e) =>
                              setEditState((prev) => ({
                                ...prev,
                                [ch]: { ...prev[ch], cost: parseFloat(e.target.value) || 0 },
                              }))
                            }
                            className="w-24 px-3 py-1.5 bg-baash-black border border-baash-cardBorder rounded text-white font-mono text-sm focus:outline-none focus:border-baash-purple"
                          />
                        </div>
                      </td>

                      <td className="py-4 px-5">
                        <div>
                          <span
                            className={`font-black text-sm ${
                              marginInr > 0 ? 'text-emerald-400' : 'text-rose-400'
                            }`}
                          >
                            ₹{marginInr.toFixed(3)}
                          </span>
                          <span className="text-xs text-baash-textMuted ml-1.5 font-semibold">
                            ({marginPct}%)
                          </span>
                        </div>
                        <div className="text-[11px] text-baash-textMuted">Per dispatched unit</div>
                      </td>

                      <td className="py-4 px-5 text-right">
                        <button
                          onClick={() => handleSave(ch)}
                          disabled={savingChannel === ch}
                          className="px-3.5 py-1.5 bg-baash-purple hover:bg-baash-purple/90 rounded text-white font-bold text-xs transition-colors cursor-pointer"
                        >
                          {savingChannel === ch ? 'Saving...' : 'Save'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
