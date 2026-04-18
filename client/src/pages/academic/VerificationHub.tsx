import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { 
  ShieldCheck, 
  Building2, 
  Users, 
  Activity, 
  ArrowRight,
  TrendingUp,
  CheckCircle2,
  Clock,
  AlertCircle
} from 'lucide-react';
import { Link } from 'react-router-dom';

export default function VerificationHub() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<{
    centers: { status: string; count: number | string }[];
    students: { status: string; count: number | string }[];
  }>({
    centers: [],
    students: []
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const res = await api.get('/academic/onboarding/stats');
      setStats(res.data);
    } catch (error) {
      console.error('Telemetry failure:', error);
    } finally {
      setLoading(false);
    }
  };

  const centerTotal = stats.centers.reduce((acc, curr) => acc + parseInt(String(curr.count)), 0);
  const studentTotal = stats.students.reduce((acc, curr) => acc + parseInt(String(curr.count)), 0);

  const StatusCard = ({ title, count, total, icon: Icon, color, desc }: { 
    title: string, 
    count: number | string, 
    total: number, 
    icon: any, 
    color: string, 
    desc: string 
  }) => {
    const textColor = color.replace('bg-', 'text-');
    
    return (
      <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-xl shadow-slate-200/50 group hover:border-indigo-300 transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl hover:shadow-indigo-500/10 relative overflow-hidden cursor-pointer">
        {/* Background Vector Ghost Icon */}
        <div className={`absolute -right-6 -bottom-6 opacity-[0.03] transform rotate-[15deg] transition-all duration-700 group-hover:rotate-0 group-hover:scale-125 group-hover:opacity-[0.08] pointer-events-none ${textColor}`}>
          <Icon className="w-40 h-40" />
        </div>
        
        <div className="relative z-10">
          <div className={`w-14 h-14 rounded-2xl ${color} flex items-center justify-center text-white mb-6 shadow-lg shadow-current/20 group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-500`}>
            <Icon className="w-7 h-7" />
          </div>
          <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1 group-hover:text-slate-500 transition-colors">{title}</p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-4xl font-black text-slate-900 group-hover:text-indigo-900 transition-colors">{count}</h3>
            <span className="text-sm font-bold text-slate-400 group-hover:text-indigo-400 transition-colors">/ {total}</span>
          </div>
          <p className="mt-4 text-[10px] font-bold text-slate-500 uppercase tracking-tight flex items-center gap-2 group-hover:text-indigo-600 transition-colors">
            <Activity className="w-3 h-3 text-indigo-500 group-hover:animate-pulse" />
            {desc}
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className="p-2 space-y-6 flex flex-col h-[calc(100vh-8rem)]">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white px-6 py-5 rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50 gap-6 shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center text-white shadow-lg shadow-slate-900/20 shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight leading-tight mb-0.5">Onboarding Hub</h1>
            <p className="text-slate-500 font-medium text-sm">Unified monitoring for institutional onboarding and center audits.</p>
          </div>
        </div>
        <button onClick={fetchStats} className="px-6 py-3 bg-slate-900 text-white rounded-2xl shadow-xl shadow-slate-900/10 text-xs font-black uppercase tracking-widest flex items-center gap-2 hover:bg-slate-800 transition-all active:scale-95 hover:scale-[1.02]">
            <TrendingUp className="w-4 h-4" />
            Refresh Telemetry
        </button>
      </div>

      {loading ? (
        <div className="h-96 flex items-center justify-center">
            <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          <div className="space-y-10">
            {/* 1. Center Onboarding Section (Primary) */}
            <div className="space-y-8">
              <div className="flex items-center justify-between px-2">
                <h3 className="text-2xl font-black text-slate-900 flex items-center gap-4 uppercase tracking-tighter">
                  <Building2 className="w-8 h-8 text-indigo-600" />
                  Institutional Center Onboarding
                </h3>
                <Link to="/dashboard/operations/center-audit" className="text-xs font-black text-indigo-600 hover:text-indigo-700 flex items-center gap-2 uppercase tracking-widest bg-indigo-50 px-4 py-2 rounded-xl transition-all">
                  Access Audit Queue <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
              
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <Link to="/dashboard/operations/center-audit?tab=approved" className="block text-left transition-transform active:scale-95">
                <StatusCard 
                  title="Approved Centers"
                  count={stats.centers.find(c => c.status === 'active' || c.status === 'APPROVED')?.count || 0}
                  total={centerTotal}
                  icon={CheckCircle2}
                  color="bg-emerald-500"
                  desc="Institutional Readiness"
                />
              </Link>
              <Link to="/dashboard/operations/center-audit?tab=pending" className="block text-left transition-transform active:scale-95">
                <StatusCard 
                  title="Pending Audit"
                  count={stats.centers.find(c => c.status === 'proposed' || c.status === 'staged' || c.status === 'PENDING_AUDIT')?.count || 0}
                  total={centerTotal}
                  icon={Clock}
                  color="bg-amber-500"
                  desc="Operational Bottleneck"
                />
              </Link>
              <Link to="/dashboard/operations/center-audit?tab=rejected" className="block text-left transition-transform active:scale-95">
                <StatusCard 
                  title="Rejected Centers"
                  count={stats.centers.find(c => c.status === 'rejected')?.count || 0}
                  total={centerTotal}
                  icon={AlertCircle}
                  color="bg-rose-500"
                  desc="Audit Protocol Failure"
                />
              </Link>
            </div>
            </div>

            <div className="h-px bg-slate-100" />

            {/* 2. Student Verification Section (Secondary) */}
            <div className="space-y-8">
              <div className="flex items-center justify-between px-2">
                <h3 className="text-2xl font-black text-slate-900 flex items-center gap-4 uppercase tracking-tighter">
                  <Users className="w-8 h-8 text-indigo-600" />
                  Student Enrollment Verification
                </h3>
                <Link to="/dashboard/operations/pending-reviews" className="text-xs font-black text-indigo-600 hover:text-indigo-700 flex items-center gap-2 uppercase tracking-widest bg-indigo-50 px-4 py-2 rounded-xl transition-all">
                  Review Transcripts <ArrowRight className="w-3 h-3" />
                </Link>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <Link to="/dashboard/operations/pending-reviews?tab=approved" className="block text-left transition-transform active:scale-95 text-decoration-none">
                  <StatusCard 
                    title="Approved Students"
                    count={stats.students.find(s => s.status === 'ENROLLED' || s.status === 'APPROVED')?.count || 0}
                    total={studentTotal}
                    icon={CheckCircle2}
                    color="bg-blue-600"
                    desc="Institutional Conversion"
                  />
                </Link>
                <Link to="/dashboard/operations/pending-reviews?tab=pending" className="block text-left transition-transform active:scale-95 text-decoration-none">
                  <StatusCard 
                    title="Pending Verification"
                    count={stats.students.find(s => s.status === 'PENDING_REVIEW' || s.status === 'PENDING_VERIFICATION')?.count || 0}
                    total={studentTotal}
                    icon={Clock}
                    color="bg-amber-500"
                    desc="Eligibility Appraisal"
                  />
                </Link>
                <Link to="/dashboard/operations/pending-reviews?tab=finance" className="block text-left transition-transform active:scale-95 text-decoration-none">
                  <StatusCard 
                    title="Finance Pending"
                    count={stats.students.find(s => s.status === 'FINANCE_PENDING' || s.status === 'FEES_PENDING')?.count || 0}
                    total={studentTotal}
                    icon={TrendingUp}
                    color="bg-emerald-600"
                    desc="Awaiting Fee Clearance"
                  />
                </Link>
              </div>
            </div>
          </div>

          {/* 3. Critical Alerts / Recent Rejections */}
          <div className="bg-rose-50 border border-rose-100 rounded-3xl p-8 flex items-center gap-6 mt-10">
            <div className="w-16 h-16 rounded-2xl bg-white flex items-center justify-center text-rose-500 shadow-sm">
              <AlertCircle className="w-8 h-8" />
            </div>
            <div className="flex-1">
              <h4 className="font-black text-slate-900 uppercase tracking-tight">Onboarding Discrepancy Alert</h4>
              <p className="text-slate-600 text-sm font-medium">There are currently {stats.students.find(s => s.status === 'REJECTED')?.count || 0} student registrations requiring immediate resubmission or manual ratification.</p>
            </div>
            <Link to="/dashboard/operations/resubmissions" className="px-6 py-3 bg-slate-900 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-slate-900/20 active:scale-95">
              Audit Logs
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
