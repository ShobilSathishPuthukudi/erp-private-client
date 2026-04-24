import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '@/lib/api';
import { DataTable } from '@/components/shared/DataTable';
import type { ColumnDef } from '@tanstack/react-table';
import { BookOpen } from 'lucide-react';
import toast from 'react-hot-toast';
import { PageHeader } from '@/components/shared/PageHeader';

interface Program {
  id: number;
  name: string;
  duration: number;
  status: string;
  university?: { id: number, name: string };
  offeringCenters?: any[];
}

export default function Programs() {
  const { unit } = useParams();
  const [programs, setPrograms] = useState<Program[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchPrograms = async () => {
    try {
      setIsLoading(true);
      const subDeptId = unit || null;
      
      const res = await api.get('/academic/programs', { 
        params: { subDeptId } 
      });
      setPrograms(res.data);
    } catch (error) {
      toast.error('Failed to fetch programs');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPrograms();
  }, [unit]);

  const columns: ColumnDef<Program>[] = [
    { accessorKey: 'id', header: 'Prog ID' },
    { 
      accessorKey: 'name', 
      header: 'Program Name',
      cell: ({ row }) => <span className="font-semibold text-slate-900">{row.original.name}</span>
    },
    { 
      id: 'university', 
      header: 'Partner University',
      cell: ({ row }) => row.original.university?.name || <span className="text-slate-400">No University Linked</span>
    },
    {
      id: 'centers',
      header: 'Offering Centers',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
            <span className="font-bold text-slate-900">{row.original.offeringCenters?.length || 0}</span>
            <span className="text-[10px] text-slate-400 font-medium">Nodes</span>
        </div>
      )
    },
    { 
      accessorKey: 'duration', 
      header: 'Duration',
      cell: ({ row }) => `${row.original.duration} Months`
    },
    {
      accessorKey: 'status',
      header: 'Enrollment State',
      cell: ({ row }) => {
        const s = row.original.status?.toLowerCase();
        let color = 'bg-slate-50 text-slate-600 border-slate-200';
        if (s === 'active' || s === 'open') color = 'bg-emerald-50 text-emerald-700 border-emerald-200';
        if (s === 'draft') color = 'bg-blue-50 text-blue-700 border-blue-200';
        if (s === 'staged') color = 'bg-indigo-50 text-indigo-700 border-indigo-200';
        
        return (
          <div className="flex items-center gap-3">
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${color}`}>
              {s}
            </span>
          </div>
        );
      }
    }
  ];

  const getUniqueUniversities = () => {
    const unis = programs.map(p => p.university).filter((u): u is { id: number, name: string } => !!u && typeof u.id === 'number');
    const uniqueIds = Array.from(new Set(unis.map(u => u.id)));
    return uniqueIds.map(id => unis.find(u => u.id === id)).filter(Boolean);
  };

  return (
    <div className="p-2 space-y-6 flex flex-col h-[calc(100vh-8rem)]">
      <PageHeader 
        title={`Assigned programs (${unit?.toUpperCase()})`}
        description="Read-only portfolio from academic (operations) architecture."
        icon={BookOpen}
        action={
          <div className="flex gap-2">
            {getUniqueUniversities().map(u => u && (
                <span key={u.id} className="bg-white border border-slate-200 px-3 py-1.5 rounded-xl text-[10px] font-bold text-slate-600 shadow-sm flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                    {u.name}
                </span>
            ))}
          </div>
        }
      />

      <div className="flex-1 min-h-0 bg-white shadow-xl shadow-slate-200/50 border border-slate-100 rounded-[2rem] flex flex-col overflow-hidden">
        <DataTable 
          columns={columns} 
          data={programs} 
          isLoading={isLoading} 
        />
      </div>
    </div>
  );
}
