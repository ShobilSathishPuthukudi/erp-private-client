import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '@/lib/api';
import { DataTable } from '@/components/shared/DataTable';
import type { ColumnDef } from '@tanstack/react-table';
import { BookOpen } from 'lucide-react';
import toast from 'react-hot-toast';

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
      const subDeptMap: Record<string, number> = { 'openschool': 8, 'online': 9, 'skill': 10, 'bvoc': 11 };
      const subDeptId = unit ? subDeptMap[unit.toLowerCase()] : null;
      
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
            <span className="text-[10px] text-slate-400 uppercase font-medium">Nodes</span>
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
        const program = row.original;
        const isOpen = program.status === 'open';
        const isActive = program.status === 'active';
        
        return (
          <div className="flex items-center gap-3">
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                isOpen ? 'bg-green-100 text-green-700' : 
                isActive ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
            }`}>
              {program.status}
            </span>
          </div>
        );
      }
    }
  ];

  const getUniqueUniversities = () => {
    const unis = programs.map(p => p.university).filter(Boolean);
    const uniqueIds = Array.from(new Set(unis.map(u => u?.id)));
    return uniqueIds.map(id => unis.find(u => u?.id === id));
  };

  return (
    <div className="space-y-6 flex flex-col h-[calc(100vh-8rem)]">
      <div className="flex justify-between items-end shrink-0">
        <div>
           <div className="flex items-center gap-2 text-blue-600 mb-1 font-black uppercase tracking-[0.2em] text-[10px]">
               <BookOpen className="w-4 h-4" />
               Academic Architecture
           </div>
           <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Assigned <span className="text-blue-600 font-outline-1">Programs</span></h1>
           <p className="text-slate-500 font-medium">Read-only portfolio from Academic (Operations) Architecture</p>
        </div>
        <div className="flex gap-2">
            {getUniqueUniversities().map(u => u && (
                <span key={u.id} className="bg-white border border-slate-200 px-3 py-1 rounded-lg text-[10px] font-bold text-slate-600 shadow-sm flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                    {u.name}
                </span>
            ))}
        </div>
      </div>

      <div className="flex-1 min-h-0 bg-white shadow-xl shadow-slate-200/50 border border-slate-100 rounded-[2rem] flex flex-col overflow-hidden">
        <DataTable 
          columns={columns} 
          data={programs} 
          isLoading={isLoading} 
          searchKey="name" 
          searchPlaceholder="Identify program..." 
        />
      </div>
    </div>
  );
}
