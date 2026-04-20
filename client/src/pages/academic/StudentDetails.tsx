import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import { ArrowLeft, BadgeIndianRupee, BookOpen, Building2, CalendarDays, CheckCircle2, Clock3, CreditCard, FileText, UserCircle2 } from 'lucide-react';

interface Payment {
  id: number;
  amount: string;
  mode: string;
  transactionId?: string;
  receiptUrl?: string;
  status: string;
  date?: string;
  createdAt?: string;
}

interface EMIInstallment {
  id: number;
  installmentNo: number;
  dueDate: string;
  amount: string;
  status: string;
  paidAt?: string;
  remarks?: string;
}

interface StudentDetail {
  id: number;
  name: string;
  email?: string;
  status: string;
  enrollStatus?: string;
  feeStatus?: string;
  reviewStage?: string;
  remarks?: string;
  lastRejectionReason?: string;
  paidAmount?: string;
  pendingAmount?: string;
  marks?: {
    lastExam?: string;
    lastExamScore?: string;
    marksProof?: string;
  };
  center?: { id: number; name: string };
  subDepartment?: { id: number; name: string };
  program?: {
    id: number;
    name: string;
    type?: string;
    duration?: number;
    university?: { id: number; name: string };
  };
  feeSchema?: {
    id: number;
    name: string;
    schema?: {
      type?: string;
      installments?: Array<{ label?: string; amount?: number | string }>;
    };
  };
  activationInvoice?: {
    id: number;
    invoiceNo: string;
    amount: string;
    gst: string;
    total: string;
    status: string;
    createdAt: string;
  };
  payments?: Payment[];
  emis?: EMIInstallment[];
}

const toAmount = (value: number | string | null | undefined) => Number(value || 0);

const formatAmount = (value: number) =>
  `₹${value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function StudentDetails() {
  const { id, unit } = useParams();
  const location = useLocation();
  const [student, setStudent] = useState<StudentDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStudent = async () => {
      try {
        const res = await api.get(`/academic/students/${id}`);
        setStudent(res.data);
      } catch {
        toast.error('Failed to load student details');
      } finally {
        setIsLoading(false);
      }
    };

    fetchStudent();
  }, [id]);

  const paymentSummary = useMemo(() => {
    const installments = student?.feeSchema?.schema?.installments || [];
    const emiRows = student?.emis || [];
    const payments = student?.payments || [];

    const plannedFromFeeSchema = installments.reduce((sum, item) => sum + toAmount(item.amount), 0);
    const plannedFromEmi = emiRows.reduce((sum, item) => sum + toAmount(item.amount), 0);
    const plannedFromInvoice = toAmount(student?.activationInvoice?.total);
    const plannedFromStudent = toAmount(student?.paidAmount) + toAmount(student?.pendingAmount);

    const plannedTotal = plannedFromFeeSchema || plannedFromEmi || plannedFromStudent || plannedFromInvoice;
    const paidByVerifiedPayments = payments
      .filter((payment) => payment.status === 'verified')
      .reduce((sum, payment) => sum + toAmount(payment.amount), 0);
    const paidByEmi = emiRows
      .filter((item) => item.status === 'paid')
      .reduce((sum, item) => sum + toAmount(item.amount), 0);

    const paidTotal = paidByEmi || paidByVerifiedPayments || toAmount(student?.paidAmount);
    const pendingTotal = Math.max(0, plannedTotal - paidTotal);
    const isMultiPaymentPlan = installments.length > 1 || emiRows.length > 1;

    return {
      plannedTotal,
      paidTotal,
      pendingTotal,
      planType: student?.feeSchema?.schema?.type || (emiRows.length > 0 ? 'emi' : 'full'),
      isMultiPaymentPlan,
      installments
    };
  }, [student]);

  const backPath = useMemo(() => {
    const path = location.pathname;
    if (path.includes('/dashboard/finance/')) return '/dashboard/finance/approvals';
    if (path.includes('/dashboard/study-center/')) return '/dashboard/study-center/students';
    if (path.includes('/dashboard/partner-center/')) return '/dashboard/partner-center/students';
    if (path.includes('/dashboard/subdept/')) return `/dashboard/subdept/${unit || 'portal'}/students`;
    if (path.includes('/dashboard/org-admin/')) return '/dashboard/org-admin/overview';
    if (path.includes('/dashboard/ceo/')) return '/dashboard/ceo/kpis';
    return '/dashboard/academic/pending-reviews';
  }, [location.pathname, unit]);

  const headerLabel = useMemo(() => {
    const path = location.pathname;
    if (path.includes('/dashboard/finance/')) return 'Student Financial Record';
    if (path.includes('/dashboard/study-center/') || path.includes('/dashboard/partner-center/')) return 'Center Student Record';
    if (path.includes('/dashboard/subdept/')) return 'Sub-Department Student Record';
    if (path.includes('/dashboard/org-admin/')) return 'Administrative Student Record';
    if (path.includes('/dashboard/ceo/')) return 'Executive Student Record';
    return 'Student Review Record';
  }, [location.pathname]);

  if (isLoading) {
    return <div className="p-20 text-center font-mono uppercase tracking-widest text-slate-400 font-bold animate-pulse">Hydrating student dossier...</div>;
  }

  if (!student) {
    return <div className="p-20 text-center text-slate-500 font-semibold">Student record not found.</div>;
  }

  const marksProofUrl = student.marks?.marksProof
    ? student.marks.marksProof.startsWith('http')
      ? student.marks.marksProof
      : `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}${student.marks.marksProof}`
    : null;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link to={backPath} className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-colors">
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </Link>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">{headerLabel}</p>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">{student.name}</h1>
            <p className="text-sm text-slate-500 font-medium">Application ID: APP-REF-{student.id}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <span className="px-4 py-2 rounded-xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest">
            {student.status.replaceAll('_', ' ')}
          </span>
          {student.reviewStage && (
            <span className="px-4 py-2 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-black uppercase tracking-widest">
              Desk: {student.reviewStage}
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              <InfoCard icon={UserCircle2} label="Student" value={student.name} />
              <InfoCard icon={BookOpen} label="Program" value={student.program?.name || 'Not mapped'} />
              <InfoCard icon={Building2} label="Center" value={student.center?.name || 'Not assigned'} />
              <InfoCard icon={CalendarDays} label="Academic Unit" value={student.subDepartment?.name || 'Not assigned'} />
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-5">
            <div className="flex items-center gap-3">
              <BadgeIndianRupee className="w-5 h-5 text-emerald-600" />
              <div>
                <h2 className="text-lg font-black text-slate-900">Payment Summary</h2>
                <p className="text-sm text-slate-500 font-medium">
                  {paymentSummary.isMultiPaymentPlan ? 'Installment / EMI plan detected' : 'Single payment plan'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <MoneyCard label="Planned Total" value={formatAmount(paymentSummary.plannedTotal)} tone="slate" />
              <MoneyCard label="Payment Done" value={formatAmount(paymentSummary.paidTotal)} tone="emerald" />
              <MoneyCard label="Payment Pending" value={formatAmount(paymentSummary.pendingTotal)} tone="amber" />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <div className="rounded-2xl border border-slate-200 overflow-hidden">
                <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Submitted Payments</p>
                </div>
                <div className="divide-y divide-slate-100">
                  {student.payments?.length ? student.payments.map((payment) => (
                    <div key={payment.id} className="px-4 py-4 flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-bold text-slate-900 uppercase">{payment.mode || 'Payment'}</p>
                        <p className="text-xs text-slate-500">
                          {new Date(payment.date || payment.createdAt || Date.now()).toLocaleDateString()}
                          {payment.transactionId ? ` • ${payment.transactionId}` : ''}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-black text-slate-900">{formatAmount(toAmount(payment.amount))}</p>
                        <span className={`inline-flex mt-1 px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${payment.status === 'verified' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                          {payment.status}
                        </span>
                      </div>
                    </div>
                  )) : (
                    <div className="px-4 py-6 text-sm text-slate-500">No payment records submitted yet.</div>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 overflow-hidden">
                <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                    {student.emis?.length ? 'EMI / Installment Ledger' : 'Selected Fee Structure'}
                  </p>
                </div>
                <div className="divide-y divide-slate-100">
                  {student.emis?.length ? student.emis.map((item) => (
                    <div key={item.id} className="px-4 py-4 flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-bold text-slate-900">Installment {item.installmentNo}</p>
                        <p className="text-xs text-slate-500">Due {new Date(item.dueDate).toLocaleDateString()}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-black text-slate-900">{formatAmount(toAmount(item.amount))}</p>
                        <span className={`inline-flex mt-1 px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${item.status === 'paid' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                          {item.status}
                        </span>
                      </div>
                    </div>
                  )) : paymentSummary.installments.length ? paymentSummary.installments.map((item, index) => (
                    <div key={`${item.label || 'plan'}-${index}`} className="px-4 py-4 flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-bold text-slate-900">{item.label || `Installment ${index + 1}`}</p>
                        <p className="text-xs text-slate-500 uppercase">{paymentSummary.planType || 'plan'}</p>
                      </div>
                      <p className="text-sm font-black text-slate-900">{formatAmount(toAmount(item.amount))}</p>
                    </div>
                  )) : (
                    <div className="px-4 py-6 text-sm text-slate-500">No installment structure recorded for this student.</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-3">
              <CreditCard className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-black text-slate-900">Billing Node</h2>
            </div>

            <div className="space-y-3 text-sm text-slate-600">
              <MetaRow label="Fee Plan" value={student.feeSchema?.name || 'Not configured'} />
              <MetaRow label="Plan Type" value={paymentSummary.planType?.toUpperCase() || 'N/A'} />
              <MetaRow label="Fee Status" value={student.feeStatus || 'pending'} />
              <MetaRow label="Invoice No." value={student.activationInvoice?.invoiceNo || 'Not generated'} />
              <MetaRow label="Invoice Status" value={student.activationInvoice?.status || 'pending'} />
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-indigo-600" />
              <h2 className="text-lg font-black text-slate-900">Review Notes</h2>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
              {student.lastRejectionReason || student.remarks || 'No remarks recorded yet.'}
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-slate-700" />
              <h2 className="text-lg font-black text-slate-900">Academic Proof</h2>
            </div>
            <MetaRow label="Last Exam" value={student.marks?.lastExam || 'Not recorded'} />
            <MetaRow label="Score" value={student.marks?.lastExamScore ? `${student.marks.lastExamScore}%` : 'Not recorded'} />
            {marksProofUrl ? (
              <a
                href={marksProofUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-3 rounded-2xl bg-blue-50 text-blue-700 border border-blue-200 text-xs font-black uppercase tracking-widest hover:bg-blue-100 transition-colors"
              >
                <FileText className="w-4 h-4" />
                Open Marksheet
              </a>
            ) : (
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Clock3 className="w-4 h-4" />
                No proof uploaded.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoCard({ icon: Icon, label, value }: { icon: typeof UserCircle2; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center">
          <Icon className="w-4 h-4 text-slate-600" />
        </div>
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{label}</p>
      </div>
      <p className="text-sm font-bold text-slate-900">{value}</p>
    </div>
  );
}

function MoneyCard({ label, value, tone }: { label: string; value: string; tone: 'slate' | 'emerald' | 'amber' }) {
  const toneMap = {
    slate: 'bg-slate-50 border-slate-200 text-slate-900',
    emerald: 'bg-emerald-50 border-emerald-200 text-emerald-900',
    amber: 'bg-amber-50 border-amber-200 text-amber-900'
  };

  return (
    <div className={`rounded-2xl border px-5 py-5 ${toneMap[tone]}`}>
      <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-70 mb-2">{label}</p>
      <p className="text-2xl font-black">{value}</p>
    </div>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{label}</span>
      <span className="text-right text-sm font-bold text-slate-800">{value}</span>
    </div>
  );
}
