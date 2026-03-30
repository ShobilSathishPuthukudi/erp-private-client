import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '@/lib/api';
import { DataTable } from '@/components/shared/DataTable';
import { Modal } from '@/components/shared/Modal';
import { DashCard } from '@/components/shared/DashCard';
import type { ColumnDef } from '@tanstack/react-table';
import { Edit2, Trash2, Library, Landmark, Clock, Users, ShieldAlert, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import { useAuthStore } from '@/store/authStore';

interface Program {
  id: number;
  name: string;
  shortName?: string;
  universityId: number;
  duration: number;
  subDeptId: number;
  intakeCapacity: number;
  type: string;
  totalFee?: number;
  paymentStructure?: string[];
  tenure?: number;
  university?: {
    name: string;
  };
  createdAt: string;
}

interface University {
  id: number;
  name: string;
}

interface ProgramFormData {
  name: string;
  shortName: string;
  universityId: string | number;
  duration: number;
  intakeCapacity: number;
  type: string;
  totalFee: number;
  paymentStructure: string[];
  tenure: number;
}

export default function Programs() {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [universities, setUniversities] = useState<University[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Program | null>(null);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [requestReason, setRequestReason] = useState('');
  const [pendingAction, setPendingAction] = useState<{ type: 'EDIT' | 'DELETE', data?: any, id?: number } | null>(null);
  const { user } = useAuthStore();
  const isOps = user?.role === 'operations';

  const { register, handleSubmit, reset, formState: { isSubmitting }, watch } = useForm<ProgramFormData>({
    defaultValues: {
      name: '',
      shortName: '',
      universityId: '',
      duration: 12,
      intakeCapacity: 50,
      type: 'Online',
      totalFee: 0,
      paymentStructure: [],
      tenure: 0
    }
  });

  const watchAllFields = watch();
  const selectedStructures = watchAllFields.paymentStructure;
  const isCustomSelected = !!(selectedStructures && (
    Array.isArray(selectedStructures) 
    ? (selectedStructures as any).some((s: any) => s?.toLowerCase() === 'custom')
    : (selectedStructures as any).toString().toLowerCase().includes('custom')
  ));

  const isFormValid = 
    !!watchAllFields.name?.trim() &&
    !!watchAllFields.shortName?.trim() &&
    !!watchAllFields.universityId &&
    !!watchAllFields.duration &&
    !!watchAllFields.intakeCapacity &&
    !!watchAllFields.type &&
    watchAllFields.totalFee !== undefined && watchAllFields.totalFee !== null && String(watchAllFields.totalFee).trim() !== '' &&
    watchAllFields.paymentStructure && watchAllFields.paymentStructure.length > 0 &&
    (isCustomSelected ? !!watchAllFields.tenure : true);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [progRes, uniRes] = await Promise.all([
        api.get('/academic/programs'),
        api.get('/academic/universities')
      ]);
      setPrograms(progRes.data);
      setUniversities(uniRes.data);
    } catch (error) {
      toast.error('Failed to fetch academic frameworks');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openCreateModal = () => {
    setEditingItem(null);
    reset({ name: '', shortName: '', universityId: '', duration: 12, intakeCapacity: 50, type: 'Online', totalFee: 0, paymentStructure: [], tenure: 0 });
    setIsModalOpen(true);
  };

  const openEditModal = (item: Program) => {
    setEditingItem(item);
    reset({ 
      name: item.name, 
      shortName: item.shortName || '',
      universityId: item.universityId || '', 
      duration: item.duration,
      intakeCapacity: item.intakeCapacity,
      type: item.type,
      totalFee: item.totalFee || 0,
      paymentStructure: item.paymentStructure || [],
      tenure: item.tenure || 0
    });
    setIsModalOpen(true);
  };

  const onSubmit = async (data: any) => {
    try {
      if (isOps && editingItem) {
        // Gated Request Flow
        setPendingAction({ type: 'EDIT', data, id: editingItem.id });
        setIsRequestModalOpen(true);
        return;
      }

      if (editingItem) {
        await api.put(`/academic/programs/${editingItem.id}`, data);
        toast.success('Program topology updated');
      } else {
        await api.post('/academic/programs', data);
        toast.success('Initialized new academic program node');
      }
      setIsModalOpen(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Processing logic breakdown');
    }
  };

  const submitGatedRequest = async () => {
    if (!requestReason || requestReason.length < 10) {
        return toast.error('Please provide a valid justification (min 10 chars)');
    }
    try {
        const payload = {
            entityType: 'Program',
            entityId: pendingAction?.id,
            actionType: pendingAction?.type,
            proposedData: pendingAction?.data,
            reason: requestReason
        };
        await api.post('/academic/request-action', payload);
        toast.success('Institutional revision request dispatched to Finance');
        setIsRequestModalOpen(false);
        setIsModalOpen(false);
        setRequestReason('');
        setPendingAction(null);
    } catch (error) {
        toast.error('Failed to synchronize action request');
    }
  };

  const handleDelete = async (id: number) => {
    if (isOps) {
        setPendingAction({ type: 'DELETE', id });
        setIsRequestModalOpen(true);
        return;
    }
    
    if (!window.confirm('Delete this active program? This halts all ongoing structural telemetry.')) return;
    try {
      await api.delete(`/academic/programs/${id}`);
      toast.success('Program wiped from matrix.');
      fetchData();
    } catch (error) {
      toast.error('Deletion block failed.');
    }
  };

  const columns: ColumnDef<Program>[] = [
    { 
      accessorKey: 'name', 
      header: 'Program Title', 
      cell: ({ row }) => (
        <div className="flex flex-col">
          <Link to={`/dashboard/academic/programs/${row.original.id}`} className="font-bold text-slate-900 hover:text-blue-600 transition-colors">
            {row.original.name}
          </Link>
          <span className="text-[10px] font-mono text-slate-400">UUID-PRG-{row.original.id}</span>
        </div>
      ) 
    },
    { 
      id: 'university', 
      header: 'Affiliated University', 
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Landmark className="w-4 h-4 text-slate-400" />
          <span className="text-sm font-medium text-slate-600">
            {row.original.university?.name || 'Local Institutional Core'}
          </span>
        </div>
      )
    },
    { 
      accessorKey: 'duration', 
      header: 'Duration', 
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-slate-400" />
          <span className="text-sm font-bold text-slate-700">{row.original.duration} Months</span>
        </div>
      ) 
    },
    { 
      accessorKey: 'type', 
      header: 'Sub-Department',
      cell: ({ row }) => (
        <span className={`px-2.5 py-1 text-[10px] rounded-full font-bold uppercase tracking-wider ${
          row.original.type === 'Online' ? 'bg-blue-100 text-blue-700' :
          row.original.type === 'Skill' ? 'bg-purple-100 text-purple-700' :
          row.original.type === 'BVoc' ? 'bg-orange-100 text-orange-700' :
          'bg-slate-100 text-slate-700'
        }`}>
          {row.original.type}
        </span>
      )
    },
    { 
      accessorKey: 'intakeCapacity', 
      header: 'Intake Velocity', 
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-slate-400" />
          <span className="text-sm font-medium text-slate-600">{row.original.intakeCapacity} Seats / Session</span>
        </div>
      ) 
    },
    {
      id: 'actions',
      header: 'Controls',
      cell: ({ row }) => {
        const item = row.original;
        return (
          <div className="flex items-center space-x-2">
            <button onClick={() => openEditModal(item)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 transition-all active:scale-95 shadow-sm border border-slate-200 bg-white">
              <Edit2 className="w-4 h-4" />
            </button>
            <button onClick={() => handleDelete(item.id)} className="p-2 hover:bg-red-50 rounded-lg text-red-600 transition-all active:scale-95 shadow-sm border border-red-100 bg-white">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        );
      }
    }
  ];

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto p-4 lg:p-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-8 rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50 gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center text-white shadow-lg shadow-slate-900/20">
              <Library className="w-6 h-6" />
            </div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Academic Architecture</h1>
          </div>
          <p className="text-slate-500 font-medium ml-15">Configure multi-university programs and cross-departmental duration tracks.</p>
        </div>
        <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200 shadow-sm">
           <div className="px-4 py-2 bg-white rounded-xl shadow-sm text-[10px] font-black uppercase tracking-widest text-slate-900 flex items-center gap-2 border border-slate-200">
              <Library className="w-3.5 h-3.5 text-indigo-500" />
              Academic Framework HUD
           </div>
        </div>
      </div>

      <div className="max-w-md">
        <DashCard 
          title="Initialize Academic Pipeline"
          description="Design and deploy new academic curricula and multi-university program structures."
          onClick={openCreateModal}
          icon={Library}
          actionLabel="Formulate Program"
        />
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden">
        <DataTable 
          columns={columns} 
          data={programs} 
          isLoading={isLoading} 
          searchKey="name" 
          searchPlaceholder="Locate by program syntax..." 
        />
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} hideHeader={true} maxWidth="2xl">
        <div className="bg-white overflow-hidden transition-all duration-300 flex flex-col max-h-[calc(100vh-160px)]">
          <div className="bg-slate-900 p-6 text-white flex justify-between items-center shrink-0 relative border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2 rounded-xl backdrop-blur-md">
                <Library className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest leading-none mb-1">
                  {editingItem ? 'Edit Configuration' : 'Academic Pipeline'}
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
                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Standardized Program Title</label>
                <div className="relative group">
                    <Library className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-slate-900 transition-colors" />
                    <input
                    {...register('name', { required: true })}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900 transition-all font-medium text-slate-900"
                    placeholder="Master of Computer Applications"
                    />
                </div>
                </div>

                <div className="col-span-2">
                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Short Name / Code (Institutional Alias)</label>
                <div className="relative group">
                    <ShieldAlert className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-slate-900 transition-colors" />
                    <input
                    {...register('shortName', { required: true })}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900 transition-all font-bold text-slate-900 uppercase"
                    placeholder="MCA-OL"
                    />
                </div>
                </div>

                <div className="col-span-2">
                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Parent University Reference</label>
                <div className="relative group">
                    <Landmark className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-slate-900 transition-colors" />
                    <select
                    {...register('universityId', { required: true })}
                    disabled={!!editingItem}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900 transition-all font-bold text-slate-900 disabled:opacity-50 disabled:bg-slate-100 cursor-not-allowed"
                    >
                    <option value="">-- Institutional Mapping Required --</option>
                    {universities.map(u => (
                        <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                    </select>
                </div>
                {editingItem && (
                    <p className="mt-1.5 text-[10px] text-orange-600 font-bold uppercase ml-1">Institutional parent is immutable after deployment.</p>
                )}
                </div>

                <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Trajectory (Months)</label>
                <div className="relative group">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-slate-900 transition-colors" />
                    <input
                    type="number"
                    {...register('duration', { required: true, valueAsNumber: true })}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900 transition-all font-medium text-slate-900"
                    min="1"
                    />
                </div>
                </div>

                <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Intake Velocity (Max Seats)</label>
                <div className="relative group">
                    <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-slate-900 transition-colors" />
                    <input
                    type="number"
                    {...register('intakeCapacity', { required: true, valueAsNumber: true })}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900 transition-all font-medium text-slate-900"
                    min="1"
                    />
                </div>
                </div>

                <div className="col-span-2">
                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Total Institutional Fee (₹)</label>
                <div className="relative group">
                    <Landmark className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-slate-900 transition-colors" />
                    <input
                    type="number"
                    {...register('totalFee', { required: true, valueAsNumber: true })}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900 transition-all font-bold text-slate-900"
                    placeholder="0.00"
                    min="0"
                    />
                </div>
                </div>

                <div className="col-span-2">
                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-3 ml-1">Permitted Payment Structures</label>
                <div className="grid grid-cols-3 gap-4 p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                    {['monthly', 'yearly', 'custom'].map((opt) => (
                    <label key={opt} className="flex items-center gap-3 cursor-pointer group">
                        <input
                        type="checkbox"
                        value={opt}
                        {...register('paymentStructure')}
                        className="w-5 h-5 rounded-lg border-slate-300 text-slate-900 focus:ring-slate-900 transition-all cursor-pointer"
                        />
                        <span className="text-xs font-black text-slate-600 uppercase tracking-wide group-hover:text-slate-900 transition-colors">
                        {opt}
                        </span>
                    </label>
                    ))}
                </div>
                </div>

                {isCustomSelected && (
                <div className="col-span-2">
                    <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1 italic text-blue-600">
                    EMI Tenure (Custom Installments)
                    </label>
                    <div className="relative group">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-400 group-focus-within:text-blue-600 transition-colors" />
                    <input
                        type="number"
                        {...register('tenure', { 
                        required: isCustomSelected, 
                        valueAsNumber: true,
                        min: 1 
                        })}
                        className="w-full pl-10 pr-4 py-3 bg-blue-50 border border-blue-100 rounded-xl focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-bold text-slate-900 shadow-sm shadow-blue-100/50"
                        placeholder="Enter tenure in months..."
                    />
                    </div>
                    <p className="mt-1.5 text-[9px] text-blue-400 font-bold uppercase ml-1 tracking-tight">Specify total payment cycles for this framework.</p>
                </div>
                )}

                <div className="col-span-2">
                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Sub-Department Assignment</label>
                <select
                    {...register('type', { required: true })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900 transition-all font-bold text-slate-900"
                >
                    <option value="BVoc">BVoc Gateway</option>
                    <option value="Skill">Skill Development</option>
                    <option value="Online">Online Learning</option>
                    <option value="OpenSchool">OpenSchool Access</option>
                </select>
                {editingItem && watch('type') !== editingItem.type && (
                    <div className="mt-2 p-2 bg-orange-50 border border-orange-200 rounded-lg flex items-start gap-2">
                    <ShieldAlert className="w-4 h-4 text-orange-600 mt-0.5 shrink-0" />
                    <p className="text-[10px] text-orange-700 font-medium">Changing sub-dept affects future enrollment routing. Existing data structures remain persistent.</p>
                    </div>
                )}
                </div>
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

      {/* Gated Action Request Modal */}
      <Modal
        isOpen={isRequestModalOpen}
        onClose={() => setIsRequestModalOpen(false)}
        title="Institutional Revision Request"
        maxWidth="md"
      >
        <div className="space-y-6">
            <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex gap-4">
                <ShieldAlert className="w-6 h-6 text-amber-600 mt-1 shrink-0" />
                <div>
                   <h4 className="text-sm font-black text-amber-900 uppercase tracking-tight">Gated Governance Protocol</h4>
                   <p className="text-xs text-amber-700 mt-1 leading-relaxed font-medium">
                     You are initiating a {pendingAction?.type.toLowerCase()} operation on a persistent academic program. 
                     This requires justification and subsequent sanctioning by the **Finance Department**.
                   </p>
                </div>
            </div>

            <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Submission Justification</label>
                <textarea 
                    value={requestReason}
                    onChange={(e) => setRequestReason(e.target.value)}
                    className="w-full h-32 px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-slate-900 text-sm placeholder:text-slate-300 font-medium transition-all"
                    placeholder="Provide a valid reason for this modification/deletion request..."
                />
            </div>

            <div className="flex justify-end gap-3 mt-4 border-t border-slate-100 pt-6 uppercase">
                <button
                type="button"
                onClick={() => setIsRequestModalOpen(false)}
                className="px-6 py-2 text-slate-500 font-black text-[10px]"
                >
                Cancel
                </button>
                <button
                onClick={submitGatedRequest}
                className="px-8 py-2 bg-amber-500 text-white rounded-xl font-black text-[10px] tracking-widest hover:bg-amber-600 transition-all active:scale-95 shadow-lg shadow-amber-200"
                >
                Dispatch to Finance
                </button>
            </div>
        </div>
      </Modal>
    </div>
  );
}
