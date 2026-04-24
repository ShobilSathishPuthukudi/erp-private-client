import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { DataTable } from '@/components/shared/DataTable';
import { Modal } from '@/components/shared/Modal';
import type { ColumnDef } from '@tanstack/react-table';
import { 
  CheckCircle2, 
  FileCheck,
  Activity,
  User
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import { PageHeader } from '@/components/shared/PageHeader';

interface Task {
  id: number;
  title: string;
  deadline: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'in_progress' | 'completed' | 'overdue';
  description?: string;
  remarks?: string;
  evidenceUrl?: string;
  isOverdue?: boolean;
  isEscalated?: boolean;
  overdueLabel?: string;
  assigner?: {
    uid: string;
    name: string;
  };
}

interface CompletionFormValues {
  status: 'pending' | 'in_progress' | 'completed';
  remarks: string;
  evidenceUrl?: string;
}

export default function MyTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewingTask, setViewingTask] = useState<Task | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  const { register, handleSubmit, reset, watch, formState: { isSubmitting } } = useForm<CompletionFormValues>({
    defaultValues: {
      status: 'pending',
      remarks: '',
      evidenceUrl: ''
    }
  });

  const fetchTasks = async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/portals/employee/tasks');
      setTasks(res.data);
    } catch {
      toast.error('Failed to sync operational deliverables');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const selectedStatus = watch('status');

  const openExecutionModal = (task: Task) => {
    setSelectedTask(task);
    reset({
      status: task.status === 'overdue' ? 'in_progress' : task.status,
      remarks: task.remarks || '',
      evidenceUrl: task.evidenceUrl || ''
    });
    setIsModalOpen(true);
  };

  const handleRowClick = (task: Task) => {
    setViewingTask(task);
    setShowDetails(true);
  };

  const onComplete = async (data: CompletionFormValues) => {
    if (!selectedTask) return;
    try {
      if (data.status === 'completed') {
        await api.put(`/portals/employee/tasks/${selectedTask.id}/complete`, {
          remarks: data.remarks,
          evidenceUrl: data.evidenceUrl
        });
        toast.success('Execution evidence recorded. Task finalized.');
      } else {
        await api.put(`/portals/employee/tasks/${selectedTask.id}/status`, {
          status: data.status,
          remarks: data.remarks,
          evidenceUrl: data.evidenceUrl
        });
        toast.success(`Execution state updated to ${data.status.replace('_', ' ')}.`);
      }
      setIsModalOpen(false);
      reset();
      fetchTasks();
    } catch {
      toast.error('Failed to update execution state');
    }
  };

  const columns: ColumnDef<Task>[] = [
    { 
      accessorKey: 'title', 
      header: 'Operational node',
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-black text-slate-900 tracking-tight text-sm cursor-pointer hover:text-[var(--theme-accent)] transition-all">
            {row.original.title.length > 12 ? `${row.original.title.substring(0, 12)}...` : row.original.title}
          </span>
          <div className="flex items-center gap-2 mt-1">
             <span className="text-[10px] text-slate-400 font-bold tracking-widest leading-none">
                Deadline: {new Date(row.original.deadline).toLocaleDateString()}
             </span>
             <span className="text-[10px] text-slate-300 font-bold tracking-widest leading-none">•</span>
             <span className="text-[10px] text-slate-400 font-bold tracking-widest leading-none">
                By: {row.original.assigner?.name || 'System'}
             </span>
          </div>
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
        return <span className={`px-3 py-1 text-[9px] rounded-lg font-black tracking-widest shadow-sm ${color}`}>{p}</span>;
      }
    },
    {
      accessorKey: 'status',
      header: 'Execution state',
      cell: ({ row }) => {
        const s = row.original.status;
        const label = s.replace('_', ' ');

        const tone =
          s === 'completed'
            ? 'bg-emerald-50 text-emerald-600 ring-emerald-100'
            : s === 'in_progress'
              ? 'bg-blue-50 text-blue-700 ring-blue-100'
              : 'bg-white text-slate-700 ring-slate-200';

        return (
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1.5 text-[10px] font-black tracking-widest rounded-xl ring-1 transition-all ${tone}`}>
              {label}
            </span>
            {row.original.isOverdue && row.original.status !== 'completed' && (
              <span className={`px-2 py-1 text-[9px] font-black tracking-widest rounded-lg ${
                row.original.isEscalated
                  ? 'bg-purple-50 text-purple-700 ring-1 ring-purple-100'
                  : 'bg-red-50 text-red-600 ring-1 ring-red-100'
              }`}>
                Overdue
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
              onClick={(e) => {
                e.stopPropagation();
                openExecutionModal(row.original);
              }}
              className="group flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-all shadow-lg shadow-slate-200 active:scale-95"
            >
              <FileCheck className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-[10px] font-black tracking-widest">Finalize</span>
            </button>
          ) : (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleRowClick(row.original);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-xl text-[10px] font-black uppercase tracking-widest border border-emerald-100 active:scale-95 transition-all"
            >
               <CheckCircle2 className="w-3.5 h-3.5" />
               <span>Audited</span>
            </button>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="p-2 space-y-6 flex flex-col h-[calc(100vh-8rem)]">
      <PageHeader 
        title="Operational desk"
        description="Synchronize your daily deliverables with the institutional executor."
        icon={Activity}
      />

      <div className="flex-1 min-h-0 bg-white shadow-2xl shadow-slate-100/50 border border-slate-200 rounded-[2.5rem] flex flex-col overflow-hidden">
        <DataTable 
          columns={columns} 
          data={tasks} 
          isLoading={isLoading} 
          searchKey="title" 
          searchPlaceholder="Search operational nodes..." 
          onRowClick={handleRowClick}
        />
      </div>

      {/* Task Details Modal */}
      <Modal
        isOpen={showDetails}
        onClose={() => setShowDetails(false)}
        title="Operational intelligence"
        maxWidth="md"
      >
        {viewingTask && (
          <>
            <div className="space-y-6 p-2">
              <div className="p-5 bg-slate-900 rounded-3xl text-white shadow-2xl shadow-slate-200">
                 <div className="flex justify-between items-start mb-4">
                   <div className="space-y-1">
                    <p className="text-[10px] font-black tracking-widest text-slate-400">Target node</p>
                    <p className="text-xl font-black tracking-tight break-words leading-tight">{viewingTask.title}</p>
                   </div>
                   <div className="text-right">
                      <p className="text-[10px] font-black tracking-widest text-slate-400 mb-1">Priority</p>
                      {(() => {
                        const p = viewingTask.priority;
                        let color = 'bg-slate-800 text-slate-400';
                        if (p === 'urgent') color = 'bg-red-500 text-white';
                        if (p === 'high') color = 'bg-orange-500 text-white';
                        if (p === 'medium') color = 'bg-blue-500 text-white';
                        return <span className={`px-3 py-1 text-[9px] rounded-lg font-black tracking-widest ${color}`}>{p}</span>;
                      })()}
                   </div>
                 </div>
                 
                 <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/10">
                    <div>
                      <p className="text-[10px] font-black tracking-widest text-slate-400">Deadline</p>
                      <p className="font-bold text-sm">{new Date(viewingTask.deadline).toLocaleDateString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-black tracking-widest text-slate-400">Execution state</p>
                      <p className="font-bold text-sm">{viewingTask.status.replace('_', ' ')}</p>
                    </div>
                 </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                   <p className="text-[10px] font-black tracking-widest text-slate-400 mb-2">Directive origin</p>
                   <div className="flex items-center gap-2">
                      <div className="p-2 bg-white rounded-lg border border-slate-200">
                         <User className="w-3 h-3 text-slate-600" />
                      </div>
                      <span className="text-xs font-black tracking-widest text-slate-900">{viewingTask.assigner?.name || 'System'}</span>
                   </div>
                 </div>
                 <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                   <p className="text-[10px] font-black tracking-widest text-slate-400 mb-2">Assignment type</p>
                   <span className="text-xs font-black tracking-widest text-slate-700">Direct protocol</span>
                 </div>
              </div>
                 {viewingTask.description && (
                   <div className="space-y-2">
                     <p className="text-[10px] font-black text-slate-400 tracking-[0.2em] pl-1">Directive intelligence</p>
                     <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-sm italic text-slate-600 text-sm leading-relaxed">
                       "{viewingTask.description}"
                     </div>
                   </div>
                 )}

                 {viewingTask.remarks && (
                   <div className="space-y-2">
                     <p className="text-[10px] font-black text-slate-400 tracking-[0.2em] pl-1">Execution remarks</p>
                     <div className="p-5 bg-blue-50/50 border border-blue-100 rounded-2xl text-blue-700 text-sm font-medium leading-relaxed">
                       {viewingTask.remarks}
                     </div>
                   </div>
                 )}

                 {viewingTask.evidenceUrl && (
                   <div className="space-y-2">
                     <p className="text-[10px] font-black text-slate-400 tracking-[0.2em] pl-1">Evidence reference</p>
                     <a 
                      href={viewingTask.evidenceUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-4 bg-slate-50 border border-slate-200 rounded-2xl text-blue-600 hover:text-blue-700 transition-colors group"
                     >
                       <CheckCircle2 className="w-4 h-4" />
                       <span className="text-xs font-black truncate group-hover:underline tracking-widest">View external proof</span>
                     </a>
                   </div>
                 )}
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end">
                 <button 
                  onClick={() => setShowDetails(false)}
                  className="px-8 py-3 bg-slate-900 text-white rounded-2xl font-black tracking-widest shadow-xl shadow-slate-200 hover:bg-slate-800 transition-all active:scale-95"
                 >
                   Acknowledge
                 </button>
              </div>
          </>
        )}
      </Modal>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)}
        title="Institutional execution evidence"
      >
        <form onSubmit={handleSubmit(onComplete)} className="space-y-6 p-2">
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
             <p className="text-[10px] font-black text-slate-400 tracking-widest mb-1">Target node</p>
             <p className="font-bold text-slate-900 mb-3">{selectedTask?.title}</p>
             <div className="pt-3 border-t border-slate-200/50">
               <p className="text-[10px] font-black text-slate-400 tracking-widest mb-1">Current status</p>
               <p className="text-sm text-slate-700 font-bold">
                 {(selectedTask?.status || 'pending').replace('_', ' ')}
               </p>
             </div>
             {selectedTask?.description && (
               <div className="pt-3 border-t border-slate-200/50">
                 <p className="text-[10px] font-black text-slate-400 tracking-widest mb-1">Directive intelligence</p>
                 <p className="text-sm text-slate-600 font-medium leading-relaxed">{selectedTask.description}</p>
               </div>
             )}
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 tracking-widest block">Update execution state</label>
            <select
              {...register('status', { required: true })}
              className="w-full bg-white border-2 border-slate-100 rounded-2xl p-4 text-sm focus:border-blue-600 focus:ring-0 transition-all font-black tracking-widest"
            >
              <option value="pending">Pending</option>
              <option value="in_progress">In progress</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 tracking-widest block">Execution remarks</label>
            <textarea 
              {...register('remarks', { required: selectedStatus === 'completed' })}
              className="w-full bg-white border-2 border-slate-100 rounded-2xl p-4 text-sm focus:border-blue-600 focus:ring-0 transition-all h-32"
              placeholder="Provide a forensic summary of the execution steps taken..."
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 tracking-widest block">Evidence token (URL/reference)</label>
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
              className="flex-1 px-6 py-4 rounded-2xl font-black text-[10px] tracking-widest text-slate-500 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-6 py-4 bg-blue-600 text-white rounded-2xl font-black text-[10px] tracking-widest shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all disabled:opacity-50"
            >
              {isSubmitting ? 'Updating...' : (selectedStatus === 'completed' ? 'Record execution' : 'Update status')}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
