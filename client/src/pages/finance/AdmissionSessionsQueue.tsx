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

export default function AdmissionSessionsQueue() {
  const [sessions, setSessions] = useState<AdmissionSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [remarks, setRemarks] = useState('');
  const [actionType, setActionType] = useState<'approve' | 'reject'>('approve');

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/finance/admission-sessions');
      setSessions(res.data);
    } catch (error) {
      toast.error('Failed to sync admission sessions');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAction = async () => {
    if (remarks.length < 15) return toast.error('Audit remarks must be at least 15 characters');
    try {
      await api.put(`/finance/admission-sessions/${selectedItem?.id}/approve`, { status: actionType === 'approve' ? 'approved' : 'rejected', remarks });
      toast.success('Admission Session finalized.');
      setIsModalOpen(false);
      setRemarks('');
      setSelectedItem(null);
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Validation failure');
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
              <button onClick={() => { setSelectedItem(row.original); setActionType('approve'); setIsModalOpen(true); }} className="bg-slate-900 text-white px-3 py-1 rounded-lg text-[10px] font-bold uppercase transition-colors hover:bg-slate-800 cursor-pointer">Verify & Open</button>
              <button onClick={() => { setSelectedItem(row.original); setActionType('reject'); setIsModalOpen(true); }} className="bg-red-50 text-red-600 px-3 py-1 rounded-lg text-[10px] font-bold uppercase transition-colors hover:bg-red-100 cursor-pointer">Reject</button>
          </div>
        )
      }
  ];

  return (
    <div className="space-y-6 flex flex-col h-[calc(100vh-8rem)] p-6">
      <div className="flex flex-col gap-6 shrink-0">
        <div>
           <h1 className="text-2xl font-black text-slate-900 tracking-tight leading-none mb-1">Admission sessions</h1>
           <p className="text-slate-500 text-sm font-medium">Verify financial viability and unlock operational intake windows.</p>
        </div>
      </div>

      <div className="flex-1 min-h-0 bg-white shadow-sm border border-slate-200 rounded-3xl flex flex-col overflow-hidden">
        <DataTable columns={sColumns} data={sessions} isLoading={isLoading} searchKey="name" />
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
                    className="px-6 py-2 text-slate-500 font-black text-[10px] hover:bg-slate-50 rounded-xl cursor-pointer"
                >
                    Cancel
                </button>
                <button 
                    disabled={remarks.length < 15}
                    onClick={handleAction}
                    className={`px-10 py-2 rounded-xl text-[10px] font-black tracking-widest transition-all ${
                        remarks.length >= 15 
                        ? 'bg-slate-900 text-white shadow-xl shadow-slate-200 hover:-translate-y-0.5 cursor-pointer' 
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
