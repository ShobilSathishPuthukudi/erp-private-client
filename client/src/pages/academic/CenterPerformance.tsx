import { useState, useEffect, useMemo } from 'react';
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
  Calendar,
  Info
} from 'lucide-react';
import { Modal } from '@/components/shared/Modal';
import type { ColumnDef } from '@tanstack/react-table';

interface CenterPerf {
  id: number;
  name: string;
  status: string;
  studentCount: number;
  activePrograms: number;
  rejectedCount: number;
  velocity: number;
  reAttemptCount: number;
  avgReviewTime: number;
  approvalRate?: number;
}

export default function CenterPerformance() {
  const [centers, setCenters] = useState<CenterPerf[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCenter, setSelectedCenter] = useState<CenterPerf | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTopStat, setSelectedTopStat] = useState<string | null>(null);

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
      cell: ({ row }) => {
        const total = row.original.studentCount || 0;
        const rejected = row.original.rejectedCount || 0;
        const rate = total > 0 ? Math.max(0, Math.min(100, ((total - rejected) / total) * 100)) : 0;
        
        return (
          <div className="flex items-center gap-2">
              <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-1000 ${rate > 80 ? 'bg-emerald-500' : rate > 50 ? 'bg-amber-500' : 'bg-rose-500'}`} 
                    style={{ width: `${rate}%` }} 
                  />
              </div>
              <span className={`text-xs font-black ${rate > 80 ? 'text-emerald-600' : rate > 50 ? 'text-amber-600' : 'text-rose-600'}`}>
                {rate.toFixed(1)}%
              </span>
          </div>
        );
      }
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
          className="flex items-center gap-2 text-xs font-black uppercase text-indigo-600 hover:text-slate-900 group cursor-pointer"
        >
          Deep Stats
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </button>
      )
    }
  ];

  const topStats = useMemo(() => {
    if (!centers.length) return [
      { label: 'Highest Enrollment', value: '...', icon: Building2, color: 'bg-blue-600' },
      { label: 'Avg Approval Rate', value: '...', icon: TrendingUp, color: 'bg-emerald-600' },
      { label: 'Network Health', value: '...', icon: PieChart, color: 'bg-indigo-600' },
    ];

    const highest = [...centers].sort((a, b) => (b.studentCount || 0) - (a.studentCount || 0))[0];
    
    let totalAll = 0;
    let rejectedAll = 0;
    centers.forEach(c => {
      totalAll += (c.studentCount || 0);
      rejectedAll += (c.rejectedCount || 0);
    });
    const avgRate = totalAll > 0 ? ((totalAll - rejectedAll) / totalAll * 100).toFixed(1) : '0';
    
    const activeCount = centers.filter(c => (c.studentCount || 0) > 0).length;
    const health = centers.length > 0 ? (activeCount / centers.length * 100) : 0;

    return [
      { id: 'enrollment', label: 'Highest Enrollment', value: highest?.name || 'N/A', icon: Building2, color: 'bg-blue-600' },
      { id: 'quality', label: 'Avg Approval Rate', value: `${avgRate}%`, icon: TrendingUp, color: 'bg-emerald-600' },
      { id: 'health', label: 'Network Health', value: health > 80 ? 'Optimal' : health > 50 ? 'Stable' : 'Critical', icon: PieChart, color: 'bg-indigo-600' },
    ];
  }, [centers]);

  return (
    <div className="p-2 space-y-6 flex flex-col h-[calc(100vh-8rem)]">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white px-6 py-5 rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50 gap-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center text-white shadow-lg shadow-slate-900/20 shrink-0">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight leading-tight mb-0.5">Center Performance</h1>
            <p className="text-slate-500 font-medium text-sm">Tracking academic velocity and quality across regional study nodes.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         {topStats.map((stat, i) => (
             <div 
             key={i} 
             onClick={() => setSelectedTopStat(stat.id)}
             className="bg-white p-8 rounded-3xl border border-slate-200 flex items-center justify-between group shadow-sm transition-all hover:shadow-xl hover:-translate-y-1 cursor-pointer active:scale-95"
           >
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

      <div className="bg-white rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden">
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
                    { label: 'Enrollment Velocity', value: `+${selectedCenter?.velocity || 0}`, icon: TrendingUp, color: 'text-emerald-500' },
                    { 
                      label: 'Quality Score', 
                      value: `${(( (selectedCenter?.studentCount||0) - (selectedCenter?.rejectedCount||0) ) / (selectedCenter?.studentCount||1) * 10).toFixed(1)}/10`, 
                      icon: Award, 
                      color: 'text-amber-500' 
                    },
                    { label: 'Avg Review Time', value: `${Number(selectedCenter?.avgReviewTime || 0).toFixed(1)}h`, icon: Calendar, color: 'text-indigo-500' }
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
                    Outcome Distribution (Proxied)
                </h4>
                <div className="space-y-5">
                    {(() => {
                      const total = selectedCenter?.studentCount || 1;
                      const reAttempts = selectedCenter?.reAttemptCount || 0;
                      const reAttemptRate = Math.round((reAttempts / total) * 100);
                      const successRate = 100 - reAttemptRate;
                      
                      return [
                        { label: 'Primary Success (First Attempt)', percentage: successRate, color: 'bg-emerald-500' },
                        { label: 'Support Required (Re-attempts)', percentage: reAttemptRate, color: 'bg-rose-500' }
                      ].map((row, i) => (
                        <div key={i} className="space-y-2">
                            <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                                <span className="text-white/40">{row.label}</span>
                                <span className="text-white">{row.percentage}%</span>
                            </div>
                            <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                                <div className={`h-full ${row.color} shadow-[0_0_10px_rgba(0,0,0,0.2)] transition-all duration-1000`} style={{ width: `${row.percentage}%` }} />
                            </div>
                        </div>
                      ));
                    })()}
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

      <Modal
        isOpen={!!selectedTopStat}
        onClose={() => setSelectedTopStat(null)}
        title={
          selectedTopStat === 'enrollment' ? 'Regional Enrollment Leaderboard' :
          selectedTopStat === 'quality' ? 'Institutional Quality Diagnostic' :
          'Network Health Diagnostic'
        }
      >
        <div className="space-y-6">
          {selectedTopStat === 'enrollment' && (
            <div className="space-y-4">
              <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100 mb-4">
                 <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Top Performer</p>
                 <h3 className="text-xl font-black text-slate-900">{[...centers].sort((a,b)=>b.studentCount-a.studentCount)[0]?.name}</h3>
              </div>
              <div className="space-y-2">
                {[...centers].sort((a,b)=>b.studentCount-a.studentCount).slice(0, 5).map((c, i) => (
                  <div key={c.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px] font-black">{i+1}</span>
                      <span className="font-bold text-slate-800">{c.name}</span>
                    </div>
                    <span className="font-black text-slate-900">{c.studentCount} Students</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {selectedTopStat === 'quality' && (
            <div className="space-y-6">
              {(() => {
                let total = 0, rejected = 0;
                centers.forEach(c => { total += c.studentCount; rejected += c.rejectedCount; });
                const rate = total > 0 ? ((total - rejected) / total * 100).toFixed(1) : 0;
                return (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-100 text-center">
                        <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Global Success</p>
                        <p className="text-2xl font-black text-slate-900">{total - rejected}</p>
                      </div>
                      <div className="bg-rose-50 p-6 rounded-2xl border border-rose-100 text-center">
                        <p className="text-[10px] font-black text-rose-600 uppercase tracking-widest mb-1">Total Rejections</p>
                        <p className="text-2xl font-black text-slate-900">{rejected}</p>
                      </div>
                    </div>
                    <div className="p-6 bg-slate-900 rounded-3xl text-center shadow-xl shadow-slate-900/20">
                      <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-2">Net Institutional Quality</p>
                      <p className="text-4xl font-black text-white">{rate}%</p>
                      <p className="text-[10px] font-medium text-white/30 uppercase tracking-tighter mt-4">Computed across all {centers.length} regional hubs</p>
                    </div>
                  </>
                );
              })()}
            </div>
          )}

          {selectedTopStat === 'health' && (
            <div className="space-y-6">
              {(() => {
                const active = centers.filter(c => c.studentCount > 0).length;
                const ratio = centers.length > 0 ? Math.round((active / centers.length) * 100) : 0;
                const status = ratio > 80 ? 'Optimal' : ratio > 50 ? 'Stable' : 'Critical';
                
                return (
                  <>
                    <div className="flex items-center gap-6 p-6 bg-slate-50 rounded-2xl border border-slate-100">
                      <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-white shadow-lg ${ratio > 80 ? 'bg-emerald-500 shadow-emerald-500/20' : ratio > 50 ? 'bg-amber-500 shadow-amber-500/20' : 'bg-rose-500 shadow-rose-500/20'}`}>
                        <PieChart className="w-8 h-8" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Active Node Ratio</p>
                        <h3 className="text-2xl font-black text-slate-900">{active} / {centers.length} Centers</h3>
                      </div>
                    </div>

                    <div className="bg-indigo-50 p-6 rounded-2xl border border-indigo-100">
                      <h4 className="text-xs font-black text-indigo-600 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <Info className="w-4 h-4" />
                        Strategic Thresholds
                      </h4>
                      <div className="space-y-4">
                        {[
                          { label: 'Optimal Status', range: '> 80%', desc: 'Highly productive network velocity', color: 'text-emerald-600' },
                          { label: 'Stable Status', range: '> 50%', desc: 'Health majority operational', color: 'text-amber-600' },
                          { label: 'Critical Status', range: '≤ 50%', desc: 'High systemic latency / Underutilization', color: 'text-rose-600' }
                        ].map((t, i) => (
                          <div key={i} className="flex justify-between items-start">
                            <div>
                              <p className={`text-[11px] font-black uppercase ${t.color}`}>{t.label}</p>
                              <p className="text-[10px] font-medium text-slate-500 tracking-tight">{t.desc}</p>
                            </div>
                            <span className="font-mono text-xs font-bold text-slate-400">{t.range}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className={`p-6 rounded-2xl border text-center ${status === 'Optimal' ? 'bg-emerald-50 border-emerald-100 text-emerald-900' : status === 'Stable' ? 'bg-amber-50 border-amber-100 text-amber-900' : 'bg-rose-50 border-rose-100 text-rose-900'}`}>
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-1">Diagnostic Result</p>
                      <p className="text-xl font-black">{status.toUpperCase()}</p>
                      <p className="text-[10px] font-medium opacity-60 mt-2 italic">Current ratio is {ratio}%</p>
                    </div>
                  </>
                );
              })()}
            </div>
          )}

          <div className="pt-4 flex justify-end">
            <button 
              onClick={() => setSelectedTopStat(null)}
              className="px-8 py-3 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-800 transition-all active:scale-95 shadow-xl shadow-slate-900/20"
            >
              Dismiss Diagnostic
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
