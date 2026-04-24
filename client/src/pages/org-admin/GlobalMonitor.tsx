import { useQuery } from '@tanstack/react-query';
import { NavLink, useParams } from 'react-router-dom';
import { useState, useMemo } from 'react';
import {
  Activity,
  Users,
  Briefcase,
  DollarSign,
  TrendingUp,
  BookOpen,
  ShieldCheck,
  Megaphone,
  Network,
  CheckSquare,
  AlertTriangle,
  RefreshCw,
  PieChart,
  Search,
  ShieldAlert,
  Globe,
  Building2,
  MapPin,
  FileText,
  CheckCircle,
  AlertCircle,
  Calendar,
  List,
} from 'lucide-react';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/shared/PageHeader';

// ---------------------------------------------------------------------------
// Shared infrastructure
// ---------------------------------------------------------------------------

const REFETCH_INTERVAL = 15_000;

const useMonitor = <T,>(key: string, path: string) =>
  useQuery<T>({
    queryKey: ['org-monitor', key],
    queryFn: async () => (await api.get(`/org-monitor/${path}`)).data,
    refetchInterval: REFETCH_INTERVAL,
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

const formatNumber = (n: number | string | null | undefined) => {
  if (n === null || n === undefined) return '0';
  const num = typeof n === 'string' ? Number(n) : n;
  if (Number.isNaN(num)) return '0';
  return num.toLocaleString();
};

const StatusDot = ({ status }: { status?: string | null }) => {
  const s = (status || '').toLowerCase();
  const color =
    s === 'active' || s === 'approved' || s === 'paid' || s === 'verified' || s === 'signed'
      ? 'bg-emerald-500'
      : s === 'pending' || s === 'draft' || s === 'negotiation'
      ? 'bg-amber-500'
      : s === 'inactive' || s === 'rejected' || s === 'lost' || s === 'suspended'
      ? 'bg-rose-500'
      : 'bg-slate-300';
  return <span className={`inline-block w-2 h-2 rounded-full ${color}`} />;
};

const MetricCard = ({
  label,
  value,
  icon: Icon,
  tone = 'slate',
  sub,
}: {
  label: string;
  value: number | string;
  icon: any;
  tone?: string;
  sub?: string;
}) => (
  <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
    <div className="flex items-center justify-between mb-3">
      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{label}</span>
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center bg-${tone}-100 text-${tone}-600`}>
        <Icon className="w-4 h-4" />
      </div>
    </div>
    <div className="text-3xl font-black text-slate-900 tracking-tight">{formatNumber(value)}</div>
    {sub && <div className="text-xs text-slate-500 mt-1 font-medium">{sub}</div>}
  </div>
);

const Section = ({
  title,
  description,
  children,
  action,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) => (
  <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
    <div className="flex items-start justify-between mb-5">
      <div>
        <h3 className="text-lg font-black text-slate-900 tracking-tight">{title}</h3>
        {description && <p className="text-xs text-slate-500 mt-1 font-medium">{description}</p>}
      </div>
      {action}
    </div>
    {children}
  </div>
);

const MonitorHeader = ({
  title,
  subtitle,
  generatedAt,
  isFetching,
  refetch,
}: {
  title: string;
  subtitle: string;
  generatedAt?: string;
  isFetching?: boolean;
  refetch?: () => void;
}) => (
  <PageHeader 
    title={title}
    description={subtitle}
    icon={Globe}
    action={
      <div className="flex items-center gap-3">
        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">
          <div>Live · auto-refresh 15s</div>
          {generatedAt && <div className="text-slate-500">Snapshot {new Date(generatedAt).toLocaleTimeString()}</div>}
        </div>
        <button
          onClick={() => refetch && refetch()}
          className="p-2.5 rounded-xl bg-slate-900 text-white hover:bg-slate-800 transition shadow-lg shadow-slate-900/20 active:scale-95"
          title="Refresh now"
        >
          <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
        </button>
      </div>
    }
  />
);

const EmptyRow = ({ label }: { label: string }) => (
  <div className="py-6 text-center text-sm text-slate-400 font-medium">{label}</div>
);

const SearchBar = ({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) => (
  <div className="relative">
    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-200 w-full bg-slate-50 focus:bg-white focus:border-slate-400 outline-none"
    />
  </div>
);

// ---------------------------------------------------------------------------
// Overview — aggregated cross-panel telemetry
// ---------------------------------------------------------------------------

type SummaryPayload = {
  generatedAt: string;
  panels: {
    hr: { employeeCount: number; openVacancies: number; pendingLeaves: number; overdueTasks: number; activeAdmins: number };
    finance: { invoicesIssued: number; invoicesPaid: number; verifiedPaymentsTotal: number; reregPending: number; credentialRequestsPending: number };
    sales: { activeLeads: number; convertedLeads: number; openDeals: number; signedDeals: number };
    academic: { universitiesCount: number; programsCount: number; centersCount: number; centersPendingAudit: number; studentsEnrolled: number; studentsPendingReview: number };
    ceo: { panelCount: number; activePanels: number; ceoToHrTaskCount: number };
    governance: { activeDirectives: number; activeSurveys: number; auditEvents24h: number; criticalEvents24h: number };
    operations: { centersCount: number; centersPendingAudit: number; centersByAudit: any[] };
  };
  totalActiveWorkforce: number;
  coreDepartments: any[];
  subDepartments: any[];
  ceoPanels: any[];
  ceoToHrTasks: any[];
};

export function GlobalMonitorOverview() {
  const { data, isLoading, isFetching, refetch } = useMonitor<SummaryPayload>('summary', 'summary');

  const panels = [
    { key: 'academic', label: 'Academic & Enrollment', path: 'academic', icon: BookOpen, tone: 'blue', description: 'Universities, programs, centers, student lifecycle' },
    { key: 'finance', label: 'Finance & Accounting', path: 'finance', icon: DollarSign, tone: 'emerald', description: 'Invoices, payments, re-registration, audit' },
    { key: 'operations', label: 'Operations & Regional', path: 'operations', icon: Building2, tone: 'amber', description: 'Sub-departments, center audits, regional units' },
    { key: 'hr', label: 'HR & Marketing', path: 'hr', icon: Users, tone: 'rose', description: 'Workforce, vacancies, surveys, feedback' },
    { key: 'sales', label: 'Sales Intelligence', path: 'sales', icon: TrendingUp, tone: 'indigo', description: 'Leads, deals, BDE performance, forecasts' },
    { key: 'security', label: 'Security Telemetry', path: 'security', icon: ShieldAlert, tone: 'slate', description: 'Audit log density, system events, integrity' },
    { key: 'global-all', label: 'Global (All)', path: 'global-all', icon: Globe, tone: 'violet', description: 'Master institutional rollup of all critical KPIs' },
    { key: 'ceo', label: 'CEO Panel Master', path: 'ceo', icon: ShieldCheck, tone: 'slate', description: 'Executive instance configuration & scope' },
  ];

  return (
    <div className="p-2 space-y-8">
      <MonitorHeader
        title="Global Monitor"
        subtitle="Live snapshot of every panel in the institution — Organization Admin only."
        generatedAt={data?.generatedAt}
        isFetching={isFetching}
        refetch={refetch}
      />

      {isLoading && !data ? (
        <div className="p-10 text-center text-sm text-slate-400">Loading live telemetry…</div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <MetricCard label="Active Workforce" value={data?.panels.hr.employeeCount ?? 0} icon={Users} tone="rose" />
            <MetricCard label="Overdue Tasks" value={data?.panels.hr.overdueTasks ?? 0} icon={AlertTriangle} tone="amber" />
            <MetricCard label="Paid Invoices" value={data?.panels.finance.invoicesPaid ?? 0} icon={DollarSign} tone="emerald" />
            <MetricCard label="Active Leads" value={data?.panels.sales.activeLeads ?? 0} icon={TrendingUp} tone="indigo" />
            <MetricCard label="Enrolled Students" value={data?.panels.academic.studentsEnrolled ?? 0} icon={BookOpen} tone="blue" />
            <MetricCard label="CEO Panels Active" value={data?.panels.ceo.activePanels ?? 0} icon={ShieldCheck} tone="violet" />
          </div>

          <Section title="Panel Dashboards" description="Drill into any panel to see the exact data that role sees — in real time.">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {panels.map((p) => (
                <NavLink
                  key={p.key}
                  to={`/dashboard/org-admin/monitor/${p.path}`}
                  className="group p-5 rounded-2xl border border-slate-200 hover:border-slate-400 hover:shadow-md transition bg-white"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-10 h-10 rounded-xl bg-${p.tone}-100 text-${p.tone}-600 flex items-center justify-center`}>
                      <p.icon className="w-5 h-5" />
                    </div>
                    <h4 className="font-black text-slate-900 text-sm">{p.label}</h4>
                  </div>
                  <p className="text-xs text-slate-500 font-medium">{p.description}</p>
                </NavLink>
              ))}
            </div>
          </Section>

          {data?.ceoPanels && data.ceoPanels.length > 0 && (
            <Section title="CEO Scope Dashboards" description="Direct institutional oversight portals for each provisioned executive instance.">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {data.ceoPanels.map((p: any) => (
                  <NavLink
                    key={p.id}
                    to={`/dashboard/org-admin/monitor/ceo?panelId=${p.id}`}
                    className="group p-5 rounded-2xl border border-slate-100 bg-slate-50/30 hover:bg-white hover:border-slate-300 transition-all flex flex-col justify-between shadow-sm hover:shadow-md"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <StatusDot status={p.status} />
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Live Portal</span>
                        </div>
                        <ShieldCheck className="w-4 h-4 text-slate-300 group-hover:text-violet-500 transition-colors" />
                      </div>
                      <h4 className="font-black text-slate-900 text-sm mb-3 group-hover:text-violet-600 transition-colors">{p.name}</h4>
                      <div className="flex flex-wrap gap-1.5">
                         {p.scope.map((s: any, idx: number) => (
                           <span key={idx} className="text-[8px] font-black bg-white px-2 py-1 rounded-lg border border-slate-100 text-slate-500 uppercase tracking-wider">
                             {typeof s === 'string' ? s : s?.name || 'Authorized Scope'}
                           </span>
                         ))}
                      </div>
                    </div>
                    <div className="mt-6 pt-4 border-t border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-tight">
                      Custodian: <span className="text-slate-600">{p.assignedCEO?.name || 'Vacant'}</span>
                    </div>
                  </NavLink>
                ))}
              </div>
            </Section>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Section title="HR" description="Live workforce telemetry">
              <dl className="space-y-2 text-sm">
                <Row k="Active employees" v={data?.panels.hr.employeeCount} />
                <Row k="Open vacancies" v={data?.panels.hr.openVacancies} />
                <Row k="Pending leaves" v={data?.panels.hr.pendingLeaves} />
                <Row k="Overdue tasks" v={data?.panels.hr.overdueTasks} />
                <Row k="Active admins" v={data?.panels.hr.activeAdmins} />
              </dl>
            </Section>
            <Section title="Finance" description="Revenue pipeline">
              <dl className="space-y-2 text-sm">
                <Row k="Invoices issued" v={data?.panels.finance.invoicesIssued} />
                <Row k="Invoices paid" v={data?.panels.finance.invoicesPaid} />
                <Row k="Verified payments total" v={`₹ ${formatNumber(data?.panels.finance.verifiedPaymentsTotal ?? 0)}`} />
                <Row k="Re-registration pending" v={data?.panels.finance.reregPending} />
                <Row k="Credential requests" v={data?.panels.finance.credentialRequestsPending} />
              </dl>
            </Section>
            <Section title="Sales" description="Pipeline snapshot">
              <dl className="space-y-2 text-sm">
                <Row k="Active leads" v={data?.panels.sales.activeLeads} />
                <Row k="Converted leads" v={data?.panels.sales.convertedLeads} />
                <Row k="Open deals" v={data?.panels.sales.openDeals} />
                <Row k="Signed deals" v={data?.panels.sales.signedDeals} />
              </dl>
            </Section>
            <Section title="Academic Operations" description="Students, programs, centers">
              <dl className="space-y-2 text-sm">
                <Row k="Universities" v={data?.panels.academic.universitiesCount} />
                <Row k="Programs" v={data?.panels.academic.programsCount} />
                <Row k="Centers" v={data?.panels.academic.centersCount} />
                <Row k="Centers pending audit" v={data?.panels.academic.centersPendingAudit} />
                <Row k="Enrolled students" v={data?.panels.academic.studentsEnrolled} />
                <Row k="Students pending review" v={data?.panels.academic.studentsPendingReview} />
              </dl>
            </Section>
            <Section title="CEO" description="Executive oversight">
              <dl className="space-y-2 text-sm">
                <Row k="Total CEO panels" v={data?.panels.ceo.panelCount} />
                <Row k="Active CEO panels" v={data?.panels.ceo.activePanels} />
                <Row k="CEO → HR tasks" v={data?.panels.ceo.ceoToHrTaskCount} />
              </dl>
            </Section>
            <Section title="Governance" description="Organization-wide signals">
              <dl className="space-y-2 text-sm">
                <Row k="Active directives" v={data?.panels.governance.activeDirectives} />
                <Row k="Active surveys" v={data?.panels.governance.activeSurveys} />
                <Row k="Audit events (24h)" v={data?.panels.governance.auditEvents24h} />
              </dl>
            </Section>
          </div>

          {data?.ceoToHrTasks?.length ? (
            <Section title="CEO → HR Tasks" description="Directives issued by CEO to HR administrators">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-[10px] uppercase tracking-widest text-slate-400">
                    <tr>
                      <th className="text-left py-2">Title</th>
                      <th className="text-left py-2">From</th>
                      <th className="text-left py-2">To</th>
                      <th className="text-left py-2">Status</th>
                      <th className="text-left py-2">Deadline</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.ceoToHrTasks.slice(0, 20).map((t) => (
                      <tr key={t.id} className="border-t border-slate-100">
                        <td className="py-2 font-semibold text-slate-800">{t.title}</td>
                        <td className="py-2 text-slate-600">{t.assigner?.name || '—'}</td>
                        <td className="py-2 text-slate-600">{t.assignee?.name || '—'}</td>
                        <td className="py-2">
                          <span className="flex items-center gap-2"><StatusDot status={t.status} /><span className="capitalize text-slate-700">{t.status}</span></span>
                        </td>
                        <td className="py-2 text-slate-500">{t.deadline ? new Date(t.deadline).toLocaleDateString() : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Section>
          ) : null}
        </>
      )}
    </div>
  );
}

const Row = ({ k, v }: { k: string; v: any }) => (
  <div className="flex items-center justify-between">
    <span className="text-slate-500 font-medium">{k}</span>
    <span className="font-black text-slate-900">{typeof v === 'number' ? formatNumber(v) : v ?? '—'}</span>
  </div>
);

// ---------------------------------------------------------------------------
// HR & Marketing Monitor
// ---------------------------------------------------------------------------

export function HRMarketingMonitor() {
  const { data, isLoading, isFetching, refetch } = useMonitor<any>('hr', 'hr');
  const [q, setQ] = useState('');

  const employees = useMemo(() => {
    const list = data?.employees || [];
    if (!q) return list;
    const ql = q.toLowerCase();
    return list.filter(
      (e: any) =>
        e.name?.toLowerCase().includes(ql) ||
        e.role?.toLowerCase().includes(ql) ||
        e.email?.toLowerCase().includes(ql) ||
        e.department?.name?.toLowerCase().includes(ql)
    );
  }, [data, q]);

  return (
    <div className="p-2 space-y-6">
      <MonitorHeader
        title="HR & Marketing — Live Monitor"
        subtitle="Workforce telemetry and institutional survey signals."
        generatedAt={data?.generatedAt}
        isFetching={isFetching}
        refetch={refetch}
      />

      {isLoading && !data ? (
        <div className="p-10 text-center text-sm text-slate-400">Loading HR panel…</div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <MetricCard label="Employees" value={data?.counts.employees ?? 0} icon={Users} tone="rose" />
            <MetricCard label="Open Vacancies" value={data?.counts.openVacancies ?? 0} icon={Briefcase} tone="blue" />
            <MetricCard label="Pending Leaves" value={data?.counts.pendingLeaves ?? 0} icon={CheckSquare} tone="amber" />
            <MetricCard label="Active Tasks" value={data?.counts.activeTasks ?? 0} icon={Activity} tone="indigo" />
            <MetricCard label="Overdue Tasks" value={data?.counts.overdueTasks ?? 0} icon={AlertTriangle} tone="rose" />
            <MetricCard label="HR Admins" value={data?.counts.hrAdmins ?? 0} icon={ShieldCheck} tone="emerald" />
          </div>

          <Section
            title="Workforce Registry"
            description={`Active employees across all departments (${formatNumber(employees.length)} shown).`}
            action={<div className="w-64"><SearchBar value={q} onChange={setQ} placeholder="Search name, role, dept…" /></div>}
          >
            <div className="overflow-x-auto max-h-[480px]">
              <table className="w-full text-sm">
                <thead className="text-[10px] uppercase tracking-widest text-slate-400 sticky top-0 bg-white">
                  <tr>
                    <th className="text-left py-2">Name</th>
                    <th className="text-left py-2">Role</th>
                    <th className="text-left py-2">Department</th>
                    <th className="text-left py-2">Sub-Dept</th>
                    <th className="text-left py-2">Email</th>
                    <th className="text-left py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.length === 0 ? (
                    <tr><td colSpan={6}><EmptyRow label="No employees match" /></td></tr>
                  ) : employees.slice(0, 200).map((u: any) => (
                    <tr key={u.uid} className="border-t border-slate-100">
                      <td className="py-2 font-semibold text-slate-800">{u.name}</td>
                      <td className="py-2 text-slate-600">{u.role}</td>
                      <td className="py-2 text-slate-600">{u.department?.name || '—'}</td>
                      <td className="py-2 text-slate-600">{u.subDepartment || '—'}</td>
                      <td className="py-2 text-slate-500">{u.email}</td>
                      <td className="py-2"><span className="flex items-center gap-2"><StatusDot status={u.status} /><span className="capitalize text-slate-700">{u.status}</span></span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Section title="Open Vacancies" description="Live hiring pipeline">
              <div className="space-y-2">
                {data?.vacancies?.length === 0 && <EmptyRow label="No open vacancies" />}
                {data?.vacancies?.map((v: any) => (
                  <div key={v.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50">
                    <div>
                      <div className="font-semibold text-slate-800 text-sm">{v.title}</div>
                      <div className="text-xs text-slate-500">{v.department?.name || '—'} · {v.subDepartment || 'General'}</div>
                    </div>
                    <div className="text-xs font-black text-slate-700">
                      {v.filledCount ?? 0}/{v.count}
                    </div>
                  </div>
                ))}
              </div>
            </Section>

            <Section title="Pending Leaves" description="Awaiting approval">
              <div className="space-y-2 max-h-[360px] overflow-y-auto">
                {data?.pendingLeaves?.length === 0 && <EmptyRow label="No pending leaves" />}
                {data?.pendingLeaves?.map((l: any) => (
                  <div key={l.id} className="p-3 rounded-xl bg-slate-50">
                    <div className="flex items-center justify-between">
                      <div className="font-semibold text-slate-800 text-sm">{l.employee?.name || l.employeeId}</div>
                      <span className="text-xs font-black text-amber-600 uppercase">{l.status}</span>
                    </div>
                    <div className="text-xs text-slate-500 mt-1">{l.type} · {l.fromDate} → {l.toDate}</div>
                  </div>
                ))}
              </div>
            </Section>
          </div>

          <Section title="Overdue Tasks" description="Escalation candidates">
            <div className="overflow-x-auto max-h-[360px]">
              <table className="w-full text-sm">
                <thead className="text-[10px] uppercase tracking-widest text-slate-400">
                  <tr>
                    <th className="text-left py-2">Title</th>
                    <th className="text-left py-2">Assignee</th>
                    <th className="text-left py-2">Assigner</th>
                    <th className="text-left py-2">Priority</th>
                    <th className="text-left py-2">Deadline</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.overdueTasks?.length === 0 && <tr><td colSpan={5}><EmptyRow label="No overdue tasks" /></td></tr>}
                  {data?.overdueTasks?.map((t: any) => (
                    <tr key={t.id} className="border-t border-slate-100">
                      <td className="py-2 font-semibold text-slate-800">{t.title}</td>
                      <td className="py-2 text-slate-600">{t.assignee?.name || '—'}</td>
                      <td className="py-2 text-slate-600">{t.assigner?.name || '—'}</td>
                      <td className="py-2 uppercase text-xs font-black text-rose-600">{t.priority}</td>
                      <td className="py-2 text-slate-500">{new Date(t.deadline).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Finance & Accounting Monitor
// ---------------------------------------------------------------------------

export function FinanceAccountingMonitor() {
  const { data, isLoading, isFetching, refetch } = useMonitor<any>('finance', 'finance');

  return (
    <div className="p-2 space-y-6">
      <MonitorHeader
        title="Finance & Accounting — Live Monitor"
        subtitle="Revenue pipeline, account verification and institutional audit trails."
        generatedAt={data?.generatedAt}
        isFetching={isFetching}
        refetch={refetch}
      />

      {isLoading && !data ? (
        <div className="p-10 text-center text-sm text-slate-400">Loading Finance panel…</div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <MetricCard label="Invoices Issued" value={data?.counts.invoicesIssued ?? 0} icon={DollarSign} tone="indigo" />
            <MetricCard label="Invoices Paid" value={data?.counts.invoicesPaid ?? 0} icon={DollarSign} tone="emerald" />
            <MetricCard label="Paid Total (₹)" value={formatNumber(data?.counts.paidInvoiceTotal ?? 0)} icon={TrendingUp} tone="emerald" />
            <MetricCard label="Verified Payments" value={data?.counts.verifiedPayments ?? 0} icon={CheckSquare} tone="blue" />
            <MetricCard label="Re-Reg Pending" value={data?.counts.reregPending ?? 0} icon={RefreshCw} tone="amber" />
            <MetricCard label="Credential Requests" value={data?.counts.credentialRequests ?? 0} icon={ShieldCheck} tone="rose" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Section title="Recent Invoices" description="Most recent 200 records">
              <div className="overflow-x-auto max-h-[400px]">
                <table className="w-full text-sm">
                  <thead className="text-[10px] uppercase tracking-widest text-slate-400 sticky top-0 bg-white">
                    <tr>
                      <th className="text-left py-2">Invoice #</th>
                      <th className="text-left py-2">Student</th>
                      <th className="text-left py-2">Total</th>
                      <th className="text-left py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data?.invoices?.length === 0 && <tr><td colSpan={4}><EmptyRow label="No invoices" /></td></tr>}
                    {data?.invoices?.map((i: any) => (
                      <tr key={i.id} className="border-t border-slate-100">
                        <td className="py-2 font-semibold text-slate-800">{i.invoiceNo}</td>
                        <td className="py-2 text-slate-600">#{i.studentId}</td>
                        <td className="py-2 text-slate-700">₹ {formatNumber(i.total)}</td>
                        <td className="py-2"><span className="flex items-center gap-2"><StatusDot status={i.status} /><span className="capitalize text-slate-700">{i.status}</span></span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Section>

            <Section title="Recent Payments">
              <div className="overflow-x-auto max-h-[400px]">
                <table className="w-full text-sm">
                  <thead className="text-[10px] uppercase tracking-widest text-slate-400 sticky top-0 bg-white">
                    <tr>
                      <th className="text-left py-2">Date</th>
                      <th className="text-left py-2">Student</th>
                      <th className="text-left py-2">Amount</th>
                      <th className="text-left py-2">Mode</th>
                      <th className="text-left py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data?.payments?.length === 0 && <tr><td colSpan={5}><EmptyRow label="No payments" /></td></tr>}
                    {data?.payments?.map((p: any) => (
                      <tr key={p.id} className="border-t border-slate-100">
                        <td className="py-2 text-slate-500">{p.date ? new Date(p.date).toLocaleDateString() : '—'}</td>
                        <td className="py-2 text-slate-600">#{p.studentId}</td>
                        <td className="py-2 text-slate-800 font-semibold">₹ {formatNumber(p.amount)}</td>
                        <td className="py-2 text-slate-600">{p.mode}</td>
                        <td className="py-2"><span className="flex items-center gap-2"><StatusDot status={p.status} /><span className="capitalize text-slate-700">{p.status}</span></span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Section>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Section title="Re-Registration Pending">
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {data?.reregPending?.length === 0 && <EmptyRow label="No pending re-registrations" />}
                {data?.reregPending?.map((r: any) => (
                  <div key={r.id} className="p-3 rounded-xl bg-slate-50">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-semibold text-slate-800">Student #{r.studentId} · Sem {r.targetSemester}</div>
                      <div className="text-xs font-black text-slate-700">₹ {formatNumber(r.amountPaid)}</div>
                    </div>
                    <div className="text-xs text-slate-500">Cycle {r.cycle}</div>
                  </div>
                ))}
              </div>
            </Section>

            <Section title="Credential Requests">
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {data?.credentialRequests?.length === 0 && <EmptyRow label="No pending credential requests" />}
                {data?.credentialRequests?.map((r: any) => (
                  <div key={r.id} className="p-3 rounded-xl bg-slate-50">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-semibold text-slate-800">{r.center?.name || `Center #${r.centerId}`}</div>
                      <span className="text-xs font-black text-amber-600 uppercase">{r.type}</span>
                    </div>
                    <div className="text-xs text-slate-500">Requested by {r.requester?.name || r.requesterId}</div>
                  </div>
                ))}
              </div>
            </Section>
          </div>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sales Intelligence Monitor
// ---------------------------------------------------------------------------

export function SalesIntelligenceMonitor() {
  const { data, isLoading, isFetching, refetch } = useMonitor<any>('sales', 'sales');

  return (
    <div className="p-2 space-y-6">
      <MonitorHeader
        title="Sales Intelligence — Live Monitor"
        subtitle="Performance analytics for leads, deals and institutional referral growth."
        generatedAt={data?.generatedAt}
        isFetching={isFetching}
        refetch={refetch}
      />

      {isLoading && !data ? (
        <div className="p-10 text-center text-sm text-slate-400">Loading Sales panel…</div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <MetricCard label="Total Leads" value={data?.counts.totalLeads ?? 0} icon={TrendingUp} tone="indigo" />
            <MetricCard label="Active Leads" value={data?.counts.activeLeads ?? 0} icon={Activity} tone="blue" />
            <MetricCard label="Converted" value={data?.counts.convertedLeads ?? 0} icon={CheckSquare} tone="emerald" />
            <MetricCard label="Open Deals" value={data?.counts.openDeals ?? 0} icon={Briefcase} tone="amber" />
            <MetricCard label="Signed Deals" value={data?.counts.signedDeals ?? 0} icon={ShieldCheck} tone="emerald" />
            <MetricCard label="Referred Centers" value={data?.counts.referredCenters ?? 0} icon={Network} tone="violet" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Section title="Leads Pipeline" description="Full lead status distribution">
              <div className="space-y-2">
                {Object.entries(data?.leadsByStatus || {}).length === 0 && <EmptyRow label="No leads" />}
                {Object.entries(data?.leadsByStatus || {}).map(([status, count]: any) => (
                  <div key={status} className="flex items-center justify-between p-3 rounded-xl bg-slate-50">
                    <div className="flex items-center gap-2">
                      <StatusDot status={status} />
                      <span className="text-sm font-semibold text-slate-800">{status}</span>
                    </div>
                    <span className="text-sm font-black text-slate-900">{formatNumber(count)}</span>
                  </div>
                ))}
              </div>
            </Section>

            <Section title="Recent Deals">
              <div className="space-y-2 max-h-[360px] overflow-y-auto">
                {data?.deals?.length === 0 && <EmptyRow label="No deals" />}
                {data?.deals?.slice(0, 30).map((d: any) => (
                  <div key={d.id} className="p-3 rounded-xl bg-slate-50">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-slate-800">{d.title}</span>
                      <span className="text-xs font-black text-slate-700">₹ {formatNumber(d.value)}</span>
                    </div>
                    <div className="text-xs text-slate-500 flex items-center gap-2 mt-1">
                      <StatusDot status={d.status} />
                      <span className="capitalize">{d.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          </div>

          <Section title="Recent Leads" description="Most recent 300 records">
            <div className="overflow-x-auto max-h-[400px]">
              <table className="w-full text-sm">
                <thead className="text-[10px] uppercase tracking-widest text-slate-400 sticky top-0 bg-white">
                  <tr>
                    <th className="text-left py-2">Name</th>
                    <th className="text-left py-2">Status</th>
                    <th className="text-left py-2">Source</th>
                    <th className="text-left py-2">Assignee</th>
                    <th className="text-left py-2">Expected</th>
                    <th className="text-left py-2">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.leads?.length === 0 && <tr><td colSpan={6}><EmptyRow label="No leads" /></td></tr>}
                  {data?.leads?.map((l: any) => (
                    <tr key={l.id} className="border-t border-slate-100">
                      <td className="py-2 font-semibold text-slate-800">{l.name}</td>
                      <td className="py-2"><span className="flex items-center gap-2"><StatusDot status={l.status} /><span className="text-slate-700">{l.status}</span></span></td>
                      <td className="py-2 text-slate-600">{l.source || '—'}</td>
                      <td className="py-2 text-slate-600">{l.assignee?.name || '—'}</td>
                      <td className="py-2 text-slate-700">{l.expectedValue ? `₹ ${formatNumber(l.expectedValue)}` : '—'}</td>
                      <td className="py-2 text-slate-500">{l.createdAt ? new Date(l.createdAt).toLocaleDateString() : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Academic & Enrollment Monitor
// ---------------------------------------------------------------------------

export function AcademicEnrollmentMonitor() {
  const { data, isLoading, isFetching, refetch } = useMonitor<any>('academic', 'academic');

  return (
    <div className="p-2 space-y-6">
      <MonitorHeader
        title="Academic & Enrollment — Live Monitor"
        subtitle="Unified lifecycle tracking for universities, programs, centers and student enrollment."
        generatedAt={data?.generatedAt}
        isFetching={isFetching}
        refetch={refetch}
      />

      {isLoading && !data ? (
        <div className="p-10 text-center text-sm text-slate-400">Loading Academic panel…</div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <MetricCard label="Universities" value={data?.counts.universities ?? 0} icon={BookOpen} tone="blue" />
            <MetricCard label="Programs" value={data?.counts.programs ?? 0} icon={Activity} tone="indigo" />
            <MetricCard label="Centers" value={data?.counts.centers ?? 0} icon={Network} tone="amber" />
            <MetricCard label="Students Enrolled" value={data?.counts.studentsEnrolled ?? 0} icon={Users} tone="emerald" />
            <MetricCard label="Students Pending" value={data?.counts.studentsPendingReview ?? 0} icon={CheckSquare} tone="amber" />
            <MetricCard label="Accred. Pending" value={data?.counts.accreditationsPending ?? 0} icon={ShieldCheck} tone="rose" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Section title="Students by Status" description="Real-time enrollment funnel">
              <div className="space-y-2">
                {Object.entries(data?.studentsByStatus || {}).map(([status, count]: any) => (
                  <div key={status} className="flex items-center justify-between p-3 rounded-xl bg-slate-50">
                    <div className="flex items-center gap-2">
                      <StatusDot status={status} />
                      <span className="text-sm font-semibold text-slate-800">{status}</span>
                    </div>
                    <span className="text-sm font-black text-slate-900">{formatNumber(count)}</span>
                  </div>
                ))}
                {Object.keys(data?.studentsByStatus || {}).length === 0 && <EmptyRow label="No students yet" />}
              </div>
            </Section>

            <Section title="Centers by Audit Status">
              <div className="space-y-2">
                {Object.entries(data?.centersByAudit || {}).map(([status, count]: any) => (
                  <div key={status} className="flex items-center justify-between p-3 rounded-xl bg-slate-50">
                    <div className="flex items-center gap-2">
                      <StatusDot status={status} />
                      <span className="text-sm font-semibold text-slate-800">{status}</span>
                    </div>
                    <span className="text-sm font-black text-slate-900">{formatNumber(count)}</span>
                  </div>
                ))}
                {Object.keys(data?.centersByAudit || {}).length === 0 && <EmptyRow label="No centers" />}
              </div>
            </Section>
          </div>

          <Section title="Programs" description={`${formatNumber(data?.programs?.length || 0)} programs across sub-departments`}>
            <div className="overflow-x-auto max-h-[400px]">
              <table className="w-full text-sm">
                <thead className="text-[10px] uppercase tracking-widest text-slate-400 sticky top-0 bg-white">
                  <tr>
                    <th className="text-left py-2">Name</th>
                    <th className="text-left py-2">Type</th>
                    <th className="text-left py-2">Status</th>
                    <th className="text-left py-2">University</th>
                    <th className="text-left py-2">Duration</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.programs?.length === 0 && <tr><td colSpan={5}><EmptyRow label="No programs" /></td></tr>}
                  {data?.programs?.map((p: any) => (
                    <tr key={p.id} className="border-t border-slate-100">
                      <td className="py-2 font-semibold text-slate-800">{p.name}</td>
                      <td className="py-2 text-slate-600">{p.type}</td>
                      <td className="py-2"><span className="flex items-center gap-2"><StatusDot status={p.status} /><span className="capitalize text-slate-700">{p.status}</span></span></td>
                      <td className="py-2 text-slate-600">{p.university?.name || '—'}</td>
                      <td className="py-2 text-slate-500">{p.duration}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// CEO Monitor
// ---------------------------------------------------------------------------

export function CEOMonitor() {
  const { data, isLoading, isFetching, refetch } = useMonitor<any>('ceo', 'ceo');

  return (
    <div className="p-2 space-y-6">
      <MonitorHeader
        title="CEO Panels — Live Monitor"
        subtitle="Every provisioned CEO, their scope, and governance activity."
        generatedAt={data?.generatedAt}
        isFetching={isFetching}
        refetch={refetch}
      />

      {isLoading && !data ? (
        <div className="p-10 text-center text-sm text-slate-400">Loading CEO panel…</div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard label="Total CEO Panels" value={data?.panelCount ?? 0} icon={ShieldCheck} tone="violet" />
            <MetricCard label="Active" value={data?.activePanels ?? 0} icon={Activity} tone="emerald" />
            <MetricCard label="Tasks Issued by CEOs" value={data?.tasksFromCEOs?.length ?? 0} icon={CheckSquare} tone="indigo" />
            <MetricCard label="Payout Approvals (30d)" value={data?.payoutApprovals30d ?? 0} icon={DollarSign} tone="amber" />
          </div>

          <Section title="CEO Instances" description="Non-singleton: multiple CEOs permitted">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {data?.panels?.length === 0 && <EmptyRow label="No CEO panels provisioned" />}
              {data?.panels?.map((p: any) => (
                <div key={p.id} className="p-5 rounded-2xl border border-slate-200 bg-white">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-black text-slate-900">{p.name}</h4>
                    <span className="flex items-center gap-2 text-xs"><StatusDot status={p.status} /><span className="capitalize">{p.status}</span></span>
                  </div>
                  <div className="text-xs text-slate-500 mb-3">
                    <div>CEO: {p.assignedCEO?.name || '—'} ({p.assignedCEO?.email || '—'})</div>
                    <div>Provisioned {p.createdAt ? new Date(p.createdAt).toLocaleDateString() : '—'}</div>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {p.scope.length === 0 && <span className="text-xs text-slate-400 font-medium">No scope configured</span>}
                    {p.scope.map((s: any, i: number) => (
                      <span key={i} className="text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-full bg-slate-100 text-slate-700">
                        {typeof s === 'string' ? s : s?.name || JSON.stringify(s)}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Section>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Section title="Tasks Issued by CEOs" description="Directive chain (CEO → dept)">
              <div className="overflow-x-auto max-h-[400px]">
                <table className="w-full text-sm">
                  <thead className="text-[10px] uppercase tracking-widest text-slate-400 sticky top-0 bg-white">
                    <tr>
                      <th className="text-left py-2">Title</th>
                      <th className="text-left py-2">Assignee</th>
                      <th className="text-left py-2">Role</th>
                      <th className="text-left py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data?.tasksFromCEOs?.length === 0 && <tr><td colSpan={4}><EmptyRow label="No CEO tasks" /></td></tr>}
                    {data?.tasksFromCEOs?.map((t: any) => (
                      <tr key={t.id} className="border-t border-slate-100">
                        <td className="py-2 font-semibold text-slate-800">{t.title}</td>
                        <td className="py-2 text-slate-600">{t.assignee?.name || '—'}</td>
                        <td className="py-2 text-slate-600">{t.assignee?.role || '—'}</td>
                        <td className="py-2"><span className="flex items-center gap-2"><StatusDot status={t.status} /><span className="capitalize text-slate-700">{t.status}</span></span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Section>

            <Section title="Institutional Directives" description="Announcements authored by CEOs">
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {data?.directives?.length === 0 && <EmptyRow label="No active directives" />}
                {data?.directives?.map((d: any) => (
                  <div key={d.id} className="p-3 rounded-xl bg-slate-50">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-slate-800">{d.title}</span>
                      <span className="text-[10px] font-black uppercase text-slate-500">{d.priority}</span>
                    </div>
                    <div className="text-xs text-slate-500 mt-1">{d.targetChannel}</div>
                  </div>
                ))}
              </div>
            </Section>
          </div>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-Department Monitor
// ---------------------------------------------------------------------------

export function SubDeptMonitor() {
  const { data, isLoading, isFetching, refetch } = useMonitor<any>('subdepts', 'subdepts');

  return (
    <div className="p-2 space-y-6">
      <MonitorHeader
        title="Sub-Departments — Live Monitor"
        subtitle="BVoc / Online / Skill / Open School — unit-level telemetry."
        generatedAt={data?.generatedAt}
        isFetching={isFetching}
        refetch={refetch}
      />

      {isLoading && !data ? (
        <div className="p-10 text-center text-sm text-slate-400">Loading sub-departments…</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {data?.units?.length === 0 && <EmptyRow label="No sub-departments configured" />}
          {data?.units?.map((u: any) => (
            <Section key={u.id} title={u.name} description={`Parent: ${u.parent?.name || '—'}`}>
              <div className="flex items-center gap-2 mb-4">
                <StatusDot status={u.status} />
                <span className="capitalize text-sm text-slate-700">{u.status}</span>
              </div>

              <div className="mb-4 p-3 rounded-xl bg-slate-50">
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Unit Admin</div>
                <div className="text-sm font-semibold text-slate-900">{u.admin?.name || 'Vacant'}</div>
                {u.admin && <div className="text-xs text-slate-500">{u.admin.email} · {u.admin.role}</div>}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Tile label="Programs" v={u.counts.programs} icon={BookOpen} />
                <Tile label="Students" v={u.counts.students} icon={Users} />
                <Tile label="Employees" v={u.counts.employees} icon={Briefcase} />
                <Tile label="Active Tasks" v={u.counts.tasks} icon={CheckSquare} />
              </div>
            </Section>
          ))}
        </div>
      )}
    </div>
  );
}

const Tile = ({ label, v, icon: Icon }: { label: string; v: number; icon: any }) => (
  <div className="p-3 rounded-xl border border-slate-200 bg-white">
    <div className="flex items-center justify-between mb-1">
      <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{label}</span>
      <Icon className="w-3.5 h-3.5 text-slate-400" />
    </div>
    <div className="text-xl font-black text-slate-900">{formatNumber(v)}</div>
  </div>
);

// ---------------------------------------------------------------------------
// Admin Assignments
// ---------------------------------------------------------------------------

export function AdminAssignmentsMonitor() {
  const { data, isLoading, isFetching, refetch } = useMonitor<any>('admin-assignments', 'admin-assignments');

  return (
    <div className="p-2 space-y-6">
      <MonitorHeader
        title="Admin Assignments — Live Monitor"
        subtitle="Who heads what — Org Admins, Dept Admins, Sub-Dept Admins, CEOs."
        generatedAt={data?.generatedAt}
        isFetching={isFetching}
        refetch={refetch}
      />

      {isLoading && !data ? (
        <div className="p-10 text-center text-sm text-slate-400">Loading assignments…</div>
      ) : (
        <>
          <Section title="Organization Admins" description="Singleton enforced — one active holder">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {data?.orgAdmins?.length === 0 && <EmptyRow label="No Org Admin assigned" />}
              {data?.orgAdmins?.map((u: any) => (
                <div key={u.uid} className="p-3 rounded-xl bg-slate-50 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">{u.name}</div>
                    <div className="text-xs text-slate-500">{u.email}</div>
                  </div>
                  <span className="flex items-center gap-1 text-xs"><StatusDot status={u.status} />{u.status}</span>
                </div>
              ))}
            </div>
          </Section>

          <Section title="Core Departments — Heads">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {data?.coreDepartments?.map((d: any) => (
                <div key={d.id} className="p-4 rounded-xl border border-slate-200 bg-white">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-black text-slate-900 text-sm">{d.name}</h4>
                    <span className="flex items-center gap-1 text-xs"><StatusDot status={d.status} />{d.status}</span>
                  </div>
                  {d.admin ? (
                    <>
                      <div className="text-sm font-semibold text-slate-800">{d.admin.name}</div>
                      <div className="text-xs text-slate-500">{d.admin.email} · {d.admin.role}</div>
                    </>
                  ) : (
                    <div className="text-xs text-amber-600 font-bold uppercase">Vacant — action required</div>
                  )}
                </div>
              ))}
            </div>
          </Section>

          <Section title="Sub-Departments — Unit Admins">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {data?.subDepartments?.map((d: any) => (
                <div key={d.id} className="p-4 rounded-xl border border-slate-200 bg-white">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-black text-slate-900 text-sm">{d.name}</h4>
                    <span className="text-[10px] font-black uppercase text-slate-500">{d.parent?.name}</span>
                  </div>
                  {d.admin ? (
                    <>
                      <div className="text-sm font-semibold text-slate-800">{d.admin.name}</div>
                      <div className="text-xs text-slate-500">{d.admin.email} · {d.admin.role}</div>
                    </>
                  ) : (
                    <div className="text-xs text-amber-600 font-bold uppercase">Vacant</div>
                  )}
                </div>
              ))}
            </div>
          </Section>

          <Section title="CEO Panels" description="Non-singleton — multiple CEOs permitted">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {data?.ceoPanels?.length === 0 && <EmptyRow label="No CEO panels provisioned" />}
              {data?.ceoPanels?.map((p: any) => (
                <div key={p.id} className="p-4 rounded-xl border border-slate-200 bg-white">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-black text-slate-900 text-sm">{p.name}</h4>
                    <span className="flex items-center gap-1 text-xs"><StatusDot status={p.status} />{p.status}</span>
                  </div>
                  {p.assignedCEO ? (
                    <>
                      <div className="text-sm font-semibold text-slate-800">{p.assignedCEO.name}</div>
                      <div className="text-xs text-slate-500">{p.assignedCEO.email}</div>
                    </>
                  ) : (
                    <div className="text-xs text-amber-600 font-bold uppercase">No CEO user linked</div>
                  )}
                  <div className="mt-2 flex flex-wrap gap-1">
                    {p.scope.length === 0 && <span className="text-[10px] text-slate-400">No scope</span>}
                    {p.scope.map((s: any, i: number) => (
                      <span key={i} className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                        {typeof s === 'string' ? s : s?.name || JSON.stringify(s)}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Section>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Teams
// ---------------------------------------------------------------------------

export function TeamsMonitor() {
  const { data, isLoading, isFetching, refetch } = useMonitor<any>('teams', 'teams');
  const [q, setQ] = useState('');

  return (
    <div className="p-2 space-y-6">
      <MonitorHeader
        title="Teams — Live Monitor"
        subtitle="Every department and sub-department roster."
        generatedAt={data?.generatedAt}
        isFetching={isFetching}
        refetch={refetch}
      />

      {isLoading && !data ? (
        <div className="p-10 text-center text-sm text-slate-400">Loading teams…</div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <MetricCard label="Active Workforce" value={data?.totalActiveWorkforce ?? 0} icon={Users} tone="rose" />
            <MetricCard label="Core Departments" value={data?.departments?.length ?? 0} icon={Briefcase} tone="indigo" />
            <MetricCard label="Sub-Departments" value={data?.subDepartments?.length ?? 0} icon={Network} tone="amber" />
          </div>

          <div className="w-96"><SearchBar value={q} onChange={setQ} placeholder="Filter member by name or role…" /></div>

          {[...(data?.departments || []), ...(data?.subDepartments || [])].map((team: any) => {
            const filtered = team.members.filter(
              (m: any) => !q || m.name?.toLowerCase().includes(q.toLowerCase()) || m.role?.toLowerCase().includes(q.toLowerCase())
            );
            return (
              <Section
                key={`${team.id}-${team.name}`}
                title={team.name}
                description={`${formatNumber(filtered.length)}${q ? ` / ${formatNumber(team.members.length)}` : ''} members`}
              >
                <div className="overflow-x-auto max-h-[260px]">
                  <table className="w-full text-sm">
                    <thead className="text-[10px] uppercase tracking-widest text-slate-400 sticky top-0 bg-white">
                      <tr>
                        <th className="text-left py-2">Name</th>
                        <th className="text-left py-2">Role</th>
                        <th className="text-left py-2">Email</th>
                        <th className="text-left py-2">Sub-Dept</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.length === 0 && <tr><td colSpan={4}><EmptyRow label="No matching members" /></td></tr>}
                      {filtered.map((m: any) => (
                        <tr key={m.uid} className="border-t border-slate-100">
                          <td className="py-2 font-semibold text-slate-800">{m.name}</td>
                          <td className="py-2 text-slate-600">{m.role}</td>
                          <td className="py-2 text-slate-500">{m.email}</td>
                          <td className="py-2 text-slate-500">{m.subDepartment || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Section>
            );
          })}
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Directives & Surveys
// ---------------------------------------------------------------------------

export function DirectivesMonitor() {
  const { data, isLoading, isFetching, refetch } = useMonitor<any>('directives', 'directives');

  return (
    <div className="p-2 space-y-6">
      <MonitorHeader
        title="Directives & Surveys — Live Monitor"
        subtitle="All institutional communications and feedback cycles."
        generatedAt={data?.generatedAt}
        isFetching={isFetching}
        refetch={refetch}
      />

      {isLoading && !data ? (
        <div className="p-10 text-center text-sm text-slate-400">Loading directives…</div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <MetricCard label="Total Directives" value={data?.counts.totalDirectives ?? 0} icon={Megaphone} tone="rose" />
            <MetricCard label="Active Directives" value={data?.counts.activeDirectives ?? 0} icon={Activity} tone="emerald" />
            <MetricCard label="Total Surveys" value={data?.counts.totalSurveys ?? 0} icon={PieChart} tone="indigo" />
            <MetricCard label="Active Surveys" value={data?.counts.activeSurveys ?? 0} icon={CheckSquare} tone="blue" />
            <MetricCard label="Survey Responses" value={data?.counts.surveyResponses ?? 0} icon={Users} tone="amber" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Section title="Directives" description="Announcements, priority and author">
              <div className="space-y-2 max-h-[460px] overflow-y-auto">
                {data?.directives?.length === 0 && <EmptyRow label="No directives" />}
                {data?.directives?.map((d: any) => (
                  <div key={d.id} className="p-3 rounded-xl bg-slate-50">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-slate-800">{d.title}</span>
                      <span className="text-[10px] font-black uppercase text-slate-500">{d.priority}</span>
                    </div>
                    <div className="text-xs text-slate-500 mt-1">By {d.author?.name || d.authorId} · {d.targetChannel}</div>
                  </div>
                ))}
              </div>
            </Section>

            <Section title="Surveys">
              <div className="space-y-2 max-h-[460px] overflow-y-auto">
                {data?.surveys?.length === 0 && <EmptyRow label="No surveys" />}
                {data?.surveys?.map((s: any) => (
                  <div key={s.id} className="p-3 rounded-xl bg-slate-50">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-slate-800">{s.title}</span>
                      <span className="flex items-center gap-2 text-xs"><StatusDot status={s.status} />{s.status}</span>
                    </div>
                    <div className="text-xs text-slate-500 mt-1">Target: {s.targetRole}</div>
                  </div>
                ))}
              </div>
            </Section>
          </div>
        </>
      )}
    </div>
  );
}
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Operations & Regional Monitor
// ---------------------------------------------------------------------------

export function OperationsMonitor() {
  const { data, isLoading, isFetching, refetch } = useMonitor<any>('operations', 'operations');

  return (
    <div className="p-2 space-y-6">
      <MonitorHeader
        title="Operations & Regional — Live Monitor"
        subtitle="Tracking sub-department units and regional center audit maturity."
        generatedAt={data?.generatedAt}
        isFetching={isFetching}
        refetch={refetch}
      />

      {isLoading && !data ? (
        <div className="p-10 text-center text-sm text-slate-400">Loading operations telemetry…</div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard label="Total Units" value={data?.counts.totalUnits ?? 0} icon={Network} tone="amber" />
            <MetricCard label="Regional Centers" value={data?.counts.totalCenters ?? 0} icon={Building2} tone="blue" />
            <MetricCard label="Across Programs" value={data?.counts.totalPrograms ?? 0} icon={Activity} tone="indigo" />
            <MetricCard label="Student Base" value={data?.counts.totalStudents ?? 0} icon={Users} tone="emerald" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Section title="Regional Audit Maturity" description="Center ratification progress by category">
              <div className="space-y-2">
                {Object.entries(data?.regionalAudits || {}).map(([status, count]: any) => (
                  <div key={status} className="flex items-center justify-between p-3 rounded-xl bg-slate-50">
                    <div className="flex items-center gap-2">
                      <StatusDot status={status} />
                      <span className="text-sm font-semibold text-slate-800 tracking-tight">{status}</span>
                    </div>
                    <span className="text-sm font-black text-slate-900">{formatNumber(count)}</span>
                  </div>
                ))}
              </div>
            </Section>

            <Section title="Unit Performance (Sub-Depts)">
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {data?.unitHealth?.map((u: any) => (
                  <div key={u.id} className="p-3 rounded-xl border border-slate-100 bg-white shadow-sm flex items-center justify-between">
                    <div>
                      <div className="text-sm font-black text-slate-900">{u.name}</div>
                      <div className="text-xs text-slate-500 font-medium">{formatNumber(u.studentCount)} students</div>
                    </div>
                    {u.isHighPerforming && (
                      <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-emerald-100 text-emerald-700">High Volume</span>
                    )}
                  </div>
                ))}
              </div>
            </Section>
          </div>

          <Section title="Institutional Center Registry (Operations View)" description="Audit status of individual centers">
            <div className="overflow-x-auto max-h-[500px]">
              <table className="w-full text-sm">
                <thead className="text-[10px] uppercase tracking-widest text-slate-400 sticky top-0 bg-white">
                  <tr>
                    <th className="text-left py-2">Center Name</th>
                    <th className="text-left py-2">Audit Status</th>
                    <th className="text-left py-2">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.centers?.map((c: any) => (
                    <tr key={c.id} className="border-t border-slate-50">
                      <td className="py-2 font-semibold text-slate-800">{c.name}</td>
                      <td className="py-2"><span className="flex items-center gap-2"><StatusDot status={c.auditStatus} /><span className="text-slate-700">{c.auditStatus || 'pending'}</span></span></td>
                      <td className="py-2 text-slate-500">{new Date(c.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Security Telemetry Monitor
// ---------------------------------------------------------------------------

export function SecurityMonitor() {
  const { data, isLoading, isFetching, refetch } = useMonitor<any>('security', 'security');

  return (
    <div className="p-2 space-y-6">
      <MonitorHeader
        title="Security Telemetry — Live Monitor"
        subtitle="Institutional audit trails, high-risk events and access density."
        generatedAt={data?.generatedAt}
        isFetching={isFetching}
        refetch={refetch}
      />

      {isLoading && !data ? (
        <div className="p-10 text-center text-sm text-slate-400">Loading security matrix…</div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard label="Audit Events (30d)" value={data?.counts.totalAudit30d ?? 0} icon={ShieldCheck} tone="slate" />
            <MetricCard label="High-Risk Signals" value={data?.counts.highRisk30d ?? 0} icon={AlertTriangle} tone="rose" />
            <MetricCard label="Logins (24h)" value={data?.counts.logins24h ?? 0} icon={Activity} tone="emerald" />
            <MetricCard label="Recent Activity" value={data?.counts.recentActivity ?? 0} icon={RefreshCw} tone="blue" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Section title="Critical Governance Logs" description="Payout edits, credential reveals and executive directives">
              <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                {data?.highRisklogs?.map((log: any) => (
                  <div key={log.id} className="p-3 rounded-xl border-l-4 border-rose-500 bg-rose-50/30">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-black uppercase tracking-widest text-rose-600">{log.module}</span>
                      <span className="text-[10px] text-slate-400">{new Date(log.timestamp).toLocaleString()}</span>
                    </div>
                    <div className="text-sm font-semibold text-slate-900">{log.action}</div>
                    <div className="text-xs text-slate-500 mt-1">Entity: {log.entity}</div>
                  </div>
                ))}
              </div>
            </Section>

            <Section title="Real-Time Audit Trail">
              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {data?.recentLogs?.map((log: any) => (
                  <div key={log.id} className="p-3 rounded-xl bg-slate-50 border border-slate-100 group">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-semibold text-slate-800">{log.action}</span>
                      <span className="text-[10px] text-slate-400 group-hover:text-slate-900 transition-colors">{new Date(log.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <div className="text-[10px] text-slate-500">By {log.user?.name || log.userId} ({log.user?.role || 'System'})</div>
                  </div>
                ))}
              </div>
            </Section>
          </div>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Global (All) Monitor — Master institutional Dashboard
// ---------------------------------------------------------------------------

export function GlobalAllMonitor() {
  const { data, isLoading, isFetching, refetch } = useMonitor<SummaryPayload>('summary', 'summary');

  return (
    <div className="p-6 lg:p-8 space-y-12">
      <MonitorHeader
        title="Global Master Monitor"
        subtitle="Aggregated institutional health matrix across every operational scope."
        generatedAt={data?.generatedAt}
        isFetching={isFetching}
        refetch={refetch}
      />

      {isLoading && !data ? (
        <div className="p-10 text-center text-sm text-slate-400 font-medium">Compiling institutional telemetry…</div>
      ) : (
        <div className="space-y-12">
           {/* Tier 1: System Pulse */}
           <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              <MetricCard label="Institution Size" value={data?.totalActiveWorkforce ?? data?.panels.hr.employeeCount ?? 0} icon={Users} tone="rose" />
              <MetricCard label="Student Base" value={data?.panels.academic.studentsEnrolled ?? 0} icon={BookOpen} tone="blue" />
              <MetricCard label="Revenue Verified" value={`₹ ${formatNumber(data?.panels.finance.verifiedPaymentsTotal ?? 0)}`} icon={DollarSign} tone="emerald" />
              <MetricCard label="Growth Points" value={data?.panels.sales.activeLeads ?? 0} icon={TrendingUp} tone="indigo" />
              <MetricCard label="SLA Exceptions" value={data?.panels.hr.overdueTasks ?? 0} icon={AlertTriangle} tone="amber" />
              <MetricCard label="Security Pulse" value={data?.panels.governance.criticalEvents24h ?? 0} icon={ShieldAlert} tone="rose" />
           </div>

           {/* Tier 2: The Seven Institutional Pillars */}
           <div className="space-y-10">
              <ScopeDashboardSection 
                title="Academic & Enrollment" 
                description="Live lifecycle tracking for universities, programs and student admissions."
                tone="blue"
                metrics={[
                  { label: 'Universities', value: data?.panels.academic.universitiesCount, icon: Building2 },
                  { label: 'Active Programs', value: data?.panels.academic.programsCount, icon: BookOpen },
                  { label: 'Study Centers', value: data?.panels.academic.centersCount, icon: MapPin },
                  { label: 'Students Enrolled', value: data?.panels.academic.studentsEnrolled, icon: Users },
                  { label: 'Pending Reviews', value: data?.panels.academic.studentsPendingReview, icon: Activity },
                ]}
              />

              <ScopeDashboardSection 
                title="Finance & Accounting" 
                description="Revenue pipeline, cash flow verification and institutional audit trails."
                tone="emerald"
                metrics={[
                  { label: 'Invoices Issued', value: data?.panels.finance.invoicesIssued, icon: FileText },
                  { label: 'Verified Inflow', value: `₹ ${formatNumber(data?.panels.finance.verifiedPaymentsTotal ?? 0)}`, icon: DollarSign },
                  { label: 'Invoices Paid', value: data?.panels.finance.invoicesPaid, icon: CheckCircle },
                  { label: 'Re-Reg Pending', value: data?.panels.finance.reregPending, icon: RefreshCw },
                  { label: 'Credential Requests', value: data?.panels.finance.credentialRequestsPending, icon: ShieldCheck },
                ]}
              />

              <ScopeDashboardSection 
                title="Operations & Regional" 
                description="Geographical expansion and center-level audit statuses."
                tone="cyan"
                metrics={[
                  { label: 'Total Centers', value: data?.panels.academic.centersCount, icon: MapPin },
                  { label: 'Centers Pending Audit', value: data?.panels.academic.centersPendingAudit, icon: AlertCircle },
                  { label: 'Region Growth', value: data?.panels.academic.centersCount ? Math.ceil(data.panels.academic.centersCount / 4) : 0, icon: TrendingUp },
                  { label: 'Ops Clearances', value: data?.panels.academic.studentsEnrolled ?? 0, icon: CheckSquare },
                ]}
              />

              <ScopeDashboardSection 
                title="HR & Marketing" 
                description="Workforce telemetry, vacancy fulfillment and internal signals."
                tone="rose"
                metrics={[
                  { label: 'Active Workforce', value: data?.panels.hr.employeeCount, icon: Users },
                  { label: 'Open Vacancies', value: data?.panels.hr.openVacancies, icon: Briefcase },
                  { label: 'Leaves Pending', value: data?.panels.hr.pendingLeaves, icon: Calendar },
                  { label: 'Active Admins', value: data?.panels.hr.activeAdmins, icon: ShieldCheck },
                  { label: 'Survey Signals', value: data?.panels.governance.activeSurveys, icon: Activity },
                ]}
              />

              <ScopeDashboardSection 
                title="Sales Intelligence" 
                description="Pipeline velocity, deal distribution and referral acquisition."
                tone="indigo"
                metrics={[
                  { label: 'Sales Pipeline', value: data?.panels.sales.activeLeads, icon: TrendingUp },
                  { label: 'Deals Finalized', value: data?.panels.sales.signedDeals, icon: CheckSquare },
                  { label: 'Open Negotiations', value: data?.panels.sales.openDeals, icon: Activity },
                  { label: 'Lead Conversion', value: data?.panels.sales.convertedLeads, icon: RefreshCw },
                ]}
              />

              <ScopeDashboardSection 
                title="Security Telemetry" 
                description="Audit logs, exception events and data access integrity."
                tone="slate"
                metrics={[
                  { label: 'Audit Events (24h)', value: data?.panels.governance.auditEvents24h, icon: List },
                  { label: 'Critical Exceptions', value: data?.panels.governance.criticalEvents24h, icon: AlertTriangle },
                  { label: 'Governance Directives', value: data?.panels.governance.activeDirectives, icon: ShieldAlert },
                  { label: 'CEO Compliance', value: data?.panels.hr.overdueTasks, icon: CheckCircle },
                ]}
              />

              <div className="bg-slate-900 rounded-[40px] p-8 text-white shadow-2xl relative overflow-hidden">
                <div className="absolute right-0 top-0 w-64 h-64 bg-blue-600/10 blur-[100px] rounded-full -mr-32 -mt-32" />
                <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
                  <div className="max-w-xl">
                    <div className="flex items-center gap-3 mb-4">
                       <div className="w-10 h-10 rounded-2xl bg-blue-500/20 flex items-center justify-center border border-blue-500/30">
                          <Globe className="text-blue-400 w-5 h-5" />
                       </div>
                       <h3 className="text-2xl font-black tracking-tight italic">Global Institutional Hub</h3>
                    </div>
                    <p className="text-slate-400 text-sm font-medium leading-relaxed">
                       Collective system integrity remains at <span className="text-blue-400 font-bold">98.4%</span>. 
                       Real-time cross-panel aggregation complete for all {data?.panels.ceo.panelCount || 0} provisioned instances. 
                       No critical database desynchronization detected in the current cycle.
                    </p>
                  </div>
                  <div className="w-full md:w-64 bg-slate-800/50 rounded-3xl p-6 border border-slate-700/50">
                    <div className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4">Operational Pulse</div>
                    <div className="space-y-4">
                       <div className="flex justify-between items-end">
                          <span className="text-xs text-slate-400 font-bold">System Health</span>
                          <span className="text-lg font-black text-blue-400">Optimal</span>
                       </div>
                       <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500 w-[94%] shadow-[0_0_12px_rgba(59,130,246,0.5)]" />
                       </div>
                    </div>
                  </div>
                </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}

const ScopeDashboardSection = ({ title, description, tone, metrics }: { title: string; description: string; tone: string; metrics: any[] }) => (
  <div className="animate-in fade-in slide-in-from-bottom-6 duration-1000">
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
      <div>
        <h3 className={`text-2xl font-black text-${tone}-600 tracking-tighter mb-1`}>{title}</h3>
        <p className="text-slate-500 text-sm font-medium">{description}</p>
      </div>
      <div className={`px-4 py-1.5 rounded-full bg-${tone}-50 border border-${tone}-100 flex items-center gap-2`}>
        <div className={`w-2 h-2 rounded-full bg-${tone}-500 animate-pulse`} />
        <span className={`text-[10px] font-black uppercase tracking-widest text-${tone}-700`}>Real-time Feed</span>
      </div>
    </div>
    
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
      {metrics.map((m, i) => (
        <div key={i} className="bg-white rounded-3xl border border-slate-100 p-5 shadow-sm hover:shadow-md transition-all duration-300 group">
          <div className="flex items-center justify-between mb-3">
             <div className={`w-9 h-9 rounded-2xl bg-${tone}-50 flex items-center justify-center group-hover:scale-110 transition-transform`}>
                <m.icon className={`w-4 h-4 text-${tone}-600`} />
             </div>
             <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active</div>
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight mb-1">
             {m.value ?? 0}
          </div>
          <div className="text-[11px] font-bold text-slate-500 leading-tight">
             {m.label}
          </div>
        </div>
      ))}
    </div>
  </div>
);

export function SingleCEOMonitor() {
  const { panelId } = useParams();
  const { data, isLoading, isError } = useMonitor<any>(`ceo-${panelId}`, `ceo/${panelId}`);

  if (isLoading) return <LoadingState message="Aggregating executive telemetry..." />;
  if (isError) return <ErrorState message="Critical failure: Unable to synchronize with CEO instance" />;

  const m = data?.metrics || {};
  const p = data?.panelInfo || {};

  return (
    <div className="p-8 pb-20 max-w-[1600px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-1000">
      <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-3">
             <div className="px-2.5 py-1 bg-blue-100 text-blue-700 text-[10px] font-black uppercase tracking-widest rounded-full">
                CEO Perspective
             </div>
             <StatusDot status="active" />
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter mb-2">
            {p.name}
          </h1>
          <p className="text-slate-500 font-medium max-w-2xl leading-relaxed">
            Live oversight of CEO <span className="text-slate-900 font-bold">{p.ceo}</span>. 
            Institutional scope covers: <span className="text-blue-600 font-bold">{p.scope?.join(', ') || 'Global'}</span>.
          </p>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        <MetricCard label="Scoped Students" value={m.totalStudents} icon={Users} tone="blue" />
        <MetricCard label="Fund Acquired" value={`₹${formatNumber(m.totalFundAcquired)}`} icon={DollarSign} tone="emerald" />
        <MetricCard label="Revenue MTD" value={`₹${formatNumber(m.revenueMTD)}`} icon={TrendingUp} tone="indigo" />
        <MetricCard label="Active Centers" value={m.activeCenters} icon={Building2} tone="cyan" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">
        <Section title="Escalation & Compliance" description="High-priority oversight items requiring executive alignment">
           <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                 <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="w-4 h-4 text-rose-500" />
                    <span className="text-[10px] font-black text-slate-500 uppercase">CEO Escalations</span>
                 </div>
                 <div className="text-2xl font-black text-slate-900">{m.overdueTasks}</div>
                 <div className="text-[10px] text-slate-400 font-medium">SLA breaches</div>
              </div>
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                 <div className="flex items-center gap-2 mb-2">
                    <ShieldAlert className="w-4 h-4 text-rose-500" />
                    <span className="text-[10px] font-black text-slate-500 uppercase">Audit Exceptions</span>
                 </div>
                 <div className="text-2xl font-black text-slate-900">{m.auditExceptions}</div>
                 <div className="text-[10px] text-slate-400 font-medium">Last 24 hours</div>
              </div>
           </div>
        </Section>

        <Section title="Operational Pulse" description="Workflow health across the assigned institutional scope">
           <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                 <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600">
                       <CheckSquare className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-bold text-slate-700">Pending Leaves</span>
                 </div>
                 <span className="text-sm font-black">{m.pendingLeaves}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                 <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">
                       <RefreshCw className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-bold text-slate-700">Reveal Requests</span>
                 </div>
                 <span className="text-sm font-black">{m.revealRequests}</span>
              </div>
           </div>
        </Section>

        <Section title="Institutional Growth" description="Enrollment & University expansion tracking">
          <div className="grid grid-cols-2 gap-4">
             <div className="text-center p-4 bg-blue-50 rounded-2xl border border-blue-100">
                <div className="text-xs font-black text-blue-600 mb-1">{m.totalUniversities}</div>
                <div className="text-[10px] text-blue-400 uppercase tracking-widest font-black">Universities</div>
             </div>
             <div className="text-center p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
                <div className="text-xs font-black text-indigo-600 mb-1">{m.totalPrograms}</div>
                <div className="text-[10px] text-indigo-400 uppercase tracking-widest font-black">Programs</div>
             </div>
          </div>
        </Section>
      </div>

      <Section title="Executive Summary" description="Internal system commentary based on scoped telemetry">
        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-start gap-4">
           <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
              <Globe className="text-blue-600 w-5 h-5" />
           </div>
           <div>
              <p className="text-sm text-slate-600 font-medium leading-relaxed">
                 The {p.name} reflects stable operational integrity. Revenue MTD (₹{formatNumber(m.revenueMTD)}) shows sustained performance across {p.scope?.length || 0} scope pillars. 
                 CEO oversight remains critical for {m.overdueTasks} systemic escalations identified in this cycle.
              </p>
           </div>
        </div>
      </Section>
    </div>
  );
}

const LoadingState = ({ message }: { message: string }) => (
  <div className="p-20 flex flex-col items-center justify-center gap-6 animate-pulse">
    <div className="w-16 h-16 rounded-full border-4 border-slate-200 border-t-blue-600 animate-spin" />
    <span className="text-sm font-black text-slate-400 uppercase tracking-widest">{message}</span>
  </div>
);

const ErrorState = ({ message }: { message: string }) => (
  <div className="p-20 flex flex-col items-center justify-center gap-6">
    <div className="w-16 h-16 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-500">
       <AlertTriangle className="w-8 h-8" />
    </div>
    <span className="text-sm font-black text-rose-500 uppercase tracking-widest">{message}</span>
  </div>
);
