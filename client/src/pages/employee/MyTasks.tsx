import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { DataTable } from '@/components/shared/DataTable';
import { Modal } from '@/components/shared/Modal';
import type { ColumnDef } from '@tanstack/react-table';
import { 
  CheckCircle2, 
  FileCheck,
  Activity
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';

interface Task {
  id: number;
  title: string;
  deadline: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'in_progress' | 'completed' | 'overdue';
  description?: string;
  isOverdue?: boolean;
  overdueLabel?: string;
}

export default function MyTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm();

  const fetchTasks = async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/portals/employee/tasks');
      setTasks(res.data);
    } catch (error) {
      toast.error('Failed to sync operational deliverables');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const handleStatusUpdate = async (id: number, status: string) => {
    try {
      await api.put(`/portals/employee/tasks/${id}/status`, { status });
      toast.success(`Task shifted to ${status.replace('_', ' ')}`);
      fetchTasks();
    } catch (error) {
      toast.error('Workflow transition failed');
    }
  };

  const onComplete = async (data: any) => {
    if (!selectedTask) return;
    try {
      await api.put(`/portals/employee/tasks/${selectedTask.id}/complete`, data);
      toast.success('Execution evidence recorded. Task finalized.');
      setIsModalOpen(false);
      reset();
      fetchTasks();
    } catch (error) {
      toast.error('Failed to finalize task execution');
    }
  };

  const columns: ColumnDef<Task>[] = [
    { 
      accessorKey: 'title', 
      header: 'Operational Node',
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-black text-slate-900 uppercase tracking-tight text-sm">{row.original.title}</span>
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none mt-1">
            Deadline: {new Date(row.original.deadline).toLocaleDateString()}
          </span>
        </div>
      )
    },
    { 
      accessorKey: 'priority', 
      header: 'Priority',
      cell: ({ row }) => {
        const p = row.original.priority;
        let color = 'bg-slate-100 text-slate-600';
        if (p === 'urgent') color = 'bg-red-600 text-white animate-pulse';
        if (p === 'high') color = 'bg-orange-500 text-white';
        if (p === 'medium') color = 'bg-blue-500 text-white';
        return <span className={`px-3 py-1 text-[9px] rounded-lg font-black uppercase tracking-widest shadow-sm ${color}`}>{p}</span>;
      }
    },
    {
      accessorKey: 'status',
      header: 'Execution State',
      cell: ({ row }) => {
        const s = row.original.status;
        return (
          <div className="flex items-center gap-2">
            <select 
              value={s}
              onChange={(e) => handleStatusUpdate(row.original.id, e.target.value)}
              disabled={s === 'completed'}
              className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-xl border-none ring-1 ring-slate-200 focus:ring-2 focus:ring-blue-600 transition-all ${
                s === 'completed' ? 'bg-emerald-50 text-emerald-600 ring-emerald-100' :
                row.original.isEscalated ? 'bg-purple-50 text-purple-700 ring-purple-100' :
                (s === 'overdue' || row.original.isOverdue) ? 'bg-red-50 text-red-600 ring-red-100' :
                'bg-white text-slate-700'
              }`}
            >
              <option value="pending">PENDING</option>
              <option value="in_progress">IN PROGRESS</option>
              {s === 'completed' && <option value="completed">COMPLETED</option>}
              {(s === 'overdue' || row.original.isOverdue) && <option value="overdue">OVERDUE</option>}
            </select>
            {row.original.isOverdue && (
               <span className={`text-[8px] font-black uppercase tracking-tighter ${row.original.isEscalated ? 'text-purple-600' : 'text-red-500'}`}>
                 {row.original.overdueLabel || 'Action Required'}
               </span>
            )}
          </div>
        );
      }
    },
    {
      id: 'actions',
      header: 'Terminal',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          {row.original.status !== 'completed' ? (
            <button 
              onClick={() => { setSelectedTask(row.original); setIsModalOpen(true); }}
              className="group flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-all shadow-lg shadow-slate-200 active:scale-95"
            >
              <FileCheck className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-[10px] font-black uppercase tracking-widest">Finalize</span>
            </button>
          ) : (
            <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-xl text-[10px] font-black uppercase tracking-widest border border-emerald-100">
               <CheckCircle2 className="w-3.5 h-3.5" />
               <span>Audited</span>
            </div>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6 flex flex-col h-[calc(100vh-8rem)] p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center shrink-0">
        <div className="flex items-center gap-4">
           <div className="p-3 bg-slate-900 rounded-2xl text-white shadow-xl">
              <Activity className="w-6 h-6" />
           </div>
           <div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">Operational Desk</h1>
              <p className="text-slate-500 text-sm font-medium">Synchronize your daily deliverables with the institutional executor.</p>
           </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 bg-white shadow-2xl shadow-slate-100/50 border border-slate-200 rounded-[2.5rem] flex flex-col overflow-hidden">
        <DataTable 
          columns={columns} 
          data={tasks} 
          isLoading={isLoading} 
          searchKey="title" 
          searchPlaceholder="Search operational nodes..." 
        />
      </div>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)}
        title="Institutional Execution Evidence"
      >
        <form onSubmit={handleSubmit(onComplete)} className="space-y-6 p-2">
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Target Node</p>
             <p className="font-bold text-slate-900 mb-3">{selectedTask?.title}</p>
             {selectedTask?.description && (
               <div className="pt-3 border-t border-slate-200/50">
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Directive Intelligence</p>
                 <p className="text-sm text-slate-600 font-medium leading-relaxed">{selectedTask.description}</p>
               </div>
             )}
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Execution Remarks</label>
            <textarea 
              {...register('remarks', { required: true })}
              className="w-full bg-white border-2 border-slate-100 rounded-2xl p-4 text-sm focus:border-blue-600 focus:ring-0 transition-all h-32"
              placeholder="Provide a forensic summary of the execution steps taken..."
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Evidence Token (URL/Reference)</label>
            <input 
              {...register('evidenceUrl')}
              className="w-full bg-white border-2 border-slate-100 rounded-2xl p-4 text-sm focus:border-blue-600 focus:ring-0 transition-all font-mono"
              placeholder="https://docs.google.com/..."
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button 
              type="button" 
              onClick={() => setIsModalOpen(false)}
              className="flex-1 px-6 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest text-slate-500 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-6 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all disabled:opacity-50"
            >
              {isSubmitting ? 'FINALIZING...' : 'RECORD EXECUTION'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
