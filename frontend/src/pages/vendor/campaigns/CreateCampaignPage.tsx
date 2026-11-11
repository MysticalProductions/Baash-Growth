import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Smartphone,
  MessageSquare,
  Mail,
  Users,
  Filter,
  Tag,
  CheckCircle2,
  AlertCircle,
  Clock,
  Send,
  Calendar,
  Sparkles,
  Info,
  ShieldCheck,
  ChevronRight,
  RefreshCw,
  Wallet,
} from 'lucide-react';
import api from '../../../services/api';
import { WalletChannel } from '../../../types/wallet';
import { AudienceType, CampaignEstimate } from '../../../types/campaign';

export const CreateCampaignPage: React.FC = () => {
  const navigate = useNavigate();

  // Wizard Steps: 1: Channel & Basics, 2: Audience, 3: Content, 4: Review & Balance, 5: Schedule
  const [step, setStep] = useState<number>(1);

  // Form State
  const [name, setName] = useState('');
  const [channel, setChannel] = useState<WalletChannel>('WHATSAPP');
  const [audienceType, setAudienceType] = useState<AudienceType>('ALL_CUSTOMERS');
  const [segmentId, setSegmentId] = useState('');
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [templateId, setTemplateId] = useState('');
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [sendImmediately, setSendImmediately] = useState(true);
  const [scheduledAt, setScheduledAt] = useState('');

  // Loaded Options
  const [segments, setSegments] = useState<any[]>([]);
  const [tags, setTags] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);

  // Estimation State
  const [estimating, setEstimating] = useState(false);
  const [estimate, setEstimate] = useState<CampaignEstimate | null>(null);
  const [estimateError, setEstimateError] = useState('');

  // Submission State
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Load Segments, Tags, and Templates on mount
  useEffect(() => {
    const loadPrerequisites = async () => {
      try {
        const [segRes, tagRes, tplRes] = await Promise.all([
          api.get('/segments').catch(() => ({ data: [] })),
          api.get('/tags').catch(() => ({ data: [] })),
          api.get('/templates').catch(() => ({ data: [] })),
        ]);
        setSegments(Array.isArray(segRes) ? segRes : (segRes?.data || []));
        setTags(Array.isArray(tagRes) ? tagRes : (tagRes?.data || []));
        setTemplates(Array.isArray(tplRes) ? tplRes : (tplRes?.data || []));
      } catch (e) {
        console.error('Error loading campaign prerequisites', e);
      }
    };
    loadPrerequisites();
  }, []);

  // Filter templates by current channel
  const filteredTemplates = templates.filter((t) => t.channel === channel);

  // When a template is selected, auto-populate content and subject
  const handleSelectTemplate = (id: string) => {
    setTemplateId(id);
    const selected = templates.find((t) => t.id === id);
    if (selected) {
      setContent(selected.content || '');
      if (selected.subject) setSubject(selected.subject);
    }
  };

  // Run estimation whenever audience or content changes
  const runEstimation = async () => {
    if (!content.trim()) return;
    try {
      setEstimating(true);
      setEstimateError('');
      const payload: any = {
        channel,
        content,
        audienceType,
      };

      if (templateId && templateId.trim() !== '') {
        payload.templateId = templateId;
      }
      if (audienceType === 'SEGMENT' && segmentId && segmentId.trim() !== '') {
        payload.segmentId = segmentId;
      }
      if (audienceType === 'TAGS' && selectedTagIds.length > 0) {
        payload.tagIds = selectedTagIds;
      }

      const res = await api.post('/campaigns/estimate', payload);
      setEstimate(res?.data || res);
    } catch (err: any) {
      const msg = err.response?.data?.message;
      const errMsg = Array.isArray(msg)
        ? msg.join(', ')
        : typeof msg === 'string'
        ? msg
        : err.message || 'Failed to estimate campaign';
      setEstimateError(errMsg);
    } finally {
      setEstimating(false);
    }
  };

  // Trigger estimation when entering step 4
  useEffect(() => {
    if (step === 4) {
      runEstimation();
    }
  }, [step]);

  // Handle final campaign submission
  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      setSubmitError('');

      const payload: any = {
        name,
        channel,
        content,
        audienceType,
        sendImmediately,
      };

      if (templateId && templateId.trim() !== '') {
        payload.templateId = templateId;
      }
      if (channel === 'EMAIL' && subject && subject.trim() !== '') {
        payload.subject = subject;
      }
      if (audienceType === 'SEGMENT' && segmentId && segmentId.trim() !== '') {
        payload.segmentId = segmentId;
      }
      if (audienceType === 'TAGS' && selectedTagIds.length > 0) {
        payload.tagIds = selectedTagIds;
      }
      if (!sendImmediately && scheduledAt && scheduledAt.trim() !== '') {
        payload.scheduledAt = new Date(scheduledAt).toISOString();
      }

      const res = await api.post('/campaigns', payload);
      const createdCampaign = res?.data || res;
      window.dispatchEvent(new CustomEvent('baash:wallet-updated'));
      navigate(`/vendor/campaigns/${createdCampaign.id}`);
    } catch (err: any) {
      const msg = err.response?.data?.message;
      const errMsg = Array.isArray(msg)
        ? msg.join(', ')
        : typeof msg === 'string'
        ? msg
        : err.message || 'Failed to launch campaign';
      setSubmitError(errMsg);
    } finally {
      setSubmitting(false);
    }
  };

  // Real-time character count & segment calculation for SMS
  const smsLength = content.length;
  const isUnicodeSms = /[^\u0000-\u007F]/.test(content);
  const smsSegments = isUnicodeSms
    ? smsLength <= 70
      ? 1
      : Math.ceil(smsLength / 67)
    : smsLength <= 160
    ? 1
    : Math.ceil(smsLength / 153);

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/vendor/campaigns')}
          className="p-2 bg-baash-darkBg hover:bg-baash-cardBorder border border-baash-cardBorder rounded-lg text-baash-textMuted hover:text-white transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Create Campaign</h1>
          <p className="text-sm text-baash-textMuted">
            Launch multi-channel broadcast with automated wallet credit reservation and delivery screening.
          </p>
        </div>
      </div>

      {/* Wizard Step Indicator */}
      <div className="grid grid-cols-4 gap-2 p-2 bg-baash-darkBg border border-baash-cardBorder rounded-xl">
        {[
          { num: 1, title: 'Channel' },
          { num: 2, title: 'Audience' },
          { num: 3, title: 'Message' },
          { num: 4, title: 'Review & Send' },
        ].map((s) => (
          <div
            key={s.num}
            onClick={() => {
              if (s.num < step) setStep(s.num);
            }}
            className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold transition-all ${
              step === s.num
                ? 'bg-gradient-to-r from-baash-purple to-baash-pink text-white shadow-md'
                : step > s.num
                ? 'bg-emerald-500/10 text-emerald-400 cursor-pointer'
                : 'text-baash-textMuted'
            }`}
          >
            <span>{s.num}.</span>
            <span>{s.title}</span>
          </div>
        ))}
      </div>

      {/* STEP 1: Channel & Campaign Name */}
      {step === 1 && (
        <div className="p-6 bg-baash-darkBg border border-baash-cardBorder rounded-xl space-y-6">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <span>Step 1: Choose Channel & Name</span>
          </h2>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-baash-textMuted mb-2">
              Campaign Name *
            </label>
            <input
              type="text"
              placeholder="e.g. Diwali Weekend Exclusive Discount"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 bg-baash-black border border-baash-cardBorder rounded-lg text-white text-sm focus:outline-none focus:border-baash-purple"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-baash-textMuted mb-3">
              Select Communication Channel *
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* WhatsApp Card */}
              <div
                onClick={() => setChannel('WHATSAPP')}
                className={`p-5 rounded-xl border cursor-pointer transition-all ${
                  channel === 'WHATSAPP'
                    ? 'bg-green-500/10 border-green-500 ring-2 ring-green-500/30'
                    : 'bg-baash-black/40 border-baash-cardBorder hover:border-zinc-600'
                }`}
              >
                <div className="w-10 h-10 rounded-lg bg-green-500/20 text-green-400 flex items-center justify-center mb-3">
                  <MessageSquare size={20} />
                </div>
                <h3 className="font-bold text-white text-base">WhatsApp</h3>
                <p className="text-xs text-baash-textMuted mt-1">
                  Official Meta WhatsApp Cloud API with verified templates & high open rates.
                </p>
                <div className="mt-3 text-[11px] font-semibold text-green-400">1 Credit / Recipient</div>
              </div>

              {/* SMS Card */}
              <div
                onClick={() => setChannel('SMS')}
                className={`p-5 rounded-xl border cursor-pointer transition-all ${
                  channel === 'SMS'
                    ? 'bg-emerald-500/10 border-emerald-500 ring-2 ring-emerald-500/30'
                    : 'bg-baash-black/40 border-baash-cardBorder hover:border-zinc-600'
                }`}
              >
                <div className="w-10 h-10 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-3">
                  <Smartphone size={20} />
                </div>
                <h3 className="font-bold text-white text-base">SMS</h3>
                <p className="text-xs text-baash-textMuted mt-1">
                  Official MSG91 TRAI DLT Compliant route with instant delivery across India.
                </p>
                <div className="mt-3 text-[11px] font-semibold text-emerald-400">1 Credit / 160-char GSM segment</div>
              </div>

              {/* Email Card */}
              <div
                onClick={() => setChannel('EMAIL')}
                className={`p-5 rounded-xl border cursor-pointer transition-all ${
                  channel === 'EMAIL'
                    ? 'bg-sky-500/10 border-sky-500 ring-2 ring-sky-500/30'
                    : 'bg-baash-black/40 border-baash-cardBorder hover:border-zinc-600'
                }`}
              >
                <div className="w-10 h-10 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center mb-3">
                  <Mail size={20} />
                </div>
                <h3 className="font-bold text-white text-base">Email</h3>
                <p className="text-xs text-baash-textMuted mt-1">
                  Amazon SES Verified delivery with HTML templates, tracking & suppression.
                </p>
                <div className="mt-3 text-[11px] font-semibold text-sky-400">1 Credit / Email</div>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-baash-cardBorder/60">
            <button
              onClick={() => setStep(2)}
              disabled={!name.trim()}
              className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-baash-purple to-baash-pink hover:opacity-90 disabled:opacity-40 rounded-lg text-white font-bold text-sm shadow-md transition-all cursor-pointer"
            >
              Next: Target Audience <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: Audience & Targeting */}
      {step === 2 && (
        <div className="p-6 bg-baash-darkBg border border-baash-cardBorder rounded-xl space-y-6">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <span>Step 2: Choose Audience & Targeting</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div
              onClick={() => setAudienceType('ALL_CUSTOMERS')}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                audienceType === 'ALL_CUSTOMERS'
                  ? 'bg-baash-purple/15 border-baash-purple ring-1 ring-baash-purple'
                  : 'bg-baash-black border-baash-cardBorder hover:border-zinc-600'
              }`}
            >
              <div className="font-bold text-white text-sm flex items-center gap-2 mb-1">
                <Users size={16} className="text-baash-purpleLight" /> All Customers
              </div>
              <p className="text-xs text-baash-textMuted">Broadcast to your entire customer database.</p>
            </div>

            <div
              onClick={() => setAudienceType('SEGMENT')}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                audienceType === 'SEGMENT'
                  ? 'bg-baash-purple/15 border-baash-purple ring-1 ring-baash-purple'
                  : 'bg-baash-black border-baash-cardBorder hover:border-zinc-600'
              }`}
            >
              <div className="font-bold text-white text-sm flex items-center gap-2 mb-1">
                <Filter size={16} className="text-baash-purpleLight" /> Customer Segment
              </div>
              <p className="text-xs text-baash-textMuted">Target dynamically filtered customer groups.</p>
            </div>

            <div
              onClick={() => setAudienceType('TAGS')}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                audienceType === 'TAGS'
                  ? 'bg-baash-purple/15 border-baash-purple ring-1 ring-baash-purple'
                  : 'bg-baash-black border-baash-cardBorder hover:border-zinc-600'
              }`}
            >
              <div className="font-bold text-white text-sm flex items-center gap-2 mb-1">
                <Tag size={16} className="text-baash-purpleLight" /> Specific Tags
              </div>
              <p className="text-xs text-baash-textMuted">Target customers assigned specific tags.</p>
            </div>
          </div>

          {/* Segment Selector */}
          {audienceType === 'SEGMENT' && (
            <div className="p-4 bg-baash-black rounded-lg border border-baash-cardBorder space-y-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-baash-textMuted">
                Select Customer Segment *
              </label>
              {segments.length === 0 ? (
                <p className="text-xs text-amber-400">No segments created yet. Go to Segments section to create one.</p>
              ) : (
                <select
                  value={segmentId}
                  onChange={(e) => setSegmentId(e.target.value)}
                  className="w-full px-3 py-2.5 bg-baash-darkBg border border-baash-cardBorder rounded-lg text-white text-sm focus:outline-none focus:border-baash-purple"
                >
                  <option value="">-- Choose Segment --</option>
                  {segments.map((seg) => (
                    <option key={seg.id} value={seg.id}>
                      {seg.name} ({seg.description || 'Dynamic filter'})
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* Tag Selector */}
          {audienceType === 'TAGS' && (
            <div className="p-4 bg-baash-black rounded-lg border border-baash-cardBorder space-y-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-baash-textMuted mb-2">
                Select One or More Tags *
              </label>
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => {
                  const selected = selectedTagIds.includes(tag.id);
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => {
                        if (selected) {
                          setSelectedTagIds(selectedTagIds.filter((id) => id !== tag.id));
                        } else {
                          setSelectedTagIds([...selectedTagIds, tag.id]);
                        }
                      }}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                        selected
                          ? 'bg-baash-purple text-white shadow-sm'
                          : 'bg-baash-darkBg text-baash-textMuted border border-baash-cardBorder hover:text-white'
                      }`}
                    >
                      {tag.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Consent Screening Notice */}
          <div className="p-4 rounded-xl bg-baash-black/60 border border-baash-cardBorder flex items-start gap-3">
            <ShieldCheck size={18} className="text-emerald-400 shrink-0 mt-0.5" />
            <div className="text-xs text-baash-textMuted space-y-1">
              <span className="font-semibold text-white">Automated Compliance & Consent Screening:</span>
              <p>
                BAASH GROWTH automatically screens recipients against channel consent records and permanent bounce/spam suppression lists. Customers who opted out of {channel} will be safely excluded without charging credits.
              </p>
            </div>
          </div>

          <div className="flex justify-between pt-4 border-t border-baash-cardBorder/60">
            <button
              onClick={() => setStep(1)}
              className="px-5 py-2.5 bg-baash-cardBorder/50 hover:bg-baash-cardBorder rounded-lg text-white font-semibold text-sm transition-colors"
            >
              Back
            </button>
            <button
              onClick={() => setStep(3)}
              disabled={
                (audienceType === 'SEGMENT' && !segmentId) ||
                (audienceType === 'TAGS' && selectedTagIds.length === 0)
              }
              className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-baash-purple to-baash-pink hover:opacity-90 disabled:opacity-40 rounded-lg text-white font-bold text-sm shadow-md transition-all cursor-pointer"
            >
              Next: Compose Message <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Message Content */}
      {step === 3 && (
        <div className="p-6 bg-baash-darkBg border border-baash-cardBorder rounded-xl space-y-6">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <span>Step 3: Message Content & Template</span>
          </h2>

          {/* Template Selection Dropdown */}
          {filteredTemplates.length > 0 && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-baash-textMuted mb-2">
                Use Saved {channel} Template (Optional)
              </label>
              <select
                value={templateId}
                onChange={(e) => handleSelectTemplate(e.target.value)}
                className="w-full px-3 py-2.5 bg-baash-black border border-baash-cardBorder rounded-lg text-white text-sm focus:outline-none focus:border-baash-purple"
              >
                <option value="">-- Write Custom Message or Pick Template --</option>
                {filteredTemplates.map((tpl) => (
                  <option key={tpl.id} value={tpl.id}>
                    {tpl.name} {tpl.category ? `[${tpl.category}]` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Email Subject Line */}
          {channel === 'EMAIL' && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-baash-textMuted mb-2">
                Email Subject Line *
              </label>
              <input
                type="text"
                placeholder="e.g. Special Weekend Announcement for You"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-4 py-2.5 bg-baash-black border border-baash-cardBorder rounded-lg text-white text-sm focus:outline-none focus:border-baash-purple"
              />
            </div>
          )}

          {/* Message Body */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-baash-textMuted">
                Message Body *
              </label>
              {channel === 'SMS' && (
                <div className="text-xs text-baash-textMuted">
                  <span>{smsLength} chars</span> |{' '}
                  <span className={isUnicodeSms ? 'text-amber-400 font-semibold' : ''}>
                    {isUnicodeSms ? 'Unicode' : 'GSM-7'}
                  </span>{' '}
                  | <span className="text-white font-bold">{smsSegments} segment(s)</span>
                </div>
              )}
            </div>

            <textarea
              rows={channel === 'EMAIL' ? 8 : 5}
              placeholder={
                channel === 'WHATSAPP'
                  ? 'Hello {{name}}, welcome to our exclusive experience! Your city: {{city}}.'
                  : channel === 'SMS'
                  ? 'Dear {{name}}, enjoy 20% off on all events this Saturday! Visit baash.in.'
                  : '<h1>Hello {{name}}</h1><p>We are delighted to invite you...</p>'
              }
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full p-4 bg-baash-black border border-baash-cardBorder rounded-lg text-white text-sm font-mono focus:outline-none focus:border-baash-purple resize-y"
            />

            {/* Variable Tags Guide */}
            <div className="mt-2 flex items-center gap-2 text-xs text-baash-textMuted">
              <Sparkles size={14} className="text-baash-purpleLight" />
              <span>Available Personalization Variables:</span>
              <button
                type="button"
                onClick={() => setContent(content + ' {{name}}')}
                className="px-2 py-0.5 rounded bg-baash-cardBorder hover:bg-zinc-700 text-white font-mono text-[11px]"
              >
                {'{{name}}'}
              </button>
              <button
                type="button"
                onClick={() => setContent(content + ' {{city}}')}
                className="px-2 py-0.5 rounded bg-baash-cardBorder hover:bg-zinc-700 text-white font-mono text-[11px]"
              >
                {'{{city}}'}
              </button>
              <button
                type="button"
                onClick={() => setContent(content + ' {{state}}')}
                className="px-2 py-0.5 rounded bg-baash-cardBorder hover:bg-zinc-700 text-white font-mono text-[11px]"
              >
                {'{{state}}'}
              </button>
            </div>
          </div>

          <div className="flex justify-between pt-4 border-t border-baash-cardBorder/60">
            <button
              onClick={() => setStep(2)}
              className="px-5 py-2.5 bg-baash-cardBorder/50 hover:bg-baash-cardBorder rounded-lg text-white font-semibold text-sm transition-colors"
            >
              Back
            </button>
            <button
              onClick={() => setStep(4)}
              disabled={!content.trim() || (channel === 'EMAIL' && !subject.trim())}
              className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-baash-purple to-baash-pink hover:opacity-90 disabled:opacity-40 rounded-lg text-white font-bold text-sm shadow-md transition-all cursor-pointer"
            >
              Next: Review & Estimate <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: Review, Wallet Sufficiency & Schedule */}
      {step === 4 && (
        <div className="p-6 bg-baash-darkBg border border-baash-cardBorder rounded-xl space-y-6">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <span>Step 4: Cost Estimation & Wallet Balance Check</span>
          </h2>

          {estimating ? (
            <div className="py-12 flex flex-col items-center justify-center text-baash-textMuted">
              <RefreshCw size={28} className="animate-spin text-baash-purple mb-2" />
              <p className="text-sm">Calculating audience and wallet credit requirements...</p>
            </div>
          ) : estimateError ? (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">
              {estimateError}
            </div>
          ) : estimate ? (
            <div className="space-y-6">
              {/* Audience Breakdown Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-baash-black border border-baash-cardBorder">
                  <div className="text-xs text-baash-textMuted uppercase font-semibold">Total Targeted</div>
                  <div className="text-2xl font-black text-white mt-1">{estimate.totalRecipientsFound}</div>
                  <p className="text-[11px] text-baash-textMuted mt-0.5">Found matching criteria</p>
                </div>

                <div className="p-4 rounded-xl bg-baash-black border border-baash-cardBorder">
                  <div className="text-xs text-emerald-400 uppercase font-semibold">Eligible to Receive</div>
                  <div className="text-2xl font-black text-emerald-400 mt-1">{estimate.eligibleCount}</div>
                  <p className="text-[11px] text-emerald-500/80 mt-0.5">Valid contact + opted-in</p>
                </div>

                <div className="p-4 rounded-xl bg-baash-black border border-baash-cardBorder">
                  <div className="text-xs text-baash-textMuted uppercase font-semibold">Excluded</div>
                  <div className="text-2xl font-black text-zinc-400 mt-1">{estimate.excludedCount}</div>
                  <p className="text-[11px] text-baash-textMuted mt-0.5">Opted out, invalid or suppressed</p>
                </div>
              </div>

              {/* Exclusion breakdown if any */}
              {estimate.excludedCount > 0 && (
                <div className="p-3 bg-baash-black/40 rounded-lg border border-baash-cardBorder/60 text-xs text-baash-textMuted flex items-center gap-2">
                  <Info size={14} className="text-amber-400 shrink-0" />
                  <span>
                    Exclusion Breakdown:{' '}
                    {Object.entries(estimate.excludedBreakdown || {})
                      .map(([reason, count]) => `${count} ${reason.toLowerCase().replace(/_/g, ' ')}`)
                      .join(', ')}
                  </span>
                </div>
              )}

              {/* Wallet Balance Verification Box */}
              <div
                className={`p-5 rounded-xl border ${
                  estimate.wallet?.hasSufficientBalance
                    ? 'bg-emerald-500/10 border-emerald-500/30'
                    : 'bg-rose-500/10 border-rose-500/30'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      {estimate.wallet?.hasSufficientBalance ? (
                        <CheckCircle2 size={18} className="text-emerald-400" />
                      ) : (
                        <AlertCircle size={18} className="text-rose-400" />
                      )}
                      <h3 className="font-bold text-white text-base">
                        {estimate.wallet?.hasSufficientBalance
                          ? 'Sufficient Credits Available'
                          : 'Insufficient Wallet Credits'}
                      </h3>
                    </div>
                    <p className="text-xs text-baash-textMuted">
                      {channel} Wallet Balance:{' '}
                      <span className="font-bold text-white">{estimate.wallet?.availableCredits ?? 0} Credits</span> | Required
                      for this campaign:{' '}
                      <span className="font-bold text-white">{estimate.totalEstimatedCredits ?? 0} Credits</span> (
                      {estimate.creditsPerRecipient ?? 1} credit/recipient)
                    </p>
                  </div>

                  {!estimate.wallet?.hasSufficientBalance && (
                    <button
                      onClick={() => navigate('/vendor/wallet')}
                      className="px-4 py-2 bg-gradient-to-r from-baash-purple to-baash-pink text-white font-bold text-xs rounded-lg shadow-md hover:opacity-90 transition-all shrink-0"
                    >
                      Top Up {channel} Wallet (+{estimate.wallet.creditsShortfall} Needed)
                    </button>
                  )}
                </div>
              </div>

              {/* Schedule or Instant Send Options */}
              <div className="p-5 bg-baash-black rounded-xl border border-baash-cardBorder space-y-4">
                <h4 className="text-sm font-bold text-white uppercase tracking-wider">Dispatch Timing</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div
                    onClick={() => setSendImmediately(true)}
                    className={`p-4 rounded-lg border cursor-pointer transition-all ${
                      sendImmediately
                        ? 'bg-baash-purple/20 border-baash-purple'
                        : 'bg-baash-darkBg border-baash-cardBorder'
                    }`}
                  >
                    <div className="font-bold text-white text-sm flex items-center gap-2">
                      <Send size={16} className="text-baash-purpleLight" /> Send Immediately
                    </div>
                    <p className="text-xs text-baash-textMuted mt-1">Reserve credits and begin immediate queue dispatch.</p>
                  </div>

                  <div
                    onClick={() => setSendImmediately(false)}
                    className={`p-4 rounded-lg border cursor-pointer transition-all ${
                      !sendImmediately
                        ? 'bg-baash-purple/20 border-baash-purple'
                        : 'bg-baash-darkBg border-baash-cardBorder'
                    }`}
                  >
                    <div className="font-bold text-white text-sm flex items-center gap-2">
                      <Calendar size={16} className="text-baash-purpleLight" /> Schedule for Later
                    </div>
                    <p className="text-xs text-baash-textMuted mt-1">Pick a date & time for automatic broadcast.</p>
                  </div>
                </div>

                {!sendImmediately && (
                  <div className="pt-2">
                    <label className="block text-xs font-semibold text-baash-textMuted mb-1">
                      Choose Dispatch Date & Time *
                    </label>
                    <input
                      type="datetime-local"
                      value={scheduledAt}
                      onChange={(e) => setScheduledAt(e.target.value)}
                      className="px-4 py-2 bg-baash-darkBg border border-baash-cardBorder rounded-lg text-white text-sm focus:outline-none focus:border-baash-purple"
                    />
                  </div>
                )}
              </div>
            </div>
          ) : null}

          {submitError && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">
              {submitError}
            </div>
          )}

          <div className="flex justify-between pt-4 border-t border-baash-cardBorder/60">
            <button
              onClick={() => setStep(3)}
              className="px-5 py-2.5 bg-baash-cardBorder/50 hover:bg-baash-cardBorder rounded-lg text-white font-semibold text-sm transition-colors"
            >
              Back
            </button>

            <button
              onClick={handleSubmit}
              disabled={submitting || !estimate?.wallet.hasSufficientBalance || (!sendImmediately && !scheduledAt)}
              className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-baash-purple to-baash-pink hover:opacity-90 disabled:opacity-40 rounded-lg text-white font-black text-sm shadow-xl shadow-baash-purple/30 transition-all cursor-pointer"
            >
              {submitting ? (
                <>
                  <RefreshCw size={16} className="animate-spin" /> Reserving & Launching...
                </>
              ) : sendImmediately ? (
                <>
                  <Send size={16} /> Confirm & Launch Campaign
                </>
              ) : (
                <>
                  <Calendar size={16} /> Schedule Campaign
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
