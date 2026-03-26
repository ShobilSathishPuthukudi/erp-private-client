import { Routes, Route, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import Universities from './Universities';
import Programs from './Programs';
import Students from './Students';
import PendingReviews from './PendingReviews';
import Sessions from './Sessions';
import CredentialRequests from './CredentialRequests';
import SecurityControl from './SecurityControl';
import AcademicStaff from './AcademicStaff';
import AcademicTasks from './AcademicTasks';
import ReferredLeads from './ReferredLeads';
import FinanceRequests from './FinanceRequests';
import Exams from './Exams';
import MarksEntry from './MarksEntry';
import { 
  Building2, 
  BookOpen, 
  ShieldCheck,
  Calendar,
  Key,
  ArrowRight, 
  TrendingUp,
  LayoutDashboard,
  ShieldAlert,
  GraduationCap
} from 'lucide-react';

// Sub-module Placeholders (to be implemented in detail later or as requested)
const UniversityDetails = () => <div className="p-8"><h2 className="text-2xl font-black">University Registry Depth</h2></div>;
const ProgramDetails = () => <div className="p-8"><h2 className="text-2xl font-black">Program Architecture Depth</h2></div>;
const Announcements = () => <div className="p-8"><h2 className="text-2xl font-black">Departmental Directives</h2></div>;

function DashboardLanding() {
  const [stats, setStats] = useState({
    totalUniversities: 0,
    activePrograms: 0,
    pendingReviews: 0,
    revenue: 0
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.get('/academic/stats');
        setStats(res.data);
      } catch (error) {
        console.error('Telemetry failure:', error);
      }
    };
    fetchStats();
  }, []);

  const kpis = [
    { label: 'Accredited Unis', value: stats.totalUniversities, icon: Building2, color: 'bg-blue-500', trend: 'Institutional Partners' },
    { label: 'Total Programs', value: stats.activePrograms, icon: BookOpen, color: 'bg-indigo-600', trend: 'Academic Breadth' },
    { label: 'Pending Appraisals', value: stats.pendingReviews, icon: ShieldCheck, color: 'bg-amber-500', trend: 'Action Required' },
    { label: 'Revenue (MTD)', value: `₹${(stats.revenue / 1000000).toFixed(1)}M`, icon: TrendingUp, color: 'bg-emerald-500', trend: 'Financial Health' },
  ];

  const quickLinks = [
    { title: 'Onboard University', path: 'universities', icon: Building2, desc: 'Register New Accredited Body' },
    { title: 'Formulate Program', path: 'programs', icon: BookOpen, desc: 'Design New Academic Track' },
    { title: 'Deploy Session', path: 'sessions', icon: Calendar, desc: 'Initialize Batch Enrollment' },
    { title: 'Secure Reveal HUD', path: 'credential-requests', icon: ShieldCheck, desc: 'Request & Audit Credential Access' },
  ];

  return (
    <div className="space-y-10 max-w-[1600px] mx-auto p-4 lg:p-8">
      {/* Header Section */}
      <div className="bg-slate-900 rounded-[3rem] p-10 md:p-16 text-white relative overflow-hidden shadow-2xl shadow-slate-900/40">
        <div className="relative z-10 max-w-3xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center backdrop-blur-xl border border-white/10">
                <GraduationCap className="w-6 h-6 text-indigo-400" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-300">IITS RPS ERP v3</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-black mb-6 tracking-tighter leading-none">
            Academic <span className="text-indigo-400 font-outline-2">Operations</span> Backbone.
          </h1>
          <p className="text-lg md:text-xl text-slate-400 font-medium leading-relaxed mb-10 max-w-2xl">
            Unified institutional governance HUD for university accreditation, program architecture, and student eligibility appraisal workflows.
          </p>
          <div className="flex flex-wrap gap-4">
            {quickLinks.slice(0, 2).map((link, i) => (
              <Link 
                key={i}
                to={link.path}
                className="flex items-center gap-3 bg-white text-slate-900 px-8 py-4 rounded-2xl font-black text-sm hover:bg-indigo-400 transition-all active:scale-95 group"
              >
                <link.icon className="w-5 h-5" />
                {link.title}
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Link>
            ))}
          </div>
        </div>
        
        {/* Abstract shapes for premium look */}
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-indigo-500/10 to-transparent pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-indigo-600/20 rounded-full blur-[100px] pointer-events-none" />
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpis.map((kpi, i) => (
          <div key={i} className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-xl shadow-slate-200/50 group hover:border-indigo-200 transition-all">
            <div className={`w-14 h-14 rounded-2xl ${kpi.color} flex items-center justify-center text-white mb-6 shadow-lg shadow-current/20 group-hover:scale-110 transition-transform`}>
              <kpi.icon className="w-7 h-7" />
            </div>
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">{kpi.label}</p>
            <h3 className="text-4xl font-black text-slate-900 mb-2">{kpi.value}</h3>
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase">
                <TrendingUp className="w-3 h-3 text-emerald-500" />
                {kpi.trend}
            </div>
          </div>
        ))}
      </div>

      {/* Grid: Actions & Queue */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Governance Hub */}
        <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between px-2">
                <h3 className="text-xl font-black text-slate-900 flex items-center gap-3 uppercase tracking-tight">
                    <LayoutDashboard className="w-5 h-5 text-indigo-600" />
                    Governance Shortcuts
                </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {quickLinks.map((link, i) => (
                    <Link 
                        key={i}
                        to={link.path}
                        className="p-6 bg-white rounded-3xl border border-slate-200 hover:border-indigo-500 hover:shadow-2xl hover:shadow-indigo-500/10 transition-all group relative overflow-hidden"
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

        {/* Security / Criticals */}
        <div className="space-y-6">
            <h3 className="text-xl font-black text-slate-900 px-2 uppercase tracking-tight">System Integrity</h3>
            <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl shadow-slate-900/30 space-y-6 relative overflow-hidden">
                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-6">
                        <Key className="w-6 h-6 text-rose-400" />
                        <h4 className="font-black text-sm uppercase tracking-widest">Secret Reveal HUD</h4>
                    </div>
                    <p className="text-slate-400 text-sm font-medium leading-relaxed mb-6">
                        Automated IP-logged reveal requests for institutional credentials. All actions are ratified by the Finance gateway.
                    </p>
                    <Link 
                        to="credential-requests"
                        className="block w-full py-4 bg-white/10 hover:bg-white text-white hover:text-slate-900 rounded-2xl text-center font-black text-xs transition-all border border-white/10 uppercase tracking-widest"
                    >
                        Enter Secure Vault
                    </Link>
                </div>
                
                <div className="pt-6 border-t border-white/10 flex items-center gap-4 relative z-10">
                   <div className="w-10 h-10 rounded-xl bg-rose-500/20 flex items-center justify-center">
                        <ShieldAlert className="w-5 h-5 text-rose-400" />
                   </div>
                   <div>
                        <p className="text-[10px] font-black uppercase text-white tracking-widest">Audit Policy v3</p>
                        <p className="text-xs text-slate-400 font-medium tracking-tight">GAP-5: Global Interceptor Engaged</p>
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

export default function AcademicDashboard() {
  return (
    <Routes>
      <Route path="/" element={<DashboardLanding />} />
      
      {/* Architecture */}
      <Route path="universities" element={<Universities />} />
      <Route path="universities/:id" element={<UniversityDetails />} />
      <Route path="programs" element={<Programs />} />
      <Route path="programs/:id" element={<ProgramDetails />} />

      {/* Student Review */}
      <Route path="pending-reviews" element={<PendingReviews />} />
      <Route path="students" element={<Students />} />

      {/* Marks & Sessions */}
      <Route path="sessions" element={<Sessions />} />
      <Route path="exams" element={<Exams />} />
      <Route path="exams/:id/marks" element={<MarksEntry />} />

      {/* Credentials */}
      <Route path="credential-requests" element={<CredentialRequests />} />
      <Route path="security" element={<SecurityControl />} />

      {/* Operational Support */}
      <Route path="staff" element={<AcademicStaff />} />
      <Route path="tasks" element={<AcademicTasks />} />
      <Route path="announcements" element={<Announcements />} />
      <Route path="referrals" element={<ReferredLeads />} />
      <Route path="finance-requests" element={<FinanceRequests />} />
    </Routes>
  );
}
