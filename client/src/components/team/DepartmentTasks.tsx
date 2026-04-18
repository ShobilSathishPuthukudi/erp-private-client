import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { DataTable } from '@/components/shared/DataTable';
import { Modal } from '@/components/shared/Modal';
import type { ColumnDef } from '@tanstack/react-table';
import { Plus, Edit2, Trash2, ClipboardList, X, Share2, Printer, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import { useAuthStore } from '@/store/authStore';
import { getNormalizedRole } from '@/lib/roles';
import { downloadCSV } from '@/lib/exportUtils';

interface TeamMember {
  uid: string;
  name: string;
  role?: string;
  deptId?: number | string;
  status?: string;
}

interface Task {
  id: number;
  assignedTo: string;
  assignedBy: string;
  title: string;
  deadline: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'in_progress' | 'completed' | 'overdue';
  assignee?: TeamMember;
  createdAt: string;
  isOverdue?: boolean;
  isEscalated?: boolean;
  isDeptAdminReview?: boolean;
  overdueLabel?: string | null;
  escalationLevel?: 'EMPLOYEE' | 'DEPT_ADMIN' | 'CEO';
  deptAdminDecision?: 'PENDING_REVIEW' | 'GRACE_GRANTED' | 'ESCALATED_TO_CEO' | null;
  deptAdminGraceUntil?: string | null;
}

export default function Tasks() {
  const user = useAuthStore((state) => state.user);
  const currentRole = getNormalizedRole(user?.role || '');
  const isCEO = currentRole === 'ceo';
  const isHR = currentRole === 'hr';
  const isOpsOrAcad = currentRole === 'operations' || currentRole === 'organization admin';
  
  const [tasks, setTasks] = useState<Task[]>([]);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'received' | 'issued'>(isCEO ? 'issued' : 'issued');

  const { register, handleSubmit, reset, watch, formState: { errors, isSubmitting } } = useForm();
  const watchAllFields = watch();

  const isFormValid =
    !!watchAllFields.title?.trim() &&
    (editingTask ? true : !!watchAllFields.assignedTo) &&
    !!watchAllFields.deadline &&
    !!watchAllFields.priority &&
    (!editingTask || !!watchAllFields.remarks?.trim());

  const fetchData = async () => {
    // Oversight Logic: Only restrict if non-global role lacks department.
    const isGlobal = isCEO || ['Organization Admin', 'system-admin', 'operations', 'academic'].includes(currentRole);
    if (!user?.deptId && !isGlobal) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const teamEndpoint = isCEO ? '/ceo/roster' : '/dept-admin/team';
      const [tasksRes, teamRes] = await Promise.all([
        api.get('/dept-admin/tasks', {
          params: {
            departmentId: user?.deptId,
            subDepartmentId: user?.subDepartment // Mapping to subDepartment scope
          }
        }),
        api.get(teamEndpoint).catch(() => ({ data: [] }))
      ]);
      
      let teamData = teamRes.data;
      if (isCEO && teamRes.data?.users) {
        teamData = teamRes.data.users;
      }
      
      setTasks(Array.isArray(tasksRes.data) ? tasksRes.data : []);
      setTeam(Array.isArray(teamData) ? teamData : []);
    } catch (error) {
      console.error('[TASKS-FETCH-ERROR]:', error);
      setTasks([]);
      setTeam([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user?.deptId]);

  const openCreateModal = () => {
    setEditingTask(null);
    const hrAdmin = isCEO ? team.find(t => t.role?.toLowerCase()?.includes('hr admin') || t.role?.toLowerCase()?.includes('human resources')) : null;
    reset({ 
      title: '', 
      assignedTo: hrAdmin?.uid || (isCEO ? 'HR-SYSTEM' : ''), 
      deadline: new Date().toISOString().split('T')[0], 
      priority: 'medium',
      status: 'pending'
    });
    setIsModalOpen(true);
  };

  const openEditModal = (task: Task) => {
    setEditingTask(task);
    reset({
      title: task.title,
      assignedTo: task.assignedTo,
      deadline: task.deadline ? new Date(task.deadline).toISOString().split('T')[0] : '',
      priority: task.priority,
      status: task.status,
      remarks: ''
    });
    setIsModalOpen(true);
  };

  const onSubmit = async (data: any) => {
    try {
      // Step 8: Ensure tasks are scoped by department/sub-department
      const payload = {
          ...data,
          departmentId: user?.deptId,
          subDepartmentId: user?.subDepartment,
          ...(editingTask ? { remarks: data.remarks } : {})
      };

      if (editingTask) {
        await api.put(`/dept-admin/tasks/${editingTask.id}`, payload);
        toast.success('Task updated successfully');
      } else {
        await api.post('/dept-admin/tasks', payload);
        toast.success('Task assigned successfully');
      }
      setIsModalOpen(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Operation failed');
    }
  };

  const handleDelete = (id: number) => {
    setTaskToDelete(id);
  };

  const handleDeptAction = async (id: number, action: 'grace' | 'escalate') => {
    try {
      await api.put(`/dept-admin/tasks/${id}/${action}`);
      toast.success(action === 'grace' ? '24-hour grace period granted' : 'Task escalated to CEO');
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || `Failed to ${action} task`);
    }
  };

  const confirmDelete = async () => {
    if (!taskToDelete) return;
    try {
      await api.delete(`/dept-admin/tasks/${taskToDelete}`);
      toast.success('Institutional directive terminated', {
        icon: '🗑️',
        className: 'font-bold uppercase text-[10px] tracking-widest'
      });
      setTaskToDelete(null);
      fetchData();
    } catch (error) {
      toast.error('Failed to terminate task directive');
    }
  };

  const columns: ColumnDef<Task>[] = [
    { 
      accessorKey: 'title', 
      header: 'Task Title',
      cell: ({ row }) => <span className="font-semibold text-slate-900">{row.original.title}</span>
    },
    { 
      id: 'assignee', 
      header: 'Assigned To',
      cell: ({ row }) => {
        const emp = row.original.assignee;
        return emp ? 
          <span className="text-slate-700">{emp.name}</span> : 
          <span className="text-slate-400 ">User {row.original.assignedTo}</span>;
      }
    },
    { 
      accessorKey: 'deadline', 
      header: 'Deadline',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
           {row.original.isOverdue && (
             <span className={`w-2 h-2 rounded-full ${row.original.isEscalated ? 'bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.8)]' : 'bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]'}`} />
           )}
           <span className={`${row.original.isOverdue ? 'text-red-600 font-black' : 'text-slate-600'}`}>
             {new Date(row.original.deadline).toLocaleDateString()}
           </span>
        </div>
      )
    },
    { 
      accessorKey: 'priority', 
      header: 'Priority',
      cell: ({ row }) => {
        const p = row.original.priority;
        let color = 'bg-slate-100 text-slate-700';
        if (p === 'low') color = 'bg-blue-50 text-blue-700';
        if (p === 'medium') color = 'bg-yellow-50 text-yellow-700';
        if (p === 'high') color = 'bg-orange-100 text-orange-700';
        if (p === 'urgent') color = 'bg-red-100 text-red-700 font-bold';
        return <span className={`px-2 py-1 text-[10px] rounded-sm uppercase ${color}`}>{p}</span>;
      }
    },
    { 
      accessorKey: 'status', 
      header: 'Status',
      cell: ({ row }) => {
        const s = row.original.status;
        const isEscalated = row.original.isEscalated;
        const isOverdue = row.original.isOverdue;

        let color = 'bg-slate-100 text-slate-700';
        let label = s.replace('_', ' ').toUpperCase();

        if (isEscalated) {
          color = 'bg-purple-100 text-purple-700 font-black ring-2 ring-purple-500/20';
          label = 'ESCALATED TO CEO';
        } else if (row.original.isDeptAdminReview) {
          color = 'bg-amber-100 text-amber-700 font-black ring-2 ring-amber-500/20';
          label = row.original.deptAdminDecision === 'GRACE_GRANTED' ? 'GRACE GRANTED' : 'DEPT ADMIN REVIEW';
        } else if (isOverdue) {
          color = 'bg-red-100 text-red-700 font-black ring-2 ring-red-500/20';
          label = 'OVERDUE (RED FLAG)';
        } else if (s === 'completed') {
          color = 'bg-green-100 text-green-700';
        } else if (s === 'in_progress') {
          color = 'bg-blue-100 text-blue-700';
        }
        
        return (
          <div className="flex flex-col gap-1">
            <span className={`px-2.5 py-1 text-[10px] rounded-full text-center transition-all ${color}`}>
              {label}
            </span>
            {isOverdue && !isEscalated && (
              <span className="text-[8px] text-red-400 font-bold uppercase tracking-tighter text-center">
                {row.original.deptAdminDecision === 'GRACE_GRANTED' && row.original.deptAdminGraceUntil
                  ? `Grace Until ${new Date(row.original.deptAdminGraceUntil).toLocaleString()}`
                  : 'Dept Admin Window: 24H'}
              </span>
            )}
          </div>
        );
      }
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const task = row.original;
        const canReviewEscalation = task.isOverdue && !task.isEscalated;
        return (
          <div className="flex items-center space-x-2">
            {canReviewEscalation && (
              <>
                <button
                  onClick={() => handleDeptAction(task.id, 'grace')}
                  className="px-2 py-1 text-[10px] font-black uppercase rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors"
                  title="Grant 24-hour grace"
                >
                  Grace 24H
                </button>
                <button
                  onClick={() => handleDeptAction(task.id, 'escalate')}
                  className="px-2 py-1 text-[10px] font-black uppercase rounded-lg bg-purple-50 text-purple-700 hover:bg-purple-100 transition-colors"
                  title="Escalate directly to CEO"
                >
                  CEO
                </button>
              </>
            )}
            <button onClick={() => openEditModal(task)} className="p-1 hover:bg-slate-100 rounded text-slate-600 transition-colors">
              <Edit2 className="w-4 h-4" />
            </button>
            <button onClick={() => handleDelete(task.id)} className="p-1 hover:bg-red-50 rounded text-red-600 transition-colors">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        );
      }
    }
  ];

  const receivedTasks = tasks.filter(t => t.assignedBy !== user?.uid);
  const issuedTasks = tasks.filter(t => t.assignedBy === user?.uid);
  const filteredTasks = activeTab === 'received' ? receivedTasks : issuedTasks;

  return (
    <div className="p-2 space-y-6 flex flex-col h-[calc(100vh-8rem)]">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white px-6 py-5 rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50 gap-6 shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center text-white shadow-lg shadow-slate-900/20 shrink-0">
            <ClipboardList className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight leading-tight mb-0.5">Task management</h1>
            <p className="text-slate-500 font-medium text-sm">
            {activeTab === 'received' 
              ? 'Institutional directives and priority tasks assigned to you by senior management.' 
              : 'Assign, monitor, and update the status of your team\'s ongoing deliverables.'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 mr-2 border-r border-slate-200 pr-4">
             <button 
               onClick={() => {
                 navigator.clipboard.writeText(window.location.href);
                 toast.success('Tasks dashboard link copied to clipboard');
               }}
               className="p-2.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all active:scale-95"
               title="Share Tasks"
             >
               <Share2 className="w-5 h-5" />
             </button>
             <button 
               onClick={() => window.print()}
               className="p-2.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all active:scale-95"
               title="Print Tasks"
             >
               <Printer className="w-5 h-5" />
             </button>
             <button 
               onClick={() => {
                 const exportData = tasks.map(t => ({
                   'Task ID': t.id,
                   'Subject': t.title,
                   'Assigned To': t.assignee?.name || t.assignedTo,
                   'Deadline': new Date(t.deadline).toLocaleDateString(),
                   'Priority': t.priority.toUpperCase(),
                   'Status': t.status.toUpperCase(),
                   'Created At': new Date(t.createdAt).toLocaleDateString()
                 }));
                 downloadCSV(exportData, 'departmental_tasks');
                 toast.success('Tasks exported successfully');
               }}
               className="p-2.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all active:scale-95"
               title="Export Tasks"
             >
               <Download className="w-5 h-5" />
             </button>
          </div>
          {(tasks.length > 0 || !isLoading) && (
            <button 
               onClick={openCreateModal}
               className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-black text-sm transition-all shadow-lg shadow-blue-600/20 active:scale-95 group"
            >
               <Plus className="w-4 h-4 group-hover:rotate-12 transition-transform" />
               Assign New Task
            </button>
          )}
        </div>
      </div>

      {/* Modern Tab Bar - Hidden for CEO as only one tab exists */}
      {!isCEO && (
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl w-fit shrink-0 border border-slate-200/50">
          <button
            onClick={() => setActiveTab('received')}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest transition-all duration-300 ${
              activeTab === 'received'
                ? 'bg-white text-slate-900 shadow-lg shadow-slate-200 border border-slate-200'
                : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
            }`}
          >
            Institutional Directives
            <span className={`ml-1 px-1.5 py-0.5 rounded-md text-[10px] ${
              activeTab === 'received' ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-600'
            }`}>
              {receivedTasks.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('issued')}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest transition-all duration-300 ${
              activeTab === 'issued'
                ? 'bg-white text-slate-900 shadow-lg shadow-slate-200 border border-slate-200'
                : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
            }`}
          >
            Team Assignments
            <span className={`ml-1 px-1.5 py-0.5 rounded-md text-[10px] ${
              activeTab === 'issued' ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-600'
            }`}>
              {issuedTasks.length}
            </span>
          </button>
        </div>
      )}

      {filteredTasks.length === 0 && !isLoading ? (
        <div className="flex-1 flex items-center justify-center bg-white shadow-xl shadow-slate-200/50 border border-slate-200 rounded-[2rem]">
          <div className="text-center p-12 max-w-md">
             <div className="w-20 h-20 bg-slate-50 rounded-[2rem] flex items-center justify-center mx-auto mb-6 border border-slate-100">
                <ClipboardList className="w-10 h-10 text-slate-200" />
             </div>
             <h4 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em] mb-2">
               {activeTab === 'received' ? 'No incoming directives' : 'No team assignments'}
             </h4>
             <p className="text-xs text-slate-400 font-medium leading-relaxed mb-6">
               {activeTab === 'received' 
                 ? 'You haven\'t received any external task assignments for this department yet.' 
                 : 'You haven\'t issued any task directives to your departmental team.'}
             </p>
             {activeTab === 'issued' && (
               <button 
                 onClick={openCreateModal}
                 className="text-xs font-black text-blue-600 hover:text-blue-700 uppercase tracking-widest decoration-2 underline-offset-4 hover:underline transition-all"
               >
                 Assign First Directive
               </button>
             )}
          </div>
        </div>
      ) : (
        <div className="flex-1 min-h-0 bg-white shadow-xl shadow-slate-200/50 border border-slate-200 rounded-[2rem] flex flex-col overflow-hidden">
          <DataTable 
            columns={columns} 
            data={filteredTasks} 
            isLoading={isLoading} 
            searchKey="title" 
            searchPlaceholder={`Search ${activeTab === 'received' ? 'directives' : 'assignments'}...`} 
          />
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} hideHeader={true}>
        <div className="bg-white overflow-hidden transition-all duration-300 flex flex-col max-h-[calc(100vh-160px)]">
          <div className="bg-slate-900 p-6 text-white flex justify-between items-center shrink-0 relative border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2 rounded-xl backdrop-blur-md">
                <ClipboardList className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest leading-none mb-1">
                  Task Assignment
                </p>
                <h2 className="text-xl font-bold tracking-tight">
                  {editingTask ? 'Edit Task Directive' : 'Assign New Task'}
                </h2>
              </div>
            </div>
            <button 
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-lg transition-all hover:scale-110 active:scale-90 text-white/60 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-8 space-y-6 min-h-0 custom-scrollbar">
            <div>
              <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Task Title / Description</label>
              <input
                {...register('title', { required: 'Title is required' })}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900 transition-all font-medium text-slate-900"
                placeholder="Complete Q3 Financial Audit Review"
              />
              {errors.title && <p className="text-red-500 text-xs mt-1 ml-1">{errors.title?.message as string}</p>}
            </div>

          {!editingTask && (
            <div>
              {isCEO ? (
                <>
                   <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">
                     Assign To (Locked by Executive Policy)
                   </label>
                   <div className="w-full px-4 py-3 bg-slate-100 border border-slate-200 rounded-xl font-bold text-slate-400 flex items-center justify-between opacity-80 cursor-not-allowed">
                     <span>Human Resources Administration</span>
                     <span className="text-[10px] bg-slate-200 px-2 py-0.5 rounded-sm uppercase tracking-widest text-slate-500">System Routed</span>
                   </div>
                   {/* Ghost input to satisfy React Hook Form validation seamlessly */}
                   <input type="hidden" {...register('assignedTo', { required: 'HR Assignee could not be resolved from DB roster' })} />
                </>
              ) : (
                <>
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">
                     {isHR ? 'Assign To (HR Personnel Only)' :
                      isOpsOrAcad ? 'Assign To (Sub-Dept Admins & Team)' : 
                      'Assign To (Department Personnel)'}
                  </label>
                  <select
                    {...register('assignedTo', { required: 'Assignee is required' })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900 transition-all font-bold text-slate-900"
                  >
                    <option value="">-- Select Assignee --</option>
                    {team.filter(t => {
                      if (t.uid === user?.uid) return false;
                      if (t.status !== 'active') return false;
                      return t.role === "Employee" && String(t.deptId) === String(user?.deptId);
                    }).map((t) => (
                      <option key={t.uid} value={t.uid}>{t.name} ({t.role || 'Personnel'})</option>
                    ))}
                  </select>
                </>
              )}
              {errors.assignedTo && <p className="text-red-500 text-xs mt-1 ml-1">{errors.assignedTo.message as string}</p>}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Deadline Date</label>
              <input
                type="date"
                {...register('deadline', { required: 'Deadline is required' })}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900 transition-all font-medium text-slate-900"
              />
              {errors.deadline && <p className="text-red-500 text-xs mt-1 ml-1">{errors.deadline.message as string}</p>}
            </div>
            
            <div>
              <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Priority</label>
              <select
                {...register('priority')}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900 transition-all font-bold text-slate-900"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>

          {editingTask && (
            <>
              <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Task Status</label>
                <select
                  {...register('status')}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900 transition-all font-bold text-slate-900"
                >
                  <option value="pending">Pending</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">
                  Status Remarks <span className="text-rose-500">*</span>
                </label>
                <textarea
                  {...register('remarks', { required: 'Remarks are required when updating status' })}
                  rows={2}
                  placeholder="Describe the status change reason..."
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900 transition-all font-medium text-slate-900 resize-none"
                />
                {errors.remarks && <p className="text-red-500 text-xs mt-1 ml-1">{errors.remarks.message as string}</p>}
              </div>
            </>
          )}
          </div>

          <div className="flex justify-end gap-3 p-8 bg-slate-50 border-t border-slate-200 shrink-0">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-8 py-3.5 bg-white text-slate-600 font-bold text-xs uppercase tracking-widest rounded-2xl border border-slate-200 hover:bg-slate-50 hover:scale-105 active:scale-95 transition-all shadow-sm"
            >
              Cancel Setup
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !isFormValid}
              className="px-8 py-3.5 bg-slate-900 text-white font-bold text-xs uppercase tracking-widest rounded-2xl shadow-xl shadow-slate-900/10 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:active:scale-100"
            >
               {isSubmitting ? 'Processing...' : (editingTask ? 'Save Updates' : 'Assign Directive')}
            </button>
          </div>
        </form>
       </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal 
        isOpen={!!taskToDelete} 
        onClose={() => setTaskToDelete(null)} 
        title="Termination protocol"
        maxWidth="md"
      >
        <div className="p-6 text-center space-y-6">
          <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto ring-8 ring-red-50/50">
            <Trash2 className="w-10 h-10 text-red-600" />
          </div>
          <div>
            <h4 className="font-black text-slate-900 uppercase tracking-tight text-xl mb-3">Confirm Deletion</h4>
            <p className="text-sm text-slate-500 font-medium max-w-3xl leading-relaxed mb-10">
              Are you sure you want to terminate this operational directive? This action is permanent and will be logged in the audit trail.
            </p>
          </div>
          <div className="flex gap-4 pt-4">
            <button 
              onClick={() => setTaskToDelete(null)}
              className="flex-1 px-6 py-3 bg-white border border-slate-200 text-slate-600 font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-slate-50 transition-all"
            >
              Abandom
            </button>
            <button 
              onClick={confirmDelete}
              className="flex-1 px-6 py-3 bg-red-600 text-white font-black text-[10px] uppercase tracking-widest rounded-xl shadow-lg shadow-red-600/20 hover:bg-red-700 transition-all active:scale-95"
            >
              Terminate
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
