import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { ShieldAlert, History, Lock, FileText, CheckCircle2, Timer, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function FinanceRequests() {
  const [requests, setRequests] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchRequests = async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/academic/action-requests');
      setRequests(res.data);
    } catch (error) {
      toast.error('Failed to fetch institutional action requests');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  return (
    <div className="p-2 space-y-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white px-6 py-5 rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50 gap-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center text-white shadow-lg shadow-slate-900/20 shrink-0">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight leading-tight mb-0.5">Finance inter-ops</h1>
            <p className="text-slate-500 font-medium text-sm">Formal request system for sensitive data mutations (Edit/Delete) requiring Finance clearance.</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <History className="w-4 h-4" />
                Audit Log of Active Inter-Ops Requests
            </h3>
        </div>
        <div className="divide-y divide-slate-100">
            {isLoading ? (
                <div className="p-20 text-center animate-pulse text-slate-400 font-black uppercase tracking-[0.3em]">Downloading Audit Manifest...</div>
            ) : requests.map((r, i) => (
                <div key={i} className="p-8 flex flex-col md:flex-row md:items-center justify-between hover:bg-slate-50 transition-all group">
                    <div className="flex items-start gap-4 flex-1">
                        <div className={`p-3 rounded-2xl ${r.actionType === 'DELETE' ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-600'}`}>
                             <FileText className="w-5 h-5" />
                        </div>
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight group-hover:text-rose-600 transition-colors">{r.actionType} {r.entityType}</h4>
                                <span className="text-[10px] font-bold text-slate-400 uppercase bg-white border border-slate-200 px-2 py-0.5 rounded-lg">Audit Protocol v3</span>
                            </div>
                            <p className="text-xs font-bold text-slate-700">Target ID: {r.entityId}</p>
                            <p className="text-xs text-slate-400 font-medium ">"{r.reason}"</p>
                            {r.financeRemarks && (
                                <p className="text-xs text-indigo-500 font-bold mt-2">Finance: {r.financeRemarks}</p>
                            )}
                            <div className="flex items-center gap-2 mt-2 pt-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                <Lock className="w-3 h-3" />
                                Filed on {new Date(r.createdAt).toLocaleDateString()}
                            </div>
                        </div>
                    </div>
                    <div className="mt-4 md:mt-0 flex items-center gap-6 self-end md:self-center">
                        <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 border ${
                            r.status === 'approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 
                            r.status === 'pending' ? 'bg-amber-50 text-amber-700 border-amber-100' : 
                            'bg-red-50 text-red-700 border-red-100'
                        }`}>
                            {r.status === 'approved' ? <CheckCircle2 className="w-3 h-3" /> : (r.status === 'pending' ? <Timer className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />)}
                            {r.status}
                        </span>
                        <button className="px-6 py-2 bg-white hover:bg-slate-900 hover:text-white border border-slate-200 rounded-xl text-xs font-bold transition-all active:scale-95 shadow-sm">
                            View Audit
                        </button>
                    </div>
                </div>
            ))}
            {!isLoading && requests.length === 0 && (
                <div className="p-20 text-center text-slate-400 font-black text-xs uppercase tracking-widest">No Active Inter-Ops Requests Located</div>
            )}
        </div>
      </div>
      
      <div className="p-6 bg-slate-900 rounded-3xl text-center space-y-3 shadow-2xl shadow-slate-900/20">
          <p className="text-xs font-black text-white/40 uppercase tracking-[0.2em]">Institutional Policy Notice</p>
          <p className="text-white text-sm font-medium max-w-2xl mx-auto leading-relaxed opacity-80 decoration-slate-500">Academic Operations is strictly prohibited from direct data mutations. All edit/delete actions on active student or center records must be ratified by the Finance Department through this Inter-Ops portal.</p>
      </div>
    </div>
  );
}
