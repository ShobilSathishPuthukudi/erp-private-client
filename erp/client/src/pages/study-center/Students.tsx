import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { DataTable } from '@/components/shared/DataTable';
import type { ColumnDef } from '@tanstack/react-table';
import toast from 'react-hot-toast';

interface Student {
  id: number;
  name: string;
  enrollStatus: string;
  feeStatus: string;
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

  useEffect(() => {
    fetchStudents();
  }, []);

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
          <span className={`px-2 py-1 text-[10px] rounded-sm uppercase font-bold ${s === 'paid' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            {s}
          </span>
        );
      }
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
