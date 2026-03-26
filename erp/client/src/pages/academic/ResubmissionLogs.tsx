import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { DataTable } from '@/components/shared/DataTable';
import { 
  RotateCw, 
  History, 
  UserCircle2, 
  Clock, 
  MessageSquare,
  ArrowRight
} from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';

interface Student {
  id: number;
  name: string;
  enrollStatus: string;
  attemptCount: number;
  lastRejectionReason?: string;
  resubmissionDate?: string;
  program?: { name: string };
  verificationLogs?: any[];
}

export default function ResubmissionLogs() {
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchResubmissions = async () => {
      try {
        const res = await api.get('/academic/students');
        // Filter students with attemptCount > 1
        setStudents(res.data.filter((s: Student) => s.attemptCount > 1 || s.enrollStatus.startsWith('rejected')));
      } catch (error) {
        console.error('Failed to fetch resubmission logs:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchResubmissions();
  }, []);

  const columns: ColumnDef<Student>[] = [
    {
      accessorKey: 'name',
      header: 'Student Asset',
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-500 font-bold border border-rose-100">
             <UserCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="font-bold text-slate-900">{row.original.name}</p>
            <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest">Attm: {row.original.attemptCount}</p>
          </div>
        </div>
      )
    },
    {
      accessorKey: 'program.name',
      header: 'Academic Track',
    },
    {
      accessorKey: 'resubmissionDate',
      header: 'Sync Date',
      cell: ({ row }) => row.original.resubmissionDate ? (
        <div className="flex items-center gap-2 text-slate-500 font-medium">
            <Clock className="w-3 h-3" />
            {new Date(row.original.resubmissionDate).toLocaleDateString()}
        </div>
      ) : <span className="text-slate-300">N/A</span>
    },
    {
      accessorKey: 'lastRejectionReason',
      header: 'Institutional Feedback',
      cell: ({ row }) => (
        <div className="flex items-center gap-2 max-w-[250px]">
            <MessageSquare className="w-3 h-3 text-slate-400 flex-shrink-0" />
            <p className="text-[11px] font-medium text-slate-600 line-clamp-2">
                {row.original.lastRejectionReason || 'No historical reason logged.'}
            </p>
        </div>
      )
    },
    {
      id: 'actions',
      header: 'History HUD',
      cell: () => (
        <button className="flex items-center gap-2 text-[10px] font-black uppercase text-indigo-600 bg-indigo-50 px-4 py-2 rounded-xl border border-indigo-100/50 hover:bg-slate-900 hover:text-white transition-all">
          <History className="w-3 h-3" />
          View Timeline
          <ArrowRight className="w-3 h-3" />
        </button>
      )
    }
  ];

  return (
    <div className="p-8 space-y-8 max-w-[1600px] mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase flex items-center gap-3">
            <RotateCw className="w-8 h-8 text-rose-500" />
            Resubmission Hub
          </h1>
          <p className="text-slate-500 font-medium">Tracking iterative application cycles and institutional feedback history.</p>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-rose-100 overflow-hidden shadow-sm">
        <DataTable columns={columns} data={students} isLoading={isLoading} />
      </div>
    </div>
  );
}
