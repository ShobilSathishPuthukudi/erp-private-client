import { Users2, ArrowUpRight, Clock, BookOpen, Building2, Search } from 'lucide-react';

export default function ReferredLeads() {
  const leads = [
    { name: 'Amit Verma', bde: 'John BDE', date: '2025-07-10', program: 'MBA Online', center: 'Delhi South Center', status: 'Pending Review' },
    { name: 'Priya Das', bde: 'Sarah BDE', date: '2025-07-11', program: 'MCA Online', center: 'Kolkata North Center', status: 'Eligibility Approved' },
    { name: 'Kevin Peterson', bde: 'John BDE', date: '2025-07-12', program: 'BBA Skill', center: 'Mumbai West Center', status: 'Pending Review' },
  ];

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto p-4 lg:p-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-8 rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50 gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
              <Users2 className="w-6 h-6" />
            </div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Referred Candidacies</h1>
          </div>
          <p className="text-slate-500 font-medium ml-15">Track student candidacies referred from Sales BDEs for academic appraisal.</p>
        </div>
        <div className="flex items-center gap-4 bg-slate-50 p-2 rounded-2xl border border-slate-200">
            <div className="px-5 py-2">
                <span className="text-2xl font-black text-slate-900">12</span>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Total Referrals</p>
            </div>
            <div className="w-px h-8 bg-slate-200" />
            <div className="px-5 py-2">
                <span className="text-2xl font-black text-amber-500">08</span>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Unappraised</p>
            </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden">
        <table className="w-full text-left">
            <thead className="bg-slate-50/50 border-b border-slate-100">
                <tr>
                    <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Candidacy Trace</th>
                    <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Sales Reference (BDE)</th>
                    <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Target Node</th>
                    <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Appraisal Status</th>
                    <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Actions</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
                {leads.map((l, i) => (
                    <tr key={i} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="px-8 py-6">
                            <div className="flex flex-col">
                                <span className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors uppercase tracking-tight">{l.name}</span>
                                <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1 uppercase">
                                    <Clock className="w-3 h-3" />
                                    {l.date}
                                </span>
                            </div>
                        </td>
                        <td className="px-8 py-6">
                            <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-500 font-black text-[10px]">
                                    {l.bde.charAt(0)}
                                </div>
                                <span className="text-sm font-bold text-slate-700">{l.bde}</span>
                            </div>
                        </td>
                        <td className="px-8 py-6">
                            <div className="flex flex-col">
                                <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5 uppercase tracking-tighter">
                                    <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                                    {l.program}
                                </span>
                                <span className="text-[10px] font-medium text-slate-400 flex items-center gap-1.5 ml-5 mt-0.5">
                                    <Building2 className="w-3 h-3 text-slate-300" />
                                    {l.center}
                                </span>
                            </div>
                        </td>
                        <td className="px-8 py-6">
                            <span className={`px-2 py-1 text-[10px] font-black uppercase rounded-full tracking-widest ${l.status === 'Pending Review' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                {l.status}
                            </span>
                        </td>
                        <td className="px-8 py-6">
                            <button className="p-2 border border-slate-200 rounded-xl hover:bg-slate-900 hover:text-white transition-all active:scale-95 shadow-sm group">
                                <Search className="w-4 h-4" />
                            </button>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
      </div>
    </div>
  );
}
