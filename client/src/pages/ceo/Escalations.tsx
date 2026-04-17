import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import { Clock, UserCheck, UserPlus, History, X, CheckCircle2, AlertTriangle, ArrowRight, TrendingUp, ShieldCheck } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { format } from 'date-fns';

type EscalationTask = {
  id: number;
  title: string;
  daysOverdue: number;
  moduleSource: string;
  assignee: { name: string; uid: string; department?: { name: string; id: number } };
  assigner?: { name: string; uid: string };
  deptAdmin: { name: string; email: string };
  deadline: string;
  description?: string;
  createdAt?: string;
  isCritical?: boolean;
  escalationLabel?: string;
};

type EscalationLeave = {
  id: number;
  type: string;
  daysOverdue: number;
  employee: { name: string; uid: string };
  deptAdmin: { name: string; email: string };
  startDate: string;
  endDate: string;
  reason: string;
};

export default function Escalations() {
  const [tasks, setTasks] = useState<EscalationTask[]>([]);
  const [leaves, setLeaves] = useState<EscalationLeave[]>([]);
  const [activeTab, setActiveTab] = useState<'tasks' | 'leaves'>('tasks');
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<EscalationTask | null>(null);
  const [selectedLeave, setSelectedLeave] = useState<EscalationLeave | null>(null);
  const [modalMode, setModalMode] = useState<'resolve' | 'reassign' | 'chain' | 'override_leave' | 'view_details' | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuthStore();
  const normalizedRole = user?.role?.toLowerCase().trim() || '';
  const isReadOnly = !['ceo', 'organization admin', 'system admin'].includes(normalizedRole);
  const [deptUsers, setDeptUsers] = useState<any[]>([]);
  const [targetAssignee, setTargetAssignee] = useState('');
  const [deptLoading, setDeptLoading] = useState(false);

  useEffect(() => {
    fetchEscalations();
  }, []);

  useEffect(() => {
    if (modalMode) {
      document.body.style.overflow = 'hidden';
      document.body.classList.add('modal-open-blur');
      if (modalMode === 'reassign' && selectedTask?.assignee?.department?.id) {
        fetchDeptUsers(selectedTask.assignee.department.id);
      }
    } else {
      document.body.style.overflow = 'auto';
      document.body.classList.remove('modal-open-blur');
      setDeptUsers([]);
      setTargetAssignee('');
    }
    return () => {
      document.body.style.overflow = 'auto';
      document.body.classList.remove('modal-open-blur');
    };
  }, [modalMode, selectedTask]);

  const fetchDeptUsers = async (deptId: number) => {
    try {
      setDeptLoading(true);
      const res = await api.get(`/ceo/dept-users/${deptId}`);
      setDeptUsers(res.data || []);
    } catch (error) {
      toast.error('Failed to load department users');
    } finally {
      setDeptLoading(false);
    }
  };

  const fetchEscalations = async () => {
    try {
      const res = await api.get('/ceo/escalations');
      setTasks(res.data.tasks || []);
      setLeaves(res.data.leaves || []);
    } catch (error) {
      toast.error('Failed to load escalations');
    } finally {
      setLoading(false);
    }
  };

  const handleResolveTask = async () => {
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

  const handleOverrideLeave = async (action: 'approve' | 'reject') => {
    if (!selectedLeave) return;
    try {
      setIsSubmitting(true);
      await api.post('/ceo/resolve-leave', { leaveId: selectedLeave.id, action, notes: resolutionNotes });
      toast.success(`Leave request ${action}ed`);
      setModalMode(null);
      fetchEscalations();
    } catch (error) {
      toast.error('Failed to override leave');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReassignTask = async () => {
    if (!selectedTask || !targetAssignee) return;
    try {
      setIsSubmitting(true);
      await api.post('/ceo/reassign-task', { 
        taskId: selectedTask.id, 
        newAssigneeId: targetAssignee 
      });
      toast.success('Task successfully reassigned');
      setModalMode(null);
      fetchEscalations();
    } catch (error) {
      toast.error('Failed to reassign task');
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
      
      {/* Tab Switcher */}
      <div className="flex items-center gap-4 bg-white p-2 rounded-2xl border border-slate-100 shadow-sm self-start inline-flex">
        <button 
          onClick={() => setActiveTab('tasks')}
          className={`px-6 py-2 rounded-xl text-xs font-black transition-all ${activeTab === 'tasks' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
        >
          Task Escalations ({tasks.length})
        </button>
        <button 
          onClick={() => setActiveTab('leaves')}
          className={`px-6 py-2 rounded-xl text-xs font-black transition-all ${activeTab === 'leaves' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
        >
          Leave Deadlocks ({leaves.length})
        </button>
      </div>

      {/* Critical Overdue Section */}
      <div className="bg-white rounded-[32px] border border-slate-100 shadow-xl shadow-slate-200/40 overflow-hidden">
        <div className="px-10 py-8 border-b border-slate-50 flex items-center justify-between bg-white">
          <div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight">
              {activeTab === 'tasks' ? 'Critical Escalation Inbox' : 'Aged Leave Pending'}
            </h2>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
              Protracted deadlocks requiring executive intervention
            </p>
          </div>
          <div className="flex items-center gap-3">
             {isReadOnly && (
               <div className="flex items-center gap-2 px-4 py-2 bg-slate-900/5 border border-slate-900/10 rounded-xl mr-2">
                 <ShieldCheck className="w-4 h-4 text-slate-400" />
                 <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Monitoring Mode</span>
               </div>
             )}
             <span className={`text-white text-[10px] font-black px-3 py-1.5 rounded-full shadow-lg uppercase tracking-wider ${activeTab === 'tasks' ? 'bg-red-500 shadow-red-500/20' : 'bg-amber-500 shadow-amber-500/20'}`}>
               {(activeTab === 'tasks' ? tasks : leaves).length} Active System Risks
             </span>
          </div>
        </div>

        <div className="overflow-x-auto text-[13px]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white border-b border-slate-50">
                <th className="px-10 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{activeTab === 'tasks' ? 'Task Objective' : 'Employee / Leave Type'}</th>
                <th className="px-10 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Departmental Chain</th>
                <th className="px-10 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">Inertia</th>
                {activeTab === 'leaves' && <th className="px-10 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Duration</th>}
                <th className="px-10 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {activeTab === 'tasks' ? (
                tasks.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-10 py-20 text-center">
                        <CheckCircle2 className="w-12 h-12 text-emerald-200 mx-auto mb-4" />
                        <p className="text-sm font-bold text-slate-400">Governance Clean: All systemic task escalations resolved.</p>
                    </td>
                  </tr>
                ) : tasks.map((task) => (
                  <tr 
                    key={task.id} 
                    className="group hover:bg-slate-50/50 transition-all cursor-pointer"
                    onClick={() => { setSelectedTask(task); setModalMode('view_details'); }}
                  >
                    <td className="px-10 py-6">
                      <div className="flex items-start gap-3">
                        <div className={`mt-1 w-2.5 h-2.5 rounded-full shrink-0 ${task.daysOverdue > 7 ? 'bg-red-500 animate-ping' : 'bg-amber-500'}`} />
                        <div>
                          <div className="font-black text-slate-900 leading-tight mb-1 flex items-center gap-2 group-hover:text-indigo-600 transition-colors">
                             {task.title.length > 12 ? task.title.slice(0, 12) + '...' : task.title}
                             {task.isCritical && (
                               <span className="px-1.5 py-0.5 bg-red-100 text-red-600 text-[8px] font-black rounded-sm border border-red-200">
                                 {task.escalationLabel || 'CRITICAL'}
                               </span>
                             )}
                          </div>
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Deadline: {format(new Date(task.deadline), 'MMM dd, yyyy')}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-10 py-6">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black text-slate-400 uppercase w-[70px] shrink-0">Assigned By:</span>
                          <span className="font-bold text-slate-700">{task.assigner?.name || 'System Generated'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black text-slate-400 uppercase w-[70px] shrink-0">Assigned To:</span>
                          <span className="font-bold text-slate-600 ">{task.assignee?.name}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-10 py-6 text-center">
                      <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border font-black text-xs ring-2 ring-transparent transition-all ${getUrgencyColor(task.daysOverdue)}`}>
                        <Clock className="w-3.5 h-3.5" />
                        {task.daysOverdue} Days Overdue
                      </div>
                    </td>

                    <td className="px-10 py-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {!isReadOnly && (
                          <>
                            <button 
                              onClick={(e) => { e.stopPropagation(); setSelectedTask(task); setModalMode('resolve'); }}
                              className="px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 hover:text-white transition-all whitespace-nowrap border border-emerald-100"
                              title="Resolve Escalation"
                            >
                              Resolve Escalation
                            </button>
                            <button 
                              onClick={(e) => { e.stopPropagation(); setSelectedTask(task); setModalMode('reassign'); }}
                              className="p-2.5 hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 rounded-xl transition-all border border-transparent hover:border-indigo-100"
                              title="Reassign Task"
                            >
                              <UserPlus className="w-5 h-5" />
                            </button>
                          </>
                        )}
                        <button 
                          onClick={(e) => { e.stopPropagation(); setSelectedTask(task); setModalMode('chain'); }}
                          className="p-2.5 hover:bg-slate-900 text-slate-400 hover:text-white rounded-xl transition-all border border-transparent hover:border-slate-800"
                          title="View Governance Chain"
                        >
                          <History className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                leaves.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-10 py-20 text-center">
                        <CheckCircle2 className="w-12 h-12 text-emerald-200 mx-auto mb-4" />
                        <p className="text-sm font-bold text-slate-400">Governance Clean: No aged leave requests pending.</p>
                    </td>
                  </tr>
                ) : leaves.map((leave) => (
                  <tr key={leave.id} className="group hover:bg-slate-50/50 transition-all">
                    <td className="px-10 py-6">
                      <div className="flex items-start gap-3">
                        <div className={`mt-1 w-2.5 h-2.5 rounded-full shrink-0 ${leave.daysOverdue > 7 ? 'bg-red-500' : 'bg-amber-500'}`} />
                        <div>
                          <div className="font-black text-slate-900 leading-tight mb-1">{leave.employee?.name}</div>
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{leave.type} Request</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-10 py-6">
                       <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black text-slate-400 uppercase w-12 shrink-0">Admin:</span>
                        <span className="font-bold text-slate-700">{leave.deptAdmin?.name || 'Unassigned'}</span>
                      </div>
                    </td>
                    <td className="px-10 py-6 text-center">
                       <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border font-black text-xs ${getUrgencyColor(leave.daysOverdue)}`}>
                        <Clock className="w-3.5 h-3.5" />
                        {leave.daysOverdue} Days Pending
                      </div>
                    </td>
                    <td className="px-10 py-6">
                       <div className="text-[11px] font-bold text-slate-600">
                          {format(new Date(leave.startDate), 'MMM dd')} - {format(new Date(leave.endDate), 'MMM dd, yyyy')}
                       </div>
                    </td>
                    <td className="px-10 py-6 text-right">
                       {isReadOnly ? (
                         <button 
                          onClick={() => { setSelectedLeave(leave); setModalMode('chain'); }}
                          className="px-4 py-2 bg-slate-50 text-slate-400 border border-slate-100 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white hover:text-slate-600 transition-all"
                         >
                           View Audit
                         </button>
                       ) : (
                         <button 
                          onClick={() => { setSelectedLeave(leave); setModalMode('override_leave'); }}
                          className="px-4 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:shadow-lg hover:shadow-slate-900/20 transition-all"
                         >
                           Executive Decision
                         </button>
                       )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modern Modal Overlays */}
      {(modalMode && (selectedTask || selectedLeave)) && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-lg rounded-[32px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-white">
              <div className="flex items-center gap-3">
                 <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-white shadow-lg">
                    {modalMode === 'resolve' && <UserCheck className="w-5 h-5" />}
                    {modalMode === 'reassign' && <UserPlus className="w-5 h-5" />}
                    {modalMode === 'chain' && <History className="w-5 h-5" />}
                    {modalMode === 'override_leave' && <AlertTriangle className="w-5 h-5" />}
                    {modalMode === 'view_details' && <AlertTriangle className="w-5 h-5" />}
                 </div>
                 <div>
                    <h3 className="text-lg font-black text-slate-900 tracking-tight capitalize">
                      {modalMode === 'chain' ? 'Governance Audit' : modalMode.replace('_', ' ') + ' Escalation'}
                    </h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                       {selectedTask?.title || selectedLeave?.employee?.name + ' - ' + selectedLeave?.type}
                    </p>
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
              {modalMode === 'view_details' && selectedTask && (
                <div className="space-y-6">
                  <div>
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Full Objective Title</h4>
                    <p className="text-sm font-bold text-slate-900 bg-slate-50 border border-slate-100 p-4 rounded-2xl">{selectedTask.title}</p>
                  </div>
                  <div>
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Detailed Context</h4>
                    <p className="text-sm font-bold text-slate-600 bg-slate-50 border border-slate-100 p-4 rounded-2xl min-h-[100px] whitespace-pre-wrap">{selectedTask.description || 'No detailed context provided.'}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                     <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl">
                        <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Assigned By</span>
                        <span className="text-xs font-bold text-slate-900">{selectedTask.assigner?.name || 'System Generated'}</span>
                     </div>
                     <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl">
                        <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Assigned To</span>
                        <span className="text-xs font-bold text-slate-900">{selectedTask.assignee?.name || 'Unassigned'}</span>
                     </div>
                     <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl">
                        <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Date Created</span>
                        <span className="text-xs font-bold text-slate-900">{selectedTask.createdAt ? format(new Date(selectedTask.createdAt), 'MMM dd, yyyy') : 'Unknown'}</span>
                     </div>
                     <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl">
                        <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Days Overdue</span>
                        <span className={`text-xs font-black ${selectedTask.daysOverdue > 7 ? 'text-red-600' : 'text-amber-600'}`}>
                          {selectedTask.daysOverdue} Days 
                        </span>
                     </div>
                  </div>
                </div>
              )}

              {modalMode === 'resolve' && selectedTask && (
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
                    onClick={handleResolveTask}
                    disabled={isSubmitting || !resolutionNotes}
                    className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-sm hover:shadow-xl hover:shadow-slate-900/20 transition-all active:scale-[0.98] disabled:opacity-50"
                  >
                    {isSubmitting ? 'Processing Closure...' : 'Sign Off & Resolve'}
                  </button>
                </div>
              )}

              {modalMode === 'override_leave' && selectedLeave && (
                <div className="space-y-6">
                   <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
                    <p className="text-xs font-bold text-amber-800 leading-relaxed">
                      Executive override for {selectedLeave.employee?.name}'s leave request. This decision finalizes the institutional response.
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Decision Notes</label>
                    <textarea 
                      value={resolutionNotes}
                      onChange={(e) => setResolutionNotes(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-medium focus:ring-2 focus:ring-slate-900/20 focus:border-slate-900 transition-all outline-none"
                      placeholder="Ex: Approved due to medical urgency or Rejected due to critical project phase..."
                      rows={3}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <button 
                      onClick={() => handleOverrideLeave('approve')}
                      disabled={isSubmitting || !resolutionNotes}
                      className="bg-emerald-600 text-white py-4 rounded-2xl font-black text-sm hover:bg-emerald-700 transition-all disabled:opacity-50 shadow-lg shadow-emerald-500/20"
                    >
                      Institutional Approval
                    </button>
                    <button 
                      onClick={() => handleOverrideLeave('reject')}
                      disabled={isSubmitting || !resolutionNotes}
                      className="bg-red-600 text-white py-4 rounded-2xl font-black text-sm hover:bg-red-700 transition-all disabled:opacity-50 shadow-lg shadow-red-500/20"
                    >
                      Executive Rejection
                    </button>
                  </div>
                </div>
              )}

              {modalMode === 'reassign' && selectedTask && (
                <div className="space-y-6">
                   <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-2xl">
                     <div className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Current Chain</div>
                     <div className="flex items-center gap-2 text-sm font-bold text-indigo-900 text-center">
                        <span>{selectedTask?.assignee?.name}</span>
                        <ArrowRight className="w-4 h-4" />
                        <span className="text-indigo-400 ">Select Successor</span>
                     </div>
                   </div>
                   
                   <div>
                     <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Institutional Successor</label>
                     {deptLoading ? (
                       <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-200 animate-pulse">
                         <div className="w-4 h-4 rounded-full bg-indigo-400 animate-bounce"></div>
                         <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Scanning Roster...</span>
                       </div>
                     ) : (
                       <select 
                        value={targetAssignee}
                        onChange={(e) => setTargetAssignee(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-black focus:ring-2 focus:ring-indigo-600/10 outline-none appearance-none"
                       >
                         <option value="">Select an available employee</option>
                         {deptUsers.filter(u => u.uid !== selectedTask.assignee.uid).map(u => (
                           <option key={u.uid} value={u.uid}>{u.name} ({u.role})</option>
                         ))}
                       </select>
                     )}
                   </div>

                   <button 
                    onClick={handleReassignTask}
                    disabled={isSubmitting || !targetAssignee}
                    className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-sm hover:shadow-xl hover:shadow-slate-900/20 transition-all active:scale-[0.98] disabled:opacity-50"
                  >
                    {isSubmitting ? 'Transferring Ownership...' : 'Authorize Reassignment'}
                  </button>
                </div>
              )}

              {modalMode === 'chain' && (selectedTask || selectedLeave) && (
                <div className="space-y-8 py-4">
                  {[
                    { role: 'Employee', name: selectedTask?.assignee?.name || selectedLeave?.employee?.name, status: 'Deadline Missed', date: `${selectedTask?.daysOverdue || selectedLeave?.daysOverdue} Days Ago`, color: 'red' },
                    { role: 'Dept Admin', name: selectedTask?.deptAdmin?.name || selectedLeave?.deptAdmin?.name, status: 'Inaction Period Passed', date: 'Escalated', color: 'amber' },
                    { role: 'CEO', name: 'Academic CEO', status: 'Executive Oversight', date: 'Now', color: 'slate' }
                  ].map((step, idx, arr) => (
                    <div key={idx} className="relative flex items-center gap-6">
                       {idx !== arr.length - 1 && (
                         <div className="absolute left-6 top-10 w-0.5 h-10 bg-slate-100" />
                       )}
                       <div className={`w-12 h-12 rounded-2xl ${idx === 0 ? 'bg-red-50 border-red-100 text-red-600' : idx === 1 ? 'bg-amber-50 border-amber-100 text-amber-600' : 'bg-slate-900 text-white'} border flex items-center justify-center z-10 shadow-sm`}>
                          {idx === 0 && <UserPlus className="w-5 h-5" />}
                          {idx === 1 && <UserCheck className="w-5 h-5" />}
                          {idx === 2 && <TrendingUp className="w-5 h-5" />}
                       </div>
                       <div>
                          <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{step.role}</div>
                          <div className="text-sm font-black text-slate-900">{step.name || 'Unassigned'}</div>
                          <div className={`text-[10px] font-bold ${idx === 0 ? 'text-red-500' : idx === 1 ? 'text-amber-500' : 'text-slate-500'} mt-1 uppercase tracking-tighter`}>
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
      , document.body)}

    </div>
  );
}
