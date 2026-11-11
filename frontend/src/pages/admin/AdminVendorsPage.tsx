import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { Vendor, VendorStatus } from '../../types';
import {
  Building2,
  Search,
  Plus,
  Filter,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  ExternalLink,
  Edit,
  X,
  Phone,
  Mail,
  MapPin,
  Users,
  Shield,
  ArrowRight,
} from 'lucide-react';

export const AdminVendorsPage: React.FC = () => {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Modal & Drawer states
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState<any | null>(null);
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);

  // Create Vendor Form State
  const [createForm, setCreateForm] = useState({
    businessName: '',
    businessEmail: '',
    businessPhone: '',
    businessAddress: '',
    adminName: '',
    adminEmail: '',
    adminPassword: '',
  });
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Status update state
  const [statusLoading, setStatusLoading] = useState(false);

  const fetchVendors = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (search) params.search = search;
      if (statusFilter !== 'ALL') params.status = statusFilter;

      const res = await api.get('/admin/vendors', { params });
      const vendorList = res?.vendors ?? res?.data?.vendors ?? (Array.isArray(res) ? res : []);
      setVendors(Array.isArray(vendorList) ? vendorList : []);
    } catch (err) {
      console.error('Failed to fetch vendors:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVendors();
  }, [statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchVendors();
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    setCreateLoading(true);

    try {
      const payload: any = {
        businessName: createForm.businessName.trim(),
        businessEmail: createForm.businessEmail.trim(),
        adminName: createForm.adminName.trim(),
        adminEmail: createForm.adminEmail.trim(),
      };
      if (createForm.businessPhone.trim()) payload.businessPhone = createForm.businessPhone.trim();
      if (createForm.businessAddress.trim()) payload.businessAddress = createForm.businessAddress.trim();
      if (createForm.adminPassword.trim()) payload.adminPassword = createForm.adminPassword.trim();

      await api.post('/admin/vendors', payload);
      setCreateModalOpen(false);
      setCreateForm({
        businessName: '',
        businessEmail: '',
        businessPhone: '',
        businessAddress: '',
        adminName: '',
        adminEmail: '',
        adminPassword: '',
      });
      fetchVendors();
    } catch (err: any) {
      const msg = err.response?.data?.message;
      const errMsg = Array.isArray(msg)
        ? msg.join(', ')
        : typeof msg === 'string'
        ? msg
        : err.message || 'Failed to create vendor workspace';
      setCreateError(errMsg);
    } finally {
      setCreateLoading(false);
    }
  };

  const handleViewVendor = async (id: string) => {
    try {
      const data = await api.get(`/admin/vendors/${id}`);
      setSelectedVendor(data?.data || data);
      setDetailDrawerOpen(true);
    } catch (err) {
      console.error('Failed to fetch vendor details:', err);
    }
  };

  const handleStatusChange = async (newStatus: VendorStatus) => {
    if (!selectedVendor) return;
    setStatusLoading(true);
    try {
      const res = await api.patch(`/admin/vendors/${selectedVendor.id}/status`, {
        status: newStatus,
        reason: `Administrative status change to ${newStatus}`,
      });
      const updated = res?.data || res;
      setSelectedVendor({ ...selectedVendor, status: updated.status });
      fetchVendors();
    } catch (err: any) {
      const msg = err.response?.data?.message;
      const errMsg = Array.isArray(msg)
        ? msg.join(', ')
        : typeof msg === 'string'
        ? msg
        : err.message || 'Error updating status';
      alert(errMsg);
    } finally {
      setStatusLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight">Vendor Management</h2>
          <p className="text-sm text-baash-textMuted mt-1">
            Provision, monitor, and configure business vendor workspaces
          </p>
        </div>

        <button
          onClick={() => setCreateModalOpen(true)}
          className="baash-btn-primary flex items-center gap-2 text-sm"
        >
          <Plus size={16} />
          <span>New Vendor Workspace</span>
        </button>
      </div>

      {/* Filters & Search Bar */}
      <div className="baash-card p-4 border border-baash-cardBorder flex flex-col md:flex-row items-center justify-between gap-4">
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-80">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-baash-textMuted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email..."
            className="w-full bg-baash-darkBg border border-baash-cardBorder rounded-xl pl-9 pr-4 py-2 text-sm text-white placeholder-baash-textMuted/60 focus:outline-none focus:border-baash-purple"
          />
        </form>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto">
          {['ALL', 'ACTIVE', 'INACTIVE', 'SUSPENDED', 'PENDING'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                statusFilter === status
                  ? 'bg-baash-purple text-white shadow-sm'
                  : 'bg-baash-darkBg text-baash-textMuted hover:text-white border border-baash-cardBorder/60'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Vendors Table */}
      <div className="baash-card border border-baash-cardBorder overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-baash-cardBorder border-t-baash-purple rounded-full animate-spin"></div>
          </div>
        ) : vendors.length === 0 ? (
          <div className="text-center py-16">
            <Building2 size={36} className="text-baash-textMuted/40 mx-auto mb-3" />
            <h3 className="text-base font-bold text-white">No Vendors Found</h3>
            <p className="text-xs text-baash-textMuted mt-1">
              {search || statusFilter !== 'ALL'
                ? 'Try adjusting your search criteria or filters.'
                : 'Click "+ New Vendor Workspace" above to provision your first business account.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-baash-textMuted">
              <thead className="bg-baash-darkBg/80 text-[11px] uppercase tracking-wider text-baash-textMuted/80 border-b border-baash-cardBorder">
                <tr>
                  <th className="py-3.5 px-6 font-semibold">Business Vendor</th>
                  <th className="py-3.5 px-6 font-semibold">Contact Email</th>
                  <th className="py-3.5 px-6 font-semibold">Phone</th>
                  <th className="py-3.5 px-6 font-semibold">Staff</th>
                  <th className="py-3.5 px-6 font-semibold">CRM Database</th>
                  <th className="py-3.5 px-6 font-semibold">Status</th>
                  <th className="py-3.5 px-6 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-baash-cardBorder/60">
                {(Array.isArray(vendors) ? vendors : []).map((v) => (
                  <tr key={v.id} className="hover:bg-baash-darkBg/40 transition-colors">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-baash-purple/20 to-baash-pink/20 border border-baash-purple/30 flex items-center justify-center text-white font-bold text-xs shrink-0">
                          {v.businessName.charAt(0)}
                        </div>
                        <div>
                          <p className="font-semibold text-white">{v.businessName}</p>
                          <p className="text-[11px] text-baash-textMuted truncate max-w-xs">{v.businessAddress || 'No address specified'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-xs text-white/90">{v.businessEmail}</td>
                    <td className="py-4 px-6 text-xs">{v.businessPhone || '—'}</td>
                    <td className="py-4 px-6">
                      <span className="text-xs px-2.5 py-1 rounded-full bg-baash-cardBg border border-baash-cardBorder text-white font-medium">
                        {v._count?.vendorUsers || 0} users
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="text-xs">
                        <span className="font-bold text-white">
                          {(v._count?.customers || 0).toLocaleString()}
                        </span>{' '}
                        <span className="text-baash-textMuted">customers</span>
                        {v._count?.customerSegments ? (
                          <span className="text-[10px] text-baash-purpleLight block">
                            {v._count.customerSegments} segments
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span
                        className={`text-[11px] px-2.5 py-0.5 rounded-full font-semibold ${
                          v.status === 'ACTIVE'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : v.status === 'SUSPENDED'
                            ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                            : v.status === 'INACTIVE'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : 'bg-baash-cardBorder text-baash-textMuted'
                        }`}
                      >
                        {v.status}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <button
                        onClick={() => handleViewVendor(v.id)}
                        className="px-3 py-1.5 rounded-lg bg-baash-darkBg hover:bg-baash-cardBorder border border-baash-cardBorder text-xs text-baash-purpleLight font-semibold transition-colors"
                      >
                        Manage →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Create Vendor Workspace */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="baash-card w-full max-w-lg p-6 border border-baash-cardBorder shadow-2xl relative my-8">
            <button
              onClick={() => setCreateModalOpen(false)}
              className="absolute top-5 right-5 text-baash-textMuted hover:text-white"
            >
              <X size={18} />
            </button>

            <div className="mb-5">
              <h3 className="text-xl font-black text-white">Create Vendor Workspace</h3>
              <p className="text-xs text-baash-textMuted mt-1">
                Provision a new business workspace and its initial Vendor Administrator account.
              </p>
            </div>

            {createError && (
              <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div className="p-3 bg-baash-darkBg rounded-xl border border-baash-cardBorder space-y-3">
                <span className="text-[11px] font-bold text-baash-purple uppercase tracking-wider block">
                  1. Business Details
                </span>
                <div>
                  <label className="block text-xs font-semibold text-baash-textMuted mb-1">
                    Business Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={createForm.businessName}
                    onChange={(e) => setCreateForm({ ...createForm, businessName: e.target.value })}
                    placeholder="e.g. Zen Spa & Wellness"
                    className="w-full bg-baash-cardBg border border-baash-cardBorder rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-baash-purple"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-semibold text-baash-textMuted mb-1">
                      Business Email *
                    </label>
                    <input
                      type="email"
                      required
                      value={createForm.businessEmail}
                      onChange={(e) => setCreateForm({ ...createForm, businessEmail: e.target.value })}
                      placeholder="contact@zenspa.in"
                      className="w-full bg-baash-cardBg border border-baash-cardBorder rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-baash-purple"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-baash-textMuted mb-1">
                      Phone Number
                    </label>
                    <input
                      type="text"
                      value={createForm.businessPhone}
                      onChange={(e) => setCreateForm({ ...createForm, businessPhone: e.target.value })}
                      placeholder="+91 98765 43210"
                      className="w-full bg-baash-cardBg border border-baash-cardBorder rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-baash-purple"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-baash-textMuted mb-1">
                    Business Address
                  </label>
                  <input
                    type="text"
                    value={createForm.businessAddress}
                    onChange={(e) => setCreateForm({ ...createForm, businessAddress: e.target.value })}
                    placeholder="12th Main, HAL 2nd Stage, Bangalore"
                    className="w-full bg-baash-cardBg border border-baash-cardBorder rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-baash-purple"
                  />
                </div>
              </div>

              <div className="p-3 bg-baash-darkBg rounded-xl border border-baash-cardBorder space-y-3">
                <span className="text-[11px] font-bold text-baash-pink uppercase tracking-wider block">
                  2. Vendor Administrator Account
                </span>
                <div>
                  <label className="block text-xs font-semibold text-baash-textMuted mb-1">
                    Admin Contact Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={createForm.adminName}
                    onChange={(e) => setCreateForm({ ...createForm, adminName: e.target.value })}
                    placeholder="e.g. Ramesh Chandra"
                    className="w-full bg-baash-cardBg border border-baash-cardBorder rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-baash-purple"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-baash-textMuted mb-1">
                    Admin Login Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={createForm.adminEmail}
                    onChange={(e) => setCreateForm({ ...createForm, adminEmail: e.target.value })}
                    placeholder="ramesh@zenspa.in"
                    className="w-full bg-baash-cardBg border border-baash-cardBorder rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-baash-purple"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-baash-textMuted mb-1">
                    Initial Password (Optional — defaults to 'VendorAdmin@2026')
                  </label>
                  <input
                    type="password"
                    value={createForm.adminPassword}
                    onChange={(e) => setCreateForm({ ...createForm, adminPassword: e.target.value })}
                    placeholder="VendorAdmin@2026"
                    className="w-full bg-baash-cardBg border border-baash-cardBorder rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-baash-purple"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 text-xs text-baash-textMuted hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  className="baash-btn-primary text-xs py-2 px-5"
                >
                  {createLoading ? 'Provisioning...' : 'Provision Workspace'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Drawer: Vendor Details & Status Actions */}
      {detailDrawerOpen && selectedVendor && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex justify-end">
          <div className="w-full max-w-xl bg-baash-darkBg border-l border-baash-cardBorder h-full flex flex-col justify-between overflow-y-auto p-6 md:p-8">
            <div className="space-y-6">
              {/* Drawer Header */}
              <div className="flex items-start justify-between pb-4 border-b border-baash-cardBorder">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-baash-purple/20 border border-baash-purple/30 flex items-center justify-center text-baash-purpleLight font-black text-lg">
                    {(selectedVendor.businessName || 'V').charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-white">{selectedVendor.businessName}</h3>
                    <p className="text-xs text-baash-textMuted">{selectedVendor.businessEmail}</p>
                  </div>
                </div>
                <button
                  onClick={() => setDetailDrawerOpen(false)}
                  className="p-2 text-baash-textMuted hover:text-white"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Status & Lifecycle Actions */}
              <div className="p-4 rounded-xl bg-baash-cardBg border border-baash-cardBorder space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-baash-textMuted uppercase">
                    Workspace Lifecycle Status
                  </span>
                  <span
                    className={`text-xs px-3 py-0.5 rounded-full font-bold ${
                      selectedVendor.status === 'ACTIVE'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : selectedVendor.status === 'SUSPENDED'
                        ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                        : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    }`}
                  >
                    {selectedVendor.status}
                  </span>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    disabled={statusLoading || selectedVendor.status === 'ACTIVE'}
                    onClick={() => handleStatusChange('ACTIVE')}
                    className="flex-1 py-1.5 px-3 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-semibold disabled:opacity-30 transition-colors"
                  >
                    Activate
                  </button>
                  <button
                    disabled={statusLoading || selectedVendor.status === 'INACTIVE'}
                    onClick={() => handleStatusChange('INACTIVE')}
                    className="flex-1 py-1.5 px-3 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 text-xs font-semibold disabled:opacity-30 transition-colors"
                  >
                    Deactivate
                  </button>
                  <button
                    disabled={statusLoading || selectedVendor.status === 'SUSPENDED'}
                    onClick={() => handleStatusChange('SUSPENDED')}
                    className="flex-1 py-1.5 px-3 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 text-xs font-semibold disabled:opacity-30 transition-colors"
                  >
                    Suspend
                  </button>
                </div>
              </div>

              {/* Vendor Profile Info */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  Contact & Profile
                </h4>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center gap-2 text-baash-textMuted">
                    <Mail size={14} />
                    <span className="text-white">{selectedVendor.businessEmail}</span>
                  </div>
                  <div className="flex items-center gap-2 text-baash-textMuted">
                    <Phone size={14} />
                    <span className="text-white">{selectedVendor.businessPhone || 'None'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-baash-textMuted">
                    <MapPin size={14} />
                    <span className="text-white">{selectedVendor.businessAddress || 'None'}</span>
                  </div>
                </div>
              </div>

              {/* Tenant CRM Isolation Summary */}
              <div className="p-4 rounded-xl bg-baash-cardBg border border-baash-cardBorder space-y-2">
                <span className="text-xs font-semibold text-baash-textMuted uppercase block">
                  Tenant CRM Metrics (Isolated Database)
                </span>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-lg bg-baash-darkBg border border-baash-cardBorder/60">
                    <span className="text-[10px] text-baash-textMuted block">Customers</span>
                    <span className="text-base font-bold text-white">
                      {(selectedVendor._count?.customers ?? 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-baash-darkBg border border-baash-cardBorder/60">
                    <span className="text-[10px] text-baash-textMuted block">Segments</span>
                    <span className="text-base font-bold text-white">
                      {(selectedVendor._count?.customerSegments ?? 0).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Associated Staff Members */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                    Associated Staff & Users
                  </h4>
                  <span className="text-xs text-baash-textMuted">
                    {selectedVendor.vendorUsers?.length || 0} members
                  </span>
                </div>

                <div className="divide-y divide-baash-cardBorder/60 bg-baash-cardBg rounded-xl border border-baash-cardBorder p-2">
                  {selectedVendor.vendorUsers?.length > 0 ? (
                    selectedVendor.vendorUsers.map((vu: any) => (
                      <div key={vu.id} className="py-2.5 px-3 flex items-center justify-between text-xs">
                        <div>
                          <p className="font-semibold text-white">{vu.user?.fullName || 'User'}</p>
                          <p className="text-[11px] text-baash-textMuted">{vu.user?.email || 'N/A'}</p>
                        </div>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-baash-purple/20 text-baash-purpleLight font-semibold">
                          {vu.user?.userRoles?.[0]?.role?.displayName || 'Staff'}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-baash-textMuted p-3">No users associated yet.</p>
                  )}
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-baash-cardBorder">
              <button
                onClick={() => setDetailDrawerOpen(false)}
                className="w-full baash-btn-outline text-xs py-2.5"
              >
                Close Drawer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
