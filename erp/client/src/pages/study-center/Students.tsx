import { useState, useEffect, useMemo } from 'react';
import { api } from '@/lib/api';
import { DataTable } from '@/components/shared/DataTable';
import type { ColumnDef } from '@tanstack/react-table';
import { UserPlus, Clock, CheckCircle, Search, Filter, Edit } from 'lucide-react';
import toast from 'react-hot-toast';
import { clsx } from 'clsx';
import { Modal } from '@/components/shared/Modal';
import AdmissionWizard from './AdmissionWizard';

interface Student {
  id: number;
  name: string;
  status: string;
  invoiceId?: number;
  program?: { name: string, duration: number, type: string };
}

export default function Students() {
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
    } catch (error) {
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

  useEffect(() => {
    fetchStudents();
  }, []);

  const columns: ColumnDef<Student>[] = [
    { accessorKey: 'id', header: 'ID' },
    { 
      accessorKey: 'name', 
      header: 'Full Name',
      cell: ({ row }) => <span className="font-semibold text-slate-900">{row.original.name}</span>
    },
    { 
      id: 'program', 
      header: 'Program',
      cell: ({ row }) => row.original.program?.name || <span className="text-slate-400 ">Unknown</span>
    },
    { 
      accessorKey: 'status', 
      header: 'Review Status',
      cell: ({ row }) => {
        const s = row.original.status;
        let color = 'bg-slate-100 text-slate-700';
        if (s === 'DRAFT') color = 'bg-slate-900 text-white font-black';
        if (s === 'PENDING_REVIEW') color = 'bg-amber-100 text-amber-700 font-bold';
        if (s === 'OPS_APPROVED') color = 'bg-blue-100 text-blue-700';
        if (s === 'FINANCE_APPROVED') color = 'bg-emerald-100 text-emerald-700';
        if (s === 'ENROLLED') color = 'bg-green-600 text-white';
        if (s === 'REJECTED') color = 'bg-red-100 text-red-700';
        return <span className={`px-2 py-1 text-[9px] rounded-full font-black uppercase tracking-tighter ${color}`}>{s?.replace('_', ' ')}</span>;
      }
    },
    {
      id: 'type',
      header: 'Type',
      cell: ({ row }) => (
        <span className="text-[10px] font-black uppercase tracking-widest text-blue-600 bg-blue-50 px-2 py-1 rounded-md">
          {row.original.program?.type || 'N/A'}
        </span>
      )
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => activeTab === 'pending' && (
        <button 
          onClick={() => {
            setEditingStudent(row.original);
            setIsModalOpen(true);
          }}
          className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg transition-all active:scale-95 group"
          title="Edit Student Data"
        >
          <Edit className="w-4 h-4 group-hover:scale-110 transition-transform" />
        </button>
      )
    }
  ];

  return (
    <div className="space-y-6 flex flex-col h-[calc(100vh-8rem)]">
      <div className="flex justify-between items-end shrink-0">
        <div>
           <h1 className="text-2xl font-black text-slate-900 tracking-tight">Institutional Student Roster</h1>
           <p className="text-slate-500 text-sm mt-1">Manage and monitor student enrollments for your center</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-200 active:scale-95"
        >
          <UserPlus className="w-4 h-4" />
          Add Student
        </button>
      </div>

      <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-xl w-fit shrink-0">
        <button
          onClick={() => setActiveTab('pending')}
          className={clsx(
            "flex items-center gap-2 px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all",
            activeTab === 'pending' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
          )}
        >
          <Clock className="w-4 h-4" />
          Pending Admissions
        </button>
        <button
          onClick={() => setActiveTab('enrolled')}
          className={clsx(
            "flex items-center gap-2 px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all",
            activeTab === 'enrolled' ? "bg-white text-emerald-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
          )}
        >
          <CheckCircle className="w-4 h-4" />
          Enrolled Roster
        </button>
      </div>

      <div className="flex-1 min-h-0 bg-white shadow-sm border border-slate-200 rounded-2xl flex flex-col overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-white">
            <div className="flex items-center gap-2">
                <div className="p-2 bg-slate-100 rounded-lg"><Filter className="w-4 h-4 text-slate-500" /></div>
                <span className="font-bold text-slate-700 capitalize">{activeTab} List</span>
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
        title={editingStudent ? `Refine Admission: ${editingStudent.name}` : "Institutional Admission Wizard"}
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
