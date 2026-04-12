import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { 
  Users, 
  Layout, 
  Clock, 
  ArrowRight, 
  UserPlus, 
  Bell,
  Sparkles 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AnnouncementBoard from '@/components/shared/AnnouncementBoard';
import { Modal } from '@/components/shared/Modal';
import AdmissionWizard from './AdmissionWizard';
import { DrillDownModal } from '@/components/shared/DrillDownModal';

export default function Dashboard() {
  const user = useAuthStore(state => state.user);
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalStudents: 0,
    pendingAdmissions: 0,
    activePrograms: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmissionModalOpen, setIsAdmissionModalOpen] = useState(false);
  const [drillDown, setDrillDown] = useState<{ isOpen: boolean; type: string; title: string }>({
    isOpen: false,
    type: '',
    title: ''
  });

  const openDrillDown = (type: string, title: string) => {
    setDrillDown({ isOpen: true, type, title });
  };

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setIsLoading(true);
        const [studentRes, programRes] = await Promise.all([
          api.get('/portals/partner-center/students'),
          api.get('/portals/partner-center/programs')
        ]);
        
        const students = studentRes.data || [];
        const programs = programRes.data || [];
        
        setStats({
          totalStudents: students.filter((s:any) => s.status === 'ENROLLED').length,
          pendingAdmissions: students.filter((s:any) => s.status !== 'ENROLLED' && s.status !== 'REJECTED').length,
          activePrograms: programs.length
        });
      } catch (error) {
        console.error('Failed to fetch dashboard telemetry:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

  return (
    <div className="space-y-8 p-6 lg:p-10 animate-in fade-in duration-700">
      {/* Premium Welcome Header */}
      <div className="relative overflow-hidden bg-slate-900 rounded-[2.5rem] p-10 text-white shadow-2xl border border-white/10">
        <div className="absolute top-0 right-0 p-12 opacity-10">
            <Layout className="w-64 h-64 -rotate-12" />
        </div>
        <div className="relative z-10">
            <div className="flex items-center gap-3 mb-6">
                <div className="bg-blue-500/20 backdrop-blur-xl p-3 rounded-2xl border border-blue-400/30">
                    <Sparkles className="w-6 h-6 text-blue-400" />
                </div>
                <span className="text-blue-400 font-bold uppercase tracking-[0.2em] text-[10px]">Institutional Node Active</span>
            </div>
            <h1 className="text-4xl lg:text-5xl font-black tracking-tight mb-4">
                Welcome, {(user?.name || 'Academic Administrator').split(' ')[0]}
            </h1>
            <p className="text-slate-400 text-lg max-w-2xl leading-relaxed">
                Your portal for institutional governance and student lifecycle management is fully synchronized with our central framework.
            </p>
            
            <div className="flex flex-wrap gap-4 mt-10">
                <button 
                  onClick={() => setIsAdmissionModalOpen(true)}
                  className="bg-white text-slate-900 px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-50 hover:scale-105 active:scale-95 transition-all flex items-center gap-2 group border border-white/20 shadow-xl"
                >
                    <UserPlus className="w-4 h-4" />
                    Initiate Admission
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
                <button 
                  onClick={() => navigate('programs')}
                  className="bg-slate-800/50 backdrop-blur-md text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 hover:scale-105 active:scale-95 transition-all flex items-center gap-2 border border-white/10"
                >
                    Browse Programs
                </button>
            </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div 
            onClick={() => openDrillDown('totalStudents', 'Enrolled Students')}
            className="bg-white p-7 rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/40 group transition-all duration-300 relative overflow-hidden cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
          >
              <div className="absolute -right-6 -bottom-6 text-blue-600 opacity-[0.03] transform rotate-[15deg] transition-all duration-700 group-hover:rotate-0 group-hover:scale-125 group-hover:opacity-[0.05] pointer-events-none">
                  <Users className="w-40 h-40" />
              </div>
              <div className="relative z-10">
                <div className="flex items-center gap-4 mb-6">
                    <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 border border-blue-100 transition-transform group-hover:scale-110 shadow-sm">
                        <Users className="w-7 h-7" />
                    </div>
                    <div>
                      <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.15em] leading-none mb-1">Enrolled Students</h3>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Successfully onboarded</p>
                    </div>
                </div>
                <div className="flex items-baseline gap-2">
                   <span className="text-4xl font-black text-slate-900 tracking-tight">{isLoading ? '...' : stats.totalStudents}</span>
                   <span className="text-emerald-500 text-[10px] font-black uppercase tracking-widest bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">Live Active</span>
                </div>
              </div>
          </div>

          <div 
            onClick={() => openDrillDown('pendingAdmissions', 'Students in Review')}
            className="bg-white p-7 rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/40 group transition-all duration-300 relative overflow-hidden cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
          >
              <div className="absolute -right-6 -bottom-6 text-amber-600 opacity-[0.03] transform rotate-[15deg] transition-all duration-700 group-hover:rotate-0 group-hover:scale-125 group-hover:opacity-[0.05] pointer-events-none">
                  <Clock className="w-40 h-40" />
              </div>
              <div className="relative z-10">
                <div className="flex items-center gap-4 mb-6">
                    <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600 border border-amber-100 transition-transform group-hover:scale-110 shadow-sm">
                        <Clock className="w-7 h-7" />
                    </div>
                    <div>
                      <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.15em] leading-none mb-1">In Review</h3>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Pending clearance</p>
                    </div>
                </div>
                <div className="flex items-baseline gap-2">
                   <span className="text-4xl font-black text-slate-900 tracking-tight">{isLoading ? '...' : stats.pendingAdmissions}</span>
                   <span className="text-amber-500 text-[10px] font-black uppercase tracking-widest bg-amber-50 px-2 py-0.5 rounded-md border border-amber-100">Pipeline</span>
                </div>
              </div>
          </div>

          <div 
            onClick={() => openDrillDown('programs', 'Sanctioned Programs')}
            className="bg-white p-7 rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/40 group transition-all duration-300 relative overflow-hidden cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
          >
              <div className="absolute -right-6 -bottom-6 text-emerald-600 opacity-[0.03] transform rotate-[15deg] transition-all duration-700 group-hover:rotate-0 group-hover:scale-125 group-hover:opacity-[0.05] pointer-events-none">
                  <Layout className="w-40 h-40" />
              </div>
              <div className="relative z-10">
                <div className="flex items-center gap-4 mb-6">
                    <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 border border-emerald-100 transition-transform group-hover:scale-110 shadow-sm">
                        <Layout className="w-7 h-7" />
                    </div>
                    <div>
                      <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.15em] leading-none mb-1">Sanctioned Progs</h3>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Frameworks assigned</p>
                    </div>
                </div>
                <div className="flex items-baseline gap-2">
                   <span className="text-4xl font-black text-slate-900 tracking-tight">{isLoading ? '...' : stats.activePrograms}</span>
                   <span className="text-emerald-500 text-[10px] font-black uppercase tracking-widest bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">Authorized</span>
                </div>
              </div>
          </div>
      </div>

      {/* Announcements Section */}
      <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-4">
                <div className="bg-white p-3 rounded-xl shadow-sm border border-slate-100">
                    <Bell className="w-6 h-6 text-slate-600" />
                </div>
                <div>
                   <h2 className="text-xl font-black text-slate-900 tracking-tight">Institutional Directives</h2>
                   <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-0.5">Academic & HR Operations</p>
                </div>
            </div>
            <button 
              onClick={() => navigate('announcements')}
              className="text-blue-600 text-xs font-black uppercase tracking-widest hover:text-blue-700 underline-offset-4 hover:underline"
            >
                View Full Board
            </button>
        </div>
        <div className="p-4 bg-white">
            <AnnouncementBoard />
        </div>
      </div>
      {/* Admission Wizard Modal */}
      <Modal
        isOpen={isAdmissionModalOpen}
        onClose={() => setIsAdmissionModalOpen(false)}
        title="Institutional Admission Wizard"
        maxWidth="2xl"
      >
        <AdmissionWizard 
          onClose={() => setIsAdmissionModalOpen(false)} 
          onSuccess={() => {
            setIsAdmissionModalOpen(false);
            // Optionally refresh stats or redirect
          }} 
        />
      </Modal>

      <DrillDownModal 
        isOpen={drillDown.isOpen}
        onClose={() => setDrillDown({ ...drillDown, isOpen: false })}
        type={drillDown.type}
        title={drillDown.title}
      />
    </div>
  );
}
