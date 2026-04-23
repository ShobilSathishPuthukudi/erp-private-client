import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Award, BarChart3, Coins, User, type LucideIcon } from 'lucide-react';

type Payout = {
  id: number;
  amount: number;
  achievementPercentage: number;
  period: string;
  status: string;
  employee?: { name: string };
  target?: { title?: string; metric?: string; workflowStatus?: string };
};

type Summary = {
  totalPayouts: number;
  totalProcessed: number;
  totalValue: number;
  processedValue: number;
};

export default function PayoutApproval() {
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [summary, setSummary] = useState<Summary>({
    totalPayouts: 0,
    totalProcessed: 0,
    totalValue: 0,
    processedValue: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fallbackSummary = {
      totalPayouts: 0,
      totalProcessed: 0,
      totalValue: 0,
      processedValue: 0,
    };

    const fetchPayouts = async () => {
      try {
        const { data } = await api.get('/ceo/incentive-payouts');
        setPayouts(data?.payouts || []);
        setSummary(data?.summary || fallbackSummary);
      } finally {
        setLoading(false);
      }
    };

    fetchPayouts();
  }, []);

  if (loading) return <div className="animate-pulse h-64 bg-slate-50 rounded-2xl" />;

  return (
    <div className="p-2 space-y-6 flex flex-col">
      <div className="rounded-[2rem] border border-slate-100 bg-white p-8 shadow-xl shadow-slate-200/40">
        <h2 className="flex items-center gap-3 text-2xl font-bold text-slate-900">
          <Award className="h-7 w-7 text-amber-500" />
          Incentive Payout Oversight
        </h2>
        <p className="mt-1 text-slate-500">
          This panel is now read-only. Finance creates and processes incentive payouts after Sales Admin assignment and employee task completion.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Total Payouts" value={summary.totalPayouts} icon={BarChart3} />
        <Kpi label="Processed Payouts" value={summary.totalProcessed} icon={Award} />
        <Kpi label="Total Value" value={`₹${Number(summary.totalValue || 0).toLocaleString()}`} icon={Coins} />
        <Kpi label="Processed Value" value={`₹${Number(summary.processedValue || 0).toLocaleString()}`} icon={Coins} />
      </div>

      <div className="grid grid-cols-1 gap-4">
        {payouts.map((payout) => (
          <div key={payout.id} className="flex flex-col justify-between gap-4 rounded-3xl border border-slate-100 bg-white p-6 shadow-lg shadow-slate-200/30 lg:flex-row lg:items-center hover:shadow-xl hover:scale-[1.01] transition-all">
            <div className="flex items-center gap-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                <User className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <p className="text-lg font-black tracking-tight text-slate-900">{payout.employee?.name || 'Employee'}</p>
                <div className="flex flex-wrap gap-3 text-xs font-bold uppercase tracking-widest text-slate-500">
                  <span>{payout.period}</span>
                  <span>{payout.target?.title || 'Untitled Target'}</span>
                  <span>{payout.target?.workflowStatus?.replaceAll('_', ' ') || payout.status}</span>
                </div>
              </div>
            </div>

            <div className="text-right">
              <p className="text-2xl font-black text-slate-900">₹{Number(payout.amount || 0).toLocaleString()}</p>
              <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600">{payout.status}</p>
            </div>
          </div>
        ))}

        {payouts.length === 0 && (
          <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 p-20 text-center">
            <Award className="mx-auto mb-4 h-12 w-12 text-slate-300" />
            <h3 className="text-lg font-bold text-slate-900">No Incentive Records</h3>
            <p className="mt-1 text-sm text-slate-500">Processed finance incentive data will appear here for CEO oversight.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function Kpi({ label, value, icon: Icon }: { label: string; value: string | number; icon: LucideIcon }) {
  return (
    <div className="rounded-[2rem] border border-slate-100 bg-white p-7 shadow-xl shadow-slate-200/40 hover:scale-[1.02] transition-all cursor-pointer">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
          <p className="mt-3 text-3xl font-black text-slate-900">{value}</p>
        </div>
        <div className="rounded-2xl bg-slate-100 p-3 text-slate-700">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}
