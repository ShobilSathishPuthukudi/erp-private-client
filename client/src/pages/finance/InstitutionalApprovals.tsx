import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { DataTable } from '@/components/shared/DataTable';
import { Modal } from '@/components/shared/Modal';
import type { ColumnDef } from '@tanstack/react-table';
import { AlertCircle, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';


interface AdmissionSession {
  id: number;
  name: string;
  program: { name: string };
  subDept: { name: string };
  financeStatus: string;
}

interface StudentApproval {
  id: number;
  name: string;
  center: { name: string };
  program: { name: string };
  feeSchema?: { name: string, type: string };
  payments?: any[];
  invoice?: { status: string, invoiceNo: string };
  status: string;
}

interface CredentialAudit {
  id: number;
  center: { name: string, shortName: string };
  requester: { name: string, role: string };
  remarks: string;
  status: string;
  updatedAt: string;
  approvedBy: string;
}

export default function InstitutionalApprovals() {
  const [activeTab, setActiveTab] = useState<'sessions' | 'enrollment' | 'enrolled' | 'credential_audit'>('enrollment');
  const [sessions, setSessions] = useState<AdmissionSession[]>([]);
  const [students, setStudents] = useState<StudentApproval[]>([]);
  const [credentialRequests, setCredentialRequests] = useState<CredentialAudit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Approval Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [remarks, setRemarks] = useState('');
  const [actionType, setActionType] = useState<'approve' | 'reject'>('approve');

  const fetchData = async () => {
    try {
      setIsLoading(true);
      if (activeTab === 'sessions') {
        const res = await api.get('/finance/admission-sessions');
        setSessions(res.data);
      } else if (activeTab === 'enrolled') {
        const res = await api.get('/finance/approvals/students', { params: { type: 'approved' } });
        setStudents(res.data);
      } else if (activeTab === 'credential_audit') {
        const res = await api.get('/finance/credentials/audit');
        setCredentialRequests(res.data);
      } else {
        const res = await api.get('/finance/approvals/students');
        setStudents(res.data);
      }
    } catch (error) {
      toast.error('Failed to sync institutional approval queues');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const handleAction = async () => {
    if (remarks.length < 15) return toast.error('Audit remarks must be at least 15 characters');
    try {
      let endpoint = '';
      let method: 'put' | 'post' = 'put';

      if (activeTab === 'sessions') {
        endpoint = `/finance/admission-sessions/${selectedItem?.id}/approve`;
      } else if (activeTab === 'enrollment' && actionType === 'approve') {
        endpoint = `/finance/approvals/students/${selectedItem?.id}/finalize`;
        method = 'post';
      }
      
      const payload = { status: actionType === 'approve' ? 'approved' : 'rejected', remarks };
      
      if (method === 'put') await api.put(endpoint, payload);
      else await api.post(endpoint, payload);

      toast.success(`Institutional action executed successfully`);
      setIsModalOpen(false);
      setRemarks('');
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Approval protocol failure');
    }
  };


  const sColumns: ColumnDef<AdmissionSession>[] = [
    { accessorKey: 'name', header: 'Session Title', cell: ({ row }) => <span className="font-bold text-slate-900">{row.original.name}</span> },
    { accessorKey: 'subDept.name', header: 'Sub-Department' },
    { accessorKey: 'program.name', header: 'Academic Program' },
    { 
        accessorKey: 'financeStatus', 
        header: 'Finance Guardrail',
        cell: ({ row }) => (
            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                row.original.financeStatus === 'approved' ? 'bg-emerald-50 text-emerald-600' : 
                row.original.financeStatus === 'rejected' ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-500'
            }`}>
                {row.original.financeStatus}
            </span>
        )
    },
    {
        id: 'actions',
        cell: ({ row }) => row.original.financeStatus === 'pending' && (
          <div className="flex gap-2">
              <button onClick={() => { setSelectedItem(row.original); setActionType('approve'); setIsModalOpen(true); }} className="bg-slate-900 text-white px-3 py-1 rounded-lg text-[10px] font-bold uppercase transition-colors hover:bg-slate-800">Verify & Open</button>
              <button onClick={() => { setSelectedItem(row.original); setActionType('reject'); setIsModalOpen(true); }} className="bg-red-50 text-red-600 px-3 py-1 rounded-lg text-[10px] font-bold uppercase transition-colors hover:bg-red-100">Reject</button>
          </div>
        )
      }
  ];

  const stuColumns: ColumnDef<StudentApproval>[] = [
    { accessorKey: 'name', header: 'Student Identity', cell: ({ row }) => <span className="font-bold text-slate-900">{row.original.name}</span> },
    { accessorKey: 'center.name', header: 'Source Center' },
    { accessorKey: 'program.name', header: 'Academic Node' },
    { 
        id: 'payment_summary', 
        header: 'Payment Context',
        cell: ({ row }) => {
            const lastPayment = row.original.payments?.[0];
            if (!lastPayment) return <span className="text-[10px] text-slate-400 font-bold uppercase">No Context</span>;
            return (
                <div className="flex flex-col">
                    <span className="text-[10px] font-black text-slate-900 uppercase">{lastPayment.mode}</span>
                    <span className="text-[9px] font-bold text-emerald-600 tracking-tighter">₹{lastPayment.amount}</span>
                </div>
            );
        }
    },
    { 
        id: 'billing', 
        header: 'Collection Status',
        cell: ({ row }) => {
            const hasPaid = row.original.invoice?.status === 'paid' || row.original.payments?.some(p => p.status === 'verified');
            return (
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${hasPaid ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                    {hasPaid ? 'Receipt Confirmed' : 'Verification Awaiting'}
                </span>
            );
        }
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        if (activeTab === 'enrollment') {
          return (
            <button 
              onClick={() => { setSelectedItem(row.original); setActionType('approve'); setIsModalOpen(true); }}
              className="bg-emerald-600 text-white px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all hover:bg-emerald-700 hover:shadow-lg hover:shadow-emerald-200"
            >
              Finalize & Enroll
            </button>
          );
        }
        return (
          <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-3 py-1 rounded-lg uppercase tracking-widest">
            Enrolled
          </span>
        );
      }
    }
  ];

  const credColumns: ColumnDef<CredentialAudit>[] = [
    { 
      accessorKey: 'center.name', 
      header: 'Target Node', 
      cell: ({ row }) => <span className="font-black text-slate-900 uppercase tracking-tighter">{row.original.center?.name || 'Unknown Center'}</span> 
    },
    { 
      accessorKey: 'requester.name', 
      header: 'Requested By', 
      cell: ({ row }) => (
        <div>
          <p className="font-bold text-slate-900">{row.original.requester?.name || 'N/A'}</p>
          <p className="text-[10px] text-slate-500 uppercase">{row.original.requester?.role || 'Guest'}</p>
        </div>
      ) 
    },
    { 
      accessorKey: 'remarks', 
      header: 'Justification', 
      cell: ({ row }) => <p className="text-xs text-slate-500 font-medium max-w-xs">{row.original.remarks ? row.original.remarks.substring(0, 50) + '...' : 'No Justification'}</p> 
    },
    { 
        accessorKey: 'status', 
        header: 'Protocol Outcome',
        cell: ({ row }) => (
            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                row.original.status === 'approved' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
            }`}>
                {row.original.status}
            </span>
        )
    },
    { 
        accessorKey: 'updatedAt', 
        header: 'Audit Timestamp', 
        cell: ({ row }) => <span className="text-[10px] font-bold text-slate-400">{row.original.updatedAt ? new Date(row.original.updatedAt).toLocaleString() : 'N/A'}</span> 
    },
    {
      accessorKey: 'approvedBy',
      header: 'Authority',
      cell: ({ row }) => <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{row.original.approvedBy || 'N/A'}</span>
    }
  ];

  return (
    <div className="space-y-6 flex flex-col h-[calc(100vh-8rem)] p-6">
      <div className="flex flex-col gap-6 shrink-0">
        <div>
           <h1 className="text-2xl font-black text-slate-900 tracking-tight leading-none mb-1">Institutional Audit & Approvals</h1>
           <p className="text-slate-500 text-sm font-medium">Review affiliation changes and academic session guardrails.</p>
        </div>
        <div className="flex bg-slate-100 p-1 rounded-2xl overflow-x-auto w-fit">
            <button 
                onClick={() => setActiveTab('sessions')}
                className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'sessions' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            >
                Admission Sessions
            </button>
            <button 
                onClick={() => setActiveTab('enrollment')}
                className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'enrollment' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            >
                Enrollment
            </button>
            <button 
                onClick={() => setActiveTab('enrolled')}
                className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'enrolled' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            >
                Enrolled Students
            </button>
            <button 
                onClick={() => setActiveTab('credential_audit')}
                className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'credential_audit' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            >
                Credential Audits
            </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 bg-white shadow-sm border border-slate-200 rounded-3xl flex flex-col overflow-hidden">
        {activeTab === 'sessions' && <DataTable columns={sColumns} data={sessions} isLoading={isLoading} searchKey="name" />}
        {activeTab === 'credential_audit' && <DataTable columns={credColumns} data={credentialRequests} isLoading={isLoading} searchKey="remarks" />}
        {(activeTab === 'enrollment' || activeTab === 'enrolled') && <DataTable columns={stuColumns} data={students} isLoading={isLoading} searchKey="name" />}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Institutional Audit Decision"
      >
        <div className="space-y-6">
            <div className={`p-4 rounded-2xl border flex gap-4 ${actionType === 'approve' ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'}`}>
                {actionType === 'approve' ? <RefreshCw className="w-6 h-6 text-emerald-600" /> : <AlertCircle className="w-6 h-6 text-red-600" />}
                <div>
                    <h3 className={`font-black uppercase tracking-tighter ${actionType === 'approve' ? 'text-emerald-900' : 'text-red-900'}`}>
                        Confirm {actionType === 'approve' ? 'Institutional Verification' : 'Protocol Rejection'}
                    </h3>
                    <p className={`text-xs mt-1 ${actionType === 'approve' ? 'text-emerald-700' : 'text-red-700'}`}>
                        This action will be permanently recorded in the forensic audit ledger. 
                        Mandatory remarks are required for regulatory compliance.
                    </p>
                </div>
            </div>

            {/* Payment Context Section for Enrollment */}
            {activeTab === 'enrollment' && selectedItem && (
                <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200 space-y-4">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Chosen Fee Plan</p>
                            <h4 className="text-sm font-black text-slate-900 uppercase">{selectedItem.feeSchema?.name || 'Standard Full Payment'}</h4>
                            <p className="text-[10px] text-slate-500 font-bold uppercase mt-0.5 tracking-tighter">{selectedItem.feeSchema?.type || 'REGULAR'}</p>
                        </div>
                        <div className="text-right">
                             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Academic Node</p>
                             <p className="text-xs font-bold text-slate-800">{selectedItem.program?.name}</p>
                        </div>
                    </div>

                    <div className="pt-4 border-t border-slate-200 grid grid-cols-2 gap-6">
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Payment Details</p>
                            <div className="space-y-1">
                                {selectedItem.payments?.map((p: any, idx: number) => (
                                    <div key={idx} className="flex flex-col">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-black text-slate-900 uppercase">{p.mode}</span>
                                            <span className="text-[10px] font-bold text-emerald-600 bg-white px-2 py-0.5 rounded border border-emerald-100">₹{p.amount}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}


            <div className="space-y-2">
                <div className="flex justify-between items-end">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mandatory Audit Remarks</label>
                    <span className={`text-[10px] font-black ${remarks.length >= 15 ? 'text-green-500' : 'text-red-400'}`}>
                        {remarks.length} / 15 Chars
                    </span>
                </div>
                <textarea 
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    className="w-full h-32 px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-slate-900 text-sm placeholder:text-slate-300 font-medium transition-all"
                    placeholder="Provide a detailed justification for this decision (min 15 chars)..."
                />
            </div>

            <div className="flex justify-end gap-3 uppercase">
                <button 
                    onClick={() => setIsModalOpen(false)}
                    className="px-6 py-2 text-slate-500 font-black text-[10px] hover:bg-slate-50 rounded-xl"
                >
                    Cancel
                </button>
                <button 
                    disabled={remarks.length < 15}
                    onClick={handleAction}
                    className={`px-10 py-2 rounded-xl text-[10px] font-black tracking-widest transition-all ${
                        remarks.length >= 15 
                        ? 'bg-slate-900 text-white shadow-xl shadow-slate-200 hover:-translate-y-0.5' 
                        : 'bg-slate-100 text-slate-300 cursor-not-allowed'
                    }`}
                >
                    Submit Decision
                </button>
            </div>
        </div>
      </Modal>
    </div>
  );
}
