import { useState, useEffect, useCallback } from 'react';
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
  assigner?: TeamMember;
  createdAt: string;
  isOverdue?: boolean;
  isEscalated?: boolean;
  isDeptAdminReview?: boolean;
  overdueLabel?: string | null;
  escalationLevel?: 'EMPLOYEE' | 'DEPT_ADMIN' | 'CEO';
  deptAdminDecision?: 'PENDING_REVIEW' | 'GRACE_GRANTED' | 'ESCALATED_TO_CEO' | null;
  deptAdminGraceUntil?: string | null;
}

interface TaskFormValues {
  title: string;
  assignedTo: string;
  deadline: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
}

const getErrorMessage = (error: unknown, fallback: string) => {
  if (
    typeof error === 'object' &&
    error !== null &&
    'response' in error &&
    typeof (error as { response?: unknown }).response === 'object' &&
    (error as { response?: { data?: unknown } }).response?.data &&
    typeof (error as { response?: { data?: { error?: unknown } } }).response?.data?.error === 'string'
  ) {
    return (error as { response?: { data?: { error?: string } } }).response?.data?.error || fallback;
  }

  return fallback;
};

const isAssignableDepartmentMember = ({
  member,
  currentUserUid,
  currentDeptId,
  hrMode,
}: {
  member: TeamMember;
  currentUserUid?: string;
  currentDeptId?: number | string;
  hrMode: boolean;
}) => {
  if (member.uid === currentUserUid) return false;
  if (member.status !== 'active') return false;
  if (String(member.deptId) !== String(currentDeptId)) return false;

  if (hrMode) {
    return ['Employee', 'HR'].includes(member.role || '');
  }

  return member.role === 'Employee';
};

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
  const [actionToConfirm, setActionToConfirm] = useState<{ id: number, action: 'grace' | 'escalate' } | null>(null);
  const [graceInfoTask, setGraceInfoTask] = useState<Task | null>(null);
  const [viewingTask, setViewingTask] = useState<Task | null>(null);
  const [activeTab, setActiveTab] = useState<'received' | 'issued'>('issued');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'completed' | 'resolved' | 'escalated' | 'granted'>('all');

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<TaskFormValues>();

  const fetchData = useCallback(async () => {
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
  }, [currentRole, isCEO, user?.deptId, user?.subDepartment]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      fetchData();
    }, 10000);

    return () => window.clearInterval(intervalId);
  }, [fetchData]);

  const openCreateModal = () => {
    setEditingTask(null);
    const hrAdmin = isCEO ? team.find(t => t.role?.toLowerCase()?.includes('hr admin') || t.role?.toLowerCase()?.includes('human resources')) : null;
    reset({ 
      title: '', 
      assignedTo: hrAdmin?.uid || (isCEO ? 'HR-SYSTEM' : ''), 
      deadline: new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0], 
      priority: 'medium'
    });
    setIsModalOpen(true);
  };

  const openEditModal = (task: Task) => {
    setEditingTask(task);
    reset({
      title: task.title,
      assignedTo: task.assignedTo,
      deadline: task.deadline ? new Date(task.deadline).toISOString().split('T')[0] : '',
      priority: task.priority
    });
    setIsModalOpen(true);
  };

  const onSubmit = async (data: TaskFormValues) => {
    try {
      // Step 8: Ensure tasks are scoped by department/sub-department
      const payload = {
          ...data,
          departmentId: user?.deptId,
          subDepartmentId: user?.subDepartment
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
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Operation failed'));
    }
  };

  const handleDelete = (id: number) => {
    setTaskToDelete(id);
  };

  const confirmDeptAction = async () => {
    if (!actionToConfirm) return;
    try {
      const { id, action } = actionToConfirm;
      await api.put(`/dept-admin/tasks/${id}/${action}`);
      toast.success(action === 'grace' ? '24-hour grace period granted' : 'Task escalated to CEO');
      fetchData();
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, `Failed to ${actionToConfirm.action} task`));
    } finally {
      setActionToConfirm(null);
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
    } catch {
      toast.error('Failed to terminate task directive');
    }
  };

  const columns: ColumnDef<Task>[] = [
    { 
      accessorKey: 'title', 
      header: 'Task Title',
      cell: ({ row }) => {
        const title = row.original.title || '';
        return (
          <span 
            className="font-black text-slate-900 cursor-pointer hover:text-[var(--theme-accent)] transition-all underline decoration-slate-200 underline-offset-4 hover:decoration-[var(--theme-accent)]" 
            title={title}
            onClick={() => setViewingTask(row.original)}
          >
            {title.length > 12 ? `${title.substring(0, 12)}...` : title}
          </span>
        );
      }
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
        let color = 'bg-slate-100 text-slate-700';
        const label = s.replace('_', ' ').toUpperCase();

        if (s === 'completed') {
          color = 'bg-green-100 text-green-700';
        } else if (s === 'resolved_by_ceo') {
          color = 'bg-purple-100 text-purple-700 font-bold';
        } else if (s === 'in_progress') {
          color = 'bg-blue-100 text-blue-700';
        }
        
        return (
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-center gap-2">
              <span className={`px-2.5 py-1 text-[10px] rounded-full text-center transition-all ${color}`}>
                {label}
              </span>
              {row.original.isOverdue && row.original.status !== 'completed' && row.original.status !== 'resolved_by_ceo' && (
                <span className={`px-2 py-1 text-[9px] font-black uppercase tracking-widest rounded-lg ${
                  row.original.isEscalated
                    ? 'bg-purple-50 text-purple-700 ring-1 ring-purple-100'
                    : 'bg-red-50 text-red-600 ring-1 ring-red-100'
                }`}>
                  Overdue
                </span>
              )}
            </div>
          </div>
        );
      }
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const task = row.original;
        const isAssignedByCEO = task.assigner?.role?.toLowerCase()?.includes('ceo');
        const canReviewEscalation = task.isOverdue && !task.isEscalated && !isAssignedByCEO;
        const isGraceActive = task.deptAdminDecision === 'GRACE_GRANTED' && 
                              task.deptAdminGraceUntil && 
                              new Date(task.deptAdminGraceUntil) > new Date();
                              
        return (
          <div className="flex items-center space-x-2">
            {task.isEscalated && (
              <span className="px-2 py-1 text-[10px] font-black uppercase rounded-lg bg-red-50 text-red-700 ring-1 ring-red-100 shrink-0">
                Escalated
              </span>
            )}
            {canReviewEscalation && (
              <>
                {task.deptAdminDecision === 'GRACE_GRANTED' ? (
                  <button
                    onClick={(e) => { e.stopPropagation(); setGraceInfoTask(task); }}
                    className="px-2 py-1 text-[10px] font-black uppercase rounded-lg bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 transition-colors"
                    title="View grace period details"
                  >
                    Granted
                  </button>
                ) : !task.isInstitutionalHandover ? (
                  <button
                    onClick={(e) => { e.stopPropagation(); setActionToConfirm({ id: task.id, action: 'grace' }); }}
                    className="px-2 py-1 text-[10px] font-black uppercase rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors"
                    title="Grant 24-hour grace"
                  >
                    Grace 24H
                  </button>
                ) : null}
                <button
                  onClick={(e) => { e.stopPropagation(); setActionToConfirm({ id: task.id, action: 'escalate' }); }}
                  disabled={!!isGraceActive}
                  className={`px-2 py-1 text-[10px] font-black uppercase rounded-lg transition-colors ${
                    isGraceActive 
                      ? 'bg-slate-50 text-slate-400 cursor-not-allowed border border-slate-200' 
                      : 'bg-purple-50 text-purple-700 hover:bg-purple-100'
                  }`}
                  title={task.isInstitutionalHandover ? 'Policy: Handover tasks escalate directly to CEO' : isGraceActive ? 'Escalation locked during active grace period' : 'Escalate directly to CEO'}
                >
                  CEO
                </button>
              </>
            )}
            <button 
              onClick={(e) => { e.stopPropagation(); openEditModal(task); }} 
              disabled={task.isEscalated || task.deptAdminDecision === 'GRACE_GRANTED' || ['completed', 'reassigned_escalated', 'resolved_by_ceo'].includes(task.status)}
              className={`p-1 rounded transition-colors ${
                (task.isEscalated || task.deptAdminDecision === 'GRACE_GRANTED' || ['completed', 'reassigned_escalated', 'resolved_by_ceo'].includes(task.status))
                  ? 'opacity-50 cursor-not-allowed text-slate-400'
                  : activeTab === 'received' ? 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100' : 'hover:bg-slate-100 text-slate-600'
              }`}
              title={
                task.isEscalated ? 'Governance Lock: Escalated tasks cannot be modified' :
                task.deptAdminDecision === 'GRACE_GRANTED' ? 'Governance Lock: Modifications restricted during grace period' :
                ['completed', 'reassigned_escalated', 'resolved_by_ceo'].includes(task.status) ? 'Governance Lock: Finalized tasks cannot be modified' :
                activeTab === 'received' ? 'Reassign to team member' : 'Edit task details'
              }
            >
              {activeTab === 'received' ? <Share2 className="w-4 h-4" /> : <Edit2 className="w-4 h-4" />}
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); handleDelete(task.id); }} 
              disabled={task.isEscalated || task.deptAdminDecision === 'GRACE_GRANTED' || ['completed', 'reassigned_escalated', 'resolved_by_ceo'].includes(task.status)}
              className={`p-1 rounded transition-colors ${
                (task.isEscalated || task.deptAdminDecision === 'GRACE_GRANTED' || ['completed', 'reassigned_escalated', 'resolved_by_ceo'].includes(task.status))
                  ? 'opacity-50 cursor-not-allowed text-slate-400'
                  : 'hover:bg-red-50 text-red-600'
              }`}
              title={
                task.isEscalated ? 'Governance Lock: Escalated tasks cannot be terminated' :
                task.deptAdminDecision === 'GRACE_GRANTED' ? 'Governance Lock: Termination restricted during grace period' :
                ['completed', 'reassigned_escalated', 'resolved_by_ceo'].includes(task.status) ? 'Governance Lock: Finalized tasks cannot be terminated' :
                'Terminate task directive'
              }
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        );
      }
    }
  ];

  const receivedTasks = tasks.filter(t => t.assignedTo === user?.uid);
  const issuedTasks = tasks.filter(t => t.assignedBy === user?.uid);
  
  const filteredTasks = (activeTab === 'received' ? receivedTasks : issuedTasks).filter(t => {
    if (statusFilter === 'all') return true;
    if (statusFilter === 'pending') return t.status === 'pending' || t.status === 'in_progress' || t.status === 'overdue';
    if (statusFilter === 'completed') return t.status === 'completed';
    if (statusFilter === 'resolved') return t.status === 'resolved_by_ceo';
    if (statusFilter === 'escalated') return t.isEscalated;
    if (statusFilter === 'granted') return t.deptAdminDecision === 'GRACE_GRANTED';
    return true;
  });

  return (
    <div className="p-2 space-y-6 flex flex-col h-[calc(100vh-8rem)]">
      
      {/* Dynamic Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white px-8 py-6 rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/40 gap-6 shrink-0">
        <div className="flex items-center gap-5">
          <div className="w-14 h-14 rounded-2xl bg-slate-900 flex items-center justify-center text-white shadow-lg shadow-slate-900/20 shrink-0">
            <ClipboardList className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight leading-tight mb-1">
              {activeTab === 'received' ? 'Institutional Directives' : 'Departmental Oversight'}
            </h1>
            <p className="text-slate-500 font-medium text-xs">
              Strategic execution and monitoring of institutional mandates.
            </p>
          </div>
        </div>



        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-slate-50 p-1.5 rounded-2xl border border-slate-100 mr-2">
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
        <div className="flex items-center justify-between gap-4 w-full px-4">
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl w-fit shrink-0 border border-slate-200/50">
            <button
              onClick={() => setActiveTab('received')}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest transition-all duration-300 ${
                activeTab === 'received'
                  ? 'bg-white text-slate-900 shadow-lg shadow-slate-200 border border-slate-200'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
              }`}
            >
              Directives
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
              Assignments
              <span className={`ml-1 px-1.5 py-0.5 rounded-md text-[10px] ${
                activeTab === 'issued' ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-600'
              }`}>
                {issuedTasks.length}
              </span>
            </button>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Status Filter:</span>
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="bg-white border border-slate-200 text-slate-900 text-[11px] font-bold px-4 py-2 rounded-xl focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900 transition-all outline-none min-w-[160px]"
            >
              <option value="all">All Mandates</option>
              <option value="pending">Active Pending</option>
              <option value="completed">Employee Completed</option>
              <option value="resolved">CEO Resolved</option>
              <option value="escalated">Currently Escalated</option>
              <option value="granted">Grace Period Granted</option>
            </select>
          </div>
        </div>
      )}

      {filteredTasks.length === 0 && !isLoading ? (
        <div className="flex-1 flex items-center justify-center bg-white shadow-xl shadow-slate-200/40 border border-slate-100 rounded-[2rem]">
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
        <div className="flex-1 min-h-0 bg-white shadow-xl shadow-slate-200/40 border border-slate-100 rounded-[2rem] flex flex-col overflow-hidden">
          <DataTable 
            columns={columns} 
            data={filteredTasks} 
            isLoading={isLoading} 
            searchKey="title" 
            searchPlaceholder={`Search ${activeTab === 'received' ? 'directives' : 'assignments'}...`} 
            onRowClick={(task) => setViewingTask(task)}
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
                {...register('title', { 
                  required: 'Title/Description is required',
                  minLength: { value: 6, message: 'Must be between 6 and 100 characters' },
                  maxLength: { value: 100, message: 'Must be between 6 and 100 characters' }
                })}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900 transition-all font-medium text-slate-900"
                placeholder="Complete Q3 Financial Audit Review"
              />
              {errors.title && <p className="text-red-500 text-xs mt-1 ml-1">{errors.title?.message as string}</p>}
            </div>
            <div>
              <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">
                 {editingTask ? 'Reassign To (Institutional Handover)' :
                  isHR ? 'Assign To (HR Personnel Only)' :
                  isOpsOrAcad ? 'Assign To (Sub-Dept Admins & Team)' : 
                  'Assign To (Department Personnel)'}
              </label>
              {isCEO && !editingTask ? (
                <>
                   <div className="w-full px-4 py-3 bg-slate-100 border border-slate-200 rounded-xl font-bold text-slate-400 flex items-center justify-between opacity-80 cursor-not-allowed">
                     <span>Human Resources Administration</span>
                     <span className="text-[10px] bg-slate-200 px-2 py-0.5 rounded-sm uppercase tracking-widest text-slate-500">System Routed</span>
                   </div>
                   <input type="hidden" {...register('assignedTo', { required: 'HR Assignee could not be resolved from DB roster' })} />
                </>
              ) : (
                <select
                  {...register('assignedTo', { required: 'Assignee is required' })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900 transition-all font-bold text-slate-900"
                >
                  <option value="">-- Select Assignee --</option>
                  {team.filter((member) => isAssignableDepartmentMember({
                    member,
                    currentUserUid: user?.uid,
                    currentDeptId: user?.deptId,
                    hrMode: isHR,
                  })).map((t) => (
                    <option key={t.uid} value={t.uid}>{t.name} ({t.role || 'Personnel'})</option>
                  ))}
                </select>
              )}
              {errors.assignedTo && <p className="text-red-500 text-xs mt-1 ml-1">{errors.assignedTo.message as string}</p>}
            </div>

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
                {...register('priority', { required: 'Priority is required' })}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900 transition-all font-bold text-slate-900"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>

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
              disabled={isSubmitting}
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

      {/* Action Confirmation Modal */}
      <Modal 
        isOpen={!!actionToConfirm} 
        onClose={() => setActionToConfirm(null)} 
        title="Action Authorization"
        maxWidth="md"
      >
        <div className="p-6 text-center space-y-6">
          <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto ring-8 ${actionToConfirm?.action === 'grace' ? 'bg-amber-50 ring-amber-50/50' : 'bg-purple-50 ring-purple-50/50'}`}>
            <ClipboardList className={`w-10 h-10 ${actionToConfirm?.action === 'grace' ? 'text-amber-600' : 'text-purple-600'}`} />
          </div>
          <div>
            <h4 className="font-black text-slate-900 uppercase tracking-tight text-xl mb-3">
              {actionToConfirm?.action === 'grace' ? 'Confirm Grace Period' : 'Confirm CEO Escalation'}
            </h4>
            <p className="text-sm text-slate-500 font-medium max-w-3xl leading-relaxed mb-10">
              {actionToConfirm?.action === 'grace' 
                ? 'Are you sure you want to grant a 24-hour grace period for this task? This action cannot be reversed.'
                : 'Are you sure you want to escalate this matter directly to the CEO? This indicates critical operational delay.'}
            </p>
          </div>
          <div className="flex gap-4 pt-4">
            <button 
              onClick={() => setActionToConfirm(null)}
              className="flex-1 px-6 py-3 bg-white border border-slate-200 text-slate-600 font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-slate-50 transition-all"
            >
              Cancel
            </button>
            <button 
              onClick={confirmDeptAction}
              className={`flex-1 px-6 py-3 text-white font-black text-[10px] uppercase tracking-widest rounded-xl shadow-lg transition-all active:scale-95 ${actionToConfirm?.action === 'grace' ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/20' : 'bg-purple-600 hover:bg-purple-700 shadow-purple-600/20'}`}
            >
              Confirm
            </button>
          </div>
        </div>
      </Modal>

      {/* Grace Info Modal */}
      <Modal 
        isOpen={!!graceInfoTask} 
        onClose={() => setGraceInfoTask(null)} 
        title="Grace Authorization Data"
        maxWidth="sm"
      >
        <div className="p-6 text-center space-y-6">
          <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto ring-8 ring-green-50/50">
            <ClipboardList className="w-8 h-8 text-green-600" />
          </div>
          <div>
            <h4 className="font-black text-slate-900 uppercase tracking-tight text-xl mb-3">Grace Protocol Active</h4>
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-left space-y-2 mt-4 mx-auto w-full max-w-sm shadow-inner">
                <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Valid Until</span>
                    <span className="text-xs font-bold text-slate-700">
                        {graceInfoTask?.deptAdminGraceUntil ? new Date(graceInfoTask.deptAdminGraceUntil).toLocaleString() : 'N/A'}
                    </span>
                </div>
                <div className="pt-2">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Authorization Details</span>
                    <p className="text-xs text-slate-600 font-medium">
                        A 24-hour executive grace period was formally authorized by the Department Administrator to resolve this overdue directive.
                    </p>
                </div>
            </div>
          </div>
          <div className="flex justify-center pt-4">
            <button 
              onClick={() => setGraceInfoTask(null)}
              className="w-full px-8 py-3 bg-slate-900 text-white font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/10 active:scale-95"
            >
              Close View
            </button>
          </div>
        </div>
      </Modal>
      
      {/* Task Details Card */}
      <Modal isOpen={!!viewingTask} onClose={() => setViewingTask(null)} hideHeader={true}>
        <div className="bg-white overflow-hidden transition-all duration-300 flex flex-col">
          <div className="bg-slate-900 p-8 text-white relative border-b border-slate-800">
            <div className="flex items-center gap-4 mb-4">
              <div className="bg-white/10 p-3 rounded-2xl backdrop-blur-xl ring-1 ring-white/20">
                <ClipboardList className="w-8 h-8 text-white" />
              </div>
              <div>
                <p className="text-[10px] text-blue-400 font-black uppercase tracking-[0.2em] leading-none mb-2">Institutional Task Profile</p>
                <h2 className="text-2xl font-black tracking-tight leading-tight">Directive Details</h2>
              </div>
            </div>
            <button 
              onClick={() => setViewingTask(null)}
              className="absolute top-6 right-6 p-2.5 hover:bg-white/10 rounded-xl transition-all hover:scale-110 active:scale-90 text-white/40 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-8 space-y-8 bg-slate-50/50">
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-3">Task Title / Instruction</label>
              <p className="text-base font-bold text-slate-900 leading-relaxed break-words">{viewingTask?.title}</p>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-6">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2.5">Assignee</label>
                  <div className="flex items-center gap-3 bg-white p-4 rounded-2xl border border-slate-100">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 font-bold">
                      {viewingTask?.assignee?.name?.[0] || 'U'}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">{viewingTask?.assignee?.name || 'Unmapped User'}</p>
                      <p className="text-[10px] text-slate-500 font-medium">{viewingTask?.assignedTo}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2.5">Status Profile</label>
                  <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl font-black text-xs uppercase tracking-widest ${
                    viewingTask?.status === 'completed' ? 'bg-green-100 text-green-700' :
                    viewingTask?.status === 'overdue' ? 'bg-red-100 text-red-600' :
                    'bg-blue-100 text-blue-700'
                  }`}>
                    <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
                    {viewingTask?.status?.replace('_', ' ')}
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2.5">Deadline Velocity</label>
                  <div className="bg-white p-4 rounded-2xl border border-slate-100">
                    <p className="text-sm font-bold text-slate-900">
                      {viewingTask?.deadline ? new Date(viewingTask.deadline).toLocaleDateString('en-US', { 
                        weekday: 'long', 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      }) : 'No deadline set'}
                    </p>
                    <p className="text-[10px] text-slate-500 mt-1 font-medium">Standard institutional delivery expected</p>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2.5">Priority Level</label>
                  <div className="flex items-center gap-2">
                    {['low', 'medium', 'high', 'urgent'].map((p) => (
                      <div 
                        key={p}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-tighter transition-all ${
                          viewingTask?.priority === p 
                            ? 'bg-slate-900 text-white scale-105 shadow-md' 
                            : 'bg-slate-100 text-slate-400 opacity-50'
                        }`}
                      >
                        {p}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {viewingTask?.isInstitutionalHandover && (
              <div className="bg-indigo-50 border border-indigo-100 p-5 rounded-3xl flex items-start gap-4">
                <div className="p-2 bg-indigo-600 rounded-xl text-white">
                  <Share2 className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-indigo-900">Institutional Handover Policy Active</p>
                  <p className="text-xs text-indigo-700/80 leading-relaxed mt-1">This task is an executive mandate. No grace period is applicable, and failure will trigger direct CEO escalation.</p>
                </div>
              </div>
            )}
          </div>

          <div className="p-6 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
            <button
              onClick={() => setViewingTask(null)}
              className="px-6 py-3 rounded-xl font-bold text-slate-600 hover:bg-slate-200 transition-all active:scale-95 text-xs uppercase tracking-widest"
            >
              Close Profile
            </button>
            <button
              onClick={() => {
                const taskToEdit = viewingTask;
                setViewingTask(null);
                setTimeout(() => openEditModal(taskToEdit!), 300);
              }}
              className="px-8 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all active:scale-95 shadow-lg shadow-slate-900/20 text-xs uppercase tracking-widest"
            >
              Enter Edit Mode
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
