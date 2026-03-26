import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { DataTable } from '@/components/shared/DataTable';
import { Modal } from '@/components/shared/Modal';
import type { ColumnDef } from '@tanstack/react-table';
import { ShieldCheck, CheckCircle2, XCircle, FileText, UserCircle2, Landmark, Search } from 'lucide-react';
import toast from 'react-hot-toast';

interface Student {
  id: number;
  name: string;
  enrollStatus: string;
  subDept?: string;
  program?: { name: string };
  university?: { name: string };
  marks?: any;
  createdAt: string;
  documents?: { name: string, path: string }[];
}

export default function PendingReviews() {
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [remarks, setRemarks] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');

  const fetchData = async () => {
    try {
      setIsLoading(true);
      // Fetch students with status 'pending' (Stage 1)
      const res = await api.get('/academic/students?status=pending');
      setStudents(res.data.filter((s: any) => s.enrollStatus === 'pending'));
    } catch (error) {
      toast.error('Failed to access eligibility queue');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openReviewModal = (student: Student) => {
    setSelectedStudent(student);
    setRemarks('');
    setRejectionReason('');
    setIsReviewModalOpen(true);
  };

  const handleApprove = async () => {
    if (!selectedStudent) return;
    try {
      await api.put(`/academic/students/${selectedStudent.id}/verify-eligibility`, {
        status: 'approved',
        remarks: remarks || 'Academic eligibility criteria matched.'
      });
      toast.success('Appraisal Decided: Advanced to Sub-Dept');
      setIsReviewModalOpen(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Authorization protocol failure');
    }
  };

  const handleReject = async () => {
    if (!selectedStudent || !rejectionReason) {
      return toast.error('Mandatory rejection reason required');
    }
    try {
      await api.put(`/academic/students/${selectedStudent.id}/verify-eligibility`, {
        status: 'rejected',
        remarks: rejectionReason + (remarks ? `: ${remarks}` : '')
      });
      toast.success('Enrollment Rejected: Study Center Notified');
      setIsReviewModalOpen(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Rejection protocol failure');
    }
  };

  const columns: ColumnDef<Student>[] = [
    { 
      accessorKey: 'name', 
      header: 'Student Identity', 
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 border border-slate-200 uppercase font-black text-[10px]">
            {row.original.name.charAt(0)}
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-slate-900">{row.original.name}</span>
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-tighter">APP-REF-{row.original.id}</span>
          </div>
        </div>
      ) 
    },
    { 
      id: 'program', 
      header: 'Program Applied',
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="text-sm font-bold text-slate-700">{row.original.program?.name || 'Manual Entry'}</span>
          <span className="text-[10px] text-slate-400 flex items-center gap-1 uppercase font-bold tracking-widest">
            <Landmark className="w-2.5 h-2.5" />
            {row.original.university?.name || 'Local'}
          </span>
        </div>
      )
    },
    { 
      accessorKey: 'subDept', 
      header: 'Vertical',
      cell: ({ row }) => (
        <span className="bg-slate-50 border border-slate-200 text-slate-600 text-[10px] px-2 py-1 rounded-lg font-black uppercase tracking-widest">
          {row.original.subDept || 'General'}
        </span>
      )
    },
    { 
      accessorKey: 'createdAt', 
      header: 'Received', 
      cell: ({ row }) => (
        <div className="text-xs text-slate-500 font-medium">
          {new Date(row.original.createdAt).toLocaleDateString()}
        </div>
      ) 
    },
    {
      id: 'actions',
      header: 'Appraisal',
      cell: ({ row }) => (
        <button 
          onClick={() => openReviewModal(row.original)}
          className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-black hover:bg-slate-800 transition-all active:scale-95 shadow-lg shadow-slate-900/20"
        >
          <Search className="w-3.5 h-3.5" />
          <span>Conduct Review</span>
        </button>
      )
    }
  ];

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto p-4 lg:p-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-8 rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50 gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-2xl bg-amber-500 flex items-center justify-center text-white shadow-lg shadow-amber-500/20">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Academic Eligibility Queue</h1>
          </div>
          <p className="text-slate-500 font-medium ml-15">Stage-1 Institutional Assessment: Verify academic credentials before financial activation.</p>
        </div>
        <div className="bg-slate-50 px-6 py-4 rounded-2xl border border-slate-200 flex flex-col items-center">
            <span className="text-3xl font-black text-slate-900">{students.length}</span>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pending Appraisals</span>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden">
        <DataTable 
          columns={columns} 
          data={students} 
          isLoading={isLoading} 
          searchKey="name" 
          searchPlaceholder="Search active eligibility tickets..." 
        />
      </div>

      <Modal
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        title={`Academic Appraisal HUD: ${selectedStudent?.name}`}
      >
        <div className="space-y-6 p-2">
            {/* Qualification HUD */}
            <div className="bg-slate-900 p-6 rounded-3xl shadow-xl shadow-slate-900/20">
                <div className="flex items-center gap-3 mb-4">
                    <UserCircle2 className="text-amber-400 w-5 h-5" />
                    <h3 className="text-white font-black text-sm uppercase tracking-widest">Candidacy Telemetry</h3>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white/10 p-4 rounded-2xl border border-white/5 flex flex-col justify-center min-h-[80px]">
                        <p className="text-[10px] font-bold text-white/40 uppercase mb-1">10th Marks</p>
                        <p className="text-lg font-black text-white">{selectedStudent?.marks?.tenth || 'N/A'}%</p>
                    </div>
                    <div className="bg-white/10 p-4 rounded-2xl border border-white/5 flex flex-col justify-center min-h-[80px]">
                        <p className="text-[10px] font-bold text-white/40 uppercase mb-1">12th Marks</p>
                        <p className="text-lg font-black text-white">{selectedStudent?.marks?.twelfth || 'N/A'}%</p>
                    </div>
                    <div className="bg-white/10 p-4 rounded-2xl border border-white/5 flex flex-col justify-center min-h-[80px]">
                        <p className="text-[10px] font-bold text-white/40 uppercase mb-1">Vertical</p>
                        <p className="text-lg font-black text-white">{selectedStudent?.subDept || 'N/A'}</p>
                    </div>
                    <div className="bg-white/10 p-4 rounded-2xl border border-white/5 flex flex-col justify-center min-h-[80px]">
                        <p className="text-[10px] font-bold text-white/40 uppercase mb-1">Status</p>
                        <p className="text-[11px] font-bold text-amber-400 uppercase leading-tight">Stage-1 Review</p>
                    </div>
                </div>
            </div>

            {/* Document Verification HUD Overlay */}
            <div className="border border-slate-200 rounded-3xl p-6 bg-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600">
                        <FileText className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-slate-900 uppercase tracking-tight">Institutional Dossier</p>
                        <p className="text-[10px] text-slate-500 font-medium">
                            {selectedStudent?.documents?.length ? `${selectedStudent.documents.length} verified PDF attachments.` : 'No documents uploaded.'}
                        </p>
                    </div>
                </div>
                <div className="flex flex-col gap-2">
                    {selectedStudent?.documents?.map((doc, idx) => (
                        <a 
                            key={idx}
                            href={`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}${doc.path}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-white border border-slate-200 px-4 py-2 rounded-xl text-[10px] font-bold hover:bg-slate-50 transition-all active:scale-95 shadow-sm flex items-center gap-2 whitespace-nowrap"
                        >
                            <FileText className="w-3 h-3 text-blue-500" />
                            {doc.name}
                        </a>
                    )) || (
                        <button disabled className="bg-slate-200 text-slate-400 px-4 py-2 rounded-xl text-xs font-bold cursor-not-allowed">
                            None
                        </button>
                    )}
                </div>
            </div>

            <div className="space-y-4">
                <div>
                   <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Academic Rejection Category</label>
                    <select 
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900 transition-all font-bold text-slate-900"
                    >
                        <option value="">-- No Rejection Selected --</option>
                        <option value="Insufficient marks">Insufficient Aggregate Marks</option>
                        <option value="Missing documents">Missing Institutional Credentials</option>
                        <option value="Program mismatch">Incompatible Program Selection</option>
                        <option value="Other">Operational Deviation (Specify below)</option>
                    </select>
                </div>

                <div>
                    <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Appraisal Remarks</label>
                    <textarea 
                        value={remarks}
                        onChange={(e) => setRemarks(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900 transition-all font-bold text-slate-900"
                        rows={3}
                        placeholder="Criteria synthesis or rejection context..."
                    />
                </div>
            </div>

            <div className="pt-6 border-t border-slate-100 flex flex-col md:flex-row gap-3">
                <button 
                    onClick={handleReject}
                    disabled={!rejectionReason}
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-3 text-red-600 font-bold hover:bg-red-50 rounded-2xl transition-all active:scale-95 disabled:opacity-50 text-sm"
                >
                    <XCircle className="w-5 h-5" />
                    Issue Rejection
                </button>
                <button 
                    onClick={handleApprove}
                    className="flex-[2] flex items-center justify-center gap-2 px-8 py-3 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-all active:scale-95 shadow-xl shadow-slate-900/20 text-sm"
                >
                    <CheckCircle2 className="w-5 h-5" />
                    Approve Eligibility
                </button>
            </div>
        </div>
      </Modal>
    </div>
  );
}
