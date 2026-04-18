import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { DataTable } from '@/components/shared/DataTable';
import { Modal } from '@/components/shared/Modal';
import { DashCard } from '@/components/shared/DashCard';
import type { ColumnDef } from '@tanstack/react-table';
import { Calendar, BookOpen, Users, ShieldCheck, History, Timer, CheckCircle2, AlertCircle, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import { useAuthStore } from '@/store/authStore';


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

interface Center {
  id: number;
  name: string;
  auditStatus: string;
}

export default function Sessions() {
  const user = useAuthStore(state => state.user);
  const userRole = user?.role?.toLowerCase().trim() || '';
  const isPartnerCenter = ['partner-center', 'partner center', 'partner centers'].includes(userRole);
  const isReadOnly = ['operations admin', 'operations administrator', 'academic operations admin', 'academic operations administrator', 'academic operations'].includes(userRole);

  const [sessions, setSessions] = useState<Session[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [centers, setCenters] = useState<Center[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Session | null>(null);

  const { register, handleSubmit, reset, setValue, watch, setError, formState: { isSubmitting, errors } } = useForm();
  const watchAllFields = watch();
  const selectedProgramId = watchAllFields.programId;

  const isFormValid = 
    !!watchAllFields.name?.trim() &&
    !!watchAllFields.programId &&
    !!watchAllFields.centerId &&
    !!watchAllFields.startDate &&
    !!watchAllFields.endDate &&
    !!watchAllFields.maxCapacity;

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [sessRes, progRes, centRes] = await Promise.all([
        api.get('/academic/sessions'),
        api.get('/academic/programs'),
        api.get('/academic/centers')
      ]);
      setSessions(sessRes.data);
      setPrograms(progRes.data);
      setCenters(centRes.data);
      
      // Auto-assign center if user is a partner center
      if (isPartnerCenter && centRes.data.length > 0) {
          const myCenter = centRes.data[0]; // Backend only returns 1 center for PC role
          setValue('centerId', myCenter.id);
      }
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
    if (isReadOnly) return;
    setEditingItem(null);
    const defaults: any = { name: '', programId: '', startDate: '', endDate: '', maxCapacity: 50 };
    if (isPartnerCenter && centers.length > 0) {
        defaults.centerId = centers[0].id;
    } else {
        defaults.centerId = '';
    }
    reset(defaults);
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
      if (error.response?.status === 400 && (error.response.data?.error?.includes('identity') || error.response.data?.error?.includes('exists') || error.response.data?.error?.includes('name'))) {
        setError('name', { 
            type: 'manual', 
            message: error.response.data.error 
        });
      } else {
        toast.error(error.response?.data?.error || 'Operational failure');
      }
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
      header: 'Status',
      cell: ({ row }) => {
        const isActive = row.original.enrolledCount > 0;
        return (
          <span className={`px-2.5 py-1 text-[10px] rounded-full font-bold uppercase tracking-wider flex items-center gap-1.5 w-fit ${
            isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600 border border-slate-200'
          }`}>
            {isActive ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
            {isActive ? 'ACTIVE' : 'DRAFT'}
          </span>
        );
      }
    },

    {
      id: 'actions',
      header: 'Action',
      cell: ({ row }) => !isReadOnly && (
        <div className="flex items-center gap-2">
            <button 
                onClick={() => {
                    setEditingItem(row.original);
                    reset(row.original);
                    setIsModalOpen(true);
                }}
                className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 transition-all active:scale-95 shadow-sm border border-slate-200 bg-white"
                title="Edit Configuration"
            >
                <Edit2 className="w-4 h-4" />
            </button>
        </div>
      )
    }
  ].filter(c => c.id !== 'actions' || !isReadOnly);

  return (
    <div className="p-2 space-y-6">
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
        {!isLoading && programs.length > 0 && !isReadOnly && (
           <button 
              onClick={openCreateModal}
              className="px-6 py-3.5 bg-slate-900 text-white rounded-2xl shadow-xl shadow-slate-900/10 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-slate-800 transition-all active:scale-[0.98] hover:scale-[1.02]"
           >
              <Calendar className="w-4 h-4" />
              Deploy New Batch
           </button>
        )}
      </div>

      {!isLoading && programs.length === 0 ? (
        <div className="max-w-xl mx-auto py-20">
          <DashCard 
            title="Initialize Academic Session"
            description="Deploy new academic batches and set temporal constraints for intake. Note: At least one academic program must be configured before deploying sessions."
            onClick={openCreateModal}
            icon={Calendar}
            actionLabel="Review Program Pipeline"
          />
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden">
          <DataTable 
            columns={columns} 
            data={sessions} 
            isLoading={isLoading} 
            searchKey="name" 
            searchPlaceholder="Locate batch telemetry..." 
          />
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} hideHeader={true}>
        <div className="bg-white overflow-hidden transition-all duration-300 flex flex-col max-h-[calc(100vh-160px)]">
          <div className="bg-slate-900 p-6 text-white flex justify-between items-center shrink-0 relative border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2 rounded-xl backdrop-blur-md">
                <Calendar className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest leading-none mb-1">
                  {editingItem ? 'Edit Configuration' : 'Academic Session'}
                </p>
                <h2 className="text-xl font-bold tracking-tight">
                  {editingItem ? `Modify ${editingItem.name}` : 'Registration Form'}
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
          <div className="flex-1 overflow-y-auto p-8 space-y-8 min-h-0 custom-scrollbar">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="col-span-2">
                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Session / Batch Designation</label>
                <div className="relative group">
                    <History className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-slate-900 transition-colors" />
                    <input
                    {...register('name', { required: true })}
                    className={`w-full pl-10 pr-4 py-3 bg-slate-50 border ${errors.name ? 'border-red-500 ring-1 ring-red-500' : 'border-slate-200'} rounded-xl focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900 transition-all font-medium text-slate-900`}
                    placeholder="Batch July 2025 - BCA Phase 1"
                    />
                    {errors.name && (
                      <span className="text-[10px] font-bold text-red-500 mt-1.5 ml-1 block animate-in fade-in slide-in-from-top-1">
                        {errors.name.message as string}
                      </span>
                    )}
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

                {!isPartnerCenter && (
                  <div className="col-span-2">
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Contextual Study Center</label>
                  <div className="relative group">
                      <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-slate-900 transition-colors" />
                      <select
                      {...register('centerId', { required: true })}
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900 transition-all font-bold text-slate-900"
                      >
                      <option value="">-- Operational Accreditation Check Required --</option>
                      {centers.filter(c => c.auditStatus === 'approved').map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                      </select>
                  </div>
                  </div>
                )}

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
                    disabled={!watchAllFields.startDate}
                    min={watchAllFields.startDate ? new Date(new Date(watchAllFields.startDate).getTime() + 86400000).toISOString().split('T')[0] : undefined}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900 transition-all font-medium text-slate-900 disabled:opacity-50 disabled:cursor-not-allowed"
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
          </div>

          <div className="flex justify-end gap-3 p-8 bg-slate-50 border-t border-slate-200 shrink-0">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-8 py-3.5 bg-white text-slate-600 font-bold text-xs uppercase tracking-widest rounded-2xl border border-slate-200 hover:bg-slate-50 hover:scale-105 active:scale-95 transition-all shadow-sm"
            >
              Abort Routine
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !isFormValid}
              className="px-8 py-3.5 bg-slate-900 text-white font-bold text-xs uppercase tracking-widest rounded-2xl shadow-xl shadow-slate-900/10 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:active:scale-100"
            >
              {isSubmitting ? 'Syncing...' : (editingItem ? 'Serialize Changes' : 'Execute Generation')}
            </button>
          </div>
        </form>
       </div>
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
