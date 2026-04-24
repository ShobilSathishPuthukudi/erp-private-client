import { useState, useEffect, useMemo } from 'react';
import { api } from '@/lib/api';
import { DataTable } from '@/components/shared/DataTable';
import type { ColumnDef } from '@tanstack/react-table';
import { PageHeader } from '@/components/shared/PageHeader';
import { Calendar, CheckCircle, XCircle, AlertCircle, Mail, Building2, Clock, FileText, UserCheck, Copy } from 'lucide-react';
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
  const [activeTab, setActiveTab] = useState<'requested' | 'pending' | 'approved' | 'rejected'>('pending');
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
      await fetchLeaves();
      if (action === 'approve') {
        setActiveTab('approved');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || `Failed to ${action} leave`);
    } finally {
      setConfirmModal(null);
    }
  };

  const filteredLeaves = useMemo(() => {
    return leaves.filter(leave => {
      const s = leave.status;
      if (activeTab === 'requested') return ['pending_step1', 'pending admin'].includes(s);
      if (activeTab === 'pending') return ['pending_step2', 'pending hr'].includes(s);
      if (activeTab === 'approved') return s === 'approved';
      if (activeTab === 'rejected') return s.includes('rejected');
      return false;
    });
  }, [leaves, activeTab]);

  const tabCounts = useMemo(() => ({
    requested: leaves.filter(l => ['pending_step1', 'pending admin'].includes(l.status)).length,
    pending: leaves.filter(l => ['pending_step2', 'pending hr'].includes(l.status)).length,
    approved: leaves.filter(l => l.status === 'approved').length,
    rejected: leaves.filter(l => l.status.includes('rejected')).length,
  }), [leaves]);

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

  const tabs = [
    { id: 'requested' as const, name: 'Requested', count: tabCounts.requested },
    { id: 'pending' as const, name: 'Pending', count: tabCounts.pending },
    { id: 'approved' as const, name: 'Approved', icon: CheckCircle, count: tabCounts.approved },
    { id: 'rejected' as const, name: 'Rejected', icon: XCircle, count: tabCounts.rejected }
  ];

  return (
    <div className="p-2 space-y-6 flex flex-col h-[calc(100vh-8rem)]">
      <PageHeader 
        title="Leave approvals"
        description="Review and authorize advanced (Step-2) employee leave requests"
        icon={Calendar}
      />

      <div className="flex bg-slate-100/60 p-1 rounded-2xl border border-slate-200 w-fit flex-wrap">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={clsx(
              'flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black tracking-widest transition-all duration-200',
              activeTab === tab.id
                ? 'bg-white text-rose-600 shadow-lg shadow-rose-100 ring-1 ring-slate-200'
                : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
            )}
          >
            {tab.icon && (
              <tab.icon className={clsx('w-3.5 h-3.5', activeTab === tab.id ? 'text-rose-600' : 'text-slate-400')} />
            )}
            {tab.name}
            <span
              className={clsx(
                'ml-1 px-1.5 py-0.5 rounded-md text-[9px]',
                activeTab === tab.id ? 'bg-rose-50 text-rose-700' : 'bg-slate-200 text-slate-600'
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
              <p className="text-sm font-bold text-slate-900 tracking-tight font-mono">HR authorization required</p>
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
        title="Leave request"
        maxWidth="lg"
      >
        {selectedLeave && (() => {
          const status = selectedLeave.status;
          const statusLabel = status === 'approved'
            ? 'Approved'
            : status.includes('rejected')
              ? 'Rejected'
              : ['pending_step1', 'pending admin'].includes(status)
                ? 'Pending admin'
                : ['pending_step2', 'pending hr'].includes(status)
                  ? 'Pending HR'
                  : toSentenceCase(status.replace('_', ' '));
          const statusTone = status === 'approved'
            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
            : status.includes('rejected')
              ? 'bg-rose-50 text-rose-700 border-rose-200'
              : 'bg-amber-50 text-amber-700 border-amber-200';

          const from = new Date(selectedLeave.fromDate);
          const to = new Date(selectedLeave.toDate);
          const days = Number.isFinite(from.getTime()) && Number.isFinite(to.getTime())
            ? Math.max(1, Math.round((to.getTime() - from.getTime()) / 86400000) + 1)
            : null;
          const dateFmt = (d: string) => {
            const parsed = new Date(d);
            return Number.isFinite(parsed.getTime())
              ? parsed.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })
              : d;
          };

          const step1Approved = !!selectedLeave.step1Approver;
          const pendingStep2 = ['pending_step2', 'pending hr'].includes(status);
          const canAct = pendingStep2;
          const empName = toSentenceCase(selectedLeave.employee?.name || selectedLeave.employeeId);

          return (
            <div className="space-y-5">
              {/* Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-slate-500">
                    LV-{selectedLeave.id} · {toSentenceCase(selectedLeave.type)}
                  </p>
                  <h3 className="mt-1 text-lg font-semibold text-slate-900 truncate">
                    {empName}
                  </h3>
                </div>
                <span className={clsx(
                  'shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium',
                  statusTone
                )}>
                  {statusLabel}
                </span>
              </div>

              {/* Employee card */}
              <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50/60 px-4 py-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-900 text-white text-sm font-semibold">
                  {selectedLeave.employee?.name?.charAt(0).toUpperCase() || '?'}
                </div>
                <div className="min-w-0 flex-1 grid grid-cols-1 sm:grid-cols-3 gap-x-4 gap-y-1">
                  <div className="min-w-0">
                    <p className="text-[11px] text-slate-500">Employee ID</p>
                    <p className="font-mono text-xs text-slate-800 truncate">{selectedLeave.employeeId}</p>
                  </div>
                  <div className="min-w-0 flex items-start gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[11px] text-slate-500">Department</p>
                      <p className="text-xs text-slate-800 truncate">
                        {selectedLeave.employee?.department?.name || 'Unassigned'}
                      </p>
                    </div>
                  </div>
                  <div className="min-w-0 flex items-start gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] text-slate-500">Email</p>
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs text-slate-800 truncate">{selectedLeave.employee?.email || '—'}</p>
                        {selectedLeave.employee?.email && (
                            <button
                                onClick={() => {
                                    navigator.clipboard.writeText(selectedLeave.employee!.email!);
                                    toast.success('Email copied to clipboard');
                                }}
                                className="p-0.5 hover:bg-slate-200 rounded text-slate-400 hover:text-slate-700"
                                title="Copy Email Address"
                            >
                                <Copy className="w-3 h-3" />
                            </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Duration + submitted */}
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3">
                <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
                  <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500 tracking-wider">
                    <Calendar className="w-3.5 h-3.5" />
                    Duration
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-4">
                    <div>
                      <p className="text-xs text-slate-500">From</p>
                      <p className="text-sm font-medium text-slate-900">{dateFmt(selectedLeave.fromDate)}</p>
                    </div>
                    <div className="h-px flex-1 bg-slate-200" />
                    <div className="text-right">
                      <p className="text-xs text-slate-500">To</p>
                      <p className="text-sm font-medium text-slate-900">{dateFmt(selectedLeave.toDate)}</p>
                    </div>
                    {days !== null && (
                      <div className="ml-2 rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700 tabular-nums">
                        {days} {days === 1 ? 'day' : 'days'}
                      </div>
                    )}
                  </div>
                </div>

                <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 flex items-center gap-2 sm:flex-col sm:items-start">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <div>
                    <p className="text-[11px] text-slate-500">Submitted</p>
                    <p className="text-xs font-medium text-slate-800">
                      {new Date(selectedLeave.createdAt).toLocaleDateString(undefined, {
                        day: '2-digit', month: 'short', year: 'numeric',
                      })}
                    </p>
                  </div>
                </div>
              </div>

              {/* Reason */}
              <div>
                <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500 tracking-wider mb-1.5">
                  <FileText className="w-3.5 h-3.5" />
                  Reason
                </div>
                <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 leading-relaxed">
                  {selectedLeave.reason
                    ? toSentenceCase(selectedLeave.reason)
                    : <span className="text-slate-400">No reason provided.</span>}
                </div>
              </div>

              {/* Approval chain */}
              <div>
                <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500 tracking-wider mb-1.5">
                  <UserCheck className="w-3.5 h-3.5" />
                  Approvals
                </div>
                <ol className="rounded-lg border border-slate-200 bg-white divide-y divide-slate-100">
                  <li className="flex items-center justify-between px-4 py-2.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={clsx(
                        'flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold',
                        step1Approved
                          ? 'bg-emerald-100 text-emerald-700'
                          : status.includes('rejected') ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
                      )}>
                        {step1Approved ? <CheckCircle className="w-3 h-3" /> : '1'}
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-slate-800">Department admin</p>
                        <p className="text-[11px] text-slate-500 truncate">
                          {selectedLeave.step1Approver
                            ? `Approved by ${toSentenceCase(selectedLeave.step1Approver.name)}`
                            : status.includes('rejected') ? 'Rejected' : 'Awaiting review'}
                        </p>
                      </div>
                    </div>
                  </li>
                  <li className="flex items-center justify-between px-4 py-2.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={clsx(
                        'flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold',
                        status === 'approved'
                          ? 'bg-emerald-100 text-emerald-700'
                          : status.includes('rejected') ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-500'
                      )}>
                        {status === 'approved' ? <CheckCircle className="w-3 h-3" /> : '2'}
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-slate-800">HR</p>
                        <p className="text-[11px] text-slate-500 truncate">
                          {selectedLeave.step2Approver
                            ? `${status === 'approved' ? 'Approved' : 'Reviewed'} by ${toSentenceCase(selectedLeave.step2Approver.name)}`
                            : pendingStep2 ? 'Awaiting your review' : 'Pending'}
                        </p>
                      </div>
                    </div>
                  </li>
                </ol>
              </div>

              {/* Footer actions */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  onClick={() => setSelectedLeave(null)}
                  className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
                >
                  Close
                </button>
                {canAct && (
                  <>
                    <button
                      onClick={() => {
                        setConfirmModal({ id: selectedLeave.id, action: 'reject' });
                        setSelectedLeave(null);
                      }}
                      className="inline-flex items-center gap-1.5 rounded-md border border-rose-200 bg-white px-4 py-2 text-sm font-medium text-rose-700 hover:bg-rose-50 transition"
                    >
                      <XCircle className="w-4 h-4" />
                      Reject
                    </button>
                    <button
                      onClick={() => {
                        setConfirmModal({ id: selectedLeave.id, action: 'approve' });
                        setSelectedLeave(null);
                      }}
                      className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 transition"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Approve
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })()}
      </Modal>
    </div>
  );
}
