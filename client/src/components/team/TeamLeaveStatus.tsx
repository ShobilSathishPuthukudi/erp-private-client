import { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { getNormalizedRole } from '@/lib/roles';
import { useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  CalendarDays,
  RefreshCcw,
  Search,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  Building,
  MessageSquare,
  CheckCircle2,
  Eye,
  ShieldCheck,
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

type ConfirmState = { record: LeaveRecord; action: 'approve' | 'reject' | 'view' } | null;

export default function TeamLeaveStatus() {
  const [records, setRecords] = useState<LeaveRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<LeaveTab>('all');
  const [query, setQuery] = useState('');
  const [actingId, setActingId] = useState<number | null>(null);
  const [confirmState, setConfirmState] = useState<ConfirmState>(null);

  const user = useAuthStore((state) => state.user);
  const location = useLocation();
  const role = getNormalizedRole(user?.role || '');
  const scopedDeptId = user?.deptId;
  const isSubDeptRole = ['openschool', 'online', 'skill', 'bvoc'].includes(role);
  const isHrApprovalView = role === 'hr' && location.pathname.includes('/dashboard/hr/leaves');

  const fetchRecords = useCallback(async () => {
    if (!isHrApprovalView && !scopedDeptId) {
      setRecords([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const response = isHrApprovalView
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
  }, [isHrApprovalView, isSubDeptRole, scopedDeptId, user?.subDepartment]);

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
      if (isHrApprovalView) {
        await api.put(`/hr/leaves/${record.id}/${action}`);
      } else {
        await api.put(`/dept-admin/leaves/${record.id}/${action}`);
      }
      toast.success(
        isHrApprovalView
          ? action === 'approve'
            ? 'Leave fully approved by HR'
            : 'Leave rejected by HR'
          : action === 'approve'
            ? 'Leave verified and forwarded to HR'
            : 'Leave request rejected',
      );
      await fetchRecords();
      if (action === 'approve') {
        setActiveTab(isHrApprovalView ? 'approved' : 'pending');
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

  const tabs: { id: LeaveTab; label: string; count: number; icon: any }[] = [
    { id: 'all', label: 'All', count: counts.all, icon: CalendarDays },
    { id: 'requested', label: 'Requested', count: counts.requested, icon: AlertCircle },
    { id: 'pending', label: 'Pending HR', count: counts.pending, icon: Clock },
    { id: 'approved', label: 'Approved', count: counts.approved, icon: CheckCircle2 },
    { id: 'rejected', label: 'Rejected', count: counts.rejected, icon: XCircle },
  ];

  const canAct = (status: string) =>
    isHrApprovalView ? PENDING_HR_STATUSES.includes(status) : REQUESTED_STATUSES.includes(status);

  const approveLabel = isHrApprovalView ? 'Final approve' : 'Verify & approve';

  return (
    <div className="p-2 space-y-6 flex flex-col h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white px-6 py-5 rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50 gap-6 shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center text-white shadow-lg shadow-slate-900/20 shrink-0">
              <CalendarDays className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight leading-tight mb-0.5">Team leave status</h1>
              <p className="text-slate-500 font-medium text-sm">
              {isHrApprovalView
                ? 'Review finance-bound leave verification and final administrative decisions.'
                : 'Monitor team leave requests and execute departmental approvals.'}
              </p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex bg-slate-50/80 p-1 rounded-2xl border border-[var(--card-border)] w-fit">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`
                  flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-200
                  ${isActive 
                    ? 'bg-[var(--card-bg)] text-[var(--theme-accent)] shadow-lg ring-1 ring-[var(--card-border)]' 
                    : 'text-[var(--page-text)] opacity-60 hover:opacity-100 hover:bg-slate-100'}
                `}
              >
                <tab.icon className={`w-3.5 h-3.5 ${isActive ? 'text-[var(--theme-accent)]' : 'opacity-60'}`} />
                {tab.label}
                <span className={`static ml-1 px-1.5 py-0.5 rounded-md text-[9px] ${isActive ? 'bg-[var(--theme-accent)] text-white border-none' : 'bg-[var(--card-border)] text-inherit opacity-80'}`}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Pending nudge */}
      {!isHrApprovalView && requestedCount > 0 && activeTab !== 'requested' && (
        <button
          onClick={() => setActiveTab('requested')}
          className="flex w-full items-center gap-4 rounded-2xl border border-amber-300 bg-amber-100 p-4 text-left text-sm text-amber-800 transition-all hover:bg-amber-200 hover:scale-[1.01] hover:shadow-md hover:shadow-amber-200/20 shadow-sm"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-200 flex items-center justify-center text-amber-700 shrink-0">
            <AlertCircle className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <p className="text-[10px] font-black uppercase tracking-widest text-amber-700 leading-none mb-1">Attention Required</p>
            <p className="text-sm font-bold text-amber-900">
              {requestedCount} {requestedCount === 1 ? 'request awaits' : 'requests await'} your verification.
            </p>
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest text-amber-800 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-300 shadow-sm">Review Now →</span>
        </button>
      )}

      {/* Table */}
      <div className="flex-1 min-h-0 bg-white shadow-sm border border-slate-200 rounded-3xl flex flex-col overflow-hidden">
        {/* Card Header with Spacious Search */}
        <div className="px-6 py-4 flex items-center justify-between gap-4">
          <div className="relative w-full md:max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-slate-400" />
            </div>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by employee identity, leave type or status..."
              className="block w-full pl-10 pr-3 py-2.5 border border-[var(--card-border)] rounded-xl bg-slate-50 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-slate-900/5 focus:border-slate-400 transition-all font-medium text-[var(--page-text)]"
            />
          </div>
          
          <button
            onClick={fetchRecords}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 transition-all shadow-sm active:scale-95"
          >
            <RefreshCcw className={clsx('h-3.5 w-3.5', isLoading && 'animate-spin')} />
            Refresh Data
          </button>
        </div>

        <div className="border-t border-slate-100 flex-1 overflow-hidden">
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
                <tr className="border-b border-[var(--card-border)] bg-slate-50">
                  <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest opacity-60 text-[var(--page-text)]">
                    Employee
                  </th>
                  <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest opacity-60 text-[var(--page-text)]">
                    Type
                  </th>
                  <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest opacity-60 text-[var(--page-text)]">
                    Duration
                  </th>
                  <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest opacity-60 text-[var(--page-text)]">
                    Status
                  </th>
                  <th className="px-6 py-4 text-right text-[10px] font-black uppercase tracking-widest opacity-60 text-[var(--page-text)]">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--card-border)]">
                {filteredRecords.map((record) => {
                  const days = getDurationDays(record.fromDate, record.toDate);
                  const rowCanAct = canAct(record.status);
                  const busy = actingId === record.id;
                  return (
                    <tr key={record.id} className="hover:bg-slate-400/10 transition-colors duration-200">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-50 text-xs font-semibold text-[var(--page-text)] border border-[var(--card-border)]">
                            {getInitials(record.employee?.name, record.employeeId)}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-medium text-[var(--page-text)]">
                              {record.employee?.name || record.employeeId}
                            </p>
                            <p className="truncate text-xs opacity-60 text-[var(--page-text)]">
                              {record.employee?.email || record.employeeId}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <span className="inline-flex items-center rounded-md bg-slate-50 border border-[var(--card-border)] px-2 py-0.5 text-xs font-medium text-[var(--page-text)]">
                          {record.type || '—'}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-[var(--page-text)]">
                            {formatDate(record.fromDate)}
                            <span className="mx-1 opacity-50">→</span>
                            {formatDate(record.toDate)}
                          </span>
                          {days !== null && (
                            <span className="rounded bg-slate-50 border border-[var(--card-border)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--page-text)] tabular-nums">
                              {days}d
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 flex items-center gap-1 text-[11px] opacity-60 text-[var(--page-text)]">
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
                      <td className="px-5 py-3 text-right">
                        {rowCanAct ? (
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              onClick={() => setConfirmState({ record, action: 'reject' })}
                              disabled={busy}
                              className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-rose-600 border border-slate-200 bg-white hover:bg-rose-50 hover:border-rose-200 hover:text-rose-700 transition-all duration-300 hover:scale-105 active:scale-95 disabled:hover:scale-100 disabled:opacity-50"
                            >
                              Reject
                            </button>
                            <button
                              onClick={() => setConfirmState({ record, action: 'approve' })}
                              disabled={busy}
                              className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-white bg-slate-900 hover:bg-emerald-600 transition-all duration-300 hover:scale-105 hover:shadow-xl shadow-lg shadow-slate-900/10 active:scale-95 disabled:hover:scale-100 disabled:opacity-60 flex items-center gap-2"
                            >
                              {activeTab === 'requested' || !isHrApprovalView ? <ShieldCheck className="w-3.5 h-3.5" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                              {approveLabel}
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmState({ record, action: 'view' })}
                            className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-600 border border-slate-200 bg-white hover:bg-slate-50 transition-all duration-300 hover:scale-105 active:scale-95 flex items-center gap-2 ml-auto"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            View
                          </button>
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
    </div>

      {/* Confirm modal */}
      <Modal
        isOpen={!!confirmState}
        onClose={() => (actingId ? null : setConfirmState(null))}
        title={confirmState?.action === 'view' ? 'Leave Request Details' : confirmState?.action === 'approve' ? 'Confirm approval' : 'Confirm rejection'}
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
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    {confirmState.record.employeeId}
                  </span>
                  <span className="text-slate-200">|</span>
                  <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">
                    {confirmState.record.type}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                <div className="flex items-center gap-2 mb-1.5 grayscale opacity-50">
                  <Building className="w-3 h-3 text-slate-900" />
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-900">Org. Dept</span>
                </div>
                <p className="text-xs font-bold text-slate-700 truncate">
                  {confirmState.record.employee?.department?.name || 'Institutional Staff'}
                </p>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                <div className="flex items-center gap-2 mb-1.5 grayscale opacity-50">
                  <Clock className="w-3 h-3 text-slate-900" />
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-900">Duration</span>
                </div>
                <p className="text-xs font-bold text-slate-700">
                  {getDurationDays(confirmState.record.fromDate, confirmState.record.toDate)} Days (EST)
                </p>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl space-y-2">
              <div className="flex items-center gap-2 grayscale opacity-50">
                <MessageSquare className="w-3.5 h-3.5 text-slate-900" />
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-900">Detailed Reason</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed font-medium italic">
                "{confirmState.record.reason || 'No specific explanation provided by the applicant.'}"
              </p>
              <div className="flex items-center gap-2 pt-2 border-t border-slate-200/60">
                <CalendarDays className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">
                  {formatDate(confirmState.record.fromDate)} — {formatDate(confirmState.record.toDate)}
                </span>
              </div>
            </div>

            {confirmState.action !== 'view' && (
              <p className="text-sm text-slate-600 leading-relaxed">
                {confirmState.action === 'approve'
                  ? isHrApprovalView
                    ? 'This will finalize the approval. The employee and department head will be notified.'
                    : 'This will verify the request and forward it to HR for final approval.'
                  : isHrApprovalView
                    ? 'This will reject the request at the HR stage. The employee will be notified.'
                    : 'This will reject the request and notify the employee.'}
              </p>
            )}

            <div className="flex justify-end gap-2 pt-1">
              {confirmState.action === 'view' ? (
                <button
                  onClick={() => setConfirmState(null)}
                  className="rounded-md border border-slate-200/50 px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-all hover:scale-105 active:scale-95"
                >
                  Close
                </button>
              ) : (
                <>
                  <button
                    onClick={() => setConfirmState(null)}
                    disabled={!!actingId}
                    className="rounded-md border border-slate-200/50 px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
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
              </>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
