import { ShieldAlert, Plus, History, Lock, FileText, CheckCircle2, Timer, AlertCircle } from 'lucide-react';

export default function FinanceRequests() {
  const requests = [
    { type: 'Student Profile Edit', entity: 'Rohit Sharma (S-1204)', reason: 'Correction in father name and DOB as per 10th cert.', status: 'Pending', date: '2025-07-14' },
    { type: 'Student Deletion', entity: 'Unknown Entry (S-334)', reason: 'Duplicate entry detected in system-admin sweep.', status: 'Approved', date: '2025-07-12' },
    { type: 'Center Record Edit', entity: 'Mumbai West (C-44)', reason: 'Bank account details updated institutional-wide.', status: 'Rejected', date: '2025-07-10' },
  ];

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto p-4 lg:p-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-8 rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50 gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-2xl bg-rose-600 flex items-center justify-center text-white shadow-lg shadow-rose-600/20">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Finance Inter-Ops</h1>
          </div>
          <p className="text-slate-500 font-medium ml-15">Formal request system for sensitive data mutations (Edit/Delete) requiring Finance clearance.</p>
        </div>
        <button className="flex items-center space-x-2 bg-slate-900 hover:bg-slate-800 text-white px-6 py-3 rounded-2xl transition-all shadow-xl shadow-slate-900/20 active:scale-95 font-bold">
          <Plus className="w-5 h-5 text-rose-400" />
          <span>Lodge Inter-Ops Request</span>
        </button>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <History className="w-4 h-4" />
                Audit Log of Active Inter-Ops Requests
            </h3>
        </div>
        <div className="divide-y divide-slate-100">
            {requests.map((r, i) => (
                <div key={i} className="p-8 flex flex-col md:flex-row md:items-center justify-between hover:bg-slate-50 transition-all group">
                    <div className="flex items-start gap-4 flex-1">
                        <div className={`p-3 rounded-2xl ${r.type.includes('Delete') ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-600'}`}>
                             <FileText className="w-5 h-5" />
                        </div>
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight group-hover:text-rose-600 transition-colors">{r.type}</h4>
                                <span className="text-[10px] font-bold text-slate-400 uppercase bg-white border border-slate-200 px-2 py-0.5 rounded-lg">Audit Protocol v3</span>
                            </div>
                            <p className="text-xs font-bold text-slate-700">{r.entity}</p>
                            <p className="text-xs text-slate-400 font-medium italic">"{r.reason}"</p>
                            <div className="flex items-center gap-2 mt-2 pt-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                <Lock className="w-3 h-3" />
                                Filed on {r.date}
                            </div>
                        </div>
                    </div>
                    <div className="mt-4 md:mt-0 flex items-center gap-6 self-end md:self-center">
                        <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 border ${
                            r.status === 'Approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 
                            r.status === 'Pending' ? 'bg-amber-50 text-amber-700 border-amber-100' : 
                            'bg-red-50 text-red-700 border-red-100'
                        }`}>
                            {r.status === 'Approved' ? <CheckCircle2 className="w-3 h-3" /> : (r.status === 'Pending' ? <Timer className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />)}
                            {r.status}
                        </span>
                        <button className="px-6 py-2 bg-white hover:bg-slate-900 hover:text-white border border-slate-200 rounded-xl text-xs font-bold transition-all active:scale-95 shadow-sm">
                            View Audit
                        </button>
                    </div>
                </div>
            ))}
        </div>
      </div>
      
      <div className="p-6 bg-slate-900 rounded-3xl text-center space-y-3 shadow-2xl shadow-slate-900/20">
          <p className="text-xs font-black text-white/40 uppercase tracking-[0.2em]">Institutional Policy Notice</p>
          <p className="text-white text-sm font-medium max-w-2xl mx-auto leading-relaxed opacity-80 decoration-slate-500">Academic Operations is strictly prohibited from direct data mutations. All edit/delete actions on active student or center records must be ratified by the Finance Department through this Inter-Ops portal.</p>
      </div>
    </div>
  );
}
