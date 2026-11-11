import React, { useState, useEffect } from 'react';
import {
  Package,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  Smartphone,
  MessageSquare,
  Mail,
  RefreshCw,
  Search,
  Filter,
  X,
  AlertTriangle,
  Receipt,
  Sparkles,
} from 'lucide-react';
import api from '../../services/api';
import { CreditPackage, WalletChannel, PackageStatus } from '../../types/wallet';

export const CreditPackagesPage: React.FC = () => {
  const [packages, setPackages] = useState<CreditPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState<CreditPackage | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [channel, setChannel] = useState<WalletChannel>('SMS');
  const [credits, setCredits] = useState<number>(1000);
  const [price, setPrice] = useState<number>(299);
  const [gstPercentage, setGstPercentage] = useState<number>(18.0);
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const fetchPackages = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/admin/credit-packages');
      const pkgs = Array.isArray(res) ? res : (Array.isArray(res?.data) ? res.data : (res?.data || []));
      setPackages(pkgs);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load credit packages');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPackages();
  }, []);

  const openCreateModal = () => {
    setEditingPackage(null);
    setName('');
    setChannel('SMS');
    setCredits(1000);
    setPrice(299);
    setGstPercentage(18.0);
    setDescription('');
    setFormError('');
    setIsModalOpen(true);
  };

  const openEditModal = (pkg: CreditPackage) => {
    setEditingPackage(pkg);
    setName(pkg.name);
    setChannel(pkg.channel);
    setCredits(pkg.credits);
    setPrice(pkg.price);
    setGstPercentage(pkg.gstPercentage);
    setDescription(pkg.description || '');
    setFormError('');
    setIsModalOpen(true);
  };

  const handleToggleStatus = async (pkg: CreditPackage) => {
    const newStatus: PackageStatus = pkg.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await api.patch(`/admin/credit-packages/${pkg.id}/status`, { status: newStatus });
      fetchPackages();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update status');
    }
  };

  const handleSavePackage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormError('Package name is required');
      return;
    }
    if (credits <= 0) {
      setFormError('Credits must be greater than zero');
      return;
    }
    if (price <= 0) {
      setFormError('Base price must be greater than zero');
      return;
    }

    setSaving(true);
    setFormError('');

    try {
      if (editingPackage) {
        await api.put(`/admin/credit-packages/${editingPackage.id}`, {
          name: name.trim(),
          channel,
          credits: Number(credits),
          price: Number(price),
          gstPercentage: Number(gstPercentage),
          description: description.trim() || undefined,
        });
      } else {
        await api.post('/admin/credit-packages', {
          name: name.trim(),
          channel,
          credits: Number(credits),
          price: Number(price),
          gstPercentage: Number(gstPercentage),
          description: description.trim() || undefined,
        });
      }

      setIsModalOpen(false);
      fetchPackages();
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Failed to save package');
    } finally {
      setSaving(false);
    }
  };

  // Dynamic preview calculation in modal
  const calcGstAmount = Number(price) * (Number(gstPercentage) / 100);
  const calcFinalPrice = Number(price) + calcGstAmount;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white tracking-tight">Credit Packages</h1>
            <span className="px-2.5 py-0.5 bg-[#7B35E8]/15 border border-[#7B35E8]/30 rounded-full text-xs font-semibold text-[#7B35E8]">
              {packages.length} Configured
            </span>
          </div>
          <p className="text-xs text-[#9E9E9E] mt-1">
            Configure prepaid communication credit pricing, volume tiers, and dynamic GST taxation
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="flex items-center gap-1.5 px-4 py-2 bg-[#7B35E8] hover:bg-[#6824D3] text-white rounded-xl text-xs font-semibold shadow-lg shadow-[#7B35E8]/20 transition-all self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          Create Package
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Packages Grid */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-2 text-[#9E9E9E]">
          <div className="w-7 h-7 border-2 border-[#7B35E8] border-t-transparent rounded-full animate-spin" />
          <span className="text-xs">Loading packages...</span>
        </div>
      ) : packages.length === 0 ? (
        <div className="py-20 text-center border border-dashed border-[#2A2A40] rounded-2xl bg-[#12121A]">
          <Package className="w-10 h-10 mx-auto text-[#6E6E82] mb-3" />
          <h3 className="text-base font-bold text-white">No Packages Configured</h3>
          <p className="text-xs text-[#9E9E9E] max-w-sm mx-auto mt-1 mb-4">
            Create credit packages for SMS, WhatsApp, and Email that vendors can purchase.
          </p>
          <button
            onClick={openCreateModal}
            className="px-4 py-2 bg-[#7B35E8] hover:bg-[#6824D3] text-white rounded-xl text-xs font-semibold"
          >
            Create First Package
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {packages.map((pkg) => {
            const isActive = pkg.status === 'ACTIVE';
            return (
              <div
                key={pkg.id}
                className="p-5 bg-[#12121A] border border-[#232336] rounded-2xl flex flex-col justify-between space-y-4 hover:border-[#383854] transition-all"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          pkg.channel === 'SMS'
                            ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                            : pkg.channel === 'WHATSAPP'
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                            : 'bg-purple-500/15 text-purple-400 border border-purple-500/30'
                        }`}
                      >
                        {pkg.channel}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(pkg)}
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold transition-colors ${
                          isActive
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20'
                            : 'bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20'
                        }`}
                        title="Click to toggle status"
                      >
                        {pkg.status}
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => openEditModal(pkg)}
                      className="p-1.5 text-[#9E9E9E] hover:text-[#7B35E8] rounded-lg hover:bg-[#1A1A2E] transition-colors"
                      title="Edit Package"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-white">{pkg.name}</h3>
                    {pkg.description && (
                      <p className="text-xs text-[#9E9E9E] mt-1 line-clamp-2">{pkg.description}</p>
                    )}
                  </div>

                  <div className="p-3 bg-[#1A1A2E]/50 rounded-xl space-y-1.5 text-xs">
                    <div className="flex justify-between text-[#D1D1DB]">
                      <span>Volume:</span>
                      <strong className="text-white font-mono">
                        {pkg.credits.toLocaleString()} Credits
                      </strong>
                    </div>
                    <div className="flex justify-between text-[#D1D1DB]">
                      <span>Base Price:</span>
                      <span className="font-mono text-white">₹{Number(pkg.price || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-[#D1D1DB]">
                      <span>GST ({pkg.gstPercentage}%):</span>
                      <span className="font-mono text-white">₹{Number(pkg.gstAmount || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between pt-1 border-t border-[#232336] font-bold text-white">
                      <span>Final Price:</span>
                      <span className="font-mono text-emerald-400 text-sm">
                        ₹{Number(pkg.finalPrice || 0).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-[#1A1A2E] flex items-center justify-between text-[11px] text-[#9E9E9E]">
                  <span>Purchased: {pkg.purchaseCount || 0} times</span>
                  <span>Updated {new Date(pkg.updatedAt).toLocaleDateString()}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE / EDIT PACKAGE MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-lg bg-[#12121A] border border-[#232336] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#1A1A2E]">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-[#7B35E8]/10 rounded-xl text-[#7B35E8]">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">
                    {editingPackage ? 'Edit Credit Package' : 'Create Credit Package'}
                  </h2>
                  <p className="text-xs text-[#9E9E9E]">Configure volume, pricing, and dynamic GST</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-[#9E9E9E] hover:text-white rounded-lg hover:bg-[#1A1A2E] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePackage} className="flex-1 overflow-y-auto p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs">
                  {formError}
                </div>
              )}

              <div>
                <label className="text-xs font-medium text-[#9E9E9E]">Package Name *</label>
                <input
                  type="text"
                  placeholder="e.g. SMS Starter / WhatsApp Growth"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full mt-1 px-3 py-2 bg-[#1A1A2E] border border-[#2A2A40] rounded-xl text-white text-xs focus:outline-none focus:border-[#7B35E8]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-[#9E9E9E]">Channel *</label>
                  <select
                    value={channel}
                    onChange={(e) => setChannel(e.target.value as WalletChannel)}
                    className="w-full mt-1 px-3 py-2 bg-[#1A1A2E] border border-[#2A2A40] rounded-xl text-white text-xs focus:outline-none focus:border-[#7B35E8]"
                  >
                    <option value="SMS">SMS</option>
                    <option value="WHATSAPP">WhatsApp</option>
                    <option value="EMAIL">Email</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-[#9E9E9E]">Credits Included *</label>
                  <input
                    type="number"
                    min={1}
                    value={credits}
                    onChange={(e) => setCredits(Number(e.target.value))}
                    required
                    className="w-full mt-1 px-3 py-2 bg-[#1A1A2E] border border-[#2A2A40] rounded-xl text-white text-xs focus:outline-none focus:border-[#7B35E8]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-[#9E9E9E]">Base Price (₹ INR) *</label>
                  <input
                    type="number"
                    min={1}
                    step="0.01"
                    value={price}
                    onChange={(e) => setPrice(Number(e.target.value))}
                    required
                    className="w-full mt-1 px-3 py-2 bg-[#1A1A2E] border border-[#2A2A40] rounded-xl text-white text-xs focus:outline-none focus:border-[#7B35E8]"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-[#9E9E9E]">GST Percentage (%) *</label>
                  <input
                    type="number"
                    min={0}
                    step="0.5"
                    value={gstPercentage}
                    onChange={(e) => setGstPercentage(Number(e.target.value))}
                    required
                    className="w-full mt-1 px-3 py-2 bg-[#1A1A2E] border border-[#2A2A40] rounded-xl text-white text-xs focus:outline-none focus:border-[#7B35E8]"
                  />
                </div>
              </div>

              {/* Dynamic Price Calculation Preview Box */}
              <div className="p-3 bg-[#7B35E8]/10 border border-[#7B35E8]/30 rounded-xl space-y-1 text-xs">
                <span className="text-[10px] font-semibold text-[#7B35E8] uppercase tracking-wider block">
                  Dynamic Price Calculation:
                </span>
                <div className="flex justify-between text-white">
                  <span>Base Price:</span>
                  <span className="font-mono">₹{Number(price).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-white">
                  <span>GST ({gstPercentage}%):</span>
                  <span className="font-mono">₹{calcGstAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-[#7B35E8]/20 font-bold text-[#7B35E8]">
                  <span>Final Vendor Payable Price:</span>
                  <span className="font-mono text-sm">₹{calcFinalPrice.toFixed(2)}</span>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-[#9E9E9E]">Description (Optional)</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Target audience or usage recommendation..."
                  className="w-full mt-1 px-3 py-2 bg-[#1A1A2E] border border-[#2A2A40] rounded-xl text-white text-xs focus:outline-none focus:border-[#7B35E8]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#1A1A2E]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-[#1A1A2E] hover:bg-[#232336] text-white rounded-xl text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || !name.trim()}
                  className="px-5 py-2 bg-[#7B35E8] hover:bg-[#6824D3] disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-lg shadow-[#7B35E8]/20 transition-all"
                >
                  {saving ? 'Saving...' : editingPackage ? 'Save Changes' : 'Create Package'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

