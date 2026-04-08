import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { DataTable } from '@/components/shared/DataTable';
import { Modal } from '@/components/shared/Modal';
import type { ColumnDef } from '@tanstack/react-table';
import { Key, ShieldAlert, Timer, Lock, Eye, EyeOff, AlertCircle, Building2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';

interface CredentialRequest {
  id: number;
  centerId: number;
  requesterId: string;
  remarks: string;
  status: 'pending' | 'approved' | 'rejected';
  revealUntil?: string;
  center?: { name: string; location: string };
  createdAt: string;
}

interface Center {
  id: number;
  name: string;
}

export default function CredentialRequests() {
  const [requests, setRequests] = useState<CredentialRequest[]>([]);
  const [centers, setCenters] = useState<Center[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [revealData, setRevealData] = useState<{ loginId: string; password: string } | null>(null);
  const [isRevealModalOpen, setIsRevealModalOpen] = useState(false);

  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm();

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [reqRes, centerRes] = await Promise.all([
        api.get('/academic/credentials/requests'),
        api.get(`/academic/centers?t=${Date.now()}`)
      ]);
      setRequests(reqRes.data);
      // Hardened filtering: Ensure no university nodes leak into the HUD dropdown
      setCenters(centerRes.data.filter((c: any) => 
        !c.name.toLowerCase().includes('university')
      ));
    } catch (error) {
      toast.error('Failed to access secure vault logs');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onSubmit = async (data: any) => {
    try {
      await api.post('/academic/credentials/request', data);
      toast.success('Reveal request transmitted to Finance');
      setIsModalOpen(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Transmission failure');
    }
  };

  const handleReveal = async (requestId: number) => {
    try {
      // Security Protocol GAP-7: Trigger visibility window before reveal
      await api.post(`/academic/credentials/${requestId}/trigger-view`);
      
      const res = await api.get(`/academic/credentials/reveal/${requestId}`);
      setRevealData(res.data);
      setIsRevealModalOpen(true);
      toast.success('Institutional vault unlocked');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Vault access denied');
    }
  };

  const columns: ColumnDef<CredentialRequest>[] = [
    { 
      id: 'center', 
      header: 'Target Institutional Node', 
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 border border-slate-200">
            <Building2 className="w-4 h-4" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-slate-900">{row.original.center?.name}</span>
            <span className="text-[10px] text-slate-400 font-medium uppercase tracking-widest">{row.original.center?.location}</span>
          </div>
        </div>
      ) 
    },
    { 
      accessorKey: 'remarks', 
      header: 'Justification / Purpose',
      cell: ({ row }) => (
        <div className="max-w-md">
            <p className="text-xs text-slate-600 line-clamp-2 ">"{row.original.remarks}"</p>
        </div>
      )
    },
    { 
      accessorKey: 'status', 
      header: 'Clearance',
      cell: ({ row }) => {
        const s = row.original.status;
        return (
          <span className={`px-2.5 py-1 text-[10px] rounded-full font-bold uppercase tracking-wider flex items-center gap-1.5 w-fit ${
            s === 'approved' ? 'bg-emerald-100 text-emerald-700' : 
            s === 'pending' ? 'bg-amber-100 text-amber-700' :
            'bg-red-100 text-red-700'
          }`}>
            {s === 'approved' ? <Lock className="w-3 h-3" /> : (s === 'pending' ? <Timer className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />)}
            {s}
          </span>
        );
      }
    },
    { 
      accessorKey: 'createdAt', 
      header: 'Timestamp', 
      cell: ({ row }) => (
        <span className="text-[10px] font-mono text-slate-500 uppercase">
          {new Date(row.original.createdAt).toLocaleString()}
        </span>
      ) 
    },
    {
      id: 'actions',
      header: 'Audit Control',
      cell: ({ row }) => {
        const s = row.original.status;
        return (
          <button 
            onClick={() => handleReveal(row.original.id)}
            disabled={s !== 'approved'}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all active:scale-95 shadow-lg ${
                s === 'approved' 
                ? 'bg-slate-900 text-white hover:bg-slate-800 shadow-slate-900/20' 
                : 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none'
            }`}
          >
            {s === 'approved' ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            <span>{s === 'approved' ? 'Reveal Credentials' : (s === 'rejected' ? 'Access Denied' : 'Awaiting Finance')}</span>
          </button>
        );
      }
    }
  ];

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto p-4 lg:p-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-8 rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50 gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-2xl bg-rose-600 flex items-center justify-center text-white shadow-lg shadow-rose-600/20">
              <Key className="w-6 h-6" />
            </div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Secure Reveal HUD</h1>
          </div>
          <p className="text-slate-500 font-medium ml-15">Request and audit institutional credential reveals. Every reveal is logged in the Global Audit Ledger.</p>
        </div>
        <button 
          onClick={() => {
              reset({ centerId: '', remarks: '' });
              setIsModalOpen(true);
          }}
          className="flex items-center space-x-2 bg-slate-900 hover:bg-slate-800 text-white px-6 py-3 rounded-2xl transition-all shadow-xl shadow-slate-900/20 active:scale-95 font-bold"
        >
          <ShieldAlert className="w-5 h-5 text-amber-400" />
          <span>Request Access</span>
        </button>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden">
        <DataTable 
          columns={columns} 
          data={requests} 
          isLoading={isLoading} 
          searchKey="remarks" 
          searchPlaceholder="Search audit trail by justification..." 
        />
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Initialize Partner Center Reveal Request"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 p-2">
            <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl flex items-start gap-4 mb-2">
                <AlertCircle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                    <p className="text-[10px] font-black text-amber-900 uppercase tracking-tight">Security Protocol GAP-5</p>
                    <p className="text-sm text-amber-800 font-medium leading-snug tracking-tight">This request will be routed to Finance for risk appraisal. If approved, you will have a limited 60-second window to reveal credentials. Your IP and access timestamp will be permanently logged.</p>
                </div>
            </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Target Institutional Node</label>
              <select
                {...register('centerId', { required: true })}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900 transition-all font-bold text-slate-900"
              >
                <option value="">-- Select Authorized Partner Center --</option>
                {centers.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Access Justification (Min 30 chars)</label>
              <textarea
                {...register('remarks', { required: true, minLength: 30 })}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900 transition-all font-bold text-slate-900"
                rows={4}
                placeholder="Specify the operational necessity for this reveal..."
              />
            </div>
          </div>

          <div className="pt-6 flex justify-end gap-3 mt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-6 py-3 text-slate-600 font-bold hover:bg-slate-50 rounded-xl transition-colors"
            >
              Abort Routine
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-8 py-3 bg-slate-900 text-white rounded-xl font-black hover:bg-slate-800 disabled:opacity-50 transition-all active:scale-95 shadow-lg shadow-slate-900/20"
            >
              {isSubmitting ? 'Transmitting...' : 'Dispatch Request'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={isRevealModalOpen}
        onClose={() => setIsRevealModalOpen(false)}
        title="Institutional Vault Decrypted"
      >
        <div className="space-y-6 p-4 text-center">
            <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 mx-auto shadow-xl shadow-emerald-500/10">
                <Lock className="w-10 h-10" />
            </div>
            
            <div className="space-y-4 max-w-xs mx-auto">
                <div className="bg-slate-900 p-6 rounded-3xl space-y-4 border border-white/10 shadow-emerald-500/20 shadow-2xl">
                    <div>
                        <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1">Institutional Login-ID</p>
                        <p className="text-2xl font-black text-white selection:bg-emerald-500">{revealData?.loginId}</p>
                    </div>
                    <div className="h-px bg-white/10 w-full" />
                    <div>
                        <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1">Pass-Key</p>
                        <p className="text-2xl font-black text-emerald-400 selection:bg-white selection:text-slate-900">{revealData?.password}</p>
                    </div>
                </div>
                
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">Window expires in 60 seconds. Access has been logged to Global Audit Ledger.</p>
            </div>

            <button
                onClick={() => setIsRevealModalOpen(false)}
                className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black hover:bg-slate-800 transition-all active:scale-95 uppercase tracking-widest text-xs shadow-xl shadow-slate-900/20"
            >
                Secure HUD / Exit
            </button>
        </div>
      </Modal>
    </div>
  );
}
