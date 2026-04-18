import { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import { clsx } from 'clsx';
import { useAuthStore } from '@/store/authStore';
import { getNormalizedRole } from '@/lib/roles';
import { AlertCircle, CalendarDays, CheckCircle2, Clock3, RefreshCcw, Search, XCircle } from 'lucide-react';

interface UserInfo {
  uid: string;
  name: string;
  email?: string;
  department?: { name: string };
}

interface Leave {
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

type LeaveTab = 'requested' | 'pending' | 'approved' | 'rejected';

const REQUESTED_STATUSES = ['pending_step1', 'pending admin'];
const PENDING_HR_STATUSES = ['pending_step2', 'pending hr'];

const getLeaveBucket = (status = ''): LeaveTab => {
  if (REQUESTED_STATUSES.includes(status)) return 'requested';
  if (PENDING_HR_STATUSES.includes(status)) return 'pending';
  if (status === 'approved') return 'approved';
  return 'rejected';
};

const getStatusMeta = (status = '') => {
  if (REQUESTED_STATUSES.includes(status)) {
    return {
      label: 'Requested',
      icon: AlertCircle,
      color: 'bg-blue-50 text-blue-700 border-blue-200'
    };
  }

  if (PENDING_HR_STATUSES.includes(status)) {
    return {
      label: 'Pending HR',
      icon: Clock3,
      color: 'bg-amber-50 text-amber-700 border-amber-200'
    };
  }

  if (status === 'approved') {
    return {
      label: 'Approved',
      icon: CheckCircle2,
      color: 'bg-emerald-50 text-emerald-700 border-emerald-200'
    };
  }

  return {
    label: 'Rejected',
    icon: XCircle,
    color: 'bg-rose-50 text-rose-700 border-rose-200'
  };
};

const formatDate = (value?: string) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const formatLeaveRange = (leave: Leave) => `${formatDate(leave.fromDate)} to ${formatDate(leave.toDate)}`;

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

export default function DepartmentLeaves() {
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<LeaveTab>('requested');
  const [searchTerm, setSearchTerm] = useState('');
  const [actingId, setActingId] = useState<number | null>(null);

  const user = useAuthStore((state) => state.user);
  const userRole = getNormalizedRole(user?.role || '');
  const scopedDeptId = user?.deptId;
  const isSubDeptRole = ['openschool', 'online', 'skill', 'bvoc'].includes(userRole);

  const title = isSubDeptRole ? 'Unit Leave Requests' : 'Team Leave Requests';
  const description = isSubDeptRole
    ? 'Review leave requests, HR-pending cases, and final outcomes for your unit.'
    : 'Review leave requests, HR-pending cases, and final outcomes for your team.';

  const fetchLeaves = useCallback(async () => {
    if (!scopedDeptId) {
      setLeaves([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const res = await api.get('/dept-admin/leaves', {
        params: {
          deptId: scopedDeptId,
          subDepartment: user?.subDepartment,
          strictSubDepartment: isSubDeptRole
        }
      });
      setLeaves(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error('[TEAM-LEAVES-FETCH-ERROR]:', error);
      setLeaves([]);
      toast.error('Failed to load leave requests');
    } finally {
      setIsLoading(false);
    }
  }, [isSubDeptRole, scopedDeptId, user?.subDepartment]);

  useEffect(() => {
    fetchLeaves();
  }, [fetchLeaves]);

  const handleAction = async (leave: Leave, action: 'approve' | 'reject') => {
    const confirmed = window.confirm(
      action === 'approve'
        ? `Approve ${leave.employee?.name || leave.employeeId}'s leave request and send it to HR?`
        : `Reject ${leave.employee?.name || leave.employeeId}'s leave request?`
    );

    if (!confirmed) return;

    try {
      setActingId(leave.id);
      await api.put(`/dept-admin/leaves/${leave.id}/${action}`);
      toast.success(
        action === 'approve'
          ? 'Leave moved to HR pending approval'
          : 'Leave request rejected successfully'
      );
      await fetchLeaves();
      if (action === 'approve') {
        setActiveTab('pending');
      }
    } catch (error) {
      toast.error(getErrorMessage(error, `Failed to ${action} leave`));
    } finally {
      setActingId(null);
    }
  };

  const tabCounts = useMemo(
    () => ({
      requested: leaves.filter((leave) => getLeaveBucket(leave.status) === 'requested').length,
      pending: leaves.filter((leave) => getLeaveBucket(leave.status) === 'pending').length,
      approved: leaves.filter((leave) => getLeaveBucket(leave.status) === 'approved').length,
      rejected: leaves.filter((leave) => getLeaveBucket(leave.status) === 'rejected').length
    }),
    [leaves]
  );

  const filteredLeaves = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return leaves.filter((leave) => {
      if (getLeaveBucket(leave.status) !== activeTab) return false;
      if (!query) return true;

      const searchableText = [
        leave.employee?.name,
        leave.employee?.email,
        leave.employeeId,
        leave.type,
        leave.reason,
        leave.employee?.department?.name
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return searchableText.includes(query);
    });
  }, [activeTab, leaves, searchTerm]);

  const tabs = [
    { id: 'requested' as const, name: 'Requested', count: tabCounts.requested },
    { id: 'pending' as const, name: 'Pending', count: tabCounts.pending },
    { id: 'approved' as const, name: 'Approved', count: tabCounts.approved },
    { id: 'rejected' as const, name: 'Rejected', count: tabCounts.rejected }
  ];

  const emptyCopy: Record<LeaveTab, { title: string; description: string }> = {
    requested: {
      title: 'No requested leave',
      description: 'New leave requests waiting for admin review will appear here.'
    },
    pending: {
      title: 'No pending HR approvals',
      description: 'Leaves approved by admin and waiting for HR will appear here.'
    },
    approved: {
      title: 'No approved leave',
      description: 'Leaves fully approved by HR will appear here.'
    },
    rejected: {
      title: 'No rejected leave',
      description: 'Leaves rejected by admin or HR will appear here.'
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900">{title}</h1>
            <p className="mt-1 text-sm font-medium text-slate-500">{description}</p>
          </div>

          <button
            onClick={fetchLeaves}
            disabled={isLoading}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCcw className={clsx('h-4 w-4', isLoading && 'animate-spin')} />
            Refresh
          </button>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={clsx(
                'rounded-2xl border px-4 py-4 text-left transition',
                activeTab === tab.id
                  ? 'border-slate-900 bg-slate-900 text-white shadow-lg shadow-slate-900/10'
                  : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 hover:bg-white'
              )}
            >
              <p className={clsx('text-[11px] font-black uppercase tracking-[0.18em]', activeTab === tab.id ? 'text-slate-300' : 'text-slate-400')}>
                {tab.name}
              </p>
              <p className="mt-2 text-3xl font-black tracking-tight">{tab.count}</p>
            </button>
          ))}
        </div>

        <div className="mt-6 relative max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search by employee, type, department..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm font-medium text-slate-700 outline-none transition focus:border-slate-400 focus:bg-white"
          />
        </div>
      </section>

      <section className="rounded-[2rem] border border-slate-200 bg-white shadow-sm">
        {isLoading ? (
          <div className="space-y-4 p-6">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="animate-pulse rounded-2xl border border-slate-200 p-5">
                <div className="h-4 w-40 rounded bg-slate-200" />
                <div className="mt-4 h-3 w-64 rounded bg-slate-100" />
                <div className="mt-2 h-3 w-56 rounded bg-slate-100" />
              </div>
            ))}
          </div>
        ) : filteredLeaves.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
              <CalendarDays className="h-8 w-8 text-slate-400" />
            </div>
            <h2 className="mt-5 text-lg font-black text-slate-900">{emptyCopy[activeTab].title}</h2>
            <p className="mt-2 max-w-md text-sm font-medium text-slate-500">{emptyCopy[activeTab].description}</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {filteredLeaves.map((leave) => {
              const meta = getStatusMeta(leave.status);
              const StatusIcon = meta.icon;
              const canAct = REQUESTED_STATUSES.includes(leave.status);

              return (
                <article key={leave.id} className="p-6">
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-4">
                      <div className="flex flex-col gap-3 md:flex-row md:items-center">
                        <div>
                          <h3 className="text-lg font-black tracking-tight text-slate-900">
                            {leave.employee?.name || leave.employeeId}
                          </h3>
                          <p className="text-sm font-medium text-slate-500">
                            {leave.employee?.email || leave.employeeId}
                          </p>
                        </div>

                        <span className={clsx('inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-[0.15em]', meta.color)}>
                          <StatusIcon className="h-3.5 w-3.5" />
                          {meta.label}
                        </span>
                      </div>

                      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                        <div className="rounded-2xl bg-slate-50 px-4 py-3">
                          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Leave Type</p>
                          <p className="mt-1 text-sm font-bold text-slate-800">{leave.type || '-'}</p>
                        </div>

                        <div className="rounded-2xl bg-slate-50 px-4 py-3">
                          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Duration</p>
                          <p className="mt-1 text-sm font-bold text-slate-800">{formatLeaveRange(leave)}</p>
                        </div>

                        <div className="rounded-2xl bg-slate-50 px-4 py-3">
                          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Department</p>
                          <p className="mt-1 text-sm font-bold text-slate-800">{leave.employee?.department?.name || 'Not assigned'}</p>
                        </div>

                        <div className="rounded-2xl bg-slate-50 px-4 py-3">
                          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Requested On</p>
                          <p className="mt-1 text-sm font-bold text-slate-800">{formatDate(leave.createdAt)}</p>
                        </div>
                      </div>

                      {leave.reason ? (
                        <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3">
                          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Reason</p>
                          <p className="mt-2 text-sm font-medium leading-6 text-slate-600">{leave.reason}</p>
                        </div>
                      ) : null}
                    </div>

                    <div className="flex flex-col gap-3 lg:min-w-44">
                      {canAct ? (
                        <>
                          <button
                            onClick={() => handleAction(leave, 'approve')}
                            disabled={actingId === leave.id}
                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-black text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <CheckCircle2 className="h-4 w-4" />
                            Approve
                          </button>

                          <button
                            onClick={() => handleAction(leave, 'reject')}
                            disabled={actingId === leave.id}
                            className="inline-flex items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-black text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <XCircle className="h-4 w-4" />
                            Reject
                          </button>
                        </>
                      ) : (
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-medium text-slate-500">
                          Awaiting HR review or already finalized.
                        </div>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
