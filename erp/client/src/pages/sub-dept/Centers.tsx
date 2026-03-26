import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '@/lib/api';
import { DataTable } from '@/components/shared/DataTable';
import type { ColumnDef } from '@tanstack/react-table';
import { MapPin } from 'lucide-react';
import toast from 'react-hot-toast';

interface Center {
  id: number;
  name: string;
  status: string;
  auditStatus?: string;
  studentCount?: number;
  activePrograms?: number;
}

export default function Centers() {
  const { unit } = useParams();
  const [centers, setCenters] = useState<Center[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchCenters = async () => {
    try {
      setIsLoading(true);
      const subDeptMap: Record<string, number> = { 'openschool': 8, 'online': 9, 'skill': 10, 'bvoc': 11 };
      const subDeptId = unit ? subDeptMap[unit.toLowerCase()] : null;
      
      const res = await api.get('/operations/performance/centers', {
        params: { subDeptId }
      });
      setCenters(res.data);
    } catch (error) {
      toast.error('Failed to fetch jurisdictional centers');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCenters();
  }, [unit]);

  const columns: ColumnDef<Center>[] = [
    { 
      accessorKey: 'name', 
      header: 'Center Identity',
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400">
            <MapPin className="w-4 h-4" />
          </div>
          <span className="font-bold text-slate-900 uppercase tracking-tighter">{row.original.name}</span>
        </div>
      )
    },
    { 
      accessorKey: 'status', 
      header: 'Status',
      cell: ({ row }) => (
        <span className={`px-2 py-1 text-[10px] rounded-full font-bold uppercase ${row.original.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {row.original.status}
        </span>
      )
    },
    { 
      accessorKey: 'studentCount', 
      header: 'Active Students',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <span className="font-black text-lg text-slate-900">{row.original.studentCount || 0}</span>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Enrolled</span>
        </div>
      )
    },
    { 
      accessorKey: 'activePrograms', 
      header: 'Unit Programs',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <span className="font-black text-lg text-blue-600">{row.original.activePrograms || 0}</span>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Offered</span>
        </div>
      )
    },
    {
      id: 'performance',
      header: 'Performance Pulse',
      cell: ({ row }) => (
        <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
          <div 
            className="h-full bg-blue-600 rounded-full" 
            style={{ width: `${Math.min(100, ((row.original.studentCount || 0) / 50) * 100)}%` }}
          />
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6 flex flex-col h-[calc(100vh-8rem)]">
      <div className="flex justify-between items-center shrink-0">
        <div>
           <div className="flex items-center gap-2 text-blue-600 mb-1 font-black uppercase tracking-[0.2em] text-[10px]">
               <MapPin className="w-4 h-4" />
               Jurisdictional Network
           </div>
           <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Mapped <span className="text-blue-600 font-outline-1">Centers ({unit ? unit.toUpperCase() : 'UNIT'})</span></h1>
           <p className="text-slate-500 font-medium tracking-tight">Monitor and manage the performance of centers mapped to your operational unit</p>
        </div>
      </div>

      <div className="flex-1 min-h-0 bg-white shadow-xl shadow-slate-200/50 border border-slate-100 rounded-[2rem] flex flex-col overflow-hidden">
        <DataTable 
          columns={columns} 
          data={centers} 
          isLoading={isLoading} 
          searchKey="name" 
          searchPlaceholder="Identify center..." 
        />
      </div>
    </div>
  );
}
