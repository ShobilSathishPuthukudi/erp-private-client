import { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { getNormalizedRole } from '@/lib/roles';
import toast from 'react-hot-toast';
import { CalendarDays, RefreshCcw, Search } from 'lucide-react';
import { clsx } from 'clsx';

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

const formatDate = (value?: string) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
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

export default function TeamLeaveStatus() {
  const [records, setRecords] = useState<LeaveRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<LeaveTab>('all');
  const [query, setQuery] = useState('');
  const [actingId, setActingId] = useState<number | null>(null);

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
              strictSubDepartment: isSubDeptRole
            }
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
      rejected: records.filter((record) => getBucket(record.status) === 'rejected').length
    }),
    [records]
  );

  const requestedCount = counts.requested;

  const handleAction = async (record: LeaveRecord, action: 'approve' | 'reject') => {
    const confirmed = window.confirm(
      isHrView
        ? action === 'approve'
          ? `Finalize and approve ${record.employee?.name || record.employeeId}'s leave request?`
          : `Reject ${record.employee?.name || record.employeeId}'s leave request at the HR stage?`
        : action === 'approve'
        ? `Verify and approve ${record.employee?.name || record.employeeId}'s leave request and forward it to HR?`
        : `Reject ${record.employee?.name || record.employeeId}'s leave request?`
    );

    if (!confirmed) return;

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
            : 'Leave request rejected'
      );
      await fetchRecords();
      if (action === 'approve') {
        setActiveTab(isHrView ? 'approved' : 'pending');
      }
    } catch (error) {
      toast.error(getErrorMessage(error, `Failed to ${action} leave`));
    } finally {
      setActingId(null);
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
        record.status
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
    { id: 'rejected', label: 'Rejected', count: counts.rejected }
  ];

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900">Team Leave Status</h1>
            <p className="mt-1 text-sm font-medium text-slate-500">
              {isHrView
                ? 'A dedicated HR review board for department-approved leave requests and their final status.'
                : 'A dedicated status board for all employee leave requests in your team scope.'}
            </p>
          </div>

          <button
            onClick={fetchRecords}
            disabled={isLoading}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCcw className={clsx('h-4 w-4', isLoading && 'animate-spin')} />
            Refresh
          </button>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-5">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={clsx(
                'rounded-2xl border px-4 py-4 text-left transition',
                activeTab === tab.id
                  ? 'border-slate-900 bg-slate-900 text-white'
                  : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 hover:bg-white'
              )}
            >
              <p className={clsx('text-[11px] font-black uppercase tracking-[0.18em]', activeTab === tab.id ? 'text-slate-300' : 'text-slate-400')}>
                {tab.label}
              </p>
              <p className="mt-2 text-3xl font-black tracking-tight">{tab.count}</p>
            </button>
          ))}
        </div>

        <div className="mt-6 relative max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by employee, status, type..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm font-medium text-slate-700 outline-none transition focus:border-slate-400 focus:bg-white"
          />
        </div>

        {!isHrView && requestedCount > 0 ? (
          <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4">
            <p className="text-sm font-black text-amber-900">
              {requestedCount} new team leave {requestedCount === 1 ? 'request is' : 'requests are'} waiting for department admin verification.
            </p>
            <p className="mt-1 text-sm font-medium text-amber-700">
              Open the Requested tab to approve and forward them to HR, or reject them from this page.
            </p>
          </div>
        ) : null}
      </section>

      <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
        {isLoading ? (
          <div className="space-y-4 p-6">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="h-16 animate-pulse rounded-2xl bg-slate-100" />
            ))}
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
              <CalendarDays className="h-8 w-8 text-slate-400" />
            </div>
            <h2 className="mt-5 text-lg font-black text-slate-900">No leave records found</h2>
            <p className="mt-2 max-w-md text-sm font-medium text-slate-500">
              Try a different tab or search term. Any team leave returned by the current backend scope will appear here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr className="text-left text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
                  <th className="px-6 py-4">Employee</th>
                  <th className="px-6 py-4">Department</th>
                  <th className="px-6 py-4">Type</th>
                  <th className="px-6 py-4">Duration</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Requested</th>
                  <th className="px-6 py-4">Reason</th>
                  <th className="px-6 py-4">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {filteredRecords.map((record) => (
                  <tr key={record.id} className="align-top">
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900">{record.employee?.name || record.employeeId}</div>
                      <div className="text-xs font-medium text-slate-500">{record.employee?.email || record.employeeId}</div>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-600">{record.employee?.department?.name || '-'}</td>
                    <td className="px-6 py-4 font-medium text-slate-600">{record.type || '-'}</td>
                    <td className="px-6 py-4 font-medium text-slate-600">
                      {formatDate(record.fromDate)} to {formatDate(record.toDate)}
                    </td>
                    <td className="px-6 py-4">
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-bold text-slate-700">
                        {getStatusLabel(record.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-600">{formatDate(record.createdAt)}</td>
                    <td className="px-6 py-4 text-sm text-slate-500">{record.reason || '-'}</td>
                    <td className="px-6 py-4">
                      {(isHrView ? PENDING_HR_STATUSES.includes(record.status) : REQUESTED_STATUSES.includes(record.status)) ? (
                        <div className="flex min-w-44 flex-col gap-2">
                          <button
                            onClick={() => handleAction(record, 'approve')}
                            disabled={actingId === record.id}
                            className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-black text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {isHrView ? 'Final Approve' : 'Verify & Approve'}
                          </button>
                          <button
                            onClick={() => handleAction(record, 'reject')}
                            disabled={actingId === record.id}
                            className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-black text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        <span className="text-sm font-medium text-slate-400">No action needed</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
