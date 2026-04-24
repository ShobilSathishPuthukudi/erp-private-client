import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import { ShieldCheck, User, Terminal, XCircle } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';

interface Request {
  id: number;
  center: { name: string; uid: string };
  requester: { name: string; uid: string };
  remarks: string;
  ipAddress: string;
  createdAt: string;
}

export default function CredentialReviewTab() {
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const res = await api.get('/credentials/pending');
      setRequests(res.data);
    } catch (error) {
       console.error('Failed to fetch security queue');
    } finally {
       setLoading(false);
    }
  };

  const handleAction = async (id: number, action: 'approve' | 'reject') => {
    try {
      await api.post(`/credentials/${action}/${id}`);
      toast.success(`Access ${action}d successfully`);
      fetchRequests();
    } catch (error) {
       toast.error(`Failed to ${action} request`);
    }
  };

  if (loading) return <div className="p-12 text-center text-slate-300 font-black uppercase animate-pulse">Syncing VPC Queue...</div>;

  return (
    <div className="p-2 space-y-6">
      <PageHeader 
        title="Security Authorization Control"
        description="High-protocol review for Study Center credential reveals. All decisions are physically Grounded and audited."
        icon={ShieldCheck}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {requests.map(req => (
          <div key={req.id} className="bg-white border border-slate-200 rounded-[32px] overflow-hidden shadow-sm hover:border-blue-200 transition-all flex flex-col">
             <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                <div className="flex items-center gap-3">
                   <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-slate-900 border border-slate-200">
                      <Terminal className="w-5 h-5" />
                   </div>
                   <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Target Center</p>
                      <p className="font-black text-slate-900 uppercase tracking-tighter">{req.center.name}</p>
                   </div>
                </div>
                <div className="text-right">
                   <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Request IP</p>
                   <p className="font-mono text-[10px] font-bold text-slate-900 text-blue-600">{req.ipAddress}</p>
                </div>
             </div>

             <div className="p-8 flex-1 space-y-6">
                <div className="flex items-center gap-4">
                   <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center text-blue-600">
                      <User className="w-5 h-5" />
                   </div>
                   <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Requester</p>
                      <p className="font-bold text-slate-900">{req.requester.name}</p>
                   </div>
                </div>

                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                   <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Justification</p>
                   <p className="text-sm font-medium leading-relaxed text-slate-600">"{req.remarks}"</p>
                </div>
             </div>

             <div className="p-8 border-t border-slate-100 bg-slate-50/10 flex gap-4">
                <button 
                  onClick={() => handleAction(req.id, 'reject')}
                  className="flex-1 bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-200 text-rose-600 py-3 rounded-2xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-2 transition-all"
                >
                   <XCircle className="w-4 h-4" /> Reject
                </button>
                <button 
                  onClick={() => handleAction(req.id, 'approve')}
                  className="flex-1 bg-slate-900 hover:bg-slate-800 text-white py-3 rounded-2xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-2 transition-all shadow-lg"
                >
                   <ShieldCheck className="w-4 h-4" /> Authorize Reveal
                </button>
             </div>
          </div>
        ))}

        {requests.length === 0 && (
           <div className="lg:col-span-2 py-32 text-center bg-slate-50 border-2 border-dashed border-slate-200 rounded-[48px]">
              <ShieldCheck className="w-16 h-16 text-slate-300 mx-auto mb-4 opacity-50" />
              <p className="font-black text-slate-400 uppercase tracking-[0.2em] text-sm">Security Queue Clear</p>
              <p className="text-slate-400 text-[10px] font-bold mt-2">All forensic access requests have been processed.</p>
           </div>
        )}
      </div>
    </div>
  );
}
