import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { StaffMember, Invitation } from '../../types';
import {
  UserCheck,
  UserPlus,
  Mail,
  Shield,
  Trash2,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  X,
  Clock,
  AlertCircle,
  AlertTriangle,
} from 'lucide-react';

const AVAILABLE_PERMISSIONS = [
  { key: 'customer:read', label: 'View Customers', desc: 'Browse customer directory and contact lists' },
  { key: 'customer:write', label: 'Manage Customers', desc: 'Add, import, and update customer profiles' },
  { key: 'campaign:read', label: 'View Campaigns', desc: 'Browse SMS, WhatsApp and Email campaigns' },
  { key: 'campaign:write', label: 'Create & Edit Campaigns', desc: 'Compose new messaging campaigns and drafts' },
  { key: 'campaign:send', label: 'Send Campaigns', desc: 'Dispatch bulk marketing communications' },
  { key: 'wallet:read', label: 'View Credits', desc: 'Check credit balances and transaction records' },
  { key: 'analytics:read', label: 'View Analytics', desc: 'Access delivery and engagement reporting' },
];

export const VendorStaffPage: React.FC = () => {
  const { user } = useAuth();
  const [members, setMembers] = useState<StaffMember[]>([]);
  const [pendingInvitations, setPendingInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);

  // Invite Modal State
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('VENDOR_STAFF');
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([
    'customer:read',
    'customer:write',
    'campaign:read',
    'campaign:write',
    'analytics:read',
  ]);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccessLink, setInviteSuccessLink] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const fetchStaff = async () => {
    try {
      setLoading(true);
      const res = await api.get('/vendor/users');
      setMembers(res?.members || res?.data?.members || []);
      setPendingInvitations(res?.pendingInvitations || res?.data?.pendingInvitations || []);
    } catch (err) {
      console.error('Failed to fetch staff members:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  const handlePermissionToggle = (permKey: string) => {
    if (selectedPermissions.includes(permKey)) {
      setSelectedPermissions(selectedPermissions.filter((p) => p !== permKey));
    } else {
      setSelectedPermissions([...selectedPermissions, permKey]);
    }
  };

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteError(null);
    setInviteLoading(true);
    setInviteSuccessLink(null);

    try {
      const res = await api.post('/vendor/users/invite', {
        email: inviteEmail,
        roleName: inviteRole,
        permissions: selectedPermissions,
      });

      const fullLink = `${window.location.origin}${res.invitation.inviteLink}`;
      setInviteSuccessLink(fullLink);
      setInviteEmail('');
      fetchStaff();
    } catch (err: any) {
      setInviteError(err.message || 'Failed to send invitation');
    } finally {
      setInviteLoading(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleToggleStatus = async (staffUserId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await api.patch(`/vendor/users/${staffUserId}/status`, { status: newStatus });
      fetchStaff();
    } catch (err: any) {
      alert(`Error updating status: ${err.message}`);
    }
  };

  const handleRemoveMember = async (staffUserId: string, name: string) => {
    if (!window.confirm(`Are you sure you want to remove ${name} from this workspace?`)) {
      return;
    }

    try {
      await api.delete(`/vendor/users/${staffUserId}`);
      fetchStaff();
    } catch (err: any) {
      alert(`Error removing member: ${err.message}`);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight">Team & Staff Management</h2>
          <p className="text-sm text-baash-textMuted mt-1">
            Invite team members, assign granular permissions, and control access to your workspace.
          </p>
        </div>

        <button
          onClick={() => {
            setInviteSuccessLink(null);
            setInviteError(null);
            setInviteModalOpen(true);
          }}
          className="baash-btn-primary flex items-center gap-2 text-sm"
        >
          <UserPlus size={16} />
          <span>Invite Team Member</span>
        </button>
      </div>

      {/* Staff Members List */}
      <div className="baash-card border border-baash-cardBorder overflow-hidden">
        <div className="p-5 border-b border-baash-cardBorder flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserCheck size={18} className="text-baash-purple" />
            <h3 className="text-base font-bold text-white">Active Team Members</h3>
          </div>
          <span className="text-xs text-baash-textMuted font-medium">
            {members.length} {members.length === 1 ? 'member' : 'members'}
          </span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-baash-cardBorder border-t-baash-purple rounded-full animate-spin"></div>
          </div>
        ) : members.length === 0 ? (
          <div className="text-center py-12 text-baash-textMuted text-xs">
            No team members registered yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-baash-textMuted">
              <thead className="bg-baash-darkBg/80 text-[11px] uppercase tracking-wider text-baash-textMuted/80 border-b border-baash-cardBorder">
                <tr>
                  <th className="py-3 px-6 font-semibold">User Profile</th>
                  <th className="py-3 px-6 font-semibold">Role</th>
                  <th className="py-3 px-6 font-semibold">Status</th>
                  <th className="py-3 px-6 font-semibold">Permissions</th>
                  <th className="py-3 px-6 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-baash-cardBorder/60">
                {members.map((m) => (
                  <tr key={m.membershipId} className="hover:bg-baash-darkBg/30 transition-colors">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-baash-purple to-baash-pink flex items-center justify-center text-white font-bold text-xs">
                          {m.fullName.charAt(0)}
                        </div>
                        <div>
                          <p className="font-semibold text-white">{m.fullName}</p>
                          <p className="text-xs text-baash-textMuted">{m.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span
                        className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                          m.role === 'VENDOR_ADMIN'
                            ? 'bg-baash-pink/10 text-baash-pink border border-baash-pink/20'
                            : 'bg-baash-purple/10 text-baash-purpleLight border border-baash-purple/20'
                        }`}
                      >
                        {m.roleDisplayName}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span
                        className={`text-[11px] px-2.5 py-0.5 rounded-full font-semibold ${
                          m.status === 'ACTIVE'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-red-500/10 text-red-400 border border-red-500/20'
                        }`}
                      >
                        {m.status}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {m.role === 'VENDOR_ADMIN' ? (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-white">
                            All Vendor Permissions
                          </span>
                        ) : m.customPermissions && m.customPermissions.length > 0 ? (
                          m.customPermissions.map((perm) => (
                            <span
                              key={perm}
                              className="text-[10px] px-1.5 py-0.5 rounded bg-baash-cardBg border border-baash-cardBorder text-baash-textMuted"
                            >
                              {perm}
                            </span>
                          ))
                        ) : (
                          <span className="text-[10px] text-baash-textMuted/60">Default Staff Role</span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-6 text-right">
                      {m.userId !== user?.id && (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleToggleStatus(m.userId, m.status)}
                            className="px-2.5 py-1 text-xs rounded-lg border border-baash-cardBorder bg-baash-darkBg hover:bg-baash-cardBorder text-white transition-colors"
                          >
                            {m.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                          </button>
                          <button
                            onClick={() => handleRemoveMember(m.userId, m.fullName)}
                            title="Remove from workspace"
                            className="p-1.5 rounded-lg border border-red-500/20 bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pending Invitations Section */}
      {pendingInvitations.length > 0 && (
        <div className="baash-card border border-baash-cardBorder p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Clock size={18} className="text-amber-400" />
              <h3 className="text-base font-bold text-white">Pending Team Invitations</h3>
            </div>
            <span className="text-xs text-baash-textMuted">
              {pendingInvitations.length} pending
            </span>
          </div>

          <div className="space-y-3">
            {pendingInvitations.map((inv) => {
              const inviteLink = `${window.location.origin}/accept-invitation?token=${inv.token}`;
              return (
                <div
                  key={inv.id}
                  className="p-3.5 rounded-xl bg-baash-darkBg border border-baash-cardBorder/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-white">{inv.email}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-baash-purple/20 text-baash-purpleLight font-semibold">
                        {inv.role?.displayName || 'Staff'}
                      </span>
                    </div>
                    <p className="text-[11px] text-baash-textMuted mt-0.5">
                      Expires: {new Date(inv.expiresAt).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button
                      onClick={() => handleCopy(inviteLink)}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-baash-cardBg hover:bg-baash-cardBorder border border-baash-cardBorder text-white text-xs font-semibold transition-colors"
                    >
                      {copiedLink ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                      <span>{copiedLink ? 'Copied Link' : 'Copy Invite Link'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal: Invite Staff Member */}
      {inviteModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="baash-card w-full max-w-lg p-6 border border-baash-cardBorder shadow-2xl relative my-8">
            <button
              onClick={() => setInviteModalOpen(false)}
              className="absolute top-5 right-5 text-baash-textMuted hover:text-white"
            >
              <X size={18} />
            </button>

            <div className="mb-5">
              <h3 className="text-xl font-black text-white">Invite Team Member</h3>
              <p className="text-xs text-baash-textMuted mt-1">
                Dispatch an invitation token to bring a team member into your vendor workspace.
              </p>
            </div>

            {inviteError && (
              <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                {inviteError}
              </div>
            )}

            {inviteSuccessLink ? (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs">
                  <div className="flex items-center gap-2 mb-2 font-bold text-white text-sm">
                    <CheckCircle2 size={18} className="text-emerald-400" />
                    <span>Invitation Generated Successfully</span>
                  </div>
                  <p className="text-baash-textMuted">
                    Share this unique onboarding link with your team member. The token expires in 48 hours.
                  </p>
                  <div className="mt-3 p-3 bg-baash-black rounded-lg border border-baash-cardBorder flex items-center justify-between gap-2">
                    <code className="text-xs text-baash-pink truncate font-mono select-all">
                      {inviteSuccessLink}
                    </code>
                    <button
                      type="button"
                      onClick={() => handleCopy(inviteSuccessLink)}
                      className="p-1.5 rounded bg-baash-cardBg border border-baash-cardBorder text-white hover:text-baash-purple shrink-0"
                      title="Copy link"
                    >
                      {copiedLink ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setInviteModalOpen(false)}
                  className="w-full baash-btn-primary py-2.5 text-xs"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleInviteSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-baash-textMuted mb-1">
                    Staff Email Address *
                  </label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-baash-textMuted" />
                    <input
                      type="email"
                      required
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="team.member@business.com"
                      className="w-full bg-baash-darkBg border border-baash-cardBorder rounded-lg pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-baash-purple"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-baash-textMuted mb-1">
                    Role Assignment
                  </label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value)}
                    className="w-full bg-baash-darkBg border border-baash-cardBorder rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-baash-purple"
                  >
                    <option value="VENDOR_STAFF">Vendor Staff (Operational team member)</option>
                    <option value="VENDOR_ADMIN">Vendor Administrator (Full workspace admin)</option>
                  </select>
                </div>

                {inviteRole === 'VENDOR_STAFF' && (
                  <div>
                    <label className="block text-xs font-semibold text-baash-textMuted mb-2">
                      Granular Staff Permissions
                    </label>
                    <div className="space-y-2 max-h-48 overflow-y-auto p-2 bg-baash-darkBg rounded-lg border border-baash-cardBorder">
                      {AVAILABLE_PERMISSIONS.map((perm) => (
                        <label
                          key={perm.key}
                          className="flex items-start gap-2.5 p-2 rounded hover:bg-baash-cardBg/60 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={selectedPermissions.includes(perm.key)}
                            onChange={() => handlePermissionToggle(perm.key)}
                            className="mt-0.5 rounded border-baash-cardBorder bg-baash-black text-baash-purple focus:ring-baash-purple"
                          />
                          <div>
                            <p className="text-xs font-semibold text-white">{perm.label}</p>
                            <p className="text-[10px] text-baash-textMuted">{perm.desc}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-end gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setInviteModalOpen(false)}
                    className="px-4 py-2 text-xs text-baash-textMuted hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={inviteLoading}
                    className="baash-btn-primary text-xs py-2 px-5"
                  >
                    {inviteLoading ? 'Generating...' : 'Send Invitation'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
