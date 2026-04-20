import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { Modal } from '@/components/shared/Modal';
import { CheckCircle, Layout, Send } from 'lucide-react';
import toast from 'react-hot-toast';

type ApiError = { response?: { data?: { error?: string } } };

type ProgramMapping = {
  id: number;
  programId: number;
  feeSchema?: { id: number; name: string };
  program?: {
    id: number;
    name: string;
    type: string;
    university?: { id: number; name: string };
  };
};

type ProposedUniversity = {
  id: number;
  name: string;
  programs?: Array<{
    id: number;
    name: string;
    fees?: Array<{ id: number; name: string }>;
  }>;
};

type ChangeRequest = {
  id: number;
  status: string;
  currentUniversity?: { name: string };
  requestedUniversity?: { name: string };
  currentProgram?: { name: string };
  requestedProgram?: { name: string };
};

export default function Programs() {
  const [programs, setPrograms] = useState<ProgramMapping[]>([]);
  const [proposedUniversities, setProposedUniversities] = useState<ProposedUniversity[]>([]);
  const [requests, setRequests] = useState<ChangeRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedMapping, setSelectedMapping] = useState<ProgramMapping | null>(null);
  const [requestedUniversityId, setRequestedUniversityId] = useState('');
  const [requestedProgramId, setRequestedProgramId] = useState('');
  const [reason, setReason] = useState('');

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/portals/study-center/university-change/options');
      setPrograms(res.data?.currentMappings || []);
      setProposedUniversities(res.data?.universities || []);
      setRequests(res.data?.requests || []);
    } catch {
      toast.error('Failed to load assigned programs');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const requestedPrograms = useMemo(() => {
    return proposedUniversities.find((uni) => String(uni.id) === requestedUniversityId)?.programs || [];
  }, [proposedUniversities, requestedUniversityId]);

  const openRequestModal = (mapping: ProgramMapping) => {
    setSelectedMapping(mapping);
    setRequestedUniversityId('');
    setRequestedProgramId('');
    setReason('');
    setIsModalOpen(true);
  };

  const handleSubmitRequest = async () => {
    if (!selectedMapping?.programId || !requestedUniversityId || !requestedProgramId || reason.trim().length < 12) {
      toast.error('Choose the proposed university, requested program, and add a clear reason');
      return;
    }

    try {
      await api.post('/portals/study-center/university-change-requests', {
        currentProgramId: selectedMapping.programId,
        requestedUniversityId: Number(requestedUniversityId),
        requestedProgramId: Number(requestedProgramId),
        reason,
      });
      toast.success('University change request sent to Operations');
      setIsModalOpen(false);
      fetchData();
    } catch (error: unknown) {
      toast.error((error as ApiError).response?.data?.error || 'Failed to submit request');
    }
  };

  return (
    <div className="space-y-6 flex flex-col h-[calc(100vh-8rem)]">
      <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex-1">
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <Layout className="w-8 h-8 text-blue-600" />
            Assigned Academic Programs
          </h1>
          <p className="text-slate-500 mt-2 text-sm leading-relaxed max-w-2xl">
            These programs are currently authorized for your center. If you need to move a mapped program to a proposed university,
            submit a university change request here and it will route through Operations and then Finance.
          </p>
        </div>
        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 flex flex-col items-center">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Active Mappings</p>
          <p className="text-4xl font-black text-slate-900">{programs.length}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr] flex-1 min-h-0">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-auto p-6 space-y-4">
          {isLoading && <div className="h-40 animate-pulse rounded-2xl bg-slate-50" />}

          {!isLoading && programs.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center text-sm text-slate-500">
              No sanctioned programs found for this center.
            </div>
          )}

          {!isLoading && programs.map((mapping) => (
            <article key={mapping.id} className="rounded-2xl border border-slate-200 p-5">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-emerald-600 font-bold text-xs uppercase bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100 w-fit">
                    <CheckCircle className="w-3 h-3" />
                    Authorized
                  </div>
                  <h2 className="text-lg font-black text-slate-900">{mapping.program?.name}</h2>
                  <p className="text-sm text-slate-500">
                    {mapping.program?.university?.name || 'University N/A'} • {mapping.program?.type || 'Program'}
                  </p>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-[0.2em]">
                    Fee Structure: {mapping.feeSchema?.name || 'Not Assigned'}
                  </p>
                </div>
                <button
                  onClick={() => openRequestModal(mapping)}
                  className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800"
                >
                  Request University Change
                </button>
              </div>
            </article>
          ))}
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-auto p-6 space-y-4">
          <div>
            <h2 className="text-lg font-black text-slate-900">Recent Requests</h2>
            <p className="text-sm text-slate-500">Track the latest Operations and Finance decisions.</p>
          </div>

          {requests.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center text-sm text-slate-500">
              No university change requests yet.
            </div>
          )}

          {requests.map((request) => (
            <div key={request.id} className="rounded-2xl border border-slate-200 p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-black text-slate-900">{request.currentProgram?.name || 'Program'} to {request.requestedProgram?.name || 'Program'}</p>
                <StatusPill status={request.status} />
              </div>
              <p className="mt-2 text-sm text-slate-500">
                {request.currentUniversity?.name || 'Current university'} to {request.requestedUniversity?.name || 'Requested university'}
              </p>
            </div>
          ))}
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Request Center University Change">
        <div className="space-y-5">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            Current mapping: <span className="font-bold text-slate-900">{selectedMapping?.program?.name}</span> at <span className="font-bold text-slate-900">{selectedMapping?.program?.university?.name}</span>
          </div>

          <label className="space-y-2 block">
            <span className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Proposed University</span>
            <select
              value={requestedUniversityId}
              onChange={(event) => {
                setRequestedUniversityId(event.target.value);
                setRequestedProgramId('');
              }}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
            >
              <option value="">Select proposed university</option>
              {proposedUniversities.map((uni) => (
                <option key={uni.id} value={uni.id}>{uni.name}</option>
              ))}
            </select>
          </label>

          <label className="space-y-2 block">
            <span className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Requested Program</span>
            <select
              value={requestedProgramId}
              onChange={(event) => setRequestedProgramId(event.target.value)}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
              disabled={!requestedUniversityId}
            >
              <option value="">Select requested program</option>
              {requestedPrograms.map((program) => (
                <option key={program.id} value={program.id}>{program.name}</option>
              ))}
            </select>
          </label>

          <label className="space-y-2 block">
            <span className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Reason</span>
            <textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              className="min-h-28 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
              placeholder="Explain why the center needs this university reassignment."
            />
          </label>

          <div className="flex justify-end gap-3">
            <button onClick={() => setIsModalOpen(false)} className="rounded-xl px-4 py-2 text-sm font-bold text-slate-500">
              Cancel
            </button>
            <button
              onClick={handleSubmitRequest}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-blue-700"
            >
              <Send className="w-4 h-4" />
              Submit Request
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending_ops: 'bg-amber-50 text-amber-700',
    pending_finance: 'bg-blue-50 text-blue-700',
    approved: 'bg-emerald-50 text-emerald-700',
    rejected_ops: 'bg-rose-50 text-rose-700',
    rejected_finance: 'bg-red-50 text-red-700',
  };

  return (
    <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${styles[status] || 'bg-slate-100 text-slate-700'}`}>
      {status.replaceAll('_', ' ')}
    </span>
  );
}
