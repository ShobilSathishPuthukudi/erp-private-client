import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { DataTable } from '@/components/shared/DataTable';
import type { ColumnDef } from '@tanstack/react-table';
import { CheckCircle, Clock, XCircle, FileText } from 'lucide-react';
import { RemarkModal } from '@/components/shared/RemarkModal';
import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/shared/PageHeader';
import toast from 'react-hot-toast';

interface Student {
  id: number;
  name: string;
  enrollStatus: string;
  program?: { name: string };
  center?: { name: string };
  verificationLogs?: any[];
  remarks?: string;
}

export default function AdmissionQueue() {
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRemarkModalOpen, setIsRemarkModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [pendingStatus, setPendingStatus] = useState<'approved' | 'rejected'>('approved');

  const fetchQueue = async () => {
    try {
      setIsLoading(true);
      // We fetch all students, but filter for pending_finance in the UI or backend
      const res = await api.get('/academic/students'); 
      setStudents(res.data.filter((s: any) => s.enrollStatus === 'pending_finance'));
    } catch (error) {
      toast.error('Failed to load admission queue');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, []);

  const openVerifyModal = (student: Student, status: 'approved' | 'rejected') => {
    setSelectedStudent(student);
    setPendingStatus(status);
    setIsRemarkModalOpen(true);
  };

  const handleVerify = async (remarks: string) => {
    try {
      await api.put(`/finance/students/${selectedStudent?.id}/verify-fee`, { status: pendingStatus, remarks });
      toast.success(`Finance audit ${pendingStatus} successfully`);
      setIsRemarkModalOpen(false);
      fetchQueue();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Verification protocol failure');
    }
  };

  const columns: ColumnDef<Student>[] = [
    { accessorKey: 'id', header: 'UID', cell: ({ row }) => <Link to={`/dashboard/finance/students/${row.original.id}`} className="font-mono text-blue-600 hover:underline text-xs">STU-{row.original.id}</Link> },
    { accessorKey: 'name', header: 'Student Identity', cell: ({ row }) => <Link to={`/dashboard/finance/students/${row.original.id}`} className="font-bold text-slate-900 hover:text-blue-600 transition-colors">{row.original.name}</Link> },
    { id: 'program', header: 'Academic Program', cell: ({ row }) => row.original.program?.name },
    { id: 'center', header: 'Source Center', cell: ({ row }) => row.original.center?.name },
    {
      id: 'actions',
      header: 'Audit Protocol',
      cell: ({ row }) => (
        <div className="flex gap-2">
            <button 
                onClick={() => openVerifyModal(row.original, 'approved')}
                className="flex items-center gap-2 bg-slate-900 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-slate-800 transition-colors shadow-sm"
            >
                <CheckCircle className="w-3 h-3" />
                <span>Verify</span>
            </button>
            <button 
                onClick={() => openVerifyModal(row.original, 'rejected')}
                className="flex items-center gap-2 bg-red-50 text-red-600 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-red-100 transition-colors"
            >
                <XCircle className="w-3 h-3" />
            </button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-2">
      <PageHeader 
        title="Finance Admission Queue (Step 4/5)"
        description="Perform final financial verification on student fee proofs for institutional activation."
        icon={CheckCircle}
      />

      <DataTable columns={columns} data={students} isLoading={isLoading} searchKey="name" />

      <RemarkModal 
        isOpen={isRemarkModalOpen}
        onClose={() => setIsRemarkModalOpen(false)}
        onConfirm={handleVerify}
        title={`Institutional Audit: ${selectedStudent?.name}`}
        actionLabel={pendingStatus === 'approved' ? 'Verify & Activate' : 'Reject Fee Proof'}
      />
    </div>
  );
}
