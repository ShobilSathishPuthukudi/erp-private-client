import { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { api } from '@/lib/api';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import {
  Users,
  ShieldCheck,
  XCircle,
  BarChart3,
  Layers,
  BookOpen,
  School,
  Terminal,
  Activity,
  User as UserIcon,
  Globe,
  Sun,
  CloudSun,
  MoonStar,
  Calendar,
  GraduationCap,
  Key
} from 'lucide-react';
import { Modal } from '@/components/shared/Modal';
import { DrillDownModal } from '@/components/shared/DrillDownModal';
import { useAuthStore } from '@/store/authStore';

export default function OpsDashboard() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState<any>({
    totalStudents: 0,
    pendingReviews: 0,
    approvalRate: 0,
    rejectionRate: 0,
    trend: [],
    recentActions: [],
    totalBatches: 0
  });

  const [selectedLog, setSelectedLog] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [drillDown, setDrillDown] = useState<{ isOpen: boolean; type: string; title: string }>({
    isOpen: false,
    type: '',
    title: ''
  });

  const [greeting, setGreeting] = useState('');
  const [GreetingIcon, setGreetingIcon] = useState<any>(Sun);

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) {
      setGreeting('Good morning');
      setGreetingIcon(Sun);
    } else if (hour < 17) {
      setGreeting('Good afternoon');
      setGreetingIcon(CloudSun);
    } else {
      setGreeting('Good evening');
      setGreetingIcon(MoonStar);
    }
  }, []);

  const handleLogClick = (log: any) => {
    setSelectedLog(log);
    setIsModalOpen(true);
  };

  const openDrillDown = (type: string, title: string) => {
    setDrillDown({ isOpen: true, type, title });
  };

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.get('/operations/stats/academic-overview');
        setStats((prev: any) => ({ ...prev, ...res.data }));
      } catch (error) {
        console.error('Failed to fetch ops stats:', error);
      }
    };
    fetchStats();
  }, []);

  const kpis = [
    { label: 'Total Managed Students', value: stats.totalStudents, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50', type: 'totalStudents' },
    { label: 'Institutional Approval %', value: `${stats.approvalRate}%`, icon: ShieldCheck, color: 'text-emerald-600', bg: 'bg-emerald-50', type: 'students' },
    { label: 'Rejection Velocity', value: `${stats.rejectionRate}%`, icon: XCircle, color: 'text-rose-600', bg: 'bg-rose-50', type: 'students' },
    {
      label: 'Total Active Centers',
      value: stats.totalActiveCenters || 0,
      icon: School,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
      type: 'centers'
    },
    {
      label: 'Total Active Programs',
      value: stats.totalActivePrograms ?? stats.activePrograms ?? 0,
      icon: BookOpen,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50',
      type: 'programs'
    },
  ];

  return (
    <div className="p-2 space-y-8">
      {/* Institutional Hero Banner */}
      <div className="bg-slate-900 rounded-[3rem] p-10 md:p-16 text-white relative overflow-hidden shadow-2xl shadow-slate-900/40">
        <div className="relative z-10 max-w-4xl">
          <div className="flex items-center gap-3 mb-8">
            <div className="flex flex-col">
              <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-xl border border-white/10 backdrop-blur-md">
                <Calendar className="w-4 h-4 text-emerald-400" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white">
                  {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </span>
              </div>
            </div>
          </div>

          <h1 className="text-3xl md:text-5xl font-black mb-6 tracking-tighter leading-tight">
            <span className="text-slate-400 block mb-1 text-sm md:text-base tracking-normal">{greeting},</span>
            <span className="text-indigo-400 font-outline-2 uppercase break-words">
              {user?.name || 'Administrator'}
            </span>
          </h1>

          <p className="text-lg md:text-xl text-slate-400 font-medium leading-relaxed mb-10 max-w-3xl">
            Digital Governance HUD: Monitoring real-time telemetry, institutional admission velocity, and structural academic architecture.
          </p>

          <div className="flex flex-wrap items-center gap-4 text-[10px] font-black uppercase tracking-[0.1em]">
            <NavLink
              to="../pending-reviews"
              className="flex items-center gap-2 bg-white/5 hover:bg-white/10 px-4 py-2 rounded-xl border border-white/10 transition-all text-slate-400 hover:text-white group/link"
            >
              <GraduationCap className="w-4 h-4 text-indigo-400 group-hover/link:scale-110 transition-transform" />
              <span>Student Status</span>
            </NavLink>
            <NavLink
              to="../center-audit"
              className="flex items-center gap-2 bg-white/5 hover:bg-white/10 px-4 py-2 rounded-xl border border-white/10 transition-all text-slate-400 hover:text-white group/link"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-400 group-hover/link:scale-110 transition-transform" />
              <span>Center Review</span>
            </NavLink>
            <NavLink
              to="../credential-requests"
              className="flex items-center gap-2 bg-white/5 hover:bg-white/10 px-4 py-2 rounded-xl border border-white/10 transition-all text-slate-400 hover:text-white group/link"
            >
              <Key className="w-4 h-4 text-amber-400 group-hover/link:scale-110 transition-transform" />
              <span>Credential Request</span>
            </NavLink>
            <NavLink
              to="../tasks"
              className="flex items-center gap-2 bg-white/5 hover:bg-white/10 px-4 py-2 rounded-xl border border-white/10 transition-all text-slate-400 hover:text-white group/link"
            >
              <Terminal className="w-4 h-4 text-indigo-400 group-hover/link:scale-110 transition-transform" />
              <span>Tasks</span>
            </NavLink>
          </div>
        </div>

        {/* Abstract architectural shapes for premium depth */}
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-indigo-500/10 to-transparent pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-[500px] h-[500px] bg-indigo-600/20 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute -top-24 -left-24 w-[400px] h-[400px] bg-violet-600/10 rounded-full blur-[100px] pointer-events-none" />

        {/* Subtle grid pattern overlay */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '40px 40px' }} />
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpis.map((kpi: any, i) => (
          <div
            key={i}
            onClick={() => openDrillDown(kpi.type, kpi.label)}
            className="bg-white p-7 rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/40 transition-all group relative overflow-hidden cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
          >
            <div className={`absolute -right-6 -bottom-6 ${kpi.color} opacity-[0.03] transform rotate-[15deg] transition-all duration-700 group-hover:rotate-0 group-hover:scale-125 group-hover:opacity-[0.05] pointer-events-none`}>
              <kpi.icon className="w-40 h-40" />
            </div>

            <div className="relative z-10">
              <div className="flex items-start justify-between mb-6">
                <div className={`w-14 h-14 rounded-2xl ${kpi.bg} flex items-center justify-center ${kpi.color} group-hover:scale-110 transition-transform shadow-sm`}>
                  <kpi.icon className="w-7 h-7" />
                </div>
              </div>
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.15em] mb-1">{kpi.label}</p>
              <h3 className="text-3xl font-black text-slate-900 tracking-tight">{kpi.value}</h3>
            </div>
          </div>
        ))}
      </div>

      {/* Sub-Department Pulse */}
      <div className="space-y-4">
        <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
          <Layers className="w-5 h-5 text-indigo-500" />
          Sub-Department Pulse
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.unitBreakdown?.map((unit: any) => (
            <div key={unit.id} className="bg-white p-7 rounded-[2rem] border border-slate-100 shadow-lg shadow-slate-200/30 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all group relative overflow-hidden">
              <div className="absolute -right-4 -bottom-4 text-indigo-600 opacity-[0.03] transform rotate-[15deg] transition-all duration-700 group-hover:rotate-0 group-hover:scale-125 group-hover:opacity-[0.05] pointer-events-none">
                <Layers className="w-32 h-32" />
              </div>

              <div className="relative z-10">
                <h4 className="text-[11px] font-black text-slate-900 mb-6 uppercase tracking-[0.15em] border-b border-slate-50 pb-3">{unit.name}</h4>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                        <Users className="w-4 h-4 text-blue-500" />
                      </div>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Students</span>
                    </div>
                    <span className="text-sm font-black text-slate-900 tracking-tight">{unit.studentCount}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                        <BookOpen className="w-4 h-4 text-emerald-500" />
                      </div>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Programs</span>
                    </div>
                    <span className="text-sm font-black text-slate-900 tracking-tight">{unit.programCount}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
                        <School className="w-4 h-4 text-amber-500" />
                      </div>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Centers</span>
                    </div>
                    <span className="text-sm font-black text-slate-900 tracking-tight">{unit.centerCount}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Analytics Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white rounded-[2.5rem] border border-slate-200 p-8 shadow-sm">
          <div className="flex items-center justify-between mb-10">
            <h3 className="text-xl font-black text-slate-900 uppercase flex items-center gap-3">
              <BarChart3 className="w-6 h-6 text-indigo-500" />
              Admission Velocity Trend
            </h3>
            <select className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500">
              <option>Last 30 Days</option>
              <option>Last 90 Days</option>
            </select>
          </div>

          {/* Recharts AreaChart with stability guardrails */}
          <div className="h-[400px] w-full min-h-[400px]">
            <ResponsiveContainer width="99%" height="99%" minWidth={0} minHeight={0}>
              <AreaChart data={stats.trend}>
                <defs>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1} />
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: '16px',
                    border: 'none',
                    boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
                    fontSize: '12px',
                    fontWeight: 'bold'
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="#4f46e5"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorCount)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-[2.5rem] border border-slate-200 p-8 shadow-sm">
            <h3 className="text-lg font-black text-slate-900 uppercase mb-6">Recent Log Actions</h3>
            <div className="space-y-4">
              {stats.recentActions && stats.recentActions.length > 0 ? (
                stats.recentActions.map((log: any, i: number) => (
                  <button
                    key={i}
                    onClick={() => handleLogClick(log)}
                    className="flex gap-4 items-start w-full text-left p-3 rounded-2xl hover:bg-slate-50 transition-all border border-transparent hover:border-slate-100 hover:scale-[1.02] active:scale-[0.98] group/item"
                  >
                    <div className="w-2 h-2 rounded-full bg-indigo-500 mt-1.5 flex-shrink-0 group-hover/item:scale-125 transition-transform" />
                    <div>
                      <p className="text-sm font-bold text-slate-900 line-clamp-1">{log.action} {log.entity}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">
                        {new Date(log.timestamp).toLocaleTimeString()} • {log.user?.name || 'System'}
                      </p>
                    </div>
                  </button>
                ))) : (
                <p className="text-sm text-slate-400 font-medium ">No recent academic actions logged.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Forensic Drill-Down Modal */}
      <DrillDownModal
        isOpen={drillDown.isOpen}
        onClose={() => setDrillDown({ ...drillDown, isOpen: false })}
        type={drillDown.type}
        title={drillDown.title}
      />
      {/* Log Detail Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Audit Intelligence Report"
        maxWidth="2xl"
      >
        {selectedLog && (
          <div className="space-y-6">
            {/* Header info */}
            <div className="bg-indigo-600 p-6 rounded-2xl text-white shadow-lg shadow-indigo-100">
              <div className="flex items-center gap-3 mb-2">
                <Activity className="w-5 h-5 text-indigo-200" />
                <span className="text-[10px] font-black uppercase tracking-widest text-indigo-200">System Event Captured</span>
              </div>
              <h2 className="text-2xl font-black uppercase tracking-tight leading-none mb-1">
                {selectedLog.action} {selectedLog.entity}
              </h2>
              <p className="text-sm font-bold text-indigo-100 opacity-80">
                {new Date(selectedLog.timestamp).toLocaleString()}
              </p>
            </div>

            {/* Grid details */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white p-4 rounded-xl border border-slate-200">
                <div className="flex items-center gap-2 mb-1">
                  <UserIcon className="w-4 h-4 text-slate-400" />
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Origin Actor</span>
                </div>
                <p className="font-bold text-slate-900">{selectedLog.user?.name || 'System'}</p>
                <p className="text-[10px] text-indigo-500 font-black uppercase">{selectedLog.user?.role || 'Service'}</p>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-200">
                <div className="flex items-center gap-2 mb-1">
                  <Terminal className="w-4 h-4 text-slate-400" />
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Module Context</span>
                </div>
                <p className="font-bold text-slate-900">{selectedLog.module || 'N/A'}</p>
                <div className="flex items-center gap-1 mt-1 opacity-60">
                  <Globe className="w-3 h-3 text-slate-400" />
                  <span className="text-[10px] font-mono text-slate-500">{selectedLog.ipAddress || 'Internal'}</span>
                </div>
              </div>
            </div>

            {/* Remarks Section */}
            {selectedLog.remarks && (
              <div className="bg-amber-50 p-6 rounded-2xl border border-amber-100 italic">
                <p className="text-sm text-amber-900 font-medium font-serif leading-relaxed">
                  "{selectedLog.remarks}"
                </p>
                <p className="not-italic text-[10px] font-black uppercase text-amber-600 mt-2 tracking-widest">Administrative Remark</p>
              </div>
            )}

            {/* Delta Comparison */}
            {(selectedLog.before || selectedLog.after) && (
              <div className="space-y-4">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">State Transformation Delta</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-slate-100 p-4 rounded-xl">
                    <span className="text-[10px] font-black text-slate-500 uppercase block mb-3">Pre-State (Before)</span>
                    <pre className="text-[11px] font-mono text-slate-600 overflow-x-auto whitespace-pre-wrap max-h-[200px]">
                      {selectedLog.before ? JSON.stringify(selectedLog.before, null, 2) : 'No previous state recorded.'}
                    </pre>
                  </div>
                  <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                    <span className="text-[10px] font-black text-indigo-500 uppercase block mb-3">Post-State (After)</span>
                    <pre className="text-[11px] font-mono text-indigo-600 overflow-x-auto whitespace-pre-wrap max-h-[200px]">
                      {selectedLog.after ? JSON.stringify(selectedLog.after, null, 2) : 'No final state recorded.'}
                    </pre>
                  </div>
                </div>
              </div>
            )}

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-6 py-2 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-indigo-600 hover:scale-105 active:scale-95 transition-all shadow-lg"
              >
                Secure Closure
              </button>
            </div>
          </div>
        )}
      </Modal>
      {/* Governance & Configuration Panel */}
      <div className="bg-slate-900 rounded-[2rem] p-10 text-white flex flex-col md:flex-row items-center justify-between gap-10 shadow-2xl relative overflow-hidden">
        <Activity className="absolute -right-4 -bottom-4 w-48 h-48 text-white/5 rotate-6" />
        <div className="max-w-2xl relative z-10">
          <h4 className="text-xl font-bold mb-3">Governance & Configuration Panel</h4>
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

    </div>
  );
}
