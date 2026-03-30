import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { DataTable } from '@/components/shared/DataTable';
import { Modal } from '@/components/shared/Modal';
import { DashCard } from '@/components/shared/DashCard';
import type { ColumnDef } from '@tanstack/react-table';
import { Plus, Edit2, Trash2, ClipboardList, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import { useAuthStore } from '@/store/authStore';

interface TeamMember {
  uid: string;
  name: string;
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
}

export default function Tasks() {
  const { user } = useAuthStore();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm();

  const fetchData = async () => {
    // Step 2: Prevent API call without departmentId
    if (!user?.deptId) return;

    try {
      setIsLoading(true);
      const [tasksRes, teamRes] = await Promise.all([
        api.get('/dept-admin/tasks', {
          params: {
            departmentId: user.deptId,
            subDepartmentId: user.subDepartment // Mapping to subDepartment scope
          }
        }),
        api.get('/dept-admin/team')
      ]);
      setTasks(tasksRes.data);
      setTeam(teamRes.data);
    } catch (error) {
      toast.error('Failed to fetch tasks dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user?.deptId]);

  const openCreateModal = () => {
    setEditingTask(null);
    reset({ 
      title: '', 
      assignedTo: '', 
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
      status: task.status
    });
    setIsModalOpen(true);
  };

  const onSubmit = async (data: any) => {
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
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Operation failed');
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;
    try {
      await api.delete(`/dept-admin/tasks/${id}`);
      toast.success('Task deleted');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete task');
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
          <span className="text-slate-400 italic">User {row.original.assignedTo}</span>;
      }
    },
    { 
      accessorKey: 'deadline', 
      header: 'Deadline',
      cell: ({ row }) => new Date(row.original.deadline).toLocaleDateString()
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
        if (s === 'completed') color = 'bg-green-100 text-green-700';
        if (s === 'in_progress') color = 'bg-blue-100 text-blue-700';
        if (s === 'overdue') color = 'bg-red-100 text-red-700 font-bold';
        if (s === 'pending') color = 'bg-slate-100 text-slate-700';
        return <span className={`px-2 py-1 text-xs rounded-full font-medium ${color}`}>{s.replace('_', ' ').toUpperCase()}</span>;
      }
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const task = row.original;
        return (
          <div className="flex items-center space-x-2">
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

  return (
    <div className="space-y-6 flex flex-col h-[calc(100vh-8rem)]">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-8 rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50 gap-6 shrink-0">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-600/20">
              <ClipboardList className="w-6 h-6" />
            </div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Task Management</h1>
          </div>
          <p className="text-slate-500 font-medium ml-15">Assign, monitor, and update the status of your team's ongoing deliverables.</p>
        </div>
        <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200 shadow-sm">
           <div className="px-4 py-2 bg-white rounded-xl shadow-sm text-[10px] font-black uppercase tracking-widest text-slate-900 flex items-center gap-2 border border-slate-200">
              <ClipboardList className="w-3.5 h-3.5 text-blue-500" />
              Operational Directives
           </div>
        </div>
      </div>

      <div className="max-w-md shrink-0">
        <DashCard 
          title="Assign New Task"
          description="Delegate operational directives and establish priority-based deadlines."
          onClick={openCreateModal}
          icon={Plus}
          actionLabel="Assign New Task"
        />
      </div>

      <div className="flex-1 min-h-0 bg-white shadow-sm border border-slate-200 rounded-lg flex flex-col">
        <DataTable 
          columns={columns} 
          data={tasks} 
          isLoading={isLoading} 
          searchKey="title" 
          searchPlaceholder="Search tasks by title..." 
        />
      </div>

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
              {errors.title && <p className="text-red-500 text-xs mt-1 ml-1">{errors.title.message as string}</p>}
            </div>

          {!editingTask && (
            <div>
              <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Assign To (Team Member)</label>
              <select
                {...register('assignedTo', { required: 'Assignee is required' })}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900 transition-all font-bold text-slate-900"
              >
                <option value="">-- Select Team Member --</option>
                {team.map((t) => (
                  <option key={t.uid} value={t.uid}>{t.name} (EMP: {t.uid})</option>
                ))}
              </select>
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
            <div>
              <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Task Status</label>
              <select
                {...register('status')}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900 transition-all font-bold text-slate-900"
              >
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="overdue">Overdue</option>
              </select>
            </div>
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
              disabled={isSubmitting}
              className="px-8 py-3.5 bg-slate-900 text-white font-bold text-xs uppercase tracking-widest rounded-2xl shadow-xl shadow-slate-900/10 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:scale-100"
            >
               {isSubmitting ? 'Processing...' : (editingTask ? 'Save Updates' : 'Assign Directive')}
            </button>
          </div>
        </form>
       </div>
      </Modal>
    </div>
  );
}
