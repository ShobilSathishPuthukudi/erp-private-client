import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { CheckCircle2, Layers3, Send, XCircle } from 'lucide-react';

type ApiError = { response?: { data?: { error?: string } } };

type SalesEmployee = {
  uid: string;
  name: string;
  email: string;
  role: string;
};

type IncentiveTarget = {
  id: number;
  title: string;
  description?: string | null;
  metric: string;
  value: number;
  workflowStatus: string;
  startDate: string;
  endDate: string;
  financeRemarks?: string | null;
  operationsRemarks?: string | null;
  assignments?: {
    id: number;
    employee?: { name: string };
    task?: { status: string; title: string };
    status: string;
  }[];
  rules?: { structure: { achievement: number; reward: number }[] }[];
};

export default function IncentiveOpsDesk() {
  const [targets, setTargets] = useState<IncentiveTarget[]>([]);
  const [employees, setEmployees] = useState<SalesEmployee[]>([]);
  const [selectedEmployees, setSelectedEmployees] = useState<Record<number, string[]>>({});
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [targetsRes, employeesRes] = await Promise.all([
        api.get('/targets/operations/targets'),
        api.get('/targets/operations/sales-employees'),
      ]);
      setTargets(targetsRes.data || []);
      setEmployees(employeesRes.data || []);
    } catch {
      toast.error('Failed to load incentive operations desk');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const stats = useMemo(() => ({
    pendingVerification: targets.filter((target) => target.workflowStatus === 'pending_operations').length,
    readyToAssign: targets.filter((target) => target.workflowStatus === 'verified_by_operations').length,
    liveCycles: targets.filter((target) => target.workflowStatus === 'live').length,
  }), [targets]);

  const handleDecision = async (targetId: number, status: 'approved' | 'rejected') => {
    const remarks = window.prompt(`Add operations remarks for ${status}`) || '';
    if (remarks.trim().length < 12) {
      toast.error('Operations remarks are required');
      return;
    }

    try {
      await api.put(`/targets/operations/targets/${targetId}/decision`, { status, remarks });
      toast.success(`Plan ${status} by Operations`);
      fetchData();
    } catch (error: unknown) {
      toast.error((error as ApiError).response?.data?.error || `Failed to ${status} plan`);
    }
  };

  const toggleEmployee = (targetId: number, employeeUid: string) => {
    setSelectedEmployees((current) => {
      const existing = current[targetId] || [];
      return {
        ...current,
        [targetId]: existing.includes(employeeUid)
          ? existing.filter((uid) => uid !== employeeUid)
          : [...existing, employeeUid],
      };
    });
  };

  const handleAssign = async (target: IncentiveTarget, assignAll = false) => {
    const selected = selectedEmployees[target.id] || [];
    if (!assignAll && selected.length === 0) {
      toast.error('Select at least one employee or use bulk assign');
      return;
    }

    const deadline = window.prompt('Set assignment deadline (YYYY-MM-DD)', target.endDate?.slice(0, 10) || '');
    if (deadline === null) return;

    try {
      await api.post(`/targets/operations/targets/${target.id}/assign`, {
        employeeUids: selected,
        assignAll,
        deadline,
        title: target.title,
        description: target.description,
        priority: 'high',
      });
      toast.success(assignAll ? 'Plan assigned to all sales employees' : 'Plan assigned to selected employees');
      setSelectedEmployees((current) => ({ ...current, [target.id]: [] }));
      fetchData();
    } catch (error: unknown) {
      toast.error((error as ApiError).response?.data?.error || 'Failed to assign plan');
    }
  };

  if (loading) {
    return <div className="h-80 animate-pulse rounded-3xl bg-slate-50" />;
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="flex items-center gap-3 text-3xl font-black tracking-tight text-slate-900">
          <Layers3 className="h-8 w-8 text-sky-600" />
          Incentive Operations Desk
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
          Operations verifies incentive plans created by Finance, assigns them to one employee or all eligible employees in bulk,
          and keeps live execution visible until Finance review begins.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatBlock label="Pending Verification" value={stats.pendingVerification} />
        <StatBlock label="Ready To Assign" value={stats.readyToAssign} />
        <StatBlock label="Live Cycles" value={stats.liveCycles} />
      </div>

      <div className="space-y-4">
        {targets.length === 0 && (
          <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-14 text-center text-sm text-slate-500">
            No incentive plans are in the operations desk right now.
          </div>
        )}

        {targets.map((target) => {
          const selected = selectedEmployees[target.id] || [];

          return (
            <section key={target.id} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="text-xl font-black text-slate-900">{target.title}</h2>
                    <StatusBadge status={target.workflowStatus} />
                  </div>
                  <p className="text-sm leading-6 text-slate-500">{target.description || 'No operations brief provided.'}</p>
                  <div className="flex flex-wrap gap-4 text-sm text-slate-600">
                    <span>Metric: <strong className="text-slate-900">{target.metric.replaceAll('_', ' ')}</strong></span>
                    <span>Value: <strong className="text-slate-900">{target.value}</strong></span>
                    <span>Window: <strong className="text-slate-900">{formatDate(target.startDate)} to {formatDate(target.endDate)}</strong></span>
                  </div>
                  {target.financeRemarks && (
                    <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                      Finance note: {target.financeRemarks}
                    </div>
                  )}
                </div>

                {target.workflowStatus === 'pending_operations' && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleDecision(target.id, 'rejected')}
                      className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-bold text-rose-700"
                    >
                      <XCircle className="h-4 w-4" />
                      Reject
                    </button>
                    <button
                      onClick={() => handleDecision(target.id, 'approved')}
                      className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-bold text-emerald-700"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Verify
                    </button>
                  </div>
                )}
              </div>

              {(target.workflowStatus === 'verified_by_operations' || target.workflowStatus === 'live') && (
                <div className="mt-6 space-y-4 rounded-3xl border border-slate-200 bg-slate-50 p-5">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-700">Assign To Sales Employees</h3>
                      <p className="mt-1 text-sm text-slate-500">Choose a single employee or assign the plan to every eligible sales employee in bulk.</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAssign(target, true)}
                        className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-100"
                      >
                        Assign All
                      </button>
                      <button
                        onClick={() => handleAssign(target, false)}
                        className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800"
                      >
                        Assign Selected ({selected.length})
                      </button>
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {employees.map((employee) => (
                      <label key={employee.uid} className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4">
                        <input
                          type="checkbox"
                          checked={selected.includes(employee.uid)}
                          onChange={() => toggleEmployee(target.id, employee.uid)}
                          className="mt-1 h-4 w-4 rounded border-slate-300"
                        />
                        <span className="space-y-1">
                          <span className="block font-bold text-slate-900">{employee.name}</span>
                          <span className="block text-sm text-slate-500">{employee.email}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {target.assignments && target.assignments.length > 0 && (
                <div className="mt-6 space-y-3">
                  <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-700">Live Assignment Progress</h3>
                  {target.assignments.map((assignment) => (
                    <div key={assignment.id} className="flex flex-col gap-2 rounded-2xl border border-slate-200 p-4 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="font-bold text-slate-900">{assignment.employee?.name || 'Employee'}</p>
                        <p className="text-sm text-slate-500">{assignment.task?.title || 'Assigned task'}</p>
                      </div>
                      <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-black uppercase tracking-[0.2em] text-slate-700">
                        <Send className="h-3 w-3" />
                        {assignment.task?.status || assignment.status}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          );
        })}
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
    pending_operations: 'bg-amber-50 text-amber-700',
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
