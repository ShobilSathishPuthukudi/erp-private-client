import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { DataTable } from '@/components/shared/DataTable';
import { Modal } from '@/components/shared/Modal';
import type { ColumnDef } from '@tanstack/react-table';
import {
  CheckCircle2,
  XCircle,
  FileText,
  UserCircle2,
  Search,
  Eye,
  ShieldCheck,
  Activity,
  Clock,
  Briefcase
} from 'lucide-react';
import toast from 'react-hot-toast';

interface Student {
  id: number;
  name: string;
  enrollStatus: string;
  remarks?: string;
  subDepartment?: { name: string };
  program?: { name: string };
  university?: { name: string };
  marks?: {
    lastExam?: string;
    lastExamScore?: string;
    marksProof?: string;
  };
  createdAt: string;
  documents?: { name: string, path: string }[];
  reviewStage?: string;
  status: string;
  reviewedBy?: string;
}

export default function PendingReviews() {
  const getApiErrorMessage = (error: unknown, fallback: string) => {
    const apiError = error as { response?: { data?: { error?: string } } };
    return apiError.response?.data?.error || fallback;
  };

  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = (searchParams.get('tab') as 'pending' | 'finance' | 'approved' | 'rejected') || 'pending';
  const [activeTab, setActiveTab] = useState<'pending' | 'finance' | 'approved' | 'rejected'>(initialTab);
  const [counts, setCounts] = useState({ pending: 0, finance: 0, approved: 0, rejected: 0 });

  const user = useAuthStore(state => state.user);
  const isSales = user?.role?.toLowerCase().trim().includes('sales');
  const isReadOnly = activeTab !== 'pending' || isSales;

  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [isRoadmapModalOpen, setIsRoadmapModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [remarks, setRemarks] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');

  const fetchCounts = async () => {
    try {
      const [p, f, a, r] = await Promise.all([
        api.get('/academic/students?status=PENDING_REVIEW'),
        api.get('/academic/students?status=FINANCE_PENDING,FINANCE_APPROVED'),
        api.get('/academic/students?status=ENROLLED'),
        api.get('/academic/students?status=REJECTED')
      ]);
      setCounts({
        pending: p.data.length,
        finance: f.data.length,
        approved: a.data.length,
        rejected: r.data.length
      });
    } catch (error) {
      console.error('Status telemetry sync failure', error);
    }
  };

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const statusMap = {
        'pending': 'PENDING_REVIEW',
        'finance': 'FINANCE_PENDING,FINANCE_APPROVED',
        'approved': 'ENROLLED',
        'rejected': 'REJECTED'
      };
      const res = await api.get(`/academic/students?status=${statusMap[activeTab]}`);
      setStudents(res.data);
    } catch {
      toast.error('Failed to access eligibility queue');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  useEffect(() => {
    fetchCounts();
  }, []);

  const openReviewModal = (student: Student) => {
    setSelectedStudent(student);
    setRemarks('');
    setRejectionReason('');
    setIsReviewModalOpen(true);
  };

  const handleApprove = async () => {
    if (!selectedStudent) return;
    if (!remarks.trim()) {
      return toast.error('Mandatory appraisal remarks required for institutional clearance');
    }
    try {
      const res = await api.put(`/academic/students/${selectedStudent.id}/verify-eligibility`, {
        status: 'approved',
        remarks: remarks.trim()
      });
      toast.success(res.data.message || 'Application approved and routed to Finance');
      setIsReviewModalOpen(false);
      await Promise.all([fetchData(), fetchCounts()]);
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'Authorization protocol failure'));
    }
  };

  const handleReject = async () => {
    if (!selectedStudent || !rejectionReason) {
      return toast.error('Mandatory rejection category required');
    }
    if (!remarks.trim()) {
      return toast.error('Mandatory appraisal remarks required for rejection audit');
    }
    try {
      await api.put(`/academic/students/${selectedStudent.id}/verify-eligibility`, {
        status: 'rejected',
        remarks: `${rejectionReason}: ${remarks.trim()}`
      });
      toast.success('Enrollment Rejected: Study Center Notified');
      setIsReviewModalOpen(false);
      await Promise.all([fetchData(), fetchCounts()]);
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'Rejection protocol failure'));
    }
  };

  const handleRequestCorrection = async () => {
    if (!selectedStudent) return;
    if (!remarks.trim()) {
      return toast.error('Mandatory correction remarks required before returning the application');
    }
    try {
      const res = await api.put(`/academic/students/${selectedStudent.id}/verify-eligibility`, {
        status: 'correction_requested',
        remarks: remarks.trim()
      });
      toast.success(res.data.message || 'Correction requested and partner center notified');
      setIsReviewModalOpen(false);
      await Promise.all([fetchData(), fetchCounts()]);
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'Correction workflow failed'));
    }
  };

  const columns: ColumnDef<Student>[] = [
    { 
      accessorKey: 'name', 
      header: 'Student Identity', 
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 border border-slate-200 uppercase font-black text-[10px]">
            {row.original.name?.charAt(0) || '?'}
          </div>
          <div className="flex flex-col">
            <Link
              to={`/dashboard/academic/students/${row.original.id}`}
              className="font-bold text-slate-900 hover:text-blue-600 transition-colors"
              onClick={(event) => event.stopPropagation()}
            >
              {row.original.name || 'Unknown'}
            </Link>
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-tighter">APP-REF-{row.original.id}</span>
          </div>
        </div>
      ) 
    },
    {
      id: 'program',
      header: 'Program Applied',
      cell: ({ row }) => (
        <span className="text-sm font-bold text-slate-700">{row.original.program?.name || 'Manual Entry'}</span>
      )
    },
    { 
      accessorKey: 'status', 
      header: 'Student Status',
      cell: ({ row }) => {
        const { status, enrollStatus } = row.original;
        const isFinance = status === 'FINANCE_PENDING' || enrollStatus === 'pending_finance';
        const displayStatus = isFinance 
          ? 'PENDING FOR FINANCE APPROVAL' 
          : (status?.replace(/_/g, ' ') || enrollStatus?.replace(/_/g, ' ') || 'PENDING REVIEW');

        return (
          <span className={`${isFinance ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-amber-50 border-amber-200 text-amber-700'} text-[9px] px-2 py-1 rounded-lg font-black uppercase tracking-widest whitespace-nowrap`}>
            {displayStatus}
          </span>
        );
      }
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
        <div className="flex items-center gap-2">
          <button 
            onClick={() => {
              setSelectedStudent(row.original);
              setIsRoadmapModalOpen(true);
            }}
            className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
            title="Track Lifecycle Roadmap"
          >
            <Activity className="w-4 h-4" />
          </button>
          <button 
            onClick={() => openReviewModal(row.original)}
            className={`flex items-center gap-2 ${isReadOnly ? 'bg-white border border-slate-200 text-slate-600' : 'bg-slate-900 text-white'} px-4 py-2 rounded-xl text-xs font-black hover:bg-slate-800 hover:text-white transition-all active:scale-95 shadow-lg shadow-slate-900/10`}
          >
            {isReadOnly ? <Eye className="w-3.5 h-3.5 text-blue-600" /> : <Search className="w-3.5 h-3.5" />}
            <span>{isReadOnly ? 'View Details' : 'Conduct Review'}</span>
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="p-2 space-y-6 flex flex-col h-[calc(100vh-8rem)]">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white px-6 py-5 rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50 gap-6 shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center text-white shadow-lg shadow-slate-900/20 shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight leading-tight mb-0.5">Student status</h1>
            <p className="text-slate-500 font-medium text-sm">Institutional Assessment: Verify academic credentials before financial activation.</p>
          </div>
        </div>
      </div>

      <div className="flex bg-slate-100/50 p-1 rounded-2xl border border-slate-200 w-fit">
           {[
             { id: 'pending', name: 'Pending', icon: Clock },
             { id: 'finance', name: 'Finance Pending', icon: Briefcase },
             { id: 'approved', name: 'Approved', icon: CheckCircle2 },
             { id: 'rejected', name: 'Rejected', icon: XCircle }
           ].map(tab => (
             <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as 'pending' | 'finance' | 'approved' | 'rejected');
                  setSearchParams({ tab: tab.id });
                }}
                className={`
                  flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-200
                  ${activeTab === tab.id 
                    ? 'bg-white text-indigo-600 shadow-lg shadow-indigo-900/20 ring-1 ring-slate-200'
                    : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'}
                `}
             >
                <tab.icon className={`w-3.5 h-3.5 ${activeTab === tab.id ? 'text-indigo-600' : 'text-slate-400'}`} />
                {tab.name}
                <span className={`static ml-1 px-1.5 py-0.5 rounded-md text-[9px] ${activeTab === tab.id ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-200 text-slate-600'}`}>
                  {counts[tab.id as keyof typeof counts] || 0}
                </span>
             </button>
           ))}
        </div>

      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
        <DataTable
          columns={columns}
          data={students}
          pageSize={10} 
          isLoading={isLoading} 
          searchKey="name" 
          searchPlaceholder="Search active eligibility tickets..." 
        />
      </div>

      <Modal
        isOpen={isRoadmapModalOpen}
        onClose={() => setIsRoadmapModalOpen(false)}
        title="Enrollment Lifecycle Roadmap"
      >
        {selectedStudent && (
          <div className="p-6 space-y-10">
            <div className="flex items-center gap-4 border-b border-slate-100 pb-6">
               <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/20">
                  <UserCircle2 className="w-6 h-6" />
               </div>
               <div>
                  <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">{selectedStudent.name}</h3>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Registry ID: APP-REF-{selectedStudent.id}</p>
               </div>
            </div>

            <div className="flex justify-between items-start px-4">
              {[
                { label: 'Application', status: 'DRAFT', completedStatus: ['PENDING_REVIEW', 'OPS_APPROVED', 'FINANCE_PENDING', 'FINANCE_APPROVED', 'ENROLLED'] },
                { label: 'Academic Review', status: 'PENDING_REVIEW', completedStatus: ['OPS_APPROVED', 'FINANCE_PENDING', 'FINANCE_APPROVED', 'ENROLLED'] },
                { label: 'Finance Clearance', status: 'FINANCE_PENDING', completedStatus: ['FINANCE_APPROVED', 'ENROLLED'] },
                { label: 'Enrollment', status: 'FINANCE_APPROVED', completedStatus: ['ENROLLED'] }
              ].map((milestone, idx, arr) => {
                const isCompleted = milestone.completedStatus.includes(selectedStudent.status);
                const isActive = selectedStudent.status === milestone.status;

                return (
                  <div key={idx} className="flex-1 relative flex flex-col items-center">
                    {idx < arr.length - 1 && (
                       <div className={`absolute top-5 left-1/2 w-full h-1 ${isCompleted ? 'bg-indigo-600' : 'bg-slate-200'}`} />
                    )}
                    <div className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center border-4 transition-all ${
                      isCompleted 
                        ? 'bg-indigo-600 border-indigo-100 text-white shadow-lg shadow-indigo-600/20' 
                        : isActive 
                          ? 'bg-white border-indigo-500 text-indigo-600 shadow-xl' 
                          : 'bg-white border-slate-200 text-slate-300'
                    }`}>
                      {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : <div className={`w-2.5 h-2.5 rounded-full ${isActive ? 'bg-indigo-600 animate-pulse' : 'bg-slate-200'}`} />}
                    </div>
                    <p className={`mt-3 text-[9px] font-black uppercase tracking-widest text-center ${isActive || isCompleted ? 'text-slate-900' : 'text-slate-400'}`}>
                      {milestone.label}
                    </p>
                  </div>
                );
              })}
            </div>

                <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Current Governance Desk</p>
                <span className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-[9px] font-black text-indigo-600 uppercase tracking-widest">
                   {selectedStudent.reviewStage || 'INITIAL ASSESSMENT'}
                </span>
              </div>
              <div className="flex items-center gap-3">
                 <Clock className="w-4 h-4 text-slate-400" />
                 <p className="text-xs font-bold text-slate-600 italic">
                    {selectedStudent.status === 'ENROLLED' ? 'Individual record fully sanctioned by Institutional Desk' : 'Record is currently undergoing stage-based institutional verification'}
                 </p>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-100">
              <button onClick={() => setIsRoadmapModalOpen(false)} className="px-8 py-3 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-slate-800 transition-all active:scale-95">
                Close Tracker
              </button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        title={`Academic Appraisal HUD: ${selectedStudent?.name}`}
      >
        <div className="flex flex-col h-full">
            <div className="space-y-6 p-2 overflow-y-auto max-h-[60vh] custom-scrollbar mb-6">
                {/* Qualification HUD */}
                <div className="bg-slate-900 p-6 rounded-3xl shadow-xl shadow-slate-900/20">
                    <div className="flex items-center gap-3 mb-4">
                        <UserCircle2 className="text-amber-400 w-5 h-5" />
                        <h3 className="text-white font-black text-sm uppercase tracking-widest">Candidacy Telemetry</h3>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-white/10 p-4 rounded-2xl border border-white/5 flex flex-col justify-center min-h-[80px]">
                            <p className="text-[10px] font-bold text-white/40 uppercase mb-1">{selectedStudent?.marks?.lastExam || 'Qualification'}</p>
                            <p className="text-lg font-black text-white">{selectedStudent?.marks?.lastExamScore || 'N/A'}%</p>
                        </div>
                        <div className="bg-white/10 p-4 rounded-2xl border border-white/5 flex flex-col justify-center min-h-[80px]">
                            <p className="text-[10px] font-bold text-white/40 uppercase mb-1">Academic Result</p>
                            <p className="text-lg font-black text-white">{selectedStudent?.marks?.lastExamScore ? 'PASSED' : 'N/A'}</p>
                        </div>
                        <div className="bg-white/10 p-4 rounded-2xl border border-white/5 flex flex-col justify-center min-h-[80px]">
                            <p className="text-[10px] font-bold text-white/40 uppercase mb-1">Assigned Unit</p>
                            <p className="text-lg font-black text-white">{selectedStudent?.subDepartment?.name || 'GEN-ADMIN'}</p>
                        </div>
                        <div className="bg-white/10 p-4 rounded-2xl border border-white/5 flex flex-col justify-center min-h-[80px]">
                            <p className="text-[10px] font-bold text-white/40 uppercase mb-1">Status</p>
                            <p className="text-[11px] font-bold text-amber-400 uppercase leading-tight">
                                {selectedStudent?.status === 'ENROLLED' ? 'Enrolled' :
                                 selectedStudent?.reviewStage === 'SUB_DEPT' ? 'Stage-1 Review' :
                                 selectedStudent?.reviewStage === 'OPS' ? 'Institutional Review' :
                                 selectedStudent?.reviewStage === 'FINANCE' ? 'Finance Clearance' : 'Eligibility Check'}
                            </p>
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
                            <p className="text-[10px] text-slate-500 font-medium tracking-tighter">
                                {((selectedStudent?.documents?.length || 0) + (selectedStudent?.marks?.marksProof ? 1 : 0))} verified PDF attachments.
                            </p>
                        </div>
                    </div>
                    <div className="flex flex-col gap-2">
                        {selectedStudent?.marks?.marksProof && (
                            <a 
                                href={selectedStudent.marks.marksProof.startsWith('http') ? selectedStudent.marks.marksProof : `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}${selectedStudent.marks.marksProof}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-2 rounded-xl text-[10px] font-black hover:bg-blue-100 transition-all active:scale-95 shadow-sm flex items-center gap-2 whitespace-nowrap"
                            >
                                <FileText className="w-3 h-3" />
                                ACADEMIC CERTIFICATE
                            </a>
                        )}
                        {selectedStudent?.documents?.map((doc, idx) => (
                            <a 
                                key={idx}
                                href={doc.path.startsWith('http') ? doc.path : `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}${doc.path}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="bg-white border border-slate-200 px-4 py-2 rounded-xl text-[10px] font-bold hover:bg-slate-50 transition-all active:scale-95 shadow-sm flex items-center gap-2 whitespace-nowrap uppercase italic"
                            >
                                <FileText className="w-3 h-3 text-blue-500" />
                                {doc.name}
                            </a>
                        )) || (!selectedStudent?.marks?.marksProof && (
                            <button disabled className="bg-slate-200 text-slate-400 px-4 py-2 rounded-xl text-xs font-bold cursor-not-allowed">
                                None
                            </button>
                        ))}
                    </div>
                </div>

                {activeTab === 'finance' && (
                    <div className="border border-slate-200 rounded-3xl p-6 bg-white">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                                <FileText className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-slate-900 uppercase tracking-tight">Operations Remarks</p>
                                <p className="text-[10px] text-slate-500 font-medium tracking-widest uppercase">Transferred to finance with the following note</p>
                            </div>
                        </div>
                        <div className="min-h-[96px] rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                            <p className="text-sm font-medium text-slate-700 leading-relaxed whitespace-pre-wrap">
                                {selectedStudent?.remarks?.trim() || 'No operations remarks were recorded before finance transfer.'}
                            </p>
                        </div>
                    </div>
                )}

                {!isReadOnly && (
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
                            <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">
                                Appraisal Remarks <span className="text-red-500 font-black ml-1">(Required)</span>
                            </label>
                            <textarea 
                                value={remarks}
                                onChange={(e) => setRemarks(e.target.value)}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900 transition-all font-bold text-slate-900"
                                rows={3}
                                placeholder="Criteria synthesis or rejection context..."
                            />
                        </div>
                    </div>
                )}
            </div>

            {!isReadOnly ? (
                <div className="pt-6 border-t border-slate-100 flex flex-col md:flex-row gap-3">
                    <button 
                        onClick={handleReject}
                        disabled={!rejectionReason || !remarks.trim()}
                        className="flex-1 flex items-center justify-center gap-2 px-6 py-3 text-red-600 font-black hover:bg-red-50 rounded-xl transition-all active:scale-95 disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed text-xs uppercase tracking-widest border border-red-100"
                    >
                        <XCircle className="w-4 h-4" />
                        Issue Rejection
                    </button>
                    <button
                        onClick={handleRequestCorrection}
                        disabled={!remarks.trim()}
                        className="flex-1 flex items-center justify-center gap-2 px-6 py-3 text-amber-700 font-black hover:bg-amber-50 rounded-xl transition-all active:scale-95 disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed text-xs uppercase tracking-widest border border-amber-200 bg-amber-50/60"
                    >
                        <FileText className="w-4 h-4" />
                        Request Correction
                    </button>
                    <button 
                        onClick={handleApprove}
                        disabled={!remarks.trim()}
                        className="flex-[2] flex items-center justify-center gap-2 px-8 py-3 bg-slate-900 text-white rounded-xl font-black hover:bg-slate-800 transition-all active:scale-95 disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed shadow-xl shadow-slate-900/20 text-xs uppercase tracking-widest"
                    >
                        <CheckCircle2 className="w-4 h-4" />
                        Verify & Transfer to Finance
                    </button>
                </div>
            ) : (
                <div className="pt-6 border-t border-slate-100 flex justify-end">
                    <button 
                        onClick={() => setIsReviewModalOpen(false)}
                        className="px-8 py-3 bg-slate-100 text-slate-600 rounded-xl font-black hover:bg-slate-200 transition-all active:scale-95 text-xs uppercase tracking-widest"
                    >
                        Close View
                    </button>
                </div>
            )}
        </div>
      </Modal>
    </div>
  );
}
