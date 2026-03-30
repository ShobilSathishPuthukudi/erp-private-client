import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import { Users, IndianRupee, Building2, BookOpen, MapPin, TrendingUp, TrendingDown, Minus, Zap, X, ArrowRight, Activity, Clock, ShieldAlert, AlertTriangle, CheckCircle2, Wallet } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { format } from 'date-fns';

interface Metrics {
  totalStudents: number;
  totalUniversities: number;
  totalPrograms: number;
  totalFundAcquired: number;
  revenueMTD: number;
  revenueYTD: number;
  activeCenters: number;
  overdueTasks: number;
  pendingLeaves: number;
  auditExceptions: number;
  enrollmentTrend: any[];
  revenueTrend: any[];
  taskCompletionRate: number;
  avgTaskTime: number;
  avgCycleTime: number;
  productivityScore: number;
  highValuePending: number;
  revealRequests: number;
  visibilityScope?: string[];
  departmentalBreakdown?: Array<{
    id: number;
    name: string;
    students: number;
    revenue: number;
    overdueTasks: number;
    pendingLeaves: number;
  }>;
  salesIntelligence?: {
    totalLeads: number;
    convertedLeads: number;
    avgLeadAge: number;
  } | null;
}

export default function Overview({ view }: { view: 'kpis' | 'trends' }) {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedBrief, setSelectedBrief] = useState<{ type: string; title: string; dId?: number } | null>(null);
  const [briefData, setBriefData] = useState<any>(null);
  const [briefLoading, setBriefLoading] = useState(false);

  useEffect(() => {
    fetchMetrics();
  }, []);

  useEffect(() => {
    if (selectedBrief) {
      fetchBriefDetails();
      document.body.style.overflow = 'hidden';
      document.body.classList.add('modal-open-blur');
    } else {
      document.body.style.overflow = 'auto';
      document.body.classList.remove('modal-open-blur');
    }
    return () => {
      document.body.style.overflow = 'auto';
      document.body.classList.remove('modal-open-blur');
    };
  }, [selectedBrief]);

  const fetchMetrics = async () => {
    try {
      const res = await api.get('/ceo/metrics');
      setMetrics(res.data);
    } catch (error) {
      toast.error('Failed to load global metrics');
    } finally {
      setLoading(false);
    }
  };

  const fetchBriefDetails = async () => {
    if (!selectedBrief) return;
    try {
      setBriefLoading(true);
      const url = `/ceo/details/${selectedBrief.type}${selectedBrief.dId ? `?dId=${selectedBrief.dId}` : ''}`;
      const res = await api.get(url);
      setBriefData(res.data);
    } catch (error) {
      toast.error('Failed to load details');
    } finally {
      setBriefLoading(false);
    }
  };

  const getStatusColor = (current: number, target: number) => {
    const ratio = current / target;
    if (ratio >= 1) return 'emerald';
    if (ratio >= 0.8) return 'amber';
    return 'red';
  };

  const KPIStore = [
    { type: 'universities', title: 'Total Universities', value: metrics?.totalUniversities || 0, icon: Building2, target: 5, suffix: '', color: 'slate' },
    { type: 'programs', title: 'Total Programs', value: metrics?.totalPrograms || 0, icon: BookOpen, target: 50, suffix: '', color: 'slate' },
    { type: 'students', title: 'Enrolled Students', value: metrics?.totalStudents || 0, icon: Users, target: 1000, suffix: '', color: getStatusColor(metrics?.totalStudents || 0, 1000) },
    { type: 'revenue', title: 'Fees Collected (MTD)', value: metrics?.revenueMTD || 0, icon: IndianRupee, target: 500000, suffix: '₹', color: getStatusColor(metrics?.revenueMTD || 0, 500000) },
    { type: 'revenue', title: 'Fees Collected (YTD)', value: metrics?.revenueYTD || 0, icon: IndianRupee, target: 5000000, suffix: '₹', color: getStatusColor(metrics?.revenueYTD || 0, 5000000) },
    { type: 'revenue', title: 'Total Fund Acquired', value: metrics?.totalFundAcquired || 0, icon: IndianRupee, target: 10000000, suffix: '₹', color: 'indigo' },
    { type: 'centers', title: 'Active Study Centers', value: metrics?.activeCenters || 0, icon: MapPin, target: 20, suffix: '', color: getStatusColor(metrics?.activeCenters || 0, 20) },
  ];

  const PerformanceStore = [
    { title: 'Productivity Score', value: metrics?.productivityScore || 0, icon: Activity, target: 90, suffix: '%', color: (metrics?.productivityScore || 0) >= 85 ? 'emerald' : 'amber' },
    { title: 'Task Completion', value: metrics?.taskCompletionRate || 0, icon: CheckCircle2, target: 95, suffix: '%', color: (metrics?.taskCompletionRate || 0) >= 90 ? 'emerald' : 'amber' },
    { title: 'Avg Completion', value: metrics?.avgTaskTime || 0, icon: Clock, target: 24, suffix: 'h', color: (metrics?.avgTaskTime || 0) <= 24 ? 'emerald' : 'amber' },
    { title: 'Admission Cycle', value: metrics?.avgCycleTime || 0, icon: TrendingUp, target: 7, suffix: 'd', color: (metrics?.avgCycleTime || 0) <= 7 ? 'emerald' : 'amber' },
  ];

  const RiskStore = [
    { title: 'High-Value Pending', value: metrics?.highValuePending || 0, icon: Wallet, target: 0, suffix: '', color: (metrics?.highValuePending || 0) > 0 ? 'red' : 'emerald' },
    { title: 'Security Reveals', value: metrics?.revealRequests || 0, icon: ShieldAlert, target: 0, suffix: '', color: (metrics?.revealRequests || 0) > 0 ? 'red' : 'emerald' },
    { title: 'Audit Exceptions', value: metrics?.auditExceptions || 0, icon: AlertTriangle, target: 0, suffix: '', color: (metrics?.auditExceptions || 0) > 10 ? 'red' : 'amber' },
    { title: 'Aged Escalations', value: metrics?.overdueTasks || 0, icon: Clock, target: 5, suffix: '', color: (metrics?.overdueTasks || 0) > 5 ? 'red' : 'amber' },
  ];

  if (loading || !metrics) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  if (view === 'kpis') {
    return (
      <div className="space-y-6">
        {metrics.visibilityScope && metrics.visibilityScope.length > 0 && (
          <div className="flex items-center gap-3 bg-blue-50/50 border border-blue-100 p-4 rounded-3xl mb-10 shadow-sm shadow-blue-500/5">
            <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-600/20">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest leading-none mb-1">Active Governance Scope</p>
              <div className="flex items-center gap-2">
                <span className="text-sm font-black text-slate-900 uppercase tracking-tight">
                  {metrics.visibilityScope.join(' • ')}
                </span>
                <span className="text-[10px] font-bold text-slate-400 italic">(Partitioned Executive Identity)</span>
              </div>
            </div>
          </div>
        )}
        {/* Primary Core KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {KPIStore.map((kpi, idx) => (
            <div 
              key={idx} 
              onClick={() => setSelectedBrief({ type: kpi.type, title: kpi.title })}
              className="bg-white p-7 rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/40 relative overflow-hidden group hover:-translate-y-1 transition-all duration-300 cursor-pointer"
            >
              <div className={`absolute top-0 right-0 w-24 h-24 bg-${kpi.color}-50 rounded-bl-[80px] -z-0 transition-transform group-hover:scale-110`}></div>
              
              <div className="relative z-10">
                <div className={`w-12 h-12 rounded-2xl bg-white border border-slate-100 shadow-sm flex items-center justify-center mb-6 text-${kpi.color}-600 group-hover:bg-slate-900 group-hover:text-white transition-all`}>
                  <kpi.icon className="w-6 h-6" />
                </div>
                
                <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.15em] mb-1">{kpi.title}</p>
                <h3 className="text-3xl font-black text-slate-900 tracking-tight">
                  {kpi.suffix}{kpi.value.toLocaleString()}
                </h3>
                
                <div className="mt-6 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    {kpi.color === 'emerald' && <TrendingUp className="w-4 h-4 text-emerald-500" />}
                    {kpi.color === 'amber' && <Minus className="w-4 h-4 text-amber-500" />}
                    {kpi.color === 'red' && <TrendingDown className="w-4 h-4 text-red-500" />}
                    <span className={`text-[10px] font-black uppercase tracking-wider text-${kpi.color}-600`}>
                      {kpi.color === 'slate' ? 'Global Stat' : (kpi.color === 'emerald' ? 'On Track' : kpi.color === 'amber' ? 'Off Target' : 'Critical')}
                    </span>
                  </div>
                  <div className="text-[10px] font-bold text-slate-300">Goal: {kpi.suffix}{kpi.target.toLocaleString()}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Executive Performance & Productivity Section */}
        <div className="mt-12 pt-12 border-t border-slate-100/50">
           <div className="flex items-center justify-between mb-8">
             <div>
               <h3 className="text-xl font-black text-slate-900 tracking-tight">Executive Performance Suite</h3>
               <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Cross-Functional Efficiency & Cycle Monitoring</p>
             </div>
           </div>
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {PerformanceStore.map((kpi, idx) => (
                <div key={idx} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-lg shadow-slate-200/20 relative overflow-hidden group">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-2xl bg-${kpi.color}-50 flex items-center justify-center text-${kpi.color}-600 group-hover:bg-slate-900 group-hover:text-white transition-all`}>
                      <kpi.icon className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1.5">{kpi.title}</p>
                      <h4 className="text-2xl font-black text-slate-900">{kpi.value}{kpi.suffix}</h4>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-slate-50 flex items-center justify-between">
                    <span className="text-[9px] font-bold text-slate-300 uppercase">Target: {kpi.target}{kpi.suffix}</span>
                    <div className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-${kpi.color}-100 text-${kpi.color}-700`}>
                      {kpi.color === 'emerald' ? 'Elite' : 'Attention'}
                    </div>
                  </div>
                </div>
              ))}
           </div>
        </div>

        {/* Systemic Risks & Compliance Section */}
        <div className="mt-12 pt-12 border-t border-slate-100/50">
           <div className="flex items-center justify-between mb-8">
             <div>
               <h3 className="text-xl font-black text-slate-900 tracking-tight">Systemic Risk & Compliance</h3>
               <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Institutional Vulnerability & Security Telemetry</p>
             </div>
             <button onClick={() => navigate('/dashboard/ceo/escalations')} className="text-[10px] font-black bg-rose-50 text-rose-600 px-4 py-2 rounded-full uppercase tracking-widest hover:bg-rose-600 hover:text-white transition-all">
               Escalation Inbox
             </button>
           </div>
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {RiskStore.map((kpi, idx) => (
                <div key={idx} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-lg shadow-slate-200/20 relative overflow-hidden group">
                   <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-2xl bg-${kpi.color === 'red' ? 'rose' : kpi.color}-50 flex items-center justify-center text-${kpi.color === 'red' ? 'rose' : kpi.color}-600`}>
                      <kpi.icon className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1.5">{kpi.title}</p>
                      <h4 className="text-2xl font-black text-slate-900">{kpi.value}{kpi.suffix}</h4>
                    </div>
                  </div>
                  <div className={`mt-4 pt-4 border-t border-slate-50 flex items-center justify-between`}>
                    <span className="text-[9px] font-bold text-slate-300 uppercase">Alert Threshold: {kpi.target}</span>
                    <div className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest ${kpi.color === 'red' ? 'bg-rose-100 text-rose-700 animate-pulse' : `bg-${kpi.color}-100 text-${kpi.color}-700`}`}>
                      {kpi.color === 'red' ? 'Escalated' : (kpi.color === 'amber' ? 'Guarded' : 'Secured')}
                    </div>
                  </div>
                </div>
              ))}
           </div>
        </div>

        {/* [NEW] Sales Intelligence Section - Strictly for Sales Scope */}
        {metrics.salesIntelligence && (
          <div className="mt-12 pt-12 border-t border-slate-100/50 animate-in fade-in slide-in-from-bottom-8 duration-1000">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                  Sector Intelligence: Sales
                  <span className="px-2 py-0.5 bg-blue-600 text-white text-[9px] rounded-md font-black uppercase tracking-widest">Strictly Added</span>
                </h3>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Lead Conversion Analytics & Revenue Pipeline Velocity</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Conversion Score */}
              <div className="bg-slate-900 p-8 rounded-[40px] text-white relative overflow-hidden group shadow-2xl shadow-slate-900/40">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-bl-[100px] -z-0"></div>
                <div className="relative z-10">
                  <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-4">Lead Conversion Efficiency</p>
                  <div className="flex items-baseline gap-2">
                    <h4 className="text-5xl font-black italic">
                      {metrics.salesIntelligence.totalLeads > 0 
                        ? Math.round((metrics.salesIntelligence.convertedLeads / metrics.salesIntelligence.totalLeads) * 100) 
                        : 0}%
                    </h4>
                    <span className="text-blue-400 font-black text-sm uppercase tracking-tighter">Conversion Rate</span>
                  </div>
                  <div className="mt-8 flex items-center gap-4">
                    <div className="h-1.5 flex-1 bg-white/10 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-blue-500 rounded-full" 
                        style={{ width: `${metrics.salesIntelligence.totalLeads > 0 ? (metrics.salesIntelligence.convertedLeads / metrics.salesIntelligence.totalLeads) * 100 : 0}%` }}
                      ></div>
                    </div>
                    <span className="text-[10px] font-black text-white/40">{metrics.salesIntelligence.convertedLeads}/{metrics.salesIntelligence.totalLeads} Converted</span>
                  </div>
                </div>
              </div>

              {/* Lead Aging */}
              <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-xl shadow-slate-200/40 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-rose-50 rounded-bl-[100px] -z-0"></div>
                <div className="relative z-10">
                  <div className="w-12 h-12 rounded-2xl bg-rose-600 flex items-center justify-center text-white mb-6 shadow-lg shadow-rose-600/20">
                    <Zap className="w-6 h-6" />
                  </div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Pipeline Velocity</p>
                  <h4 className="text-3xl font-black text-slate-900 tracking-tight mb-2">
                    {metrics.salesIntelligence.avgLeadAge} Days
                  </h4>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Avg Time to Institutional Enrollment</p>
                  
                  <div className="mt-8 p-4 bg-rose-50 rounded-2xl border border-rose-100">
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="w-4 h-4 text-rose-600" />
                      <span className="text-[10px] font-bold text-rose-700 uppercase tracking-tight">SLA Guard: 7 Days Max</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* BDE Productivity Index */}
              <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-xl shadow-slate-200/40 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-bl-[100px] -z-0"></div>
                <div className="relative z-10">
                  <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white mb-6 shadow-lg shadow-blue-600/20">
                    <Users className="w-6 h-6" />
                  </div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Strategic Acquisition Index</p>
                  <h4 className="text-3xl font-black text-slate-900 tracking-tight mb-2">94.8</h4>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">BDE Cumulative Performance Rating</p>
                  
                  <div className="mt-8 flex items-center gap-2">
                    {[1,2,3,4,5].map(i => (
                      <div key={i} className={`h-1.5 w-6 rounded-full ${i <= 4 ? 'bg-blue-600' : 'bg-slate-100'}`}></div>
                    ))}
                    <span className="text-[10px] font-black text-blue-600 ml-2">Tier-1 Sector</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {metrics.departmentalBreakdown && metrics.departmentalBreakdown.length > 0 && (
          <div className="mt-12 space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-black text-slate-900 tracking-tight">Departmental Pulse</h3>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Comparative Analysis • Permitted Governance Data</p>
              </div>
              <div className="text-[10px] font-black bg-slate-900 text-white px-4 py-2 rounded-full uppercase tracking-widest shadow-xl shadow-slate-900/20">
                Deep Dive: {metrics.departmentalBreakdown.length} Sectors
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 bg-white p-8 rounded-[40px] border border-slate-100 shadow-xl shadow-slate-200/40">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest">Revenue vs Acquisition</h4>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Institutional Contributions</p>
                  </div>
                </div>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%" minHeight={250}>
                    <BarChart data={metrics.departmentalBreakdown}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 900, fill: '#64748b' }} />
                      <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                      <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                      <Tooltip 
                        cursor={{ fill: '#f8fafc' }} 
                        contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.15)', padding: '16px' }} 
                      />
                      <Bar yAxisId="left" dataKey="revenue" fill="#0f172a" radius={[6, 6, 0, 0]} barSize={40} name="Revenue (₹)" />
                      <Bar yAxisId="right" dataKey="students" fill="#3b82f6" radius={[6, 6, 0, 0]} barSize={40} name="Students" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="space-y-4">
                {metrics.departmentalBreakdown.map((dept, idx) => (
                  <div 
                    key={idx} 
                    onClick={() => setSelectedBrief({ type: 'department', title: `${dept.name} Sector Brief`, dId: dept.id })}
                    className="bg-slate-900 p-6 rounded-[32px] text-white shadow-2xl relative overflow-hidden group cursor-pointer hover:scale-[1.02] transition-all"
                  >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-bl-[100px] -z-0"></div>
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400">{dept.name} Sector</span>
                        <div className="flex items-center gap-1">
                           <div className={`w-1.5 h-1.5 rounded-full ${dept.overdueTasks > 5 ? 'bg-red-400 animate-pulse' : 'bg-emerald-400'}`}></div>
                           <span className="text-[9px] font-bold uppercase tracking-widest text-white/40">Status: {dept.overdueTasks > 5 ? 'High Risk' : 'Healthy'}</span>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                         <div>
                            <p className="text-[9px] font-bold text-white/40 uppercase tracking-widest mb-1">Students</p>
                            <h5 className="text-xl font-black">{dept.students.toLocaleString()}</h5>
                         </div>
                         <div>
                            <p className="text-[9px] font-bold text-white/40 uppercase tracking-widest mb-1">Revenue</p>
                            <h5 className="text-xl font-black">₹{(dept.revenue / 1000).toFixed(1)}K</h5>
                         </div>
                      </div>
                      <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between">
                         <div className="flex items-center gap-3">
                            <div className="text-center">
                               <p className="text-[9px] font-bold text-white/30 uppercase tracking-widest mb-0.5">Alerts</p>
                               <p className={`text-xs font-black ${dept.overdueTasks > 0 ? 'text-amber-400' : 'text-slate-500'}`}>{dept.overdueTasks}</p>
                            </div>
                            <div className="w-px h-6 bg-white/10 mx-1"></div>
                            <div className="text-center">
                               <p className="text-[9px] font-bold text-white/30 uppercase tracking-widest mb-0.5">Leaves</p>
                               <p className="text-xs font-black text-slate-400">{dept.pendingLeaves}</p>
                            </div>
                         </div>
                         <button className="p-2.5 bg-white/10 rounded-xl hover:bg-white/20 transition-all">
                            <TrendingUp className="w-4 h-4 text-white" />
                         </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {selectedBrief && createPortal(
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-2xl rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
              <div className="px-10 py-8 border-b border-slate-50 flex items-center justify-between bg-white">
                <div className="flex items-center gap-4">
                   <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center text-white shadow-lg">
                      {selectedBrief.type === 'students' && <Users className="w-6 h-6" />}
                      {selectedBrief.type === 'revenue' && <IndianRupee className="w-6 h-6" />}
                      {selectedBrief.type === 'department' && <Building2 className="w-6 h-6" />}
                      {!['students', 'revenue', 'department'].includes(selectedBrief.type) && <Zap className="w-6 h-6" />}
                   </div>
                   <div>
                      <h3 className="text-xl font-black text-slate-900 tracking-tight">{selectedBrief.title}</h3>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Live Governance Drill-down</p>
                   </div>
                </div>
                <button 
                  onClick={() => { setSelectedBrief(null); setBriefData(null); }}
                  className="p-3 hover:bg-white hover:shadow-sm rounded-2xl transition-all text-slate-400"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-10 max-h-[60vh] overflow-y-auto">
                {briefLoading ? (
                  <div className="flex flex-col items-center justify-center py-20 space-y-4">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-slate-900"></div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest animate-pulse">Fetching Deep Insights...</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {selectedBrief.type === 'department' && briefData && (
                      <div className="space-y-8">
                         <div className="grid grid-cols-2 gap-6">
                            <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Total Students</p>
                               <h4 className="text-2xl font-black text-slate-900">{briefData.students.toLocaleString()}</h4>
                            </div>
                            <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Total Revenue</p>
                               <h4 className="text-2xl font-black text-slate-900">₹{briefData.revenue.toLocaleString()}</h4>
                            </div>
                         </div>
                         <div>
                            <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Leadership Context</h5>
                            <div className="flex items-center gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                               <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 font-black text-lg">
                                 {briefData.admin?.name?.charAt(0) || 'D'}
                               </div>
                               <div>
                                 <div className="text-sm font-black text-slate-900">{briefData.admin?.name || 'Unassigned'}</div>
                                 <div className="text-xs font-bold text-slate-400 mt-0.5">{briefData.admin?.email || 'N/A'}</div>
                                 <div className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mt-1">Designated Dept Admin</div>
                               </div>
                            </div>
                         </div>
                      </div>
                    )}

                    {(selectedBrief.type === 'universities' || selectedBrief.type === 'centers') && Array.isArray(briefData) && (
                      <div className="space-y-3">
                         <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Institutional Portfolios</h5>
                         {briefData.map((dept: any) => (
                           <div key={dept.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:border-slate-200 transition-all group">
                              <div className="flex items-center gap-3">
                                 <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-slate-400 group-hover:bg-slate-900 group-hover:text-white transition-all">
                                   <Building2 className="w-5 h-5" />
                                 </div>
                                 <div>
                                   <div className="text-sm font-black text-slate-900">{dept.name}</div>
                                   <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{dept.type}</div>
                                 </div>
                              </div>
                              <div className="text-right">
                                 <div className="text-[10px] font-black text-slate-900 uppercase tracking-wider">{dept.admin?.name || 'Unassigned'}</div>
                                 <div className="text-[9px] font-bold text-slate-400 uppercase">Administrator</div>
                              </div>
                           </div>
                         ))}
                      </div>
                    )}

                    {selectedBrief.type === 'students' && Array.isArray(briefData) && (
                      <div className="space-y-3">
                        <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Latest Accessions</h5>
                        {briefData.map((student: any) => (
                          <div key={student.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:border-slate-200 transition-all group">
                             <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-slate-400 group-hover:bg-slate-900 group-hover:text-white transition-all">
                                  <Users className="w-5 h-5" />
                                </div>
                                <div>
                                  <div className="text-sm font-black text-slate-900">{student.name}</div>
                                  <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{student.department?.name}</div>
                                </div>
                             </div>
                             <div className="text-right">
                                <div className="text-[10px] font-black text-slate-900 uppercase tracking-wider">{student.status}</div>
                                <div className="text-[9px] font-bold text-slate-400">{format(new Date(student.createdAt), 'MMM dd, yyyy')}</div>
                             </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {selectedBrief.type === 'revenue' && Array.isArray(briefData) && (
                      <div className="space-y-3">
                         <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Recent Verified Collections</h5>
                         {briefData.map((inv: any, idx: number) => (
                           <div key={idx} className="flex items-center justify-between p-4 bg-emerald-50/30 rounded-2xl border border-emerald-100/50 hover:bg-emerald-50 transition-all">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center text-white shadow-lg">
                                   <IndianRupee className="w-5 h-5" />
                                </div>
                                <div>
                                   <div className="text-sm font-black text-slate-900">{inv.invoiceNo}</div>
                                   <div className="text-[9px] font-bold text-teal-600 uppercase tracking-widest font-black italic">{inv.student?.name}</div>
                                </div>
                              </div>
                              <div className="text-right">
                                 <div className="text-sm font-black text-slate-900">₹{inv.total.toLocaleString()}</div>
                                 <div className="text-[9px] font-bold text-slate-400 tracking-widest">{format(new Date(inv.createdAt), 'MMM dd, yyyy')}</div>
                              </div>
                           </div>
                         ))}
                      </div>
                    )}

                    {!briefData || (Array.isArray(briefData) && briefData.length === 0) ? (
                      <div className="py-20 text-center space-y-4">
                         <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto border border-dashed border-slate-200">
                           <Zap className="w-8 h-8 text-slate-200" />
                         </div>
                         <p className="text-sm font-bold text-slate-400">No telemetry data available for this partition.</p>
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
              
              <div className="p-8 border-t border-slate-50 bg-slate-50/50 flex items-center justify-between">
                 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Authorized Executive View Only</p>
                 <button 
                  onClick={() => {
                    const type = selectedBrief.type;
                    setSelectedBrief(null);
                    if (type === 'revenue') {
                      navigate('/dashboard/ceo/reports');
                    } else if (['students', 'universities', 'centers', 'department'].includes(type)) {
                      navigate('/dashboard/ceo/performance');
                    }
                  }}
                  className="flex items-center gap-2 text-[10px] font-black text-slate-900 uppercase tracking-widest group"
                 >
                    View Full Module <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                 </button>
              </div>
            </div>
          </div>,
          document.body
        )}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between bg-white px-6 py-4 rounded-2xl border border-slate-100 shadow-sm">
        <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Growth Analytics</h3>
        <div className="flex items-center gap-3">
          {['3 Months', '6 Months', '12 Months'].map(range => (
            <button key={range} className="px-4 py-1.5 rounded-full bg-slate-50 text-[10px] font-bold text-slate-500 hover:bg-slate-900 hover:text-white transition-all capitalize">
              {range}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Enrollment Trend */}
        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/40">
          <div className="mb-8">
             <h4 className="text-lg font-black text-slate-900">Enrollment Trajectory</h4>
             <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Direct Student Acquisition • 12 Months</p>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%" minHeight={200}>
              <AreaChart data={metrics.enrollmentTrend}>
                <defs>
                  <linearGradient id="colorEnrolls" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0f172a" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#0f172a" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }} />
                <Area type="monotone" dataKey="students" stroke="#0f172a" strokeWidth={4} fillOpacity={1} fill="url(#colorEnrolls)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Revenue Trend */}
        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/40">
           <div className="mb-8">
             <h4 className="text-lg font-black text-slate-900">Revenue Performance</h4>
             <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Verified Fee Collections • INR (₹)</p>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%" minHeight={200}>
              <BarChart data={metrics.revenueTrend}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }} />
                <Bar dataKey="revenue" fill="#0f172a" radius={[6, 6, 0, 0]} barSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
