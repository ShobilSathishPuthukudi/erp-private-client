import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { DataTable } from '@/components/shared/DataTable';
import { Modal } from '@/components/shared/Modal';
import type { ColumnDef } from '@tanstack/react-table';
import { CheckCircle, XCircle, FileText, Info, ShieldCheck, Link as LinkIcon } from 'lucide-react';
import toast from 'react-hot-toast';

interface AccreditationRequest {
  id: number;
  centerId: number;
  courseName: string;
  universityName: string;
  type: string;
  status: string;
  center?: { name: string };
}

interface Program {
  id: number;
  name: string;
}

export default function AccreditationRequests() {
  const [requests, setRequests] = useState<AccreditationRequest[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<AccreditationRequest | null>(null);
  const [selectedProgramId, setSelectedProgramId] = useState<string>('');
  const [remarks, setRemarks] = useState('');

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [reqRes, progRes] = await Promise.all([
        api.get('/sub-dept/accreditation-requests'),
        api.get('/sub-dept/programs')
      ]);
      setRequests(reqRes.data);
      setPrograms(progRes.data);
    } catch (error) {
      toast.error('Failed to load accreditation data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openApproveModal = (request: AccreditationRequest) => {
    setSelectedRequest(request);
    setRemarks('');
    setSelectedProgramId('');
    setIsModalOpen(true);
  };

  const handleApprove = async () => {
    if (!selectedProgramId) return toast.error('Please select a program to link');
    try {
      await api.put(`/sub-dept/accreditation-requests/${selectedRequest?.id}/approve`, {
        programId: parseInt(selectedProgramId),
        remarks
      });
      toast.success('Institutional accreditation approved');
      setIsModalOpen(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Approval protocol failure');
    }
  };

  const columns: ColumnDef<AccreditationRequest>[] = [
    { accessorKey: 'id', header: 'REQ-ID', cell: ({ row }) => <span className="font-mono text-xs">#ACC-{row.original.id}</span> },
    { accessorKey: 'center.name', header: 'Center Name', cell: ({ row }) => <span className="font-bold text-slate-900">{row.original.center?.name}</span> },
    { accessorKey: 'courseName', header: 'Requested Course', cell: ({ row }) => <span className="text-slate-700">{row.original.courseName}</span> },
    { accessorKey: 'universityName', header: 'Target University', cell: ({ row }) => <span className="text-slate-600 italic">{row.original.universityName}</span> },
    {
      id: 'actions',
      header: 'Review Protocol',
      cell: ({ row }) => (
        <button 
          onClick={() => openApproveModal(row.original)}
          className="flex items-center gap-2 bg-slate-900 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-slate-800 transition-colors shadow-sm"
        >
          <ShieldCheck className="w-3 h-3" />
          <span>Audit Review</span>
        </button>
      )
    }
  ];

  return (
    <div className="space-y-6 flex flex-col h-[calc(100vh-8rem)]">
      <div className="flex justify-between items-center shrink-0">
        <div>
           <h1 className="text-2xl font-bold text-slate-900">Accreditation Audit Queue</h1>
           <p className="text-slate-500 text-sm">Review center interest requests for specialized course tie-ups and academic linking.</p>
        </div>
      </div>

      <div className="flex-1 min-h-0 bg-white shadow-sm border border-slate-200 rounded-lg flex flex-col">
        <DataTable columns={columns} data={requests} isLoading={isLoading} searchKey="courseName" />
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={`Institutional Accreditation Review: ${selectedRequest?.courseName}`}
      >
        <div className="space-y-6">
            <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 flex items-start gap-3">
                <Info className="w-5 h-5 text-amber-600 mt-0.5" />
                <div className="text-xs text-amber-800 leading-relaxed">
                    <p className="font-bold uppercase mb-1">Center Submission</p>
                    Requested Course: <b>{selectedRequest?.courseName}</b> at <b>{selectedRequest?.universityName}</b>.
                </div>
            </div>

            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-tighter flex items-center gap-2">
                        <LinkIcon className="w-3 h-3" />
                        Link to Academic Program
                    </label>
                    <select 
                        value={selectedProgramId}
                        onChange={(e) => setSelectedProgramId(e.target.value)}
                        className="w-full px-4 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    >
                        <option value="">Select compatible program...</option>
                        {programs.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-tighter">Review Remarks</label>
                    <textarea 
                        value={remarks}
                        onChange={(e) => setRemarks(e.target.value)}
                        className="w-full px-4 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        rows={3}
                        placeholder="Accreditation criteria verified..."
                    />
                </div>
            </div>

            <div className="pt-6 border-t border-slate-100 flex justify-end gap-3 uppercase">
                <button 
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 text-slate-500 font-bold hover:bg-slate-50 rounded-xl transition-colors"
                >
                    Cancel
                </button>
                <button 
                    onClick={handleApprove}
                    className="px-8 py-2 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-shadow shadow-lg shadow-slate-200 flex items-center gap-2"
                >
                    <CheckCircle className="w-4 h-4" />
                    Approve & Link
                </button>
            </div>
        </div>
      </Modal>
    </div>
  );
}
