import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { Activity, Target } from 'lucide-react';

type SalesTarget = {
  id: number;
  title: string;
  description?: string | null;
  metric: string;
  value: number;
  workflowStatus: string;
  startDate: string;
  endDate: string;
  assignments?: {
    id: number;
    employee?: { name: string };
    task?: { status: string; title: string };
    status: string;
  }[];
  rules?: { structure: { achievement: number; reward: number }[] }[];
};

export default function SalesTargetInbox() {
  const [targets, setTargets] = useState<SalesTarget[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const res = await api.get('/targets/sales-admin/targets');
      setTargets(res.data || []);
    } catch (error: any) {
      toast.error(`Error: ${error?.response?.data?.error || error.message || 'Failed to load sales incentive progress'}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const stats = useMemo(() => ({
    livePlans: targets.filter((target) => target.workflowStatus === 'live').length,
    underReview: targets.filter((target) => target.workflowStatus === 'under_finance_review').length,
    closedCycles: targets.filter((target) => ['approved_by_finance', 'denied_by_finance', 'disbursed'].includes(target.workflowStatus)).length,
  }), [targets]);

  if (loading) {
    return <div className="h-80 animate-pulse rounded-3xl bg-slate-50" />;
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="flex items-center gap-3 text-3xl font-black tracking-tight text-slate-900">
          <Target className="h-8 w-8 text-amber-600" />
          Sales Incentive Progress
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
          Live visibility into incentive plans already verified by Operations and currently running across the sales team.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatBlock label="Live Plans" value={stats.livePlans} />
        <StatBlock label="Finance Review" value={stats.underReview} />
        <StatBlock label="Closed Cycles" value={stats.closedCycles} />
      </div>

      <div className="space-y-4">
        {targets.length === 0 && (
          <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-14 text-center text-sm text-slate-500">
            No incentive plans are active for sales right now.
          </div>
        )}

        {targets.map((target) => (
          <section key={target.id} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-black text-slate-900">{target.title}</h2>
                  <StatusBadge status={target.workflowStatus} />
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-500">{target.description || 'No summary provided.'}</p>
                <div className="mt-2 flex flex-wrap gap-4 text-sm text-slate-600">
                  <span>Metric: <strong className="text-slate-900">{target.metric.replaceAll('_', ' ')}</strong></span>
                  <span>Value: <strong className="text-slate-900">{target.value}</strong></span>
                  <span>Window: <strong className="text-slate-900">{formatDate(target.startDate)} to {formatDate(target.endDate)}</strong></span>
                </div>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-black uppercase tracking-[0.2em] text-slate-700">
                <Activity className="h-3 w-3" />
                {target.assignments?.length || 0} assignments
              </div>
            </div>

            {target.assignments && target.assignments.length > 0 && (
              <div className="mt-6 space-y-3">
                {target.assignments.map((assignment) => (
                  <div key={assignment.id} className="flex flex-col gap-2 rounded-2xl border border-slate-200 p-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="font-bold text-slate-900">{assignment.employee?.name || 'Employee'}</p>
                      <p className="text-sm text-slate-500">{assignment.task?.title || 'Assigned task'}</p>
                    </div>
                    <div className="text-sm font-semibold text-slate-600">
                      {assignment.task?.status || assignment.status}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}

function StatBlock({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">{label}</p>
      <p className="mt-3 text-3xl font-black text-slate-900">{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    verified_by_operations: 'bg-sky-50 text-sky-700',
    live: 'bg-blue-50 text-blue-700',
    under_finance_review: 'bg-rose-50 text-rose-700',
    approved_by_finance: 'bg-emerald-50 text-emerald-700',
    denied_by_finance: 'bg-red-50 text-red-700',
    disbursed: 'bg-emerald-100 text-emerald-800',
  };

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-black uppercase tracking-[0.18em] ${styles[status] || 'bg-slate-100 text-slate-700'}`}>
      {status.replaceAll('_', ' ')}
    </span>
  );
}

function formatDate(value?: string | null) {
  if (!value) return 'Not set';
  return new Date(value).toLocaleDateString();
}
