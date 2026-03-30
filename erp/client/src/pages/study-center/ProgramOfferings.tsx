import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { DataTable } from '@/components/shared/DataTable';
import type { ColumnDef } from '@tanstack/react-table';
import { CheckCircle, Layout } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Programs() {
  const [programs, setPrograms] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/portals/study-center/programs');
      setPrograms(res.data);
    } catch (error) {
      toast.error('Failed to load assigned programs');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const columns: ColumnDef<any>[] = [
    { 
      accessorKey: 'program.name', 
      header: 'Program Name', 
      cell: ({ row }) => <span className="font-bold text-slate-800">{row.original.program?.name}</span> 
    },
    { 
      accessorKey: 'program.university.name', 
      header: 'Partner Institution',
      cell: ({ row }) => <span>{row.original.program?.university?.name || 'N/A'}</span>
    },
    { 
      accessorKey: 'program.type', 
      header: 'Type', 
      cell: ({ row }) => <span className="uppercase text-[10px] bg-slate-100 px-2 py-0.5 rounded font-bold">{row.original.program?.type}</span> 
    },
    {
      id: 'status',
      header: 'Status',
      cell: () => (
        <div className="flex items-center gap-2 text-emerald-600 font-bold text-xs uppercase bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100">
            <CheckCircle className="w-3 h-3" />
            Authorized
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6 flex flex-col h-[calc(100vh-8rem)]">
      <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex-1">
           <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
              <Layout className="w-8 h-8 text-blue-600" />
              Assigned Academic Programs
           </h1>
           <p className="text-slate-500 mt-2 text-sm leading-relaxed max-w-xl">
              These programs have been sanctioned for your center through the Institutional CRM portal. 
              You are authorized to enroll students into these specific academic frameworks.
           </p>
        </div>
        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 flex flex-col items-center">
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Total Sanctioned</p>
             <p className="text-4xl font-black text-slate-900">{programs.length}</p>
        </div>
      </div>

      <div className="flex-1 min-h-0 bg-white shadow-sm border border-slate-200 rounded-2xl flex flex-col overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-white">
            <div className="flex items-center gap-2">
                <div className="p-2 bg-slate-100 rounded-lg"><Layout className="w-4 h-4 text-slate-500" /></div>
                <span className="font-bold text-slate-700">Institutional Portfolio</span>
            </div>
        </div>
        <div className="flex-1 min-h-0">
            <DataTable columns={columns} data={programs} isLoading={isLoading} searchKey="program.name" />
        </div>
      </div>
    </div>
  );
}
