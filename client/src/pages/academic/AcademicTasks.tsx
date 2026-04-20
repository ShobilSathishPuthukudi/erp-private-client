import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { DataTable } from '@/components/shared/DataTable';
import { Modal } from '@/components/shared/Modal';
import type { ColumnDef } from '@tanstack/react-table';
import { Plus, Edit2, Trash2, CheckSquare, LayoutList, Clock, ShieldAlert } from 'lucide-react';
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
}

export default function AcademicTasks() {
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
      toast.error('Failed to synchronize institutional directives');
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
      deadline: new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0], 
      priority: 'medium',
      status: 'pending',
      description: ''
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
      description: (task as any).description || ''
    });
    setIsModalOpen(true);
  };

  const onSubmit = async (data: any) => {
    try {
      if (editingTask) {
        await api.put(`/dept-admin/tasks/${editingTask.id}`, data);
        toast.success('Directive parameters updated');
      } else {
        await api.post('/dept-admin/tasks', data);
        toast.success('Institutional directive deployed');
      }
      setIsModalOpen(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Execution failed');
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Revoke this institutional directive?')) return;
    try {
      await api.delete(`/dept-admin/tasks/${id}`);
      toast.success('Directive revoked');
      fetchData();
    } catch (error) {
      toast.error('Revocation failed');
    }
  };

  const columns: ColumnDef<Task>[] = [
    { 
      accessorKey: 'title', 
      header: 'Directive Node',
      cell: ({ row }) => <span className="font-bold text-slate-900 tracking-tight uppercase text-xs">{row.original.title}</span>
    },
    { 
      id: 'assignee', 
      header: 'Assignee',
      cell: ({ row }) => {
        const emp = row.original.assignee;
        return emp ? 
          <span className="text-slate-600 font-bold text-[10px] uppercase tracking-wider">{emp.name}</span> : 
          <span className="text-slate-400 text-[10px]">ID: {row.original.assignedTo}</span>;
      }
    },
    { 
      accessorKey: 'deadline', 
      header: 'SLA Deadline',
      cell: ({ row }) => (
        <div className="flex items-center gap-2 text-slate-500 font-bold text-[10px]">
            <Clock className="w-3 h-3" />
            {new Date(row.original.deadline).toLocaleDateString()}
        </div>
      )
    },
    { 
      accessorKey: 'priority', 
      header: 'Criticality',
      cell: ({ row }) => {
        const p = row.original.priority;
        let color = 'bg-slate-100 text-slate-700';
        if (p === 'low') color = 'bg-blue-50 text-blue-700';
        if (p === 'medium') color = 'bg-amber-50 text-amber-700';
        if (p === 'high') color = 'bg-orange-600 text-white';
        if (p === 'urgent') color = 'bg-rose-600 text-white animate-pulse';
        return <span className={`px-2 py-1 text-[9px] rounded font-black uppercase tracking-widest ${color}`}>{p}</span>;
      }
    },
    { 
      accessorKey: 'status', 
      header: 'State',
      cell: ({ row }) => {
        const s = row.original.status;
        let color = 'bg-slate-100 text-slate-700';
        if (s === 'completed') color = 'bg-emerald-100 text-emerald-700';
        if (s === 'in_progress') color = 'bg-indigo-100 text-indigo-700';
        if (s === 'overdue') color = 'bg-rose-100 text-rose-700 font-bold';
        return <span className={`px-3 py-1 text-[10px] rounded-full font-black uppercase tracking-tight ${color}`}>{s.replace('_', ' ')}</span>;
      }
    },
    {
      id: 'actions',
      header: 'Control',
      cell: ({ row }) => {
        const task = row.original;
        return (
          <div className="flex items-center space-x-2">
            <button onClick={() => openEditModal(task)} className="p-2 hover:bg-slate-100 rounded-xl text-slate-600 transition-all active:scale-95">
              <Edit2 className="w-4 h-4" />
            </button>
            <button onClick={() => handleDelete(task.id)} className="p-2 hover:bg-rose-50 rounded-xl text-rose-600 transition-all active:scale-95">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        );
      }
    }
  ];

  return (
    <div className="space-y-8 flex flex-col h-[calc(100vh-8rem)] p-4 max-w-[1600px] mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-2xl shadow-slate-200/50 gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-xl shadow-indigo-600/20">
              <CheckSquare className="w-6 h-6" />
            </div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase ">Operations bureau</h1>
          </div>
          <p className="text-slate-500 font-medium ml-15">Deploy institutional directives and monitor execution compliance across units.</p>
        </div>
        <button 
          onClick={openCreateModal}
          className="flex items-center space-x-2 bg-slate-900 hover:bg-slate-800 text-white px-8 py-4 rounded-2xl transition-all shadow-xl shadow-slate-900/20 active:scale-95 font-black uppercase text-xs tracking-widest"
        >
          <Plus className="w-5 h-5" />
          <span>New Directive</span>
        </button>
      </div>

      <div className="flex-1 min-h-0 bg-white shadow-2xl shadow-slate-200/50 border border-slate-200 rounded-[2.5rem] flex flex-col overflow-hidden">
        <div className="px-8 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                <LayoutList className="w-4 h-4" />
                Active Execution Pipeline
            </h3>
        </div>
        <DataTable 
          columns={columns} 
          data={tasks} 
          isLoading={isLoading} 
          searchKey="title" 
          searchPlaceholder="Search institutional nodes..." 
        />
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingTask ? "Calibrate Directive" : "Initialize Institutional Directive"}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 pt-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Directive Definition (Forensic Summary)</label>
            <div className="relative group">
               <ShieldAlert className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
               <input
                 {...register('title', { required: 'Definition is required' })}
                 className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:ring-4 focus:ring-indigo-600/5 focus:border-indigo-600 transition-all font-bold text-slate-900"
                 placeholder="RATIFY Q3 OPERATIONAL COMPLIANCE"
               />
            </div>
            {errors.title && <p className="text-rose-500 text-[10px] font-black uppercase mt-1 ml-1">{errors.title.message as string}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Directive Intelligence (Detailed Instructions)</label>
            <textarea
              {...register('description')}
              rows={3}
              className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:ring-4 focus:ring-indigo-600/5 focus:border-indigo-600 transition-all font-medium text-sm text-slate-900"
              placeholder="Detail the operational requirements and expected outcomes..."
            />
          </div>

          {!editingTask && (
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Target Executor (Team Member)</label>
              <select
                {...register('assignedTo', { required: 'Executor required' })}
                className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:ring-4 focus:ring-indigo-600/5 focus:border-indigo-600 transition-all font-bold text-slate-900 appearance-none"
              >
                <option value="">-- SELECT INSTITUTIONAL ASSET --</option>
                {team.map((t) => (
                  <option key={t.uid} value={t.uid}>{t.name} [{t.uid}]</option>
                ))}
              </select>
              {errors.assignedTo && <p className="text-rose-500 text-[10px] font-black uppercase mt-1 ml-1">{errors.assignedTo.message as string}</p>}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">SLA Deadline</label>
              <input
                type="date"
                {...register('deadline', { required: 'Deadline required' })}
                className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:ring-4 focus:ring-indigo-600/5 focus:border-indigo-600 transition-all font-bold text-slate-900"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Criticality Level</label>
              <select
                {...register('priority')}
                className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:ring-4 focus:ring-indigo-600/5 focus:border-indigo-600 transition-all font-black text-slate-900"
              >
                <option value="low">LOW</option>
                <option value="medium">MEDIUM</option>
                <option value="high">HIGH</option>
                <option value="urgent">URGENT</option>
              </select>
            </div>
          </div>

          {editingTask && (
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Operational State</label>
              <select
                {...register('status')}
                className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:ring-4 focus:ring-indigo-600/5 focus:border-indigo-600 transition-all font-black text-slate-900"
              >
                <option value="pending">PENDING</option>
                <option value="in_progress">IN PROGRESS</option>
                <option value="completed">COMPLETED</option>
                <option value="overdue">OVERDUE</option>
              </select>
            </div>
          )}

          <div className="pt-6 flex gap-3">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="flex-1 px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-50 rounded-2xl transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-8 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] shadow-xl shadow-slate-900/20 hover:bg-slate-800 transition-all disabled:opacity-50"
            >
              {isSubmitting ? 'PROCESSING...' : (editingTask ? 'CALIBRATE' : 'DEPLOY')}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
