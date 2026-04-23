import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
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
import { DrillDownModal } from '@/components/shared/DrillDownModal';
import { DashboardGreeting } from '@/components/shared/DashboardGreeting';

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
  const [drillDown, setDrillDown] = useState<{ isOpen: boolean; type: string; title: string }>({
    isOpen: false,
    type: '',
    title: ''
  });

  const openDrillDown = (type: string, title: string) => {
    setDrillDown({ isOpen: true, type, title });
  };

  const fetchStats = async () => {
    try {
      setLoading(true);
      const subDeptId = unit || null;

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
      label: 'Assigned Universities', 
      value: stats.totalUniversities || 0, 
      icon: Building2, 
      color: 'bg-rose-500', 
      trend: 'Institutional Partners',
      path: '../programs',
      type: 'universities',
      details: 'Comprehensive registry of partner universities assigned to this unit.'
    },
    { 
      label: 'Academic Programs', 
      value: stats.activePrograms || 0, 
      icon: BookOpen, 
      color: 'bg-violet-600', 
      trend: 'Syllabus Registry',
      path: '../programs',
      type: 'activePrograms',
      details: 'Total active degree and certificate programs within the jurisdictional syllabus.'
    },
    { 
      label: 'Pending Student Reviews', 
      value: stats.pendingReviews || 0, 
      icon: Users, 
      color: 'bg-amber-500', 
      trend: 'Admission Execution',
      path: '../validation',
      type: 'pendingAdmissions',
      details: 'High-priority appraisal queue for staff & student academic eligibility.'
    },
    { 
      label: 'Unit Approval Rate', 
      value: `${stats.approvalRate || 0}%`, 
      icon: CheckSquare, 
      color: 'bg-blue-500', 
      trend: 'Academic Quality',
      path: '../programs',
      type: 'students',
      details: 'Institutional quality benchmark based on validated student records.'
    },
    { 
      label: 'Jurisdictional Students', 
      value: stats.totalStudents || 0, 
      icon: GraduationCap, 
      color: 'bg-emerald-500', 
      trend: 'Unit Growth',
      path: '../students',
      type: 'students',
      details: 'Total centralized student registry for the current academic unit.'
    },
  ];

  const colors: Record<string, { bg: string, text: string }> = {
    'bg-amber-500': { bg: 'bg-amber-50', text: 'text-amber-600' },
    'bg-blue-500': { bg: 'bg-blue-50', text: 'text-blue-600' },
    'bg-indigo-600': { bg: 'bg-indigo-50', text: 'text-indigo-600' },
    'bg-emerald-500': { bg: 'bg-emerald-50', text: 'text-emerald-600' },
    'bg-rose-500': { bg: 'bg-rose-50', text: 'text-rose-600' },
    'bg-violet-600': { bg: 'bg-violet-50', text: 'text-violet-600' }
  };

  if (loading) return <div className="p-12 text-center animate-pulse text-slate-400 font-black uppercase tracking-widest">Syncing Jurisdictional Hub...</div>;

  return (
    <div className="space-y-10 pb-12">
      {/* Identity Header */}
      <DashboardGreeting 
        role={`${portalName} Unit - Jurisdictional Hub`}
        name={user?.name || 'Administrator'}
        subtitle={`Monitoring real-time jurisdictional telemetry, institutional admission velocity, and structural academic architecture for the ${portalName} unit.`}
        actions={[
          {
            label: 'Programs Catalog',
            link: '../programs',
            icon: BookOpen
          },
          {
            label: 'Student Validation',
            link: '../validation',
            icon: CheckSquare
          }
        ]}
      />

      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpis.map((kpi, idx) => {
          const color = colors[kpi.color] || { bg: 'bg-slate-50', text: 'text-slate-600' };
          return (
            <div 
              key={idx} 
              onClick={() => openDrillDown(kpi.type || 'students', kpi.label)}
              style={{ animationDelay: `${idx * 50}ms`, animationFillMode: 'both' }}
              className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 transition-all hover:shadow-xl hover:-translate-y-1 h-full group cursor-pointer relative overflow-hidden hover:border-blue-200 hover:scale-[1.01]"
            >
              <div className={`absolute -right-6 -bottom-6 ${color.text} opacity-[0.03] transform rotate-[15deg] transition-all group-hover:rotate-0 group-hover:scale-125 group-hover:opacity-[0.05] pointer-events-none`}>
                <kpi.icon className="w-40 h-40" />
              </div>

              <div className="relative z-10 flex flex-col justify-between h-full">
                <div className="flex justify-between items-start mb-6">
                  <div className={`p-3 rounded-xl ${color.bg} shadow-inner`}>
                    <kpi.icon className={`w-6 h-6 ${color.text}`} />
                  </div>
                  <div className="text-slate-200 group-hover:text-slate-400 transition-all group-hover:translate-x-1 opacity-0 group-hover:opacity-100">
                    <ArrowRight className="w-5 h-5" />
                  </div>
                </div>
                
                <div>
                  <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1 px-0.5">
                    {kpi.label}
                  </h3>
                  <p className="text-3xl font-black text-slate-900 tracking-tight group-hover:text-blue-600 transition-colors">
                    {typeof kpi.value === 'number' ? kpi.value.toLocaleString() : kpi.value}
                  </p>
                </div>

                <div className="pt-5 border-t border-slate-50 flex items-center justify-between mt-6">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">{kpi.trend}</span>
                  <span className="text-[9px] font-bold text-slate-300 uppercase tracking-tighter">View Details</span>
                </div>
              </div>
            </div>
          );
        })}
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
      <DrillDownModal 
        isOpen={drillDown.isOpen}
        onClose={() => setDrillDown({ ...drillDown, isOpen: false })}
        type={drillDown.type}
        title={drillDown.title}
      />
    </div>
  );
}
