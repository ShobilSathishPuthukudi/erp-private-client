import { useEffect, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { Calendar } from 'lucide-react';
import toast from 'react-hot-toast';

import { DataTable } from '@/components/shared/DataTable';
import { PageHeader } from '@/components/shared/PageHeader';
import { api } from '@/lib/api';

interface Session {
  id: number;
  name: string;
  startDate: string;
  endDate: string;
  maxCapacity: number;
  enrolledCount: number;
  financeStatus: 'pending' | 'approved' | 'rejected';
  approvalStatus: 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED';
  isActive: boolean;
  sessionType?: 'ADMISSION' | 'ACADEMIC';
  program?: { name: string; type: string };
  center?: { name: string };
}

const formatDate = (value?: string) => {
  if (!value) return 'Not set';

  return new Date(value).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

export default function SubDeptSessions() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        setIsLoading(true);
        const response = await api.get('/academic/sessions');
        const admissionBatches = (response.data as Session[]).filter(
          (session) => session.sessionType !== 'ACADEMIC'
        );
        setSessions(admissionBatches);
      } catch {
        toast.error('Failed to load admission batches');
      } finally {
        setIsLoading(false);
      }
    };

    fetchSessions();
  }, []);

  const columns: ColumnDef<Session>[] = [
    {
      accessorKey: 'name',
      header: 'Batch',
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-bold text-slate-900">{row.original.name}</span>
          <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">
            ID: {row.original.id}
          </span>
        </div>
      ),
    },
    {
      id: 'program',
      header: 'Program & Partner Center',
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="text-sm font-bold text-slate-700">
            {row.original.program?.name || 'Program not available'}
          </span>
          <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">
            {row.original.center?.name || 'Partner Center'}
          </span>
        </div>
      ),
    },
    {
      id: 'timeline',
      header: 'Batch Window',
      cell: ({ row }) => (
        <div className="flex flex-col text-xs font-bold text-slate-600">
          <span>{formatDate(row.original.startDate)}</span>
          <span className="text-slate-400">to {formatDate(row.original.endDate)}</span>
        </div>
      ),
    },
    {
      id: 'capacity',
      header: 'Seats',
      cell: ({ row }) => (
        <div className="text-xs font-bold text-slate-600">
          {row.original.enrolledCount} / {row.original.maxCapacity}
        </div>
      ),
    },
    {
      id: 'status',
      header: 'Read-only Status',
      cell: ({ row }) => {
        const approvalClasses =
          row.original.approvalStatus === 'APPROVED'
            ? 'bg-emerald-100 text-emerald-700'
            : row.original.approvalStatus === 'PENDING_APPROVAL'
              ? 'bg-blue-50 text-blue-600 border border-blue-100'
              : 'bg-slate-100 text-slate-600 border border-slate-200';

        const financeClasses =
          row.original.financeStatus === 'approved'
            ? 'bg-indigo-50 text-indigo-600 border-indigo-100'
            : row.original.financeStatus === 'rejected'
              ? 'bg-rose-50 text-rose-600 border-rose-100'
              : 'bg-amber-50 text-amber-600 border-amber-100';

        return (
          <div className="flex flex-col gap-1.5">
            <span
              className={`px-2.5 py-1 text-[10px] rounded-full font-bold uppercase tracking-wider w-fit ${approvalClasses}`}
            >
              {row.original.approvalStatus.replace('_', ' ')}
            </span>
            <span
              className={`px-2 py-0.5 text-[9px] rounded-md font-black uppercase tracking-tighter w-fit border ${financeClasses}`}
            >
              Finance: {row.original.financeStatus.toUpperCase()}
            </span>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Managed by partner center
            </span>
          </div>
        );
      },
    },
  ];

  return (
    <div className="p-2 space-y-6 max-w-[1600px] mx-auto">
      <PageHeader 
        title="Institutional sessions"
        description="Admission batches are created in partner center and shown here as read-only."
        icon={Calendar}
      />

      <div className="bg-white rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden">
        <DataTable
          columns={columns}
          data={sessions}
          isLoading={isLoading}
          emptyMessage="No admission batches available."
          emptyDescription="Batches created in partner center will appear here automatically."
        />
      </div>
    </div>
  );
}
