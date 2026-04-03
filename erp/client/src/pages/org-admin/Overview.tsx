import { useState, useEffect } from 'react';
import { 
  Users, 
  Database, 
  MapPin, 
  GraduationCap, 
  Clock, 
  Activity,
  ArrowRight
} from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store/authStore';
import { Modal } from '@/components/shared/Modal';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell
} from 'recharts';
import { toSentenceCase } from '@/lib/utils';

interface Stats {
  totalDepartments: number;
  totalEmployees: number;
  employeeNames: { name: string; role: string }[];
  totalStudyCenters: number;
  centerNames: string[];
  totalStudents: number;
  pendingApprovals: number;
  growthData: ChartPoint[];
  auditIntensity: AuditPoint[];
  actionQueue: any[];
  demographics: Record<string, number>;
}

interface ChartPoint {
  name: string;
  students: number;
  employees: number;
}

interface AuditPoint {
  day: string;
  actions: number;
}

export default function Overview() {
  const { user } = useAuthStore();
  const [selectedMetric, setSelectedMetric] = useState<{
    title: string;
    value: number | string;
    icon: any;
    details: React.ReactNode;
  } | null>(null);

  const [stats, setStats] = useState<Stats>({
    totalDepartments: 0,
    totalEmployees: 0,
    employeeNames: [],
    totalStudyCenters: 0,
    centerNames: [],
    totalStudents: 0,
    pendingApprovals: 0,
    growthData: [],
    auditIntensity: [],
    actionQueue: [],
    demographics: {}
  });

  const getRoleBranding = () => {
    const role = user?.role?.toLowerCase() || '';
    if (role.includes('admin')) return { title: 'Chief', caption: 'Institutional Intelligence' };
    if (role.includes('ceo')) return { title: 'Director', caption: 'Executive Intelligence' };
    if (role.includes('student')) return { title: 'Scholar', caption: 'Academic Intelligence' };
    if (role.includes('center')) return { title: 'Coordinator', caption: 'Regional Intelligence' };
    return { title: user?.name?.split(' ')[0] || 'Member', caption: 'System Intelligence' };
  };

  const branding = getRoleBranding();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { data } = await api.get('/org-admin/dashboard/stats');
        
        setStats({
          totalDepartments: data.activeDepts,
          totalEmployees: data.totalEmployees,
          employeeNames: data.employeeNames || [],
          totalStudyCenters: data.studyCenters,
          centerNames: data.centerNames || [],
          totalStudents: data.totalStudents,
          pendingApprovals: data.pendingTasks,
          growthData: data.growthData || [],
          auditIntensity: data.auditIntensity || [],
          actionQueue: data.actionQueue || [],
          demographics: data.demographics || {}
        });

      } catch (error) {
        console.error("Failed to fetch dashboard stats", error);
        toast.error('Failed to synchronize dashboard metrics');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 60000); 
    return () => clearInterval(interval);
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
  };

  const formattedDate = new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });

  const MetricCard = ({ title, value, icon: Icon, color, link, details }: any) => {
    const isLink = !!link;
    
    const CardContent = (
      <div 
        onClick={() => !isLink && setSelectedMetric({ title, value, icon: Icon, details })}
        className={`bg-white rounded-2xl shadow-sm border border-slate-200 p-6 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 h-full group cursor-pointer ${isLink ? 'hover:border-blue-200 hover:scale-[1.01]' : 'hover:border-emerald-200'}`}
      >
        <div className="flex justify-between items-start mb-4">
          <div className={`p-3 rounded-xl ${color.bg} shadow-inner`}>
            <Icon className={`w-6 h-6 ${color.text}`} />
          </div>
          <div className="text-slate-200 group-hover:text-slate-400 transition-all group-hover:translate-x-1 opacity-0 group-hover:opacity-100">
            {isLink ? <ArrowRight className="w-5 h-5" /> : <Activity className="w-5 h-5" />}
          </div>
        </div>
        <div>
          <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1 px-0.5">{title}</h3>
          <p className="text-3xl font-black text-slate-900 tracking-tight">
            {loading ? (
              <span className="inline-block w-16 h-8 bg-slate-100 animate-pulse rounded-lg"></span>
            ) : (
              typeof value === 'number' ? value.toLocaleString() : value
            )}
          </p>
        </div>
      </div>
    );

    if (link) {
      return (
        <NavLink to={link} className="block no-underline">
          {CardContent}
        </NavLink>
      );
    }

    return CardContent;
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="space-y-4">
        <div>
          <h1 className="text-6xl font-black text-slate-900 tracking-tight leading-tight">
            {getGreeting()}, {branding.title}
          </h1>
          <p className="text-lg text-slate-500 mt-2 font-medium">
            Institutional performance and telemetry overview for {formattedDate}.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <MetricCard 
          title="Total Departments Active" 
          value={stats.totalDepartments} 
          icon={Database} 
          color={{ bg: 'bg-blue-50', text: 'text-blue-600' }}
          link="/dashboard/org-admin/departments"
        />
        <MetricCard 
          title="Total Employees" 
          value={stats.totalEmployees} 
          icon={Users} 
          color={{ bg: 'bg-indigo-50', text: 'text-indigo-600' }}
          details={
            <div className="space-y-6">
              <div className="space-y-3">
                 <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Workforce Registry</h4>
                 <div className="max-h-[300px] overflow-y-auto pr-2 space-y-2">
                    {stats.employeeNames.length > 0 ? (
                      stats.employeeNames.map((emp, i) => (
                        <div key={i} className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-xl hover:border-indigo-100 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold text-xs">
                              {emp.name.charAt(0)}
                            </div>
                            <span className="text-xs font-bold text-slate-700">{toSentenceCase(emp.name)}</span>
                          </div>
                          <span className="text-[9px] font-black text-indigo-500 uppercase tracking-tighter bg-indigo-50 px-2 py-0.5 rounded-md">
                            {emp.role}
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-slate-400 text-center py-4">No personnel records found.</p>
                    )}
                 </div>
              </div>
            </div>
          }
        />
        <MetricCard 
          title="Total Study Centers" 
          value={stats.totalStudyCenters} 
          icon={MapPin} 
          color={{ bg: 'bg-amber-50', text: 'text-amber-600' }}
          details={
            <div className="space-y-6">
              <div className="space-y-3">
                 <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Regional Centers</h4>
                 <div className="max-h-[300px] overflow-y-auto pr-2 space-y-2">
                    {stats.centerNames.length > 0 ? (
                      stats.centerNames.map((center, i) => (
                        <div key={i} className="flex items-center gap-3 p-3 bg-white border border-slate-100 rounded-xl hover:border-amber-100 transition-colors">
                           <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
                             <MapPin className="w-4 h-4" />
                           </div>
                           <span className="text-xs font-bold text-slate-700">{toSentenceCase(center)}</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-slate-400 text-center py-4">No center enrollment detected.</p>
                    )}
                 </div>
              </div>
            </div>
          }
        />
        <MetricCard 
          title="Total Students Enrolled" 
          value={stats.totalStudents} 
          icon={GraduationCap} 
          color={{ bg: 'bg-emerald-50', text: 'text-emerald-600' }}
          details={
            <div className="space-y-6">
              <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center gap-4">
                <div className="p-2 bg-white rounded-xl shadow-sm"><Activity className="w-5 h-5 text-emerald-600" /></div>
                <p className="text-[11px] text-emerald-800 font-bold leading-relaxed uppercase tracking-wide">Live student telemetry across {Object.keys(stats.demographics).length} program categories.</p>
              </div>
              <div className="space-y-4">
                 {Object.entries(stats.demographics).map(([label, value], i) => (
                   <div key={i} className="flex items-center justify-between p-3 border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors rounded-lg">
                     <span className="text-xs font-bold text-slate-500 uppercase">{label}</span>
                     <span className="text-xs font-black text-slate-900 px-2 py-1 bg-white rounded-md shadow-sm border border-slate-100">{value} student{value !== 1 ? 's' : ''}</span>
                   </div>
                 ))}
                 {Object.keys(stats.demographics).length === 0 && (
                    <p className="text-xs text-slate-400 text-center py-4">No demographic data available.</p>
                 )}
              </div>
            </div>
          }
        />
        <MetricCard 
          title="Pending Approvals" 
          value={stats.pendingApprovals} 
          icon={Clock} 
          color={{ bg: 'bg-rose-50', text: 'text-rose-600' }}
          details={
            <div className="space-y-4">
              <h4 className="text-[10px] font-black text-rose-600 uppercase tracking-[0.2em] mb-4">Critical Action Queue</h4>
              <div className="space-y-2">
                 {stats.actionQueue.length > 0 ? stats.actionQueue.map((task, i) => (
                   <div key={i} className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl hover:border-rose-200 transition-all cursor-default group">
                     <div className="flex items-center gap-3">
                       <div className={`w-2 h-2 rounded-full ${task.priority === 'urgent' || task.priority === 'high' ? 'bg-rose-500' : 'bg-slate-300'}`}></div>
                       <span className="text-xs font-bold text-slate-700">{task.title}</span>
                     </div>
                     <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">{task.priority}</span>
                   </div>
                 )) : (
                    <p className="text-xs text-slate-400 text-center py-4">Action queue is clear.</p>
                 )}
              </div>
            </div>
          }
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 space-y-6">
          <div className="flex justify-between items-center px-2">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Institutional Growth</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">6 Month Performance Matrix</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-600 shadow-lg shadow-blue-500/20"></div>
                <span className="text-[10px] font-bold text-slate-500">Students</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-slate-300"></div>
                <span className="text-[10px] font-bold text-slate-500">Staff</span>
              </div>
            </div>
          </div>
          <div className="h-[300px] w-full pt-4">
             <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stats.growthData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }}
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      borderRadius: '16px', 
                      border: 'none', 
                      boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
                      fontSize: '12px',
                      fontWeight: '800'
                    }} 
                  />
                  <Line 
                    type="monotone" 
                    dataKey="students" 
                    stroke="#2563eb" 
                    strokeWidth={4} 
                    dot={{ r: 6, fill: '#2563eb', strokeWidth: 3, stroke: '#fff' }} 
                    activeDot={{ r: 8, strokeWidth: 0 }} 
                  />
                  <Line 
                    type="monotone" 
                    dataKey="employees" 
                    stroke="#cbd5e1" 
                    strokeWidth={4} 
                    dot={{ r: 6, fill: '#cbd5e1', strokeWidth: 3, stroke: '#fff' }} 
                  />
                </LineChart>
             </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 space-y-6">
          <div className="flex justify-between items-center px-2">
            <div>
              <h3 className="text-lg font-bold text-slate-900">System Intercepts</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Audit Action Intensity (Weekly)</p>
            </div>
            <NavLink to="/dashboard/org-admin/audit/all" className="p-2 bg-slate-50 hover:bg-slate-900 hover:text-white rounded-xl transition-all group">
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </NavLink>
          </div>
          <div className="h-[300px] w-full pt-4">
             <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.auditIntensity}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="day" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }}
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }}
                  />
                  <Tooltip 
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{ 
                      borderRadius: '16px', 
                      border: 'none', 
                      boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
                      fontSize: '12px',
                      fontWeight: '800'
                    }} 
                  />
                  <Bar dataKey="actions" radius={[10, 10, 0, 0]}>
                    {stats.auditIntensity.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.actions > 150 ? '#2563eb' : '#94a3b8'} />
                    ))}
                  </Bar>
                </BarChart>
             </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="bg-slate-900 rounded-[2rem] p-10 text-white flex flex-col md:flex-row items-center justify-between gap-10 shadow-2xl relative overflow-hidden">
        <Activity className="absolute -right-4 -bottom-4 w-48 h-48 text-white/5 rotate-6" />
        <div className="max-w-2xl relative z-10">
          <h4 className="text-xl font-bold mb-3 font-display">Governance & Configuration Panel</h4>
          <p className="text-slate-400 text-sm leading-relaxed font-medium">
            This executive command center centralizes institutional telemetry. Every data point reflected here is 
            dynamically harvested from live sub-systems including Finance, HR, and Academic workflows. 
            Regulatory compliance monitoring and access boundary management are enforced system-wide.
          </p>
        </div>
        <div className="flex flex-col gap-3 min-w-[200px] relative z-10">
          <NavLink 
            to="/dashboard/org-admin/audit/compliance" 
            className="w-full py-4 bg-white text-slate-900 text-center font-bold text-xs uppercase tracking-widest rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-xl"
          >
            Compliance Report
          </NavLink>
        </div>
      </div>

      <Modal 
        isOpen={!!selectedMetric} 
        onClose={() => setSelectedMetric(null)}
        title={selectedMetric ? `${selectedMetric.title} Insight` : ''}
        maxWidth="md"
      >
        <div className="space-y-6">
          <div className="flex items-center justify-between p-6 bg-white rounded-3xl border border-slate-100 shadow-sm mb-6">
            <div className="flex items-center gap-4">
               {selectedMetric?.icon && (
                 <div className="p-4 bg-slate-900 text-white rounded-[1.25rem] shadow-xl shadow-slate-900/20 transform rotate-3">
                   <selectedMetric.icon className="w-6 h-6" />
                 </div>
               )}
               <div>
                 <h2 className="text-2xl font-black text-slate-900 tracking-tight">{selectedMetric?.value}</h2>
                 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Verified Records</p>
               </div>
            </div>
            <div className="text-right">
               <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-[9px] font-black uppercase tracking-widest rounded-md border border-blue-100">Live Telemetry</span>
               <p className="text-[9px] text-slate-400 font-bold mt-1 uppercase tracking-tighter">IITS ERP Data Hub</p>
            </div>
          </div>
          
          <div className="px-2">
            {selectedMetric?.details}
          </div>

          <div className="pt-6 border-t border-slate-100 flex justify-end">
            <button 
              onClick={() => setSelectedMetric(null)}
              className="px-6 py-2.5 bg-slate-900 text-white font-bold text-xs uppercase tracking-widest rounded-xl hover:bg-slate-800 transition-colors shadow-lg cursor-pointer"
            >
              Close Insight
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
