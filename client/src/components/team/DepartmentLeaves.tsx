import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { DataTable } from '@/components/shared/DataTable';
import type { ColumnDef } from '@tanstack/react-table';
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { Modal } from '@/components/shared/Modal';
import { clsx } from 'clsx';

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
  createdAt: string;
}

import { useAuthStore } from '@/store/authStore';
import { getNormalizedRole } from '@/App';

export default function Leaves() {
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [confirmModal, setConfirmModal] = useState<{id: number, action: 'approve' | 'reject'} | null>(null);
  const user = useAuthStore(state => state.user);
  const userRole = getNormalizedRole(user?.role || '');
  const isCEO = userRole === 'ceo';

  const fetchLeaves = async () => {
    const isGlobal = isCEO || ['organization admin', 'operations', 'partner-center'].includes(userRole);
    if (!user?.deptId && !isGlobal) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const res = await api.get('/dept-admin/leaves');
      setLeaves(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error('[LEAVES-FETCH-ERROR]:', error);
      setLeaves([]);
      // Silent error state for institutional telemetry (Reduces Toast Spam)
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaves();
  }, []);

  const handleAction = async (id: number, action: 'approve' | 'reject') => {
    try {
      await api.put(`/dept-admin/leaves/${id}/${action}`);
      toast.success(`Leave request ${action}d successfully and escalated if needed.`);
      fetchLeaves();
    } catch (error: any) {
      toast.error(error.response?.data?.error || `Failed to ${action} leave`);
    } finally {
      setConfirmModal(null);
    }
  };

  const columns: ColumnDef<Leave>[] = [
    { 
      id: 'employee',
      header: 'Team Member',
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
    { accessorKey: 'type', header: 'Leave Type' },
    { 
      id: 'dates', 
      header: 'Given Duration',
      cell: ({ row }) => (
        <span className="text-sm">
          {row.original.fromDate} to {row.original.toDate}
        </span>
      )
    },
    { 
      accessorKey: 'status', 
      header: 'Current Status',
      cell: ({ row }) => {
        const s = row.original.status;
        let color = 'bg-slate-100 text-slate-700';
        if (s === 'approved') color = 'bg-green-100 text-green-700';
        if (s.includes('rejected')) color = 'bg-red-100 text-red-700';
        if (s.includes('pending')) color = 'bg-orange-100 text-orange-700';
        
        return (
          <span className={`px-2 py-1 text-[10px] rounded-full font-bold uppercase ${color}`}>
            {['pending_step1', 'pending admin'].includes(s) ? 'pending admin' : 
             (['pending_step2', 'pending hr'].includes(s) ? (row.original.employee?.department?.name === 'HR Department' || row.original.employee?.department?.name === 'HR' ? 'forwarded to workforce control' : 'pending hr') : 
             s.replace('_', ' '))}
          </span>
        );
      }
    },
    {
      id: 'actions',
      header: 'Dept Action (Step 1)',
      cell: ({ row }) => {
        const leave = row.original;
        if (!['pending_step1', 'pending admin'].includes(leave.status)) {
          return <span className="text-xs text-slate-400 ">No action required</span>;
        }

        return (
          <div className="flex items-center space-x-2">
            <button 
              onClick={() => setConfirmModal({ id: leave.id, action: 'approve' })} 
              className="flex items-center space-x-1 px-2 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded text-xs font-medium transition-colors"
              title="Approve Leave (Escalate to HR)"
            >
              <CheckCircle className="w-4 h-4" />
              <span>Approve</span>
            </button>
            <button 
              onClick={() => setConfirmModal({ id: leave.id, action: 'reject' })} 
              className="flex items-center space-x-1 px-2 py-1 bg-red-50 text-red-700 hover:bg-red-100 rounded text-xs font-medium transition-colors"
              title="Reject Leave"
            >
              <XCircle className="w-4 h-4" />
              <span>Reject</span>
            </button>
          </div>
        );
      }
    }
  ];

  if (isCEO) {
    // Hide 'Dept Action' column for CEO
    columns.pop();
  }

  return (
    <div className="space-y-6 flex flex-col h-[calc(100vh-8rem)]">
      <div className="flex justify-between items-center shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {isCEO ? 'Institutional Leave Oversight' : 'Team Leave Requests'}
          </h1>
          <p className="text-slate-500">
            {isCEO ? 'Monitor institutional personnel absence requests and approval status' : 'Provide Step-1 structural approval for your team members\' absence requests'}
          </p>
        </div>
      </div>

      <div className="flex-1 min-h-0 bg-white shadow-sm border border-slate-200 rounded-lg flex flex-col">
        <DataTable 
          columns={columns} 
          data={leaves} 
          isLoading={isLoading} 
          searchKey="employee.name" 
          searchPlaceholder="Search by team member name..." 
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
            <div className={clsx(
              "w-12 h-12 rounded-xl flex items-center justify-center",
              confirmModal?.action === 'approve' ? "bg-emerald-100 text-emerald-600" : "bg-rose-100 text-rose-600"
            )}>
              {confirmModal?.action === 'approve' ? <CheckCircle size={24} /> : <AlertCircle size={24} />}
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900 uppercase tracking-tight">Final Confirmation Required</p>
              <p className="text-xs text-slate-500 font-medium ">Operational Protocol v4.2</p>
            </div>
          </div>

          <p className="text-slate-600 leading-relaxed font-medium">
            Are you sure you want to <strong>{confirmModal?.action}</strong> this leave request at Step-1?
            {confirmModal?.action === 'approve' && ' This will escalate the request to the HR department for final approval.'}
            {confirmModal?.action === 'reject' && ' This will immediately deny the request.'}
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
                "flex-1 py-3 px-4 text-white rounded-xl font-bold text-sm transition-all shadow-lg active:scale-95",
                confirmModal?.action === 'approve' 
                  ? "bg-blue-600 hover:bg-blue-700 shadow-blue-200" 
                  : "bg-rose-600 hover:bg-rose-700 shadow-rose-200"
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
