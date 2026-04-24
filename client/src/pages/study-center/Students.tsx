import { useState, useEffect, useMemo } from 'react';
import { api } from '@/lib/api';
import { DataTable } from '@/components/shared/DataTable';
import type { ColumnDef } from '@tanstack/react-table';
import { UserPlus, Clock, CheckCircle, Search, Filter, Edit } from 'lucide-react';
import toast from 'react-hot-toast';
import { clsx } from 'clsx';
import { Modal } from '@/components/shared/Modal';
import { PageHeader } from '@/components/shared/PageHeader';
import AdmissionWizard from './AdmissionWizard';
import { Link } from 'react-router-dom';

interface Student {
  id: number;
  name: string;
  status: string;
  enrollStatus?: string;
  invoiceId?: number;
  lastRejectionReason?: string;
  program?: { name: string, duration: number, type: string };
}

const canCenterEditStudent = (student: Student) => {
  const lockedStatuses = ['OPS_APPROVED', 'FINANCE_PENDING', 'PAYMENT_VERIFIED', 'FINANCE_APPROVED', 'ENROLLED'];
  const lockedEnrollStatuses = ['pending_finance', 'rejected'];

  return !lockedStatuses.includes(student.status) && !lockedEnrollStatuses.includes(student.enrollStatus || '');
};

export default function Students() {
  const getApiErrorMessage = (error: unknown, fallback: string) => {
    const apiError = error as { response?: { data?: { error?: string } } };
    return apiError.response?.data?.error || fallback;
  };

  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pending' | 'enrolled'>('pending');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);

  const fetchStudents = async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/portals/study-center/students');
      setStudents(res.data);
    } catch {
      toast.error('Failed to fetch students allocated to this center');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredStudents = useMemo(() => {
    if (activeTab === 'enrolled') {
      return students.filter(s => s.status === 'ENROLLED');
    }
    return students.filter(s => s.status !== 'ENROLLED' && s.status !== 'REJECTED');
  }, [students, activeTab]);

  const handleResubmit = async (student: Student) => {
    try {
      await api.post(`/portals/partner-center/students/${student.id}/submit`);
      toast.success('Student application resubmitted for review');
      fetchStudents();
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'Failed to resubmit student'));
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const columns: ColumnDef<Student>[] = [
    { accessorKey: 'id', header: 'ID' },
    { 
      accessorKey: 'name', 
      header: 'Full name',
      cell: ({ row }) => <Link to={`/dashboard/study-center/students/${row.original.id}`} className="font-semibold text-slate-900 hover:text-blue-600 transition-colors">{row.original.name}</Link>
    },
    { 
      id: 'program', 
      header: 'Program',
      cell: ({ row }) => row.original.program?.name || <span className="text-slate-400 ">Unknown</span>
    },
    { 
      accessorKey: 'status', 
      header: 'Review status',
      cell: ({ row }) => {
        const s = row.original.status;
        let color = 'bg-slate-100 text-slate-700';
        if (s === 'DRAFT') color = 'bg-slate-900 text-white font-black';
        if (s === 'PENDING_REVIEW') color = 'bg-amber-100 text-amber-700 font-bold';
        if (s === 'FINANCE_PENDING') color = 'bg-emerald-50 text-emerald-700 border border-emerald-200';
        if (s === 'OPS_APPROVED') color = 'bg-blue-100 text-blue-700';
        if (s === 'FINANCE_APPROVED') color = 'bg-emerald-100 text-emerald-700';
        if (s === 'ENROLLED') color = 'bg-green-600 text-white';
        if (s === 'REJECTED') color = 'bg-red-100 text-red-700';
        if (row.original.enrollStatus === 'correction_requested') color = 'bg-amber-100 text-amber-800 border border-amber-300';
        return <span className={`px-2 py-1 text-[9px] rounded-full font-black tracking-tighter ${color}`}>
            {row.original.enrollStatus === 'correction_requested'
              ? 'Correction requested'
              : s === 'FINANCE_PENDING'
                ? 'Awaiting finance'
                : s?.replace('_', ' ').toLowerCase()}
        </span>;
      }
    },
    {
      id: 'remarks',
      header: 'Review remarks',
      cell: ({ row }) => (
        <span className="text-xs text-slate-600 line-clamp-2 max-w-[260px]">
          {row.original.lastRejectionReason || 'No pending remarks'}
        </span>
      )
    },
    {
      id: 'type',
      header: 'Type',
      cell: ({ row }) => (
        <span className="text-[10px] font-black tracking-widest text-blue-600 bg-blue-50 px-2 py-1 rounded-md">
          {row.original.program?.type || 'N/A'}
        </span>
      )
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        if (activeTab !== 'pending') return null;

        const canEdit = canCenterEditStudent(row.original);
        const canResubmit = row.original.enrollStatus === 'correction_requested' && row.original.status === 'DRAFT';

        return (
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (!canEdit) return;
                setEditingStudent(row.original);
                setIsModalOpen(true);
              }}
              disabled={!canEdit}
              className={clsx(
                "p-2 rounded-lg transition-all group",
                canEdit
                  ? "hover:bg-blue-50 text-blue-600 active:scale-95"
                  : "text-slate-300 cursor-not-allowed"
              )}
              title={canEdit ? "Edit student data" : "Editing locked after academic operations verification"}
            >
              <Edit className="w-4 h-4 group-hover:scale-110 transition-transform" />
            </button>
            {canResubmit && (
              <button
                onClick={() => handleResubmit(row.original)}
                className="px-3 py-1.5 rounded-lg bg-amber-500 text-white text-[10px] font-black tracking-widest hover:bg-amber-600 transition-all active:scale-95"
                title="Resubmit Student Application"
              >
                Resubmit
              </button>
            )}
          </div>
        );
      }
    }
  ];

  return (
    <div className="p-2 space-y-6 flex flex-col h-[calc(100vh-8rem)]">
      <PageHeader 
        title="Institutional student roster"
        description="Manage and monitor student enrollments for your center"
        icon={UserPlus}
        action={
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-2xl font-black text-xs tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-200 active:scale-95"
          >
            <UserPlus className="w-4 h-4" />
            Add student
          </button>
        }
      />

      <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-xl w-fit shrink-0">
        <button
          onClick={() => setActiveTab('pending')}
          className={clsx(
            "flex items-center gap-3 px-6 py-2 rounded-lg text-xs font-black tracking-widest transition-all",
            activeTab === 'pending' ? "bg-white text-blue-600 shadow-sm border border-slate-100" : "text-slate-500 hover:text-slate-700"
          )}
        >
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Pending admissions
          </div>
          <span className={clsx(
            "px-2 py-0.5 rounded-md text-[10px] font-black",
            activeTab === 'pending' ? "bg-blue-600 text-white shadow-lg shadow-blue-200" : "bg-slate-200 text-slate-500"
          )}>
            {students.filter(s => s.status !== 'ENROLLED' && s.status !== 'REJECTED').length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('enrolled')}
          className={clsx(
            "flex items-center gap-3 px-6 py-2 rounded-lg text-xs font-black tracking-widest transition-all",
            activeTab === 'enrolled' ? "bg-white text-emerald-600 shadow-sm border border-slate-100" : "text-slate-500 hover:text-slate-700"
          )}
        >
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            Enrolled roster
          </div>
          <span className={clsx(
            "px-2 py-0.5 rounded-md text-[10px] font-black",
            activeTab === 'enrolled' ? "bg-emerald-600 text-white shadow-lg shadow-emerald-200" : "bg-slate-200 text-slate-500"
          )}>
            {students.filter(s => s.status === 'ENROLLED').length}
          </span>
        </button>
      </div>

      <div className="flex-1 min-h-0 bg-white shadow-sm border border-slate-200 rounded-2xl flex flex-col overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-white">
            <div className="flex items-center gap-2">
                <div className="p-2 bg-slate-100 rounded-lg"><Filter className="w-4 h-4 text-slate-500" /></div>
                <span className="font-bold text-slate-700 capitalize">{activeTab} list</span>
            </div>
            <div className="flex items-center gap-3">
                 <button className="p-2 hover:bg-slate-50 rounded-lg text-slate-400 transition-colors"><Search className="w-4 h-4" /></button>
            </div>
        </div>
        <div className="flex-1 min-h-0">
          <DataTable 
            columns={columns} 
            data={filteredStudents} 
            isLoading={isLoading} 
            searchKey="name" 
            searchPlaceholder="Search students by name..." 
          />
        </div>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingStudent(null);
        }}
        title={editingStudent ? `Refine admission: ${editingStudent.name}` : "Institutional admission wizard"}
        maxWidth="2xl"
      >
        <AdmissionWizard 
          onClose={() => {
            setIsModalOpen(false);
            setEditingStudent(null);
          }} 
          onSuccess={fetchStudents} 
          initialData={editingStudent}
        />
      </Modal>
    </div>
  );
}
