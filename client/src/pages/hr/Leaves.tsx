import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { DataTable } from '@/components/shared/DataTable';
import type { ColumnDef } from '@tanstack/react-table';
import { PageHeader } from '@/components/shared/PageHeader';
import { Calendar, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { Modal } from '@/components/shared/Modal';
import { clsx } from 'clsx';
import { toSentenceCase } from '@/lib/utils';

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

export default function Leaves() {
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [confirmModal, setConfirmModal] = useState<{id: number, action: 'approve' | 'reject'} | null>(null);
  const [selectedLeave, setSelectedLeave] = useState<Leave | null>(null);

  const fetchLeaves = async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/hr/leaves');
      setLeaves(res.data);
    } catch (error) {
      toast.error('Failed to fetch leave requests');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaves();
  }, []);

  const handleAction = async (id: number, action: 'approve' | 'reject') => {
    try {
      await api.put(`/hr/leaves/${id}/${action}`);
      toast.success(`Leave request ${action}d successfully`);
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
      header: 'Employee',
      cell: ({ row }) => {
        const emp = row.original.employee;
        return (
          <div>
            <p className="font-medium text-slate-900">{toSentenceCase(emp?.name || row.original.employeeId)}</p>
            {emp?.email && <p className="text-xs text-slate-500">{emp.email}</p>}
          </div>
        );
      }
    },
    { 
      accessorKey: 'type', 
      header: 'Leave type',
      cell: ({ row }) => toSentenceCase(row.original.type)
    },
    { 
      accessorKey: 'reason', 
      header: 'Reason / details',
      cell: ({ row }) => <span className="text-xs text-slate-600 line-clamp-1" title={row.original.reason}>{toSentenceCase(row.original.reason || 'No details provided')}</span>
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
      header: 'Status',
      cell: ({ row }) => {
        const s = row.original.status;
        let color = 'bg-slate-100 text-slate-700';
        if (s === 'approved') color = 'bg-green-100 text-green-700';
        if (s.includes('rejected')) color = 'bg-red-100 text-red-700';
        if (s.includes('pending')) color = 'bg-orange-100 text-orange-700';
        
        return (
          <span className={`px-2 py-1 text-[10px] rounded-full font-bold ${color}`}>
            {['pending_step1', 'pending admin'].includes(s) ? 'Pending admin' : 
             (['pending_step2', 'pending hr'].includes(s) ? (row.original.employee?.department?.name === 'HR Department' || row.original.employee?.department?.name === 'HR' ? 'Forwarded to workforce control' : 'Pending hr') : 
             toSentenceCase(s.replace('_', ' ')))}
          </span>
        );
      }
    },
    {
      id: 'actions',
      header: 'Actions (Step 2)',
      cell: ({ row }) => {
        const leave = row.original;
        if (!['pending_step2', 'pending hr'].includes(leave.status)) {
          return <span className="text-xs text-slate-400 ">No action required</span>;
        }

        return (
          <div className="flex items-center space-x-2">
            <button 
              onClick={() => setConfirmModal({ id: leave.id, action: 'approve' })} 
              className="flex items-center space-x-1 px-2 py-1 bg-green-50 text-green-700 hover:bg-green-100 rounded text-xs font-medium transition-colors"
              title="Approve Leave"
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

  return (
    <div className="space-y-6 flex flex-col h-[calc(100vh-8rem)]">
      <PageHeader 
        title="Leave Approvals"
        description="Review and authorize advanced (Step-2) employee leave requests"
        icon={Calendar}
      />

      <div className="flex-1 min-h-0 bg-white shadow-sm border border-slate-200 rounded-lg flex flex-col">
        <DataTable 
          columns={columns} 
          data={leaves} 
          isLoading={isLoading} 
          searchKey="employee.name" 
          searchPlaceholder="Search by employee name..." 
          onRowClick={(leave) => setSelectedLeave(leave)}
        />
      </div>

      <Modal
        isOpen={!!confirmModal}
        onClose={() => setConfirmModal(null)}
        title={`Confirm Final ${confirmModal?.action === 'approve' ? 'Approval' : 'Rejection'}`}
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
              <p className="text-sm font-bold text-slate-900 uppercase tracking-tight font-mono">HR Authorization required</p>
              <p className="text-xs text-slate-500 font-medium ">Administrative Protocol v5.0</p>
            </div>
          </div>

          <p className="text-slate-600 leading-relaxed font-medium">
            Are you sure you want to <strong>{confirmModal?.action}</strong> this leave request? This is the final stage of institutional authorization.
            {confirmModal?.action === 'approve' && ' The employee and department head will be notified of the approval.'}
            {confirmModal?.action === 'reject' && ' This will immediately deny the request and notify the employee.'}
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
                  ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200" 
                  : "bg-rose-600 hover:bg-rose-700 shadow-rose-200"
              )}
            >
              Confirm {confirmModal?.action}
            </button>
          </div>
        </div>
      </Modal>

      {/* Details Modal */}
      <Modal
        isOpen={!!selectedLeave}
        onClose={() => setSelectedLeave(null)}
        title="Institutional Leave Oversight"
        maxWidth="lg"
      >
        {selectedLeave && (
          <div className="space-y-8 py-2">
            {/* Main Header / Status Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-6">
              <div>
                <h3 className="text-2xl font-bold text-slate-900 tracking-tight">
                  {toSentenceCase(selectedLeave.type)}
                </h3>
                <p className="text-sm text-slate-500 font-medium">Request Reference: LV-{selectedLeave.id}</p>
              </div>
              <div className="flex flex-col items-end">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Current Status</p>
                <span className={clsx(
                  "px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider shadow-sm",
                  selectedLeave.status === 'approved' ? "bg-emerald-500 text-white shadow-emerald-100" :
                  selectedLeave.status.includes('rejected') ? "bg-rose-500 text-white shadow-rose-100" : "bg-amber-500 text-white shadow-amber-100"
                )}>
                  {selectedLeave.status.replace('_', ' ')}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Left Column: Personnel & Context */}
              <div className="space-y-6">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Personnel Profile</p>
                  <div className="flex items-center gap-4 p-4 bg-white border border-slate-100 rounded-2xl shadow-sm">
                    <div className="w-12 h-12 rounded-xl bg-slate-900 flex items-center justify-center font-bold text-white text-lg ring-4 ring-slate-50">
                      {selectedLeave.employee?.name?.charAt(0) || '?'}
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 text-base">{toSentenceCase(selectedLeave.employee?.name || 'Unknown')}</p>
                      <p className="text-xs text-slate-500 font-mono tracking-tighter">{selectedLeave.employeeId}</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-slate-50/50 rounded-xl border border-slate-100 italic">
                    <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">Department</p>
                    <p className="text-xs font-bold text-slate-700">{selectedLeave.employee?.department?.name || 'Unassigned'}</p>
                  </div>
                  <div className="p-3 bg-slate-50/50 rounded-xl border border-slate-100 italic">
                    <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">Email Alias</p>
                    <p className="text-xs font-bold text-slate-700 truncate">{selectedLeave.employee?.email || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Right Column: Temporal Alignment */}
              <div className="space-y-6">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Temporal Window</p>
                  <div className="relative p-6 bg-slate-50 rounded-3xl border border-dashed border-slate-200 overflow-hidden">
                    <div className="absolute top-0 right-0 p-3 opacity-10">
                      <Calendar size={64} className="text-slate-900" />
                    </div>
                    <div className="relative flex items-center justify-between text-center">
                      <div className="space-y-1">
                        <p className="text-[9px] font-bold text-slate-400 uppercase">Commencement</p>
                        <p className="text-sm font-black text-slate-900">{selectedLeave.fromDate}</p>
                      </div>
                      <div className="flex flex-col items-center px-4">
                        <div className="h-px w-8 bg-slate-300"></div>
                        <p className="text-[8px] font-bold text-slate-300 py-1">TO</p>
                        <div className="h-px w-8 bg-slate-300"></div>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[9px] font-bold text-slate-400 uppercase">Conclusion</p>
                        <p className="text-sm font-black text-slate-900">{selectedLeave.toDate}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-emerald-50/30 rounded-2xl border border-emerald-100/50">
                  <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-wider mb-1">Filing Record</p>
                  <p className="text-xs text-emerald-800 font-medium lowercase italic">
                    Submitted on {new Date(selectedLeave.createdAt).toLocaleDateString(undefined, { dateStyle: 'long' })}
                  </p>
                </div>
              </div>
            </div>

            {/* Detailed Rationale */}
            <div className="p-6 bg-slate-50/30 border border-slate-100 rounded-3xl relative overflow-hidden">
               <div className="absolute top-2 right-4 opacity-5 pointer-events-none">
                 <CheckCircle size={120} />
               </div>
               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-3">Detailed Rationale</p>
               <p className="text-slate-700 text-sm leading-relaxed font-medium relative z-10">
                 {selectedLeave.reason ? toSentenceCase(selectedLeave.reason) : 'No institutional rationale provided for this filing.'}
               </p>
            </div>

            {/* Footer Actions */}
            <div className="flex pt-4">
              <button
                onClick={() => setSelectedLeave(null)}
                className="flex-1 py-4 px-6 bg-slate-900 text-white rounded-2xl font-bold text-sm hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 active:scale-[0.98]"
              >
                Acknowledge & Close
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
