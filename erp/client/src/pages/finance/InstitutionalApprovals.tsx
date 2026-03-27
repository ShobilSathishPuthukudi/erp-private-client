import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { DataTable } from '@/components/shared/DataTable';
import { Modal } from '@/components/shared/Modal';
import type { ColumnDef } from '@tanstack/react-table';
import { CheckCircle, XCircle, AlertCircle, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

interface ChangeRequest {
  id: number;
  center: { name: string };
  currentProgram: { name: string };
  requestedProgram: { name: string };
  reason: string;
  status: string;
}

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
  invoice?: { status: string, invoiceNo: string };
  status: string;
}

export default function InstitutionalApprovals() {
  const [activeTab, setActiveTab] = useState<'affiliation' | 'sessions' | 'enrollment'>('enrollment');
  const [changeRequests, setChangeRequests] = useState<ChangeRequest[]>([]);
  const [sessions, setSessions] = useState<AdmissionSession[]>([]);
  const [students, setStudents] = useState<StudentApproval[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Approval Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [remarks, setRemarks] = useState('');
  const [actionType, setActionType] = useState<'approve' | 'reject'>('approve');

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [crRes, sRes, stuRes] = await Promise.all([
        api.get('/finance/change-requests'),
        api.get('/finance/admission-sessions'),
        api.get('/finance/approvals/students')
      ]);
      setChangeRequests(crRes.data);
      setSessions(sRes.data);
      setStudents(stuRes.data);
    } catch (error) {
      toast.error('Failed to sync institutional approval queues');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAction = async () => {
    if (remarks.length < 50) return toast.error('Audit remarks must be at least 50 characters');
    try {
      let endpoint = '';
      let method: 'put' | 'post' = 'put';

      if (activeTab === 'affiliation') {
        endpoint = `/finance/change-requests/${selectedId}/approve`;
      } else if (activeTab === 'sessions') {
        endpoint = `/finance/admission-sessions/${selectedId}/approve`;
      } else if (activeTab === 'enrollment') {
        endpoint = `/finance/approvals/students/${selectedId}/finalize`;
        method = 'post';
      }
      
      const payload = { status: actionType === 'approve' ? 'approved' : 'rejected', remarks };
      
      if (method === 'put') await api.put(endpoint, payload);
      else await api.post(endpoint, payload);

      toast.success(`Action ${actionType}d successfully`);
      setIsModalOpen(false);
      setRemarks('');
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Approval protocol failure');
    }
  };

  const crColumns: ColumnDef<ChangeRequest>[] = [
    { accessorKey: 'center.name', header: 'Center Identity' },
    { accessorKey: 'currentProgram.name', header: 'Current Affiliation', cell: ({ row }) => <span className="text-slate-400">{row.original.currentProgram.name}</span> },
    { accessorKey: 'requestedProgram.name', header: 'Requested Target', cell: ({ row }) => <span className="font-bold text-blue-600">{row.original.requestedProgram.name}</span> },
    { accessorKey: 'reason', header: 'Justification', cell: ({ row }) => <span className="text-xs italic text-slate-500">{row.original.reason.substring(0, 40)}...</span> },
    { 
        accessorKey: 'status', 
        header: 'Audit Status',
        cell: ({ row }) => (
            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                row.original.status === 'approved' ? 'bg-green-50 text-green-600' : 
                row.original.status === 'rejected' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'
            }`}>
                {row.original.status}
            </span>
        )
    },
    {
      id: 'actions',
      cell: ({ row }) => row.original.status === 'pending' && (
        <div className="flex gap-2">
            <button onClick={() => { setSelectedId(row.original.id); setActionType('approve'); setIsModalOpen(true); }} className="text-green-600 hover:bg-green-50 p-1.5 rounded-lg transition-colors"><CheckCircle className="w-4 h-4" /></button>
            <button onClick={() => { setSelectedId(row.original.id); setActionType('reject'); setIsModalOpen(true); }} className="text-red-600 hover:bg-red-50 p-1.5 rounded-lg transition-colors"><XCircle className="w-4 h-4" /></button>
        </div>
      )
    }
  ];

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
              <button onClick={() => { setSelectedId(row.original.id); setActionType('approve'); setIsModalOpen(true); }} className="bg-slate-900 text-white px-3 py-1 rounded-lg text-[10px] font-bold uppercase transition-colors hover:bg-slate-800">Verify & Open</button>
              <button onClick={() => { setSelectedId(row.original.id); setActionType('reject'); setIsModalOpen(true); }} className="bg-red-50 text-red-600 px-3 py-1 rounded-lg text-[10px] font-bold uppercase transition-colors hover:bg-red-100">Reject</button>
          </div>
        )
      }
  ];

  const stuColumns: ColumnDef<StudentApproval>[] = [
    { accessorKey: 'name', header: 'Student Identity', cell: ({ row }) => <span className="font-bold text-slate-900">{row.original.name}</span> },
    { accessorKey: 'center.name', header: 'Source Center' },
    { accessorKey: 'program.name', header: 'Academic Node' },
    { 
        id: 'billing', 
        header: 'Invoice Status',
        cell: ({ row }) => {
            const hasPaid = row.original.invoice?.status === 'paid';
            return (
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${hasPaid ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                    {hasPaid ? 'Payment Confirmed' : 'Payment Awaiting'}
                </span>
            );
        }
    },
    {
      id: 'actions',
      cell: ({ row }) => (
        <button 
          onClick={() => { setSelectedId(row.original.id); setActionType('approve'); setIsModalOpen(true); }}
          className="bg-emerald-600 text-white px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all hover:bg-emerald-700 hover:shadow-lg hover:shadow-emerald-200"
        >
          Finalize & Enroll
        </button>
      )
    }
  ];

  return (
    <div className="space-y-6 flex flex-col h-[calc(100vh-8rem)] p-6">
      <div className="flex justify-between items-end shrink-0">
        <div>
           <h1 className="text-2xl font-black text-slate-900 tracking-tight">Institutional Audit & Approvals</h1>
           <p className="text-slate-500 text-sm font-medium">Review affiliation changes and academic session guardrails.</p>
        </div>
        <div className="flex bg-slate-100 p-1 rounded-2xl">
            <button 
                onClick={() => setActiveTab('affiliation')}
                className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'affiliation' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            >
                Affiliation Changes
            </button>
            <button 
                onClick={() => setActiveTab('sessions')}
                className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'sessions' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            >
                Admission Sessions
            </button>
            <button 
                onClick={() => setActiveTab('enrollment')}
                className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'enrollment' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            >
                Enrollment Finalization
            </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 bg-white shadow-sm border border-slate-200 rounded-3xl flex flex-col overflow-hidden">
        {activeTab === 'affiliation' && <DataTable columns={crColumns} data={changeRequests} isLoading={isLoading} searchKey="reason" />}
        {activeTab === 'sessions' && <DataTable columns={sColumns} data={sessions} isLoading={isLoading} searchKey="name" />}
        {activeTab === 'enrollment' && <DataTable columns={stuColumns} data={students} isLoading={isLoading} searchKey="name" />}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Forensic Audit Approval"
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

            <div className="space-y-2">
                <div className="flex justify-between items-end">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mandatory Audit Remarks</label>
                    <span className={`text-[10px] font-black ${remarks.length >= 50 ? 'text-green-500' : 'text-red-400'}`}>
                        {remarks.length} / 50 Chars
                    </span>
                </div>
                <textarea 
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    className="w-full h-32 px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-slate-900 text-sm placeholder:text-slate-300 font-medium transition-all"
                    placeholder="Provide a detailed justification for this approval/rejection decision (min 50 chars)..."
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
                    disabled={remarks.length < 50}
                    onClick={handleAction}
                    className={`px-10 py-2 rounded-xl text-[10px] font-black tracking-widest transition-all ${
                        remarks.length >= 50 
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
