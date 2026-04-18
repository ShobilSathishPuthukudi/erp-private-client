import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { DataTable } from '@/components/shared/DataTable';
import { 
  RotateCw, 
  History, 
  UserCircle2, 
  Clock, 
  MessageSquare,
  ArrowRight,
  Info
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
  const [showDetails, setShowDetails] = useState(false);

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
    <div className="p-2 space-y-6 flex flex-col h-[calc(100vh-8rem)]">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white px-6 py-5 rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50 gap-6 shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center text-white shadow-lg shadow-slate-900/20 shrink-0">
            <RotateCw className="w-6 h-6 text-rose-500" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight leading-tight mb-0.5">Resubmission hub</h1>
            <p className="text-slate-500 font-medium text-sm">Tracking iterative application cycles and institutional feedback history.</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-rose-100 overflow-hidden shadow-sm">
        <DataTable columns={columns} data={students} isLoading={isLoading} />
      </div>

      {/* Explanatory Information Card */}
      <div className="bg-indigo-50/50 border border-indigo-100 rounded-3xl p-6 flex flex-col md:flex-row items-start gap-6">
        <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-indigo-500 shadow-sm shrink-0">
          <Info className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-2">How this tracking works</h3>
          <p className="text-slate-600 text-sm font-medium leading-relaxed max-w-4xl">
            This module automatically isolates and flags students caught in an iterative application loop. 
            Exclusively, students whose enrollment status is marked as <span className="font-bold text-rose-500">Rejected</span> or individuals who have 
            been required to <button type="button" onClick={() => setShowDetails(!showDetails)} className="font-bold text-indigo-600 hover:text-indigo-800 underline decoration-indigo-300 underline-offset-4 transition-all hover:bg-indigo-100 rounded px-1 -mx-1">resubmit their applications multiple times</button> will appear here. 
            If the queue is currently empty, it signifies that your verification pipeline is clear and successfully resolving without severe bottlenecks!
          </p>

          {showDetails && (
            <div className="mt-6 p-6 bg-white/60 rounded-2xl border border-indigo-100 shadow-sm animate-in fade-in slide-in-from-top-2 duration-500 max-w-3xl">
               <h4 className="text-[10px] font-black uppercase text-indigo-800 tracking-[0.2em] mb-4">Technical Telemetry Breakdown</h4>
               <ul className="text-sm font-medium text-slate-700 space-y-3">
                 <li className="flex items-start gap-3">
                   <div className="w-6 h-6 rounded-lg bg-indigo-100 flex items-center justify-center shrink-0 mt-0.5">
                     <div className="w-2 h-2 rounded-full bg-indigo-500" />
                   </div>
                   <p className="leading-relaxed"><span className="font-bold text-slate-900 border-b border-slate-300">attemptCount integer:</span> Every student profile includes an internal counter. When a rejected application is mathematically patched and re-synced, this integer increments. The Hub automatically queries for any count &gt; 1.</p>
                 </li>
                 <li className="flex items-start gap-3">
                   <div className="w-6 h-6 rounded-lg bg-rose-100 flex items-center justify-center shrink-0 mt-0.5">
                     <div className="w-2 h-2 rounded-full bg-rose-500" />
                   </div>
                   <p className="leading-relaxed"><span className="font-bold text-slate-900 border-b border-slate-300">Status Monitoring:</span> In parallel, any student with an `enrollStatus` actively tagged as "Rejected" is perpetually caught by this queue until legally ratified.</p>
                 </li>
                 <li className="flex items-start gap-3">
                   <div className="w-6 h-6 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0 mt-0.5">
                     <div className="w-2 h-2 rounded-full bg-emerald-500" />
                   </div>
                   <p className="leading-relaxed"><span className="font-bold text-slate-900 border-b border-slate-300">Absolute Entity Resolution:</span> The system updates the same database record (`Primary Key`) in-place rather than generating duplicate profiles. This guarantees total historical synchronization without relying on heuristic data merging.</p>
                 </li>
               </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
