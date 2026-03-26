import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { DataTable } from '@/components/shared/DataTable';
import type { ColumnDef } from '@tanstack/react-table';
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
  const [programs, setPrograms] = useState<Program[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchPrograms = async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/sub-dept/programs');
      setPrograms(res.data);
    } catch (error) {
      toast.error('Failed to fetch programs');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPrograms();
  }, []);

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
      cell: ({ row }) => row.original.university?.name || <span className="text-slate-400 italic">No University Linked</span>
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
            {(isActive || isOpen) && (
                <button 
                    onClick={() => handleToggleStatus(program.id, isOpen ? 'active' : 'open')}
                    className={`text-[10px] font-bold underline transition-colors ${isOpen ? 'text-red-500 hover:text-red-700' : 'text-green-600 hover:text-green-800'}`}
                >
                    {isOpen ? 'Close Admissions' : 'Open Admissions'}
                </button>
            )}
          </div>
        );
      }
    }
  ];

  const handleToggleStatus = async (id: number, newStatus: string) => {
    try {
      await api.put(`/sub-dept/programs/${id}/status`, { status: newStatus });
      toast.success(`Program admissions ${newStatus === 'open' ? 'opened' : 'closed'} successfully`);
      fetchPrograms();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Status toggle protocol failure');
    }
  };

  const getUniqueUniversities = () => {
    const unis = programs.map(p => p.university).filter(Boolean);
    const uniqueIds = Array.from(new Set(unis.map(u => u?.id)));
    return uniqueIds.map(id => unis.find(u => u?.id === id));
  };

  return (
    <div className="space-y-6 flex flex-col h-[calc(100vh-8rem)]">
      <div className="flex justify-between items-end shrink-0">
        <div>
           <h1 className="text-2xl font-bold text-slate-900">Institutional Portfolio</h1>
           <p className="text-slate-500">Track and manage curriculum structures assigned to your specific sub-department</p>
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

      <div className="flex-1 min-h-0 bg-white shadow-sm border border-slate-200 rounded-lg flex flex-col">
        <DataTable 
          columns={columns} 
          data={programs} 
          isLoading={isLoading} 
          searchKey="name" 
          searchPlaceholder="Search programs..." 
        />
      </div>
    </div>
  );
}
