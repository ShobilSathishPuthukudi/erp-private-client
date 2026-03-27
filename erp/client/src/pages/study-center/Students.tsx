import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { DataTable } from '@/components/shared/DataTable';
import type { ColumnDef } from '@tanstack/react-table';
import toast from 'react-hot-toast';

interface Student {
  id: number;
  name: string;
  status: 'DRAFT' | 'PENDING_REVIEW' | 'OPS_APPROVED' | 'FINANCE_APPROVED' | 'REJECTED' | 'ENROLLED';
  invoiceId?: number;
  program?: { name: string, duration: number };
}

export default function Students() {
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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

  const handleSubmitRecord = async (id: number) => {
    try {
      if (!window.confirm('Are you certain you wish to submit this manifold for institutional review? No further edits are permitted after this protocol.')) return;
      await api.post(`/portals/study-center/students/${id}/submit`);
      toast.success('Record successfully synchronized with Sub-Department review queue');
      fetchStudents();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Submission protocol failure');
    }
  };

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
      cell: ({ row }) => row.original.program?.name || <span className="text-slate-400 italic">Unknown</span>
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
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          {row.original.status === 'DRAFT' && (
            <button 
              onClick={() => handleSubmitRecord(row.original.id)}
              className="bg-blue-600 text-white px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all active:scale-95 shadow-lg shadow-blue-500/20"
            >
              Submit to Sub-Dept
            </button>
          )}
        </div>
      )
    },
    { 
      id: 'billing',
      header: 'Initial Billing',
      cell: ({ row }) => (
        <span className="text-[10px] font-mono font-bold text-slate-500">
          {row.original.invoiceId ? `Linked (#${row.original.invoiceId})` : 'Unlinked'}
        </span>
      )
    }
  ];

  return (
    <div className="space-y-6 flex flex-col h-[calc(100vh-8rem)]">
      <div className="flex justify-between items-center shrink-0">
        <div>
           <h1 className="text-2xl font-bold text-slate-900">Assigned Students</h1>
           <p className="text-slate-500">Monitor all students associated with this specific Study Center location</p>
        </div>
      </div>

      <div className="flex-1 min-h-0 bg-white shadow-sm border border-slate-200 rounded-lg flex flex-col">
        <DataTable 
          columns={columns} 
          data={students} 
          isLoading={isLoading} 
          searchKey="name" 
          searchPlaceholder="Search students by name..." 
        />
      </div>
    </div>
  );
}
