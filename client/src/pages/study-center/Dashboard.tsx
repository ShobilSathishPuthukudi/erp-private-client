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
  Sparkles,
  Building2 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AnnouncementBoard from '@/components/shared/AnnouncementBoard';
import { Modal } from '@/components/shared/Modal';
import AdmissionWizard from './AdmissionWizard';
import { DrillDownModal } from '@/components/shared/DrillDownModal';
import { DashboardGreeting } from '@/components/shared/DashboardGreeting';

export default function Dashboard() {
  const user = useAuthStore(state => state.user);
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalStudents: 0,
    pendingAdmissions: 0,
    activePrograms: 0,
    totalUniversities: 0
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
        
        // Extract unique universities from programs
        const universityIds = new Set(programs.map((p: any) => p.program?.universityId).filter(Boolean));

        setStats({
          totalStudents: students.filter((s:any) => s.status === 'ENROLLED').length,
          pendingAdmissions: students.filter((s:any) => s.status !== 'ENROLLED' && s.status !== 'REJECTED').length,
          activePrograms: programs.length,
          totalUniversities: universityIds.size
        });
      } catch (error) {
        console.error('Failed to fetch dashboard telemetry:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

  const kpis = [
    { label: 'Enrolled students', value: stats.totalStudents, icon: Users, color: 'blue', type: 'totalStudents', trend: 'Live active' },
    { label: 'In review', value: stats.pendingAdmissions, icon: Clock, color: 'amber', type: 'pendingAdmissions', trend: 'Pipeline' },
    { label: 'Sanctioned programs', value: stats.activePrograms, icon: Layout, color: 'emerald', type: 'programs', trend: 'Authorized' },
    { label: 'Universities', value: stats.totalUniversities, icon: Building2, color: 'rose', type: 'universities', trend: 'Sanctioned' },
  ];

  const colorThemes: Record<string, { bg: string, text: string, border: string, icon: string }> = {
    blue: { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-100', icon: 'text-blue-600' },
    amber: { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-100', icon: 'text-amber-600' },
    emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-100', icon: 'text-emerald-600' },
    rose: { bg: 'bg-rose-50', text: 'text-rose-600', border: 'border-rose-100', icon: 'text-rose-600' }
  };

  return (
    <div className="p-2 space-y-8 animate-in fade-in duration-700">
      {/* Premium Welcome Header */}
      <DashboardGreeting 
        role="Partner Center - Institutional Node"
        name={(user?.name || 'Academic Administrator').split(' ')[0]}
        hideGreeting={true}
        subtitle={`Your portal for institutional governance and student lifecycle management is fully synchronized with our central framework for ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}.`}
        actions={[
          {
            label: 'Initiate admission',
            onClick: () => setIsAdmissionModalOpen(true),
            icon: UserPlus
          },
          {
            label: 'Browse programs',
            link: 'programs',
            icon: Sparkles
          }
        ]}
      />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpis.map((kpi, idx) => {
          const theme = colorThemes[kpi.color];
          return (
            <div 
              key={idx} 
              onClick={() => openDrillDown(kpi.type, kpi.label)}
              style={{ animationDelay: `${idx * 50}ms`, animationFillMode: 'both' }}
              className={`bg-white p-7 rounded-[2rem] border border-slate-100 shadow-sm group transition-all duration-300 relative overflow-hidden cursor-pointer hover:shadow-lg hover:border-slate-200 hover:scale-[1.02] active:scale-[0.98] animate-in fade-in slide-in-from-bottom-4`}
            >
                <div className={`absolute -right-6 -bottom-6 ${theme.text} opacity-[0.03] transform rotate-[15deg] transition-all duration-700 group-hover:rotate-0 group-hover:scale-125 group-hover:opacity-[0.05] pointer-events-none`}>
                    <kpi.icon className="w-40 h-40" />
                </div>
                <div className="relative z-10">
                  <div className="flex items-center gap-4 mb-6">
                      <div className={`w-14 h-14 ${theme.bg} rounded-2xl flex items-center justify-center ${theme.icon} border ${theme.border} transition-transform group-hover:scale-110 shadow-sm`}>
                          <kpi.icon className="w-7 h-7" />
                      </div>
                      <div>
                        <h3 className="text-[11px] font-black text-slate-400 tracking-[0.15em] leading-none mb-1">{kpi.label}</h3>
                        <p className="text-[10px] font-bold text-slate-400 tracking-tight">Real-time data</p>
                      </div>
                  </div>
                  <div className="flex items-baseline gap-2">
                     <span className="text-4xl font-black text-slate-900 tracking-tight">{isLoading ? '...' : kpi.value}</span>
                     <span className={`${theme.text} text-[10px] font-black tracking-widest ${theme.bg} px-2 py-0.5 rounded-md border ${theme.border}`}>{kpi.trend}</span>
                  </div>
                </div>
            </div>
          );
        })}
      </div>

      {/* Announcements Section */}
      <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-4">
                <div className="bg-white p-3 rounded-xl shadow-sm border border-slate-100">
                    <Bell className="w-6 h-6 text-slate-600" />
                </div>
                <div>
                   <h2 className="text-xl font-black text-slate-900 tracking-tight">Institutional directives</h2>
                   <p className="text-slate-500 text-[10px] font-bold tracking-widest mt-0.5">Academic & HR operations</p>
                </div>
            </div>
            <button 
              onClick={() => navigate('announcements')}
              className="text-blue-600 text-xs font-black tracking-widest hover:text-blue-700 underline-offset-4 hover:underline"
            >
                View full board
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
        title="Institutional admission wizard"
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
