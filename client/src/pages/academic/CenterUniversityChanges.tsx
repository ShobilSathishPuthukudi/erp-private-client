import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { Building2, CheckCircle2, RefreshCw, XCircle } from 'lucide-react';

type ApiError = { response?: { data?: { error?: string } } };

type ChangeRequest = {
  id: number;
  status: string;
  reason: string;
  opsRemarks?: string | null;
  financeRemarks?: string | null;
  center?: { name: string };
  currentUniversity?: { name: string };
  requestedUniversity?: { name: string };
  currentProgram?: { name: string };
  requestedProgram?: { name: string };
};

export default function CenterUniversityChanges() {
  const [requests, setRequests] = useState<ChangeRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const res = await api.get('/academic/center-university-change-requests');
      setRequests(res.data || []);
    } catch {
      toast.error('Failed to load university change requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDecision = async (requestId: number, status: 'approved' | 'rejected') => {
    const remarks = window.prompt(`Add operations remarks for ${status}`) || '';
    if (remarks.trim().length < 12) {
      toast.error('Operations remarks are required');
      return;
    }

    try {
      await api.post(`/academic/center-university-change-requests/${requestId}/decision`, { status, remarks });
      toast.success(`Request ${status} by Operations`);
      fetchData();
    } catch (error: unknown) {
      toast.error((error as ApiError).response?.data?.error || 'Failed to process request');
    }
  };

  if (loading) {
    return <div className="h-80 animate-pulse rounded-3xl bg-slate-50" />;
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="flex items-center gap-3 text-3xl font-black tracking-tight text-slate-900">
          <Building2 className="h-8 w-8 text-sky-600" />
          Center University Change Queue
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
          Review partner-center requests to move a mapped program to a proposed university. Operations approves or rejects first, then Finance handles the fee structure and final record update.
        </p>
      </div>

      <div className="space-y-4">
        {requests.length === 0 && (
          <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-14 text-center text-sm text-slate-500">
            No university change requests are active right now.
          </div>
        )}

        {requests.map((request) => (
          <section key={request.id} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-black text-slate-900">{request.center?.name || 'Center'}</h2>
                  <StatusBadge status={request.status} />
                </div>
                <p className="text-sm text-slate-500">
                  {request.currentProgram?.name || 'Current program'} at {request.currentUniversity?.name || 'Current university'} to {request.requestedProgram?.name || 'Requested program'} at {request.requestedUniversity?.name || 'Requested university'}
                </p>
                <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  Reason: {request.reason}
                </div>
                {(request.opsRemarks || request.financeRemarks) && (
                  <div className="rounded-2xl bg-blue-50 px-4 py-3 text-sm text-blue-700">
                    {request.financeRemarks || request.opsRemarks}
                  </div>
                )}
              </div>

              {request.status === 'pending_ops' && (
                <div className="flex gap-2">
                  <button
                    onClick={() => handleDecision(request.id, 'rejected')}
                    className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-bold text-rose-700"
                  >
                    <XCircle className="h-4 w-4" />
                    Reject
                  </button>
                  <button
                    onClick={() => handleDecision(request.id, 'approved')}
                    className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-bold text-emerald-700"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Approve
                  </button>
                </div>
              )}

              {request.status !== 'pending_ops' && (
                <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-black uppercase tracking-[0.2em] text-slate-700">
                  <RefreshCw className="h-3 w-3" />
                  {request.status.replaceAll('_', ' ')}
                </div>
              )}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending_ops: 'bg-amber-50 text-amber-700',
    pending_finance: 'bg-blue-50 text-blue-700',
    approved: 'bg-emerald-50 text-emerald-700',
    rejected_ops: 'bg-rose-50 text-rose-700',
    rejected_finance: 'bg-red-50 text-red-700',
  };

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-black uppercase tracking-[0.18em] ${styles[status] || 'bg-slate-100 text-slate-700'}`}>
      {status.replaceAll('_', ' ')}
    </span>
  );
}
