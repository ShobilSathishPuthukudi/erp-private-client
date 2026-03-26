import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { DataTable } from '@/components/shared/DataTable';
import { Modal } from '@/components/shared/Modal';
import type { ColumnDef } from '@tanstack/react-table';
import { Calendar, BookOpen, Users, ShieldCheck, Plus, History, Timer, CheckCircle2, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';

interface Session {
  id: number;
  name: string;
  programId: number;
  subDeptId: number;
  startDate: string;
  endDate: string;
  maxCapacity: number;
  enrolledCount: number;
  financeStatus: 'pending' | 'approved' | 'rejected';
  approvalStatus: 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED';
  isActive: boolean;
  program?: { name: string; type: string };
  center?: { name: string };
  subDept?: { name: string };
}

interface Program {
  id: number;
  name: string;
  type: string;
  intakeCapacity: number;
}

export default function Sessions() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Session | null>(null);

  const { register, handleSubmit, reset, setValue, watch, formState: { isSubmitting } } = useForm();
  const selectedProgramId = watch('programId');

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [sessRes, progRes] = await Promise.all([
        api.get('/academic/sessions'),
        api.get('/academic/programs')
      ]);
      setSessions(sessRes.data);
      setPrograms(progRes.data);
    } catch (error) {
      toast.error('Failed to access session topology');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Sync capacity when program changes
  useEffect(() => {
    if (selectedProgramId && !editingItem) {
      const prog = programs.find(p => p.id === parseInt(selectedProgramId));
      if (prog) {
        setValue('maxCapacity', prog.intakeCapacity);
      }
    }
  }, [selectedProgramId, programs, setValue, editingItem]);

  const openCreateModal = () => {
    setEditingItem(null);
    reset({ name: '', programId: '', startDate: '', endDate: '', maxCapacity: 50 });
    setIsModalOpen(true);
  };

  const onSubmit = async (data: any) => {
    try {
      if (editingItem) {
        await api.put(`/academic/sessions/${editingItem.id}`, data);
        toast.success('Session parameters reconciled');
      } else {
        await api.post('/academic/sessions', data);
        toast.success('Deployed new academic batch node');
      }
      setIsModalOpen(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Operational failure');
    }
  };

  const columns: ColumnDef<Session>[] = [
    { 
      accessorKey: 'name', 
      header: 'Session Identity', 
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-bold text-slate-900">{row.original.name}</span>
          <span className="text-[10px] font-mono text-slate-400 uppercase tracking-tighter">BATCH-ID-{row.original.id}</span>
        </div>
      ) 
    },
    { 
      id: 'program', 
      header: 'Program Specification',
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="text-sm font-bold text-slate-700">{row.original.program?.name}</span>
          <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{row.original.program?.type}</span>
        </div>
      )
    },
    { 
      id: 'timeline', 
      header: 'Temporal Window',
      cell: ({ row }) => (
        <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
           <Timer className="w-3.5 h-3.5" />
           <span>{new Date(row.original.startDate).toLocaleDateString()} - {new Date(row.original.endDate).toLocaleDateString()}</span>
        </div>
      )
    },
    { 
      id: 'capacity', 
      header: 'Intake Velocity',
      cell: ({ row }) => {
        const percent = Math.min(100, Math.round((row.original.enrolledCount / row.original.maxCapacity) * 100));
        return (
          <div className="w-40 space-y-1">
            <div className="flex justify-between text-[10px] font-black uppercase tracking-tighter">
                <span className="text-slate-400">{row.original.enrolledCount} / {row.original.maxCapacity} Seats</span>
                <span className={percent > 90 ? 'text-red-500' : 'text-slate-900'}>{percent}%</span>
            </div>
            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                <div 
                    className={`h-full transition-all duration-500 ${percent > 90 ? 'bg-red-500' : 'bg-slate-900'}`}
                    style={{ width: `${percent}%` }}
                />
            </div>
          </div>
        );
      }
    },
    { 
      id: 'status', 
      header: 'Workflow Status',
      cell: ({ row }) => {
        const s = row.original.approvalStatus;
        return (
          <span className={`px-2.5 py-1 text-[10px] rounded-full font-bold uppercase tracking-wider flex items-center gap-1.5 w-fit ${
            s === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' : 
            s === 'PENDING_APPROVAL' ? 'bg-blue-50 text-blue-600 border border-blue-100' :
            'bg-slate-100 text-slate-600 border border-slate-200'
          }`}>
            {s === 'APPROVED' ? <CheckCircle2 className="w-3 h-3" /> : (s === 'PENDING_APPROVAL' ? <Timer className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />)}
            {s.replace('_', ' ')}
          </span>
        );
      }
    },
    { 
      accessorKey: 'financeStatus', 
      header: 'Finance Clearance',
      cell: ({ row }) => {
        const s = row.original.financeStatus;
        return (
          <span className={`px-2.5 py-1 text-[10px] rounded-full font-bold uppercase tracking-wider flex items-center gap-1.5 w-fit ${
            s === 'approved' ? 'bg-emerald-100 text-emerald-700' : 
            s === 'pending' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
            'bg-red-50 text-red-700'
          }`}>
            {s === 'approved' ? <CheckCircle2 className="w-3 h-3" /> : (s === 'pending' ? <Timer className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />)}
            {s}
          </span>
        );
      }
    },
    {
      id: 'actions',
      header: 'Navigation',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
            <Link 
                to={`/dashboard/academic/exams/${row.original.id}/marks`}
                className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 transition-all active:scale-95 shadow-sm border border-slate-200 bg-white"
                title="Marks Entry"
            >
                <BookOpen className="w-4 h-4" />
            </Link>
            <button 
                onClick={() => {
                    setEditingItem(row.original);
                    reset(row.original);
                    setIsModalOpen(true);
                }}
                className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 transition-all active:scale-95 shadow-sm border border-slate-200 bg-white"
            >
                <Edit2 className="w-4 h-4" />
            </button>
            {row.original.approvalStatus === 'PENDING_APPROVAL' && (
              <button 
                onClick={async () => {
                  try {
                    await api.put(`/academic/sessions/${row.original.id}/approve`, { status: 'APPROVED' });
                    toast.success('Batch approved and activated');
                    fetchData();
                  } catch (e: any) {
                    toast.error(e.response?.data?.error || 'Approval failed');
                  }
                }}
                className="p-2 hover:bg-emerald-50 rounded-lg text-emerald-600 transition-all active:scale-95 shadow-sm border border-emerald-100 bg-white"
                title="Approve Batch"
              >
                <CheckCircle2 className="w-4 h-4" />
              </button>
            )}
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto p-4 lg:p-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-8 rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50 gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/20">
              <Calendar className="w-6 h-6" />
            </div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Session Management</h1>
          </div>
          <p className="text-slate-500 font-medium ml-15">Govern academic batches, temporal windows, and intake capacity safeguards.</p>
        </div>
        <button 
          onClick={openCreateModal}
          className="flex items-center space-x-2 bg-slate-900 hover:bg-slate-800 text-white px-6 py-3 rounded-2xl transition-all shadow-xl shadow-slate-900/20 active:scale-95 font-bold"
        >
          <Plus className="w-5 h-5" />
          <span>Deploy New Batch</span>
        </button>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden">
        <DataTable 
          columns={columns} 
          data={sessions} 
          isLoading={isLoading} 
          searchKey="name" 
          searchPlaceholder="Locate batch telemetry..." 
        />
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingItem ? "Reconcile Batch Schema" : "Initialize Academic Session"}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 p-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="col-span-2">
              <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Session / Batch Designation</label>
              <div className="relative group">
                <History className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-slate-900 transition-colors" />
                <input
                  {...register('name', { required: true })}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900 transition-all font-medium text-slate-900"
                  placeholder="e.g. Batch July 2025 - BCA Phase 1"
                />
              </div>
            </div>

            <div className="col-span-2">
              <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Program Specification</label>
              <div className="relative group">
                <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-slate-900 transition-colors" />
                <select
                  {...register('programId', { required: true })}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900 transition-all font-bold text-slate-900"
                >
                  <option value="">-- Academic Program Required --</option>
                  {programs.map(p => (
                    <option key={p.id} value={p.id}>{p.name} [{p.type}]</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Activation Window (Start)</label>
              <input
                type="date"
                {...register('startDate', { required: true })}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900 transition-all font-medium text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Activation Window (End)</label>
              <input
                type="date"
                {...register('endDate', { required: true })}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900 transition-all font-medium text-slate-900"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Batch Seating Capacity</label>
              <div className="relative group">
                <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-slate-900 transition-colors" />
                <input
                  type="number"
                  {...register('maxCapacity', { required: true, valueAsNumber: true })}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900 transition-all font-medium text-slate-900"
                  min="1"
                />
              </div>
            </div>

            {selectedProgramId && programs.find(p => p.id === parseInt(selectedProgramId))?.type === 'Skill' && (
               <div className="col-span-2 p-4 bg-amber-50 border border-amber-100 rounded-2xl flex items-start gap-3">
                    <ShieldCheck className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
                    <div>
                        <p className="text-xs font-black text-amber-900 uppercase tracking-tight">Finance Trigger Warning</p>
                        <p className="text-sm text-amber-800 font-medium">Deploying a session for **Skill** development triggers a mandatory financial clearance request. This session will remain inactive until Finance approval.</p>
                    </div>
               </div>
            )}
          </div>

          <div className="pt-6 flex justify-end gap-3 mt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-6 py-3 text-slate-600 font-bold hover:bg-slate-50 rounded-xl transition-colors"
            >
              Abort
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-8 py-3 bg-slate-900 text-white rounded-xl font-black hover:bg-slate-800 disabled:opacity-50 transition-all active:scale-95 shadow-lg shadow-slate-900/20"
            >
              {isSubmitting ? 'Syncing...' : (editingItem ? 'Serialize Changes' : 'Execute Generation')}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

// Minimal Edit icon for the table
function Edit2({ className }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
            <path d="m15 5 4 4"/>
        </svg>
    )
}
