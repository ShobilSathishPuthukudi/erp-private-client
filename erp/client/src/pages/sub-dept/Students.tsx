import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { DataTable } from '@/components/shared/DataTable';
import { Modal } from '@/components/shared/Modal';
import type { ColumnDef } from '@tanstack/react-table';
import { ShieldCheck, XCircle, FileText, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

interface Student {
  id: number;
  name: string;
  enrollStatus: string;
  feeStatus: string;
  program?: { name: string, duration: number };
  department?: { name: string }; // Study center
  verificationLogs?: any[];
  remarks?: string;
}

export default function Students() {
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [remarks, setRemarks] = useState('');

  const fetchStudents = async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/sub-dept/students');
      setStudents(res.data);
    } catch (error) {
      toast.error('Failed to fetch students');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const openVerifyModal = (student: Student) => {
    setSelectedStudent(student);
    setRemarks('');
    setIsModalOpen(true);
  };

  const handleVerify = async (status: 'approved' | 'rejected') => {
    try {
      await api.put(`/sub-dept/students/${selectedStudent?.id}/verify-documents`, { status, remarks });
      toast.success(`Verification ${status} successfully`);
      setIsModalOpen(false);
      fetchStudents();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Verification protocol failure');
    }
  };

  const columns: ColumnDef<Student>[] = [
    { accessorKey: 'id', header: 'Student ID' },
    { 
      accessorKey: 'name', 
      header: 'Full Name',
      cell: ({ row }) => <span className="font-semibold text-slate-900">{row.original.name}</span>
    },
    { 
      id: 'program', 
      header: 'Enrolled Program',
      cell: ({ row }) => row.original.program?.name || <span className="text-slate-400 italic">Unknown</span>
    },
    { 
      id: 'center', 
      header: 'Study Center',
      cell: ({ row }) => row.original.department?.name || <span className="text-slate-400 italic">Unassigned</span>
    },
    { 
      accessorKey: 'enrollStatus', 
      header: 'Enrollment Status',
      cell: ({ row }) => {
        const s = row.original.enrollStatus;
        let color = 'bg-slate-100 text-slate-700';
        if (s === 'active') color = 'bg-green-100 text-green-700';
        if (s === 'graduated') color = 'bg-blue-100 text-blue-700';
        if (s === 'dropped') color = 'bg-red-100 text-red-700';
        return <span className={`px-2 py-1 text-[10px] rounded-full font-bold uppercase ${color}`}>{s}</span>;
      }
    },
    { 
      accessorKey: 'feeStatus', 
      header: 'Fee Status',
      cell: ({ row }) => {
        const s = row.original.feeStatus;
        return (
          <span className={`px-2 py-1 text-[10px] rounded-sm uppercase font-bold ${s === 'verified' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            {s}
          </span>
        );
      }
    },
    {
      id: 'actions',
      header: 'Institutional Audit',
      cell: ({ row }) => {
        const s = row.original.enrollStatus;
        if (s === 'pending_subdept') {
            return (
                <button 
                    onClick={() => openVerifyModal(row.original)}
                    className="flex items-center gap-2 bg-slate-900 text-white px-3 py-1 rounded-lg text-xs font-bold hover:bg-slate-800 transition-colors"
                >
                    <ShieldCheck className="w-3 h-3" />
                    <span>Verify Docs</span>
                </button>
            );
        }
        return <span className="text-[10px] font-bold text-slate-400 uppercase italic">Queue: {s.split('_')[1] || s}</span>;
      }
    }
  ];

  return (
    <div className="space-y-6 flex flex-col h-[calc(100vh-8rem)]">
      <div className="flex justify-between items-center shrink-0">
        <div>
           <h1 className="text-2xl font-bold text-slate-900">Enrolled Students</h1>
           <p className="text-slate-500">Monitor all students actively enrolled within your sub-department's curriculum</p>
        </div>
      </div>

      <div className="flex-1 min-h-0 bg-white shadow-sm border border-slate-200 rounded-lg flex flex-col">
        <DataTable 
          columns={columns} 
          data={students} 
          isLoading={isLoading} 
          searchKey="name" 
          searchPlaceholder="Search students..." 
        />
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={`Institutional Document Verification: ${selectedStudent?.name}`}
      >
        <div className="space-y-6">
            <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 flex items-start gap-3">
                <FileText className="w-5 h-5 text-amber-600 mt-0.5" />
                <div className="text-xs text-amber-800 leading-relaxed">
                    <p className="font-bold uppercase mb-1">Audit Requirement</p>
                    Please verify that the academic credentials submitted by the Study Center match the program criteria for <b>{selectedStudent?.program?.name}</b>.
                </div>
            </div>

            <div>
                <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-tighter">Verification Remarks</label>
                <textarea 
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    rows={3}
                    placeholder="Document authenticity confirmed..."
                />
            </div>

            <div className="pt-6 border-t border-slate-100 flex justify-end gap-3">
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
                    Approve Documents
                </button>
            </div>
        </div>
      </Modal>
    </div>
  );
}
