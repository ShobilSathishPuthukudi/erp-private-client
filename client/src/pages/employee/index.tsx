import { Routes, Route, Link } from 'react-router-dom';
import { useApplyTheme } from '@/hooks/useApplyTheme';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import MyTasks from './MyTasks';
import LeaveRequests from './LeaveRequests';
import Announcements from './Announcements';
import HRContact from './HRContact';
import MyCenters from './MyCenters';
import InstitutionalUniversities from './InstitutionalUniversities';
import InstitutionalPrograms from './InstitutionalPrograms';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store/authStore';
import { Modal } from '@/components/shared/Modal';
import { DashboardGreeting } from '@/components/shared/DashboardGreeting';
import { PageHeader } from '@/components/shared/PageHeader';
import { LayoutDashboard } from 'lucide-react';
import { 
  Trophy, 
  Target, 
  Clock, 
  AlertCircle, 
  Briefcase, 
  Calendar,
  ArrowRight,
  Zap,
  ShieldCheck,
  Building2,
  GraduationCap,
  Users,
  ExternalLink,
  LifeBuoy
} from 'lucide-react';

export default function EmployeePortal() {
  useApplyTheme();
  const user = useAuthStore(state => state.user);
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Drill-down Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalData, setModalData] = useState<any[]>([]);
  const [modalType, setModalType] = useState<string>('');
  const [isModalLoading, setIsModalLoading] = useState(false);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/portals/employee/performance');
      setStats(res.data);
    } catch (error) {
      console.error('Failed to load performance stats');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCardClick = async (type: string, title: string) => {
    setModalOpen(true);
    setModalTitle(title);
    setModalType(type);
    setIsModalLoading(true);
    setModalData([]);

    try {
      let endpoint = '';
      if (type.includes('task')) {
        endpoint = '/portals/employee/tasks';
      } else if (type === 'leads') {
        endpoint = '/portals/employee/my-centers';
      } else if (type === 'universities') {
        endpoint = '/academic/universities';
      } else if (type === 'programs') {
        endpoint = '/academic/programs';
      }

      if (endpoint) {
        const res = await api.get(endpoint);
        let data = Array.isArray(res.data) ? res.data : [];

        // Frontend filtering for task subsets
        if (type === 'task-completed') data = data.filter((t: any) => t.status === 'completed');
        if (type === 'task-pending') data = data.filter((t: any) => t.status === 'pending' || t.status === 'in_progress');
        if (type === 'task-overdue') data = data.filter((t: any) => t.status === 'overdue' || (new Date(t.deadline) < new Date() && t.status !== 'completed'));

        setModalData(data);
      }
    } catch (error) {
      toast.error('Failed to fetch detailed metrics');
    } finally {
      setIsModalLoading(false);
    }
  };

  const renderModalContent = () => {
    if (isModalLoading) return <div className="py-12 text-center animate-pulse font-mono font-bold text-slate-400">PULLING RECORDSET...</div>;
    if (modalData.length === 0) return <div className="py-12 text-center text-slate-400 font-medium italic">No active records located in this node.</div>;

    return (
      <div className="space-y-4">
        {modalType.includes('task') && (
          <div className="grid gap-3">
            {modalData.map(task => (
              <div key={task.id} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between group hover:border-blue-500 transition-all">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${task.status === 'completed' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'}`}>
                    <Briefcase className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 leading-tight">{task.title}</h4>
                    <p className="text-[10px] font-bold text-slate-400 tracking-widest mt-1">Ref: {task.id} • Deadline: {new Date(task.deadline).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className={`px-4 py-1.5 rounded-full text-[10px] font-black tracking-widest ${
                  task.status === 'completed' ? 'bg-emerald-50 text-emerald-600' : 
                  task.status === 'overdue' ? 'bg-rose-50 text-rose-600' : 'bg-slate-50 text-slate-600'
                }`}>
                  {task.status}
                </div>
              </div>
            ))}
          </div>
        )}

        {modalType === 'leads' && (
          <div className="grid gap-3">
            {modalData.map(center => (
              <div key={center.id} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between group hover:border-violet-500 transition-all">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-violet-50 text-violet-600 rounded-xl flex items-center justify-center">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 leading-tight">{center.name}</h4>
                    <p className="text-[10px] font-bold text-slate-400 tracking-widest mt-1">Alias: {center.alias} • Registered: {new Date(center.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-black tracking-widest px-4 py-1.5 bg-slate-900 text-white rounded-full">
                    {center.centerStatus}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {modalType === 'universities' && (
          <div className="grid gap-3">
            {modalData.map(uni => (
              <div key={uni.id} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between group hover:border-blue-500 transition-all">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center font-black">
                    {uni.shortName?.substring(0, 2)}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 leading-tight">{uni.name}</h4>
                    <p className="text-[10px] font-bold text-slate-400 tracking-widest mt-1">Status: {uni.status} • Accreditation: {uni.accreditation || 'UGC Approved'}</p>
                  </div>
                </div>
                <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-300 group-hover:text-blue-600 transition-colors">
                  <ExternalLink className="w-5 h-5" />
                </div>
              </div>
            ))}
          </div>
        )}

        {modalType === 'programs' && (
          <div className="grid gap-3">
            {modalData.map(prog => (
              <div key={prog.id} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between group hover:border-indigo-500 transition-all">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                    <GraduationCap className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 leading-tight">{prog.name}</h4>
                    <p className="text-[10px] font-bold text-slate-400 tracking-widest mt-1">{prog.university?.name || 'Institutional Program'} • Type: {prog.type}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black tracking-widest text-slate-400 mb-0.5">Investment</p>
                  <p className="text-sm font-black text-slate-900">₹{prog.totalFee?.toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const StatCard = ({ title, value, label, icon: Icon, color, onClick, index = 0 }: any) => {
    return (
      <div 
        onClick={onClick}
        style={{ animationFillMode: 'both', animationDelay: `${index * 75}ms` }}
        className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between group hover:border-slate-300 hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer relative overflow-hidden h-full animate-in fade-in slide-in-from-bottom-4 duration-500"
      >
        <div className={`absolute -right-6 -bottom-6 ${color.text} opacity-[0.03] transform rotate-[15deg] transition-all duration-700 group-hover:rotate-0 group-hover:scale-125 group-hover:opacity-[0.05] pointer-events-none`}>
          <Icon className="w-32 h-32" />
        </div>

        <div className="relative z-10 flex flex-col justify-between h-full">
          <div className="flex justify-between items-start mb-4">
            <div className={`p-3 rounded-xl ${color.bg} shadow-inner`}>
              <Icon className={`w-6 h-6 ${color.text}`} />
            </div>
            <span className={`text-[10px] font-black tracking-[0.2em] ${color.text} transition-opacity duration-300`}>{title}</span>
          </div>
          <div>
            <p className="text-3xl font-black text-slate-900 tracking-tight">{typeof value === 'number' ? value.toLocaleString() : value}</p>
            <p className="text-[11px] font-bold text-slate-400 tracking-wider mt-1 px-0.5">{label}</p>
          </div>
        </div>
      </div>
    );
  };

  const Dashboard = () => {
    if (isLoading) return <div className="p-8 text-center animate-pulse font-mono font-bold text-slate-400">SYNCING PERFORMANCE TELEMETRY...</div>;

    return (
      <div className="p-2 space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
        {/* Header Section */}
        <PageHeader 
          title={`Staff terminal - ${user?.name || 'Academic Administrator'}`}
          description={`Institutional workforce identity: ${user?.uid}. Operational telemetry and performance analytics synchronized for ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}.`}
          icon={LayoutDashboard}
          action={
            <div className="flex gap-2">
              <Link to="tasks" className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-900 rounded-xl text-xs font-black hover:bg-slate-50 transition-all active:scale-95 shadow-sm">
                  <Briefcase className="w-4 h-4 text-blue-600" />
                  Execution desk
              </Link>
              <Link to="leaves" className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-black hover:bg-slate-800 transition-all active:scale-95 shadow-xl shadow-slate-900/20">
                  <Calendar className="w-4 h-4 text-amber-400" />
                  Presence request
              </Link>
            </div>
          }
        />

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard 
            index={1}
            title="Total"
            value={stats?.total}
            label="Assigned Tasks"
            icon={Target}
            color={{ bg: 'bg-blue-50', text: 'text-blue-600' }}
            onClick={() => handleCardClick('task-total', 'Total Assigned Tasks')}
          />

          <StatCard 
            index={2}
            title="Success"
            value={stats?.completed}
            label="Finalized Nodes"
            icon={Zap}
            color={{ bg: 'bg-emerald-50', text: 'text-emerald-600' }}
            onClick={() => handleCardClick('task-completed', 'Finalized Operational Nodes')}
          />

          <StatCard 
            index={3}
            title="In Flight"
            value={stats?.pending}
            label="Active Execution"
            icon={Clock}
            color={{ bg: 'bg-amber-50', text: 'text-amber-600' }}
            onClick={() => handleCardClick('task-pending', 'Active Execution Queue')}
          />

          <StatCard 
            index={4}
            title="Risk"
            value={stats?.overdue}
            label="Overdue Breaches"
            icon={AlertCircle}
            color={{ bg: 'bg-red-50', text: 'text-red-600' }}
            onClick={() => handleCardClick('task-overdue', 'Operational Overdue Breaches')}
          />

          {stats?.universityCount !== undefined && (
            <StatCard 
              index={5}
              title="Growth"
              value={stats?.universityCount}
              label="Total Universities"
              icon={Building2}
              color={{ bg: 'bg-blue-50', text: 'text-blue-600' }}
              onClick={() => handleCardClick('universities', 'Partnered University Roster')}
            />
          )}

          {stats?.programCount !== undefined && (
            <StatCard 
              index={6}
              title="Catalog"
              value={stats?.programCount}
              label="Academic Programs"
              icon={GraduationCap}
              color={{ bg: 'bg-indigo-50', text: 'text-indigo-600' }}
              onClick={() => handleCardClick('programs', 'Academic Catalog Inventory')}
            />
          )}

          {stats?.leadsCount !== undefined && (
            <StatCard 
              index={7}
              title="Recruitment"
              value={stats?.leadsCount}
              label="Total Leads"
              icon={Users}
              color={{ bg: 'bg-violet-50', text: 'text-violet-600' }}
              onClick={() => handleCardClick('leads', 'Managed Managed Pipeline Leads')}
            />
          )}
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
           <Link to="tasks" className="bg-slate-900 p-10 rounded-[3rem] text-white shadow-2xl relative overflow-hidden group hover:scale-[1.02] transition-all">
              <div className="absolute top-0 right-0 p-10 opacity-10 group-hover:scale-110 transition-transform">
                 <Briefcase className="w-32 h-32" />
              </div>
              <div className="relative z-10">
                 <h2 className="text-3xl font-black mb-2">My desk</h2>
                 <p className="text-slate-400 font-medium max-w-xs">Access your assigned operational deliverables and upload execution evidence.</p>
                  <div className="mt-8 flex items-center gap-3 text-blue-400 font-black text-xs tracking-[0.2em]">
                     <span>Enter terminal</span>
                     <ArrowRight className="w-4 h-4" />
                  </div>
              </div>
           </Link>

           <Link to="leaves" className="bg-white p-10 rounded-[3rem] border-2 border-slate-100 shadow-xl shadow-slate-100/50 relative overflow-hidden group hover:scale-[1.02] transition-all hover:border-blue-100">
              <div className="absolute top-0 right-0 p-10 opacity-5 group-hover:scale-110 transition-transform text-blue-600">
                 <Calendar className="w-32 h-32" />
              </div>
              <div className="relative z-10">
                 <h2 className="text-3xl font-black mb-2 text-slate-900">Leave console</h2>
                 <p className="text-slate-500 font-medium max-w-xs">Manage your institutional presence and request administrative time-off.</p>
                  <div className="mt-8 flex items-center gap-3 text-blue-600 font-black text-xs tracking-[0.2em]">
                     <span>Open requests</span>
                     <ArrowRight className="w-4 h-4" />
                  </div>
              </div>
           </Link>

           <Link to="hr-contact" className="bg-white p-10 rounded-[3rem] border-2 border-slate-100 shadow-xl shadow-slate-100/50 relative overflow-hidden group hover:scale-[1.02] transition-all hover:border-emerald-100">
              <div className="absolute top-0 right-0 p-10 opacity-5 group-hover:scale-110 transition-transform text-emerald-600">
                 <LifeBuoy className="w-32 h-32" />
              </div>
              <div className="relative z-10">
                 <h2 className="text-3xl font-black mb-2 text-slate-900">Contact HR</h2>
                 <p className="text-slate-500 font-medium max-w-xs">Send payroll, attendance, leave, document, or policy questions directly to Human Resources.</p>
                  <div className="mt-8 flex items-center gap-3 text-emerald-600 font-black text-xs tracking-[0.2em]">
                     <span>Open HR desk</span>
                     <ArrowRight className="w-4 h-4" />
                  </div>
              </div>
           </Link>
        </div>

        {/* Sales Link & CRM for BDEs - Visible if Role is Sales OR Department is Sales */}
        {(user?.role === 'Sales & CRM Admin' || user?.departmentName?.toLowerCase().includes('sales')) && (
          <div className="space-y-8">
            <div className="bg-slate-50 border border-slate-100 rounded-[3rem] p-8 flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-6">
                  <div className="w-16 h-16 bg-blue-600 rounded-[1.5rem] flex items-center justify-center text-white shadow-xl shadow-blue-100 font-black text-2xl">
                    <ShieldCheck className="w-8 h-8 text-white/90" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">Institutional outreach</h2>
                    <p className="text-slate-500 font-medium">Your unique center registration link is active. Share it to capture new leads into your pipeline.</p>
                  </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                  <button 
                    onClick={() => {
                      const link = `${window.location.origin}/register-center/${user?.uid}`;
                      navigator.clipboard.writeText(link);
                      toast.success('Partnership link copied to clipboard!');
                    }}
                    className="bg-white text-slate-900 px-8 py-4 rounded-2xl font-black text-[10px] tracking-widest border border-slate-200 hover:bg-slate-50 transition-all shadow-sm flex items-center gap-3"
                  >
                    <Zap className="w-4 h-4 text-blue-600" />
                    Copy share link
                  </button>

              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <Link to="universities" className="bg-white p-10 rounded-[3rem] border-2 border-slate-100 shadow-xl shadow-slate-100/50 relative overflow-hidden group hover:scale-[1.02] transition-all hover:border-blue-100">
                  <div className="absolute top-0 right-0 p-10 opacity-5 group-hover:scale-110 transition-transform text-blue-600">
                    <Building2 className="w-24 h-24" />
                  </div>
                  <div className="relative z-10">
                    <h2 className="text-2xl font-black mb-2 text-slate-900">Partnered universities</h2>
                    <p className="text-slate-500 text-sm font-medium max-w-xs leading-relaxed">View all institutional affiliations and accreditation data for partner enrollment.</p>
                    <div className="mt-6 flex items-center gap-3 text-blue-600 font-black text-[10px] tracking-widest">
                        <span>View university roster</span>
                        <ArrowRight className="w-4 h-4" />
                    </div>
                  </div>
              </Link>

              <Link to="programs" className="bg-white p-10 rounded-[3rem] border-2 border-slate-100 shadow-xl shadow-slate-100/50 relative overflow-hidden group hover:scale-[1.02] transition-all hover:border-blue-100">
                  <div className="absolute top-0 right-0 p-10 opacity-5 group-hover:scale-110 transition-transform text-indigo-600">
                    <GraduationCap className="w-24 h-24" />
                  </div>
                  <div className="relative z-10">
                    <h2 className="text-2xl font-black mb-2 text-slate-900">Academic catalog</h2>
                    <p className="text-slate-500 text-sm font-medium max-w-xs leading-relaxed">Access the full list of degree programs, vocational streams, and fee structures.</p>
                    <div className="mt-6 flex items-center gap-3 text-indigo-600 font-black text-[10px] tracking-widest">
                        <span>Search programs</span>
                        <ArrowRight className="w-4 h-4" />
                    </div>
                  </div>
              </Link>
            </div>
          </div>
        )}

        <Modal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          title={modalTitle}
          maxWidth="4xl"
        >
          {renderModalContent()}
        </Modal>
      </div>
    );
  };

  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="tasks" element={<MyTasks />} />
      <Route path="leaves" element={<LeaveRequests />} />
      <Route path="hr-contact" element={<HRContact />} />
      <Route path="announcements" element={<Announcements />} />
      {(user?.role === 'Sales & CRM Admin' || user?.departmentName?.toLowerCase().includes('sales')) && (
        <>
          <Route path="centers" element={<MyCenters />} />
          <Route path="universities" element={<InstitutionalUniversities />} />
          <Route path="programs" element={<InstitutionalPrograms />} />
        </>
      )}
    </Routes>
  );
}
