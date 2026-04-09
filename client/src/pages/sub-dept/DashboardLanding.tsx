import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '@/lib/api';
import { 
  AreaChart, Area, 
  BarChart, Bar, 
  PieChart as RePieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend 
} from 'recharts';
import { 
  BookOpen, 
  Users, 
  CheckSquare,
  ArrowRight,
  LayoutDashboard,
  GraduationCap,
  Building2,
  PieChart,
  BarChart3,
  Activity
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

const COLORS = ['#3b82f6', '#10b981', '#6366f1', '#f43f5e', '#f59e0b'];

export default function DashboardLanding() {
  const { unit } = useParams();
  const user = useAuthStore(state => state.user);
  const portalName = unit ? (unit.charAt(0).toUpperCase() + unit.slice(1)) : (user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'Sub-department');
  
  const [stats, setStats] = useState<any>({
    totalUniversities: 0,
    activePrograms: 0,
    pendingReviews: 0,
    revenue: 0,
    approvalRate: 0,
    totalStudents: 0,
    trend: [],
    statusDistribution: [],
    totalBatches: 0
  });
  const [centers, setCenters] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const subDeptMap: Record<string, number> = { 'openschool': 8, 'online': 9, 'skill': 10, 'bvoc': 11 };
      const subDeptId = unit ? subDeptMap[unit.toLowerCase()] : null;

      const [statsRes, centersRes] = await Promise.all([
        api.get('/operations/stats/academic-overview', { params: { subDeptId } }),
        api.get('/operations/performance/centers', { params: { subDeptId } })
      ]);

      setStats(statsRes.data);
      setCenters(centersRes.data.slice(0, 5)); // Top 5 centers
    } catch (error) {
      console.error('Sub-dept stats fetch failed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [unit]);

  const kpis = [
    { 
      label: 'Pending Student Reviews', 
      value: stats.pendingReviews || 0, 
      icon: Users, 
      color: 'bg-amber-500', 
      trend: 'Admission Execution',
      path: '../validation',
      details: 'High-priority appraisal queue for staff & student academic eligibility.'
    },
    { 
      label: 'Unit Approval Rate', 
      value: `${stats.approvalRate || 0}%`, 
      icon: CheckSquare, 
      color: 'bg-blue-500', 
      trend: 'Academic Quality',
      path: '../programs',
      details: 'Institutional quality benchmark based on validated student records.'
    },
    { 
      label: 'Enrollment Intakes', 
      value: stats.totalBatches || 0, 
      icon: LayoutDashboard, 
      color: 'bg-indigo-600', 
      trend: 'Live Batches',
      path: '../sessions',
      details: 'Active and upcoming academic batches across jurisdictional centers.'
    },
    { 
      label: 'Jurisdictional Students', 
      value: stats.totalStudents || 0, 
      icon: GraduationCap, 
      color: 'bg-emerald-500', 
      trend: 'Unit Growth',
      path: '../students',
      details: 'Total centralized student registry for the current academic unit.'
    },
  ];

  if (loading) return <div className="p-12 text-center animate-pulse text-slate-400 font-black uppercase tracking-widest">Syncing Jurisdictional Hub...</div>;

  return (
    <div className="space-y-10 pb-12 animate-in fade-in duration-700">
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
          <Link 
            key={idx} 
            to={kpi.path}
            className="group relative bg-white rounded-[2rem] p-7 border border-slate-100 shadow-xl shadow-slate-200/40 hover:-translate-y-1 transition-all duration-300 overflow-hidden cursor-pointer"
          >
            {/* Hover Insight Overlay */}
            <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-sm p-8 flex flex-col justify-center translate-y-full group-hover:translate-y-0 transition-transform duration-500 z-20">
              <p className="text-blue-400 font-black uppercase tracking-widest text-[10px] mb-2">Unit Intelligence</p>
              <p className="text-slate-100 text-sm font-medium leading-relaxed">
                {kpi.details}
              </p>
              <div className="mt-6 flex items-center gap-2 text-white font-black text-[10px] uppercase tracking-tighter">
                Access Module <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </div>

            <div className={`absolute -right-6 -bottom-6 text-slate-900 opacity-[0.03] transform rotate-[15deg] transition-all duration-700 group-hover:rotate-0 group-hover:scale-125 group-hover:opacity-[0.05] pointer-events-none`}>
               <kpi.icon className="w-40 h-40" />
            </div>
            
            <div className="relative z-10 flex flex-col h-full">
              <div className={`${kpi.color} w-14 h-14 rounded-2xl flex items-center justify-center text-white mb-6 shadow-lg shadow-current/20 group-hover:scale-110 transition-transform`}>
                <kpi.icon className="w-7 h-7" />
              </div>
              
              <div className="flex-1">
                <p className="text-[11px] font-black uppercase text-slate-400 tracking-[0.15em] mb-1">
                  {kpi.label}
                </p>
                <p className="text-4xl font-black text-slate-900 tracking-tighter mb-4 group-hover:text-blue-600 transition-colors">
                  {typeof kpi.value === 'number' ? kpi.value.toLocaleString() : kpi.value}
                </p>
              </div>

              <div className="pt-5 border-t border-slate-50 flex items-center justify-between mt-auto">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">{kpi.trend}</span>
                <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-slate-900 group-hover:translate-x-1 transition-all" />
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Analytics Visualization Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Admission Velocity Trend */}
        <div className="lg:col-span-2 bg-white rounded-[2.5rem] border border-slate-100 p-8 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-black text-slate-900 uppercase flex items-center gap-3 tracking-tight">
              <Activity className="w-6 h-6 text-blue-500" />
              Admission Velocity Trend
            </h3>
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] bg-slate-50 px-3 py-1 rounded-full">Last 6 Months</span>
          </div>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.trend}>
                <defs>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}} />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', fontSize: '12px', fontWeight: 'bold' }}
                />
                <Area type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorCount)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Status Distribution */}
        <div className="bg-white rounded-[2.5rem] border border-slate-100 p-8 shadow-sm">
          <h3 className="text-xl font-black text-slate-900 uppercase flex items-center gap-3 tracking-tight mb-8">
            <PieChart className="w-6 h-6 text-indigo-500" />
            Unit Status Distribution
          </h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RePieChart>
                <Pie
                  data={stats.statusDistribution || []}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {stats.statusDistribution?.map((_: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend layout="horizontal" verticalAlign="bottom" align="center" formatter={(value) => <span className="text-[10px] font-black uppercase tracking-tight text-slate-500">{value}</span>} />
              </RePieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-8 pt-8 border-t border-slate-50">
             <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-relaxed">System Health Monitoring: <span className="text-blue-600">Active</span></span>
             </div>
          </div>
        </div>

        {/* Top Centers Performance */}
        <div className="lg:col-span-3 bg-white rounded-[2.5rem] border border-slate-100 p-8 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-black text-slate-900 uppercase flex items-center gap-3 tracking-tight">
              <BarChart3 className="w-6 h-6 text-emerald-500" />
              Jurisdictional Center Performance
            </h3>
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Based on Active Student Enrollment</span>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={centers}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}} />
                <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', fontSize: '12px', fontWeight: 'bold' }} />
                <Bar dataKey="studentCount" fill="#10b981" radius={[8, 8, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
