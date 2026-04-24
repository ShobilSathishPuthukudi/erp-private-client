import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import { RefreshCw, CheckCircle, XCircle, User, Calendar, CreditCard, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/shared/PageHeader';

interface ReregRequest {
  id: number;
  student: { id: number; name: string; uid: string };
  targetSemester: number;
  amountPaid: number;
  paymentProof: string;
  cycle: string;
}

export default function ReregManager() {
  const [queue, setQueue] = useState<ReregRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchQueue();
  }, []);

  const fetchQueue = async () => {
    try {
      const res = await api.get('/rereg/queue');
      setQueue(res.data);
    } catch (error) {
      toast.error('Failed to load REREG queue');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (id: number, status: 'verified' | 'rejected') => {
    const remarks = window.prompt(`Verification remarks for ${status}:`);
    if (remarks === null) return;

    try {
      await api.post(`/rereg/verify/${id}`, { status, remarks });
      toast.success(`REREG ${status} successfully`);
      fetchQueue();
    } catch (error) {
      toast.error('Failed to update REREG status');
    }
  };

  if (loading) return <div className="animate-pulse h-64 bg-slate-50 rounded-2xl" />;

  return (
    <div className="p-2 space-y-8">
      <PageHeader 
        title="Re-Registration Queue"
        description="Verify payment proofs and authorize academic progression for the next cycle."
        icon={RefreshCw}
        action={
          <div className="bg-amber-50 text-amber-600 px-4 py-2 rounded-xl border border-amber-100 flex items-center gap-2 text-xs font-bold uppercase tracking-widest whitespace-nowrap">
            <AlertTriangle className="w-4 h-4" /> 12 Carryforward
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4">
        {queue.map((req) => (
          <div key={req.id} className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col md:flex-row justify-between items-center group hover:border-blue-200 transition-all shadow-sm hover:shadow-md">
            <div className="flex items-center gap-6 flex-1">
               <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
                  <User className="w-6 h-6" />
               </div>
               <div className="space-y-1">
                  <Link to={`/dashboard/finance/students/${req.student.id}`} className="font-black text-slate-900 text-lg uppercase tracking-tight hover:text-blue-600 transition-colors">{req.student.name}</Link>
                  <div className="flex items-center gap-4 text-[10px] text-slate-500 font-black uppercase tracking-widest">
                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {req.cycle}</span>
                    <span className="flex items-center gap-1 text-blue-600"><CheckCircle className="w-3 h-3" /> SEMESTER {req.targetSemester}</span>
                  </div>
               </div>
            </div>

            <div className="flex items-center gap-8 flex-1 justify-end">
               <div className="text-right">
                  <div className="flex items-center gap-2 justify-end text-emerald-600 font-black text-lg">
                    <CreditCard className="w-4 h-4" /> ₹{req.amountPaid.toLocaleString()}
                  </div>
                  <a href={req.paymentProof} target="_blank" className="text-[10px] font-black text-blue-500 uppercase tracking-widest hover:underline ">View Proof</a>
               </div>
               <div className="flex gap-2">
                  <button 
                    onClick={() => handleVerify(req.id, 'rejected')}
                    className="p-3 bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-100 transition-colors border border-rose-100"
                  >
                    <XCircle className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={() => handleVerify(req.id, 'verified')}
                    className="p-3 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-100 transition-colors border border-emerald-100 shadow-sm"
                  >
                    <CheckCircle className="w-5 h-5" />
                  </button>
               </div>
            </div>
          </div>
        ))}

        {queue.length === 0 && (
          <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-[32px] p-24 text-center">
            <CheckCircle className="w-12 h-12 text-emerald-300 mx-auto mb-4" />
            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Verification Complete</h3>
            <p className="text-slate-500 text-sm mt-1 max-w-xs mx-auto">All institutional REREG requests have been forensically processed.</p>
          </div>
        )}
      </div>
    </div>
  );
}
