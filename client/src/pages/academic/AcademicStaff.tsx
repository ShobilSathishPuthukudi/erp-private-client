import { Users, Shield, Mail, Phone } from 'lucide-react';
import { toSentenceCase } from '@/lib/utils';

export default function AcademicStaff() {
  const staff: any[] = [];

  return (
    <div className="p-2 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-8 rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50 gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/20">
              <Users className="w-6 h-6" />
            </div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Academic Personnel</h1>
          </div>
          <p className="text-slate-500 font-medium ml-15">Directory of institutional operations staff and departmental administrators.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {staff.length > 0 ? staff.map((s, i) => (
          <div key={i} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-lg shadow-slate-200/50 hover:shadow-xl transition-all group">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-600 group-hover:bg-slate-900 group-hover:text-white transition-colors">
                 <Shield className="w-6 h-6" />
              </div>
              <span className={`px-2 py-1 text-[10px] font-black rounded-full ${s.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                {toSentenceCase(s.status)}
              </span>
            </div>
            <h3 className="text-lg font-black text-slate-900 mb-1">{s.name}</h3>
            <p className="text-xs font-bold text-slate-400 mb-4">{toSentenceCase(s.role)}</p>
            
            <div className="space-y-2 pt-4 border-t border-slate-100">
                <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    {s.email}
                </div>
                <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    {s.phone}
                </div>
            </div>
          </div>
        )) : (
            <div className="col-span-full bg-white p-16 rounded-[3rem] border border-slate-200 text-center shadow-sm">
                <div className="w-20 h-20 bg-slate-50 rounded-[2rem] flex items-center justify-center mx-auto mb-6">
                    <Users className="w-10 h-10 text-slate-200" />
                </div>
                <h3 className="text-xl font-black text-slate-300 tracking-widest">Directory empty</h3>
                <p className="text-slate-400 font-medium mt-2">No personnel records are currently mapped to the Academic Department.</p>
            </div>
        )}
      </div>
    </div>
  );
}
