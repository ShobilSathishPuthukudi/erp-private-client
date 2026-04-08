import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { DataTable } from '@/components/shared/DataTable';
import { 
  Building2, 
  Users, 
  TrendingUp, 
  BookOpen,
  PieChart,
  ArrowRight,
  Award,
  Calendar
} from 'lucide-react';
import { Modal } from '@/components/shared/Modal';
import type { ColumnDef } from '@tanstack/react-table';

interface CenterPerf {
  id: number;
  name: string;
  status: string;
  studentCount: number;
  activePrograms: number;
  approvalRate?: string;
}

export default function CenterPerformance() {
  const [centers, setCenters] = useState<CenterPerf[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCenter, setSelectedCenter] = useState<CenterPerf | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const fetchPerformance = async () => {
      try {
        const res = await api.get('/operations/performance/centers');
        setCenters(res.data);
      } catch (error) {
        console.error('Failed to fetch performance stats:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchPerformance();
  }, []);

  const columns: ColumnDef<CenterPerf>[] = [
    {
      accessorKey: 'name',
      header: 'Study Center',
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 border border-indigo-100 font-black">
             {row.original.name.charAt(0)}
          </div>
          <span className="font-bold text-slate-800">{row.original.name}</span>
        </div>
      )
    },
    {
      accessorKey: 'studentCount',
      header: 'Total Students',
      cell: ({ row }) => (
        <div className="flex items-center gap-2 font-black text-slate-900">
           <Users className="w-4 h-4 text-slate-400" />
           {row.original.studentCount}
        </div>
      )
    },
    {
      accessorKey: 'approvalRate',
      header: 'Quality Index',
      cell: () => (
        <div className="flex items-center gap-2">
            <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="w-[85%] h-full bg-emerald-500" />
            </div>
            <span className="text-xs font-black text-emerald-600">85%</span>
        </div>
      )
    },
    {
      accessorKey: 'activePrograms',
      header: 'Program Breadth',
      cell: ({ row }) => (
        <div className="flex items-center gap-2 font-bold text-slate-600">
            <BookOpen className="w-3 h-3" />
            {row.original.activePrograms} Channels
        </div>
      )
    },
    {
      id: 'actions',
      header: 'Analytical HUD',
      cell: ({ row }) => (
        <button 
          onClick={() => {
            setSelectedCenter(row.original);
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 text-xs font-black uppercase text-indigo-600 hover:text-slate-900 group"
        >
          Deep Stats
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </button>
      )
    }
  ];

  return (
    <div className="p-8 space-y-8 max-w-[1600px] mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Center Performance</h1>
          <p className="text-slate-500 font-medium">Tracking academic velocity and quality across regional study nodes.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         {[
           { label: 'Highest Enrollment', value: 'Delhi Hub', icon: Building2, color: 'bg-blue-600' },
           { label: 'Avg Approval Rate', value: '92.4%', icon: TrendingUp, color: 'bg-emerald-600' },
           { label: 'Network Health', value: 'Optimal', icon: PieChart, color: 'bg-indigo-600' },
         ].map((stat, i) => (
           <div key={i} className="bg-white p-8 rounded-[2.5rem] border border-slate-200 flex items-center justify-between group shadow-sm">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{stat.label}</p>
                <h4 className="text-2xl font-black text-slate-900">{stat.value}</h4>
              </div>
              <div className={`w-14 h-14 rounded-2xl ${stat.color} flex items-center justify-center text-white shadow-lg shadow-current/20 group-hover:scale-110 transition-transform`}>
                <stat.icon className="w-7 h-7" />
              </div>
           </div>
         ))}
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-sm">
        <DataTable columns={columns} data={centers} isLoading={isLoading} />
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={`Performance Deep-Dive: ${selectedCenter?.name}`}
      >
        <div className="space-y-8 p-2">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                    { label: 'Enrollment Velocity', value: '+14%', icon: TrendingUp, color: 'text-emerald-500' },
                    { label: 'Quality Score', value: '9.2/10', icon: Award, color: 'text-amber-500' },
                    { label: 'Avg Review Time', value: '14.2h', icon: Calendar, color: 'text-indigo-500' }
                ].map((stat, i) => (
                    <div key={i} className="bg-slate-50 p-4 rounded-xl border border-slate-100 shadow-sm">
                        <div className="flex items-center gap-2 mb-2">
                            <stat.icon className={`w-3.5 h-3.5 ${stat.color}`} />
                            <span className="text-xs font-black text-slate-500 uppercase tracking-widest">{stat.label}</span>
                        </div>
                        <p className="text-2xl font-black text-slate-900">{stat.value}</p>
                    </div>
                ))}
            </div>

            <div className="bg-slate-900 p-8 rounded-3xl shadow-xl shadow-slate-900/20 border border-white/5">
                <h4 className="text-xs font-black text-white/50 uppercase mb-6 flex items-center gap-2 tracking-widest">
                    <PieChart className="w-4 h-4 text-indigo-400" />
                    Outcome Distribution
                </h4>
                <div className="space-y-5">
                    {[
                        { label: 'First Division', percentage: 72, color: 'bg-emerald-500' },
                        { label: 'Second Division', percentage: 22, color: 'bg-amber-500' },
                        { label: 'Re-attempts Required', percentage: 6, color: 'bg-rose-500' }
                    ].map((row, i) => (
                        <div key={i} className="space-y-2">
                            <div className="flex justify-between text-[10px] font-black uppercase tracking-widest\">
                                <span className="text-white/40">{row.label}</span>
                                <span className="text-white">{row.percentage}%</span>
                            </div>
                            <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                                <div className={`h-full ${row.color} shadow-[0_0_10px_rgba(0,0,0,0.2)] transition-all duration-1000`} style={{ width: `${row.percentage}%` }} />
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="flex justify-end pt-6 border-t border-slate-100">
                 <button 
                    onClick={() => setIsModalOpen(false)}
                    className="px-8 py-3 bg-slate-900 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all active:scale-95 shadow-xl shadow-slate-900/20"
                >
                    Close Analytics
                </button>
            </div>
        </div>
      </Modal>
    </div>
  );
}
