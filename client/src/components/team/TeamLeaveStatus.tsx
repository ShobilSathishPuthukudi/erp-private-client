import { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { getNormalizedRole } from '@/lib/roles';
import toast from 'react-hot-toast';
import {
  CalendarDays,
  RefreshCcw,
  Search,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
} from 'lucide-react';
import { clsx } from 'clsx';
import { Modal } from '@/components/shared/Modal';

interface UserInfo {
  uid: string;
  name: string;
  email?: string;
  department?: { name: string };
}

interface LeaveRecord {
  id: number;
  employeeId: string;
  employee?: UserInfo;
  type: string;
  fromDate: string;
  toDate: string;
  status: string;
  reason?: string;
  createdAt: string;
}

type LeaveTab = 'all' | 'requested' | 'pending' | 'approved' | 'rejected';

const REQUESTED_STATUSES = ['pending admin', 'pending_step1'];
const PENDING_HR_STATUSES = ['pending hr', 'pending_step2'];

const getBucket = (status = ''): Exclude<LeaveTab, 'all'> => {
  if (REQUESTED_STATUSES.includes(status)) return 'requested';
  if (PENDING_HR_STATUSES.includes(status)) return 'pending';
  if (status === 'approved') return 'approved';
  return 'rejected';
};

const getStatusLabel = (status = '') => {
  if (REQUESTED_STATUSES.includes(status)) return 'Requested';
  if (PENDING_HR_STATUSES.includes(status)) return 'Pending HR';
  if (status === 'approved') return 'Approved';
  return 'Rejected';
};

const getStatusTone = (status = '') => {
  const bucket = getBucket(status);
  if (bucket === 'approved') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (bucket === 'rejected') return 'bg-rose-50 text-rose-700 border-rose-200';
  if (bucket === 'requested') return 'bg-amber-50 text-amber-700 border-amber-200';
  return 'bg-sky-50 text-sky-700 border-sky-200';
};

const formatDate = (value?: string) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const getDurationDays = (from?: string, to?: string) => {
  if (!from || !to) return null;
  const a = new Date(from).getTime();
  const b = new Date(to).getTime();
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return Math.max(1, Math.round((b - a) / 86400000) + 1);
};

const getInitials = (name?: string, fallback?: string) => {
  const source = (name || fallback || '?').trim();
  const parts = source.split(/\s+/).filter(Boolean).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase()).join('') || '?';
};

const getErrorMessage = (error: unknown, fallback: string) => {
  if (axios.isAxiosError(error)) {
    const apiMessage = error.response?.data?.error || error.response?.data?.message;
    if (typeof apiMessage === 'string' && apiMessage.trim()) return apiMessage;
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return fallback;
};

type ConfirmState = { record: LeaveRecord; action: 'approve' | 'reject' } | null;

export default function TeamLeaveStatus() {
  const [records, setRecords] = useState<LeaveRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<LeaveTab>('all');
  const [query, setQuery] = useState('');
  const [actingId, setActingId] = useState<number | null>(null);
  const [confirmState, setConfirmState] = useState<ConfirmState>(null);

  const user = useAuthStore((state) => state.user);
  const role = getNormalizedRole(user?.role || '');
  const scopedDeptId = user?.deptId;
  const isSubDeptRole = ['openschool', 'online', 'skill', 'bvoc'].includes(role);
  const isHrView = role === 'hr';

  const fetchRecords = useCallback(async () => {
    if (!isHrView && !scopedDeptId) {
      setRecords([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const response = isHrView
        ? await api.get('/hr/leaves')
        : await api.get('/dept-admin/leaves', {
            params: {
              deptId: scopedDeptId,
              subDepartment: user?.subDepartment,
              strictSubDepartment: isSubDeptRole,
            },
          });
      setRecords(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('[TEAM-LEAVE-STATUS-FETCH-ERROR]:', error);
      setRecords([]);
      toast.error(getErrorMessage(error, 'Failed to load team leave status'));
    } finally {
      setIsLoading(false);
    }
  }, [isHrView, isSubDeptRole, scopedDeptId, user?.subDepartment]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const counts = useMemo(
    () => ({
      all: records.length,
      requested: records.filter((record) => getBucket(record.status) === 'requested').length,
      pending: records.filter((record) => getBucket(record.status) === 'pending').length,
      approved: records.filter((record) => getBucket(record.status) === 'approved').length,
      rejected: records.filter((record) => getBucket(record.status) === 'rejected').length,
    }),
    [records],
  );

  const requestedCount = counts.requested;

  const confirmAction = async () => {
    if (!confirmState) return;
    const { record, action } = confirmState;
    try {
      setActingId(record.id);
      if (isHrView) {
        await api.put(`/hr/leaves/${record.id}/${action}`);
      } else {
        await api.put(`/dept-admin/leaves/${record.id}/${action}`);
      }
      toast.success(
        isHrView
          ? action === 'approve'
            ? 'Leave fully approved by HR'
            : 'Leave rejected by HR'
          : action === 'approve'
            ? 'Leave verified and forwarded to HR'
            : 'Leave request rejected',
      );
      await fetchRecords();
      if (action === 'approve') {
        setActiveTab(isHrView ? 'approved' : 'pending');
      }
    } catch (error) {
      toast.error(getErrorMessage(error, `Failed to ${action} leave`));
    } finally {
      setActingId(null);
      setConfirmState(null);
    }
  };

  const filteredRecords = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return records.filter((record) => {
      if (activeTab !== 'all' && getBucket(record.status) !== activeTab) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      const searchable = [
        record.employee?.name,
        record.employee?.email,
        record.employeeId,
        record.employee?.department?.name,
        record.type,
        record.reason,
        record.status,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return searchable.includes(normalizedQuery);
    });
  }, [activeTab, query, records]);

  const tabs: { id: LeaveTab; label: string; count: number }[] = [
    { id: 'all', label: 'All', count: counts.all },
    { id: 'requested', label: 'Requested', count: counts.requested },
    { id: 'pending', label: 'Pending HR', count: counts.pending },
    { id: 'approved', label: 'Approved', count: counts.approved },
    { id: 'rejected', label: 'Rejected', count: counts.rejected },
  ];

  const canAct = (status: string) =>
    isHrView ? PENDING_HR_STATUSES.includes(status) : REQUESTED_STATUSES.includes(status);

  const approveLabel = isHrView ? 'Final approve' : 'Verify & approve';

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-900 text-white">
            <CalendarDays className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-slate-900">
              Team Leave Status
            </h1>
            <p className="mt-0.5 text-sm text-slate-500">
              {isHrView
                ? 'HR review board for department-approved leave requests.'
                : 'Leave requests for your team, across every stage.'}
            </p>
          </div>
        </div>

        <button
          onClick={fetchRecords}
          disabled={isLoading}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
        >
          <RefreshCcw className={clsx('h-4 w-4', isLoading && 'animate-spin')} />
          Refresh
        </button>
      </div>

      {/* Tabs + search */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-1.5 rounded-lg border border-slate-200 bg-white p-1">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={clsx(
                  'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition',
                  isActive
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:bg-slate-100',
                )}
              >
                {tab.label}
                <span
                  className={clsx(
                    'rounded-full px-1.5 py-0.5 text-[10px] tabular-nums',
                    isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600',
                  )}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="relative lg:max-w-sm lg:flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by employee, type, status…"
            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-700 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
          />
        </div>
      </div>

      {/* Pending nudge */}
      {!isHrView && requestedCount > 0 && activeTab !== 'requested' && (
        <button
          onClick={() => setActiveTab('requested')}
          className="flex w-full items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-left text-sm text-amber-800 transition hover:bg-amber-100"
        >
          <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
          <span className="flex-1">
            <span className="font-medium">{requestedCount}</span>{' '}
            {requestedCount === 1 ? 'request awaits' : 'requests await'} your verification.
          </span>
          <span className="text-xs font-medium text-amber-700">Review →</span>
        </button>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        {isLoading ? (
          <div className="divide-y divide-slate-100">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="h-14 animate-pulse bg-slate-50" />
            ))}
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100">
              <CalendarDays className="h-5 w-5 text-slate-400" />
            </div>
            <p className="mt-3 text-sm font-medium text-slate-700">No leave records</p>
            <p className="mt-1 max-w-sm text-xs text-slate-500">
              {query
                ? 'Nothing matched your search. Try a different term or tab.'
                : 'Nothing in this bucket yet.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/60">
                  <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Employee
                  </th>
                  <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 hidden md:table-cell">
                    Department
                  </th>
                  <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Type
                  </th>
                  <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Duration
                  </th>
                  <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Status
                  </th>
                  <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 hidden xl:table-cell">
                    Reason
                  </th>
                  <th className="px-5 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRecords.map((record) => {
                  const days = getDurationDays(record.fromDate, record.toDate);
                  const rowCanAct = canAct(record.status);
                  const busy = actingId === record.id;
                  return (
                    <tr key={record.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-700">
                            {getInitials(record.employee?.name, record.employeeId)}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-medium text-slate-900">
                              {record.employee?.name || record.employeeId}
                            </p>
                            <p className="truncate text-xs text-slate-500">
                              {record.employee?.email || record.employeeId}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-slate-600 hidden md:table-cell">
                        {record.employee?.department?.name || '—'}
                      </td>
                      <td className="px-5 py-3">
                        <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                          {record.type || '—'}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-700">
                            {formatDate(record.fromDate)}
                            <span className="mx-1 text-slate-400">→</span>
                            {formatDate(record.toDate)}
                          </span>
                          {days !== null && (
                            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600 tabular-nums">
                              {days}d
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 flex items-center gap-1 text-[11px] text-slate-400">
                          <Clock className="h-3 w-3" />
                          Submitted {formatDate(record.createdAt)}
                        </p>
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={clsx(
                            'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium',
                            getStatusTone(record.status),
                          )}
                        >
                          {getStatusLabel(record.status)}
                        </span>
                      </td>
                      <td className="px-5 py-3 hidden xl:table-cell">
                        <p
                          className="line-clamp-2 max-w-xs text-xs text-slate-600"
                          title={record.reason || ''}
                        >
                          {record.reason || <span className="text-slate-400">—</span>}
                        </p>
                      </td>
                      <td className="px-5 py-3 text-right">
                        {rowCanAct ? (
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              onClick={() => setConfirmState({ record, action: 'reject' })}
                              disabled={busy}
                              className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-50 hover:border-rose-200 transition disabled:opacity-50"
                            >
                              <XCircle className="h-3.5 w-3.5" />
                              Reject
                            </button>
                            <button
                              onClick={() => setConfirmState({ record, action: 'approve' })}
                              disabled={busy}
                              className="inline-flex items-center gap-1 rounded-md bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-slate-800 transition disabled:opacity-60"
                            >
                              <CheckCircle className="h-3.5 w-3.5" />
                              {approveLabel}
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Confirm modal */}
      <Modal
        isOpen={!!confirmState}
        onClose={() => (actingId ? null : setConfirmState(null))}
        title={confirmState?.action === 'approve' ? 'Confirm approval' : 'Confirm rejection'}
        maxWidth="md"
      >
        {confirmState && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">
                {getInitials(confirmState.record.employee?.name, confirmState.record.employeeId)}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-900">
                  {confirmState.record.employee?.name || confirmState.record.employeeId}
                </p>
                <p className="truncate text-xs text-slate-500">
                  {confirmState.record.type} · {formatDate(confirmState.record.fromDate)} →{' '}
                  {formatDate(confirmState.record.toDate)}
                </p>
              </div>
            </div>

            <p className="text-sm text-slate-600 leading-relaxed">
              {confirmState.action === 'approve'
                ? isHrView
                  ? 'This will finalize the approval. The employee and department head will be notified.'
                  : 'This will verify the request and forward it to HR for final approval.'
                : isHrView
                  ? 'This will reject the request at the HR stage. The employee will be notified.'
                  : 'This will reject the request and notify the employee.'}
            </p>

            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={() => setConfirmState(null)}
                disabled={!!actingId}
                className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmAction}
                disabled={!!actingId}
                className={clsx(
                  'inline-flex items-center gap-1.5 rounded-md px-4 py-2 text-sm font-medium text-white transition disabled:opacity-60',
                  confirmState.action === 'approve'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-rose-600 hover:bg-rose-700',
                )}
              >
                {confirmState.action === 'approve' ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <XCircle className="h-4 w-4" />
                )}
                {actingId
                  ? 'Working…'
                  : confirmState.action === 'approve'
                    ? approveLabel
                    : 'Reject'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
