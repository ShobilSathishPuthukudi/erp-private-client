import { useState, useEffect } from 'react';
import { 
  Users, 
  MapPin, 
  GraduationCap, 
  Clock, 
  Activity,
  ArrowRight,
  Layout,
  Layers,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Building,
  UserPlus
} from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store/authStore';
import { Modal } from '@/components/shared/Modal';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer
} from 'recharts';
import { toSentenceCase } from '@/lib/utils';

interface Stats {
  totalDepartments: number;
  deptNames: string[];
  totalSubDepts: number;
  subDeptNames: string[];
  totalRoles: number;
  roleNames: string[];
  totalEmployees: number;
  employeeNames: { name: string; role: string }[];
  totalStudyCenters: number;
  centerNames: string[];
  totalStudents: number;
  pendingOverdueTasks: number;
  pendingCenterCount: number;
  pendingCenters: any[];
  pendingStudentCount: number;
  pendingStudents: any[];
  growthData: ChartPoint[];
  centerGrowth: CenterPoint[];
  actionQueue: any[];
  demographics: Record<string, number>;
  studentDetails: any[];
}

interface ChartPoint {
  name: string;
  students: number;
  employees: number;
  administrators: number;
  centers: number;
}

interface CenterPoint {
  day: string;
  leads: number;
  approved: number;
}

export default function Overview() {
  const { user } = useAuthStore();
  const [mounted, setMounted] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState<{
    title: string;
    value: number | string;
    icon: any;
    details: React.ReactNode;
    primaryAction?: { label: string; link: string };
  } | null>(null);

  const [stats, setStats] = useState<Stats>({
    totalDepartments: 0,
    deptNames: [],
    totalSubDepts: 0,
    subDeptNames: [],
    totalRoles: 0,
    roleNames: [],
    totalEmployees: 0,
    employeeNames: [],
    totalStudyCenters: 0,
    centerNames: [],
    totalStudents: 0,
    pendingOverdueTasks: 0,
    pendingCenterCount: 0,
    pendingCenters: [],
    pendingStudentCount: 0,
    pendingStudents: [],
    growthData: [],
    centerGrowth: [],
    actionQueue: [],
    demographics: {},
    studentDetails: []
  });

  const [isAnalysisOpen, setIsAnalysisOpen] = useState(false);
  const [isInstAnalysisOpen, setIsInstAnalysisOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const analyzeCenterGrowth = () => {
    const data = stats.centerGrowth;
    if (!data || data.length === 0) return null;
    
    const last = data[data.length - 1];
    const first = data[0];
    
    const conversionRate = last.leads > 0 ? (last.approved / last.leads) * 100 : 0;
    const growthRate = first.approved > 0 ? ((last.approved - first.approved) / first.approved) * 100 : (last.approved * 100);
    
    return {
      conversionRate: conversionRate.toFixed(1),
      growthRate: Math.abs(growthRate).toFixed(1),
      isGrowthPositive: growthRate >= 0,
      totalLeads: last.leads,
      totalApproved: last.approved,
      efficiency: conversionRate > 75 ? 'Optimal' : conversionRate > 50 ? 'Strong' : 'Moderate',
      statusColor: conversionRate > 75 ? 'text-emerald-600' : conversionRate > 50 ? 'text-blue-600' : 'text-amber-600',
      statusBg: conversionRate > 75 ? 'bg-emerald-50' : conversionRate > 50 ? 'bg-blue-50' : 'bg-amber-50',
      insight: conversionRate > 70 ? 'Your network scaling is highly efficient. Focus on high-value leads.' : 'Moderate conversion detected. Registration follow-ups recommended.'
    };
  };

  const analysis = analyzeCenterGrowth();

  const analyzeInstitutionalGrowth = () => {
    const data = stats.growthData;
    if (!data || data.length === 0) return null;
    
    const last = data[data.length - 1];
    const first = data[0];
    
    const totalStaff = last.employees + last.administrators;
    const studentGrowth = first.students > 0 ? ((last.students - first.students) / first.students) * 100 : 0;
    const staffRatio = totalStaff > 0 ? (last.students / totalStaff).toFixed(1) : last.students;
    const staffGrowth = (first.employees + first.administrators) > 0 ? (((last.employees + last.administrators) - (first.employees + first.administrators)) / (first.employees + first.administrators)) * 100 : 0;
    
    return {
      studentGrowth: studentGrowth.toFixed(1),
      isStudentGrowthPositive: studentGrowth >= 0,
      staffRatio,
      staffGrowth: Math.abs(staffGrowth).toFixed(1),
      isStaffGrowthPositive: staffGrowth >= 0,
      totalStudents: last.students,
      totalEmployees: last.employees,
      totalAdministrators: last.administrators,
      institutionalHealth: (last.students / (totalStaff || 1)) < 40 ? 'Balanced' : 'Optimal',
      statusColor: (last.students / (totalStaff || 1)) < 60 ? 'text-blue-600' : 'text-amber-600',
      statusBg: (last.students / (totalStaff || 1)) < 60 ? 'bg-blue-50' : 'bg-amber-50',
      insight: (last.students / (totalStaff || 1)) > 50 ? 'Student density is increasing. Consider augmenting faculty support.' : 'Scaling is balanced for current institutional density.'
    };
  };

  const instAnalysis = analyzeInstitutionalGrowth();

  const getRoleBranding = () => {
    const role = user?.role?.toLowerCase() || '';
    if (role.includes('admin')) return { title: 'Chief', caption: 'Institutional Intelligence' };
    if (role.includes('ceo')) return { title: 'Director', caption: 'Executive Intelligence' };
    if (role.includes('student')) return { title: 'Scholar', caption: 'Academic Intelligence' };
    if (role.toLowerCase().includes('center')) return { title: 'Coordinator', caption: 'Regional Intelligence' };
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
          deptNames: data.deptNames || [],
          totalSubDepts: data.activeSubDepts,
          subDeptNames: data.subDeptNames || [],
          totalRoles: data.totalRoles,
          roleNames: data.roleNames || [],
          totalEmployees: data.totalEmployees,
          employeeNames: data.employeeNames || [],
          totalStudyCenters: data.studyCenters,
          centerNames: data.centerNames || [],
          totalStudents: data.totalStudents,
          pendingOverdueTasks: data.pendingOverdueTasks,
          pendingCenterCount: data.pendingCenterCount,
          pendingCenters: data.pendingCenters || [],
          pendingStudentCount: data.pendingStudentCount,
          pendingStudents: data.pendingStudents || [],
          growthData: data.growthData || [],
          centerGrowth: data.centerGrowth || [],
          actionQueue: data.actionQueue || [],
          demographics: data.demographics || {},
          studentDetails: data.studentDetails || []
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

  const MetricCard = ({ title, value, icon: Icon, color, link, details, primaryAction, index = 0 }: any) => {
    const isLink = !!link;
    
    const CardContent = (
      <div 
        onClick={() => !isLink && setSelectedMetric({ title, value, icon: Icon, details, primaryAction })}
        style={{ animationFillMode: 'both', animationDelay: `${index * 75}ms` }}
        className={`bg-white rounded-2xl shadow-sm border border-slate-200 p-6 transition-all hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] h-full group cursor-pointer relative overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500 ${isLink ? 'hover:border-blue-200' : 'hover:border-emerald-200'}`}
      >
        <div className={`absolute -right-6 -bottom-6 ${color.text} opacity-[0.03] transform rotate-[15deg] transition-all duration-700 group-hover:rotate-0 group-hover:scale-125 group-hover:opacity-[0.05] pointer-events-none`}>
          <Icon className="w-40 h-40" />
        </div>

        <div className="relative z-10 flex flex-col justify-between h-full">
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard 
          index={1}
          title="Total Departments" 
          value={stats.totalDepartments} 
          icon={Layout} 
          color={{ bg: 'bg-blue-50', text: 'text-blue-600' }}
          primaryAction={{ label: 'Go to departments', link: '/dashboard/org-admin/departments' }}
          details={
            <div className="space-y-6">
              <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl flex items-center gap-4">
                <div className="p-2 bg-white rounded-xl shadow-sm"><Layout className="w-5 h-5 text-blue-600" /></div>
                <p className="text-[11px] text-blue-800 font-bold leading-relaxed uppercase tracking-wide">Main institutional departments managing core workflows.</p>
              </div>
              
              <div className="grid grid-cols-1 gap-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                {stats.deptNames.length > 0 ? (
                  stats.deptNames.map((name, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-100 rounded-xl group hover:border-blue-200 hover:bg-white transition-all shadow-sm">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-400 group-hover:bg-blue-600 transition-colors"></div>
                      <span className="text-[11px] font-bold text-slate-600 uppercase tracking-tight">{name}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-[10px] text-slate-400 text-center py-4 font-bold uppercase tracking-widest">No active departments recorded.</p>
                )}
              </div>
            </div>
          }
        />
        <MetricCard 
          index={2}
          title="Total Sub Departments" 
          value={stats.totalSubDepts} 
          icon={Layers} 
          color={{ bg: 'bg-indigo-50', text: 'text-indigo-600' }}
          primaryAction={{ label: 'Go to sub-departments', link: '/dashboard/org-admin/sub-departments' }}
          details={
            <div className="space-y-6">
              <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-center gap-4">
                <div className="p-2 bg-white rounded-xl shadow-sm"><Layers className="w-5 h-5 text-indigo-600" /></div>
                <p className="text-[11px] text-indigo-800 font-bold leading-relaxed uppercase tracking-wide">Sub-specialized units operating under core departments.</p>
              </div>

              <div className="grid grid-cols-1 gap-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                {stats.subDeptNames.length > 0 ? (
                  stats.subDeptNames.map((name, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-100 rounded-xl group hover:border-indigo-200 hover:bg-white transition-all shadow-sm">
                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 group-hover:bg-indigo-600 transition-colors"></div>
                      <span className="text-[11px] font-bold text-slate-600 uppercase tracking-tight">{name}</span>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">No active sub-departments detected.</p>
                  </div>
                )}
              </div>
            </div>
          }
        />
        <MetricCard 
          index={3}
          title="Total Roles" 
          value={stats.totalRoles} 
          icon={ShieldCheck} 
          color={{ bg: 'bg-emerald-50', text: 'text-emerald-600' }}
          primaryAction={{ label: 'Manage access roles', link: '/dashboard/org-admin/permissions/roles' }}
          details={
            <div className="space-y-6">
              <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center gap-4">
                <div className="p-2 bg-white rounded-xl shadow-sm"><ShieldCheck className="w-5 h-5 text-emerald-600" /></div>
                <p className="text-[11px] text-emerald-800 font-bold leading-relaxed uppercase tracking-wide">Institutional access roles defined in the global permission matrix.</p>
              </div>

              <div className="grid grid-cols-1 gap-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                {stats.roleNames.length > 0 ? (
                  stats.roleNames.map((name, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-100 rounded-xl group hover:border-emerald-200 hover:bg-white transition-all shadow-sm">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 group-hover:bg-emerald-600 transition-colors"></div>
                      <span className="text-[11px] font-bold text-slate-600 uppercase tracking-tight">{name}</span>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">No access roles defined.</p>
                  </div>
                )}
              </div>
            </div>
          }
        />
        <MetricCard 
          index={4}
          title="Total Employees" 
          value={stats.totalEmployees} 
          icon={Users} 
          color={{ bg: 'bg-slate-50', text: 'text-slate-600' }}
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
          index={5}
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
          index={6}
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
                 <div className="max-h-[300px] overflow-y-auto pr-2 space-y-2">
                    {stats.studentDetails && stats.studentDetails.length > 0 ? (
                      stats.studentDetails.map((student, i) => (
                        <div key={i} className="flex flex-col p-3 bg-white border border-slate-100 rounded-xl hover:border-emerald-100 transition-colors shadow-sm">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-700">{student.name}</span>
                          </div>
                          <span className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest leading-relaxed">
                            {student.programName}
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-slate-400 text-center py-4">No student data available.</p>
                    )}
                 </div>
              </div>
            </div>
          }
        />
        <MetricCard 
          index={7}
          title="Overdue Tasks" 
          value={stats.pendingOverdueTasks} 
          icon={Clock} 
          color={{ bg: 'bg-rose-50', text: 'text-rose-600' }}
          details={
            <div className="space-y-4">
              <h4 className="text-[10px] font-black text-rose-600 uppercase tracking-[0.2em] mb-4">Critical Action Queue</h4>
              <div className="space-y-2 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                 {stats.actionQueue.length > 0 ? stats.actionQueue.map((task, i) => (
                    <div key={i} className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl hover:border-rose-200 transition-all cursor-default group">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${task.priority === 'urgent' || task.priority === 'high' ? 'bg-rose-500' : 'bg-slate-300'}`}></div>
                        <div className="flex flex-col gap-1">
                          <span className="text-xs font-bold text-slate-700">{task.title}</span>
                          <div className="flex items-center gap-2">
                             <div className="flex items-center gap-1 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100">
                               <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">From</span>
                               <span className="text-[9px] font-bold text-slate-600">{task.assigner?.name || 'System'}</span>
                             </div>
                             <ArrowRight className="w-2.5 h-2.5 text-slate-300" />
                             <div className="flex items-center gap-1 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                               <span className="text-[8px] font-black text-indigo-400 uppercase tracking-widest">To</span>
                               <span className="text-[9px] font-bold text-indigo-600">{task.assignee?.name || 'Unassigned'}</span>
                             </div>
                          </div>
                        </div>
                      </div>
                      <span className={`text-[9px] font-black uppercase tracking-tighter px-2 py-0.5 rounded-md border ${
                        task.isEscalated 
                          ? 'bg-purple-50 text-purple-700 border-purple-100'
                          : task.isOverdue 
                            ? 'bg-rose-50 text-rose-600 border-rose-100' 
                            : 'bg-slate-50 text-slate-500 border-slate-100'
                      }`}>
                        {task.isEscalated ? 'Escalated' : task.isOverdue ? 'Overdue' : 'Pending'}
                      </span>
                    </div>
                 )) : (
                    <p className="text-xs text-slate-400 text-center py-4">Action queue is clear.</p>
                 )}
              </div>
            </div>
          }
        />
        <MetricCard 
          index={8}
          title="Pending Center Approvals" 
          value={stats.pendingCenterCount} 
          icon={Building} 
          color={{ bg: 'bg-amber-50', text: 'text-amber-600' }}
          details={
            <div className="space-y-4">
              <h4 className="text-[10px] font-black text-amber-600 uppercase tracking-[0.2em] mb-4">Pending Partners</h4>
              <div className="space-y-2">
                 {stats.pendingCenters && stats.pendingCenters.length > 0 ? stats.pendingCenters.map((center, i) => (
                    <div key={i} className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl hover:border-amber-200 transition-all">
                      <span className="text-xs font-bold text-slate-700">{center.name}</span>
                      <span className={`text-[9px] font-black uppercase tracking-tighter px-2 py-0.5 rounded-md border ${
                        center.auditStatus?.includes('FINANCE') 
                          ? 'bg-blue-50 text-blue-600 border-blue-100' 
                          : 'bg-amber-50 text-amber-600 border-amber-100'
                      }`}>
                        {center.auditStatus?.includes('FINANCE') ? 'Finance Pending' : 'Request Pending'}
                      </span>
                    </div>
                 )) : (
                    <p className="text-xs text-slate-400 text-center py-4">No center approvals pending.</p>
                 )}
              </div>
            </div>
          }
        />
        <MetricCard 
          index={9}
          title="Pending Student Approvals" 
          value={stats.pendingStudentCount} 
          icon={UserPlus} 
          color={{ bg: 'bg-indigo-50', text: 'text-indigo-600' }}
          details={
            <div className="space-y-4">
              <h4 className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em] mb-4">Pending Enrollment</h4>
              <div className="space-y-2">
                 {stats.pendingStudents && stats.pendingStudents.length > 0 ? stats.pendingStudents.map((student, i) => (
                    <div key={i} className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl hover:border-indigo-200 transition-all">
                      <span className="text-xs font-bold text-slate-700">{student.name}</span>
                      <span className={`text-[9px] font-black uppercase tracking-tighter px-2 py-0.5 rounded-md border ${
                        student.status?.includes('FINANCE') 
                          ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                          : 'bg-indigo-50 text-indigo-600 border-indigo-100'
                      }`}>
                        {student.status?.includes('FINANCE') ? 'Finance Pending' : 'Review Pending'}
                      </span>
                    </div>
                 )) : (
                    <p className="text-xs text-slate-400 text-center py-4">No student approvals pending.</p>
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
              <h3 className="text-lg font-bold text-slate-900 uppercase tracking-tight">Student Intake</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Monthly Admission & Recruitment Intake</p>
            </div>
            <div className="flex flex-col items-end gap-3">
              <div className="flex flex-wrap items-center justify-end gap-x-4 gap-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-indigo-600 shadow-lg shadow-indigo-500/20"></div>
                  <span className="text-[10px] font-black text-slate-500 uppercase">Registrations</span>
                </div>
              </div>
              <button 
                onClick={() => setIsInstAnalysisOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-all shadow-lg hover:scale-105 active:scale-95 group cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400 group-hover:animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-widest">Analyze</span>
              </button>
            </div>
          </div>
          <div className="h-[300px] w-full pt-4">
             {mounted && (
               <ResponsiveContainer width="100%" height="100%">
                   <AreaChart data={stats.growthData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                    <defs>
                      <linearGradient id="colorStudents" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
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
                        borderRadius: '24px', 
                        border: 'none', 
                        boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.15)',
                        fontSize: '12px',
                        fontWeight: '800'
                      }} 
                    />
                    <Area 
                      type="monotone" 
                      dataKey="students" 
                      stroke="#4f46e5" 
                      strokeWidth={4} 
                      fillOpacity={1}
                      fill="url(#colorStudents)"
                      dot={{ r: 6, fill: '#4f46e5', strokeWidth: 3, stroke: '#fff' }} 
                      activeDot={{ r: 8, strokeWidth: 0 }} 
                    />
                  </AreaChart>
               </ResponsiveContainer>
             )}
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 space-y-6">
          <div className="flex justify-between items-center px-2">
            <div>
              <h3 className="text-lg font-bold text-slate-900 uppercase tracking-tight">Center-Leads Chart</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Center Conversion</p>
            </div>
            <div className="flex flex-col items-end gap-3">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-indigo-600 shadow-lg shadow-indigo-500/20"></div>
                  <span className="text-[10px] font-black text-slate-500 uppercase">Approved</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-lg shadow-rose-500/20"></div>
                  <span className="text-[10px] font-black text-slate-500 uppercase">Leads</span>
                </div>
              </div>
              <button 
                onClick={() => setIsAnalysisOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-all shadow-lg hover:scale-105 active:scale-95 group cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400 group-hover:animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-widest">Analyze</span>
              </button>
            </div>
          </div>
          <div className="h-[300px] w-full pt-4">
             {mounted && (
               <ResponsiveContainer width="100%" height="100%">
                   <AreaChart data={stats.centerGrowth} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                    <defs>
                      <linearGradient id="colorApproved" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
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
                      contentStyle={{ 
                        borderRadius: '24px', 
                        border: 'none', 
                        boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.15)',
                        fontSize: '12px',
                        fontWeight: '800'
                      }} 
                    />
                    <Area 
                      type="monotone" 
                      dataKey="leads" 
                      stroke="#f43f5e" 
                      strokeWidth={4} 
                      fillOpacity={1}
                      fill="url(#colorLeads)"
                      dot={{ r: 6, fill: '#f43f5e', strokeWidth: 3, stroke: '#fff' }} 
                    />
                    <Area 
                      type="monotone" 
                      dataKey="approved" 
                      stroke="#4f46e5" 
                      strokeWidth={4} 
                      fillOpacity={1}
                      fill="url(#colorApproved)"
                      dot={{ r: 6, fill: '#4f46e5', strokeWidth: 3, stroke: '#fff' }} 
                      activeDot={{ r: 8, strokeWidth: 0 }} 
                    />
                  </AreaChart>
               </ResponsiveContainer>
             )}
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
        maxWidth="2xl"
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
               <p className="text-[9px] text-slate-400 font-bold mt-1 uppercase tracking-tighter">ERP Data Hub</p>
            </div>
          </div>
          
          <div className="px-2">
            {selectedMetric?.details}
          </div>

          <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
            <div>
              {selectedMetric?.primaryAction && (
                <NavLink 
                  to={selectedMetric.primaryAction.link}
                  className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 active:scale-[0.98]"
                >
                  {selectedMetric.primaryAction.label} <ArrowRight className="w-3.5 h-3.5" />
                </NavLink>
              )}
            </div>
            <button 
              onClick={() => setSelectedMetric(null)}
              className="px-6 py-2.5 bg-slate-900 text-white font-bold text-xs uppercase tracking-widest rounded-xl hover:bg-slate-800 hover:scale-105 active:scale-95 transition-all shadow-lg cursor-pointer"
            >
              Close Insight
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isAnalysisOpen}
        onClose={() => setIsAnalysisOpen(false)}
        title="Center Growth Intelligence"
        maxWidth="xl"
      >
        <div className="space-y-8 py-2">
          {analysis && (
            <>
              <div className="grid grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Center Approval Rate</p>
                  <div className="flex items-end gap-2">
                    <h4 className="text-4xl font-black text-slate-900 tracking-tighter">{analysis.conversionRate}%</h4>
                    <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-md mb-1 ${analysis.statusBg} ${analysis.statusColor}`}>
                      {analysis.efficiency}
                    </span>
                  </div>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Center Scaling Rate</p>
                  <div className="flex items-center gap-2">
                    <h4 className="text-4xl font-black text-slate-900 tracking-tighter">{analysis.growthRate}%</h4>
                    {analysis.isGrowthPositive ? (
                      <TrendingUp className="w-6 h-6 text-emerald-500" />
                    ) : (
                      <TrendingDown className="w-6 h-6 text-rose-500" />
                    )}
                  </div>
                </div>
              </div>

              <div className="p-8 bg-slate-900 rounded-[2rem] text-white relative overflow-hidden">
                <Sparkles className="absolute -right-4 -top-4 w-32 h-32 text-white/5 rotate-12" />
                <div className="relative z-10">
                  <h4 className="text-sm font-black uppercase tracking-[0.2em] text-amber-400 mb-4">Strategic Insight</h4>
                  <p className="text-slate-300 text-lg font-medium leading-relaxed tracking-tight italic">
                    "{analysis.insight}"
                  </p>
                  <div className="mt-8 pt-8 border-t border-white/10 grid grid-cols-2 gap-8 text-center">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-1">Total Pipeline</p>
                      <p className="text-2xl font-black">{analysis.totalLeads}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-1">Verified Hubs</p>
                      <p className="text-2xl font-black">{analysis.totalApproved}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <button 
                  onClick={() => setIsAnalysisOpen(false)}
                  className="px-8 py-3 bg-slate-100 text-slate-900 font-black text-[10px] uppercase tracking-[0.2em] rounded-2xl hover:bg-slate-200 hover:scale-105 transition-all active:scale-95 cursor-pointer"
                >
                  Dismiss Analysis
                </button>
              </div>
            </>
          )}
        </div>
      </Modal>

      <Modal
        isOpen={isInstAnalysisOpen}
        onClose={() => setIsInstAnalysisOpen(false)}
        title="Institutional Intelligence Report"
        maxWidth="xl"
      >
        <div className="space-y-8 py-2">
          {instAnalysis && (
            <>
              <div className="grid grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Student-to-Staff Ratio</p>
                  <div className="flex items-end gap-2">
                    <h4 className="text-4xl font-black text-slate-900 tracking-tighter">{instAnalysis.staffRatio}:1</h4>
                    <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-md mb-1 ${instAnalysis.statusBg} ${instAnalysis.statusColor}`}>
                      {instAnalysis.institutionalHealth}
                    </span>
                  </div>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Enrollment Momentum</p>
                  <div className="flex items-center gap-2">
                    <h4 className="text-4xl font-black text-slate-900 tracking-tighter">{instAnalysis.studentGrowth}%</h4>
                    {instAnalysis.isStudentGrowthPositive ? (
                      <TrendingUp className="w-6 h-6 text-emerald-500" />
                    ) : (
                      <TrendingDown className="w-6 h-6 text-rose-500" />
                    )}
                  </div>
                </div>
              </div>

              <div className="p-8 bg-slate-900 rounded-[2rem] text-white relative overflow-hidden">
                <Sparkles className="absolute -right-4 -top-4 w-32 h-32 text-white/5 rotate-12" />
                <div className="relative z-10">
                  <h4 className="text-sm font-black uppercase tracking-[0.2em] text-amber-400 mb-4">Strategic Faculty Insight</h4>
                  <p className="text-slate-300 text-lg font-medium leading-relaxed tracking-tight italic">
                    "{instAnalysis.insight}"
                  </p>
                  <div className="mt-8 pt-8 border-t border-white/10 grid grid-cols-2 gap-8 text-center">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-1">Scholar Base</p>
                      <p className="text-2xl font-black">{instAnalysis.totalStudents}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-1">Faculty Strength</p>
                      <p className="text-2xl font-black">{instAnalysis.totalEmployees}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <button 
                  onClick={() => setIsInstAnalysisOpen(false)}
                  className="px-8 py-3 bg-slate-100 text-slate-900 font-black text-[10px] uppercase tracking-[0.2em] rounded-2xl hover:bg-slate-200 hover:scale-105 transition-all active:scale-95 cursor-pointer"
                >
                  Dismiss Analysis
                </button>
              </div>
            </>
          )}
        </div>
      </Modal>
    </div>
  );
}
