import { Routes, Route } from 'react-router-dom';
import { useApplyTheme } from '@/hooks/useApplyTheme';
import Employees from './Employees';
import Admins from './Admins';
import Vacancies from './Vacancies';
import Performance from './Performance';
import HRTasks from './Tasks';
import Leaves from './Leaves';
import Attendance from './Attendance';
import Announcements from './Announcements';
import Holidays from './Holidays';
import SurveyCreator from '../org-admin/SurveyCreator';
import DepartmentTeam from '@/components/team/DepartmentTeam';
import DepartmentTasks from '@/components/team/DepartmentTasks';
import DepartmentLeaves from '@/components/team/DepartmentLeaves';
import TeamLeaveStatus from '@/components/team/TeamLeaveStatus';
import EmployeeCards from './EmployeeCards';
import EmployeeDetails from './EmployeeDetails';
import EmployeeCommunications from './EmployeeCommunications';
import RemapEmployees from './RemapEmployees';
import RoleMapping from '../org-admin/RoleMapping';
import { DrillDownModal } from '@/components/shared/DrillDownModal';
import { Modal } from '@/components/shared/Modal';
import { DashboardGreeting } from '@/components/shared/DashboardGreeting';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { Link } from 'react-router-dom';
import { 
  Users, 
  UserPlus, 
  FileText, 
  Calendar, 
  TrendingUp, 
  ArrowRight,
  LayoutDashboard,
  ShieldCheck,
  Zap,
  Briefcase,
  Shuffle,
  Activity
} from 'lucide-react';

function DashboardLanding() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState({
    employeeCount: 0,
    vacancyCount: 0,
    pendingLeaves: 0,
    activeTasks: 0
  });

  const [drillDown, setDrillDown] = useState<{ isOpen: boolean; type: string; title: string }>({
    isOpen: false,
    type: '',
    title: ''
  });

  const openDrillDown = (type: string, title: string) => {
    setDrillDown({ isOpen: true, type, title });
  };

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.get('/hr/stats');
        setStats(res.data);
      } catch (error) {
        console.error('HR Telemetry failure:', error);
      }
    };
    fetchStats();
  }, []);

  const kpis = [
    { label: 'Staff Strength', value: stats.employeeCount, icon: Users, color: 'bg-rose-500', trend: 'Centralized Workforce', type: 'hr_staff' },
    { label: 'Open Vacancies', value: stats.vacancyCount, icon: UserPlus, color: 'bg-blue-600', trend: 'Talent Acquisition', type: 'hr_vacancies' },
    { label: 'Pending Leaves', value: stats.pendingLeaves, icon: Calendar, color: 'bg-amber-500', trend: 'Action Required', type: 'hr_leaves' },
    { label: 'Active Directives', value: stats.activeTasks, icon: FileText, color: 'bg-emerald-500', trend: 'Execution Monitoring', type: 'tasks' },
  ];

  const quickLinks = [
    { title: 'Personnel Control', path: 'employees', icon: Users, desc: 'Centralized Staff Registry' },
    { title: 'Employee Remap', path: 'remap', icon: Shuffle, desc: 'Department Reassignment' },
    { title: 'Hiring Pipeline', path: 'vacancies', icon: UserPlus, desc: 'Vacancy-Based Recruitment' },
    { title: 'Leave Radar', path: 'leaves', icon: Calendar, desc: 'Time-Off Appraisal Hub' },
    { title: 'Performance HUD', path: 'performance', icon: TrendingUp, desc: 'Efficiency & KPI Tracking' },
    { title: 'Survey Master', path: 'surveys', icon: FileText, desc: 'Quality & Sentiment Audits' },
    { title: 'Employee click to fill', path: 'employee-cards', icon: Zap, desc: 'Unique Employee Identity Nodes' },
  ];

  return (
    <div className="p-2 space-y-10 max-w-none mx-auto">
      <DashboardGreeting 
        role="Director - Human Capital"
        name={user?.name || 'Academic Administrator'}
        subtitle={`Workforce identity and institutional performance overview for ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}. Human Capital protocols active.`}
        actions={[
          {
            label: 'Adjudicate Leaves',
            link: '/dashboard/hr/leaves',
            icon: Calendar
          },
          {
            label: 'Staff Performance',
            link: '/dashboard/hr/performance',
            icon: Activity
          }
        ]}
      />

      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpis.map((kpi, i) => (
          <div 
            key={i} 
            onClick={() => openDrillDown(kpi.type, kpi.label)}
            className="bg-white p-7 rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/40 group hover:-translate-y-1 transition-all duration-300 relative overflow-hidden cursor-pointer hover:scale-[1.02] active:scale-95"
          >
            <div className="absolute -right-6 -bottom-6 text-slate-900 opacity-[0.03] transform rotate-[15deg] transition-all duration-700 group-hover:rotate-0 group-hover:scale-125 group-hover:opacity-[0.05] pointer-events-none">
              <kpi.icon className="w-40 h-40" />
            </div>
            
            <div className="relative z-10">
              <div className={`w-14 h-14 rounded-2xl ${kpi.color} flex items-center justify-center text-white mb-6 shadow-lg shadow-current/20 group-hover:scale-110 transition-transform`}>
                <kpi.icon className="w-7 h-7" />
              </div>
              <p className="text-[11px] font-black text-slate-400 tracking-[0.15em] mb-1">{kpi.label}</p>
              <h3 className="text-3xl font-black text-slate-900 tracking-tight mb-2">{(kpi.value ?? 0).toLocaleString()}</h3>
              <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-500 tracking-widest mt-4">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                  {kpi.trend}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Grid: Actions & Operations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Governance Hub */}
        <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between px-2">
                <h3 className="text-xl font-black text-slate-900 flex items-center gap-3 tracking-tight">
                    <LayoutDashboard className="w-5 h-5 text-rose-600" />
                    Operational shortcuts
                </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {quickLinks.map((link, i) => (
                    <Link 
                        key={i}
                        to={link.path}
                        className="p-6 bg-white rounded-3xl border border-slate-200 hover:border-rose-500 hover:shadow-2xl hover:shadow-rose-500/10 transition-all group relative overflow-hidden"
                    >
                        <div className="flex items-center gap-4 relative z-10">
                            <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-600 group-hover:bg-slate-900 group-hover:text-white transition-colors">
                                <link.icon className="w-6 h-6" />
                            </div>
                            <div>
                                <h4 className="font-bold text-slate-900">{link.title}</h4>
                                <p className="text-xs text-slate-500 font-medium">{link.desc}</p>
                            </div>
                        </div>
                        <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                            <ArrowRight className="w-5 h-5 text-slate-300" />
                        </div>
                    </Link>
                ))}
            </div>
        </div>

        {/* System Integrity (Compliance Cards) */}
        <div className="space-y-6">
            <h3 className="text-xl font-black text-slate-900 px-2 tracking-tight">Compliance & health</h3>
            <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl shadow-slate-900/30 space-y-6 relative overflow-hidden">
                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-6">
                        <ShieldCheck className="w-6 h-6 text-emerald-400" />
                        <h4 className="font-black text-sm tracking-widest">Attendance shield</h4>
                    </div>
                    <p className="text-slate-400 text-sm font-medium leading-relaxed mb-6">
                        Biometric & IP-fenced attendance tracking. Real-time logging of institutional workforce presence.
                    </p>
                    <Link 
                        to="attendance"
                        className="block w-full py-4 bg-white/10 hover:bg-white text-white hover:text-slate-900 rounded-2xl text-center font-black text-xs transition-all border border-white/10 tracking-widest"
                    >
                        Review Attendance
                    </Link>
                </div>
                
                <div className="pt-6 border-t border-white/10 flex items-center gap-4 relative z-10">
                   <div className="w-10 h-10 rounded-xl bg-rose-500/20 flex items-center justify-center">
                        <Users className="w-5 h-5 text-rose-400" />
                   </div>
                   <div>
                        <p className="text-[10px] font-black text-white tracking-widest">Policy engine v2</p>
                        <p className="text-xs text-slate-400 font-medium tracking-tight">Hierarchical Control Engaged</p>
                   </div>
                </div>
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

export default function HRDashboard() {
  useApplyTheme();
  return (
    <Routes>
      <Route path="/" element={<DashboardLanding />} />
      <Route path="vacancies" element={<Vacancies />} />
      <Route path="employees" element={<Employees />} />
      <Route path="employees/:id" element={<EmployeeDetails />} />
      <Route path="remap" element={<RemapEmployees />} />
      <Route path="role-mapping" element={<RoleMapping />} />
      <Route path="admins" element={<Admins />} />
      <Route path="performance" element={<Performance />} />
      <Route path="tasks" element={<HRTasks />} />
      <Route path="leaves" element={<Leaves />} />
      <Route path="attendance" element={<Attendance />} />
      <Route path="announcements" element={<Announcements />} />
      <Route path="holidays" element={<Holidays />} />
      <Route path="surveys" element={<SurveyCreator />} />
      <Route path="dept-team" element={<DepartmentTeam />} />
      <Route path="dept-tasks" element={<DepartmentTasks />} />
      <Route path="dept-leaves" element={<DepartmentLeaves />} />
      <Route path="dept-leave-status" element={<TeamLeaveStatus />} />
      <Route path="employee-cards" element={<EmployeeCards />} />
      <Route path="employee-communications" element={<EmployeeCommunications />} />
    </Routes>
  );
}
