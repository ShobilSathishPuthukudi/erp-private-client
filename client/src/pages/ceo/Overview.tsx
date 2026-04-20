import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store/authStore';
import { DashboardGreeting } from '@/components/shared/DashboardGreeting';
import { Users, IndianRupee, Building2, BookOpen, MapPin, TrendingUp, TrendingDown, Minus, Zap, X, ArrowRight, Activity, Clock, ShieldAlert, AlertTriangle, CheckCircle2, Wallet, PieChart, FileText, Target, Calendar } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, LineChart, Line } from 'recharts';
import { format } from 'date-fns';
import { Sparkles } from 'lucide-react';

interface Metrics {
  totalStudents: number;
  totalUniversities: number;
  totalPrograms: number;
  totalFundAcquired: number;
  revenueMTD: number;
  revenueYTD: number;
  activeCenters: number;
  overdueTasks: number;
  pendingLeaves: number;
  auditExceptions: number;
  enrollmentTrend: any[];
  revenueTrend: any[];
  taskCompletionRate: number;
  avgTaskTime: number;
  avgCycleTime: number;
  productivityScore: number;
  highValuePending: number;
  revealRequests: number;
  visibilityScope?: string[];
  departmentalBreakdown?: Array<{
    id: number;
    name: string;
    students: number;
    revenue: number;
    pendingLeaves: number;
    overdueTasks: number;
  }>;
  salesIntelligence?: {
    totalLeads: number;
    convertedLeads: number;
    avgLeadAge: number;
  } | null;
  growthData?: any[];
  centerGrowth?: any[];
}

export default function Overview({ view }: { view: 'kpis' | 'trends' }) {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedBrief, setSelectedBrief] = useState<{ type: string; title: string; dId?: number; value?: string | number; icon?: any; inlineDetails?: React.ReactNode } | null>(null);
  const [briefData, setBriefData] = useState<any>(null);
  const [briefLoading, setBriefLoading] = useState(false);
  const [isAnalysisOpen, setIsAnalysisOpen] = useState(false);
  const [isInstAnalysisOpen, setIsInstAnalysisOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [trendRangeMonths, setTrendRangeMonths] = useState<3 | 6 | 12>(12);
  

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    fetchMetrics();
  }, []);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') fetchMetrics();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  useEffect(() => {
    const isModalOpen = selectedBrief || isAnalysisOpen || isInstAnalysisOpen;
    if (isModalOpen) {
      if (selectedBrief) fetchBriefDetails();
      document.body.style.overflow = 'hidden';
      document.body.classList.add('modal-open-blur');
    } else {
      document.body.style.overflow = 'auto';
      document.body.classList.remove('modal-open-blur');
    }
    return () => {
      document.body.style.overflow = 'auto';
      document.body.classList.remove('modal-open-blur');
    };
  }, [selectedBrief, isAnalysisOpen, isInstAnalysisOpen]);

  const fetchMetrics = async () => {
    try {
      const res = await api.get('/ceo/metrics');
      setMetrics(res.data);
    } catch (error) {
      toast.error('Failed to load global metrics');
    } finally {
      setLoading(false);
    }
  };

  const fetchBriefDetails = async () => {
    if (!selectedBrief) return;
    try {
      setBriefLoading(true);
      const url = `/ceo/details/${selectedBrief.type}${selectedBrief.dId ? `?dId=${selectedBrief.dId}` : ''}`;
      const res = await api.get(url);
      setBriefData(res.data);
    } catch (error) {
      toast.error('Failed to load details');
    } finally {
      setBriefLoading(false);
    }
  };

  const getStatusColor = (current: number, target: number) => {
    const ratio = current / target;
    if (ratio >= 1) return 'emerald';
    if (ratio >= 0.8) return 'amber';
    return 'red';
  };

  const checkScope = (scopes: string[]) => {
    if (!metrics?.visibilityScope) return false;
    if (metrics.visibilityScope.length === 0) return false;
    const normalizedVisScope = metrics.visibilityScope.map(v => v.toLowerCase());
    if (normalizedVisScope.includes('all') || normalizedVisScope.includes('global(all)')) return true;
    return scopes.some(scope =>
      normalizedVisScope.some(vs => vs.includes(scope.toLowerCase()))
    );
  };

  const analyzeCenterGrowth = () => {
    const data = metrics?.centerGrowth || [];
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
    const data = metrics?.growthData || [];
    if (!data || data.length === 0) return null;
    
    const last = data[data.length - 1];
    const first = data[0];
    
    const studentGrowth = first.students > 0 ? ((last.students - first.students) / first.students) * 100 : 0;
    const staffRatio = last.employees > 0 ? (last.students / last.employees).toFixed(1) : last.students;
    const staffGrowth = first.employees > 0 ? ((last.employees - first.employees) / first.employees) * 100 : 0;
    
    return {
      studentGrowth: studentGrowth.toFixed(1),
      isStudentGrowthPositive: studentGrowth >= 0,
      staffRatio,
      staffGrowth: Math.abs(staffGrowth).toFixed(1),
      isStaffGrowthPositive: staffGrowth >= 0,
      totalStudents: last.students,
      totalEmployees: last.employees,
      institutionalHealth: (last.students / (last.employees || 1)) < 40 ? 'Balanced' : 'Optimal',
      statusColor: (last.students / (last.employees || 1)) < 60 ? 'text-blue-600' : 'text-amber-600',
      statusBg: (last.students / (last.employees || 1)) < 60 ? 'bg-blue-50' : 'bg-amber-50',
      insight: (last.students / (last.employees || 1)) > 50 ? 'Student density is increasing. Consider augmenting faculty support.' : 'Scaling is balanced for current institutional density.'
    };
  };

  const instAnalysis = analyzeInstitutionalGrowth();

  const KPIStore = [
    { type: 'universities', title: 'Total Universities', value: metrics?.totalUniversities || 0, icon: Building2, target: 5, suffix: '', color: 'slate', scopes: ['academic', 'university', 'hr', 'finance', 'operations', 'all'], inlineDetails: (
      <div className="space-y-4 py-4">
        <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl">
          <p className="text-[11px] text-slate-800 font-bold leading-relaxed uppercase tracking-wide">
            Total number of academic institutional universities currently in active or staged lifecycle phases.
          </p>
        </div>
      </div>
    )},
    { type: 'programs', title: 'Total Programs', value: metrics?.totalPrograms || 0, icon: BookOpen, target: 50, suffix: '', color: 'slate', scopes: ['academic', 'university', 'program'], inlineDetails: (
      <div className="space-y-4 py-4">
        <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl">
          <p className="text-[11px] text-slate-800 font-bold leading-relaxed uppercase tracking-wide">
            Cumulative number of academic programs actively offering enrollments across all institutional branches.
          </p>
        </div>
      </div>
    )},
    { type: 'students', title: 'Enrolled Students', value: metrics?.totalStudents || 0, icon: Users, target: 1000, suffix: '', color: getStatusColor(metrics?.totalStudents || 0, 1000), scopes: ['academic', 'student', 'university', 'admission'], inlineDetails: (
      <div className="space-y-4 py-4">
        <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl">
          <p className="text-[11px] text-slate-800 font-bold leading-relaxed uppercase tracking-wide">
            Live headcount of verified, tuition-cleared students actively enrolled in academic applications.
          </p>
        </div>
      </div>
    )},
    { type: 'revenue', title: 'Fees Collected (MTD)', value: metrics?.revenueMTD || 0, icon: IndianRupee, target: 500000, suffix: '₹', color: getStatusColor(metrics?.revenueMTD || 0, 500000), scopes: ['finance', 'account'], inlineDetails: (
      <div className="space-y-4 py-4">
        <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl">
          <p className="text-[11px] text-emerald-800 font-bold leading-relaxed uppercase tracking-wide">
            Aggregated sum of verified institutional fees collected entirely within the current month-to-date calculation cycle.
          </p>
        </div>
      </div>
    )},
    { type: 'revenue', title: 'Fees Collected (YTD)', value: metrics?.revenueYTD || 0, icon: IndianRupee, target: 5000000, suffix: '₹', color: getStatusColor(metrics?.revenueYTD || 0, 5000000), scopes: ['finance', 'account'], inlineDetails: (
      <div className="space-y-4 py-4">
        <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl">
          <p className="text-[11px] text-emerald-800 font-bold leading-relaxed uppercase tracking-wide">
            Overall verified institutional revenue pooled across all branches since the commencement of the current fiscal year.
          </p>
        </div>
      </div>
    )},
    { type: 'revenue', title: 'Total Fund Acquired', value: metrics?.totalFundAcquired || 0, icon: IndianRupee, target: 10000000, suffix: '₹', color: 'indigo', scopes: ['finance'], inlineDetails: (
      <div className="space-y-4 py-4">
        <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-2xl">
          <p className="text-[11px] text-indigo-800 font-bold leading-relaxed uppercase tracking-wide">
            Cumulative financial capital assembled including long-term investments, systemic assets, and net inflow.
          </p>
        </div>
      </div>
    )},
    { type: 'centers', title: 'Active Partner Centers', value: metrics?.activeCenters || 0, icon: MapPin, target: 20, suffix: '', color: getStatusColor(metrics?.activeCenters || 0, 20), scopes: ['operations', 'regional', 'academic'], inlineDetails: (
      <div className="space-y-4 py-4">
        <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl">
          <p className="text-[11px] text-slate-800 font-bold leading-relaxed uppercase tracking-wide">
            Real-time count of geographically distributed learning hubs actively running under institutional mandates.
          </p>
        </div>
      </div>
    )},
  ].filter(card => card.scopes.includes('all') || checkScope(card.scopes));

  const PerformanceStore = [
    { type: 'perf_prod', title: 'Productivity Score', value: metrics?.productivityScore || 0, icon: Activity, target: 90, suffix: '%', color: (metrics?.productivityScore || 0) >= 85 ? 'emerald' : 'amber', scopes: ['academic', 'finance', 'operations', 'hr', 'marketing', 'all'], inlineDetails: (
      <div className="space-y-4 py-4">
        <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl">
          <p className="text-[11px] text-emerald-800 font-bold leading-relaxed uppercase tracking-wide">
            Composite index reflecting cross-functional efficiency, task resolution speed, and outcome conversion.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Weight</span>
            <span className="text-xl font-black text-slate-900">Task SLA (60%)</span>
          </div>
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Weight</span>
            <span className="text-xl font-black text-slate-900">Time Eff. (40%)</span>
          </div>
        </div>
      </div>
    )},
    { type: 'perf_task', title: 'Task Completion', value: metrics?.taskCompletionRate || 0, icon: CheckCircle2, target: 95, suffix: '%', color: (metrics?.taskCompletionRate || 0) >= 90 ? 'emerald' : 'amber', scopes: ['academic', 'finance', 'operations', 'hr', 'marketing', 'all'], inlineDetails: (
      <div className="space-y-4 py-4">
        <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl">
          <p className="text-[11px] text-blue-800 font-bold leading-relaxed uppercase tracking-wide">
            Percentage of assigned tasks and workflows completed successfully without administrative override.
          </p>
        </div>
      </div>
    )},
    { type: 'perf_avg', title: 'Avg Completion', value: metrics?.avgTaskTime || 0, icon: Clock, target: 24, suffix: 'h', color: (metrics?.avgTaskTime || 0) <= 24 ? 'emerald' : 'amber', scopes: ['academic', 'finance', 'operations', 'hr', 'marketing', 'all'], inlineDetails: (
      <div className="space-y-4 py-4">
        <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-2xl">
          <p className="text-[11px] text-indigo-800 font-bold leading-relaxed uppercase tracking-wide">
            Average time taken from task assignment to resolution across all departments.
          </p>
        </div>
      </div>
    )},
    { type: 'perf_cycle', title: 'Center Acquisition', value: metrics?.avgCycleTime || 0, icon: TrendingUp, target: 7, suffix: 'd', color: (metrics?.avgCycleTime || 0) <= 14 ? 'emerald' : 'amber', scopes: ['academic', 'sales', 'operations', 'all'], inlineDetails: (
      <div className="space-y-4 py-4">
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
          <p className="text-[11px] text-slate-800 font-bold leading-relaxed uppercase tracking-wide">
            Average duration to fully convert an incoming lead into a verified partner center.
          </p>
        </div>
      </div>
    )},
  ].filter(card => checkScope(card.scopes));

  const RiskStore = [
    { type: 'risk_highval', title: 'High-Value Pending', value: metrics?.highValuePending || 0, icon: Wallet, target: 0, suffix: '', color: (metrics?.highValuePending || 0) > 0 ? 'red' : 'emerald', scopes: ['finance', 'account'], inlineDetails: (
      <div className="space-y-4 py-4">
        <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl">
          <p className="text-[11px] text-rose-800 font-bold leading-relaxed uppercase tracking-wide">
            Number of uncollected invoices or pending transactions exceeding the ₹50,000 threshold.
          </p>
        </div>
      </div>
    )},
    { type: 'risk_security', title: 'Security Reveals', value: metrics?.revealRequests || 0, icon: ShieldAlert, target: 0, suffix: '', color: (metrics?.revealRequests || 0) > 0 ? 'red' : 'emerald', scopes: ['security'], inlineDetails: (
      <div className="space-y-4 py-4">
        <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl">
          <p className="text-[11px] text-amber-800 font-bold leading-relaxed uppercase tracking-wide">
            Critical audit log events where sensitive credentials or configuration secrets were revealed.
          </p>
        </div>
      </div>
    )},
    { type: 'risk_audit', title: 'Audit Exceptions', value: metrics?.auditExceptions || 0, icon: AlertTriangle, target: 0, suffix: '', color: (metrics?.auditExceptions || 0) > 10 ? 'red' : 'amber', scopes: ['security'], inlineDetails: (
      <div className="space-y-4 py-4">
        <div className="p-4 bg-red-50 border border-red-100 rounded-2xl">
          <p className="text-[11px] text-red-800 font-bold leading-relaxed uppercase tracking-wide">
            Anomalous administrative behaviors, deleted records, or unauthorized modification attempts.
          </p>
        </div>
      </div>
    )},
    { type: 'risk_aged', title: 'Governance Escalations', value: metrics?.overdueTasks || 0, icon: Clock, target: 5, suffix: '', color: (metrics?.overdueTasks || 0) > 5 ? 'red' : 'amber', scopes: ['academic', 'finance', 'operations', 'hr', 'marketing', 'all'], inlineDetails: (
      <div className="space-y-4 py-4">
        <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl flex gap-3">
          <Clock className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-bold text-amber-900 mb-1">Escalation Threshold Exceeded</h4>
            <p className="text-xs text-amber-700/80 leading-relaxed font-medium">Tasks that have remained uncompleted past their designated deadline and standard grace period. Requires immediate executive override.</p>
          </div>
        </div>
      </div>
    )},
  ].filter(card => checkScope(card.scopes));

  if (loading || !metrics) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  if (view === 'kpis') {
    return (
      <div className="p-2 space-y-6 flex flex-col">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white px-6 py-5 rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50 gap-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center text-white shadow-lg shadow-slate-900/20 shrink-0">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight leading-tight mb-0.5">Overview</h1>
              <p className="text-slate-500 font-medium text-sm">System telemetry and institutional performance overview.</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
             <button onClick={() => navigate('/dashboard/ceo/performance')} className="flex items-center gap-2 px-4 py-2 bg-slate-50 text-slate-600 rounded-xl hover:bg-slate-100 transition-all text-xs font-bold whitespace-nowrap">
                <Activity className="w-4 h-4" /> Workforce Analytics
             </button>
             <button onClick={() => navigate('/dashboard/ceo/escalations')} className="flex items-center gap-2 px-4 py-2 bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-100 transition-all text-xs font-bold whitespace-nowrap">
                <AlertTriangle className="w-4 h-4" /> Escalation Inbox
             </button>
          </div>
        </div>

        {metrics?.visibilityScope && metrics.visibilityScope.length > 0 && (
          <div className="flex items-center gap-3 bg-blue-50/50 border border-blue-100 p-4 rounded-3xl mb-10 shadow-sm shadow-blue-500/5">
            <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-600/20">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest leading-none mb-1">Active Governance Scope</p>
              <div className="flex items-center gap-2">
                <span className="text-sm font-black text-slate-900 uppercase tracking-tight">
                  {metrics.visibilityScope.join(' • ')}
                </span>
                <span className="text-[10px] font-bold text-slate-400 ">(Partitioned Executive Identity)</span>
              </div>
            </div>
          </div>
        )}
        {/* Primary Core KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {KPIStore.map((kpi, idx) => (
            <div 
              key={idx} 
              onClick={() => setSelectedBrief({ type: kpi.type, title: kpi.title, value: `${kpi.value.toLocaleString()}${kpi.suffix}`, icon: kpi.icon, inlineDetails: (kpi as any).inlineDetails })}
              className="bg-white p-7 rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/40 relative overflow-hidden group hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 cursor-pointer"
            >
              <div className={`absolute -right-6 -bottom-6 text-${kpi.color === 'slate' ? 'slate' : kpi.color}-600 opacity-[0.03] transform rotate-[15deg] transition-all duration-700 group-hover:rotate-0 group-hover:scale-125 group-hover:opacity-[0.05] pointer-events-none`}>
                <kpi.icon className="w-40 h-40" />
              </div>
              
              <div className="relative z-10">
                <div className={`w-14 h-14 rounded-2xl bg-${kpi.color === 'slate' ? 'slate' : kpi.color}-50 flex items-center justify-center mb-6 text-${kpi.color === 'slate' ? 'slate' : kpi.color}-600 group-hover:bg-slate-900 group-hover:text-white transition-all shadow-sm`}>
                  <kpi.icon className="w-7 h-7" />
                </div>
                
                <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.15em] mb-1">{kpi.title}</p>
                <h3 className="text-3xl font-black text-slate-900 tracking-tight">
                  {kpi.suffix}{kpi.value.toLocaleString()}
                </h3>
                
                <div className="mt-6 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    {kpi.color === 'emerald' && <TrendingUp className="w-4 h-4 text-emerald-500" />}
                    {kpi.color === 'amber' && <Minus className="w-4 h-4 text-amber-500" />}
                    {kpi.color === 'red' && <TrendingDown className="w-4 h-4 text-red-500" />}
                    <span className={`text-[10px] font-black uppercase tracking-wider text-${kpi.color === 'slate' ? 'slate' : kpi.color}-600`}>
                      {kpi.color === 'slate' ? 'Global Stat' : (kpi.color === 'emerald' ? 'On Track' : kpi.color === 'amber' ? 'Off Target' : 'Critical')}
                    </span>
                  </div>
                  <div className="text-[10px] font-bold text-slate-300">Goal: {kpi.suffix}{kpi.target.toLocaleString()}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Executive Performance & Productivity Section */}
        {PerformanceStore.length > 0 && (
          <div className="mt-12 pt-12 border-t border-slate-100/50">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-xl font-black text-slate-900 tracking-tight">Employee Performance Suite</h3>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Cross-Functional Efficiency & Cycle Monitoring</p>
              </div>
              <button 
                onClick={() => navigate('/dashboard/ceo/performance')}
                className="flex items-center gap-2 text-[10px] font-black bg-slate-900 text-white px-4 py-2 rounded-full uppercase tracking-widest hover:bg-slate-800 hover:scale-105 active:scale-95 transition-all shadow-lg shadow-slate-900/20"
              >
                Workforce Analytics <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {PerformanceStore.map((kpi, idx) => (
                <div key={idx} onClick={() => setSelectedBrief({ type: kpi.type, title: kpi.title, value: `${kpi.value.toLocaleString()}${kpi.suffix}`, icon: kpi.icon, inlineDetails: (kpi as any).inlineDetails })} className="bg-white p-7 rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/40 relative overflow-hidden group cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all">
                  <div className={`absolute -right-6 -bottom-6 text-${kpi.color}-600 opacity-[0.03] transform rotate-[15deg] transition-all duration-700 group-hover:rotate-0 group-hover:scale-125 group-hover:opacity-[0.05] pointer-events-none`}>
                    <kpi.icon className="w-40 h-40" />
                  </div>
                  <div className="relative z-10 flex items-center gap-5">
                    <div className={`w-14 h-14 rounded-2xl bg-${kpi.color}-50 flex items-center justify-center text-${kpi.color}-600 group-hover:bg-slate-900 group-hover:text-white transition-all shadow-sm`}>
                      <kpi.icon className="w-7 h-7" />
                    </div>
                    <div>
                      <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.15em] mb-1">{kpi.title}</p>
                      <h4 className="text-3xl font-black text-slate-900 tracking-tight">{kpi.value}{kpi.suffix}</h4>
                    </div>
                  </div>
                  <div className="relative z-10 mt-6 pt-6 border-t border-slate-50 flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">Target: {kpi.target}{kpi.suffix}</span>
                    <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-${kpi.color}-50 text-${kpi.color}-700 border border-${kpi.color}-100`}>
                      {kpi.color === 'emerald' ? 'Elite' : 'Attention'}
                    </div>
                  </div>
                </div>
              ))}
           </div>
        </div>
        )}

        {/* Systemic Risks & Compliance Section */}
        {RiskStore.length > 0 && (
          <div className="mt-12 pt-12 border-t border-slate-100/50">
           <div className="flex items-center justify-between mb-8">
             <div>
               <h3 className="text-xl font-black text-slate-900 tracking-tight">Systemic Risk & Compliance</h3>
               <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Institutional Vulnerability & Security Telemetry</p>
             </div>
             <button onClick={() => navigate('/dashboard/ceo/escalations')} className="text-[10px] font-black bg-rose-50 text-rose-600 px-4 py-2 rounded-full uppercase tracking-widest hover:bg-rose-600 hover:text-white hover:scale-105 active:scale-95 transition-all">
               Escalation Inbox
             </button>
           </div>
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {RiskStore.map((kpi, idx) => (
                <div key={idx} onClick={() => setSelectedBrief({ type: kpi.type, title: kpi.title, value: `${kpi.value.toLocaleString()}${kpi.suffix}`, icon: kpi.icon, inlineDetails: (kpi as any).inlineDetails })} className="bg-white p-7 rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/40 relative overflow-hidden group cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all">
                   <div className={`absolute -right-6 -bottom-6 text-${kpi.color === 'red' ? 'rose' : kpi.color}-600 opacity-[0.03] transform rotate-[15deg] transition-all duration-700 group-hover:rotate-0 group-hover:scale-125 group-hover:opacity-[0.05] pointer-events-none`}>
                      <kpi.icon className="w-40 h-40" />
                   </div>
                   <div className="relative z-10 flex items-center gap-5">
                    <div className={`w-14 h-14 rounded-2xl bg-${kpi.color === 'red' ? 'rose' : kpi.color}-50 flex items-center justify-center text-${kpi.color === 'red' ? 'rose' : kpi.color}-600 group-hover:bg-slate-900 group-hover:text-white transition-all shadow-sm`}>
                      <kpi.icon className="w-7 h-7" />
                    </div>
                    <div>
                      <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.15em] mb-1">{kpi.title}</p>
                      <h4 className="text-3xl font-black text-slate-900 tracking-tight">{kpi.value}{kpi.suffix}</h4>
                    </div>
                  </div>
                  <div className={`relative z-10 mt-6 pt-6 border-t border-slate-50 flex items-center justify-between`}>
                    <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">Alert Threshold: {kpi.target}</span>
                    <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${kpi.color === 'red' ? 'bg-rose-50 text-rose-700 animate-pulse border border-rose-100' : `bg-${kpi.color}-50 text-${kpi.color}-700 border border-${kpi.color}-100`}`}>
                      {kpi.color === 'red' ? 'Escalated' : (kpi.color === 'amber' ? 'Guarded' : 'Secured')}
                    </div>
                  </div>
                </div>
              ))}
           </div>
        </div>
        )}

        {/* [NEW] Sales Intelligence Section - Strictly for Sales Scope */}
        {metrics.salesIntelligence && (
          <div className="mt-12 pt-12 border-t border-slate-100/50 animate-in fade-in slide-in-from-bottom-8 duration-1000">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                  Sector Intelligence: Sales
                  <span className="px-2 py-0.5 bg-blue-600 text-white text-[9px] rounded-md font-black uppercase tracking-widest">Strictly Added</span>
                </h3>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Lead Conversion Analytics & Revenue Pipeline Velocity</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Conversion Score */}
              <div className="bg-slate-900 p-8 rounded-[40px] text-white relative overflow-hidden group shadow-2xl shadow-slate-900/40">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-bl-[100px] -z-0"></div>
                <div className="relative z-10">
                  <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-4">Lead Conversion Efficiency</p>
                  <div className="flex items-baseline gap-2">
                    <h4 className="text-5xl font-black ">
                      {metrics.salesIntelligence.totalLeads > 0 
                        ? Math.round((metrics.salesIntelligence.convertedLeads / metrics.salesIntelligence.totalLeads) * 100) 
                        : 0}%
                    </h4>
                    <span className="text-blue-400 font-black text-sm uppercase tracking-tighter">Conversion Rate</span>
                  </div>
                  <div className="mt-8 flex items-center gap-4">
                    <div className="h-1.5 flex-1 bg-white/10 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-blue-500 rounded-full" 
                        style={{ width: `${metrics.salesIntelligence.totalLeads > 0 ? (metrics.salesIntelligence.convertedLeads / metrics.salesIntelligence.totalLeads) * 100 : 0}%` }}
                      ></div>
                    </div>
                    <span className="text-[10px] font-black text-white/40">{metrics.salesIntelligence.convertedLeads}/{metrics.salesIntelligence.totalLeads} Converted</span>
                  </div>
                </div>
              </div>

              {/* Lead Aging */}
              <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-xl shadow-slate-200/40 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-rose-50 rounded-bl-[100px] -z-0"></div>
                <div className="relative z-10">
                  <div className="w-12 h-12 rounded-2xl bg-rose-600 flex items-center justify-center text-white mb-6 shadow-lg shadow-rose-600/20">
                    <Zap className="w-6 h-6" />
                  </div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Pipeline Velocity</p>
                  <h4 className="text-3xl font-black text-slate-900 tracking-tight mb-2">
                    {metrics.salesIntelligence.avgLeadAge} Days
                  </h4>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Avg Time to Center Onboarding</p>
                  
                  <div className="mt-8 p-4 bg-rose-50 rounded-2xl border border-rose-100">
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="w-4 h-4 text-rose-600" />
                      <span className="text-[10px] font-bold text-rose-700 uppercase tracking-tight">SLA Guard: 7 Days Max</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* BDE Productivity Index */}
              {(() => {
                const si = metrics.salesIntelligence;
                const rate = si && si.totalLeads > 0 ? ((si.convertedLeads / si.totalLeads) * 100) : 0;
                const rateDisplay = rate.toFixed(1);
                const filledStars = Math.round(rate / 20);
                const tier = rate >= 80 ? 'Tier-1 Sector' : rate >= 60 ? 'Tier-2 Sector' : rate >= 40 ? 'Tier-3 Sector' : 'Developing';
                return (
                  <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-xl shadow-slate-200/40 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-bl-[100px] -z-0"></div>
                    <div className="relative z-10">
                      <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white mb-6 shadow-lg shadow-blue-600/20">
                        <Users className="w-6 h-6" />
                      </div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Strategic Acquisition Index</p>
                      <h4 className="text-3xl font-black text-slate-900 tracking-tight mb-2">{si ? rateDisplay : '—'}</h4>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">BDE Conversion Rate</p>
                      <div className="mt-8 flex items-center gap-2">
                        {[1,2,3,4,5].map(i => (
                          <div key={i} className={`h-1.5 w-6 rounded-full ${i <= filledStars ? 'bg-blue-600' : 'bg-slate-100'}`}></div>
                        ))}
                        <span className="text-[10px] font-black text-blue-600 ml-2">{tier}</span>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {metrics.departmentalBreakdown && metrics.departmentalBreakdown.length > 0 && (
          <div className="mt-12 space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-black text-slate-900 tracking-tight">Departmental Pulse</h3>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Comparative Analysis • Permitted Governance Data</p>
              </div>
              <div className="text-[10px] font-black bg-slate-900 text-white px-4 py-2 rounded-full uppercase tracking-widest shadow-xl shadow-slate-900/20">
                Deep Dive: {metrics.departmentalBreakdown.length} Sectors
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 bg-white p-8 rounded-[40px] border border-slate-100 shadow-xl shadow-slate-200/40">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest">Revenue vs Acquisition</h4>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Institutional Contributions</p>
                  </div>
                </div>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%" minHeight={250}>
                    <BarChart data={metrics.departmentalBreakdown}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 900, fill: '#64748b' }} />
                      <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                      <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                      <Tooltip 
                        cursor={{ fill: '#f8fafc' }} 
                        contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.15)', padding: '16px' }} 
                      />
                      <Bar yAxisId="left" dataKey="revenue" fill="#0f172a" radius={[6, 6, 0, 0]} barSize={40} name="Revenue (₹)" />
                      <Bar yAxisId="right" dataKey="students" fill="#3b82f6" radius={[6, 6, 0, 0]} barSize={40} name="Students" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="space-y-4">
                {metrics.departmentalBreakdown.map((dept, idx) => (
                  <div 
                    key={idx} 
                    onClick={() => setSelectedBrief({ type: 'department', title: `${dept.name} Sector Brief`, dId: dept.id })}
                    className="bg-slate-900 p-6 rounded-[32px] text-white shadow-2xl relative overflow-hidden group cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all"
                  >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-bl-[100px] -z-0"></div>
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400">{dept.name} Sector</span>
                        <div className="flex items-center gap-1">
                           <div className={`w-1.5 h-1.5 rounded-full ${dept.overdueTasks > 5 ? 'bg-red-400 animate-pulse' : 'bg-emerald-400'}`}></div>
                           <span className="text-[9px] font-bold uppercase tracking-widest text-white/40">Status: {dept.overdueTasks > 5 ? 'High Risk' : 'Healthy'}</span>
                        </div>
                      </div>
                      {/* Volume metrics removed as per privacy directives */}
                      <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between">
                         <div className="flex items-center gap-3">
                            <div className="text-center">
                               <p className="text-[9px] font-bold text-white/30 uppercase tracking-widest mb-0.5">Alerts</p>
                               <p className={`text-xs font-black ${dept.overdueTasks > 0 ? 'text-amber-400' : 'text-slate-500'}`}>{dept.overdueTasks}</p>
                            </div>
                            <div className="w-px h-6 bg-white/10 mx-1"></div>
                            <div className="text-center">
                               <p className="text-[9px] font-bold text-white/30 uppercase tracking-widest mb-0.5">Leaves</p>
                               <p className="text-xs font-black text-slate-400">{dept.pendingLeaves}</p>
                            </div>
                         </div>
                         <button className="p-2.5 bg-white/10 rounded-xl hover:bg-white/20 transition-all">
                            <TrendingUp className="w-4 h-4 text-white" />
                         </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {selectedBrief && createPortal(
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-2xl rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
              <div className="px-10 py-8 border-b border-slate-50 flex items-center justify-between bg-white">
                <div className="flex items-center gap-4">
                   <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center text-white shadow-lg">
                      {selectedBrief.type === 'students' && <Users className="w-6 h-6" />}
                      {selectedBrief.type === 'revenue' && <IndianRupee className="w-6 h-6" />}
                      {selectedBrief.type === 'department' && <Building2 className="w-6 h-6" />}
                      {!['students', 'revenue', 'department'].includes(selectedBrief.type) && <Zap className="w-6 h-6" />}
                   </div>
                   <div>
                      <h3 className="text-xl font-black text-slate-900 tracking-tight">{selectedBrief.title}</h3>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Live Governance Drill-down</p>
                   </div>
                </div>
                <button 
                  onClick={() => { setSelectedBrief(null); setBriefData(null); }}
                  className="p-3 hover:bg-slate-50 hover:scale-110 active:scale-95 rounded-2xl transition-all text-slate-400 hover:text-slate-900"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-10 max-h-[60vh] overflow-y-auto">
                {briefLoading ? (
                  <div className="flex flex-col items-center justify-center py-20 space-y-4">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-slate-900"></div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest animate-pulse">Fetching Deep Insights...</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {selectedBrief.type === 'department' && briefData && (
                      <div className="space-y-8">
                         <div>
                            <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Leadership Context</h5>
                            <div className="flex items-center gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all">
                               <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 font-black text-lg border border-indigo-100 italic">
                                 {briefData.admin?.name?.charAt(0) || 'D'}
                               </div>
                               <div>
                                 <div className="text-sm font-black text-slate-900">{briefData.admin?.name || 'Unassigned'}</div>
                                 <div className="text-xs font-bold text-slate-400 mt-0.5">{briefData.admin?.email || 'N/A'}</div>
                                 <div className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mt-1">Designated Dept Admin</div>
                               </div>
                            </div>
                         </div>

                         {/* Forensic: Overdue Tasks */}
                         {briefData.overdueTasksList && briefData.overdueTasksList.length > 0 && (
                           <div>
                              <div className="flex items-center justify-between mb-4">
                                <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Departmental Criticals</h5>
                                <span className="text-[9px] font-bold text-rose-500 bg-rose-50 px-2 py-0.5 rounded-full uppercase tracking-tighter">Action Required</span>
                              </div>
                              <div className="space-y-3">
                                {briefData.overdueTasksList.map((task: any) => (
                                  <div key={task.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:border-rose-100 hover:bg-rose-50/30 transition-all group">
                                     <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-slate-400 group-hover:bg-rose-500 group-hover:text-white transition-all shadow-sm">
                                          <Clock className="w-5 h-5" />
                                        </div>
                                        <div>
                                          <div className="text-sm font-black text-slate-900 line-clamp-1">{task.title}</div>
                                          <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Assigned to {task.assignee?.name}</div>
                                        </div>
                                     </div>
                                     <div className="text-right">
                                        <div className="text-[10px] font-black text-rose-600 uppercase tracking-wider">{task.daysOverdue} Days Overdue</div>
                                        <div className="text-[9px] font-bold text-slate-400">Due {format(new Date(task.deadline), 'MMM dd')}</div>
                                     </div>
                                  </div>
                                ))}
                              </div>
                           </div>
                         )}

                         {/* Forensic: Pending Leaves */}
                         {briefData.pendingLeavesList && briefData.pendingLeavesList.length > 0 && (
                           <div>
                              <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Workforce Authorizations</h5>
                              <div className="space-y-3">
                                {briefData.pendingLeavesList.map((leave: any) => (
                                  <div key={leave.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:border-indigo-100 hover:bg-indigo-50/30 transition-all group">
                                     <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-slate-400 group-hover:bg-indigo-500 group-hover:text-white transition-all shadow-sm">
                                          <Zap className="w-5 h-5" />
                                        </div>
                                        <div>
                                          <div className="text-sm font-black text-slate-900 uppercase tracking-tight">{leave.title}</div>
                                          <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Employee: {leave.assignee?.name}</div>
                                        </div>
                                     </div>
                                     <div className="text-right">
                                        <div className="text-[10px] font-black text-slate-900 uppercase tracking-wider">{leave.daysOverdue}D Pending</div>
                                        <div className="text-[9px] font-bold text-slate-400 tracking-widest">{format(new Date(leave.createdAt), 'MMM dd')}</div>
                                     </div>
                                  </div>
                                ))}
                              </div>
                           </div>
                         )}

                         {(!briefData.overdueTasksList?.length && !briefData.pendingLeavesList?.length) && (
                           <div className="py-12 flex flex-col items-center justify-center bg-slate-50/50 rounded-[40px] border border-dashed border-slate-200">
                              <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center text-emerald-500 shadow-sm border border-slate-100 mb-4">
                                <CheckCircle2 className="w-8 h-8" />
                              </div>
                              <p className="text-sm font-black text-slate-900 uppercase tracking-widest">Sector Fully Optimized</p>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter mt-1">No pending escalations or authorizations detected.</p>
                           </div>
                         )}
                      </div>
                    )}

                    {(selectedBrief.type === 'universities' || selectedBrief.type === 'centers' || selectedBrief.type === 'programs') && Array.isArray(briefData) && briefData.length > 0 && (
                      <div className="space-y-3">
                         <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Institutional Portfolios</h5>
                         {briefData.map((dept: any) => (
                           <div key={dept.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:border-slate-200 transition-all group">
                              <div className="flex items-center gap-3">
                                 <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-slate-400 group-hover:bg-slate-900 group-hover:text-white transition-all">
                                   {selectedBrief.type === 'programs' ? <BookOpen className="w-5 h-5" /> : <Building2 className="w-5 h-5" />}
                                 </div>
                                 <div>
                                   <div className="text-sm font-black text-slate-900">{dept.name}</div>
                                   <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{selectedBrief.type === 'programs' ? dept.university?.name : dept.type}</div>
                                 </div>
                              </div>
                              <div className="text-right">
                                 {selectedBrief.type !== 'programs' && (
                                   <>
                                     <div className="text-[10px] font-black text-slate-900 uppercase tracking-wider">{dept.admin?.name || 'Unassigned'}</div>
                                     <div className="text-[9px] font-bold text-slate-400 uppercase">Administrator</div>
                                   </>
                                 )}
                              </div>
                           </div>
                         ))}
                      </div>
                    )}

                    {selectedBrief.type === 'students' && Array.isArray(briefData) && briefData.length > 0 && (
                      <div className="space-y-3">
                        <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Latest Accessions</h5>
                        {briefData.map((student: any) => (
                          <div key={student.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:border-slate-200 transition-all group">
                             <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-slate-400 group-hover:bg-slate-900 group-hover:text-white transition-all">
                                  <Users className="w-5 h-5" />
                                </div>
                                <div>
                                  <div className="text-sm font-black text-slate-900">{student.name}</div>
                                  <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{student.department?.name}</div>
                                </div>
                             </div>
                             <div className="text-right">
                                <div className="text-[10px] font-black text-slate-900 uppercase tracking-wider">{student.status}</div>
                                <div className="text-[9px] font-bold text-slate-400">{format(new Date(student.createdAt), 'MMM dd, yyyy')}</div>
                             </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {selectedBrief.type === 'revenue' && Array.isArray(briefData) && briefData.length > 0 && (
                      <div className="space-y-3">
                         <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Recent Verified Collections</h5>
                         {briefData.map((inv: any, idx: number) => (
                           <div key={idx} className="flex items-center justify-between p-4 bg-emerald-50/30 rounded-2xl border border-emerald-100/50 hover:bg-emerald-50 transition-all">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center text-white shadow-lg">
                                   <IndianRupee className="w-5 h-5" />
                                </div>
                                <div>
                                   <div className="text-sm font-black text-slate-900">{inv.invoiceNo}</div>
                                   <div className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest font-black ">{inv.student?.name}</div>
                                </div>
                              </div>
                              <div className="text-right">
                                 <div className="text-sm font-black text-slate-900">₹{parseFloat(inv.total).toLocaleString()}</div>
                                 <div className="text-[9px] font-bold text-slate-400 tracking-widest">{format(new Date(inv.createdAt), 'MMM dd, yyyy')}</div>
                              </div>
                           </div>
                         ))}
                      </div>
                    )}

                    {selectedBrief.type === 'risk_highval' && Array.isArray(briefData) && briefData.length > 0 && (
                      <div className="space-y-3">
                         <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">High-Value Pending Invoices</h5>
                         {briefData.map((inv: any, idx: number) => (
                           <div key={idx} className="flex items-center justify-between p-4 bg-rose-50/30 rounded-2xl border border-rose-100/50 hover:bg-rose-50 transition-all group">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-rose-500 flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform">
                                   <Wallet className="w-5 h-5" />
                                </div>
                                <div>
                                   <div className="text-sm font-black text-slate-900">{inv.invoiceNo}</div>
                                   <div className="text-[9px] font-bold text-rose-600 uppercase tracking-widest font-black ">{inv.student?.name}</div>
                                </div>
                              </div>
                              <div className="text-right">
                                 <div className="text-sm font-black text-rose-600 italic">₹{parseFloat(inv.total).toLocaleString()}</div>
                                 <div className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Status: {inv.status}</div>
                              </div>
                           </div>
                         ))}
                      </div>
                    )}

                    {(selectedBrief.type === 'risk_security' || selectedBrief.type === 'risk_audit') && Array.isArray(briefData) && briefData.length > 0 && (
                      <div className="space-y-3">
                         <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Critical Audit Telemetry</h5>
                         {briefData.map((log: any, idx: number) => (
                           <div key={idx} className="flex flex-col p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:border-slate-200 transition-all">
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-3">
                                  <div className={`w-10 h-10 rounded-xl ${selectedBrief.type === 'risk_security' ? 'bg-amber-500' : 'bg-rose-500'} flex items-center justify-center text-white shadow-md`}>
                                    <ShieldAlert className="w-5 h-5" />
                                  </div>
                                  <div>
                                    <div className="text-sm font-black text-slate-900">{log.action}</div>
                                    <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{log.entity} Registry</div>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="text-[10px] font-black text-slate-900">{format(new Date(log.timestamp), 'HH:mm:ss')}</div>
                                  <div className="text-[9px] font-bold text-slate-400">{format(new Date(log.timestamp), 'MMM dd, yyyy')}</div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-xl border border-slate-100 mt-1">
                                <div className="w-1.5 h-1.5 rounded-full bg-slate-300"></div>
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">Operator: {log.user?.name || 'Unknown'}</span>
                                <span className="text-[10px] font-medium text-slate-300 ml-auto">{log.user?.email || ''}</span>
                              </div>
                           </div>
                         ))}
                      </div>
                    )}

                    {selectedBrief.type === 'risk_aged' && Array.isArray(briefData) && briefData.length > 0 && (
                      <div className="space-y-3">
                         <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Governance Escalations</h5>
                         {briefData.map((item: any) => (
                           <div key={item.id} className={`flex flex-col p-4 ${item.module === 'Leave' ? 'bg-amber-50/50 border-amber-100 hover:bg-amber-50' : 'bg-rose-50/50 border-rose-100 hover:bg-rose-50'} rounded-2xl border transition-all group gap-3`}>
                              <div className="flex justify-between items-start">
                                <div className="flex gap-3">
                                  <div className={`w-10 h-10 rounded-xl ${item.module === 'Leave' ? 'bg-amber-100 text-amber-500' : 'bg-rose-100 text-rose-500'} flex items-center justify-center`}>
                                    {item.module === 'Leave' ? <Calendar className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                                  </div>
                                  <div>
                                     <div className="text-sm font-black text-slate-900 line-clamp-1">{item.title}</div>
                                     <div className={`text-[10px] font-bold ${item.module === 'Leave' ? 'text-amber-600' : 'text-rose-600'} mt-1 flex items-center gap-1.5`}>
                                       <AlertTriangle className="w-3 h-3" />
                                       {item.daysOverdue} Days Past Threshold
                                     </div>
                                  </div>
                                </div>
                                <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${item.module === 'Leave' ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'}`}>
                                  {item.module}
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-6 mt-1 ml-13 pt-3 border-t border-slate-200/30">
                                <div>
                                  <div className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-0.5">{item.module === 'Leave' ? 'Employee' : 'Assigned To'}</div>
                                  <div className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                                    <Target className={`w-3.5 h-3.5 ${item.module === 'Leave' ? 'text-amber-400' : 'text-rose-400'}`} />
                                    {item.assignee?.name || 'Unassigned'}
                                  </div>
                                </div>
                                <div className="ml-auto text-right">
                                  <div className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-0.5">Reported On</div>
                                  <div className="text-xs font-bold text-slate-600">
                                    {format(new Date(item.createdAt), 'MMM dd, yyyy')}
                                  </div>
                                </div>
                              </div>
                           </div>
                         ))}
                      </div>
                    )}

                    {!briefData || (Array.isArray(briefData) && briefData.length === 0) ? (
                      selectedBrief.inlineDetails ? (
                        selectedBrief.inlineDetails
                      ) : (
                        <div className="py-20 text-center space-y-4">
                           <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto border border-dashed border-slate-200">
                             <Zap className="w-8 h-8 text-slate-200" />
                           </div>
                           <p className="text-sm font-bold text-slate-400">No telemetry data available for this partition.</p>
                        </div>
                      )
                    ) : null}
                  </div>
                )}
              </div>
              
              <div className="p-8 border-t border-slate-50 bg-slate-50/50 flex items-center justify-between">
                 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Authorized Executive View Only</p>
                 <button 
                  className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest cursor-not-allowed"
                 >
                    Full Module Restricted <ArrowRight className="w-3.5 h-3.5" />
                 </button>
              </div>
            </div>
          </div>,
          document.body
        )}

          {/* Institutional Growth & Center Conversion - Integrated for KPI Overview */}
          <div className="mt-12 pt-12 border-t border-slate-100/50">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {checkScope(['academic', 'enrollment']) && (
              <div className="bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/40 p-8 space-y-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 uppercase tracking-tight">Institutional Growth</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">6 Month Performance Matrix</p>
                  </div>
                  <div className="flex flex-col items-end gap-3">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-blue-600 shadow-lg shadow-blue-500/20"></div>
                        <span className="text-[10px] font-black text-slate-500 uppercase">Students</span>
                      </div>
                    </div>
                    <button 
                      onClick={() => setIsInstAnalysisOpen(true)}
                      className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-all shadow-lg hover:-translate-y-0.5 active:scale-95 group cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-400 group-hover:animate-pulse" />
                      <span className="text-[10px] font-black uppercase tracking-widest">Analyze</span>
                    </button>
                  </div>
                </div>
                <div className="h-[300px] w-full pt-4">
                   {mounted && (
                     <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={metrics?.growthData || []} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
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
                            activeDot={{ r: 8 }} 
                          />
                        </LineChart>
                     </ResponsiveContainer>
                   )}
                </div>
              </div>
              )}

              <div className="bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/40 p-8 space-y-6">
                <div className="flex justify-between items-center">
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
                        <div className="w-2.5 h-2.5 rounded-full bg-slate-300"></div>
                        <span className="text-[10px] font-black text-slate-500 uppercase">Leads</span>
                      </div>
                    </div>
                    <button 
                      onClick={() => setIsAnalysisOpen(true)}
                      className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-all shadow-lg hover:-translate-y-0.5 active:scale-95 group cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-400 group-hover:animate-pulse" />
                      <span className="text-[10px] font-black uppercase tracking-widest">Analyze</span>
                    </button>
                  </div>
                </div>
                <div className="h-[300px] w-full pt-4">
                   {mounted && (
                     <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={metrics?.centerGrowth || []} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
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
                              borderRadius: '16px', 
                              border: 'none', 
                              boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
                              fontSize: '12px',
                              fontWeight: '800'
                            }} 
                          />
                          <Line 
                            type="monotone" 
                            dataKey="approved" 
                            stroke="#4f46e5" 
                            strokeWidth={4} 
                            dot={{ r: 6, fill: '#4f46e5', strokeWidth: 3, stroke: '#fff' }} 
                            activeDot={{ r: 8, strokeWidth: 0 }} 
                          />
                          <Line 
                            type="monotone" 
                            dataKey="leads" 
                            stroke="#cbd5e1" 
                            strokeWidth={4} 
                            dot={{ r: 6, fill: '#cbd5e1', strokeWidth: 3, stroke: '#fff' }} 
                          />
                        </LineChart>
                     </ResponsiveContainer>
                   )}
                </div>
              </div>
            </div>
          </div>

          {/* Analysis Modals for KPI View */}
          {isAnalysisOpen && analysis && createPortal(
            <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
               <div className="bg-white w-full max-w-lg rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                  <div className="p-8 border-b border-slate-50 flex items-center justify-between">
                     <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white">
                           <Sparkles className="w-6 h-6" />
                        </div>
                        <div>
                           <h3 className="text-xl font-black text-slate-900 tracking-tight">Conversion Insight</h3>
                           <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Center Lead Analysis</p>
                        </div>
                     </div>
                     <button onClick={() => setIsAnalysisOpen(false)} className="p-3 hover:bg-slate-50 rounded-2xl transition-all"><X className="w-6 h-6 text-slate-400" /></button>
                  </div>
                  <div className="p-10 space-y-8">
                     <div className="grid grid-cols-2 gap-6">
                        <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Conversion Rate</p>
                           <h4 className="text-3xl font-black text-slate-900">{analysis.conversionRate}%</h4>
                        </div>
                        <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Network Growth</p>
                           <h4 className={`text-3xl font-black ${analysis.isGrowthPositive ? 'text-emerald-600' : 'text-slate-900'}`}>
                             {analysis.isGrowthPositive ? '+' : '-'}{analysis.growthRate}%
                           </h4>
                        </div>
                     </div>
                     <div className={`p-6 rounded-[2rem] border ${analysis.statusBg} border-blue-100/50`}>
                        <div className="flex items-center gap-3 mb-3">
                           <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-white border border-blue-100 ${analysis.statusColor}`}>
                              {analysis.efficiency} Efficiency
                           </div>
                        </div>
                        <p className="text-sm font-medium text-slate-600 leading-relaxed italic">"{analysis.insight}"</p>
                     </div>
                  </div>
                  <div className="p-8 bg-slate-50 flex justify-end">
                     <button onClick={() => setIsAnalysisOpen(false)} className="px-8 py-3 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all">Close Analysis</button>
                  </div>
               </div>
            </div>,
            document.body
          )}

          {isInstAnalysisOpen && instAnalysis && createPortal(
            <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
               <div className="bg-white w-full max-w-lg rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                  <div className="p-8 border-b border-slate-50 flex items-center justify-between">
                     <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white">
                           <TrendingUp className="w-6 h-6" />
                        </div>
                        <div>
                           <h3 className="text-xl font-black text-slate-900 tracking-tight">Institutional Health</h3>
                           <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Growth & Density Analysis</p>
                        </div>
                     </div>
                     <button onClick={() => setIsInstAnalysisOpen(false)} className="p-3 hover:bg-slate-50 rounded-2xl transition-all"><X className="w-6 h-6 text-slate-400" /></button>
                  </div>
                  <div className="p-10 space-y-8">
                     <div className="grid grid-cols-1 gap-6">
                        <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Student Growth</p>
                           <h4 className={`text-3xl font-black ${instAnalysis.isStudentGrowthPositive ? 'text-emerald-600' : 'text-slate-900'}`}>
                             {instAnalysis.isStudentGrowthPositive ? '+' : '-'}{instAnalysis.studentGrowth}%
                           </h4>
                        </div>
                     </div>
                     <div className={`p-6 rounded-[2rem] border ${instAnalysis.statusBg} border-blue-100/50`}>
                        <div className="flex items-center gap-3 mb-3">
                           <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-white border border-blue-100 ${instAnalysis.statusColor}`}>
                              Steady Growth
                           </div>
                        </div>
                        <p className="text-sm font-medium text-slate-600 leading-relaxed italic">"{instAnalysis.insight}"</p>
                     </div>
                  </div>
                  <div className="p-8 bg-slate-50 flex justify-end">
                     <button onClick={() => setIsInstAnalysisOpen(false)} className="px-8 py-3 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all">Close Analysis</button>
                  </div>
               </div>
            </div>,
            document.body
          )}
        </div>
      );
  }

  return (
    <div className="p-2 space-y-8 flex flex-col">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white px-6 py-5 rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50 gap-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center text-white shadow-lg shadow-slate-900/20 shrink-0">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight leading-tight mb-0.5">Growth Analytics</h1>
            <p className="text-slate-500 font-medium text-sm">Long-term institutional expansion and revenue tracking.</p>
          </div>
        </div>
        <div className="flex items-center gap-3 bg-slate-50 p-1.5 rounded-2xl border border-slate-100">
          {([3, 6, 12] as const).map(months => {
            const isActive = trendRangeMonths === months;
            return (
              <button
                key={months}
                onClick={() => setTrendRangeMonths(months)}
                className={`px-4 py-2 rounded-xl text-[10px] font-bold transition-all capitalize ${isActive ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:text-slate-900'}`}
              >
                {months} Months
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Enrollment Trend */}
        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/40">
          <div className="mb-8">
             <h4 className="text-lg font-black text-slate-900">Enrollment Trajectory</h4>
             <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Direct Student Acquisition • {trendRangeMonths} Months</p>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%" minHeight={200}>
              <AreaChart data={(metrics.enrollmentTrend || []).slice(-trendRangeMonths)}>
                <defs>
                  <linearGradient id="colorEnrolls" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0f172a" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#0f172a" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }} />
                <Area type="monotone" dataKey="students" stroke="#0f172a" strokeWidth={4} fillOpacity={1} fill="url(#colorEnrolls)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Revenue Trend */}
        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/40">
           <div className="mb-8">
             <h4 className="text-lg font-black text-slate-900">Revenue Performance</h4>
             <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Verified Fee Collections • INR (₹)</p>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%" minHeight={200}>
              <BarChart data={(metrics.revenueTrend || []).slice(-trendRangeMonths)}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }} />
                <Bar dataKey="revenue" fill="#0f172a" radius={[6, 6, 0, 0]} barSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

          {/* Third Row: Institutional Growth & Center Conversion */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {checkScope(['academic', 'enrollment']) && (
            <div className="bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/40 p-8 space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 uppercase tracking-tight">Institutional Growth</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">6 Month Performance Matrix</p>
                </div>
                <div className="flex flex-col items-end gap-3">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-blue-600 shadow-lg shadow-blue-500/20"></div>
                      <span className="text-[10px] font-black text-slate-500 uppercase">Students</span>
                    </div>
                  </div>
                  <button 
                    onClick={() => setIsInstAnalysisOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-all shadow-lg hover:-translate-y-0.5 active:scale-95 group cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-400 group-hover:animate-pulse" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Analyze</span>
                  </button>
                </div>
              </div>
              <div className="h-[300px] w-full pt-4">
                 {mounted && (
                   <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={metrics?.growthData || []} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
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
                      </LineChart>
                   </ResponsiveContainer>
                  )}
              </div>
            </div>
            )}

            <div className="bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/40 p-8 space-y-6">
              <div className="flex justify-between items-center">
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
                      <div className="w-2.5 h-2.5 rounded-full bg-slate-300"></div>
                      <span className="text-[10px] font-black text-slate-500 uppercase">Leads</span>
                    </div>
                  </div>
                  <button 
                    onClick={() => setIsAnalysisOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-all shadow-lg hover:-translate-y-0.5 active:scale-95 group cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-400 group-hover:animate-pulse" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Analyze</span>
                  </button>
                </div>
              </div>
              <div className="h-[300px] w-full pt-4">
                 {mounted && (
                   <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={metrics?.centerGrowth || []} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
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
                            borderRadius: '16px', 
                            border: 'none', 
                            boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
                            fontSize: '12px',
                            fontWeight: '800'
                          }} 
                        />
                        <Line 
                          type="monotone" 
                          dataKey="approved" 
                          stroke="#4f46e5" 
                          strokeWidth={4} 
                          dot={{ r: 6, fill: '#4f46e5', strokeWidth: 3, stroke: '#fff' }} 
                          activeDot={{ r: 8, strokeWidth: 0 }} 
                        />
                        <Line 
                          type="monotone" 
                          dataKey="leads" 
                          stroke="#cbd5e1" 
                          strokeWidth={4} 
                          dot={{ r: 6, fill: '#cbd5e1', strokeWidth: 3, stroke: '#fff' }} 
                        />
                      </LineChart>
                   </ResponsiveContainer>
                  )}
              </div>
            </div>
          </div>

          {/* Analysis Modals */}
          {isAnalysisOpen && analysis && createPortal(
            <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
               <div className="bg-white w-full max-w-lg rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                  <div className="p-8 border-b border-slate-50 flex items-center justify-between">
                     <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white">
                           <Sparkles className="w-6 h-6" />
                        </div>
                        <div>
                           <h3 className="text-xl font-black text-slate-900 tracking-tight">Conversion Insight</h3>
                           <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Center Lead Analysis</p>
                        </div>
                     </div>
                     <button onClick={() => setIsAnalysisOpen(false)} className="p-3 hover:bg-slate-50 rounded-2xl transition-all"><X className="w-6 h-6 text-slate-400" /></button>
                  </div>
                  <div className="p-10 space-y-8">
                     <div className="grid grid-cols-2 gap-6">
                        <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Conversion Rate</p>
                           <h4 className="text-3xl font-black text-slate-900">{analysis.conversionRate}%</h4>
                        </div>
                        <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Network Growth</p>
                           <h4 className={`text-3xl font-black ${analysis.isGrowthPositive ? 'text-emerald-600' : 'text-slate-900'}`}>
                             {analysis.isGrowthPositive ? '+' : '-'}{analysis.growthRate}%
                           </h4>
                        </div>
                     </div>
                     <div className={`p-6 rounded-[2rem] border ${analysis.statusBg} border-blue-100/50`}>
                        <div className="flex items-center gap-3 mb-3">
                           <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-white border border-blue-100 ${analysis.statusColor}`}>
                              {analysis.efficiency} Efficiency
                           </div>
                        </div>
                        <p className="text-sm font-medium text-slate-600 leading-relaxed italic">"{analysis.insight}"</p>
                     </div>
                  </div>
                  <div className="p-8 bg-slate-50 flex justify-end">
                     <button onClick={() => setIsAnalysisOpen(false)} className="px-8 py-3 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all">Close Analysis</button>
                  </div>
               </div>
            </div>,
            document.body
          )}

          {isInstAnalysisOpen && instAnalysis && createPortal(
            <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
               <div className="bg-white w-full max-w-lg rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                  <div className="p-8 border-b border-slate-50 flex items-center justify-between">
                     <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white">
                           <TrendingUp className="w-6 h-6" />
                        </div>
                        <div>
                           <h3 className="text-xl font-black text-slate-900 tracking-tight">Institutional Health</h3>
                           <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Growth & Density Analysis</p>
                        </div>
                     </div>
                     <button onClick={() => setIsInstAnalysisOpen(false)} className="p-3 hover:bg-slate-50 rounded-2xl transition-all"><X className="w-6 h-6 text-slate-400" /></button>
                  </div>
                  <div className="p-10 space-y-8">
                     <div className="grid grid-cols-1 gap-6">
                        <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Student Growth</p>
                           <h4 className={`text-3xl font-black ${instAnalysis.isStudentGrowthPositive ? 'text-emerald-600' : 'text-slate-900'}`}>
                             {instAnalysis.isStudentGrowthPositive ? '+' : '-'}{instAnalysis.studentGrowth}%
                           </h4>
                        </div>
                     </div>
                     <div className={`p-6 rounded-[2rem] border ${instAnalysis.statusBg} border-blue-100/50`}>
                        <div className="flex items-center gap-3 mb-3">
                           <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-white border border-blue-100 ${instAnalysis.statusColor}`}>
                              Steady Growth
                           </div>
                        </div>
                        <p className="text-sm font-medium text-slate-600 leading-relaxed italic">"{instAnalysis.insight}"</p>
                     </div>
                  </div>
                  <div className="p-8 bg-slate-50 flex justify-end">
                     <button onClick={() => setIsInstAnalysisOpen(false)} className="px-8 py-3 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all">Close Analysis</button>
                  </div>
               </div>
            </div>,
            document.body
          )}
        </div>
      );
    }
