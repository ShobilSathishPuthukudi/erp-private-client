import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import { Clock, UserCheck, UserPlus, History, X, CheckCircle2, AlertTriangle, ArrowRight, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';

type EscalationTask = {
  id: number;
  title: string;
  daysOverdue: number;
  moduleSource: string;
  assignee: { name: string; uid: string; department?: { name: string; id: number } };
  deptAdmin: { name: string; email: string };
  deadline: string;
};

export default function Escalations() {
  const [tasks, setTasks] = useState<EscalationTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<EscalationTask | null>(null);
  const [modalMode, setModalMode] = useState<'resolve' | 'reassign' | 'chain' | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchEscalations();
  }, []);

  const fetchEscalations = async () => {
    try {
      const res = await api.get('/ceo/escalations');
      setTasks(res.data.tasks);
    } catch (error) {
      toast.error('Failed to load escalations');
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async () => {
    if (!selectedTask) return;
    try {
      setIsSubmitting(true);
      await api.post('/ceo/resolve-task', { taskId: selectedTask.id, resolutionNotes });
      toast.success('Escalation resolved successfully');
      setModalMode(null);
      fetchEscalations();
    } catch (error) {
      toast.error('Failed to resolve escalation');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getUrgencyColor = (days: number) => {
    if (days > 7) return 'bg-red-50 text-red-700 border-red-100 ring-red-500/20';
    if (days >= 3) return 'bg-amber-50 text-amber-700 border-amber-100 ring-amber-500/20';
    return 'bg-blue-50 text-blue-700 border-blue-100 ring-blue-500/20';
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20">
      
      {/* Critical Overdue Section */}
      <div className="bg-white rounded-[32px] border border-slate-100 shadow-xl shadow-slate-200/40 overflow-hidden">
        <div className="px-10 py-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
          <div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight">Critical Escalation Inbox</h2>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Protracted deadlocks requiring executive intervention</p>
          </div>
          <div className="flex items-center gap-3">
             <span className="bg-red-500 text-white text-[10px] font-black px-3 py-1.5 rounded-full shadow-lg shadow-red-500/20 uppercase tracking-wider">
               {tasks.length} Active System Risks
             </span>
          </div>
        </div>

        <div className="overflow-x-auto text-[13px]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white border-b border-slate-50">
                <th className="px-10 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Task Objective</th>
                <th className="px-10 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Departmental Chain</th>
                <th className="px-10 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">Inertia</th>
                <th className="px-10 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Context</th>
                <th className="px-10 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {tasks.length === 0 ? (
                <tr>
                   <td colSpan={5} className="px-10 py-20 text-center">
                      <CheckCircle2 className="w-12 h-12 text-emerald-200 mx-auto mb-4" />
                      <p className="text-sm font-bold text-slate-400">Governance Clean: All systemic escalations resolved.</p>
                   </td>
                </tr>
              ) : tasks.map((task) => (
                <tr key={task.id} className="group hover:bg-slate-50/50 transition-all">
                  <td className="px-10 py-6">
                    <div className="flex items-start gap-3">
                       <div className={`mt-1 w-2.5 h-2.5 rounded-full shrink-0 ${task.daysOverdue > 7 ? 'bg-red-500 animate-ping' : 'bg-amber-500'}`} />
                       <div>
                         <div className="font-black text-slate-900 leading-tight mb-1">{task.title}</div>
                         <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Deadline: {format(new Date(task.deadline), 'MMM dd, yyyy')}</div>
                       </div>
                    </div>
                  </td>
                  <td className="px-10 py-6">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black text-slate-400 uppercase w-12 shrink-0">Admin:</span>
                        <span className="font-bold text-slate-700">{task.deptAdmin?.name || 'Unassigned'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black text-slate-400 uppercase w-12 shrink-0">Owner:</span>
                        <span className="font-bold text-slate-600 italic">{task.assignee?.name}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-10 py-6 text-center">
                    <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border font-black text-xs ring-2 ring-transparent transition-all ${getUrgencyColor(task.daysOverdue)}`}>
                       <Clock className="w-3.5 h-3.5" />
                       {task.daysOverdue} Days Overdue
                    </div>
                  </td>
                  <td className="px-10 py-6">
                     <span className="px-2.5 py-1 bg-slate-100 text-slate-500 rounded-lg font-black text-[10px] uppercase tracking-wider">
                       {task.moduleSource}
                     </span>
                  </td>
                  <td className="px-10 py-6 text-right">
                    <div className="flex items-center justify-end gap-2">
                       <button 
                        onClick={() => { setSelectedTask(task); setModalMode('resolve'); }}
                        className="p-2.5 hover:bg-emerald-50 text-slate-400 hover:text-emerald-600 rounded-xl transition-all border border-transparent hover:border-emerald-100 group"
                        title="Resolve Task"
                       >
                         <UserCheck className="w-5 h-5" />
                       </button>
                       <button 
                        onClick={() => { setSelectedTask(task); setModalMode('reassign'); }}
                        className="p-2.5 hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 rounded-xl transition-all border border-transparent hover:border-indigo-100"
                        title="Reassign Task"
                       >
                         <UserPlus className="w-5 h-5" />
                       </button>
                       <button 
                        onClick={() => { setSelectedTask(task); setModalMode('chain'); }}
                        className="p-2.5 hover:bg-slate-900 text-slate-400 hover:text-white rounded-xl transition-all border border-transparent hover:border-slate-800"
                        title="View Governance Chain"
                       >
                         <History className="w-5 h-5" />
                       </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modern Modal Overlays */}
      {modalMode && selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-lg rounded-[32px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                 <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-white shadow-lg">
                    {modalMode === 'resolve' && <UserCheck className="w-5 h-5" />}
                    {modalMode === 'reassign' && <UserPlus className="w-5 h-5" />}
                    {modalMode === 'chain' && <History className="w-5 h-5" />}
                 </div>
                 <div>
                    <h3 className="text-lg font-black text-slate-900 tracking-tight capitalize">
                      {modalMode === 'chain' ? 'Governance Audit' : `${modalMode} Escalation`}
                    </h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{selectedTask.title}</p>
                 </div>
              </div>
              <button 
                onClick={() => setModalMode(null)}
                className="p-2 hover:bg-white hover:shadow-sm rounded-lg transition-all text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-8">
              {modalMode === 'resolve' && (
                <div className="space-y-6">
                  <div className="bg-emerald-50/50 border border-emerald-100 p-4 rounded-2xl flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-emerald-600 mt-0.5" />
                    <p className="text-xs font-bold text-emerald-800 leading-relaxed">
                      Resolving this escalation will bypass current administrative blocks and notify both the Dept Admin and the Employee of executive closure.
                    </p>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">CEO Resolution Notes</label>
                    <textarea 
                      value={resolutionNotes}
                      onChange={(e) => setResolutionNotes(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-medium focus:ring-2 focus:ring-slate-900/20 focus:border-slate-900 transition-all outline-none"
                      placeholder="Add executive directive here..."
                      rows={4}
                    />
                  </div>
                  <button 
                    onClick={handleResolve}
                    disabled={isSubmitting || !resolutionNotes}
                    className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-sm hover:shadow-xl hover:shadow-slate-900/20 transition-all active:scale-[0.98] disabled:opacity-50"
                  >
                    {isSubmitting ? 'Processing Closure...' : 'Sign Off & Resolve'}
                  </button>
                </div>
              )}

              {modalMode === 'reassign' && (
                <div className="space-y-6">
                   <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-2xl">
                     <div className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Current Chain</div>
                     <div className="flex items-center gap-2 text-sm font-bold text-indigo-900 text-center">
                        <span>{selectedTask.assignee?.name}</span>
                        <ArrowRight className="w-4 h-4" />
                        <span className="text-indigo-400 italic">Select Successor</span>
                     </div>
                   </div>
                   <p className="text-sm text-slate-500 font-medium text-center">Reassignment resets the administrative timer and updates the compliance ledger.</p>
                   <button 
                    disabled={true}
                    className="w-full bg-slate-100 text-slate-400 py-4 rounded-2xl font-black text-sm cursor-not-allowed border-dashed border-2 border-slate-200"
                  >
                    Select New Employee via Dept Roster
                  </button>
                </div>
              )}

              {modalMode === 'chain' && (
                <div className="space-y-8 py-4">
                  {[
                    { role: 'Employee', name: selectedTask.assignee?.name, status: 'Missed Deadline', date: '4 Days Ago', color: 'red' },
                    { role: 'Dept Admin', name: selectedTask.deptAdmin?.name, status: 'Escalation Triggered', date: '2 Days Ago', color: 'amber' },
                    { role: 'CEO', name: 'Awaiting Action', status: 'Current State', date: 'Now', color: 'slate' }
                  ].map((step, idx, arr) => (
                    <div key={idx} className="relative flex items-center gap-6">
                       {idx !== arr.length - 1 && (
                         <div className="absolute left-6 top-10 w-0.5 h-10 bg-slate-100" />
                       )}
                       <div className={`w-12 h-12 rounded-2xl bg-${step.color}-50 border border-${step.color}-100 flex items-center justify-center text-${step.color}-600 z-10 shadow-sm`}>
                          {idx === 0 && <UserPlus className="w-5 h-5" />}
                          {idx === 1 && <UserCheck className="w-5 h-5" />}
                          {idx === 2 && <TrendingUp className="w-5 h-5" />}
                       </div>
                       <div>
                          <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{step.role}</div>
                          <div className="text-sm font-black text-slate-900">{step.name}</div>
                          <div className={`text-[10px] font-bold ${step.color === 'red' ? 'text-red-500' : 'text-slate-500'} mt-1`}>
                            {step.status} • {step.date}
                          </div>
                       </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
