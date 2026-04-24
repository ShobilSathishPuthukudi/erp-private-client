import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store/authStore';
import { DashboardGreeting } from '@/components/shared/DashboardGreeting';
import { 
  DollarSign, 
  Users, 
  Clock, 
  AlertCircle, 
  ArrowUpRight, 
  TrendingUp, 
  ShieldCheck,
  BookOpen
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { DrillDownModal } from '@/components/shared/DrillDownModal';

interface FinanceStats {
  revenue: number;
  verifiedPaymentCount: number;
  pendingApprovals: number;
  pendingFees: number;
  pendingInvoiceCount: number;
  dormantCount: number;
  dormantAmount: number;
}

export default function FinanceMainDashboard() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState<FinanceStats>({
    revenue: 0,
    verifiedPaymentCount: 0,
    pendingApprovals: 0,
    pendingFees: 0,
    pendingInvoiceCount: 0,
    dormantCount: 0,
    dormantAmount: 0
  });
  const [loading, setLoading] = useState(true);
  const [drillDown, setDrillDown] = useState<{ isOpen: boolean; type: string; title: string }>({
    isOpen: false,
    type: '',
    title: ''
  });

  const openDrillDown = (type: string, title: string) => {
    setDrillDown({ isOpen: true, type, title });
  };

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

        const verifiedPayments = payments.filter((p: any) => p.status === 'verified');
        const revenue = verifiedPayments.reduce(
          (acc: number, p: any) => acc + parseFloat(p.amount || 0), 0
        );

        const issuedInvoices = invoices.filter((i: any) => i.status === 'issued');
        const pendingFees = issuedInvoices.reduce(
          (acc: number, i: any) => acc + parseFloat(i.total || 0), 0
        );

        const now = Date.now();
        const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;
        const dormantInvoices = issuedInvoices.filter((i: any) => {
          const created = new Date(i.createdAt).getTime();
          return Number.isFinite(created) && now - created > NINETY_DAYS_MS;
        });
        const dormantAmount = dormantInvoices.reduce(
          (acc: number, i: any) => acc + parseFloat(i.total || 0), 0
        );

        setStats({
          revenue,
          verifiedPaymentCount: verifiedPayments.length,
          pendingApprovals: approvals.length,
          pendingFees,
          pendingInvoiceCount: issuedInvoices.length,
          dormantCount: dormantInvoices.length,
          dormantAmount
        });
      } catch (error) {
        console.error('CRITICAL: Failed to load Finance HUD', error);
        toast.error('Failed to synchronize ledger');
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) return <div className="p-12 text-center text-slate-400 font-black animate-pulse uppercase tracking-widest">Synchronizing Institutional Ledger...</div>;

  return (
    <div className="p-2 space-y-10 min-h-screen">
      <DashboardGreeting 
        role="Chief - Financial Governance"
        name={user?.name || 'Administrator'}
        subtitle="Financial Control Engine: Monitoring real-time revenue velocity, institutional reconciliation, and structural fiscal architecture."
        actions={[
          {
            label: 'Finalize Queues',
            link: '/dashboard/finance/collections?tab=pending',
            icon: ShieldCheck
          },
          {
            label: 'Ledger Audit',
            link: '/dashboard/finance/ledger',
            icon: BookOpen
          }
        ]}
      />

      {/* KPI HUD */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        <StatCard
          title="Total Institutional Revenue"
          value={`₹${stats.revenue.toLocaleString()}`}
          icon={DollarSign}
          color="emerald"
          trend={`${stats.verifiedPaymentCount} verified payment${stats.verifiedPaymentCount === 1 ? '' : 's'}`}
          onClick={() => openDrillDown('revenue', 'Total Institutional Revenue')}
        />
        <StatCard
          title="Pending Approvals"
          value={stats.pendingApprovals.toString()}
          icon={Users}
          color="blue"
          trend={stats.pendingApprovals > 0 ? 'Action Required' : 'All Clear'}
          isAlert={stats.pendingApprovals > 0}
          onClick={() => openDrillDown('finance_pending_approvals', 'Pending Finance Approvals')}
        />
        <StatCard
          title="Outstanding Receivables"
          value={`₹${stats.pendingFees.toLocaleString()}`}
          icon={Clock}
          color="amber"
          trend={`${stats.pendingInvoiceCount} invoice${stats.pendingInvoiceCount === 1 ? '' : 's'} unpaid`}
          onClick={() => openDrillDown('pendingFees', 'Outstanding Receivables')}
        />
        <StatCard
          title="Dormant Invoices > 90 Days"
          value={stats.dormantCount.toString()}
          icon={AlertCircle}
          color="rose"
          trend={stats.dormantCount > 0 ? `₹${stats.dormantAmount.toLocaleString()} aged` : 'No aged invoices'}
          isAlert={stats.dormantCount > 0}
          onClick={() => openDrillDown('dormant_invoices', 'Dormant Invoices')}
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
                        title="Approvals awaiting finance review"
                        count={stats.pendingApprovals}
                        severity="High"
                        description="Students in FINANCE_PENDING or PAYMENT_VERIFIED status awaiting final ratification."
                     />
                     <RiskItem
                        title="Dormant Invoices > 90 Days"
                        count={stats.dormantCount}
                        severity="Critical"
                        description={stats.dormantCount > 0
                          ? `₹${stats.dormantAmount.toLocaleString()} in issued invoices have been unpaid for more than 90 days.`
                          : 'No issued invoices are older than 90 days.'}
                     />
                  </div>
               </div>
               <div className="pt-8 border-t border-slate-100 mt-8 flex justify-between items-center">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Automated Fraud Detection Active</p>
                  <Link to="/dashboard/finance/aging" className="text-blue-600 font-bold text-xs flex items-center gap-2 hover:translate-x-1 hover:scale-105 active:scale-95 transition-all">
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

      <DrillDownModal 
        isOpen={drillDown.isOpen}
        onClose={() => setDrillDown({ ...drillDown, isOpen: false })}
        type={drillDown.type}
        title={drillDown.title}
      />
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color, trend, isAlert, onClick }: any) {
  const colors: any = {
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    amber: 'bg-amber-50 text-amber-600 border-amber-100',
    rose: 'bg-rose-50 text-rose-600 border-rose-100',
  };

  const textColors: any = {
    emerald: 'text-emerald-600',
    blue: 'text-blue-600',
    amber: 'text-amber-600',
    rose: 'text-rose-600',
  };

  return (
    <div 
      onClick={onClick}
      className={`p-8 bg-white border border-slate-100 rounded-[2rem] shadow-xl shadow-slate-200/40 transition-all group relative overflow-hidden cursor-pointer hover:scale-[1.02] active:scale-[0.98] ${isAlert ? 'ring-2 ring-rose-500 ring-offset-4' : ''}`}
    >
      <div className={`absolute -right-6 -bottom-6 ${textColors[color]} opacity-[0.03] transform rotate-[15deg] transition-all duration-700 group-hover:rotate-0 group-hover:scale-125 group-hover:opacity-[0.05] pointer-events-none`}>
        <Icon className="w-40 h-40" />
      </div>

      <div className="relative z-10">
        <div className="flex justify-between items-center mb-6">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all group-hover:scale-110 shadow-sm ${colors[color]}`}>
            <Icon className="w-7 h-7" />
          </div>
          {isAlert && <span className="animate-ping absolute top-0 right-0 mt-6 mr-6 h-3 w-3 rounded-full bg-rose-500 opacity-75"></span>}
        </div>
        <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.15em] mb-1">{title}</p>
        <h4 className="text-3xl font-black text-slate-900 tracking-tight">{value}</h4>
        <div className="mt-6 flex items-center justify-between">
            <p className={`text-[10px] font-black uppercase tracking-widest ${color === 'rose' || isAlert ? 'text-rose-600' : 'text-slate-400'}`}>
                {trend}
            </p>
            {isAlert && (
                <div className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-600 text-[9px] font-black uppercase tracking-widest border border-rose-100">
                    Priority
                </div>
            )}
        </div>
      </div>
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
    <Link to={to} className="flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/5 hover:scale-[1.02] active:scale-[0.98] transition-all group">
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
