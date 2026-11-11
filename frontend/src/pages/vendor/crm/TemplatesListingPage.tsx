import React, { useState, useEffect, useRef } from 'react';
import {
  FileText,
  Plus,
  Edit2,
  Trash2,
  Smartphone,
  MessageSquare,
  Mail,
  Copy,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  X,
  Eye,
  Info,
} from 'lucide-react';
import api from '../../../services/api';
import {
  MessageTemplate,
  TemplateChannel,
  WhatsAppCategory,
  MetaApprovalStatus,
} from '../../../types/crm';

const DYNAMIC_VARIABLES = [
  { label: 'Customer Name', key: '{{customer_name}}' },
  { label: 'Customer Phone', key: '{{customer_phone}}' },
  { label: 'Customer Email', key: '{{customer_email}}' },
  { label: 'Customer City', key: '{{customer_city}}' },
  { label: 'Vendor Name', key: '{{vendor_name}}' },
];

const SAMPLE_DATA: Record<string, string> = {
  '{{customer_name}}': 'Rohit Sharma',
  '{{customer_phone}}': '+91 98765 43210',
  '{{customer_email}}': 'rohit.sharma@example.com',
  '{{customer_city}}': 'Bengaluru',
  '{{vendor_name}}': 'Baash Experience Club',
};

export const TemplatesListingPage: React.FC = () => {
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [channelTab, setChannelTab] = useState<'ALL' | TemplateChannel>('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<MessageTemplate | null>(null);

  // Form State
  const [channel, setChannel] = useState<TemplateChannel>('SMS');
  const [name, setName] = useState('');
  const [category, setCategory] = useState<WhatsAppCategory>('MARKETING');
  const [language, setLanguage] = useState('en');
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [plainTextContent, setPlainTextContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const fetchTemplates = async () => {
    setLoading(true);
    setError('');
    try {
      const params = channelTab !== 'ALL' ? { channel: channelTab } : {};
      const res = await api.get('/templates', { params });
      setTemplates(Array.isArray(res) ? res : (res?.data || []));
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, [channelTab]);

  const openCreateModal = () => {
    setEditingTemplate(null);
    setChannel(channelTab === 'ALL' ? 'SMS' : channelTab);
    setName('');
    setCategory('MARKETING');
    setLanguage('en');
    setSubject('');
    setContent('');
    setPlainTextContent('');
    setFormError('');
    setIsModalOpen(true);
  };

  const openEditModal = (tpl: MessageTemplate) => {
    setEditingTemplate(tpl);
    setChannel(tpl.channel);
    setName(tpl.name);
    setCategory(tpl.category || 'MARKETING');
    setLanguage(tpl.language || 'en');
    setSubject(tpl.subject || '');
    setContent(tpl.content);
    setPlainTextContent(tpl.plainTextContent || '');
    setFormError('');
    setIsModalOpen(true);
  };

  const handleDeleteTemplate = async (id: string, tplName: string) => {
    if (!window.confirm(`Delete template "${tplName}"?`)) return;

    try {
      await api.delete(`/templates/${id}`);
      fetchTemplates();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete template');
    }
  };

  const insertVariable = (variableKey: string) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      setContent((prev) => prev + variableKey);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const current = textarea.value;
    const updated = current.substring(0, start) + variableKey + current.substring(end);
    setContent(updated);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + variableKey.length, start + variableKey.length);
    }, 0);
  };

  // SMS segment calculation logic
  const calculateSmsSegments = (text: string) => {
    const isUnicode = /[^\u0000-\u007F]/.test(text);
    const length = text.length;
    let segments = 0;

    if (length === 0) {
      segments = 0;
    } else if (isUnicode) {
      // UCS-2 encoding
      segments = length <= 70 ? 1 : Math.ceil(length / 67);
    } else {
      // GSM-7 encoding
      segments = length <= 160 ? 1 : Math.ceil(length / 153);
    }

    const maxSingle = isUnicode ? 70 : 160;
    return { length, segments, isUnicode, maxSingle };
  };

  // Preview replacement
  const renderPreviewText = (raw: string) => {
    let result = raw;
    Object.keys(SAMPLE_DATA).forEach((key) => {
      result = result.split(key).join(SAMPLE_DATA[key]);
    });
    return result;
  };

  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormError('Template name is required');
      return;
    }
    if (!content.trim()) {
      setFormError('Message content is required');
      return;
    }
    if (channel === 'EMAIL' && !subject.trim()) {
      setFormError('Email subject is required');
      return;
    }

    setSaving(true);
    setFormError('');
    try {
      const payload: any = {
        name: name.trim(),
        content: content.trim(),
        channel,
      };

      if (channel === 'WHATSAPP') {
        payload.category = category;
        payload.language = language;
      }

      if (channel === 'EMAIL') {
        payload.subject = subject.trim();
        payload.plainTextContent = plainTextContent.trim() || undefined;
      }

      if (editingTemplate) {
        await api.put(`/templates/${editingTemplate.id}`, payload);
      } else {
        await api.post('/templates', payload);
      }

      setIsModalOpen(false);
      fetchTemplates();
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  const smsStats = calculateSmsSegments(content);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white tracking-tight">Message Templates</h1>
            <span className="px-2.5 py-0.5 bg-[#7B35E8]/15 border border-[#7B35E8]/30 rounded-full text-xs font-semibold text-[#7B35E8]">
              {templates.length} Active
            </span>
          </div>
          <p className="text-xs text-[#9E9E9E] mt-1">
            Pre-approved message templates for SMS, WhatsApp (Meta DRAFT), and Email campaigns
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="flex items-center gap-1.5 px-4 py-2 bg-[#7B35E8] hover:bg-[#6824D3] text-white rounded-xl text-xs font-semibold shadow-lg shadow-[#7B35E8]/20 transition-all self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          Create Template
        </button>
      </div>

      {/* Channel Tabs */}
      <div className="flex items-center gap-2 border-b border-[#232336] pb-3">
        {(['ALL', 'SMS', 'WHATSAPP', 'EMAIL'] as const).map((tab) => {
          let Icon = FileText;
          if (tab === 'SMS') Icon = Smartphone;
          if (tab === 'WHATSAPP') Icon = MessageSquare;
          if (tab === 'EMAIL') Icon = Mail;

          return (
            <button
              key={tab}
              onClick={() => setChannelTab(tab)}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                channelTab === tab
                  ? 'bg-[#7B35E8] text-white shadow-lg shadow-[#7B35E8]/20'
                  : 'bg-[#12121A] text-[#9E9E9E] hover:text-white border border-[#232336]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab === 'ALL' ? 'All Channels' : tab}
            </button>
          );
        })}
      </div>

      {/* Templates Grid */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-2 text-[#9E9E9E]">
          <div className="w-7 h-7 border-2 border-[#7B35E8] border-t-transparent rounded-full animate-spin" />
          <span className="text-xs">Loading templates...</span>
        </div>
      ) : error ? (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
          {error}
        </div>
      ) : templates.length === 0 ? (
        <div className="py-20 text-center border border-dashed border-[#2A2A40] rounded-2xl bg-[#12121A]">
          <FileText className="w-10 h-10 mx-auto text-[#6E6E82] mb-3" />
          <h3 className="text-base font-bold text-white">No Templates Found</h3>
          <p className="text-xs text-[#9E9E9E] max-w-sm mx-auto mt-1 mb-4">
            Create reusable SMS, WhatsApp, and Email message templates with dynamic customer personalization.
          </p>
          <button
            onClick={openCreateModal}
            className="px-4 py-2 bg-[#7B35E8] hover:bg-[#6824D3] text-white rounded-xl text-xs font-semibold"
          >
            Create Your First Template
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(Array.isArray(templates) ? templates : []).map((tpl) => {
            const isSms = tpl.channel === 'SMS';
            const isWa = tpl.channel === 'WHATSAPP';
            const isEmail = tpl.channel === 'EMAIL';

            return (
              <div
                key={tpl.id}
                className="p-5 bg-[#12121A] border border-[#232336] rounded-2xl space-y-3 hover:border-[#383854] transition-all flex flex-col justify-between"
              >
                <div className="space-y-3">
                  {/* Top Bar with Channel and Actions */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          isSms
                            ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                            : isWa
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                            : 'bg-purple-500/15 text-purple-400 border border-purple-500/30'
                        }`}
                      >
                        {tpl.channel}
                      </span>

                      {isWa && tpl.category && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#232336] text-[#9E9E9E]">
                          {tpl.category}
                        </span>
                      )}

                      {isWa && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                          {tpl.metaStatus || 'DRAFT'}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => openEditModal(tpl)}
                        className="p-1 text-[#9E9E9E] hover:text-[#7B35E8] rounded-md hover:bg-[#1A1A2E] transition-colors"
                        title="Edit Template"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteTemplate(tpl.id, tpl.name)}
                        className="p-1 text-[#9E9E9E] hover:text-red-400 rounded-md hover:bg-[#1A1A2E] transition-colors"
                        title="Delete Template"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Title & Subject */}
                  <div>
                    <h3 className="text-sm font-bold text-white truncate">{tpl.name}</h3>
                    {isEmail && tpl.subject && (
                      <p className="text-xs text-[#9E9E9E] mt-0.5 truncate font-medium">
                        Subject: <span className="text-[#D1D1DB]">{tpl.subject}</span>
                      </p>
                    )}
                  </div>

                  {/* Content Preview */}
                  <div className="p-3 bg-[#1A1A2E]/60 border border-[#2A2A40] rounded-xl text-xs text-[#D1D1DB] leading-relaxed line-clamp-4 font-mono">
                    {tpl.content}
                  </div>

                  {/* Variable Chips */}
                  {tpl.variables && tpl.variables.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {tpl.variables.map((v, i) => (
                        <span
                          key={i}
                          className="px-1.5 py-0.5 bg-[#7B35E8]/10 text-[#7B35E8] rounded text-[10px] font-mono border border-[#7B35E8]/20"
                        >
                          {v}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Footer with SMS Stats */}
                <div className="pt-2 border-t border-[#1A1A2E] flex items-center justify-between text-[11px] text-[#9E9E9E]">
                  {isSms && tpl.smsStats ? (
                    <span>
                      {tpl.smsStats.characterCount} chars •{' '}
                      <strong className="text-white">{tpl.smsStats.segmentCount} SMS credit(s)</strong>
                    </span>
                  ) : (
                    <span>Updated {new Date(tpl.updatedAt).toLocaleDateString()}</span>
                  )}
                  <button
                    type="button"
                    onClick={() => openEditModal(tpl)}
                    className="text-[#7B35E8] hover:text-[#9A5BFF] font-semibold text-xs flex items-center gap-1"
                  >
                    <Eye className="w-3 h-3" /> Preview
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE / EDIT TEMPLATE MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-4xl bg-[#12121A] border border-[#232336] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#1A1A2E]">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-[#7B35E8]/10 rounded-xl text-[#7B35E8]">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">
                    {editingTemplate ? 'Edit Message Template' : 'Create Message Template'}
                  </h2>
                  <p className="text-xs text-[#9E9E9E]">
                    Supports dynamic personalization and channel-specific compliance
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-[#9E9E9E] hover:text-white rounded-lg hover:bg-[#1A1A2E] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSaveTemplate} className="flex-1 overflow-y-auto p-6 space-y-5">
              {formError && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs">
                  {formError}
                </div>
              )}

              {/* Channel Selector */}
              {!editingTemplate && (
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[#9E9E9E]">Select Channel *</label>
                  <div className="grid grid-cols-3 gap-3">
                    {(['SMS', 'WHATSAPP', 'EMAIL'] as TemplateChannel[]).map((ch) => (
                      <button
                        key={ch}
                        type="button"
                        onClick={() => setChannel(ch)}
                        className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all ${
                          channel === ch
                            ? 'bg-[#7B35E8]/15 text-[#7B35E8] border-[#7B35E8]'
                            : 'bg-[#1A1A2E] text-[#9E9E9E] border-[#2A2A40] hover:text-white'
                        }`}
                      >
                        {ch === 'SMS' && <Smartphone className="w-5 h-5" />}
                        {ch === 'WHATSAPP' && <MessageSquare className="w-5 h-5" />}
                        {ch === 'EMAIL' && <Mail className="w-5 h-5" />}
                        <span className="text-xs font-bold">{ch}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Name & Channel specific fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-[#9E9E9E]">Template Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. Weekend Flash Sale Promo"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="w-full mt-1 px-3 py-2 bg-[#1A1A2E] border border-[#2A2A40] rounded-xl text-white text-xs focus:outline-none focus:border-[#7B35E8]"
                  />
                </div>

                {channel === 'WHATSAPP' && (
                  <div>
                    <label className="text-xs font-medium text-[#9E9E9E]">Meta Category</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value as WhatsAppCategory)}
                      className="w-full mt-1 px-3 py-2 bg-[#1A1A2E] border border-[#2A2A40] rounded-xl text-white text-xs focus:outline-none focus:border-[#7B35E8]"
                    >
                      <option value="MARKETING">Marketing (Promotions, Offers)</option>
                      <option value="UTILITY">Utility (Order updates, Alerts)</option>
                      <option value="AUTHENTICATION">Authentication (OTPs, Security)</option>
                    </select>
                  </div>
                )}

                {channel === 'EMAIL' && (
                  <div>
                    <label className="text-xs font-medium text-[#9E9E9E]">Email Subject *</label>
                    <input
                      type="text"
                      placeholder="e.g. Exclusive invitation for {{customer_name}}"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      required
                      className="w-full mt-1 px-3 py-2 bg-[#1A1A2E] border border-[#2A2A40] rounded-xl text-white text-xs focus:outline-none focus:border-[#7B35E8]"
                    />
                  </div>
                )}
              </div>

              {/* Variable Insertion Chips */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-[#9E9E9E] flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#7B35E8]" />
                    Insert Personalization Variable
                  </label>
                  <span className="text-[10px] text-[#6E6E82]">Click to insert into message</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {DYNAMIC_VARIABLES.map((v) => (
                    <button
                      key={v.key}
                      type="button"
                      onClick={() => insertVariable(v.key)}
                      className="px-2.5 py-1 bg-[#1A1A2E] hover:bg-[#232336] text-[#7B35E8] border border-[#7B35E8]/30 rounded-lg text-xs font-mono transition-colors"
                    >
                      + {v.key}
                    </button>
                  ))}
                </div>
              </div>

              {/* Message Content & Preview Layout */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Editor Column */}
                <div className="space-y-2">
                  <label className="text-xs font-medium text-[#9E9E9E]">Message Content *</label>
                  <textarea
                    ref={textareaRef}
                    rows={8}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder={
                      channel === 'SMS'
                        ? 'Hi {{customer_name}}, enjoy special deals this weekend at {{vendor_name}}! Reply STOP to unsubscribe.'
                        : channel === 'WHATSAPP'
                        ? 'Hello {{customer_name}}! 🎉 We have an exclusive pass reserved for you at {{vendor_name}}.'
                        : 'Hi {{customer_name}},\n\nWe are delighted to share exclusive updates from {{vendor_name}} with you...'
                    }
                    required
                    className="w-full p-3 bg-[#1A1A2E] border border-[#2A2A40] rounded-xl text-white font-mono text-xs focus:outline-none focus:border-[#7B35E8] resize-none"
                  />

                  {/* SMS Real-time Segment Calculator */}
                  {channel === 'SMS' && (
                    <div className="p-3 bg-[#161622] border border-[#2A2A40] rounded-xl text-xs space-y-1">
                      <div className="flex items-center justify-between text-white font-semibold">
                        <span>
                          {smsStats.length} characters ({smsStats.isUnicode ? 'Unicode' : 'GSM-7'})
                        </span>
                        <span className="text-[#7B35E8] font-bold">
                          {smsStats.segments} SMS Segment(s)
                        </span>
                      </div>
                      <p className="text-[10px] text-[#9E9E9E]">
                        Standard GSM-7 allows 160 chars/segment. Emojis and special characters reduce
                        limit to 70 chars/segment.
                      </p>
                    </div>
                  )}

                  {/* WhatsApp Meta notice */}
                  {channel === 'WHATSAPP' && (
                    <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-300 flex items-start gap-2">
                      <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <span>
                        Templates are created in <strong>DRAFT</strong> status for testing. When Meta
                        API integration is configured in Part 4, templates will sync automatically.
                      </span>
                    </div>
                  )}
                </div>

                {/* Live Preview Column */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-[#9E9E9E] flex items-center gap-1.5">
                      <Eye className="w-3.5 h-3.5 text-[#F72585]" />
                      Live Customer Preview
                    </label>
                    <span className="text-[10px] text-[#6E6E82]">Sample: Rohit Sharma</span>
                  </div>

                  <div className="p-4 bg-[#0A0A0F] border border-[#2A2A40] rounded-xl min-h-[220px] flex flex-col justify-center">
                    {content.trim() ? (
                      <div className="space-y-2">
                        {channel === 'EMAIL' && subject && (
                          <div className="p-2 bg-[#1A1A2E] rounded-lg border border-[#2A2A40] text-xs font-semibold text-white">
                            <span className="text-[#9E9E9E] text-[10px] block uppercase font-mono">
                              Subject:
                            </span>
                            {renderPreviewText(subject)}
                          </div>
                        )}

                        <div
                          className={`p-3.5 rounded-2xl text-xs leading-relaxed whitespace-pre-wrap ${
                            channel === 'SMS'
                              ? 'bg-[#1A1A2E] text-white border border-[#2A2A40] rounded-br-none max-w-[90%]'
                              : channel === 'WHATSAPP'
                              ? 'bg-[#005C4B]/40 text-emerald-100 border border-[#005C4B] rounded-bl-none max-w-[90%]'
                              : 'bg-[#161622] text-[#D1D1DB] border border-[#2A2A40]'
                          }`}
                        >
                          {renderPreviewText(content)}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center text-[#6E6E82] text-xs">
                        Type in the editor to see rendered preview with sample customer data
                      </div>
                    )}
                  </div>
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
                onClick={handleSaveTemplate}
                disabled={saving || !name.trim() || !content.trim()}
                className="px-5 py-2 bg-[#7B35E8] hover:bg-[#6824D3] disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-lg shadow-[#7B35E8]/20 transition-all"
              >
                {saving ? 'Saving...' : editingTemplate ? 'Save Changes' : 'Create Template'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
