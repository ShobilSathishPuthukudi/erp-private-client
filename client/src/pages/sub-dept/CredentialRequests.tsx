import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { DataTable } from '@/components/shared/DataTable';
import { Modal } from '@/components/shared/Modal';
import type { ColumnDef } from '@tanstack/react-table';
import { 
  Key, 
  ShieldAlert, 
  Clock, 
  CheckCircle2, 
  Eye, 
  Send, 
  Building2,
  FileText,
  AlertTriangle
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';

interface Request {
  id: number;
  centerId: number;
  status: 'pending' | 'approved' | 'rejected';
  type: 'VIEW' | 'RESET';
  remarks: string;
  revealUntil: string | null;
  createdAt: string;
  center?: { name: string; uid: string };
}

interface Center {
  id: number;
  name: string;
  uid: string;
}

export default function CredentialRequests() {
  const [requests, setRequests] = useState<Request[]>([]);
  const [centers, setCenters] = useState<Center[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [revealedCreds, setRevealedCreds] = useState<{username: string, password: string} | null>(null);

  const { register, handleSubmit, reset, watch, getValues, formState: { isSubmitting } } = useForm();

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [reqRes, centRes] = await Promise.all([
        api.get('/credentials/my-requests'),
        api.get('/operations/performance/centers')
      ]);
      setRequests(reqRes.data);
      setCenters(centRes.data);
    } catch (error) {
      toast.error('Failed to access forensic audit vault');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onSubmit = async (data: any) => {
    try {
      await api.post('/credentials/request', data);
      toast.success('Forensic reveal request transmitted to Finance');
      setIsModalOpen(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Transmission failure');
    }
  };

  const revealCredentials = async (id: number) => {
    try {
      const res = await api.get(`/credentials/reveal/${id}`);
      setRevealedCreds(res.data);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Reveal window expired or unauthorized');
    }
  };

  const columns: ColumnDef<Request>[] = [
    { 
      accessorKey: 'createdAt', 
      header: 'Timestamp',
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-bold text-slate-900">{new Date(row.original.createdAt).toLocaleDateString()}</span>
          <span className="text-[10px] font-mono text-slate-400 uppercase tracking-tighter">{new Date(row.original.createdAt).toLocaleTimeString()}</span>
        </div>
      )
    },
    { 
      id: 'center', 
      header: 'Study Center',
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="text-sm font-bold text-slate-700">{row.original.center?.name}</span>
          <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">UID: {row.original.center?.uid}</span>
        </div>
      )
    },
    { 
      accessorKey: 'type', 
      header: 'Protocol Type',
      cell: ({ row }) => (
        <span className={`px-2 py-0.5 text-[10px] font-bold rounded border ${
          row.original.type === 'RESET' ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-blue-50 text-blue-600 border-blue-100'
        }`}>
          {row.original.type}
        </span>
      )
    },
    { 
      accessorKey: 'status', 
      header: 'Audit Status',
      cell: ({ row }) => {
        const s = row.original.status;
        return (
          <span className={`px-2.5 py-1 text-[10px] rounded-full font-black uppercase tracking-widest flex items-center gap-1.5 w-fit ${
            s === 'approved' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 
            s === 'pending' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
            'bg-rose-50 text-rose-600 border border-rose-100'
          }`}>
            {s === 'approved' ? <CheckCircle2 className="w-3 h-3" /> : (s === 'pending' ? <Clock className="w-3 h-3" /> : <ShieldAlert className="w-3 h-3" />)}
            {s}
          </span>
        );
      }
    },
    {
      id: 'actions',
      header: 'Forensic Actions',
      cell: ({ row }) => {
        const isApproved = row.original.status === 'approved';
        const isExpired = row.original.revealUntil && new Date() > new Date(row.original.revealUntil);

        return (
          <div className="flex items-center gap-2">
            {isApproved && !isExpired ? (
              <button 
                onClick={() => revealCredentials(row.original.id)}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all active:scale-95 shadow-lg shadow-indigo-600/20"
              >
                <Eye className="w-3.5 h-3.5" />
                {row.original.type === 'RESET' ? 'Reveal New Key' : 'Reveal Key'}
              </button>
            ) : isApproved && isExpired ? (
              <span className="text-[10px] font-black text-rose-600 uppercase tracking-widest">Window Expired</span>
            ) : (
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Awaiting Approval</span>
            )}
          </div>
        );
      }
    }
  ];

  return (
    <div className="p-2 lg:p-6 space-y-4 max-w-[1600px] mx-auto auto-">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white px-6 py-5 rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50 gap-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center text-white shadow-lg shadow-slate-900/20 shrink-0">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight leading-tight mb-0.5">Credential reveal protocols</h1>
            <p className="text-slate-500 font-medium text-sm">Securely request and audit credential reveals.</p>
          </div>
        </div>
        <button 
          onClick={() => { reset(); setIsModalOpen(true); }}
          className="relative z-10 flex items-center space-x-3 bg-slate-900 hover:bg-slate-800 text-white px-6 py-3 rounded-2xl transition-all shadow-xl shadow-slate-900/20 active:scale-95 font-black uppercase tracking-widest text-[10px]"
        >
          <Key className="w-4 h-4 text-indigo-400" />
          <span>Initialize Reveal Request</span>
        </button>
      </div>

      {revealedCreds && (
        <div className="bg-indigo-900 text-white p-6 rounded-3xl border-4 border-indigo-500/30 flex flex-col md:flex-row items-center justify-between gap-8 shadow-2xl shadow-indigo-900/40 relative overflow-hidden animate-bounce-subtle">
           <div className="flex items-center gap-6">
              <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center backdrop-blur-md">
                 <Key className="w-8 h-8 text-indigo-300" />
              </div>
              <div>
                 <h2 className="text-xl font-black uppercase tracking-wider mb-2">Center access authenticated</h2>
                 <p className="text-indigo-200 text-sm font-medium">Reveal window is active. These credentials will be hidden in 24 hours.</p>
              </div>
           </div>
           <div className="flex gap-6 w-full md:w-auto">
              <div className="bg-black/20 p-4 rounded-2xl border border-white/10 flex-1 md:flex-none md:min-w-[200px]">
                 <p className="text-[10px] font-black text-indigo-400 uppercase mb-1">Username</p>
                 <p className="font-mono text-lg font-bold select-all tracking-wider">{revealedCreds.username}</p>
              </div>
              <div className="bg-black/20 p-4 rounded-2xl border border-white/10 flex-1 md:flex-none md:min-w-[200px]">
                 <p className="text-[10px] font-black text-indigo-400 uppercase mb-1">Password</p>
                 <p className="font-mono text-lg font-bold select-all tracking-wider">{revealedCreds.password}</p>
              </div>
              <button 
                onClick={() => setRevealedCreds(null)}
                className="w-12 h-12 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
              >
                <AlertTriangle className="w-6 h-6 text-white" />
              </button>
           </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden">
           <DataTable columns={columns} data={requests} isLoading={isLoading} searchKey="center.name" searchPlaceholder="Locate request by center..." />
        </div>
        
        <div className="space-y-6">
           <div className="bg-slate-900 text-white p-8 rounded-3xl shadow-2xl space-y-4">
              <h3 className="text-lg font-black uppercase tracking-widest border-b border-white/10 pb-4 flex items-center gap-3">
                 <FileText className="w-5 h-5 text-indigo-400" />
                 Audit Protocol
              </h3>
              <ul className="space-y-4">
                 <li className="flex gap-4">
                    <div className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-xs font-black flex-shrink-0">1</div>
                    <p className="text-xs text-slate-300 font-medium">Requests are routed to Finance for risk verification.</p>
                 </li>
                 <li className="flex gap-4">
                    <div className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-xs font-black flex-shrink-0">2</div>
                    <p className="text-xs text-slate-300 font-medium">Approved reveals expire automatically after 24 hours.</p>
                 </li>
                 <li className="flex gap-4">
                    <div className="w-6 h-6 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center text-xs font-black flex-shrink-0">!</div>
                    <p className="text-xs text-slate-300 font-medium">All reveals are logged with IP address and timestamp for forensic audit.</p>
                 </li>
              </ul>
           </div>
           
           <div className="bg-indigo-50 border border-indigo-100 p-8 rounded-3xl space-y-4">
              <h3 className="text-indigo-900 font-black uppercase tracking-widest text-sm">Forensic Stats</h3>
              <div className="grid grid-cols-2 gap-4">
                 <div className="bg-white p-4 rounded-2xl border border-indigo-200 shadow-sm">
                    <p className="text-[10px] font-black text-indigo-400 uppercase mb-1">My Requests</p>
                    <p className="text-2xl font-black text-slate-900">{requests.length}</p>
                 </div>
                 <div className="bg-white p-4 rounded-2xl border border-indigo-200 shadow-sm">
                    <p className="text-[10px] font-black text-indigo-400 uppercase mb-1">Approved</p>
                    <p className="text-2xl font-black text-indigo-600">{requests.filter(r => r.status === 'approved').length}</p>
                 </div>
              </div>
           </div>
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Initialize Reveal Request">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 p-2">
          <div className="space-y-6">
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2 ml-1">Protocol Type</label>
              <div className="grid grid-cols-2 gap-4">
                <button 
                  type="button"
                  onClick={() => reset({ ...getValues(), type: 'VIEW' })}
                  className={`py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${
                    (watch('type') || 'VIEW') === 'VIEW' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-400 border-slate-200 hover:border-blue-400'
                  }`}
                >
                  View Only
                </button>
                <button 
                  type="button"
                  onClick={() => reset({ ...getValues(), type: 'RESET' })}
                  className={`py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${
                    watch('type') === 'RESET' ? 'bg-rose-600 text-white border-rose-600' : 'bg-white text-slate-400 border-slate-200 hover:border-rose-400'
                  }`}
                >
                  Reset Key
                </button>
                <input type="hidden" {...register('type')} defaultValue="VIEW" />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2 ml-1">Target Study Center</label>
              <div className="relative group">
                <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                <select {...register('centerId', { required: true })} className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-600 transition-all font-bold text-slate-900 appearance-none">
                  <option value="">-- Select Center --</option>
                  {centers.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.uid})</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2 ml-1">Institutional Rationale</label>
              <textarea 
                {...register('remarks', { required: true })} 
                className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-600 transition-all font-medium text-slate-900 min-h-[120px]" 
                placeholder="Describe the necessity for administrative access..."
              />
            </div>
            
            <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl flex gap-3">
               <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
               <p className="text-[10px] font-bold text-amber-700 leading-relaxed uppercase tracking-tight">Warning: This action triggers a security event. Repeated requests for the same node within 24 hours will be flagged for risk audit.</p>
            </div>
          </div>

          <div className="pt-6 flex justify-end gap-3 mt-4 border-t border-slate-100">
            <button type="button" onClick={() => setIsModalOpen(false)} className="px-8 py-4 text-slate-600 font-bold hover:bg-slate-50 rounded-2xl transition-colors">Abort</button>
            <button type="submit" disabled={isSubmitting} className="px-10 py-4 bg-slate-900 text-white rounded-2xl font-black hover:bg-slate-800 disabled:opacity-50 transition-all active:scale-95 shadow-xl shadow-slate-900/20 flex items-center gap-3">
               {isSubmitting ? 'Transmitting...' : (
                  <>
                    <Send className="w-4 h-4" />
                    Transmit protocol request
                  </>
               )}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
