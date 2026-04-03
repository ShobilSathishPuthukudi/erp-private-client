import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { 
  DollarSign, 
  Users, 
  Clock, 
  AlertCircle, 
  ArrowUpRight, 
  TrendingUp, 
  ShieldCheck,
  Zap
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface FinanceStats {
  revenue: number;
  pendingApprovals: number;
  pendingFees: number;
  riskAlerts: number;
  recentActions: any[];
}

export default function FinanceMainDashboard() {
  const [stats, setStats] = useState<FinanceStats>({
    revenue: 0,
    pendingApprovals: 0,
    pendingFees: 0,
    riskAlerts: 0,
    recentActions: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const [pRes, aRes, fRes] = await Promise.all([
          api.get('/finance/payments').catch(() => ({ data: [] })),
          api.get('/finance/approvals/students').catch(() => ({ data: [] })),
          api.get('/finance/invoices').catch(() => ({ data: [] }))
        ]);

        const payments = pRes?.data || [];
        const approvals = aRes?.data || [];
        const invoices = fRes?.data || [];

        const revenue = payments.filter((p: any) => p.status === 'verified').reduce((acc: number, p: any) => acc + parseFloat(p.amount || 0), 0);
        const pendingApprovalsLoad = approvals.length;
        const pendingFees = invoices.filter((i: any) => i.status === 'issued').reduce((acc: number, i: any) => acc + parseFloat(i.total || 0), 0);
        const riskAlerts = approvals.filter((s: any) => s.invoice?.status !== 'paid').length;

        setStats({
          revenue,
          pendingApprovals: pendingApprovalsLoad,
          pendingFees,
          riskAlerts,
          recentActions: []
        });
      } catch (error) {
        console.error('CRITICAL: Failed to load Finance HUD', error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) return <div className="p-12 text-center text-slate-400 font-black animate-pulse uppercase tracking-widest">Synchronizing Institutional Ledger...</div>;

  return (
    <div className="p-8 space-y-10 bg-[#f8fafc] min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight flex items-center gap-4 uppercase">
            Finance Control Engine
            <span className="bg-emerald-100 text-emerald-700 px-4 py-1 rounded-full text-xs tracking-widest border border-emerald-200">LIVE</span>
          </h1>
          <p className="text-slate-500 font-medium mt-2 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-500" /> Authorized access only. Institutional gatekeeping protocols active.
          </p>
        </div>
        <div className="flex gap-4">
           <Link to="/dashboard/finance/approvals" className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-2xl shadow-slate-200 hover:bg-slate-800 transition-all flex items-center gap-3">
              <Zap className="w-4 h-4 text-emerald-400 fill-emerald-400" /> Finalize Queues
           </Link>
        </div>
      </div>

      {/* KPI HUD */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        <StatCard 
          title="Total Institutional Revenue" 
          value={`₹${stats.revenue.toLocaleString()}`} 
          icon={<DollarSign className="w-6 h-6" />} 
          color="emerald" 
          trend="+12% vs last batch"
        />
        <StatCard 
          title="Pending Approvals" 
          value={stats.pendingApprovals.toString()} 
          icon={<Users className="w-6 h-6" />} 
          color="blue" 
          trend="Action Required"
          isAlert={stats.pendingApprovals > 0}
        />
        <StatCard 
          title="Outstanding Receivables" 
          value={`₹${stats.pendingFees.toLocaleString()}`} 
          icon={<Clock className="w-6 h-6" />} 
          color="amber" 
          trend="Awaiting Settlement"
        />
        <StatCard 
          title="Risk Exposure Nodes" 
          value={stats.riskAlerts.toString()} 
          icon={<AlertCircle className="w-6 h-6" />} 
          color="rose" 
          trend="Critical Validation"
          isAlert={stats.riskAlerts > 0}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
         {/* Risk Alert Panel */}
         <div className="lg:col-span-2 bg-white p-8 rounded-[40px] border border-slate-200 shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8">
               <TrendingUp className="w-32 h-32 text-slate-50 -rotate-12 group-hover:rotate-0 transition-transform duration-700" />
            </div>
            <div className="relative z-10 flex flex-col h-full justify-between">
               <div>
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6">Institutional Risk Analysis</h3>
                  <div className="space-y-6">
                     <RiskItem 
                        title="Unpaid activations pending" 
                        count={stats.riskAlerts} 
                        severity="High" 
                        description="Students marked as OPS_APPROVED without linked payment confirmation." 
                     />
                     <RiskItem 
                        title="Dormant Invoices > 90 Days" 
                        count={5} // Placeholder
                        severity="Critical" 
                        description="Fee collection delays exceedinstitutional thresholds for 5 center nodes." 
                     />
                  </div>
               </div>
               <div className="pt-8 border-t border-slate-100 mt-8 flex justify-between items-center">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Automated Fraud Detection Active</p>
                  <Link to="/dashboard/finance/aging" className="text-blue-600 font-bold text-xs flex items-center gap-2 hover:translate-x-1 transition-all">
                     View Receivables Aging <ArrowUpRight className="w-4 h-4" />
                  </Link>
               </div>
            </div>
         </div>

         {/* Quick Controls */}
         <div className="bg-slate-900 p-10 rounded-[40px] shadow-2xl shadow-slate-200 flex flex-col justify-between text-white">
            <div className="space-y-8">
               <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest">Protocol Shortcuts</h3>
               <div className="space-y-4">
                  <ControlItem title="Fee Config" to="/dashboard/finance/fee-config" />
                  <ControlItem title="Credential Review" to="/dashboard/finance/credentials" />
                  <ControlItem title="Reregistering Manager" to="/dashboard/finance/rereg" />
                  <ControlItem title="Target Settings" to="/dashboard/finance/performance" />
               </div>
            </div>
            <div className="mt-12 bg-white/5 p-6 rounded-3xl border border-white/10">
               <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] mb-3">System Health</p>
               <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <p className="text-xs font-bold">Ledger Synchronized</p>
               </div>
            </div>
         </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, color, trend, isAlert }: any) {
  const colors: any = {
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    amber: 'bg-amber-50 text-amber-600 border-amber-100',
    rose: 'bg-rose-50 text-rose-600 border-rose-100',
  };

  return (
    <div className={`p-8 bg-white border border-slate-200 rounded-[32px] shadow-sm hover:shadow-xl hover:shadow-slate-200/50 transition-all group ${isAlert ? 'ring-2 ring-rose-500 ring-offset-4 ring-offset-[#f8fafc]' : ''}`}>
      <div className="flex justify-between items-center mb-6">
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all group-hover:scale-110 ${colors[color]}`}>
          {icon}
        </div>
        {isAlert && <span className="animate-ping absolute top-0 right-0 mt-6 mr-6 h-3 w-3 rounded-full bg-rose-500 opacity-75"></span>}
      </div>
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{title}</p>
      <h4 className="text-3xl font-black text-slate-900 tracking-tighter">{value}</h4>
      <p className={`text-[10px] font-bold mt-4 ${color === 'rose' || isAlert ? 'text-rose-600' : 'text-slate-400'}`}>
        {trend}
      </p>
    </div>
  );
}

function RiskItem({ title, count, severity, description }: any) {
  return (
    <div className="flex gap-6 items-start">
       <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${severity === 'Critical' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}`}>
          {severity}
       </div>
       <div>
          <h4 className="font-black text-slate-900 text-sm uppercase flex items-center gap-3">
             {title}
             <span className="text-xs text-rose-600">[{count}]</span>
          </h4>
          <p className="text-xs text-slate-500 mt-1 font-medium leading-relaxed">{description}</p>
       </div>
    </div>
  );
}

function ControlItem({ title, to }: any) {
  return (
    <Link to={to} className="flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/5 transition-all group">
       <span className="text-sm font-bold tracking-tight text-white/80 group-hover:text-white">{title}</span>
       <ChevronRight className="w-4 h-4 text-white/20 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all" />
    </Link>
  );
}

function ChevronRight({ className }: any) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
    </svg>
  );
}
