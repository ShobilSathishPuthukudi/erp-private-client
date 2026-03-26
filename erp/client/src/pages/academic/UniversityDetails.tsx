import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '@/lib/api';
import { DataTable } from '@/components/shared/DataTable';
import type { ColumnDef } from '@tanstack/react-table';
import { ArrowLeft, BookOpen, CheckCircle, Globe } from 'lucide-react';
import toast from 'react-hot-toast';

interface Program {
  id: number;
  name: string;
  type: string;
  status: string;
}

interface University {
  id: number;
  name: string;
  status: string;
  totalPrograms?: number;
  activePrograms?: number;
  openPrograms?: number;
  programs: Program[];
}

export default function UniversityDetails() {
  const { id } = useParams();
  const [uni, setUni] = useState<University | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUni = async () => {
      try {
        const res = await api.get(`/academic/universities/${id}`);
        setUni(res.data);
      } catch (error) {
        toast.error('Failed to resolve university footprint');
      } finally {
        setIsLoading(false);
      }
    };
    fetchUni();
  }, [id]);

  if (isLoading) return <div className="p-8 text-center font-mono animate-pulse">Synchronizing with institutional core...</div>;
  if (!uni) return <div className="p-8 text-center text-red-500 font-bold">University Node Offline or Not Found</div>;

  const columns: ColumnDef<Program>[] = [
    { accessorKey: 'id', header: 'Prog-ID', cell: ({ row }) => <span className="font-mono text-xs text-slate-400">PRG-{row.original.id}</span> },
    { 
      accessorKey: 'name', 
      header: 'Program Name', 
      cell: ({ row }) => (
        <Link to={`/dashboard/academic/programs/${row.original.id}`} className="font-semibold text-blue-600 hover:underline">
          {row.original.name}
        </Link>
      ) 
    },
    { accessorKey: 'type', header: 'Sub-Dept', cell: ({ row }) => <span className="uppercase text-[10px] font-bold text-slate-500">{row.original.type}</span> },
    { 
        accessorKey: 'status', 
        header: 'Lifecycle',
        cell: ({ row }) => {
          const status = row.original.status;
          return (
            <span className={`px-2 py-0.5 text-[9px] rounded-full font-bold uppercase ${
              status === 'open' ? 'bg-green-100 text-green-700' : 
              status === 'active' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'
            }`}>
              {status}
            </span>
          );
        }
    }
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-6">
      <Link to="/dashboard/academic/universities" className="flex items-center space-x-2 text-slate-500 hover:text-slate-900 transition-colors mb-4">
        <ArrowLeft className="w-4 h-4" />
        <span className="text-sm font-medium">Back to Registry</span>
      </Link>

      <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
            <Globe className="w-32 h-32" />
        </div>
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">{uni.name}</h1>
            <p className="text-slate-500 mt-2 flex items-center gap-2 uppercase tracking-tighter font-mono text-xs">
                <span className={`w-2 h-2 rounded-full ${uni.status === 'active' ? 'bg-green-500' : 'bg-red-500'}`} />
                System Instance: {uni.status}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4">
             <MetricCard label="Total Programs" value={uni.programs.length} icon={<BookOpen className="w-4 h-4" />} color="blue" />
             <MetricCard label="Active" value={uni.programs.filter(p => p.status === 'active').length} icon={<CheckCircle className="w-4 h-4" />} color="emerald" />
             <MetricCard label="Open" value={uni.programs.filter(p => p.status === 'open').length} icon={<Globe className="w-4 h-4" />} color="purple" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100">
            <h2 className="text-lg font-bold text-slate-900">Associated Program Topology</h2>
            <p className="text-sm text-slate-500">List of all academic offerings currently linked to this university node.</p>
        </div>
        <DataTable columns={columns} data={uni.programs} searchKey="name" />
      </div>
    </div>
  );
}

function MetricCard({ label, value, icon, color }: { label: string, value: number, icon: any, color: string }) {
    const colorClasses: any = {
        blue: 'bg-blue-50 text-blue-600',
        emerald: 'bg-emerald-50 text-emerald-600',
        purple: 'bg-indigo-50 text-indigo-600'
    };

    return (
        <div className="bg-white border border-slate-100 p-4 rounded-xl shadow-sm min-w-[120px]">
            <div className={`w-8 h-8 ${colorClasses[color]} rounded-lg flex items-center justify-center mb-2`}>
                {icon}
            </div>
            <div className="text-2xl font-bold text-slate-900">{value}</div>
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{label}</div>
        </div>
    );
}
