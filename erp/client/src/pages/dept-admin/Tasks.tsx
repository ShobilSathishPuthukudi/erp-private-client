import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { DataTable } from '@/components/shared/DataTable';
import { Modal } from '@/components/shared/Modal';
import type { ColumnDef } from '@tanstack/react-table';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';

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
  isOverdue?: boolean;
  overdueLabel?: string;
}

export default function Tasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm();

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [tasksRes, teamRes] = await Promise.all([
        api.get('/dept-admin/tasks'),
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
  }, []);

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
      if (editingTask) {
        await api.put(`/dept-admin/tasks/${editingTask.id}`, data);
        toast.success('Task updated successfully');
      } else {
        await api.post('/dept-admin/tasks', data);
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
        const isOverdue = row.original.isOverdue;
        let color = 'bg-slate-100 text-slate-700';
        if (s === 'completed') color = 'bg-green-100 text-green-700';
        if (s === 'in_progress') color = 'bg-blue-100 text-blue-700';
        if (s === 'overdue' || isOverdue) color = 'bg-red-100 text-red-700 font-bold';
        if (s === 'pending' && !isOverdue) color = 'bg-slate-100 text-slate-700';
        
        return (
          <div className="flex flex-col items-start gap-1">
            <span className={`px-2 py-1 text-xs rounded-full font-medium ${color}`}>
              {isOverdue ? 'OVERDUE' : s.replace('_', ' ').toUpperCase()}
            </span>
            {isOverdue && (
              <span className="text-[9px] font-black text-red-500 uppercase tracking-tighter">
                {row.original.overdueLabel || 'Employee Level'}
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
      <div className="flex justify-between items-center shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Task Management</h1>
          <p className="text-slate-500">Assign, monitor, and update the status of your team's ongoing deliverables</p>
        </div>
        <button 
          onClick={openCreateModal}
          className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>New Task</span>
        </button>
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

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingTask ? "Edit Task Details" : "Assign New Task"}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Task Title / Description</label>
            <input
              {...register('title', { required: 'Title is required' })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 shadow-sm"
              placeholder="Complete Q3 Financial Audit Review"
            />
            {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title.message as string}</p>}
          </div>

          {!editingTask && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Assign To (Team Member)</label>
              <select
                {...register('assignedTo', { required: 'Assignee is required' })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 shadow-sm bg-white"
              >
                <option value="">-- Select Team Member --</option>
                {team.map((t) => (
                  <option key={t.uid} value={t.uid}>{t.name} (EMP: {t.uid})</option>
                ))}
              </select>
              {errors.assignedTo && <p className="text-red-500 text-xs mt-1">{errors.assignedTo.message as string}</p>}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Deadline Date</label>
              <input
                type="date"
                {...register('deadline', { required: 'Deadline is required' })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 shadow-sm"
              />
              {errors.deadline && <p className="text-red-500 text-xs mt-1">{errors.deadline.message as string}</p>}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Priority</label>
              <select
                {...register('priority')}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 shadow-sm bg-white"
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
              <label className="block text-sm font-medium text-slate-700 mb-1">Task Status</label>
              <select
                {...register('status')}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 shadow-sm bg-white"
              >
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="overdue">Overdue</option>
              </select>
            </div>
          )}

          <div className="pt-4 flex justify-end space-x-3 border-t border-slate-100 mt-6">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm"
            >
              {isSubmitting ? 'Processing...' : (editingTask ? 'Save Updates' : 'Assign Task')}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
