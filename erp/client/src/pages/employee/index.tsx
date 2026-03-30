import { Routes, Route, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import MyTasks from './MyTasks';
import LeaveRequests from './LeaveRequests';
import Announcements from './Announcements';
import CRM from '../sales/CRM';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store/authStore';
import { 
  Trophy, 
  Target, 
  Clock, 
  AlertCircle, 
  Briefcase, 
  Calendar,
  ArrowRight,
  Zap,
  ShieldCheck
} from 'lucide-react';

export default function EmployeePortal() {
  const user = useAuthStore(state => state.user);
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.get('/portals/employee/performance');
        setStats(res.data);
      } catch (error) {
        console.error('Failed to load performance stats');
      } finally {
        setIsLoading(false);
      }
    };
    fetchStats();
  }, []);

  const Dashboard = () => {
    if (isLoading) return <div className="p-8 text-center animate-pulse font-mono font-bold text-slate-400">SYNCING PERFORMANCE TELEMETRY...</div>;

    return (
      <div className="max-w-6xl mx-auto p-6 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight">Performance Node</h1>
            <p className="text-slate-500 font-medium mt-1">Institutional workforce identity: <span className="text-slate-900 font-bold">{user?.uid}</span></p>
          </div>
          <div className="bg-white px-6 py-4 rounded-[1.5rem] border border-slate-200 shadow-xl shadow-slate-100/50 flex items-center gap-4">
             <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-200">
                <Trophy className="w-6 h-6" />
             </div>
             <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Completion Rate</p>
                <p className="text-2xl font-black text-slate-900">{stats?.completionRate}%</p>
             </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col justify-between group hover:border-blue-500 transition-all">
             <div className="flex justify-between items-start">
                <div className="p-3 bg-blue-50 rounded-2xl text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all">
                   <Target className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Total</span>
             </div>
             <div className="mt-4">
                <p className="text-3xl font-black text-slate-900 tracking-tighter">{stats?.total}</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Assigned Tasks</p>
             </div>
          </div>

          <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col justify-between group hover:border-emerald-500 transition-all">
             <div className="flex justify-between items-start">
                <div className="p-3 bg-emerald-50 rounded-2xl text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-all">
                   <Zap className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Success</span>
             </div>
             <div className="mt-4">
                <p className="text-3xl font-black text-slate-900 tracking-tighter">{stats?.completed}</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Finalized Nodes</p>
             </div>
          </div>

          <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col justify-between group hover:border-amber-500 transition-all">
             <div className="flex justify-between items-start">
                <div className="p-3 bg-amber-50 rounded-2xl text-amber-600 group-hover:bg-amber-600 group-hover:text-white transition-all">
                   <Clock className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">In Flight</span>
             </div>
             <div className="mt-4">
                <p className="text-3xl font-black text-slate-900 tracking-tighter">{stats?.pending}</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Active Execution</p>
             </div>
          </div>

          <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col justify-between group hover:border-red-500 transition-all">
             <div className="flex justify-between items-start">
                <div className="p-3 bg-red-50 rounded-2xl text-red-600 group-hover:bg-red-600 group-hover:text-white transition-all">
                   <AlertCircle className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Risk</span>
             </div>
             <div className="mt-4">
                <p className="text-3xl font-black text-slate-900 tracking-tighter">{stats?.overdue}</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Overdue Breaches</p>
             </div>
          </div>
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
           <Link to="tasks" className="bg-slate-900 p-10 rounded-[3rem] text-white shadow-2xl relative overflow-hidden group hover:scale-[1.02] transition-all">
              <div className="absolute top-0 right-0 p-10 opacity-10 group-hover:scale-110 transition-transform">
                 <Briefcase className="w-32 h-32" />
              </div>
              <div className="relative z-10">
                 <h2 className="text-3xl font-black mb-2">My Desk</h2>
                 <p className="text-slate-400 font-medium max-w-xs">Access your assigned operational deliverables and upload execution evidence.</p>
                 <div className="mt-8 flex items-center gap-3 text-blue-400 font-black uppercase text-xs tracking-[0.2em]">
                    <span>Enter Terminal</span>
                    <ArrowRight className="w-4 h-4" />
                 </div>
              </div>
           </Link>

           <Link to="leaves" className="bg-white p-10 rounded-[3rem] border-2 border-slate-100 shadow-xl shadow-slate-100/50 relative overflow-hidden group hover:scale-[1.02] transition-all hover:border-blue-100">
              <div className="absolute top-0 right-0 p-10 opacity-5 group-hover:scale-110 transition-transform text-blue-600">
                 <Calendar className="w-32 h-32" />
              </div>
              <div className="relative z-10">
                 <h2 className="text-3xl font-black mb-2 text-slate-900">Leave Console</h2>
                 <p className="text-slate-500 font-medium max-w-xs">Manage your institutional presence and request administrative time-off.</p>
                 <div className="mt-8 flex items-center gap-3 text-blue-600 font-black uppercase text-xs tracking-[0.2em]">
                    <span>Open Requests</span>
                    <ArrowRight className="w-4 h-4" />
                 </div>
              </div>
           </Link>
        </div>

        {/* Sales Link & CRM for BDEs */}
        <div className="bg-slate-50 border border-slate-100 rounded-[3rem] p-8 flex flex-col md:flex-row items-center justify-between gap-6">
           <div className="flex items-center gap-6">
              <div className="w-16 h-16 bg-blue-600 rounded-[1.5rem] flex items-center justify-center text-white shadow-xl shadow-blue-100 italic font-black text-2xl">
                 <ShieldCheck className="w-8 h-8 text-white/90" />
              </div>
              <div>
                 <h2 className="text-2xl font-black text-slate-900 tracking-tight">Institutional Outreach</h2>
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
                className="bg-white text-slate-900 px-8 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest border border-slate-200 hover:bg-slate-50 transition-all shadow-sm flex items-center gap-3"
              >
                <Zap className="w-4 h-4 text-blue-600" />
                Copy Share Link
              </button>
              <Link 
                to="crm"
                className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-black transition-all shadow-xl flex items-center gap-3"
              >
                Open Pipeline
                <ArrowRight className="w-4 h-4" />
              </Link>
           </div>
        </div>
      </div>
    );
  };

  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="tasks" element={<MyTasks />} />
      <Route path="leaves" element={<LeaveRequests />} />
      <Route path="announcements" element={<Announcements />} />
      <Route path="crm/*" element={<CRM />} />
    </Routes>
  );
}
