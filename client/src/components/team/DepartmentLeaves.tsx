import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { DataTable } from '@/components/shared/DataTable';
import { Modal } from '@/components/shared/Modal';
import type { ColumnDef } from '@tanstack/react-table';
import { AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { clsx } from 'clsx';
import { useAuthStore } from '@/store/authStore';
import { getNormalizedRole } from '@/lib/roles';

interface UserInfo {
  uid: string;
  name: string;
  email?: string;
  department?: { name: string };
}

interface Leave {
  id: number;
  employeeId: string;
  employee: UserInfo;
  type: string;
  fromDate: string;
  toDate: string;
  status: string;
  step1Approver?: UserInfo;
  step2Approver?: UserInfo;
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

const getStatusMeta = (leave: Leave) => {
  const status = leave.status || '';

  if (REQUESTED_STATUSES.includes(status)) {
    return {
      label: 'Requested',
      color: 'bg-blue-50 text-blue-700 border-blue-200'
    };
  }

  if (PENDING_HR_STATUSES.includes(status)) {
    return {
      label: 'Pending HR',
      color: 'bg-amber-50 text-amber-700 border-amber-200'
    };
  }

  if (status === 'approved') {
    return {
      label: 'Approved',
      color: 'bg-emerald-50 text-emerald-700 border-emerald-200'
    };
  }

  return {
    label: 'Rejected',
    color: 'bg-rose-50 text-rose-700 border-rose-200'
  };
};

export default function Leaves() {
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<LeaveTab>('requested');
  const [confirmModal, setConfirmModal] = useState<{ id: number; action: 'approve' | 'reject' } | null>(null);

  const user = useAuthStore((state) => state.user);
  const userRole = getNormalizedRole(user?.role || '');
  const scopedDeptId = user?.deptId || (user as any)?.departmentId;
  const isSubDeptRole = ['openschool', 'online', 'skill', 'bvoc'].includes(userRole);

  const fetchLeaves = async () => {
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
      console.error('[LEAVES-FETCH-ERROR]:', error);
      setLeaves([]);
      toast.error('Failed to load leave requests');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaves();
  }, [scopedDeptId, user?.subDepartment, userRole]);

  const handleAction = async (id: number, action: 'approve' | 'reject') => {
    try {
      await api.put(`/dept-admin/leaves/${id}/${action}`);
      toast.success(
        action === 'approve'
          ? 'Leave moved to HR pending approval'
          : 'Leave request rejected successfully'
      );
      await fetchLeaves();
      if (action === 'approve') {
        setActiveTab('pending');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || `Failed to ${action} leave`);
    } finally {
      setConfirmModal(null);
    }
  };

  const filteredLeaves = useMemo(
    () => leaves.filter((leave) => getLeaveBucket(leave.status) === activeTab),
    [activeTab, leaves]
  );

  const tabCounts = useMemo(
    () => ({
      requested: leaves.filter((leave) => getLeaveBucket(leave.status) === 'requested').length,
      pending: leaves.filter((leave) => getLeaveBucket(leave.status) === 'pending').length,
      approved: leaves.filter((leave) => getLeaveBucket(leave.status) === 'approved').length,
      rejected: leaves.filter((leave) => getLeaveBucket(leave.status) === 'rejected').length
    }),
    [leaves]
  );

  const columns: ColumnDef<Leave>[] = [
    {
      id: 'employee',
      header: 'Team member',
      cell: ({ row }) => {
        const emp = row.original.employee;
        return (
          <div>
            <p className="font-medium text-slate-900">{emp?.name || row.original.employeeId}</p>
            {emp?.email && <p className="text-xs text-slate-500">{emp.email}</p>}
          </div>
        );
      }
    },
    {
      accessorKey: 'type',
      header: 'Leave type',
      cell: ({ row }) => row.original.type
    },
    {
      id: 'dates',
      header: 'Duration',
      cell: ({ row }) => (
        <span className="text-sm">
          {row.original.fromDate} to {row.original.toDate}
        </span>
      )
    },
    {
      accessorKey: 'status',
      header: 'Stage',
      cell: ({ row }) => {
        const meta = getStatusMeta(row.original);
        return (
          <span className={clsx('rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase', meta.color)}>
            {meta.label}
          </span>
        );
      }
    },
    {
      id: 'actions',
      header: 'Admin action',
      cell: ({ row }) => {
        const leave = row.original;
        const canAct = REQUESTED_STATUSES.includes(leave.status);

        if (!canAct) {
          return <span className="text-xs text-slate-400">Awaiting HR or finalized</span>;
        }

        return (
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setConfirmModal({ id: leave.id, action: 'approve' })}
              className="flex items-center space-x-1 rounded text-xs font-medium text-blue-700 bg-blue-50 px-2 py-1 transition-colors hover:bg-blue-100"
              title="Approve leave and send to HR"
            >
              <CheckCircle className="w-4 h-4" />
              <span>Approve</span>
            </button>
            <button
              onClick={() => setConfirmModal({ id: leave.id, action: 'reject' })}
              className="flex items-center space-x-1 rounded text-xs font-medium text-red-700 bg-red-50 px-2 py-1 transition-colors hover:bg-red-100"
              title="Reject leave"
            >
              <XCircle className="w-4 h-4" />
              <span>Reject</span>
            </button>
          </div>
        );
      }
    }
  ];

  const title = isSubDeptRole ? 'Unit Leave Requests' : 'Team Leave Requests';
  const description = isSubDeptRole
    ? 'Track requested leave, pending HR approvals, and final leave decisions for your unit.'
    : 'Track requested leave, pending HR approvals, and final leave decisions for your team.';

  const tabs = [
    { id: 'requested' as const, name: 'Requested', count: tabCounts.requested },
    { id: 'pending' as const, name: 'Pending', count: tabCounts.pending },
    { id: 'approved' as const, name: 'Approved', icon: CheckCircle, count: tabCounts.approved },
    { id: 'rejected' as const, name: 'Rejected', icon: XCircle, count: tabCounts.rejected }
  ];

  const emptyCopy: Record<LeaveTab, { message: string; description: string }> = {
    requested: {
      message: 'No requested leave',
      description: 'New leave requests waiting for admin review will appear here.'
    },
    pending: {
      message: 'No pending HR approvals',
      description: 'Leaves approved by admin and waiting for HR will appear here.'
    },
    approved: {
      message: 'No approved leave',
      description: 'Leaves fully approved by HR will appear here.'
    },
    rejected: {
      message: 'No rejected leave',
      description: 'Leaves rejected by admin or HR will appear here.'
    }
  };

  return (
    <div className="space-y-6 flex flex-col h-[calc(100vh-8rem)]">
      <div className="flex justify-between items-center shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
          <p className="text-slate-500">{description}</p>
        </div>
      </div>

      <div className="flex bg-slate-100/60 p-1 rounded-2xl border border-slate-200 w-fit flex-wrap">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={clsx(
              'flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-200',
              activeTab === tab.id
                ? 'bg-white text-indigo-600 shadow-lg shadow-indigo-100 ring-1 ring-slate-200'
                : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
            )}
          >
            {'icon' in tab && tab.icon ? (
              <tab.icon className={clsx('w-3.5 h-3.5', activeTab === tab.id ? 'text-indigo-600' : 'text-slate-400')} />
            ) : null}
            {tab.name}
            <span
              className={clsx(
                'ml-1 px-1.5 py-0.5 rounded-md text-[9px]',
                activeTab === tab.id ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-200 text-slate-600'
              )}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      <div className="flex-1 min-h-0 bg-white shadow-sm border border-slate-200 rounded-lg flex flex-col">
        <DataTable
          columns={columns}
          data={filteredLeaves}
          isLoading={isLoading}
          searchKey="employee.name"
          searchPlaceholder="Search by team member name..."
          emptyMessage={emptyCopy[activeTab].message}
          emptyDescription={emptyCopy[activeTab].description}
        />
      </div>

      <Modal
        isOpen={!!confirmModal}
        onClose={() => setConfirmModal(null)}
        title={`Confirm ${confirmModal?.action === 'approve' ? 'Approval' : 'Rejection'}`}
        maxWidth="md"
      >
        <div className="space-y-6">
          <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <div
              className={clsx(
                'w-12 h-12 rounded-xl flex items-center justify-center',
                confirmModal?.action === 'approve' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'
              )}
            >
              {confirmModal?.action === 'approve' ? <CheckCircle size={24} /> : <AlertCircle size={24} />}
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900 uppercase tracking-tight">Final confirmation required</p>
              <p className="text-xs text-slate-500 font-medium">Administrative leave workflow</p>
            </div>
          </div>

          <p className="text-slate-600 leading-relaxed font-medium">
            {confirmModal?.action === 'approve'
              ? 'Approve this leave request and move it to the Pending tab for HR final approval?'
              : 'Reject this leave request immediately?'}
          </p>

          <div className="flex gap-3 pt-2">
            <button
              onClick={() => setConfirmModal(null)}
              className="flex-1 py-3 px-4 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-50 transition-all active:scale-95"
            >
              Cancel
            </button>
            <button
              onClick={() => confirmModal && handleAction(confirmModal.id, confirmModal.action)}
              className={clsx(
                'flex-1 py-3 px-4 text-white rounded-xl font-bold text-sm transition-all shadow-lg active:scale-95',
                confirmModal?.action === 'approve'
                  ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-200'
                  : 'bg-rose-600 hover:bg-rose-700 shadow-rose-200'
              )}
            >
              Confirm {confirmModal?.action}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
