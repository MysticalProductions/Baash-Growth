import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  UserPlus,
  FileSpreadsheet,
  Download,
  Tag as TagIcon,
  Search,
  Filter,
  Trash2,
  Edit2,
  Eye,
  CheckSquare,
  Square,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  Mail,
  Smartphone,
  CheckCircle2,
  XCircle,
  HelpCircle,
  X,
  AlertCircle,
} from 'lucide-react';
import api from '../../../services/api';
import { Customer, CustomerTag, CustomerSource, ConsentStatus } from '../../../types/crm';
import { CustomerModal } from './CustomerModal';
import { CsvImportModal } from './CsvImportModal';
import { CustomerTagsModal } from './CustomerTagsModal';

export const CustomersListingPage: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [tags, setTags] = useState<CustomerTag[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Search & Filters
  const [search, setSearch] = useState('');
  const [selectedTag, setSelectedTag] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState<CustomerSource | ''>('');
  const [consentChannel, setConsentChannel] = useState<'SMS' | 'WHATSAPP' | 'EMAIL' | ''>('');
  const [consentStatus, setConsentStatus] = useState<ConsentStatus | ''>('');

  // Pagination
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isTagsModalOpen, setIsTagsModalOpen] = useState(false);

  // Bulk actions
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<string[]>([]);
  const [bulkTagId, setBulkTagId] = useState('');
  const [bulkLoading, setBulkLoading] = useState(false);

  // Fetch Tags
  const fetchTags = async () => {
    try {
      const res = await api.get('/tags');
      setTags(res.data);
    } catch (err) {
      console.error('Failed to load tags', err);
    }
  };

  // Fetch Customers
  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params: Record<string, any> = {
        page,
        limit,
      };
      if (search.trim()) params.search = search.trim();
      if (selectedTag) params.tagId = selectedTag;
      if (cityFilter.trim()) params.city = cityFilter.trim();
      if (sourceFilter) params.source = sourceFilter;
      if (consentChannel && consentStatus) {
        params.consentChannel = consentChannel;
        params.consentStatus = consentStatus;
      }

      const res = await api.get('/customers', { params });
      const rawList = res?.customers ?? res?.data?.customers ?? (Array.isArray(res) ? res : (Array.isArray(res?.data) ? res.data : []));
      const custList = Array.isArray(rawList) ? rawList : [];
      setCustomers(custList);
      setTotalCount(res?.pagination?.total ?? res?.total ?? custList.length);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch customers');
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, selectedTag, cityFilter, sourceFilter, consentChannel, consentStatus]);

  useEffect(() => {
    fetchTags();
  }, []);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  // Handle Search Input Debounce
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchCustomers();
  };

  // Reset Filters
  const handleResetFilters = () => {
    setSearch('');
    setSelectedTag('');
    setCityFilter('');
    setSourceFilter('');
    setConsentChannel('');
    setConsentStatus('');
    setPage(1);
  };

  // Checkbox select all / individual
  const toggleSelectAll = () => {
    if (selectedCustomerIds.length === customers.length && customers.length > 0) {
      setSelectedCustomerIds([]);
    } else {
      setSelectedCustomerIds((Array.isArray(customers) ? customers : []).map((c) => c.id));
    }
  };

  const toggleSelectCustomer = (id: string) => {
    setSelectedCustomerIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Bulk Delete
  const handleBulkDelete = async () => {
    if (!window.confirm(`Delete ${selectedCustomerIds.length} selected customers? This action cannot be undone.`)) {
      return;
    }

    setBulkLoading(true);
    try {
      await api.post('/customers/bulk-delete', { customerIds: selectedCustomerIds });
      setSelectedCustomerIds([]);
      fetchCustomers();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to bulk delete');
    } finally {
      setBulkLoading(false);
    }
  };

  // Bulk Assign Tag
  const handleBulkAssignTag = async () => {
    if (!bulkTagId || selectedCustomerIds.length === 0) return;

    setBulkLoading(true);
    try {
      await api.post('/customers/bulk-tag', {
        customerIds: selectedCustomerIds,
        tagId: bulkTagId,
        action: 'ASSIGN',
      });
      setBulkTagId('');
      setSelectedCustomerIds([]);
      fetchCustomers();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to assign tag');
    } finally {
      setBulkLoading(false);
    }
  };

  // Delete Individual Customer
  const handleDeleteCustomer = async (id: string, name: string) => {
    if (!window.confirm(`Delete customer "${name}"?`)) return;

    try {
      await api.delete(`/customers/${id}`);
      fetchCustomers();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete customer');
    }
  };

  // Export CSV
  const handleExportCsv = async () => {
    try {
      const params: Record<string, any> = {};
      if (search.trim()) params.search = search.trim();
      if (selectedTag) params.tagId = selectedTag;
      if (cityFilter.trim()) params.city = cityFilter.trim();
      if (sourceFilter) params.source = sourceFilter;

      const res = await api.get('/customers/export', {
        params,
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'text/csv' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `baash_customers_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err: any) {
      alert('Failed to export CSV: ' + (err.response?.data?.message || err.message));
    }
  };

  // Consent badge render
  const renderConsentBadge = (channel: 'SMS' | 'WHATSAPP' | 'EMAIL', consents?: any[]) => {
    const item = consents?.find((c) => c.channel === channel);
    const status = item ? item.status : 'UNKNOWN';

    if (status === 'OPTED_IN') {
      return (
        <span
          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
          title={`${channel}: Opted In`}
        >
          <CheckCircle2 className="w-2.5 h-2.5" /> {channel[0]}
        </span>
      );
    }
    if (status === 'OPTED_OUT') {
      return (
        <span
          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-red-500/15 text-red-400 border border-red-500/30"
          title={`${channel}: Opted Out (Suppressed)`}
        >
          <XCircle className="w-2.5 h-2.5" /> {channel[0]}
        </span>
      );
    }
    return (
      <span
        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-[#232336] text-[#9E9E9E]"
        title={`${channel}: Unknown Consent`}
      >
        <HelpCircle className="w-2.5 h-2.5" /> {channel[0]}
      </span>
    );
  };

  const totalPages = Math.ceil(totalCount / limit) || 1;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white tracking-tight">Customer CRM</h1>
            <span className="px-2.5 py-0.5 bg-[#7B35E8]/15 border border-[#7B35E8]/30 rounded-full text-xs font-semibold text-[#7B35E8]">
              {totalCount} Total
            </span>
          </div>
          <p className="text-xs text-[#9E9E9E] mt-1">
            Manage your isolated customer database, communication consents, and tags
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsTagsModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-[#1A1A2E] hover:bg-[#232336] text-[#D1D1DB] border border-[#2A2A40] rounded-xl text-xs font-semibold transition-colors"
          >
            <TagIcon className="w-3.5 h-3.5 text-[#7B35E8]" />
            Tags ({tags.length})
          </button>

          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-[#1A1A2E] hover:bg-[#232336] text-[#D1D1DB] border border-[#2A2A40] rounded-xl text-xs font-semibold transition-colors"
            title="Export filtered records to CSV"
          >
            <Download className="w-3.5 h-3.5 text-[#10B981]" />
            Export CSV
          </button>

          <button
            onClick={() => setIsImportModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-[#1A1A2E] hover:bg-[#232336] text-white border border-[#2A2A40] rounded-xl text-xs font-semibold transition-colors"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-[#F72585]" />
            Import CSV
          </button>

          <button
            onClick={() => {
              setEditingCustomer(null);
              setIsAddModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#7B35E8] hover:bg-[#6824D3] text-white rounded-xl text-xs font-semibold shadow-lg shadow-[#7B35E8]/20 transition-all"
          >
            <UserPlus className="w-3.5 h-3.5" />
            Add Customer
          </button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="p-4 bg-[#12121A] border border-[#232336] rounded-2xl space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6E6E82]" />
            <input
              type="text"
              placeholder="Search by full name, phone number, or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-[#1A1A2E] border border-[#2A2A40] rounded-xl text-white placeholder-[#6E6E82] text-xs focus:outline-none focus:border-[#7B35E8]"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Tag Filter */}
            <select
              value={selectedTag}
              onChange={(e) => {
                setSelectedTag(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 bg-[#1A1A2E] border border-[#2A2A40] rounded-xl text-white text-xs focus:outline-none focus:border-[#7B35E8]"
            >
              <option value="">All Tags</option>
              {tags.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>

            {/* City Filter */}
            <input
              type="text"
              placeholder="Filter City..."
              value={cityFilter}
              onChange={(e) => setCityFilter(e.target.value)}
              onBlur={() => {
                setPage(1);
                fetchCustomers();
              }}
              className="w-28 px-3 py-2 bg-[#1A1A2E] border border-[#2A2A40] rounded-xl text-white placeholder-[#6E6E82] text-xs focus:outline-none focus:border-[#7B35E8]"
            />

            {/* Source Filter */}
            <select
              value={sourceFilter}
              onChange={(e) => {
                setSourceFilter(e.target.value as any);
                setPage(1);
              }}
              className="px-3 py-2 bg-[#1A1A2E] border border-[#2A2A40] rounded-xl text-white text-xs focus:outline-none focus:border-[#7B35E8]"
            >
              <option value="">All Sources</option>
              <option value="MANUAL_ENTRY">Manual Entry</option>
              <option value="CSV_IMPORT">CSV Import</option>
              <option value="WEBSITE">Website</option>
              <option value="BOOKING">Booking</option>
              <option value="EVENT_REGISTRATION">Event</option>
              <option value="OTHER">Other</option>
            </select>

            {/* Consent Filter */}
            <select
              value={consentChannel}
              onChange={(e) => {
                setConsentChannel(e.target.value as any);
                if (!e.target.value) setConsentStatus('');
              }}
              className="px-3 py-2 bg-[#1A1A2E] border border-[#2A2A40] rounded-xl text-white text-xs focus:outline-none focus:border-[#7B35E8]"
            >
              <option value="">Any Channel</option>
              <option value="SMS">SMS</option>
              <option value="WHATSAPP">WhatsApp</option>
              <option value="EMAIL">Email</option>
            </select>

            {consentChannel && (
              <select
                value={consentStatus}
                onChange={(e) => {
                  setConsentStatus(e.target.value as any);
                  setPage(1);
                }}
                className="px-3 py-2 bg-[#1A1A2E] border border-[#2A2A40] rounded-xl text-white text-xs focus:outline-none focus:border-[#7B35E8]"
              >
                <option value="">Any Status</option>
                <option value="OPTED_IN">Opted In</option>
                <option value="OPTED_OUT">Opted Out</option>
                <option value="UNKNOWN">Unknown</option>
              </select>
            )}

            {(search || selectedTag || cityFilter || sourceFilter || consentChannel) && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="p-2 text-[#9E9E9E] hover:text-white bg-[#1A1A2E] hover:bg-[#232336] rounded-xl border border-[#2A2A40] transition-colors"
                title="Reset filters"
              >
                <X className="w-4 h-4" />
              </button>
            )}

            <button
              type="submit"
              className="px-4 py-2 bg-[#7B35E8]/20 hover:bg-[#7B35E8]/30 border border-[#7B35E8]/40 text-[#7B35E8] rounded-xl text-xs font-semibold transition-colors"
            >
              Apply
            </button>
          </div>
        </form>

        {/* Bulk Action Toolbar */}
        {selectedCustomerIds.length > 0 && (
          <div className="flex flex-wrap items-center justify-between p-2.5 bg-[#7B35E8]/10 border border-[#7B35E8]/20 rounded-xl gap-3 animate-fade-in">
            <div className="flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-[#7B35E8]" />
              <span className="text-xs font-semibold text-white">
                {selectedCustomerIds.length} customer(s) selected
              </span>
            </div>

            <div className="flex items-center gap-2">
              {/* Bulk Assign Tag */}
              <div className="flex items-center gap-1.5">
                <select
                  value={bulkTagId}
                  onChange={(e) => setBulkTagId(e.target.value)}
                  className="px-2.5 py-1.5 bg-[#12121A] border border-[#2A2A40] rounded-lg text-white text-xs focus:outline-none focus:border-[#7B35E8]"
                >
                  <option value="">Select tag to assign...</option>
                  {tags.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleBulkAssignTag}
                  disabled={!bulkTagId || bulkLoading}
                  className="px-3 py-1.5 bg-[#7B35E8] hover:bg-[#6824D3] disabled:opacity-50 text-white rounded-lg text-xs font-semibold transition-colors"
                >
                  Apply Tag
                </button>
              </div>

              {/* Bulk Delete */}
              <button
                type="button"
                onClick={handleBulkDelete}
                disabled={bulkLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg text-xs font-semibold transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete Selected
              </button>

              <button
                type="button"
                onClick={() => setSelectedCustomerIds([])}
                className="text-xs text-[#9E9E9E] hover:text-white px-2 py-1"
              >
                Clear
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Customer Listing Table */}
      <div className="bg-[#12121A] border border-[#232336] rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-[#161622] text-[#9E9E9E] border-b border-[#232336]">
                <th className="py-3 px-4 w-10">
                  <button
                    type="button"
                    onClick={toggleSelectAll}
                    className="text-[#9E9E9E] hover:text-white"
                  >
                    {selectedCustomerIds.length === customers.length && customers.length > 0 ? (
                      <CheckSquare className="w-4 h-4 text-[#7B35E8]" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                </th>
                <th className="py-3 px-4 font-semibold uppercase tracking-wider">Customer Name</th>
                <th className="py-3 px-4 font-semibold uppercase tracking-wider">Mobile Number</th>
                <th className="py-3 px-4 font-semibold uppercase tracking-wider">Email</th>
                <th className="py-3 px-4 font-semibold uppercase tracking-wider">City</th>
                <th className="py-3 px-4 font-semibold uppercase tracking-wider">Tags</th>
                <th className="py-3 px-4 font-semibold uppercase tracking-wider">Consents</th>
                <th className="py-3 px-4 font-semibold uppercase tracking-wider">Registered</th>
                <th className="py-3 px-4 font-semibold uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#232336] text-white">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-[#9E9E9E]">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-6 h-6 border-2 border-[#7B35E8] border-t-transparent rounded-full animate-spin" />
                      <span>Loading customers...</span>
                    </div>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-red-400">
                    <div className="flex items-center justify-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      <span>{error}</span>
                    </div>
                  </td>
                </tr>
              ) : (!Array.isArray(customers) || customers.length === 0) ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center text-[#6E6E82]">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-[#1A1A2E] flex items-center justify-center text-[#9E9E9E]">
                        <Users className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-base font-semibold text-white">No customers found</p>
                        <p className="text-xs text-[#9E9E9E] mt-0.5">
                          {search || selectedTag || cityFilter
                            ? 'Try adjusting your search filters'
                            : 'Start by creating a new customer or importing via CSV'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <button
                          onClick={() => {
                            setEditingCustomer(null);
                            setIsAddModalOpen(true);
                          }}
                          className="px-3.5 py-1.5 bg-[#7B35E8] hover:bg-[#6824D3] text-white rounded-lg text-xs font-semibold"
                        >
                          Add Customer
                        </button>
                        <button
                          onClick={() => setIsImportModalOpen(true)}
                          className="px-3.5 py-1.5 bg-[#1A1A2E] hover:bg-[#232336] border border-[#2A2A40] text-white rounded-lg text-xs font-semibold"
                        >
                          Import CSV
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                (Array.isArray(customers) ? customers : []).map((c) => {
                  const isSelected = selectedCustomerIds.includes(c.id);
                  return (
                    <tr
                      key={c.id}
                      className={`hover:bg-[#161622]/60 transition-colors ${
                        isSelected ? 'bg-[#7B35E8]/5' : ''
                      }`}
                    >
                      <td className="py-3 px-4">
                        <button
                          type="button"
                          onClick={() => toggleSelectCustomer(c.id)}
                          className="text-[#9E9E9E] hover:text-white"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-[#7B35E8]" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </td>
                      <td className="py-3 px-4">
                        <Link
                          to={`/vendor/customers/${c.id}`}
                          className="font-semibold text-white hover:text-[#7B35E8] transition-colors flex items-center gap-2"
                        >
                          <div className="w-7 h-7 rounded-full bg-[#7B35E8]/20 text-[#7B35E8] flex items-center justify-center font-bold text-xs uppercase flex-shrink-0">
                            {(c.fullName || 'C').charAt(0)}
                          </div>
                          <span className="truncate max-w-[160px]">{c.fullName}</span>
                        </Link>
                      </td>
                      <td className="py-3 px-4 font-mono text-[#D1D1DB]">
                        {c.phone || <span className="text-[#6E6E82]">—</span>}
                      </td>
                      <td className="py-3 px-4 text-[#D1D1DB] truncate max-w-[160px]">
                        {c.email || <span className="text-[#6E6E82]">—</span>}
                      </td>
                      <td className="py-3 px-4 text-[#9E9E9E]">
                        {c.city || <span className="text-[#6E6E82]">—</span>}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap items-center gap-1 max-w-[180px]">
                          {c.tags && c.tags.length > 0 ? (
                            c.tags.slice(0, 3).map((tag) => (
                              <span
                                key={tag.id}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium"
                                style={{
                                  backgroundColor: `${tag.color || '#7B35E8'}15`,
                                  color: tag.color || '#7B35E8',
                                  border: `1px solid ${tag.color || '#7B35E8'}30`,
                                }}
                              >
                                {tag.name}
                              </span>
                            ))
                          ) : (
                            <span className="text-[#6E6E82]">—</span>
                          )}
                          {c.tags && c.tags.length > 3 && (
                            <span className="text-[10px] text-[#9E9E9E]">
                              +{c.tags.length - 3}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1">
                          {renderConsentBadge('SMS', c.consents)}
                          {renderConsentBadge('WHATSAPP', c.consents)}
                          {renderConsentBadge('EMAIL', c.consents)}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-[#9E9E9E] whitespace-nowrap">
                        {new Date(c.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            to={`/vendor/customers/${c.id}`}
                            className="p-1.5 text-[#9E9E9E] hover:text-[#7B35E8] rounded-lg hover:bg-[#1A1A2E] transition-colors"
                            title="View Profile & Communication History"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Link>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingCustomer(c);
                              setIsAddModalOpen(true);
                            }}
                            className="p-1.5 text-[#9E9E9E] hover:text-[#7B35E8] rounded-lg hover:bg-[#1A1A2E] transition-colors"
                            title="Edit Customer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteCustomer(c.id, c.fullName)}
                            className="p-1.5 text-[#9E9E9E] hover:text-red-400 rounded-lg hover:bg-[#1A1A2E] transition-colors"
                            title="Delete Customer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between px-6 py-4 border-t border-[#232336] bg-[#0E0E17] gap-4">
          <div className="flex items-center gap-2 text-xs text-[#9E9E9E]">
            <span>Rows per page:</span>
            <select
              value={limit}
              onChange={(e) => {
                setLimit(Number(e.target.value));
                setPage(1);
              }}
              className="px-2 py-1 bg-[#1A1A2E] border border-[#2A2A40] rounded-lg text-white text-xs"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
            <span>
              Showing {(page - 1) * limit + 1}–{Math.min(page * limit, totalCount)} of {totalCount}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-1.5 bg-[#1A1A2E] hover:bg-[#232336] disabled:opacity-40 text-white rounded-lg border border-[#2A2A40] transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs text-white px-2">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-1.5 bg-[#1A1A2E] hover:bg-[#232336] disabled:opacity-40 text-white rounded-lg border border-[#2A2A40] transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Modals */}
      <CustomerModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingCustomer(null);
        }}
        customerToEdit={editingCustomer}
        onCustomerSaved={() => {
          fetchCustomers();
          fetchTags();
        }}
      />

      <CsvImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportSuccess={() => {
          fetchCustomers();
          fetchTags();
        }}
      />

      <CustomerTagsModal
        isOpen={isTagsModalOpen}
        onClose={() => setIsTagsModalOpen(false)}
        onTagsUpdated={() => {
          fetchTags();
          fetchCustomers();
        }}
      />
    </div>
  );
};
