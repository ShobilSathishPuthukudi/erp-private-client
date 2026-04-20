import { Routes, Route, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import Invoices from './Invoices';
import Documents from './Documents';
import Transcript from './Transcript';
import { useAuthStore } from '@/store/authStore';
import { 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  FileText, 
  CreditCard, 
  BookOpen,
  ArrowRight
} from 'lucide-react';
import { DashboardGreeting } from '@/components/shared/DashboardGreeting';

export default function StudentPortal() {
  const user = useAuthStore(state => state.user);
  const [profile, setProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await api.get('/portals/student/profile');
        setProfile(res.data);
      } catch (error) {
        console.error('Failed to load profile');
      } finally {
        setIsLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const Dashboard = () => {
    if (isLoading) return <div className="p-8 text-center animate-pulse font-mono font-bold text-slate-400">LOADING PROFILE...</div>;

    const status = profile?.status || 'UNKNOWN';
    const stages = [
      { id: 'DRAFT', label: 'Draft', color: 'bg-slate-200 text-slate-600' },
      { id: 'PENDING_REVIEW', label: 'In Review', color: 'bg-amber-100 text-amber-700' },
      { id: 'OPS_APPROVED', label: 'Verified', color: 'bg-blue-100 text-blue-700' },
      { id: 'ENROLLED', label: 'Active', color: 'bg-green-600 text-white' }
    ];

    const currentStageIndex = stages.findIndex(s => s.id === status);

    return (
      <div className="max-w-6xl mx-auto p-6 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        {/* Header Section */}
        <DashboardGreeting 
          role="Student Gateway - Institutional Node"
          name={user?.name || 'Academic Scholar'}
          subtitle={`Institutional enrollment node: ${user?.uid}. Your academic roadmap and admission pipeline are active for ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}.`}
          actions={[
            {
              label: 'Academic Transcript',
              link: 'transcript',
              icon: FileText
            },
            {
              label: 'Financial Ledger',
              link: 'invoices',
              icon: CreditCard
            }
          ]}
        />

        {/* Lifecycle Stepper */}
        <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-xl shadow-slate-100/50">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-8">Admission Lifecycle Pipeline</h3>
          <div className="relative flex justify-between items-center max-w-4xl mx-auto">
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-0.5 bg-slate-100 -z-0" />
            <div className={`absolute left-0 top-1/2 -translate-y-1/2 h-0.5 bg-blue-600 transition-all duration-1000 -z-0`} style={{ width: `${(currentStageIndex / (stages.length - 1)) * 100}%` }} />
            
            {stages.map((st, idx) => {
              const isActive = idx <= currentStageIndex;
              const isCurrent = idx === currentStageIndex;
              return (
                <div key={st.id} className="relative z-10 flex flex-col items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 shadow-md ${
                    isCurrent ? 'bg-blue-600 text-white scale-125 ring-4 ring-blue-50' :
                    isActive ? 'bg-white border-2 border-blue-600 text-blue-600' :
                    'bg-white border-2 border-slate-200 text-slate-300'
                  }`}>
                    {isActive ? <CheckCircle2 className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                  </div>
                  <span className={`text-[10px] font-black uppercase tracking-widest ${isActive ? 'text-slate-900' : 'text-slate-300'}`}>{st.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {profile?.status === 'REJECTED' && (
          <div className="bg-red-50 border-2 border-red-100 p-6 rounded-3xl flex items-start gap-4 animate-bounce">
            <AlertCircle className="w-6 h-6 text-red-600 mt-1" />
            <div>
              <p className="text-sm font-black text-red-900 uppercase tracking-widest leading-none mb-2">Academic Rejection Note</p>
              <p className="text-sm text-red-700 font-medium">{profile?.lastRejectionReason || 'Please contact your Study Center for reconciliation instructions.'}</p>
            </div>
          </div>
        )}

        {/* Overview Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Program Card */}
          <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
               <BookOpen className="w-24 h-24" />
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Academic Identity</p>
            <h2 className="text-2xl font-black leading-tight mb-1">{profile?.program?.name || 'Path Initializing...'}</h2>
            <div className="flex items-center gap-2 mb-4">
               <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest px-2 py-0.5 bg-blue-500/10 rounded-lg">{profile?.program?.university?.name}</span>
            </div>
            <p className="text-sm text-slate-400 font-medium uppercase tracking-widest">{profile?.program?.type} | {profile?.program?.duration} Years</p>
            <div className="mt-8 pt-6 border-t border-slate-800">
               <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Study Center Node</p>
               <p className="font-bold text-slate-200 flex items-center gap-2">
                  <span className="w-2 h-2 bg-emerald-500 rounded-full shadow-lg shadow-emerald-500/50" />
                  {profile?.center?.name || 'Institutional Batch'}
               </p>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="space-y-6">
             <Link to="transcript" className="block bg-white p-6 rounded-3xl border border-slate-200 hover:border-blue-500 transition-all group">
                <div className="flex items-center justify-between mb-4">
                   <div className="p-3 bg-blue-50 rounded-2xl text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all">
                      <FileText className="w-6 h-6" />
                   </div>
                   <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-blue-600 transition-all" />
                </div>
                <h4 className="font-black text-slate-900 uppercase text-xs tracking-widest">Academic Transcript</h4>
                <p className="text-slate-500 text-xs font-medium mt-1">View subjects and marksheet</p>
             </Link>
             
             <Link to="invoices" className="block bg-white p-6 rounded-3xl border border-slate-200 hover:border-emerald-500 transition-all group">
                <div className="flex items-center justify-between mb-4">
                   <div className="p-3 bg-emerald-50 rounded-2xl text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-all">
                      <CreditCard className="w-6 h-6" />
                   </div>
                   <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-emerald-600 transition-all" />
                </div>
                <h4 className="font-black text-slate-900 uppercase text-xs tracking-widest">Financial Ledger</h4>
                <p className="text-slate-500 text-xs font-medium mt-1">₹{parseFloat(profile?.pendingAmount || 0).toLocaleString()} Outstanding</p>
             </Link>
          </div>

          {/* Activity/Next Steps */}
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 flex flex-col justify-between">
             <div>
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Instructional Notice</h3>
                {status === 'DRAFT' && <p className="text-sm font-bold text-slate-700 leading-relaxed ">Your admission manifold is currently being finalized by the center. Please check back for submission alerts.</p>}
                {status === 'PENDING_REVIEW' && <p className="text-sm font-bold text-slate-700 leading-relaxed ">Your profile is currently undergoing sub-departmental eligibility verification. No action required.</p>}
                {status === 'OPS_APPROVED' && <p className="text-sm font-black text-blue-600 leading-relaxed">Verification Successful! Please proceed to the financial ledger to settle outstanding dues for final activation.</p>}
                {status === 'ENROLLED' && <p className="text-sm font-black text-emerald-600 leading-relaxed">Account Fully Activated. Welcome to the institutional framework!</p>}
             </div>
             
             <div className="pt-6 mt-6 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[10px] font-black text-slate-300 uppercase ">RPS Governance v4.0</span>
                <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
             </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="invoices" element={<Invoices />} />
      <Route path="documents" element={<Documents />} />
      <Route path="transcript" element={<Transcript />} />
    </Routes>
  );
}
