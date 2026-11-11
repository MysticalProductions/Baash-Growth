import React, { useState, useEffect } from 'react';
import api from '../../../services/api';
import { Customer, CustomerTag, CustomerSource, Gender } from '../../../types';
import { X, User, Phone, Mail, MapPin, Tag, AlertCircle, AlertTriangle } from 'lucide-react';

interface CustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  onCustomerSaved?: () => void;
  customer?: Customer | null;
  customerToEdit?: Customer | null;
  availableTags?: CustomerTag[];
}

export const CustomerModal: React.FC<CustomerModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  onCustomerSaved,
  customer: propCustomer,
  customerToEdit,
  availableTags = [],
}) => {
  const customer = propCustomer ?? customerToEdit;
  const triggerSuccess = onCustomerSaved ?? onSuccess ?? (() => {});
  const isEdit = !!customer;

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [gender, setGender] = useState<Gender | ''>('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [source, setSource] = useState<CustomerSource>('MANUAL_ENTRY');
  const [notes, setNotes] = useState('');
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [allowDuplicate, setAllowDuplicate] = useState(false);

  useEffect(() => {
    if (customer) {
      setFullName(customer.fullName || '');
      setPhone(customer.phone || '');
      setEmail(customer.email || '');
      setGender(customer.gender || '');
      setDateOfBirth(customer.dateOfBirth ? customer.dateOfBirth.split('T')[0] : '');
      setCity(customer.city || '');
      setState(customer.state || '');
      setSource(customer.source || 'MANUAL_ENTRY');
      setNotes(customer.notes || '');
      setSelectedTagIds(customer.tags ? customer.tags.map((t) => t.id) : []);
    } else {
      setFullName('');
      setPhone('');
      setEmail('');
      setGender('');
      setDateOfBirth('');
      setCity('');
      setState('');
      setSource('MANUAL_ENTRY');
      setNotes('');
      setSelectedTagIds([]);
    }
    setError(null);
    setDuplicateWarning(null);
    setAllowDuplicate(false);
  }, [customer, isOpen]);

  if (!isOpen) return null;

  const handleTagToggle = (tagId: string) => {
    if (selectedTagIds.includes(tagId)) {
      setSelectedTagIds(selectedTagIds.filter((id) => id !== tagId));
    } else {
      setSelectedTagIds([...selectedTagIds, tagId]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setDuplicateWarning(null);
    setLoading(true);

    const payload = {
      fullName: fullName.trim(),
      phone: phone.trim() || undefined,
      email: email.trim() || undefined,
      gender: gender ? (gender as Gender) : undefined,
      dateOfBirth: dateOfBirth || undefined,
      city: city.trim() || undefined,
      state: state.trim() || undefined,
      source,
      notes: notes.trim() || undefined,
      tagIds: selectedTagIds,
      allowDuplicateConfirmed: allowDuplicate,
    };

    try {
      if (isEdit && customer) {
        await api.put(`/customers/${customer.id}`, payload);
      } else {
        await api.post('/customers', payload);
      }
      triggerSuccess();
      onClose();
    } catch (err: any) {
      // Check for duplicate response
      if (err.message && err.message.toLowerCase().includes('already exists')) {
        setDuplicateWarning(err.message);
      } else {
        setError(err.message || 'Failed to save customer profile');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="baash-card w-full max-w-2xl p-6 md:p-8 border border-baash-cardBorder shadow-2xl relative my-8">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-baash-textMuted hover:text-white"
        >
          <X size={20} />
        </button>

        <div className="mb-6">
          <h3 className="text-xl font-black text-white">
            {isEdit ? 'Edit Customer Profile' : 'Add New Customer'}
          </h3>
          <p className="text-xs text-baash-textMuted mt-1">
            {isEdit
              ? 'Update contact details, tags, and demographic information.'
              : 'Register a new customer record into your isolated vendor workspace.'}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-start gap-2">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {duplicateWarning && (
          <div className="mb-4 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs space-y-3">
            <div className="flex items-start gap-2">
              <AlertTriangle size={18} className="shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-white">Duplicate Contact Detected</p>
                <p className="mt-0.5">{duplicateWarning}</p>
              </div>
            </div>
            <label className="flex items-center gap-2 text-white font-medium cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={allowDuplicate}
                onChange={(e) => setAllowDuplicate(e.target.checked)}
                className="rounded border-baash-cardBorder bg-baash-black text-baash-purple focus:ring-baash-purple"
              />
              <span>Confirm & allow this customer with shared contact details</span>
            </label>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Full Name */}
          <div>
            <label className="block text-xs font-semibold text-baash-textMuted uppercase mb-1">
              Full Name *
            </label>
            <div className="relative">
              <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-baash-textMuted" />
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Vikram Singhania"
                className="w-full bg-baash-darkBg border border-baash-cardBorder rounded-xl pl-10 pr-4 py-2.5 text-xs text-white focus:outline-none focus:border-baash-purple"
              />
            </div>
          </div>

          {/* Contact Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-baash-textMuted uppercase mb-1">
                Mobile Number (Phone)
              </label>
              <div className="relative">
                <Phone size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-baash-textMuted" />
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. 9876543210 or +91 98765 43210"
                  className="w-full bg-baash-darkBg border border-baash-cardBorder rounded-xl pl-10 pr-4 py-2.5 text-xs text-white focus:outline-none focus:border-baash-purple"
                />
              </div>
              <span className="text-[10px] text-baash-textMuted mt-1 block">
                Indian 10-digit mobile auto-prefixes +91
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-baash-textMuted uppercase mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-baash-textMuted" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@gmail.com"
                  className="w-full bg-baash-darkBg border border-baash-cardBorder rounded-xl pl-10 pr-4 py-2.5 text-xs text-white focus:outline-none focus:border-baash-purple"
                />
              </div>
              <span className="text-[10px] text-baash-textMuted mt-1 block">
                At least phone or email is required
              </span>
            </div>
          </div>

          {/* Demographics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-semibold text-baash-textMuted uppercase mb-1">
                Gender
              </label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value as Gender)}
                className="w-full bg-baash-darkBg border border-baash-cardBorder rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-baash-purple"
              >
                <option value="">Unspecified</option>
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other</option>
                <option value="PREFER_NOT_TO_SAY">Prefer not to say</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-baash-textMuted uppercase mb-1">
                Date of Birth
              </label>
              <input
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                className="w-full bg-baash-darkBg border border-baash-cardBorder rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-baash-purple"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-baash-textMuted uppercase mb-1">
                City
              </label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="e.g. Delhi"
                className="w-full bg-baash-darkBg border border-baash-cardBorder rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-baash-purple"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-baash-textMuted uppercase mb-1">
                State
              </label>
              <input
                type="text"
                value={state}
                onChange={(e) => setState(e.target.value)}
                placeholder="e.g. Delhi"
                className="w-full bg-baash-darkBg border border-baash-cardBorder rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-baash-purple"
              />
            </div>
          </div>

          {/* Source */}
          <div>
            <label className="block text-xs font-semibold text-baash-textMuted uppercase mb-1">
              Customer Acquisition Source
            </label>
            <select
              value={source}
              onChange={(e) => setSource(e.target.value as CustomerSource)}
              className="w-full bg-baash-darkBg border border-baash-cardBorder rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-baash-purple"
            >
              <option value="MANUAL_ENTRY">Manual Entry</option>
              <option value="WEBSITE">Website Direct</option>
              <option value="BOOKING">Experience Booking</option>
              <option value="EVENT_REGISTRATION">Event Registration</option>
              <option value="CSV_IMPORT">CSV Import</option>
              <option value="OTHER">Other</option>
            </select>
          </div>

          {/* Tags Assignment */}
          <div>
            <label className="block text-xs font-semibold text-baash-textMuted uppercase mb-2">
              Assign Customer Tags
            </label>
            <div className="flex flex-wrap gap-2 p-3 bg-baash-darkBg rounded-xl border border-baash-cardBorder min-h-[50px]">
              {availableTags.length === 0 ? (
                <span className="text-xs text-baash-textMuted">No tags created yet.</span>
              ) : (
                availableTags.map((tag) => {
                  const isSelected = selectedTagIds.includes(tag.id);
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => handleTagToggle(tag.id)}
                      className={`text-xs px-3 py-1 rounded-full font-semibold transition-all ${
                        isSelected
                          ? 'bg-baash-purple text-white shadow-sm ring-1 ring-white/20'
                          : 'bg-baash-cardBg text-baash-textMuted hover:text-white border border-baash-cardBorder'
                      }`}
                    >
                      {tag.name}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-baash-textMuted uppercase mb-1">
              Internal Notes
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notes on customer preferences, VIP requirements, etc."
              className="w-full bg-baash-darkBg border border-baash-cardBorder rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-baash-purple"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-baash-cardBorder">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs text-baash-textMuted hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="baash-btn-primary text-xs py-2 px-6"
            >
              {loading ? 'Saving...' : isEdit ? 'Update Customer' : 'Add Customer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

