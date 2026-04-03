import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { 
  Users, 
  ShieldCheck, 
  Clock, 
  XCircle,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Layers,
  BookOpen,
  School
} from 'lucide-react';

export default function OpsDashboard() {
  const [stats, setStats] = useState<any>({
    totalStudents: 0,
    pendingReviews: 0,
    approvalRate: 0,
    rejectionRate: 0,
    avgApprovalTime: '18.4h',
    trend: [],
    recentActions: [],
    totalBatches: 0
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.get('/operations/stats/academic-overview');
        setStats((prev: any) => ({ ...prev, ...res.data }));
      } catch (error) {
        console.error('Failed to fetch ops stats:', error);
      }
    };
    fetchStats();
  }, []);

  const kpis = [
    { label: 'Total Managed Students', value: stats.totalStudents, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50', trend: '+12%', isPositive: true },
    { label: 'Pending Appraisals', value: stats.pendingReviews, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50', trend: '-5%', isPositive: true },
    { label: 'Institutional Approval %', value: `${stats.approvalRate}%`, icon: ShieldCheck, color: 'text-emerald-600', bg: 'bg-emerald-50', trend: '+2.4%', isPositive: true },
    { label: 'Rejection Velocity', value: `${stats.rejectionRate}%`, icon: XCircle, color: 'text-rose-600', bg: 'bg-rose-50', trend: '+0.8%', isPositive: false },
  ];

  return (
    <div className="p-8 space-y-8 max-w-[1600px] mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Academic Overview</h1>
          <p className="text-slate-500 font-medium">Real-time institutional operations analytics & flow tracking.</p>
        </div>
        <div className="flex items-center gap-3 bg-white p-2 rounded-2xl border border-slate-200 shadow-sm">
           <div className="px-4 py-2 bg-slate-50 rounded-xl border border-slate-100">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Global SLA Target</p>
              <p className="text-sm font-black text-slate-900">24.0 Hours</p>
           </div>
           <div className="px-4 py-2 bg-indigo-50 rounded-xl border border-indigo-100">
              <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Avg. Performance</p>
              <p className="text-sm font-black text-indigo-600">{stats.avgApprovalTime}</p>
           </div>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpis.map((kpi, i) => (
          <div key={i} className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm hover:shadow-xl hover:shadow-slate-200/50 transition-all group">
            <div className="flex items-start justify-between mb-4">
              <div className={`w-12 h-12 rounded-2xl ${kpi.bg} flex items-center justify-center ${kpi.color} group-hover:scale-110 transition-transform`}>
                <kpi.icon className="w-6 h-6" />
              </div>
              <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-black uppercase ${kpi.isPositive ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                {kpi.isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                {kpi.trend}
              </div>
            </div>
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">{kpi.label}</p>
            <h3 className="text-3xl font-black text-slate-900 tracking-tighter">{kpi.value}</h3>
          </div>
        ))}
      </div>

      {/* Sub-Department Pulse */}
      <div className="space-y-4">
         <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-500" />
            Sub-Department Pulse
         </h2>
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.unitBreakdown?.map((unit: any) => (
               <div key={unit.id} className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm hover:border-indigo-200 transition-all group relative overflow-hidden">
                  <div className="relative z-10">
                     <h4 className="text-sm font-black text-slate-900 mb-4 uppercase tracking-wider">{unit.name}</h4>
                     <div className="space-y-4">
                        <div className="flex items-center justify-between">
                           <div className="flex items-center gap-2">
                              <Users className="w-3.5 h-3.5 text-blue-500" />
                              <span className="text-[10px] font-bold text-slate-400 uppercase">Students</span>
                           </div>
                           <span className="text-sm font-black text-slate-900">{unit.studentCount}</span>
                        </div>
                        <div className="flex items-center justify-between">
                           <div className="flex items-center gap-2">
                              <BookOpen className="w-3.5 h-3.5 text-emerald-500" />
                              <span className="text-[10px] font-bold text-slate-400 uppercase">Programs</span>
                           </div>
                           <span className="text-sm font-black text-slate-900">{unit.programCount}</span>
                        </div>
                        <div className="flex items-center justify-between">
                           <div className="flex items-center gap-2">
                              <School className="w-3.5 h-3.5 text-amber-500" />
                              <span className="text-[10px] font-bold text-slate-400 uppercase">Centers</span>
                           </div>
                           <span className="text-sm font-black text-slate-900">{unit.centerCount}</span>
                        </div>
                     </div>
                  </div>
                  <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-slate-50 rounded-full group-hover:bg-indigo-50 group-hover:scale-110 transition-all duration-500" />
               </div>
            ))}
         </div>
      </div>

      {/* Main Analytics Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white rounded-[2.5rem] border border-slate-200 p-8 shadow-sm">
           <div className="flex items-center justify-between mb-10">
              <h3 className="text-xl font-black text-slate-900 uppercase flex items-center gap-3">
                <BarChart3 className="w-6 h-6 text-indigo-500" />
                Admission Velocity Trend
              </h3>
              <select className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500">
                <option>Last 30 Days</option>
                <option>Last 90 Days</option>
              </select>
           </div>
           
           {/* Recharts AreaChart */}
           <div className="h-[400px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.trend}>
                    <defs>
                        <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1}/>
                            <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                        dataKey="month" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}}
                        dy={10}
                    />
                    <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}}
                    />
                    <Tooltip 
                        contentStyle={{ 
                            borderRadius: '16px', 
                            border: 'none', 
                            boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
                            fontSize: '12px',
                            fontWeight: 'bold'
                        }} 
                    />
                    <Area 
                        type="monotone" 
                        dataKey="count" 
                        stroke="#4f46e5" 
                        strokeWidth={3}
                        fillOpacity={1} 
                        fill="url(#colorCount)" 
                    />
                </AreaChart>
              </ResponsiveContainer>
           </div>
        </div>

        <div className="space-y-6">
           <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl shadow-slate-900/40 relative overflow-hidden">
              <h3 className="text-lg font-black uppercase tracking-widest mb-6 relative z-10">Ops Guardrails</h3>
              <ul className="space-y-4 relative z-10">
                {[
                  'Syllabus requirement enforced globally',
                  'Center audit mandatory for enrollment',
                  'SLA timer active for all reviews',
                  'Finance gateway synchronization'
                ].map((rule, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm font-medium text-slate-300">
                    <ShieldCheck className="w-5 h-5 text-indigo-400" />
                    {rule}
                  </li>
                ))}
              </ul>
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-3xl rounded-full" />
           </div>

           <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl shadow-slate-900/40 relative overflow-hidden">
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-6">
                    <ShieldCheck className="w-6 h-6 text-blue-400" />
                    <h4 className="font-black text-sm uppercase tracking-widest">Compliance Engine</h4>
                </div>
                <p className="text-slate-400 text-sm font-medium leading-relaxed mb-6">
                    "Institutional decisions are forensically ratifiable by the global audit ledger. Governance integrity v3 active."
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
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-3xl rounded-full translate-x-1/2 -translate-y-1/2" />
           </div>

           <div className="bg-white rounded-[2.5rem] border border-slate-200 p-8 shadow-sm">
              <h3 className="text-lg font-black text-slate-900 uppercase mb-6">Recent Log Actions</h3>
              <div className="space-y-4">
                 {stats.recentActions && stats.recentActions.length > 0 ? (
                    stats.recentActions.map((log: any, i: number) => (
                    <div key={i} className="flex gap-4 items-start">
                      <div className="w-2 h-2 rounded-full bg-indigo-500 mt-1.5 flex-shrink-0" />
                      <div>
                         <p className="text-sm font-bold text-slate-900">{log.action} {log.entity}</p>
                         <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">
                            {new Date(log.timestamp).toLocaleTimeString()} • {log.user?.name || 'System'}
                         </p>
                      </div>
                    </div>
                  ))) : (
                    <p className="text-sm text-slate-400 font-medium ">No recent academic actions logged.</p>
                  )}
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
