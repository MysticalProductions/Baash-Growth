import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Tag as TagIcon,
  ShieldCheck,
  ShieldAlert,
  Clock,
  Send,
  MessageSquare,
  Smartphone,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Edit2,
  Trash2,
  Plus,
  X,
  FileText,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import api from '../../../services/api';
import { Customer, CustomerTag, CustomerConsent, ConsentChannel, ConsentStatus, MessageHistory } from '../../../types/crm';
import { CustomerModal } from './CustomerModal';

export const CustomerProfilePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [allTags, setAllTags] = useState<CustomerTag[]>([]);
  const [messages, setMessages] = useState<MessageHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modals & form state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isUpdatingConsent, setIsUpdatingConsent] = useState(false);
  const [selectedChannelForConsent, setSelectedChannelForConsent] = useState<ConsentChannel | null>(null);
  const [newConsentStatus, setNewConsentStatus] = useState<ConsentStatus>('OPTED_IN');
  const [consentSource, setConsentSource] = useState('Customer Direct Request');
  const [consentNotes, setConsentNotes] = useState('');

  // Add tag inline
  const [selectedTagToAdd, setSelectedTagToAdd] = useState('');
  const [channelFilter, setChannelFilter] = useState<'ALL' | 'SMS' | 'WHATSAPP' | 'EMAIL'>('ALL');

  const fetchCustomerDetails = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError('');
    try {
      const [custRes, tagsRes, msgRes] = await Promise.all([
        api.get(`/customers/${id}`),
        api.get('/tags'),
        api.get(`/customers/${id}/messages`),
      ]);
      setCustomer(custRes.data);
      setAllTags(tagsRes.data);
      setMessages(msgRes.data || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load customer profile');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchCustomerDetails();
  }, [fetchCustomerDetails]);

  const handleDeleteCustomer = async () => {
    if (!customer) return;
    if (!window.confirm(`Permanently delete customer "${customer.fullName}"?`)) return;

    try {
      await api.delete(`/customers/${customer.id}`);
      navigate('/vendor/customers');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete customer');
    }
  };

  const handleAddTag = async () => {
    if (!selectedTagToAdd || !customer) return;
    try {
      await api.post('/customers/bulk-tag', {
        customerIds: [customer.id],
        tagId: selectedTagToAdd,
        action: 'ASSIGN',
      });
      setSelectedTagToAdd('');
      fetchCustomerDetails();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to assign tag');
    }
  };

  const handleRemoveTag = async (tagId: string) => {
    if (!customer) return;
    try {
      await api.post('/customers/bulk-tag', {
        customerIds: [customer.id],
        tagId,
        action: 'REMOVE',
      });
      fetchCustomerDetails();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to remove tag');
    }
  };

  const openConsentModal = (channel: ConsentChannel, currentStatus?: ConsentStatus) => {
    setSelectedChannelForConsent(channel);
    setNewConsentStatus(currentStatus || 'OPTED_IN');
    setConsentSource('Customer Direct Request');
    setConsentNotes('');
    setIsUpdatingConsent(true);
  };

  const handleSaveConsent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer || !selectedChannelForConsent) return;

    try {
      await api.put(`/customers/${customer.id}/consent`, {
        channel: selectedChannelForConsent,
        status: newConsentStatus,
        source: consentSource,
        notes: consentNotes,
      });
      setIsUpdatingConsent(false);
      fetchCustomerDetails();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update consent status');
    }
  };

  const getConsentRecord = (channel: ConsentChannel): CustomerConsent | undefined => {
    return customer?.consents?.find((c) => c.channel === channel);
  };

  const filteredMessages = messages.filter((m) => {
    if (channelFilter === 'ALL') return true;
    return m.channel === channelFilter;
  });

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center gap-3 text-[#9E9E9E]">
        <div className="w-8 h-8 border-2 border-[#7B35E8] border-t-transparent rounded-full animate-spin" />
        <span className="text-sm">Loading customer profile...</span>
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div className="py-16 text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-red-500/10 text-red-400 mx-auto flex items-center justify-center">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-white">{error || 'Customer not found'}</h2>
        <Link
          to="/vendor/customers"
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#1A1A2E] text-white rounded-xl text-xs font-semibold"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Customer List
        </Link>
      </div>
    );
  }

  // Available tags to add
  const assignedTagIds = new Set(customer.tags?.map((t) => t.id) || []);
  const availableTags = allTags.filter((t) => !assignedTagIds.has(t.id));

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Link
          to="/vendor/customers"
          className="inline-flex items-center gap-2 text-xs text-[#9E9E9E] hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Customers
        </Link>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsEditModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-[#1A1A2E] hover:bg-[#232336] text-white border border-[#2A2A40] rounded-xl text-xs font-semibold transition-colors"
          >
            <Edit2 className="w-3.5 h-3.5 text-[#7B35E8]" />
            Edit Profile
          </button>
          <button
            onClick={handleDeleteCustomer}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-xl text-xs font-semibold transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete
          </button>
        </div>
      </div>

      {/* Main Profile Header Card */}
      <div className="p-6 bg-[#12121A] border border-[#232336] rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xl">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#7B35E8] to-[#F72585] text-white flex items-center justify-center font-bold text-2xl shadow-lg shadow-[#7B35E8]/30 flex-shrink-0">
            {customer.fullName.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-white tracking-tight">{customer.fullName}</h1>
              {customer.gender && (
                <span className="px-2 py-0.5 bg-[#1A1A2E] text-[#9E9E9E] border border-[#2A2A40] rounded-full text-[10px] font-semibold uppercase">
                  {customer.gender}
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-[#9E9E9E] mt-1.5">
              <span>Customer ID: <code className="text-[#D1D1DB]">{customer.id.slice(0, 8)}</code></span>
              <span>•</span>
              <span>Source: <strong className="text-[#D1D1DB]">{customer.source}</strong></span>
              <span>•</span>
              <span>Registered: {new Date(customer.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Details & Tags */}
        <div className="space-y-6">
          {/* Contact Details Card */}
          <div className="p-5 bg-[#12121A] border border-[#232336] rounded-2xl space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Contact Information</h3>
            
            <div className="space-y-3 text-xs">
              <div className="flex items-center gap-3 p-3 bg-[#1A1A2E]/50 border border-[#2A2A40] rounded-xl">
                <div className="p-2 bg-[#7B35E8]/10 rounded-lg text-[#7B35E8]">
                  <Phone className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[#9E9E9E] block text-[10px]">Mobile Phone</span>
                  <span className="font-mono text-white text-sm">
                    {customer.phone || <em className="text-[#6E6E82] not-italic">Not provided</em>}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-[#1A1A2E]/50 border border-[#2A2A40] rounded-xl">
                <div className="p-2 bg-[#F72585]/10 rounded-lg text-[#F72585]">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[#9E9E9E] block text-[10px]">Email Address</span>
                  <span className="text-white text-sm">
                    {customer.email || <em className="text-[#6E6E82] not-italic">Not provided</em>}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-[#1A1A2E]/50 border border-[#2A2A40] rounded-xl">
                <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400">
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[#9E9E9E] block text-[10px]">Location</span>
                  <span className="text-white text-sm">
                    {[customer.city, customer.state].filter(Boolean).join(', ') || (
                      <em className="text-[#6E6E82] not-italic">Not provided</em>
                    )}
                  </span>
                </div>
              </div>

              {customer.dateOfBirth && (
                <div className="flex items-center gap-3 p-3 bg-[#1A1A2E]/50 border border-[#2A2A40] rounded-xl">
                  <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[#9E9E9E] block text-[10px]">Date of Birth</span>
                    <span className="text-white text-sm">{customer.dateOfBirth}</span>
                  </div>
                </div>
              )}
            </div>

            {customer.notes && (
              <div className="p-3 bg-[#1A1A2E]/30 border border-[#2A2A40] rounded-xl">
                <span className="text-[10px] text-[#9E9E9E] uppercase tracking-wider block font-semibold mb-1">
                  Customer Notes
                </span>
                <p className="text-xs text-[#D1D1DB] leading-relaxed whitespace-pre-wrap">{customer.notes}</p>
              </div>
            )}
          </div>

          {/* Tags Card */}
          <div className="p-5 bg-[#12121A] border border-[#232336] rounded-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Tags</h3>
              <span className="text-xs text-[#9E9E9E]">{customer.tags?.length || 0} assigned</span>
            </div>

            {/* Tag Badges */}
            <div className="flex flex-wrap gap-1.5">
              {customer.tags && customer.tags.length > 0 ? (
                customer.tags.map((tag) => (
                  <span
                    key={tag.id}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
                    style={{
                      backgroundColor: `${tag.color || '#7B35E8'}15`,
                      color: tag.color || '#7B35E8',
                      border: `1px solid ${tag.color || '#7B35E8'}30`,
                    }}
                  >
                    {tag.name}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag.id)}
                      className="hover:text-red-400 rounded-full p-0.5 transition-colors"
                      title="Remove tag"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))
              ) : (
                <p className="text-xs text-[#6E6E82]">No tags assigned to this customer.</p>
              )}
            </div>

            {/* Add tag dropdown */}
            {availableTags.length > 0 && (
              <div className="flex items-center gap-2 pt-2 border-t border-[#232336]">
                <select
                  value={selectedTagToAdd}
                  onChange={(e) => setSelectedTagToAdd(e.target.value)}
                  className="flex-1 px-3 py-1.5 bg-[#1A1A2E] border border-[#2A2A40] rounded-xl text-white text-xs focus:outline-none focus:border-[#7B35E8]"
                >
                  <option value="">Select a tag to add...</option>
                  {availableTags.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleAddTag}
                  disabled={!selectedTagToAdd}
                  className="px-3 py-1.5 bg-[#7B35E8] hover:bg-[#6824D3] disabled:opacity-50 text-white rounded-xl text-xs font-semibold transition-colors"
                >
                  Add
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Consents & Communication History */}
        <div className="lg:col-span-2 space-y-6">
          {/* Channel Marketing Consent Card */}
          <div className="p-5 bg-[#12121A] border border-[#232336] rounded-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#7B35E8]" />
                  Marketing Consent Management
                </h3>
                <p className="text-xs text-[#9E9E9E] mt-0.5">
                  Separate opt-in records for promotional campaigns
                </p>
              </div>
            </div>

            {/* Channel Consent Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {(['SMS', 'WHATSAPP', 'EMAIL'] as ConsentChannel[]).map((channel) => {
                const rec = getConsentRecord(channel);
                const status = rec?.status || 'UNKNOWN';

                let badgeColor = 'bg-[#232336] text-[#9E9E9E] border-[#2A2A40]';
                let Icon = HelpCircle;
                let statusLabel = 'Unknown';

                if (status === 'OPTED_IN') {
                  badgeColor = 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
                  Icon = CheckCircle2;
                  statusLabel = 'Opted In';
                } else if (status === 'OPTED_OUT') {
                  badgeColor = 'bg-red-500/15 text-red-400 border-red-500/30';
                  Icon = XCircle;
                  statusLabel = 'Opted Out';
                }

                return (
                  <div
                    key={channel}
                    className="p-4 bg-[#1A1A2E]/50 border border-[#2A2A40] rounded-xl flex flex-col justify-between space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white tracking-wider">{channel}</span>
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${badgeColor}`}
                      >
                        <Icon className="w-3 h-3" /> {statusLabel}
                      </span>
                    </div>

                    <div className="text-[11px] text-[#9E9E9E] space-y-1">
                      <div>
                        Source: <span className="text-white">{rec?.source || 'Default/System'}</span>
                      </div>
                      <div>
                        Updated: <span className="text-white">{rec ? new Date(rec.updatedAt).toLocaleDateString() : '—'}</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => openConsentModal(channel, status)}
                      className="w-full py-1.5 px-3 bg-[#12121A] hover:bg-[#232336] border border-[#2A2A40] text-white rounded-lg text-xs font-medium transition-colors"
                    >
                      Update Consent
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Legal Notice */}
            <div className="p-3 bg-[#161622] border border-[#2A2A40] rounded-xl flex items-start gap-2.5 text-xs text-[#9E9E9E]">
              <ShieldAlert className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <p>
                <strong>Suppression Rule:</strong> If a customer is marked as <strong>OPTED_OUT</strong>, they will be automatically filtered out from promotional SMS, WhatsApp, or Email broadcasts on that channel. Transactional alerts are handled separately under applicable regulations.
              </p>
            </div>
          </div>

          {/* Communication History Section */}
          <div className="p-5 bg-[#12121A] border border-[#232336] rounded-2xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#F72585]" />
                  Communication History
                </h3>
                <p className="text-xs text-[#9E9E9E] mt-0.5">
                  Timeline of SMS, WhatsApp, and Email messages sent to this customer
                </p>
              </div>

              {/* Channel filter tabs */}
              <div className="flex items-center gap-1 p-1 bg-[#1A1A2E] border border-[#2A2A40] rounded-xl text-xs">
                {(['ALL', 'SMS', 'WHATSAPP', 'EMAIL'] as const).map((ch) => (
                  <button
                    key={ch}
                    onClick={() => setChannelFilter(ch)}
                    className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                      channelFilter === ch
                        ? 'bg-[#7B35E8] text-white'
                        : 'text-[#9E9E9E] hover:text-white'
                    }`}
                  >
                    {ch}
                  </button>
                ))}
              </div>
            </div>

            {/* Timeline or Message list */}
            {filteredMessages.length === 0 ? (
              <div className="py-12 text-center text-[#6E6E82] border border-dashed border-[#2A2A40] rounded-xl">
                <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm font-semibold text-white">No communication history</p>
                <p className="text-xs text-[#9E9E9E] mt-0.5">
                  Messages and campaign delivery logs will appear here when campaigns are sent.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className="p-4 bg-[#1A1A2E]/40 border border-[#2A2A40] rounded-xl space-y-2 hover:border-[#383854] transition-colors"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            msg.channel === 'SMS'
                              ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                              : msg.channel === 'WHATSAPP'
                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                              : 'bg-purple-500/15 text-purple-400 border border-purple-500/30'
                          }`}
                        >
                          {msg.channel}
                        </span>

                        <span className="text-xs font-semibold text-white">
                          {msg.campaignName || 'Direct Message'}
                        </span>

                        {/* Distinction between DEMO simulation and ACTUAL message */}
                        {msg.isDemo ? (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/25">
                            DEMO RECORD
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/10 text-emerald-300 border border-emerald-500/25">
                            ACTUAL DELIVERY
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-[11px] text-[#9E9E9E]">
                        <span>{new Date(msg.sentAt || msg.createdAt).toLocaleString()}</span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                            msg.status === 'DELIVERED' || msg.status === 'READ'
                              ? 'bg-emerald-500/15 text-emerald-400'
                              : msg.status === 'SENT'
                              ? 'bg-blue-500/15 text-blue-400'
                              : 'bg-red-500/15 text-red-400'
                          }`}
                        >
                          {msg.status}
                        </span>
                      </div>
                    </div>

                    <div className="p-2.5 bg-[#12121A] rounded-lg text-xs text-[#D1D1DB] leading-relaxed font-mono whitespace-pre-wrap">
                      {msg.content || msg.messageContent}
                    </div>

                    {(msg.providerMessageId || msg.providerId) && (
                      <div className="text-[10px] text-[#6E6E82]">
                        Gateway ID: <code className="text-[#9E9E9E]">{msg.providerMessageId || msg.providerId}</code>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit Customer Profile Modal */}
      <CustomerModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        customerToEdit={customer}
        onCustomerSaved={fetchCustomerDetails}
      />

      {/* Update Consent Modal */}
      {isUpdatingConsent && selectedChannelForConsent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-md bg-[#12121A] border border-[#232336] rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#232336] pb-3">
              <h3 className="text-base font-bold text-white">
                Update {selectedChannelForConsent} Marketing Consent
              </h3>
              <button
                onClick={() => setIsUpdatingConsent(false)}
                className="text-[#9E9E9E] hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveConsent} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[#9E9E9E]">Consent Status</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['OPTED_IN', 'OPTED_OUT', 'UNKNOWN'] as ConsentStatus[]).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setNewConsentStatus(st)}
                      className={`py-2 px-2 rounded-xl text-xs font-semibold border transition-all ${
                        newConsentStatus === st
                          ? st === 'OPTED_IN'
                            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500'
                            : st === 'OPTED_OUT'
                            ? 'bg-red-500/20 text-red-400 border-red-500'
                            : 'bg-slate-700/40 text-white border-slate-500'
                          : 'bg-[#1A1A2E] text-[#9E9E9E] border-[#2A2A40]'
                      }`}
                    >
                      {st.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[#9E9E9E]">Consent Source / Lawful Basis</label>
                <input
                  type="text"
                  value={consentSource}
                  onChange={(e) => setConsentSource(e.target.value)}
                  placeholder="e.g. In-store form, Website opt-in, Verbal request"
                  required
                  className="w-full px-3 py-2 bg-[#1A1A2E] border border-[#2A2A40] rounded-xl text-white text-xs focus:outline-none focus:border-[#7B35E8]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[#9E9E9E]">Notes / Evidence Reference</label>
                <textarea
                  value={consentNotes}
                  onChange={(e) => setConsentNotes(e.target.value)}
                  placeholder="Optional notes regarding this consent change..."
                  rows={2}
                  className="w-full px-3 py-2 bg-[#1A1A2E] border border-[#2A2A40] rounded-xl text-white text-xs focus:outline-none focus:border-[#7B35E8]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#232336]">
                <button
                  type="button"
                  onClick={() => setIsUpdatingConsent(false)}
                  className="px-4 py-2 bg-[#1A1A2E] hover:bg-[#232336] text-white rounded-xl text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#7B35E8] hover:bg-[#6824D3] text-white rounded-xl text-xs font-semibold shadow-lg shadow-[#7B35E8]/20"
                >
                  Save Consent
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
