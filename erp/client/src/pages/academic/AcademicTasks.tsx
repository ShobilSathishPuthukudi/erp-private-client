import { CheckSquare, Clock, AlertCircle, Plus, LayoutList } from 'lucide-react';

export default function AcademicTasks() {
  const tasks = [
    { title: 'University Affiliation Audit', priority: 'High', due: '2025-07-20', status: 'Pending' },
    { title: 'Batch July-25 Capacity Lock', priority: 'Critical', due: '2025-07-15', status: 'In Progress' },
    { title: 'Update BVoc Skill Mapping', priority: 'Medium', due: '2025-07-25', status: 'Pending' },
    { title: 'Credential Reveal Audit (June)', priority: 'High', due: '2025-07-30', status: 'Completed' },
  ];

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto p-4 lg:p-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-8 rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50 gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-2xl bg-amber-500 flex items-center justify-center text-white shadow-lg shadow-amber-500/20">
              <CheckSquare className="w-6 h-6" />
            </div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Operations Tasks</h1>
          </div>
          <p className="text-slate-500 font-medium ml-15">Track institutional workflow compliance and departmental milestones.</p>
        </div>
        <button className="flex items-center space-x-2 bg-slate-900 hover:bg-slate-800 text-white px-6 py-3 rounded-2xl transition-all shadow-xl shadow-slate-900/20 active:scale-95 font-bold">
          <Plus className="w-5 h-5" />
          <span>New Directive</span>
        </button>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <LayoutList className="w-4 h-4" />
                Active Directives Pipeline
            </h3>
        </div>
        <div className="divide-y divide-slate-100">
            {tasks.map((t, i) => (
                <div key={i} className="p-6 flex items-center justify-between hover:bg-slate-50 transition-colors group">
                    <div className="flex items-center gap-4">
                        <div className={`w-2 h-2 rounded-full ${t.priority === 'Critical' ? 'bg-red-500 animate-pulse' : (t.priority === 'High' ? 'bg-amber-500' : 'bg-blue-500')}`} />
                        <div>
                            <h4 className="text-sm font-black text-slate-900 group-hover:text-blue-600 transition-colors">{t.title}</h4>
                            <div className="flex items-center gap-3 mt-1 text-[10px] font-bold text-slate-400 uppercase tracking-tight">
                                <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Due {t.due}</span>
                                <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-600 font-black">{t.priority}</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-6">
                        <span className={`text-[10px] font-black uppercase tracking-widest ${t.status === 'Completed' ? 'text-emerald-600' : (t.status === 'In Progress' ? 'text-amber-600' : 'text-slate-400')}`}>
                            {t.status}
                        </span>
                        <button className="text-xs font-bold text-slate-900 hover:bg-slate-900 hover:text-white px-4 py-2 rounded-xl border border-slate-200 transition-all">
                            Review
                        </button>
                    </div>
                </div>
            ))}
        </div>
      </div>
    </div>
  );
}
