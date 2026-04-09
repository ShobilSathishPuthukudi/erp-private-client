import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { DataTable } from '@/components/shared/DataTable';
import { Modal } from '@/components/shared/Modal';
import type { ColumnDef } from '@tanstack/react-table';
import { AlertCircle, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AccreditationQueue() {
  const [accredTab, setAccredTab] = useState<'finance_pending'|'approved'>('finance_pending');
  const [accredRequests, setAccredRequests] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [remarks, setRemarks] = useState('');

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/finance/accreditation-requests', { params: { status: accredTab } });
      setAccredRequests(res.data);
    } catch (error) {
      toast.error('Failed to sync accreditation audit queue');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [accredTab]);

  const handleAction = async () => {
    if (remarks.length < 15) return toast.error('Audit remarks must be at least 15 characters');
    try {
      await api.put(`/finance/accreditation-requests/${selectedItem?.id}/approve`, { status: 'approved', remarks });
      toast.success('Accreditation Request formally finalized.');
      setIsModalOpen(false);
      setRemarks('');
      setSelectedItem(null);
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Validation failure');
    }
  };

  const columns: ColumnDef<any>[] = [
    { accessorKey: 'courseName', header: 'Proposed Program', cell: ({ row }) => <span className="font-bold text-slate-900">{row.original.courseName}</span> },
    { id: 'center', header: 'Center', cell: ({ row }) => <span className="text-slate-700">{row.original.center?.name || 'N/A'}</span> },
    { accessorKey: 'assignedUniversityName', header: 'University Assignment', cell: ({ row }) => <span className="text-slate-600">{row.original.assignedUniversityName || 'N/A'}</span> },
    { accessorKey: 'assignedSubDeptName', header: 'Operational Type' },
    {
        id: 'actions',
        cell: ({ row }) => accredTab === 'finance_pending' && (
          <button onClick={() => { setSelectedItem(row.original); setIsModalOpen(true); }} className="bg-slate-900 text-white px-3 py-1 rounded-lg text-[10px] font-bold uppercase transition-colors hover:bg-slate-800 cursor-pointer">Finalize Accreditation</button>
        )
      }
  ];

  return (
    <div className="space-y-6 flex flex-col h-[calc(100vh-8rem)] p-6">
      <div className="flex flex-col gap-6 shrink-0">
        <div>
           <h1 className="text-2xl font-black text-slate-900 tracking-tight leading-none mb-1">Accreditation Audits</h1>
           <p className="text-slate-500 text-sm font-medium">Verify structural pipelines and authorize program initialization.</p>
        </div>
        <div className="flex bg-slate-100 p-1 rounded-2xl overflow-x-auto w-fit gap-2">
            <button onClick={() => setAccredTab('finance_pending')} className={`cursor-pointer px-4 py-1.5 rounded-lg text-xs font-bold uppercase transition-all ${accredTab === 'finance_pending' ? 'bg-white text-blue-600 shadow-sm border' : 'text-slate-500'}`}>Request Pending</button>
            <button onClick={() => setAccredTab('approved')} className={`cursor-pointer px-4 py-1.5 rounded-lg text-xs font-bold uppercase transition-all ${accredTab === 'approved' ? 'bg-white text-emerald-600 shadow-sm border' : 'text-slate-500'}`}>Approved Vault</button>
        </div>
      </div>

      <div className="flex-1 min-h-0 bg-white shadow-sm border border-slate-200 rounded-3xl flex flex-col overflow-hidden">
        <DataTable columns={columns} data={accredRequests} isLoading={isLoading} searchKey="courseName" />
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Institutional Audit Decision"
      >
        <div className="space-y-6">
            <div className="p-4 rounded-2xl border flex gap-4 bg-emerald-50 border-emerald-100">
                <RefreshCw className="w-6 h-6 text-emerald-600" />
                <div>
                    <h3 className="font-black uppercase tracking-tighter text-emerald-900">
                        Confirm Institutional Verification
                    </h3>
                    <p className="text-xs mt-1 text-emerald-700">
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
