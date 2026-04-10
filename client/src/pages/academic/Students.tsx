import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { DataTable } from '@/components/shared/DataTable';
import type { ColumnDef } from '@tanstack/react-table';
import toast from 'react-hot-toast';

interface Student {
  id: number;
  name: string;
  enrollStatus: string;
  status: string;
  feeStatus: string;
  marks: any;
  program?: { name: string; type?: string };
  subDepartment?: { name: string };
  verificationLogs?: any[];
}

export default function Students() {
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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
  const columns: ColumnDef<Student>[] = [
    { accessorKey: 'id', header: 'SID', cell: ({ row }) => <span className="font-mono text-slate-500">S-{row.original.id}</span> },
    { accessorKey: 'name', header: 'Student', cell: ({ row }) => <span className="font-semibold text-slate-900">{row.original.name}</span> },
    { 
      id: 'subDepartment', 
      header: 'Sub-Department', 
      cell: ({ row }) => (
        <div className="inline-block text-slate-700 bg-slate-100 px-2 py-1 text-[10px] font-bold uppercase tracking-widest rounded border border-slate-200 leading-normal max-w-[140px]">
          {row.original.subDepartment?.name || 'GEN-ADMIN'}
        </div>
      )
    },
    { 
      id: 'program', 
      header: 'Program', 
      cell: ({ row }) => (
        <div className="inline-block text-slate-700 bg-slate-50 px-2 py-1 text-xs rounded border border-slate-200 leading-normal max-w-[140px]">
          {row.original.program?.name || 'Unassigned Core'}
        </div>
      )
    },
    { 
      accessorKey: 'enrollStatus', 
      header: 'Status', 
      cell: ({ row }) => {
        const s = row.original.status;
        return (
          <span className={`uppercase font-black text-[9px] tracking-widest px-3 py-1.5 rounded-full border ${
            s === 'ENROLLED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 
            s === 'OPS_APPROVED' ? 'bg-amber-50 text-amber-700 border-amber-200' :
            s === 'REJECTED' ? 'bg-red-50 text-red-700 border-red-200' :
            'bg-slate-50 text-slate-700 border-slate-200'
          }`}>
            {s || 'In Review'}
          </span>
        );
      }
    },
    { accessorKey: 'feeStatus', header: 'Finance', cell: ({ row }) => <span className="uppercase text-[10px] text-slate-500 font-bold">{row.original.feeStatus}</span> }
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">Student Review Console</h1>
          <p className="text-slate-500 mt-1">Read-only global registry. Modifications disabled for organizational visibility.</p>
        </div>
      </div>

      <DataTable 
        columns={columns} 
        data={students} 
        isLoading={isLoading} 
        searchKey="name" 
        searchPlaceholder="Locate by student legal string..." 
        exportFileName="Student_Registry_RO"
      />
    </div>
  );
}
