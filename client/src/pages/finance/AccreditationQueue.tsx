import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { DataTable } from '@/components/shared/DataTable';
import { Modal } from '@/components/shared/Modal';
import type { ColumnDef } from '@tanstack/react-table';
import { AlertCircle, RefreshCw, Eye, FileText, Landmark, GraduationCap, Calendar, Info, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { PageHeader } from '@/components/shared/PageHeader';

export default function AccreditationQueue() {
  const [accredTab, setAccredTab] = useState<'finance_pending'|'approved'>('finance_pending');
  const [accredRequests, setAccredRequests] = useState<any[]>([]);
  const [counts, setCounts] = useState<{ finance_pending: number, approved: number }>({ finance_pending: 0, approved: 0 });
  const [isLoading, setIsLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [remarks, setRemarks] = useState('');

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [res, countsRes] = await Promise.all([
        api.get('/finance/accreditation-requests', { params: { status: accredTab } }),
        api.get('/finance/accreditation-requests/counts')
      ]);
      setAccredRequests(res.data);
      setCounts(countsRes.data);
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
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <button 
              onClick={() => { setSelectedItem(row.original); setIsDetailsOpen(true); }}
              className="bg-slate-100 text-slate-600 px-3 py-1 rounded-lg text-[10px] font-bold uppercase transition-all hover:bg-slate-200 cursor-pointer flex items-center gap-1.5"
            >
              <Eye className="w-3 h-3" />
              Inspect
            </button>
            {accredTab === 'finance_pending' && (
              <button 
                onClick={() => { setSelectedItem(row.original); setIsModalOpen(true); }} 
                className="bg-slate-900 text-white px-3 py-1 rounded-lg text-[10px] font-bold uppercase transition-colors hover:bg-slate-800 cursor-pointer"
              >
                Finalize Accreditation
              </button>
            )}
          </div>
        )
      }
  ];

  return (
    <div className="space-y-6 flex flex-col h-[calc(100vh-8rem)] p-2">
      <div className="flex flex-col gap-6 shrink-0">
      <PageHeader 
        title="Accreditation audits"
        description="Verify structural pipelines and authorize program initialization."
        icon={ShieldCheck}
      />
        <div className="flex bg-slate-100 p-1 rounded-2xl overflow-x-auto w-fit gap-2">
            <button onClick={() => setAccredTab('finance_pending')} className={`cursor-pointer px-4 py-1.5 rounded-lg text-xs font-bold uppercase transition-all flex items-center gap-2 ${accredTab === 'finance_pending' ? 'bg-white text-blue-600 shadow-sm border' : 'text-slate-500'}`}>
              Request Pending
              <span className={`px-2 py-0.5 rounded-full text-[10px] ${accredTab === 'finance_pending' ? 'bg-blue-100 text-blue-600' : 'bg-slate-200 text-slate-500'}`}>
                {counts.finance_pending}
              </span>
            </button>
            <button onClick={() => setAccredTab('approved')} className={`cursor-pointer px-4 py-1.5 rounded-lg text-xs font-bold uppercase transition-all flex items-center gap-2 ${accredTab === 'approved' ? 'bg-white text-emerald-600 shadow-sm border' : 'text-slate-500'}`}>
              Approved Vault
              <span className={`px-2 py-0.5 rounded-full text-[10px] ${accredTab === 'approved' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-500'}`}>
                {counts.approved}
              </span>
            </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 bg-white shadow-sm border border-slate-200 rounded-3xl flex flex-col overflow-hidden">
        <DataTable columns={columns} data={accredRequests} isLoading={isLoading} searchKey="courseName" />
      </div>

      <Modal
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        title="Institutional Audit Inspection"
      >
        {selectedItem && (
          <div className="space-y-8">
            <div className="flex items-start gap-4 p-5 bg-slate-50 border border-slate-100 rounded-3xl">
              <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-slate-100 shrink-0">
                <FileText className="w-6 h-6 text-slate-900" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900 leading-tight">{selectedItem.courseName}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest bg-slate-200/50 px-2 py-0.5 rounded-md">
                    Audit ID: #{selectedItem.id?.toString().padStart(5, '0')}
                  </span>
                  <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${
                    selectedItem.status === 'approved' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'
                  }`}>
                    {selectedItem.status?.replace('_', ' ')}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm space-y-1">
                <div className="flex items-center gap-2 text-slate-400">
                  <Landmark className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Target Institution</span>
                </div>
                <p className="text-sm font-black text-slate-900 uppercase">{selectedItem.assignedUniversityName || 'Institutional Default'}</p>
              </div>

              <div className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm space-y-1">
                <div className="flex items-center gap-2 text-slate-400">
                  <GraduationCap className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Operational Stream</span>
                </div>
                <p className="text-sm font-bold text-slate-700">{selectedItem.assignedSubDeptName || 'Standard Track'}</p>
              </div>

              {selectedItem.programDetails && (
                <div className="col-span-2 p-5 bg-indigo-50/50 border border-indigo-100 rounded-[2rem] space-y-4">
                   <div className="flex items-center gap-2 text-indigo-400">
                      <Info className="w-3.5 h-3.5" />
                      <span className="text-[10px] font-black uppercase tracking-widest">Program Technical Profile</span>
                   </div>
                   <div className="grid grid-cols-3 gap-6">
                      <div>
                        <p className="text-[9px] font-black text-indigo-300 uppercase tracking-widest mb-1">Duration & Scale</p>
                        <p className="text-sm font-black text-indigo-900">{selectedItem.programDetails.duration} Years / {selectedItem.programDetails.credits} Credits</p>
                      </div>
                      <div>
                        <p className="text-[9px] font-black text-indigo-300 uppercase tracking-widest mb-1">Fee Architecture</p>
                        <p className="text-sm font-black text-indigo-900">₹{parseFloat(selectedItem.programDetails.totalFee).toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-[9px] font-black text-indigo-300 uppercase tracking-widest mb-1">Service Type</p>
                        <p className="text-sm font-black text-indigo-900 uppercase tracking-tighter">{selectedItem.programDetails.type}</p>
                      </div>
                   </div>
                </div>
              )}

              <div className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm space-y-1 col-span-2">
                <div className="flex items-center gap-2 text-slate-400">
                  <Calendar className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Audit Timeline & Remarks</span>
                </div>
                <div className="space-y-3 mt-2">
                  <div className="p-3 bg-slate-50 rounded-xl border border-dashed text-xs font-medium text-slate-600 leading-relaxed italic">
                    "{selectedItem.remarks || 'No specific justification provided by the center.'}"
                  </div>
                  <p className="text-[10px] font-bold text-slate-400">
                    Received on {new Date(selectedItem.createdAt).toLocaleDateString('en-IN', {
                      day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button 
                onClick={() => setIsDetailsOpen(false)}
                className="px-8 py-2.5 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all cursor-pointer shadow-lg shadow-slate-200"
              >
                Close Inspection
              </button>
            </div>
          </div>
        )}
      </Modal>

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
