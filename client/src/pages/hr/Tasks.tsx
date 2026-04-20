import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { DataTable } from '@/components/shared/DataTable';
import { Modal } from '@/components/shared/Modal';
import type { ColumnDef } from '@tanstack/react-table';
import { Plus, ShieldAlert, ClipboardList } from 'lucide-react';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import { useAuthStore } from '@/store/authStore';
import { getNormalizedRole } from '@/lib/roles';
import { PageHeader } from '@/components/shared/PageHeader';

interface Task {
  id: number;
  assignedTo: string;
  assignedBy: string;
  title: string;
  deadline: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'in_progress' | 'completed' | 'overdue';
  assignee?: { name: string, uid: string };
  assigner?: { name: string, uid: string };
  description?: string;
  remarks?: string;
  createdAt: string;
}

export default function HRTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { user } = useAuthStore();
  const currentRole = getNormalizedRole(user?.role || '');
  const isCEO = currentRole === 'ceo';

  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm();
  const today = new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0];

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [tasksRes, empRes] = await Promise.all([
        api.get('/hr/tasks'), 
        api.get('/hr/employees')
      ]);
      setTasks(tasksRes.data);
      setEmployees(empRes.data);
    } catch (error) {
      toast.error('Failed to fetch global task data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onSubmit = async (data: any) => {
    try {
      await api.post('/hr/tasks', data); 
      toast.success('Institutional task assigned');
      setIsModalOpen(false);
      reset();
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Assignment failed');
    }
  };

  const handleEscalate = async (id: number) => {
    try {
      const reason = window.prompt('Specify escalation protocol reason:');
      if (!reason) return;
      await api.post(`/hr/tasks/${id}/escalate`, { reason });
      toast.success('Task successfully escalated to reporting line manager');
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Escalation failure');
    }
  };

  const columns: ColumnDef<Task>[] = [
    { accessorKey: 'title', header: 'Objective' },
    { 
      id: 'assignment',
      header: 'Ownership (From -> To)',
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
            {row.original.assigner?.name || 'SYSTEM'}
          </span>
          <span className="font-bold text-slate-700">
            {row.original.assignee?.name || 'UNASSIGNED'}
          </span>
        </div>
      )
    },
    { 
      accessorKey: 'deadline', 
      header: 'Deadline',
      cell: ({ row }) => new Date(row.original.deadline).toLocaleDateString()
    },
    { 
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const s = row.original.status;
        const color = s === 'overdue' ? 'bg-red-100 text-red-700 font-bold animate-pulse' : 'bg-slate-100';
        return <span className={`px-2 py-1 rounded text-xs uppercase ${color}`}>{s}</span>;
      }
    },
    {
       id: 'escalate',
       header: 'Action',
       cell: ({ row }) => row.original.status === 'overdue' && (
         <button 
           onClick={() => handleEscalate(row.original.id)}
           className="flex items-center space-x-1 text-red-600 hover:text-red-800 font-bold text-xs ring-1 ring-red-200 px-2 py-1 rounded bg-red-50"
         >
           <ShieldAlert className="w-3 h-3" />
           <span>ESCALATE</span>
         </button>
       )
    }
  ];

  return (
    <div className="p-6 space-y-6 flex flex-col h-[calc(100vh-8rem)]">
      <PageHeader 
        title="Global task control"
        description="Monitor and escalate institutional deliverables"
        icon={ClipboardList}
        action={
          <button 
            onClick={() => setIsModalOpen(true)} 
            className="bg-slate-900 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-slate-800 transition-all font-medium whitespace-nowrap"
          >
            <Plus className="w-5 h-5" />
            Assign Global Task
          </button>
        }
      />

      <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
        <DataTable columns={columns} data={tasks} isLoading={isLoading} searchKey="title" />
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="New Institutional Task Assignment">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">Task Title</label>
            <input {...register('title', { required: true })} className="mt-1 w-full p-2 border rounded-lg" placeholder="Enter objective..." />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Detailed Instructions</label>
            <textarea {...register('description')} className="mt-1 w-full p-2 border rounded-lg" rows={3} placeholder="SOPs or evidence requirements..." />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">
              {isCEO ? 'Assign To (HR Administrators Only)' : 'Assign To (HR Personnel Only)'}
            </label>
            <select {...register('assignedTo', { required: true })} className="mt-1 w-full p-2 border rounded-lg">
              <option value="">Select Personnel</option>
              {employees.filter(e => {
                // 1. RBAC Guard: Exclude self
                if (e.uid === user?.uid) return false;
                
                // 2. RBAC Guard: Exclude inactive/suspended
                if (e.status !== 'active') return false;

                const role = getNormalizedRole(user?.role || '');
                const isCEO = role === 'ceo';
                
                if (isCEO) {
                  const DEPT_ADMIN_ROLES = [
                    "HR Admin",
                    "Finance Admin",
                    "Academic Ops Admin",
                    "Sales & CRM Admin",
                    "BVoc Dept Admin",
                    "Online Dept Admin",
                    "Open School Admin",
                    "Skill Dept Admin"
                  ];
                  return DEPT_ADMIN_ROLES.includes(e.role || '');
                }

                // 3. Dept Admin Branch: Exact 'Employee' match + department isolation
                return e.role === "Employee" && String(e.deptId) === String(user?.deptId);
              }).map(e => (
                <option key={e.uid} value={e.uid}>{e.name} ({e.role || 'Personnel'})</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">Deadline</label>
              <input
                type="date"
                min={today}
                {...register('deadline', {
                  required: true,
                  validate: (value) => !value || value >= today || 'Deadline cannot be in the past',
                })}
                className="mt-1 w-full p-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Priority</label>
              <select {...register('priority')} className="mt-1 w-full p-2 border rounded-lg">
                 <option value="medium">Medium</option>
                 <option value="high">High</option>
                 <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>
          <div className="pt-4 flex justify-end gap-3 border-t">
            <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 font-medium font-mono uppercase text-xs">Abandom</button>
            <button type="submit" disabled={isSubmitting} className="px-6 py-2 bg-slate-900 text-white rounded-lg font-bold hover:bg-slate-800 shadow-md">Assign Task</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
