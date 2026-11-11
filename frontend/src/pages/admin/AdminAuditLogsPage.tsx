import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldAlert,
  Search,
  Filter,
  RefreshCw,
  Eye,
  User,
  Building,
  Calendar,
  X,
  FileCode,
} from 'lucide-react';
import api from '../../services/api';

export const AdminAuditLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [actionFilter, setActionFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');

  // Inspection Modal
  const [selectedLog, setSelectedLog] = useState<any | null>(null);

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const params: any = { page, limit: 25 };
      if (actionFilter) params.action = actionFilter;
      if (entityFilter) params.entityType = entityFilter;

      const res = await api.get('/admin/audit-logs', { params });
      const data = res.data || res;
      setLogs(data.data || []);
      setTotal(data.meta?.total || 0);
      setTotalPages(data.meta?.totalPages || 1);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  }, [page, actionFilter, entityFilter]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const getActionBadge = (action: string) => {
    if (action.includes('LOGIN') || action.includes('AUTH')) {
      return 'bg-purple-500/15 text-baash-purpleLight border-purple-500/30';
    }
    if (action.includes('CREATE') || action.includes('INITIAL')) {
      return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
    }
    if (action.includes('ADJUST') || action.includes('UPDATE')) {
      return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
    }
    if (action.includes('DELETE') || action.includes('CANCEL') || action.includes('FAIL')) {
      return 'bg-rose-500/15 text-rose-400 border-rose-500/30';
    }
    return 'bg-zinc-800 text-zinc-300 border-zinc-700';
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-white tracking-tight">Security & Audit Logs</h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-baash-purple/20 text-baash-purpleLight border border-baash-purple/30 font-semibold">
              Immutable Ledger
            </span>
          </div>
          <p className="text-sm text-baash-textMuted mt-1">
            Track all administrative logins, vendor changes, credit adjustments, and security operations.
          </p>
        </div>

        <button
          onClick={fetchLogs}
          disabled={loading}
          className="p-2.5 bg-baash-darkBg hover:bg-baash-cardBorder border border-baash-cardBorder rounded-lg text-baash-textMuted hover:text-white transition-colors self-start sm:self-auto cursor-pointer"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">
          {error}
        </div>
      )}

      {/* Filter Bar */}
      <div className="p-4 rounded-xl bg-baash-darkBg border border-baash-cardBorder flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-baash-textMuted" />
            <input
              type="text"
              placeholder="Filter by action keyword..."
              value={actionFilter}
              onChange={(e) => {
                setActionFilter(e.target.value);
                setPage(1);
              }}
              className="w-full pl-9 pr-3 py-2 bg-baash-black border border-baash-cardBorder rounded-lg text-white text-xs focus:outline-none focus:border-baash-purple"
            />
          </div>

          <div className="relative w-full sm:w-48">
            <input
              type="text"
              placeholder="Entity type (e.g. Vendor)..."
              value={entityFilter}
              onChange={(e) => {
                setEntityFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 bg-baash-black border border-baash-cardBorder rounded-lg text-white text-xs focus:outline-none focus:border-baash-purple"
            />
          </div>
        </div>

        <div className="text-xs text-baash-textMuted">
          Showing <span className="font-bold text-white">{logs.length}</span> of{' '}
          <span className="font-bold text-white">{total}</span> events
        </div>
      </div>

      {/* Audit Logs Table */}
      <div className="rounded-xl bg-baash-darkBg border border-baash-cardBorder overflow-hidden">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-baash-textMuted">
            <RefreshCw size={24} className="animate-spin text-baash-purple mb-2" />
            <p className="text-xs">Loading audit logs...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="py-16 text-center text-xs text-baash-textMuted">
            No audit records found matching your filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-baash-black/40 text-baash-textMuted uppercase font-semibold border-b border-baash-cardBorder">
                <tr>
                  <th className="py-3 px-4">Timestamp (IST)</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Actor</th>
                  <th className="py-3 px-4">Entity</th>
                  <th className="py-3 px-4">IP / Client</th>
                  <th className="py-3 px-4 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-baash-cardBorder/60">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-baash-cardBorder/20 transition-colors">
                    <td className="py-3 px-4 text-baash-textMuted font-mono">
                      {new Date(log.createdAt).toLocaleString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </td>

                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold border ${getActionBadge(
                          log.action,
                        )}`}
                      >
                        {log.action}
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      {log.user ? (
                        <div>
                          <div className="font-bold text-white flex items-center gap-1">
                            <User size={12} className="text-baash-textMuted" />
                            <span>{log.user.fullName}</span>
                          </div>
                          <div className="text-[10px] text-baash-textMuted">{log.user.email}</div>
                        </div>
                      ) : (
                        <span className="text-zinc-500 font-mono">System / Gateway</span>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-semibold text-zinc-300">{log.entityType}</div>
                      {log.vendor && (
                        <div className="text-[10px] text-baash-purpleLight flex items-center gap-1">
                          <Building size={10} />
                          <span>{log.vendor.businessName}</span>
                        </div>
                      )}
                    </td>

                    <td className="py-3 px-4 text-baash-textMuted font-mono text-[11px]">
                      {log.ipAddress || '127.0.0.1'}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="p-1.5 bg-baash-black hover:bg-baash-cardBorder border border-baash-cardBorder rounded text-baash-textMuted hover:text-white transition-colors"
                        title="Inspect payload"
                      >
                        <Eye size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t border-baash-cardBorder/60 text-xs text-baash-textMuted">
            <span>
              Page {page} of {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="px-3 py-1 bg-baash-cardBorder/50 hover:bg-baash-cardBorder disabled:opacity-40 rounded"
              >
                Previous
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
                className="px-3 py-1 bg-baash-cardBorder/50 hover:bg-baash-cardBorder disabled:opacity-40 rounded"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Metadata Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg bg-baash-darkBg border border-baash-cardBorder rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-baash-cardBorder flex items-center justify-between">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <FileCode size={18} className="text-baash-purpleLight" />
                <span>Audit Event Payload</span>
              </h3>
              <button
                onClick={() => setSelectedLog(null)}
                className="p-1.5 text-baash-textMuted hover:text-white rounded-lg hover:bg-baash-cardBorder"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-3">
              <div className="text-xs text-baash-textMuted space-y-1">
                <div>
                  <span className="text-zinc-400">Action:</span>{' '}
                  <span className="font-bold text-white">{selectedLog.action}</span>
                </div>
                <div>
                  <span className="text-zinc-400">Entity:</span> {selectedLog.entityType} ({selectedLog.entityId || 'N/A'})
                </div>
                <div>
                  <span className="text-zinc-400">Actor:</span> {selectedLog.user?.email || 'System'}
                </div>
              </div>

              <div className="p-4 bg-baash-black rounded-xl border border-baash-cardBorder text-xs font-mono text-zinc-300 max-h-72 overflow-y-auto">
                <pre>{JSON.stringify(selectedLog.metadata, null, 2)}</pre>
              </div>
            </div>

            <div className="p-4 bg-baash-black/40 border-t border-baash-cardBorder flex justify-end">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 bg-baash-cardBorder hover:bg-zinc-700 text-white font-bold text-xs rounded-lg"
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
