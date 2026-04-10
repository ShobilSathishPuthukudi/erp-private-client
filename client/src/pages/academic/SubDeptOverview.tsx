import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { 
  Building2, 
  TrendingUp, 
  ShieldCheck,
  Briefcase,
  Layers,
  Search
} from 'lucide-react';
import { DataTable } from '@/components/shared/DataTable';
import { DrillDownModal } from '@/components/shared/DrillDownModal';
import type { ColumnDef } from '@tanstack/react-table';

interface SubDeptStats {
  id: number;
  name: string;
  totalStudents: number;
  activeBatches: number;
  centersCount: number;
  approvalRate: string;
  pendingReviews: number;
}

export default function SubDeptOverview() {
  const [data, setData] = useState<SubDeptStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [globalStats, setGlobalStats] = useState<any>(null);
  const [drillDown, setDrillDown] = useState<{ isOpen: boolean; type: string; title: string }>({
    isOpen: false,
    type: '',
    title: ''
  });

  const openDrillDown = (type: string, title: string) => {
    setDrillDown({ isOpen: true, type, title });
  };



  const fetchOverview = async () => {
    try {
      setLoading(true);
      const res = await api.get('/operations/stats/academic-overview');
      setGlobalStats(res.data);
      
      // Transform breakdown into display data
      const displayData = (res.data.unitBreakdown || []).map((item: any) => ({
        id: item.id,
        name: item.name || `Unit ${item.id}`,
        totalStudents: item.studentCount || 0,
        activeBatches: item.programCount || 0, // Fallback to programs
        centersCount: item.centerCount || 0,
        approvalRate: '100%', 
        pendingReviews: 0
      }));

      setData(displayData);
    } catch (error) {
      console.error('Failed to fetch sub-dept telemetry');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  const columns: ColumnDef<SubDeptStats>[] = [
    {
      accessorKey: 'name',
      header: 'Sub-Department Unit',
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
            <Briefcase className="w-5 h-5" />
          </div>
          <span className="font-black text-slate-900">{row.original.name}</span>
        </div>
      )
    },
    {
      accessorKey: 'totalStudents',
      header: 'Total Students',
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-bold text-slate-900">{row.original.totalStudents.toLocaleString()}</span>
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">Active Roster</span>
        </div>
      )
    },
    {
      accessorKey: 'activeBatches',
      header: 'Active Batches',
      cell: ({ row }) => (
        <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-lg font-bold text-sm">
          {row.original.activeBatches} Batches
        </span>
      )
    },
    {
      accessorKey: 'centersCount',
      header: 'Mapped Centers',
      cell: ({ row }) => (
        <div className="flex items-center gap-2 text-slate-600 font-medium">
          <Building2 className="w-4 h-4 text-slate-400" />
          {row.original.centersCount} Locations
        </div>
      )
    },
    {
      accessorKey: 'pendingReviews',
      header: 'Review Queue',
      cell: ({ row }) => (
        <span className={`font-bold ${row.original.pendingReviews > 20 ? 'text-rose-600' : 'text-amber-600'}`}>
          {row.original.pendingReviews} Pending
        </span>
      )
    },
    {
      accessorKey: 'approvalRate',
      header: 'Quality Index',
      cell: ({ row }) => (
          <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 w-16 bg-slate-100 rounded-full overflow-hidden">
            <div className={`h-full bg-emerald-500`} style={{ width: row.original.approvalRate }} />
          </div>
          <span className="text-xs font-black text-emerald-600">{row.original.approvalRate}</span>
        </div>
      )
    }
  ];

  return (
    <div className="p-8 space-y-8 max-w-[1600px] mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase flex items-center gap-3">
            <Layers className="w-8 h-8 text-indigo-600" />
            Sub-Department Telemetry
          </h1>
          <p className="text-slate-500 font-medium">Institutional monitoring hub for departmental execution layers.</p>
        </div>
        <div className="flex items-center gap-3 bg-white p-2 rounded-2xl border border-slate-200">
           <div className="px-4 py-2 bg-emerald-50 rounded-xl border border-emerald-100 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span className="text-[10px] font-black uppercase text-emerald-600 tracking-widest text-nowrap">Control Layer Active</span>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div 
          onClick={() => openDrillDown('totalStudents', 'Total Unit Students')}
          className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-xl shadow-slate-200/50 cursor-pointer hover:scale-[1.02] active:scale-95 transition-all"
        >
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Unit Students</p>
          <h3 className="text-4xl font-black text-slate-900">{globalStats?.totalStudents || 0}</h3>
          <p className="text-xs font-bold text-slate-500 mt-2 flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-emerald-500" />
            Across 4 Jurisdictions
          </p>
        </div>
        <div 
          onClick={() => openDrillDown('students', 'Global Approval History')}
          className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-xl shadow-slate-200/50 cursor-pointer hover:scale-[1.02] active:scale-95 transition-all"
        >
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Global Approval Rate</p>
          <h3 className="text-4xl font-black text-slate-900">{globalStats?.approvalRate || 0}%</h3>
          <p className="text-xs font-bold text-slate-500 mt-2">Quality Compliance Index</p>
        </div>
        <div 
          onClick={() => openDrillDown('programs', 'Active Program Matrix')}
          className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-xl shadow-slate-200/50 cursor-pointer hover:scale-[1.02] active:scale-95 transition-all"
        >
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Active Batches</p>
          <h3 className="text-4xl font-black text-slate-900">{globalStats?.totalBatches || 0}</h3>
          <p className="text-xs font-bold text-slate-500 mt-2 uppercase tracking-tight">Across all centers</p>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden">
        <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">Departmental Matrix</h2>
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                    placeholder="Filter Units..." 
                    className="pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                />
            </div>
        </div>
        <DataTable 
          columns={columns} 
          data={data} 
          isLoading={loading} 
        />
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-[2rem] p-8 flex gap-6 items-start">
         <div className="w-12 h-12 rounded-2xl bg-amber-500 flex items-center justify-center text-white flex-shrink-0">
            <ShieldCheck className="w-6 h-6" />
         </div>
         <div>
            <h4 className="font-black text-amber-900 uppercase tracking-tight mb-1 text-sm">Read-Only Monitoring Mode</h4>
            <p className="text-amber-700 text-xs font-medium leading-relaxed">
                This dashboard provides a sanitized view of sub-departmental execution. To modify student records, centers, or batches, please use the specialized Administrative tools in the respective Operations sections.
            </p>
         </div>
      </div>

      <DrillDownModal 
        isOpen={drillDown.isOpen}
        onClose={() => setDrillDown({ ...drillDown, isOpen: false })}
        type={drillDown.type}
        title={drillDown.title}
      />
    </div>
  );
}
