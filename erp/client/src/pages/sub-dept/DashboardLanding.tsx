import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { 
  BookOpen, 
  Users, 
  ShieldCheck, 
  TrendingUp,
  ArrowRight,
  LayoutDashboard,
  GraduationCap
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';

export default function DashboardLanding() {
  const user = useAuthStore(state => state.user);
  const portalName = user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'Sub-department';
  
  const [stats, setStats] = useState({
    totalPrograms: 0,
    totalStudents: 0,
    pendingVerifications: 0,
    revenue: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await api.get('/sub-dept/stats');
      setStats(res.data);
    } catch (error) {
      console.error('Sub-dept stats fetch failed');
    } finally {
      setLoading(false);
    }
  };

  const kpis = [
    { label: 'Assigned Programs', value: stats.totalPrograms, icon: BookOpen, color: 'bg-indigo-600', trend: 'Jurisdictional Portfolio' },
    { label: 'Total Students', value: stats.totalStudents, icon: Users, color: 'bg-blue-500', trend: 'Active Enrollment' },
    { label: 'Pending Appraisals', value: stats.pendingVerifications, icon: ShieldCheck, color: 'bg-amber-500', trend: 'Action Required' },
    { label: 'Sub-Dept Revenue', value: `₹${(stats.revenue / 100000).toFixed(1)}L`, icon: TrendingUp, color: 'bg-emerald-500', trend: 'Financial Contribution' },
  ];

  const quickLinks = [
    { title: 'Academic Portfolio', path: 'programs', icon: BookOpen, desc: 'Manage assigned curriculum' },
    { title: 'Student Roster', path: 'students', icon: GraduationCap, desc: 'Jurisdictional enrollment view' },
    { title: 'Accreditation Queue', path: 'accreditation', icon: ShieldCheck, desc: 'Review center interests' },
    { title: 'Team Governance', path: 'team', icon: Users, desc: 'Manage personnel & tasks' },
  ];

  if (loading) return <div className="p-12 text-center animate-pulse text-slate-400 font-black uppercase tracking-widest">Syncing Jurisdictional Mesh...</div>;

  return (
    <div className="space-y-10 pb-12">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
            <div className="flex items-center gap-3 text-blue-600 mb-2">
                <LayoutDashboard className="w-5 h-5" />
                <span className="text-[10px] font-black uppercase tracking-[0.3em]">Operational Command</span>
            </div>
            <h1 className="text-5xl font-black text-slate-900 tracking-tighter uppercase italic">
                {portalName} <span className="text-blue-600 font-outline-2">Panel</span>
            </h1>
            <p className="text-slate-400 font-medium max-w-xl leading-relaxed">
                Welcome to the institutional governance center for <span className="text-slate-900 font-bold">{portalName}</span> operations. 
                Monitor curriculum health, student progression, and departmental performance in real-time.
            </p>
        </div>
        <div className="bg-slate-900 text-white px-8 py-4 rounded-[2rem] shadow-xl shadow-slate-200 hidden lg:block">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Session Protocol</p>
            <p className="font-mono text-lg font-black tracking-tighter">OS-V3-LIVE-ACTIVE</p>
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
              <p className="text-5xl font-black text-slate-900 tracking-tighter mb-1">{kpi.value.toLocaleString()}</p>
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-4">{kpi.label}</p>
              <div className="pt-4 border-t border-slate-50 flex items-center justify-between">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-tight">{kpi.trend}</span>
                <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-slate-900 group-hover:translate-x-1 transition-all" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Action Mesh & Recent */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Core Actions */}
        <div className="lg:col-span-2 space-y-6">
            <h3 className="text-xl font-black text-slate-900 px-2 uppercase tracking-tight">Governance Shortcuts</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {quickLinks.map((link, idx) => (
                    <Link 
                      key={idx} 
                      to={link.path}
                      className="bg-white p-6 rounded-[2rem] border border-slate-100 hover:border-blue-600 transition-all group flex items-start gap-5 shadow-sm hover:shadow-lg"
                    >
                        <div className="w-14 h-14 rounded-2xl bg-slate-50 text-slate-900 flex items-center justify-center shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                            <link.icon className="w-6 h-6" />
                        </div>
                        <div className="py-1">
                            <h4 className="font-black text-slate-900 uppercase tracking-tight group-hover:text-blue-600 transition-colors">{link.title}</h4>
                            <p className="text-xs text-slate-400 font-medium leading-relaxed mt-1">{link.desc}</p>
                        </div>
                    </Link>
                ))}
            </div>
        </div>

        {/* Security & Audit Pulse */}
        <div className="space-y-6">
            <h3 className="text-xl font-black text-slate-900 px-2 uppercase tracking-tight">Institutional Pulse</h3>
            <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl shadow-slate-900/30 space-y-6 relative overflow-hidden">
                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-6">
                        <ShieldCheck className="w-6 h-6 text-blue-400" />
                        <h4 className="font-black text-sm uppercase tracking-widest">Compliance Engine</h4>
                    </div>
                    <p className="text-slate-400 text-sm font-medium leading-relaxed mb-6 italic font-serif">
                        "Decisions made within this jurisdiction are forensically ratifiable by the global audit ledger."
                    </p>
                    <div className="p-4 bg-white/5 border border-white/10 rounded-2xl">
                         <div className="flex justify-between items-center mb-2">
                             <span className="text-[10px] font-black uppercase text-slate-500">Audit Status</span>
                             <span className="text-[10px] font-black uppercase text-emerald-400 tracking-widest">Certified</span>
                         </div>
                         <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                             <div className="w-3/4 h-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
                         </div>
                    </div>
                </div>
                
                {/* Abstract overlay */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 blur-3xl rounded-full translate-x-1/2 -translate-y-1/2" />
            </div>
        </div>
      </div>
    </div>
  );
}
