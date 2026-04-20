import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { Building2, CheckCircle2, Coins, XCircle } from 'lucide-react';

type ApiError = { response?: { data?: { error?: string } } };

type ChangeRequest = {
  id: number;
  status: string;
  reason: string;
  opsRemarks?: string | null;
  financeRemarks?: string | null;
  center?: { id: number; name: string };
  currentUniversity?: { name: string };
  requestedUniversity?: { name: string };
  currentProgram?: { id: number; name: string };
  requestedProgram?: { id: number; name: string };
};

type FeeSchema = {
  id: number;
  name: string;
};

export default function UniversityChanges() {
  const [requests, setRequests] = useState<ChangeRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const res = await api.get('/finance/change-requests');
      setRequests(res.data || []);
    } catch {
      toast.error('Failed to load finance university changes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDecision = async (request: ChangeRequest, status: 'approved' | 'rejected') => {
    const remarks = window.prompt(`Add finance remarks for ${status}`) || '';
    if (remarks.trim().length < 12) {
      toast.error('Finance remarks are required');
      return;
    }

    let feeSchemaId: number | undefined;
    if (status === 'approved') {
      const feeRes = await api.get(`/fees/${request.requestedProgram?.id}`).catch(() => ({ data: [] }));
      const feeSchemas = (feeRes.data || []) as FeeSchema[];
      if (!feeSchemas.length) {
        toast.error('Create a fee structure for the requested program before finance approval');
        return;
      }
      const chosen = window.prompt(
        `Enter fee schema ID for ${request.requestedProgram?.name}\n${feeSchemas.map((fee) => `${fee.id}: ${fee.name}`).join('\n')}`,
        `${feeSchemas[0].id}`,
      );
      if (!chosen) return;
      feeSchemaId = Number(chosen);
    }

    try {
      await api.post(`/finance/change-requests/${request.id}/decision`, { status, remarks, feeSchemaId });
      toast.success(status === 'approved' ? 'University change approved and records updated' : 'University change rejected');
      fetchData();
    } catch (error: unknown) {
      toast.error((error as ApiError).response?.data?.error || 'Failed to process finance decision');
    }
  };

  if (loading) {
    return <div className="h-80 animate-pulse rounded-3xl bg-slate-50" />;
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="flex items-center gap-3 text-3xl font-black tracking-tight text-slate-900">
          <Coins className="h-8 w-8 text-blue-600" />
          University Change Finance Queue
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
          Finance approves operations-cleared center university changes, assigns the new fee structure, and updates the active center-program record.
        </p>
      </div>

      <div className="space-y-4">
        {requests.length === 0 && (
          <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-14 text-center text-sm text-slate-500">
            No university change requests are waiting for Finance.
          </div>
        )}

        {requests.map((request) => (
          <section key={request.id} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <Building2 className="h-5 w-5 text-slate-400" />
                  <h2 className="text-xl font-black text-slate-900">{request.center?.name || 'Center'}</h2>
                </div>
                <p className="text-sm text-slate-500">
                  {request.currentProgram?.name || 'Current program'} at {request.currentUniversity?.name || 'Current university'} to {request.requestedProgram?.name || 'Requested program'} at {request.requestedUniversity?.name || 'Requested university'}
                </p>
                <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  Reason: {request.reason}
                </div>
                {request.opsRemarks && (
                  <div className="rounded-2xl bg-blue-50 px-4 py-3 text-sm text-blue-700">
                    Operations note: {request.opsRemarks}
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => handleDecision(request, 'rejected')}
                  className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-bold text-rose-700"
                >
                  <XCircle className="h-4 w-4" />
                  Reject
                </button>
                <button
                  onClick={() => handleDecision(request, 'approved')}
                  className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-bold text-emerald-700"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Approve & Assign Fee
                </button>
              </div>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
