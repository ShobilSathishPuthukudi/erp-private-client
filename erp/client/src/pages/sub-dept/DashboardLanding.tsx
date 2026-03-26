import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '@/lib/api';
import { 
  BookOpen, 
  Users, 
  CheckSquare,
  ArrowRight,
  LayoutDashboard,
  GraduationCap,
  Building2,
  PieChart
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

export default function DashboardLanding() {
  const { unit } = useParams();
  const user = useAuthStore(state => state.user);
  const portalName = unit ? (unit.charAt(0).toUpperCase() + unit.slice(1)) : (user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'Sub-department');
  
  const [stats, setStats] = useState({
    totalUniversities: 0,
    activePrograms: 0,
    pendingReviews: 0,
    revenue: 0,
    approvalRate: 0,
    totalStudents: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, [unit]);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const subDeptMap: Record<string, number> = { 'openschool': 8, 'online': 9, 'skill': 10, 'bvoc': 11 };
      const subDeptId = unit ? subDeptMap[unit.toLowerCase()] : null;

      const res = await api.get('/operations/stats/academic-overview', {
        params: { subDeptId }
      });
      setStats({
          ...stats,
          ...res.data,
      });
    } catch (error) {
      console.error('Sub-dept stats fetch failed');
    } finally {
      setLoading(false);
    }
  };

  const kpis = [
    { label: 'Pending Student Reviews', value: stats.pendingReviews || 0, icon: Users, color: 'bg-amber-500', trend: 'Admission Execution' },
    { label: 'Unit Approval Rate', value: `${stats.approvalRate || 0}%`, icon: CheckSquare, color: 'bg-blue-500', trend: 'Academic Quality' },
    { label: 'Active Batches', value: 3, icon: LayoutDashboard, color: 'bg-indigo-600', trend: 'Live Enrollment' },
    { label: 'Jurisdictional Students', value: stats.totalStudents || 0, icon: GraduationCap, color: 'bg-emerald-500', trend: 'Unit Growth' },
  ];

  if (loading) return <div className="p-12 text-center animate-pulse text-slate-400 font-black uppercase tracking-widest">Syncing Jurisdictional Hub...</div>;

  return (
    <div className="space-y-10 pb-12">
      {/* Identity Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
            <div className="flex items-center gap-3 text-blue-600 mb-2 font-black uppercase tracking-[0.3em] text-[10px]">
                <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center text-white">
                    <PieChart className="w-3 h-3" />
                </div>
                Academic Unit Execution
            </div>
            <h1 className="text-5xl font-black text-slate-900 tracking-tighter uppercase">
                {portalName} <span className="text-blue-600 font-outline-2">Unit</span>
            </h1>
            <div className="flex items-center gap-6 mt-4">
                <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-slate-400" />
                    <span className="text-sm font-bold text-slate-600 uppercase tracking-tighter">Assigned Universities: <span className="text-slate-900">{stats.totalUniversities || 0}</span></span>
                </div>
                <div className="flex items-center gap-2 border-l border-slate-200 pl-6">
                    <BookOpen className="w-4 h-4 text-slate-400" />
                    <span className="text-sm font-bold text-slate-600 uppercase tracking-tighter">Assigned Programs: <span className="text-slate-900">{stats.activePrograms || 0}</span></span>
                    <span className="text-[10px] font-medium text-slate-400 ml-1">(Read-only)</span>
                </div>
            </div>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpis.map((kpi, idx) => (
          <div key={idx} className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-slate-200/50 transition-all group overflow-hidden relative">
            <div className={`absolute top-0 right-0 w-32 h-32 ${kpi.color} opacity-[0.03] rounded-full translate-x-12 -translate-y-12 group-hover:scale-110 transition-transform`} />
            <div className="relative z-10">
              <div className={`${kpi.color} w-12 h-12 rounded-2xl flex items-center justify-center text-white mb-6 shadow-lg shadow-${kpi.color.split('-')[1]}-200`}>
                <kpi.icon className="w-6 h-6" />
              </div>
              <p className="text-5xl font-black text-slate-900 tracking-tighter mb-1">{typeof kpi.value === 'number' ? kpi.value.toLocaleString() : kpi.value}</p>
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-4">{kpi.label}</p>
              <div className="pt-4 border-t border-slate-50 flex items-center justify-between">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-tight">{kpi.trend}</span>
                <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-slate-900 group-hover:translate-x-1 transition-all" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
