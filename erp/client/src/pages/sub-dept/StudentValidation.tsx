import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '@/lib/api';
const MapPin = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
);

import { 
  Users, 
  CheckCircle2, 
  XCircle, 
  Eye,
  FileText,
  Building2,
  GraduationCap,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import { DataTable } from '@/components/shared/DataTable';
import type { ColumnDef } from '@tanstack/react-table';

interface Student {
  id: number;
  name: string;
  enrollStatus: string;
  status: string;
  program?: { name: string };
  session?: { name: string };
  center?: { id: number, name: string };
  documents?: any;
  lastRejectionReason?: string;
  reviewedAt?: string;
  marks?: {
    lastExam: string;
    lastExamScore: string;
    marksProof?: string;
  };
}

export default function StudentValidation() {
  const { unit } = useParams();
  const [activeTab, setActiveTab] = useState<'PENDING' | 'VALIDATED' | 'APPROVED' | 'REJECTED'>('PENDING');
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  const fetchStudents = async () => {
    try {
      setIsLoading(true);
      const endpoint = 
        activeTab === 'PENDING' ? 'pending' : 
        activeTab === 'VALIDATED' ? 'validated' :
        activeTab === 'APPROVED' ? 'approved' : 'rejected';
      const res = await api.get(`/sub-dept/students/${endpoint}`);
      setStudents(res.data);
    } catch (error) {
      toast.error(`Failed to load ${activeTab.toLowerCase()} students`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, [activeTab, unit]);

  const handleApprove = async (id: number) => {
    try {
      await api.post(`/sub-dept/students/${id}/approve`);
      toast.success('Application approved and routed to Finance');
      setIsReviewOpen(false);
      fetchStudents();
    } catch (error) {
      toast.error('Approval protocol failed');
    }
  };

  const handleReject = async (id: number) => {
    if (!rejectionReason) {
      toast.error('Please provide a mandatory rejection reason');
      return;
    }
    try {
      await api.post(`/sub-dept/students/${id}/reject`, { reason: rejectionReason });
      toast.success('Application rejected');
      setIsReviewOpen(false);
      setRejectionReason('');
      fetchStudents();
    } catch (error) {
      toast.error('Rejection protocol failed');
    }
  };

  const columns: ColumnDef<Student>[] = [
    {
      accessorKey: 'name',
      header: 'Student Identity',
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-bold text-slate-900 uppercase tracking-tight">{row.original.name}</span>
          <span className="text-[10px] font-mono text-slate-400 uppercase">ID: ARCH-{row.original.id}</span>
        </div>
      )
    },
    {
      accessorKey: 'center.name',
      header: 'Origin Center',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Building2 className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-xs font-medium text-slate-600 truncate max-w-[150px]">
            {row.original.center?.name || 'Unknown Center'}
          </span>
        </div>
      )
    },
    {
      id: 'program', 
      header: 'Academic Context',
      cell: ({ row }) => (
         <div className="flex flex-col">
            <div className="flex items-center gap-2">
                <GraduationCap className="w-3.5 h-3.5 text-blue-500" />
                <span className="text-xs font-bold text-slate-700 truncate max-w-[200px]">
                    {row.original.program?.name}
                </span>
            </div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1 ml-5">
                Batch: {row.original.session?.name || 'Manual Intake'}
            </span>
         </div>
      )
    },
    {
      id: 'docs',
      header: 'Documents',
      cell: ({ row }) => {
        const docCount = row.original.documents ? Object.keys(row.original.documents).length : 0;
        return (
          <div className="flex items-center gap-1.5">
            <FileText className={`w-4 h-4 ${docCount > 0 ? 'text-blue-500' : 'text-slate-200'}`} />
            <span className="text-[10px] font-black">{docCount} Files</span>
          </div>
        );
      }
    },
    {
      id: 'actions',
      header: 'Execution',
      cell: ({ row }) => (
        <button 
          onClick={() => {
            setSelectedStudent(row.original);
            setIsReviewOpen(true);
          }}
          className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 text-slate-900 rounded-xl text-xs font-black hover:bg-slate-50 transition-all active:scale-95"
        >
          <Eye className="w-3.5 h-3.5 text-blue-600" />
          {activeTab === 'PENDING' ? 'Review & Validate' : 'View Details'}
        </button>
      )
    }
  ];

  return (
    <div className="p-8 space-y-8 max-w-[1600px] mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tighter flex items-center gap-3">
            <Users className="w-8 h-8 text-blue-600" />
            Student <span className="text-blue-600 font-outline-1">Validation</span> Hub
          </h1>
          <p className="text-slate-500 font-medium tracking-tight">Multi-stage review and routing terminal for institutional admissions.</p>
        </div>

        <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
          <button 
            onClick={() => setActiveTab('PENDING')}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
              activeTab === 'PENDING' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Pending
          </button>
          <button 
            onClick={() => setActiveTab('VALIDATED')}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
              activeTab === 'VALIDATED' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Validated
          </button>
          <button 
            onClick={() => setActiveTab('APPROVED')}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
              activeTab === 'APPROVED' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Approved
          </button>
          <button 
            onClick={() => setActiveTab('REJECTED')}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
              activeTab === 'REJECTED' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Rejected
          </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden">
        <DataTable 
          columns={columns} 
          data={students} 
          isLoading={isLoading} 
          searchKey="name"
          searchPlaceholder="Filter students by identity..."
        />
      </div>

      {/* Review Modal */}
      {isReviewOpen && selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-4xl rounded-[3rem] shadow-2xl overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200">
            <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Application Validation</h2>
                <p className="text-slate-500 text-sm font-medium uppercase tracking-widest">
                  Stage: {activeTab === 'PENDING' ? 'Sub-Departmental Review' : activeTab.charAt(0) + activeTab.slice(1).toLowerCase()}
                </p>
              </div>
              <button onClick={() => setIsReviewOpen(false)} className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-900 transition-colors shadow-sm">
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-12 overflow-y-auto max-h-[70vh]">
              <div className="space-y-8">
                <section>
                  <h3 className="text-[10px] font-black uppercase text-blue-600 mb-4 tracking-widest flex items-center gap-2">
                    <ShieldCheck className="w-3 h-3" />
                    Identity & Background
                  </h3>
                  <div className="bg-slate-50 rounded-2xl p-6 space-y-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Full Identity Name</label>
                      <p className="text-lg font-black text-slate-900 uppercase">{selectedStudent.name}</p>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Internal Reference</label>
                      <p className="font-mono text-sm text-slate-600">ARCH-{selectedStudent.id}</p>
                    </div>
                  </div>
                </section>

                <section>
                  <h3 className="text-[10px] font-black uppercase text-blue-600 mb-4 tracking-widest flex items-center gap-2">
                    <MapPin className="w-3 h-3 text-blue-600" />
                    Institutional Context
                  </h3>
                  <div className="bg-slate-50 rounded-2xl p-6 space-y-6">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-blue-600 shadow-sm">
                        <Building2 className="w-5 h-5" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase">Originating Study Center</label>
                        <p className="font-black text-slate-800 uppercase text-sm">{selectedStudent.center?.name}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-emerald-600 shadow-sm">
                        <GraduationCap className="w-5 h-5" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase">Academic Program</label>
                        <p className="font-black text-slate-800 uppercase text-sm">{selectedStudent.program?.name}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-indigo-600 shadow-sm">
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase">Enrollment Intake</label>
                        <p className="font-black text-slate-800 uppercase text-sm">{selectedStudent.session?.name || 'Institutional Batch'}</p>
                      </div>
                    </div>
                  </div>
                </section>
              </div>

              <div className="space-y-8">
                <section>
                  <h3 className="text-[10px] font-black uppercase text-blue-600 mb-4 tracking-widest flex items-center gap-2">
                    <FileText className="w-3 h-3" />
                    Document Verification
                  </h3>
                  <div className="grid grid-cols-1 gap-3">
                    {/* Academic Proof */}
                    {selectedStudent.marks?.marksProof && (
                      <a 
                        href={selectedStudent.marks.marksProof}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-2xl hover:border-blue-500 hover:shadow-lg transition-all group"
                      >
                        <div className="flex items-center gap-3">
                          <CheckCircle2 className="w-4 h-4 text-blue-500" />
                          <div className="flex flex-col">
                            <span className="text-xs font-black uppercase text-blue-700">Academic Certificate</span>
                            <span className="text-[9px] font-bold text-blue-400 uppercase tracking-tighter">Verified Proof of {selectedStudent.marks.lastExam}</span>
                          </div>
                        </div>
                        <Eye className="w-4 h-4 text-blue-300 group-hover:text-blue-600" />
                      </a>
                    )}

                    {selectedStudent.documents ? Object.entries(selectedStudent.documents).map(([key, value]: any) => (
                      <a 
                        key={key}
                        href={value}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-2xl hover:border-blue-500 hover:shadow-lg transition-all"
                      >
                        <div className="flex items-center gap-3">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                          <span className="text-xs font-black uppercase text-slate-700">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                        </div>
                        <Eye className="w-4 h-4 text-slate-400" />
                      </a>
                    )) : !selectedStudent.marks?.marksProof && (
                      <div className="p-10 border border-dashed border-slate-200 rounded-3xl text-center space-y-3">
                         <AlertCircle className="w-8 h-8 text-slate-200 mx-auto" />
                         <p className="text-xs font-bold text-slate-400 uppercase">No verification documents uploaded</p>
                      </div>
                    )}
                  </div>
                </section>

                {activeTab === 'PENDING' && (
                  <section className="bg-slate-900 rounded-[2rem] p-8 text-white space-y-6 shadow-2xl shadow-slate-900/40">
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-widest mb-4 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-blue-400" />
                        Final Validation Decision
                      </h4>
                      <textarea 
                        placeholder="Provide mandatory reason for rejection..."
                        className="w-full h-32 bg-slate-800 border-none rounded-2xl p-4 text-sm text-slate-300 placeholder-slate-500 outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none"
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <button 
                        onClick={() => handleReject(selectedStudent.id)}
                        className="flex items-center justify-center gap-2 py-4 bg-white/5 border border-white/10 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-rose-600 transition-all"
                      >
                        <XCircle className="w-4 h-4" />
                        Reject App.
                      </button>
                      <button 
                        onClick={() => handleApprove(selectedStudent.id)}
                        className="flex items-center justify-center gap-2 py-4 bg-blue-600 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-blue-500 transition-all shadow-lg shadow-blue-600/30"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        Approve & Route
                      </button>
                    </div>
                  </section>
                )}

                {activeTab === 'REJECTED' && (
                   <section className="bg-rose-50 border border-rose-100 rounded-[2rem] p-8 space-y-4">
                      <h4 className="text-[10px] font-black uppercase text-rose-600 tracking-widest">Rejection Logic History</h4>
                      <p className="text-sm font-medium text-slate-700 italic">"{selectedStudent.lastRejectionReason || 'No reason provided'}"</p>
                      <div className="pt-4 border-t border-rose-200">
                         <p className="text-[9px] font-black text-rose-400 uppercase tracking-tight">Reviewed on: {selectedStudent.reviewedAt ? new Date(selectedStudent.reviewedAt).toLocaleDateString() : 'N/A'}</p>
                      </div>
                   </section>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
