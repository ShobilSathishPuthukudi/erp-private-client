import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { DataTable } from '@/components/shared/DataTable';
import { Modal } from '@/components/shared/Modal';
import type { ColumnDef } from '@tanstack/react-table';
import { FileEdit, ShieldCheck, CheckCircle, XCircle, FileText } from 'lucide-react';
import toast from 'react-hot-toast';

interface Student {
  id: number;
  name: string;
  enrollStatus: string;
  feeStatus: string;
  marks: any;
  program?: { name: string };
  verificationLogs?: any[];
}

export default function Students() {
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  
  // JSON form states
  const [subjectInput, setSubjectInput] = useState('');
  const [gradeInput, setGradeInput] = useState('');
  const [currentMarks, setCurrentMarks] = useState<any>({});
  const [enrollStatus, setEnrollStatus] = useState('');
  const [remarks, setRemarks] = useState('');

  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/academic/students');
      setStudents(res.data);
    } catch (error) {
      toast.error('Failed to parse global student roster');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openGradeModal = (student: Student) => {
    setEditingStudent(student);
    setCurrentMarks(student.marks || {});
    setEnrollStatus(student.enrollStatus || 'enrolled');
    setSubjectInput('');
    setGradeInput('');
    setIsModalOpen(true);
  };

  const handleAddGrade = () => {
    if (!subjectInput.trim() || !gradeInput.trim()) return;
    setCurrentMarks(prev => ({
      ...prev,
      [subjectInput]: gradeInput
    }));
    setSubjectInput('');
    setGradeInput('');
  };

  const handleRemoveGrade = (subject: string) => {
    setCurrentMarks(prev => {
      const copy = { ...prev };
      delete copy[subject];
      return copy;
    });
  };

  const openVerifyModal = (student: Student) => {
    setEditingStudent(student);
    setRemarks('');
    setIsVerifyModalOpen(true);
  };

  const handleVerify = async (status: 'approved' | 'rejected') => {
    try {
      await api.put(`/academic/students/${editingStudent?.id}/verify-eligibility`, { status, remarks });
      toast.success(`Institutional eligibility ${status} successfully`);
      setIsVerifyModalOpen(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Verification protocol failure');
    }
  };

  const saveMarks = async () => {
    if (!editingStudent) return;
    try {
      await api.put(`/academic/students/${editingStudent.id}/marks`, {
        marks: currentMarks,
        enrollStatus
      });
      toast.success('Academic transcript securely logged.');
      setIsModalOpen(false);
      fetchData();
    } catch (error) {
      toast.error('Failed to commit marks to ERP engine');
    }
  };

  const columns: ColumnDef<Student>[] = [
    { accessorKey: 'id', header: 'SID', cell: ({ row }) => <span className="font-mono text-slate-500">S-{row.original.id}</span> },
    { accessorKey: 'name', header: 'Student Identity', cell: ({ row }) => <span className="font-semibold text-slate-900">{row.original.name}</span> },
    { 
      id: 'program', 
      header: 'Enrolled Track', 
      cell: ({ row }) => (
        <span className="text-slate-700 bg-slate-100 px-2 py-1 text-xs rounded border border-slate-200">
          {row.original.program?.name || 'Unassigned Core'}
        </span>
      )
    },
    { 
      accessorKey: 'enrollStatus', 
      header: 'Academic Status', 
      cell: ({ row }) => {
        const s = row.original.enrollStatus;
        return (
          <span className={`uppercase font-bold text-[10px] tracking-widest px-2 py-1 rounded-full ${s === 'graduated' ? 'bg-green-100 text-green-700' : s === 'failed' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
            {s}
          </span>
        );
      }
    },
    { accessorKey: 'feeStatus', header: 'Financial Clear', cell: ({ row }) => <span className="uppercase text-[10px] text-slate-500 font-bold">{row.original.feeStatus}</span> },
    {
      id: 'grades',
      header: 'Recorded Marks',
      cell: ({ row }) => {
        const m = row.original.marks || {};
        const count = Object.keys(m).length;
        if (count === 0) return <span className="text-xs text-slate-400 italic">No Data</span>;
        return <span className="text-xs font-semibold text-indigo-700 bg-indigo-50 px-2 py-1 rounded border border-indigo-100">{count} Courses Graded</span>;
      }
    },
    {
      id: 'actions',
      header: 'Audit Control',
      cell: ({ row }) => {
        const s = row.original.enrollStatus;
        const item = row.original;
        
        if (s === 'pending_eligibility') {
            return (
                <button 
                    onClick={() => openVerifyModal(item)}
                    className="flex items-center gap-2 bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-blue-700 transition-colors shadow-sm"
                >
                    <ShieldCheck className="w-3 h-3" />
                    <span>Eligibility Check</span>
                </button>
            );
        }

        return (
            <button 
              onClick={() => openGradeModal(item)} 
              className="flex items-center space-x-1 text-xs font-semibold text-white bg-slate-900 px-3 py-1.5 rounded-lg shadow-sm hover:bg-slate-800 transition-colors"
            >
              <FileEdit className="w-3 h-3" />
              <span>Review Board</span>
            </button>
        );
      }
    }
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">Student Review Console</h1>
          <p className="text-slate-500 mt-1">Global registry for academic grading, marks serialization, and enrollment status mutations.</p>
        </div>
      </div>

      <DataTable 
        columns={columns} 
        data={students} 
        isLoading={isLoading} 
        searchKey="name" 
        searchPlaceholder="Locate by student legal string..." 
        exportFileName="IITS_Student_Registry"
      />

      <Modal
        isOpen={isVerifyModalOpen}
        onClose={() => setIsVerifyModalOpen(false)}
        title={`Institutional Eligibility Audit: ${editingStudent?.name}`}
      >
        <div className="space-y-6">
            <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100 italic">
                <h4 className="text-xs font-bold text-blue-900 uppercase mb-3 flex items-center gap-2 tracking-widest">
                    <FileText className="w-4 h-4" />
                    Student Credentials
                </h4>
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white p-3 rounded-xl border border-blue-100">
                        <p className="text-[10px] font-bold text-slate-400 uppercase">10th Aggregate</p>
                        <p className="text-lg font-bold text-slate-900">{editingStudent?.marks?.tenth || 'N/A'}%</p>
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-blue-100">
                        <p className="text-[10px] font-bold text-slate-400 uppercase">12th Aggregate</p>
                        <p className="text-lg font-bold text-slate-900">{editingStudent?.marks?.twelfth || 'N/A'}%</p>
                    </div>
                </div>
            </div>

            <div>
                <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-tighter">Academic Review Remarks</label>
                <textarea 
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    rows={3}
                    placeholder="Eligibility criteria matched..."
                />
            </div>

            <div className="pt-6 border-t border-slate-100 flex justify-end gap-3 uppercase">
                <button 
                    onClick={() => handleVerify('rejected')}
                    className="px-4 py-2 text-red-600 font-bold hover:bg-red-50 rounded-xl transition-colors flex items-center gap-2"
                >
                    <XCircle className="w-4 h-4" />
                    Reject
                </button>
                <button 
                    onClick={() => handleVerify('approved')}
                    className="px-8 py-2 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-shadow shadow-lg shadow-slate-200 flex items-center gap-2"
                >
                    <CheckCircle className="w-4 h-4" />
                    Advance to Sub-Dept
                </button>
            </div>
        </div>
      </Modal>
    </div>
  );
}
