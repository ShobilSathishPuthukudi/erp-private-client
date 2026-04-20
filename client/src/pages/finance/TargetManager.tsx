import { useEffect, useMemo, useState, type ReactNode } from 'react';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { Modal } from '@/components/shared/Modal';
import { CheckCircle2, Coins, Plus, ShieldCheck, Target, TrendingUp, type LucideIcon } from 'lucide-react';

type ApiError = { response?: { data?: { error?: string } } };

type RewardRule = { achievement: number; reward: number };

type FinanceTarget = {
  id: number;
  title: string;
  description?: string | null;
  metric: string;
  value: number;
  startDate: string;
  endDate: string;
  workflowStatus: string;
  financeRemarks?: string | null;
  financeReviewRemarks?: string | null;
  eligibilityCriteria?: { minAchievement?: number; requireActiveEmployee?: boolean; notes?: string } | null;
  rules?: { id: number; structure: RewardRule[] }[];
  assignments?: {
    id: number;
    status: string;
    employee?: { name: string };
    task?: { status: string; completedAt?: string | null };
    payout?: { id: number } | null;
  }[];
};

type AssignmentQueueItem = {
  id: number;
  status: string;
  employeeUid: string;
  employee?: { name: string; email: string };
  task?: { id: number; title: string; completedAt?: string | null; status: string };
  target?: {
    id: number;
    title: string;
    value: number;
    workflowStatus: string;
    rules?: { structure: RewardRule[] }[];
  };
  payout?: { id: number } | null;
};

type PayoutRecord = {
  id: number;
  amount: number;
  period: string;
  status: string;
  employee?: { name: string };
  target?: { title?: string };
  createdAt?: string;
};

const emptyForm = {
  title: '',
  description: '',
  metric: 'revenue',
  value: 0,
  startDate: '',
  endDate: '',
  financeRemarks: '',
  eligibilityNotes: '',
  minAchievement: 100,
  requireActiveEmployee: true,
  rules: [{ achievement: 100, reward: 0 }],
};

export default function TargetManager() {
  const [targets, setTargets] = useState<FinanceTarget[]>([]);
  const [queue, setQueue] = useState<AssignmentQueueItem[]>([]);
  const [payouts, setPayouts] = useState<PayoutRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState(emptyForm);

  const fetchData = async () => {
    try {
      const [targetsRes, payoutsRes] = await Promise.all([
        api.get('/targets/finance/targets'),
        api.get('/finance/incentive-payouts'),
      ]);

      setTargets(targetsRes.data || []);
      setQueue((payoutsRes.data?.queue || []).filter((item: AssignmentQueueItem) => item.status === 'completed' && !item.payout));
      setPayouts(payoutsRes.data?.payouts || []);
    } catch {
      toast.error('Failed to load incentive workflow');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const stats = useMemo(() => ({
    pendingOperations: targets.filter((target) => target.workflowStatus === 'pending_operations').length,
    livePlans: targets.filter((target) => target.workflowStatus === 'live').length,
    underReview: targets.filter((target) => target.workflowStatus === 'under_finance_review').length + queue.length,
    disbursed: targets.filter((target) => target.workflowStatus === 'disbursed').length,
  }), [targets, queue]);

  const rulesValid = formData.rules.every((rule) => Number(rule.achievement) > 0 && Number(rule.reward) >= 0);
  const datesValid = !!formData.startDate && !!formData.endDate && formData.endDate >= formData.startDate;

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!formData.title.trim() || Number(formData.value) <= 0 || !rulesValid || !datesValid) {
      toast.error('Complete all required fields before creating the incentive plan');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/targets/finance/targets', {
        title: formData.title,
        description: formData.description,
        metric: formData.metric,
        value: Number(formData.value),
        startDate: formData.startDate,
        endDate: formData.endDate,
        financeRemarks: formData.financeRemarks,
        eligibilityCriteria: {
          minAchievement: Number(formData.minAchievement) || 100,
          requireActiveEmployee: formData.requireActiveEmployee,
          notes: formData.eligibilityNotes,
        },
        rules: formData.rules,
      });
      toast.success('Incentive plan sent to Operations for verification');
      setFormData(emptyForm);
      setIsModalOpen(false);
      fetchData();
    } catch (error: unknown) {
      toast.error((error as ApiError).response?.data?.error || 'Failed to create incentive plan');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReview = async (assignment: AssignmentQueueItem, decision: 'approve' | 'deny') => {
    const suggestedReward = assignment.target?.rules?.[0]?.structure?.reduce((max, rule) => Math.max(max, Number(rule.reward || 0)), 0) || 0;
    const remarks = window.prompt(
      decision === 'approve'
        ? 'Add finance approval remarks for this incentive payout'
        : 'Add finance denial remarks and next-cycle adjustment context',
      '',
    ) || '';

    if (remarks.trim().length < 8) {
      toast.error('Finance review remarks are required');
      return;
    }

    try {
      if (decision === 'approve') {
        const amountInput = window.prompt('Enter payout amount for this completed target', `${suggestedReward}`);
        if (amountInput === null) return;

        await api.post(`/finance/incentive-payouts/review/${assignment.id}`, {
          decision,
          amount: Number(amountInput),
          remarks,
        });
      } else {
        const nextCycleValue = window.prompt('Optional next-cycle target value', `${assignment.target?.value || ''}`) || '';
        const nextCycleStartDate = window.prompt('Optional next-cycle start date (YYYY-MM-DD)', '') || '';
        const nextCycleEndDate = window.prompt('Optional next-cycle end date (YYYY-MM-DD)', '') || '';

        await api.post(`/finance/incentive-payouts/review/${assignment.id}`, {
          decision,
          remarks,
          nextCycleValue: nextCycleValue ? Number(nextCycleValue) : undefined,
          nextCycleStartDate: nextCycleStartDate || undefined,
          nextCycleEndDate: nextCycleEndDate || undefined,
        });
      }

      toast.success(decision === 'approve' ? 'Incentive approved and disbursed' : 'Incentive denied and next cycle prepared');
      fetchData();
    } catch (error: unknown) {
      toast.error((error as ApiError).response?.data?.error || 'Failed to review incentive');
    }
  };

  const addRule = () => {
    setFormData((current) => ({
      ...current,
      rules: [...current.rules, { achievement: 100, reward: 0 }],
    }));
  };

  if (loading) {
    return <div className="h-80 animate-pulse rounded-3xl bg-slate-50" />;
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <h1 className="flex items-center gap-3 text-3xl font-black tracking-tight text-slate-900">
              <Target className="h-8 w-8 text-blue-600" />
              Sales Incentives Approval Flow
            </h1>
            <p className="max-w-3xl text-sm leading-6 text-slate-500">
              Finance defines incentive plans, Operations verifies and bulk-assigns them, live employee progress is tracked during the cycle,
              and Finance then approves or denies each completed assignment with payout and next-cycle controls.
            </p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-6 py-3 font-bold text-white transition hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            New Incentive Plan
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Pending Ops Review" value={stats.pendingOperations} icon={ShieldCheck} tone="amber" />
        <StatCard label="Live Cycles" value={stats.livePlans} icon={TrendingUp} tone="blue" />
        <StatCard label="Finance Review Queue" value={stats.underReview} icon={CheckCircle2} tone="rose" />
        <StatCard label="Disbursed Cycles" value={stats.disbursed} icon={Coins} tone="emerald" />
      </div>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-5">
          <h2 className="text-xl font-black text-slate-900">Finance Review Queue</h2>
          <p className="text-sm text-slate-500">Approve eligible incentive payouts or deny them with next-cycle adjustments.</p>
        </div>

        <div className="space-y-3">
          {queue.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center text-sm text-slate-500">
              No completed assignments are waiting for Finance review.
            </div>
          )}

          {queue.map((assignment) => (
            <div key={assignment.id} className="flex flex-col gap-4 rounded-2xl border border-slate-200 p-5 xl:flex-row xl:items-center xl:justify-between">
              <div className="space-y-1">
                <p className="text-lg font-bold text-slate-900">{assignment.target?.title || assignment.task?.title || 'Untitled incentive task'}</p>
                <p className="text-sm text-slate-500">
                  {assignment.employee?.name} • {assignment.task?.title || 'Task linked'} • Completed {formatDate(assignment.task?.completedAt)}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleReview(assignment, 'deny')}
                  className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-bold text-rose-700 transition hover:bg-rose-100"
                >
                  Deny
                </button>
                <button
                  onClick={() => handleReview(assignment, 'approve')}
                  className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-700"
                >
                  Approve & Disburse
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-5">
          <h2 className="text-xl font-black text-slate-900">Plan Dashboard</h2>
          <p className="text-sm text-slate-500">A live view of plans, verification state, assignment coverage, and finance notes.</p>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          {targets.map((target) => {
            const completedAssignments = target.assignments?.filter((assignment) => ['completed', 'approved', 'denied', 'payout_processed'].includes(assignment.status)).length || 0;
            const totalAssignments = target.assignments?.length || 0;
            const progress = totalAssignments ? Math.round((completedAssignments / totalAssignments) * 100) : 0;

            return (
              <article key={target.id} className="rounded-2xl border border-slate-200 p-5">
                <div className="mb-4 flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-black text-slate-900">{target.title}</h3>
                    <p className="mt-1 text-sm text-slate-500">{target.description || 'No incentive brief added.'}</p>
                  </div>
                  <StatusPill status={target.workflowStatus} />
                </div>

                <div className="grid gap-3 text-sm text-slate-600 md:grid-cols-2">
                  <div>Metric: <span className="font-semibold text-slate-900">{target.metric.replaceAll('_', ' ')}</span></div>
                  <div>Target: <span className="font-semibold text-slate-900">{target.value}</span></div>
                  <div>Window: <span className="font-semibold text-slate-900">{formatDate(target.startDate)} to {formatDate(target.endDate)}</span></div>
                  <div>Progress: <span className="font-semibold text-slate-900">{progress}%</span></div>
                </div>

                {target.eligibilityCriteria && (
                  <div className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                    Eligibility: minimum {target.eligibilityCriteria.minAchievement || 100}% achievement
                    {target.eligibilityCriteria.requireActiveEmployee ? ', active employee only' : ''}
                    {target.eligibilityCriteria.notes ? `, ${target.eligibilityCriteria.notes}` : ''}
                  </div>
                )}

                {(target.financeRemarks || target.financeReviewRemarks) && (
                  <div className="mt-4 rounded-xl bg-blue-50 px-4 py-3 text-sm text-blue-700">
                    {target.financeReviewRemarks || target.financeRemarks}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-5">
          <h2 className="text-xl font-black text-slate-900">Recent Payout Report</h2>
          <p className="text-sm text-slate-500">Processed incentive disbursements for audit and reporting.</p>
        </div>

        <div className="space-y-3">
          {payouts.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center text-sm text-slate-500">
              No processed payouts yet.
            </div>
          )}

          {payouts.slice(0, 10).map((payout) => (
            <div key={payout.id} className="flex flex-col gap-2 rounded-2xl border border-slate-200 p-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="font-bold text-slate-900">{payout.employee?.name || 'Employee'}</p>
                <p className="text-sm text-slate-500">{payout.target?.title || 'Target payout'} • {payout.period}</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-black text-slate-900">₹{Number(payout.amount || 0).toLocaleString()}</p>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-600">{payout.status}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create Sales Incentive Plan">
        <form onSubmit={handleCreate} className="space-y-5">
          <Field label="Plan Title">
            <input
              value={formData.title}
              onChange={(event) => setFormData((current) => ({ ...current, title: event.target.value }))}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
              placeholder="Q2 Admissions Accelerator"
              required
            />
          </Field>

          <Field label="Description">
            <textarea
              value={formData.description}
              onChange={(event) => setFormData((current) => ({ ...current, description: event.target.value }))}
              className="min-h-24 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
              placeholder="Explain the incentive cycle, payout intent, and target focus."
            />
          </Field>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Metric">
              <select
                value={formData.metric}
                onChange={(event) => setFormData((current) => ({ ...current, metric: event.target.value }))}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
              >
                <option value="revenue">Revenue</option>
                <option value="enrollment">Enrollment</option>
                <option value="conversion_rate">Conversion Rate</option>
              </select>
            </Field>
            <Field label="Target Value">
              <input
                type="number"
                value={formData.value}
                onChange={(event) => setFormData((current) => ({ ...current, value: Number(event.target.value) }))}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
                min={1}
                step="0.01"
                required
              />
            </Field>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Start Date">
              <input
                type="date"
                value={formData.startDate}
                onChange={(event) => setFormData((current) => ({ ...current, startDate: event.target.value }))}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
                required
              />
            </Field>
            <Field label="End Date">
              <input
                type="date"
                value={formData.endDate}
                onChange={(event) => setFormData((current) => ({ ...current, endDate: event.target.value }))}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
                required
              />
            </Field>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Min Achievement %">
              <input
                type="number"
                value={formData.minAchievement}
                onChange={(event) => setFormData((current) => ({ ...current, minAchievement: Number(event.target.value) }))}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
                min={1}
                step="0.01"
              />
            </Field>
            <Field label="Eligibility">
              <label className="flex h-full items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={formData.requireActiveEmployee}
                  onChange={(event) => setFormData((current) => ({ ...current, requireActiveEmployee: event.target.checked }))}
                />
                Only active employees are eligible
              </label>
            </Field>
          </div>

          <Field label="Eligibility Notes">
            <textarea
              value={formData.eligibilityNotes}
              onChange={(event) => setFormData((current) => ({ ...current, eligibilityNotes: event.target.value }))}
              className="min-h-20 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
              placeholder="Optional notes for Operations and Finance review."
            />
          </Field>

          <Field label="Finance Notes">
            <textarea
              value={formData.financeRemarks}
              onChange={(event) => setFormData((current) => ({ ...current, financeRemarks: event.target.value }))}
              className="min-h-20 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
              placeholder="Audit context, payout structure intent, and review guidance."
            />
          </Field>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Payout Tiers</p>
              <button type="button" onClick={addRule} className="text-sm font-bold text-blue-600">Add Tier</button>
            </div>
            {formData.rules.map((rule, index) => (
              <div key={index} className="grid gap-3 rounded-2xl bg-slate-50 p-4 md:grid-cols-2">
                <input
                  type="number"
                  value={rule.achievement}
                  onChange={(event) => {
                    const nextRules = [...formData.rules];
                    nextRules[index].achievement = Number(event.target.value);
                    setFormData((current) => ({ ...current, rules: nextRules }));
                  }}
                  className="rounded-xl border border-slate-200 px-4 py-3 text-sm"
                  placeholder="Achievement %"
                />
                <input
                  type="number"
                  value={rule.reward}
                  onChange={(event) => {
                    const nextRules = [...formData.rules];
                    nextRules[index].reward = Number(event.target.value);
                    setFormData((current) => ({ ...current, rules: nextRules }));
                  }}
                  className="rounded-xl border border-slate-200 px-4 py-3 text-sm"
                  placeholder="Reward amount"
                />
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setIsModalOpen(false)} className="rounded-xl px-4 py-2 text-sm font-bold text-slate-500">
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? 'Creating...' : 'Create Plan'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="space-y-2">
      <span className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">{label}</span>
      {children}
    </label>
  );
}

function StatCard({ label, value, icon: Icon, tone }: { label: string; value: number; icon: LucideIcon; tone: 'amber' | 'blue' | 'emerald' | 'rose' }) {
  const tones = {
    amber: 'bg-amber-50 text-amber-700',
    blue: 'bg-blue-50 text-blue-700',
    emerald: 'bg-emerald-50 text-emerald-700',
    rose: 'bg-rose-50 text-rose-700',
  };

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className={`inline-flex rounded-2xl p-3 ${tones[tone]}`}>
        <Icon className="h-5 w-5" />
      </div>
      <p className="mt-4 text-xs font-black uppercase tracking-[0.2em] text-slate-400">{label}</p>
      <p className="mt-2 text-3xl font-black text-slate-900">{value}</p>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending_operations: 'bg-amber-50 text-amber-700',
    verified_by_operations: 'bg-sky-50 text-sky-700',
    live: 'bg-blue-50 text-blue-700',
    under_finance_review: 'bg-rose-50 text-rose-700',
    approved_by_finance: 'bg-emerald-50 text-emerald-700',
    denied_by_finance: 'bg-red-50 text-red-700',
    disbursed: 'bg-emerald-100 text-emerald-800',
    rejected_by_operations: 'bg-red-50 text-red-700',
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
