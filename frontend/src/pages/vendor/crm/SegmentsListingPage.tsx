import React, { useState, useEffect, useCallback } from 'react';
import {
  Layers,
  Plus,
  Edit2,
  Trash2,
  Users,
  Eye,
  X,
  Check,
  Search,
  Filter,
  Sparkles,
  AlertCircle,
  HelpCircle,
  ShieldCheck,
  ChevronRight,
} from 'lucide-react';
import api from '../../../services/api';
import { CustomerSegment, CustomerTag, Customer } from '../../../types/crm';

export const SegmentsListingPage: React.FC = () => {
  const [segments, setSegments] = useState<CustomerSegment[]>([]);
  const [tags, setTags] = useState<CustomerTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSegment, setEditingSegment] = useState<CustomerSegment | null>(null);

  // View matching customers modal
  const [viewingSegment, setViewingSegment] = useState<CustomerSegment | null>(null);
  const [matchingCustomers, setMatchingCustomers] = useState<Customer[]>([]);
  const [loadingMatching, setLoadingMatching] = useState(false);

  // Form state for Segment Builder
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [filters, setFilters] = useState<Record<string, any>>({});
  const [previewCount, setPreviewCount] = useState<number | null>(null);
  const [previewSample, setPreviewSample] = useState<Customer[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const fetchSegmentsAndTags = async () => {
    setLoading(true);
    setError('');
    try {
      const [segRes, tagsRes] = await Promise.all([
        api.get('/segments'),
        api.get('/tags'),
      ]);
      setSegments(segRes.data || []);
      setTags(tagsRes.data || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load customer segments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSegmentsAndTags();
  }, []);

  // Live preview counter debounce when editing filters
  useEffect(() => {
    if (!isModalOpen) return;

    const timer = setTimeout(async () => {
      setPreviewLoading(true);
      try {
        const res = await api.post('/segments/preview', { filters });
        const prevData = res?.matchedCount !== undefined ? res : (res?.data || {});
        setPreviewCount(prevData.matchedCount ?? 0);
        setPreviewSample(prevData.sampleCustomers || []);
      } catch (err) {
        console.error('Failed to preview segment filters', err);
      } finally {
        setPreviewLoading(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [filters, isModalOpen]);

  const openCreateModal = () => {
    setEditingSegment(null);
    setName('');
    setDescription('');
    setFilters({});
    setPreviewCount(null);
    setPreviewSample([]);
    setFormError('');
    setIsModalOpen(true);
  };

  const openEditModal = (seg: CustomerSegment) => {
    setEditingSegment(seg);
    setName(seg.name);
    setDescription(seg.description || '');
    setFilters(seg.filters || {});
    setFormError('');
    setIsModalOpen(true);
  };

  const handleDeleteSegment = async (id: string, segName: string) => {
    if (!window.confirm(`Delete segment "${segName}"? Customer records will remain intact.`)) {
      return;
    }
    try {
      await api.delete(`/segments/${id}`);
      fetchSegmentsAndTags();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete segment');
    }
  };

  const handleOpenViewCustomers = async (seg: CustomerSegment) => {
    setViewingSegment(seg);
    setLoadingMatching(true);
    try {
      const res = await api.get(`/segments/${seg.id}/customers`);
      const matchData = res?.customers ? res : (res?.data || {});
      setMatchingCustomers(matchData.customers || []);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to fetch matching customers');
    } finally {
      setLoadingMatching(false);
    }
  };

  const handleSaveSegment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormError('Segment name is required');
      return;
    }

    setSaving(true);
    setFormError('');
    try {
      // Clean empty keys from filters
      const cleanFilters: Record<string, any> = {};
      Object.keys(filters).forEach((key) => {
        const val = filters[key];
        if (val !== '' && val !== null && val !== undefined) {
          if (Array.isArray(val) && val.length === 0) return;
          cleanFilters[key] = val;
        }
      });

      if (editingSegment) {
        await api.put(`/segments/${editingSegment.id}`, {
          name: name.trim(),
          description: description.trim(),
          filters: cleanFilters,
        });
      } else {
        await api.post('/segments', {
          name: name.trim(),
          description: description.trim(),
          filters: cleanFilters,
        });
      }

      setIsModalOpen(false);
      fetchSegmentsAndTags();
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Failed to save segment');
    } finally {
      setSaving(false);
    }
  };

  // Filter modifier helpers
  const handleFilterChange = (key: string, value: any) => {
    setFilters((prev) => {
      const updated = { ...prev };
      if (value === '' || value === null || value === undefined) {
        delete updated[key];
      } else {
        updated[key] = value;
      }
      return updated;
    });
  };

  const toggleTagInFilter = (tagId: string) => {
    const currentTagIds: string[] = filters.tagIds || [];
    const updated = currentTagIds.includes(tagId)
      ? currentTagIds.filter((id) => id !== tagId)
      : [...currentTagIds, tagId];
    handleFilterChange('tagIds', updated.length > 0 ? updated : undefined);
  };

  const renderFilterChips = (f: Record<string, any>) => {
    const chips: string[] = [];
    if (f.city) chips.push(`City: ${f.city}`);
    if (f.state) chips.push(`State: ${f.state}`);
    if (f.gender) chips.push(`Gender: ${f.gender}`);
    if (f.source) chips.push(`Source: ${f.source}`);
    if (f.hasPhone !== undefined) chips.push(`Has Phone: ${f.hasPhone ? 'Yes' : 'No'}`);
    if (f.hasEmail !== undefined) chips.push(`Has Email: ${f.hasEmail ? 'Yes' : 'No'}`);
    if (f.smsConsent) chips.push(`SMS: ${f.smsConsent}`);
    if (f.whatsAppConsent) chips.push(`WhatsApp: ${f.whatsAppConsent}`);
    if (f.emailConsent) chips.push(`Email: ${f.emailConsent}`);
    if (f.tagIds && Array.isArray(f.tagIds)) {
      const tagNames = f.tagIds
        .map((tid: string) => tags.find((t) => t.id === tid)?.name || tid)
        .join(', ');
      chips.push(`Tags: [${tagNames}]`);
    }

    if (chips.length === 0) {
      return <span className="text-xs text-[#9E9E9E] italic">All Customers (No filters)</span>;
    }

    return (
      <div className="flex flex-wrap gap-1.5">
        {chips.map((chip, idx) => (
          <span
            key={idx}
            className="px-2 py-0.5 bg-[#1A1A2E] text-[#D1D1DB] border border-[#2A2A40] rounded-lg text-[11px] font-mono"
          >
            {chip}
          </span>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white tracking-tight">Customer Segments</h1>
            <span className="px-2.5 py-0.5 bg-[#7B35E8]/15 border border-[#7B35E8]/30 rounded-full text-xs font-semibold text-[#7B35E8]">
              {segments.length} Saved
            </span>
          </div>
          <p className="text-xs text-[#9E9E9E] mt-1">
            Build dynamic customer groups using criteria. Matches are evaluated live from current data.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="flex items-center gap-1.5 px-4 py-2 bg-[#7B35E8] hover:bg-[#6824D3] text-white rounded-xl text-xs font-semibold shadow-lg shadow-[#7B35E8]/20 transition-all self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          Create Segment
        </button>
      </div>

      {/* Segments List */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-2 text-[#9E9E9E]">
          <div className="w-7 h-7 border-2 border-[#7B35E8] border-t-transparent rounded-full animate-spin" />
          <span className="text-xs">Loading segments...</span>
        </div>
      ) : error ? (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      ) : segments.length === 0 ? (
        <div className="py-20 text-center border border-dashed border-[#2A2A40] rounded-2xl bg-[#12121A]">
          <Layers className="w-10 h-10 mx-auto text-[#6E6E82] mb-3" />
          <h3 className="text-base font-bold text-white">No Segments Created Yet</h3>
          <p className="text-xs text-[#9E9E9E] max-w-sm mx-auto mt-1 mb-4">
            Segments allow you to target specific audiences like "Delhi VIP Customers" or "Active WhatsApp Users".
          </p>
          <button
            onClick={openCreateModal}
            className="px-4 py-2 bg-[#7B35E8] hover:bg-[#6824D3] text-white rounded-xl text-xs font-semibold"
          >
            Create Your First Segment
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(Array.isArray(segments) ? segments : []).map((seg) => (
            <div
              key={seg.id}
              className="p-5 bg-[#12121A] border border-[#232336] rounded-2xl space-y-4 hover:border-[#383854] transition-all flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      {seg.name}
                    </h3>
                    {seg.description && (
                      <p className="text-xs text-[#9E9E9E] mt-0.5 line-clamp-2">{seg.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => openEditModal(seg)}
                      className="p-1.5 text-[#9E9E9E] hover:text-[#7B35E8] rounded-lg hover:bg-[#1A1A2E] transition-colors"
                      title="Edit Segment"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteSegment(seg.id, seg.name)}
                      className="p-1.5 text-[#9E9E9E] hover:text-red-400 rounded-lg hover:bg-[#1A1A2E] transition-colors"
                      title="Delete Segment"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Conditions summary */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-[#9E9E9E]">
                    Filter Rules (AND)
                  </span>
                  {renderFilterChips(seg.filters || {})}
                </div>
              </div>

              {/* Footer with Live Match Count & Customer Preview Button */}
              <div className="pt-3 border-t border-[#1A1A2E] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs text-[#D1D1DB]">
                    <strong className="text-white text-sm font-bold">{seg.matchedCustomerCount ?? 0}</strong>{' '}
                    matching customer(s)
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => handleOpenViewCustomers(seg)}
                  className="flex items-center gap-1 text-xs text-[#7B35E8] hover:text-[#9A5BFF] font-semibold transition-colors"
                >
                  <Eye className="w-3.5 h-3.5" />
                  View Customers
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CREATE / EDIT SEGMENT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-2xl bg-[#12121A] border border-[#232336] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#1A1A2E]">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-[#7B35E8]/10 rounded-xl text-[#7B35E8]">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">
                    {editingSegment ? 'Edit Customer Segment' : 'Create Customer Segment'}
                  </h2>
                  <p className="text-xs text-[#9E9E9E]">Build dynamic filters evaluated on real customer data</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-[#9E9E9E] hover:text-white rounded-lg hover:bg-[#1A1A2E] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form Body */}
            <form onSubmit={handleSaveSegment} className="flex-1 overflow-y-auto p-6 space-y-5">
              {formError && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs">
                  {formError}
                </div>
              )}

              {/* Name & Description */}
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-[#9E9E9E]">Segment Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. Delhi VIP Customers"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="w-full mt-1 px-3 py-2 bg-[#1A1A2E] border border-[#2A2A40] rounded-xl text-white placeholder-[#6E6E82] text-xs focus:outline-none focus:border-[#7B35E8]"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-[#9E9E9E]">Description (Optional)</label>
                  <input
                    type="text"
                    placeholder="Brief description of who belongs in this segment..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full mt-1 px-3 py-2 bg-[#1A1A2E] border border-[#2A2A40] rounded-xl text-white placeholder-[#6E6E82] text-xs focus:outline-none focus:border-[#7B35E8]"
                  />
                </div>
              </div>

              {/* Filter Criteria Builder */}
              <div className="p-4 bg-[#1A1A2E]/50 border border-[#2A2A40] rounded-xl space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#9E9E9E] flex items-center gap-1.5">
                  <Filter className="w-3.5 h-3.5 text-[#7B35E8]" />
                  Matching Conditions (AND-based)
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  {/* City */}
                  <div>
                    <label className="text-[#9E9E9E] block mb-1">City</label>
                    <input
                      type="text"
                      placeholder="e.g. Delhi"
                      value={filters.city || ''}
                      onChange={(e) => handleFilterChange('city', e.target.value)}
                      className="w-full px-3 py-1.5 bg-[#12121A] border border-[#2A2A40] rounded-lg text-white text-xs focus:outline-none focus:border-[#7B35E8]"
                    />
                  </div>

                  {/* State */}
                  <div>
                    <label className="text-[#9E9E9E] block mb-1">State</label>
                    <input
                      type="text"
                      placeholder="e.g. Delhi / Maharashtra"
                      value={filters.state || ''}
                      onChange={(e) => handleFilterChange('state', e.target.value)}
                      className="w-full px-3 py-1.5 bg-[#12121A] border border-[#2A2A40] rounded-lg text-white text-xs focus:outline-none focus:border-[#7B35E8]"
                    />
                  </div>

                  {/* Gender */}
                  <div>
                    <label className="text-[#9E9E9E] block mb-1">Gender</label>
                    <select
                      value={filters.gender || ''}
                      onChange={(e) => handleFilterChange('gender', e.target.value)}
                      className="w-full px-3 py-1.5 bg-[#12121A] border border-[#2A2A40] rounded-lg text-white text-xs focus:outline-none focus:border-[#7B35E8]"
                    >
                      <option value="">Any Gender</option>
                      <option value="MALE">Male</option>
                      <option value="FEMALE">Female</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>

                  {/* Customer Source */}
                  <div>
                    <label className="text-[#9E9E9E] block mb-1">Customer Source</label>
                    <select
                      value={filters.source || ''}
                      onChange={(e) => handleFilterChange('source', e.target.value)}
                      className="w-full px-3 py-1.5 bg-[#12121A] border border-[#2A2A40] rounded-lg text-white text-xs focus:outline-none focus:border-[#7B35E8]"
                    >
                      <option value="">Any Source</option>
                      <option value="MANUAL_ENTRY">Manual Entry</option>
                      <option value="CSV_IMPORT">CSV Import</option>
                      <option value="WEBSITE">Website</option>
                      <option value="BOOKING">Booking</option>
                      <option value="EVENT_REGISTRATION">Event</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>

                  {/* Has Phone */}
                  <div>
                    <label className="text-[#9E9E9E] block mb-1">Has Mobile Phone</label>
                    <select
                      value={filters.hasPhone === undefined ? '' : String(filters.hasPhone)}
                      onChange={(e) =>
                        handleFilterChange(
                          'hasPhone',
                          e.target.value === '' ? undefined : e.target.value === 'true'
                        )
                      }
                      className="w-full px-3 py-1.5 bg-[#12121A] border border-[#2A2A40] rounded-lg text-white text-xs focus:outline-none focus:border-[#7B35E8]"
                    >
                      <option value="">Any</option>
                      <option value="true">Yes (Has Phone)</option>
                      <option value="false">No (Missing Phone)</option>
                    </select>
                  </div>

                  {/* Has Email */}
                  <div>
                    <label className="text-[#9E9E9E] block mb-1">Has Email Address</label>
                    <select
                      value={filters.hasEmail === undefined ? '' : String(filters.hasEmail)}
                      onChange={(e) =>
                        handleFilterChange(
                          'hasEmail',
                          e.target.value === '' ? undefined : e.target.value === 'true'
                        )
                      }
                      className="w-full px-3 py-1.5 bg-[#12121A] border border-[#2A2A40] rounded-lg text-white text-xs focus:outline-none focus:border-[#7B35E8]"
                    >
                      <option value="">Any</option>
                      <option value="true">Yes (Has Email)</option>
                      <option value="false">No (Missing Email)</option>
                    </select>
                  </div>
                </div>

                {/* Consent Filters */}
                <div className="pt-2 border-t border-[#232336] space-y-2">
                  <label className="text-[11px] font-semibold text-white block">
                    Marketing Consents
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-[10px] text-[#9E9E9E] block mb-1">SMS Consent</label>
                      <select
                        value={filters.smsConsent || ''}
                        onChange={(e) => handleFilterChange('smsConsent', e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-[#12121A] border border-[#2A2A40] rounded-lg text-white text-xs focus:outline-none focus:border-[#7B35E8]"
                      >
                        <option value="">Any Status</option>
                        <option value="OPTED_IN">Opted In</option>
                        <option value="OPTED_OUT">Opted Out</option>
                        <option value="UNKNOWN">Unknown</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] text-[#9E9E9E] block mb-1">WhatsApp Consent</label>
                      <select
                        value={filters.whatsAppConsent || ''}
                        onChange={(e) => handleFilterChange('whatsAppConsent', e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-[#12121A] border border-[#2A2A40] rounded-lg text-white text-xs focus:outline-none focus:border-[#7B35E8]"
                      >
                        <option value="">Any Status</option>
                        <option value="OPTED_IN">Opted In</option>
                        <option value="OPTED_OUT">Opted Out</option>
                        <option value="UNKNOWN">Unknown</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] text-[#9E9E9E] block mb-1">Email Consent</label>
                      <select
                        value={filters.emailConsent || ''}
                        onChange={(e) => handleFilterChange('emailConsent', e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-[#12121A] border border-[#2A2A40] rounded-lg text-white text-xs focus:outline-none focus:border-[#7B35E8]"
                      >
                        <option value="">Any Status</option>
                        <option value="OPTED_IN">Opted In</option>
                        <option value="OPTED_OUT">Opted Out</option>
                        <option value="UNKNOWN">Unknown</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Tags multi-select */}
                {tags.length > 0 && (
                  <div className="pt-2 border-t border-[#232336] space-y-2">
                    <label className="text-[11px] font-semibold text-white block">
                      Include Customers With Any of These Tags:
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {tags.map((t) => {
                        const isChecked = (filters.tagIds || []).includes(t.id);
                        return (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => toggleTagInFilter(t.id)}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all ${
                              isChecked
                                ? 'bg-[#7B35E8]/20 text-[#7B35E8] border-[#7B35E8]'
                                : 'bg-[#12121A] text-[#9E9E9E] border-[#2A2A40]'
                            }`}
                          >
                            <span
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: t.color || '#7B35E8' }}
                            />
                            {t.name}
                            {isChecked && <Check className="w-3 h-3" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Dynamic Live Preview Counter Box */}
              <div className="p-4 bg-[#7B35E8]/10 border border-[#7B35E8]/30 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#7B35E8]" />
                  <span className="text-xs text-white">
                    {previewLoading ? (
                      'Calculating live matching count...'
                    ) : (
                      <>
                        Currently matches{' '}
                        <strong className="text-sm font-bold text-[#7B35E8]">
                          {previewCount ?? 0}
                        </strong>{' '}
                        customer(s) in your database
                      </>
                    )}
                  </span>
                </div>
              </div>
            </form>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-[#1A1A2E] bg-[#0E0E17] flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 bg-[#1A1A2E] hover:bg-[#232336] text-white rounded-xl text-xs font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveSegment}
                disabled={saving || !name.trim()}
                className="px-5 py-2 bg-[#7B35E8] hover:bg-[#6824D3] disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-lg shadow-[#7B35E8]/20 transition-all"
              >
                {saving ? 'Saving...' : editingSegment ? 'Save Changes' : 'Create Segment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW MATCHING CUSTOMERS MODAL */}
      {viewingSegment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-3xl bg-[#12121A] border border-[#232336] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#1A1A2E]">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  Matching Customers: {viewingSegment.name}
                </h3>
                <p className="text-xs text-[#9E9E9E] mt-0.5">
                  Live dynamic matches based on segment rules
                </p>
              </div>
              <button
                onClick={() => setViewingSegment(null)}
                className="p-1.5 text-[#9E9E9E] hover:text-white rounded-lg hover:bg-[#1A1A2E]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {loadingMatching ? (
                <div className="py-12 text-center text-[#9E9E9E] text-xs">
                  Evaluating matching customer data...
                </div>
              ) : matchingCustomers.length === 0 ? (
                <div className="py-12 text-center text-[#6E6E82] text-xs">
                  No customers currently match these filter conditions.
                </div>
              ) : (
                <div className="overflow-x-auto border border-[#2A2A40] rounded-xl">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-[#1A1A2E] text-[#9E9E9E] border-b border-[#2A2A40]">
                        <th className="py-2.5 px-3">Name</th>
                        <th className="py-2.5 px-3">Phone</th>
                        <th className="py-2.5 px-3">Email</th>
                        <th className="py-2.5 px-3">City</th>
                        <th className="py-2.5 px-3">Tags</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#232336] text-white">
                      {matchingCustomers.map((c) => (
                        <tr key={c.id} className="hover:bg-[#1A1A2E]/40">
                          <td className="py-2 px-3 font-semibold">{c.fullName}</td>
                          <td className="py-2 px-3 font-mono text-[#D1D1DB]">{c.phone || '—'}</td>
                          <td className="py-2 px-3 text-[#D1D1DB]">{c.email || '—'}</td>
                          <td className="py-2 px-3 text-[#9E9E9E]">{c.city || '—'}</td>
                          <td className="py-2 px-3">
                            <div className="flex flex-wrap gap-1">
                              {c.tags?.map((t) => (
                                <span
                                  key={t.id}
                                  className="px-1.5 py-0.5 rounded text-[10px]"
                                  style={{
                                    backgroundColor: `${t.color || '#7B35E8'}15`,
                                    color: t.color || '#7B35E8',
                                  }}
                                >
                                  {t.name}
                                </span>
                              ))}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-[#1A1A2E] bg-[#0E0E17] flex justify-end">
              <button
                onClick={() => setViewingSegment(null)}
                className="px-4 py-2 bg-[#1A1A2E] hover:bg-[#232336] text-white rounded-xl text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
