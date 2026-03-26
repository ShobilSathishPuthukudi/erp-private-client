import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { DataTable } from '@/components/shared/DataTable';
import type { ColumnDef } from '@tanstack/react-table';
import { Globe, Plus, CheckCircle, Search, Layout, Filter } from 'lucide-react';
import toast from 'react-hot-toast';

interface Program {
  id: number;
  name: string;
  type: string;
  university: { name: string };
  status: string;
}

interface Offering {
    programId: number;
}

export default function ProgramOfferings() {
  const [activePrograms, setActivePrograms] = useState<Program[]>([]);
  const [myOfferings, setMyOfferings] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [progRes, offerRes] = await Promise.all([
        api.get('/academic/programs'), // In a real app, this might be a specialized /center/active-programs
        api.get('/study-center/offerings')
      ]);
      // Filter for Active programs (or Open)
      setActivePrograms(progRes.data.filter((p: any) => p.status !== 'draft'));
      setMyOfferings(offerRes.data.map((o: any) => o.programId));
    } catch (error) {
      toast.error('Failed to sync program marketplace');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenAdmissions = async (programId: number) => {
    try {
      await api.post('/study-center/offerings', { programId });
      toast.success('Admissions deployed for this program!');
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to authorize program');
    }
  };

  const columns: ColumnDef<Program>[] = [
    { accessorKey: 'name', header: 'Program Name', cell: ({ row }) => <span className="font-bold text-slate-800">{row.original.name}</span> },
    { accessorKey: 'university.name', header: 'Partner Institution' },
    { accessorKey: 'type', header: 'Sub-Dept', cell: ({ row }) => <span className="uppercase text-[10px] bg-slate-100 px-2 py-0.5 rounded font-bold">{row.original.type}</span> },
    {
      id: 'actions',
      header: 'Marketplace Action',
      cell: ({ row }) => {
        const isOffering = myOfferings.includes(row.original.id);
        if (isOffering) {
            return (
                <div className="flex items-center gap-2 text-emerald-600 font-bold text-xs uppercase bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100">
                    <CheckCircle className="w-3 h-3" />
                    Authorized
                </div>
            );
        }
        return (
            <button 
                onClick={() => handleOpenAdmissions(row.original.id)}
                className="flex items-center gap-2 bg-slate-900 text-white px-4 py-1.5 rounded-lg text-xs font-bold hover:bg-slate-800 transition-all shadow-md active:scale-95"
            >
                <Plus className="w-3 h-3" />
                Deploy Admissions
            </button>
        );
      }
    }
  ];

  return (
    <div className="space-y-6 flex flex-col h-[calc(100vh-8rem)] p-6">
      <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex-1">
           <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
              <Globe className="w-8 h-8 text-blue-600" />
              Program Marketplace
           </h1>
           <p className="text-slate-500 mt-2 text-sm leading-relaxed max-w-xl">
              Browse and deploy academic programs across our partner universities. 
              Once authorized, you can initiate student admissions directly from your dashboard.
           </p>
        </div>
        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 flex flex-col items-center">
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">My Active Node Count</p>
             <p className="text-4xl font-black text-slate-900">{myOfferings.length}</p>
        </div>
      </div>

      <div className="flex-1 min-h-0 bg-white shadow-sm border border-slate-200 rounded-2xl flex flex-col overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-white">
            <div className="flex items-center gap-2">
                <div className="p-2 bg-slate-100 rounded-lg"><Layout className="w-4 h-4 text-slate-500" /></div>
                <span className="font-bold text-slate-700">Institutional Portfolio</span>
            </div>
            <div className="flex items-center gap-3">
                 <button className="p-2 hover:bg-slate-50 rounded-lg text-slate-400 transition-colors"><Filter className="w-4 h-4" /></button>
                 <button className="p-2 hover:bg-slate-50 rounded-lg text-slate-400 transition-colors"><Search className="w-4 h-4" /></button>
            </div>
        </div>
        <div className="flex-1 min-h-0">
            <DataTable columns={columns} data={activePrograms} isLoading={isLoading} searchKey="name" />
        </div>
      </div>
    </div>
  );
}
