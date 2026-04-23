import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '@/lib/api';
import { DataTable } from '@/components/shared/DataTable';
import { Modal } from '@/components/shared/Modal';
import { DashCard } from '@/components/shared/DashCard';
import type { ColumnDef } from '@tanstack/react-table';
import { Edit2, Trash2, Library, Landmark, Clock, Users, ShieldAlert, X, ChevronDown } from 'lucide-react';
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
  status: 'draft' | 'staged' | 'active';
  totalFee?: number;
  baseFee?: number;
  taxPercentage?: number;
  paymentStructure?: string[];
  tenure?: number;
  totalCredits?: number;
  university?: {
    name: string;
    shortName?: string;
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
  baseFee: number;
  taxPercentage: number;
  paymentStructure: string[];
  tenure: number;
  totalCredits: number;
}

export default function Programs() {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [universities, setUniversities] = useState<University[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Program | null>(null);
  const [deletingItem, setDeletingItem] = useState<Program | null>(null);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [requestReason, setRequestReason] = useState('');
  const [requestError, setRequestError] = useState('');
  const [pendingAction, setPendingAction] = useState<{ type: 'EDIT' | 'DELETE', data?: any, id?: number } | null>(null);
  const { user } = useAuthStore();
  const isOps = user?.role === 'Operations Admin';

  const { register, handleSubmit, reset, formState: { isSubmitting, errors }, watch, setValue, setError } = useForm<ProgramFormData>({
    defaultValues: {
      name: '',
      shortName: '',
      universityId: '',
      duration: 12,
      intakeCapacity: 50,
      type: 'online',
      totalFee: 0,
      baseFee: 0,
      taxPercentage: 18,
      paymentStructure: [],
      tenure: 0,
      totalCredits: 0
    }
  });

  const watchBaseFee = watch('baseFee');
  const watchTax = watch('taxPercentage');

  useEffect(() => {
    const base = parseFloat(String(watchBaseFee)) || 0;
    const tax = parseFloat(String(watchTax)) || 0;
    const total = base * (1 + tax / 100);
    setValue('totalFee', parseFloat(total.toFixed(2)));
  }, [watchBaseFee, watchTax, setValue]);

  const watchAllFields = watch();
  const selectedStructures = watchAllFields.paymentStructure;
  const isTenureRequired = !!(selectedStructures && (
    Array.isArray(selectedStructures) 
    ? (selectedStructures as any).some((s: any) => ['custom', 'monthly'].includes(s?.toLowerCase()))
    : ['custom', 'monthly'].some(v => (selectedStructures as any).toString().toLowerCase().includes(v))
  ));

  const isFormValid = 
    !!watchAllFields.name?.trim() &&
    !!watchAllFields.shortName?.trim() &&
    !!watchAllFields.universityId &&
    !!watchAllFields.duration &&
    !!watchAllFields.type &&
    watchAllFields.totalFee !== undefined && watchAllFields.totalFee !== null && String(watchAllFields.totalFee).trim() !== '' &&
    watchAllFields.paymentStructure && watchAllFields.paymentStructure.length > 0 &&
    (isTenureRequired ? !!watchAllFields.tenure : true) &&
    watchAllFields.totalCredits !== undefined;

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
    reset({ name: '', shortName: '', universityId: '', duration: 12, intakeCapacity: 50, type: 'online', totalFee: 0, baseFee: 0, taxPercentage: 18, paymentStructure: [], tenure: 0, totalCredits: 0 });
    setIsModalOpen(true);
  };

  const openEditModal = (item: Program) => {
    setEditingItem(item);
    // Reverse calculate base fee if it is not present for legacy records
    const normalizedBaseFee = item.baseFee !== undefined && item.baseFee !== null
      ? Number(item.baseFee)
      : null;
    const normalizedTotalFee = item.totalFee !== undefined && item.totalFee !== null
      ? Number(item.totalFee)
      : 0;
    const normalizedTax = item.taxPercentage !== undefined && item.taxPercentage !== null
      ? Number(item.taxPercentage)
      : 18;
    const initialBaseFee = normalizedBaseFee ?? (normalizedTotalFee ? (normalizedTotalFee / 1.18) : 0);
    const initialTax = Number.isFinite(normalizedTax) ? normalizedTax : 18;

    reset({ 
      name: item.name, 
      shortName: item.shortName || '',
      universityId: item.universityId || '', 
      duration: item.duration,
      intakeCapacity: item.intakeCapacity,
      type: item.type,
      totalFee: normalizedTotalFee || 0,
      baseFee: Number.isFinite(initialBaseFee) ? parseFloat(initialBaseFee.toFixed(2)) : 0,
      taxPercentage: initialTax,
      paymentStructure: item.paymentStructure || [],
      tenure: item.tenure || 0,
      totalCredits: item.totalCredits || 0
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
      const status = error.response?.status;
      const msg = error.response?.data?.error || 'Processing logic breakdown';
      if (status === 409 && /name/i.test(msg)) {
        setError('name', { type: 'server', message: msg });
      } else if (/short.?name/i.test(msg)) {
        setError('shortName', { type: 'server', message: msg });
      } else {
        setError('root' as any, { type: 'server', message: msg });
      }
    }
  };

  const submitGatedRequest = async () => {
    if (!requestReason || requestReason.length < 10) {
        setRequestError('Please provide a valid justification (min 10 chars)');
        return;
    }
    setRequestError('');
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
    } catch (error: any) {
        const msg = error?.response?.data?.error || 'Failed to synchronize action request';
        setRequestError(msg);
    }
  };

  const handleDelete = async (item: Program) => {
    setDeletingItem(item);
  };

  const executeDelete = async () => {
    if (!deletingItem) return;

    if (isOps) {
        setPendingAction({ type: 'DELETE', id: deletingItem.id });
        setIsRequestModalOpen(true);
        setDeletingItem(null);
        return;
    }
    
    try {
      await api.delete(`/academic/programs/${deletingItem.id}`);
      toast.success('Program wiped from matrix.');
      setDeletingItem(null);
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
            {row.original.shortName || row.original.name}
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
            {row.original.university?.shortName || row.original.university?.name || 'Local Institutional Core'}
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
      accessorKey: 'totalCredits', 
      header: 'Credits', 
      cell: ({ row }) => (
        <span className="text-sm font-bold text-slate-700">{row.original.totalCredits || 0} PTS</span>
      ) 
    },
    { 
      accessorKey: 'type', 
      header: 'Sub-Department',
      cell: ({ row }) => (
        <span className={`px-2.5 py-1 text-[10px] rounded-full font-bold uppercase tracking-wider ${
          row.original.type?.toLowerCase() === 'online' ? 'bg-blue-100 text-blue-700' :
          row.original.type?.toLowerCase() === 'skill' ? 'bg-purple-100 text-purple-700' :
          row.original.type?.toLowerCase() === 'bvoc' ? 'bg-orange-100 text-orange-700' :
          'bg-slate-100 text-slate-700'
        }`}>
          {row.original.type}
        </span>
      )
    },

    { 
      accessorKey: 'status', 
      header: 'Status',
      cell: ({ row }) => {
        const s = row.original.status?.toLowerCase();
        let color = 'bg-slate-50 text-slate-600 border-slate-200';
        if (s === 'active') color = 'bg-emerald-50 text-emerald-700 border-emerald-200';
        if (s === 'draft') color = 'bg-blue-50 text-blue-700 border-blue-200';
        if (s === 'staged') color = 'bg-indigo-50 text-indigo-700 border-indigo-200';
        return (
          <span className={`px-2.5 py-1 text-[10px] rounded-full font-black uppercase tracking-wider border ${color}`}>
            {s}
          </span>
        );
      }
    },

    {
      id: 'actions',
      header: 'Controls',
      cell: ({ row }) => {
        const item = row.original;
        const canEdit = item.status?.toLowerCase() === 'draft';
        return (
          <div className="flex items-center space-x-2">
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (canEdit) openEditModal(item);
              }}
              disabled={!canEdit}
              title={canEdit ? 'Edit program' : 'Only draft programs can be edited'}
              className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 transition-all hover:scale-110 active:scale-95 shadow-sm border border-slate-200 bg-white disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:scale-100"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button onClick={() => handleDelete(item)} className="p-2 hover:bg-red-50 rounded-lg text-red-600 transition-all hover:-translate-y-0.5 hover:scale-110 hover:shadow-md active:scale-95 shadow-sm border border-red-100 bg-white">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        );
      }
    }
  ];

  return (
    <div className="p-2 space-y-6 flex flex-col h-[calc(100vh-8rem)]">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white px-6 py-5 rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50 gap-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center text-white shadow-lg shadow-slate-900/20 shrink-0">
            <Library className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight leading-tight mb-0.5">Academic architecture</h1>
            <p className="text-slate-500 font-medium text-sm">Configure multi-university programs and cross-departmental duration tracks.</p>
          </div>
        </div>
        {programs.length > 0 && (
          <button 
            onClick={openCreateModal}
            className="px-6 py-3 bg-slate-900 text-white rounded-2xl shadow-xl shadow-slate-900/10 text-xs font-black uppercase tracking-widest flex items-center gap-2 hover:bg-slate-800 transition-all active:scale-95 hover:scale-[1.02]"
          >
            <Library className="w-4 h-4" />
            Add Program
          </button>
        )}
      </div>

      {!isLoading && programs.length === 0 ? (
        <div className="max-w-xl mx-auto py-20">
          <DashCard 
            title="Initialize Academic Pipeline"
            description="Design and deploy new academic curricula and multi-university program structures to start your institutional operations."
            onClick={openCreateModal}
            icon={Library}
            actionLabel="Initialize Program Node"
          />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { status: 'Draft', color: 'border-amber-200 bg-amber-50 text-amber-700', desc: 'Initial curriculum design; technical and academic parameters being mapped.' },
              { status: 'Staged', color: 'border-blue-200 bg-blue-50 text-blue-700', desc: 'Internal departmental review; awaiting finalized board approval.' },
              { status: 'Active', color: 'border-emerald-200 bg-emerald-50 text-emerald-700', desc: 'Fully operational program; verified for student enrollment and center mapping.' }
            ].map((item, i) => (
              <div key={i} className={`p-4 rounded-2xl border ${item.color} flex flex-col gap-1 transition-all hover:scale-[1.02]`}>
                <span className="text-[10px] font-black uppercase tracking-widest">{item.status} State</span>
                <p className="text-[10px] font-bold leading-tight opacity-80">{item.desc}</p>
              </div>
            ))}
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
        </>
      )}

      <Modal
        isOpen={!!deletingItem}
        onClose={() => setDeletingItem(null)}
        title={['draft', 'staged'].includes(deletingItem?.status?.toLowerCase() || '') ? "Confirm Deletion" : "Governance Restriction"}
        maxWidth="md"
      >
        <div className="space-y-6">
          <div className={`p-4 rounded-2xl border flex gap-4 ${['draft', 'staged'].includes(deletingItem?.status?.toLowerCase() || '') ? 'bg-rose-50 border-rose-100' : 'bg-amber-50 border-amber-100'}`}>
            <ShieldAlert className={`w-6 h-6 mt-1 shrink-0 ${['draft', 'staged'].includes(deletingItem?.status?.toLowerCase() || '') ? 'text-rose-600' : 'text-amber-600'}`} />
            <div>
              <h4 className={`text-sm font-black uppercase tracking-tight ${['draft', 'staged'].includes(deletingItem?.status?.toLowerCase() || '') ? 'text-rose-900' : 'text-amber-900'}`}>
                {['draft', 'staged'].includes(deletingItem?.status?.toLowerCase() || '') ? 'Delete Program Confirmation' : 'Deletion Restricted'}
              </h4>
              <p className={`text-xs mt-1 leading-relaxed font-medium ${['draft', 'staged'].includes(deletingItem?.status?.toLowerCase() || '') ? 'text-rose-700' : 'text-amber-700'}`}>
                {['draft', 'staged'].includes(deletingItem?.status?.toLowerCase() || '') 
                  ? `You are about to permanently delete the program "${deletingItem?.name}". This action will remove all associated curriculum data and cannot be undone.`
                  : `Deletion Restricted: The program "${deletingItem?.name}" is currently in the ${deletingItem?.status.toUpperCase()} state. Active academic frameworks must be preserved to maintain institutional records.`
                }
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t border-slate-100 uppercase">
            <button
              onClick={() => setDeletingItem(null)}
              className="px-6 py-2 text-slate-500 font-black text-[10px] tracking-widest"
            >
              Cancel
            </button>
            {['draft', 'staged'].includes(deletingItem?.status?.toLowerCase() || '') && (
              <button
                onClick={executeDelete}
                className="px-8 py-2 bg-rose-600 text-white rounded-xl font-black text-[10px] tracking-widest hover:bg-rose-700 transition-all active:scale-95 shadow-lg shadow-rose-200"
              >
                Delete
              </button>
            )}
          </div>
        </div>
      </Modal>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} hideHeader={true} maxWidth="2xl">
        <div className="overflow-hidden transition-all duration-300 flex flex-col max-h-[calc(100vh-160px)]">
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
            {(errors as any).root && (
              <div className="p-3 rounded-xl border border-red-200 bg-red-50 flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
                <p className="text-xs font-bold text-red-700">{(errors as any).root.message}</p>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="col-span-2">
                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Standardized Program Title</label>
                <div className="relative group">
                    <Library className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-slate-900 transition-colors" />
                    <input
                    {...register('name', { 
                      required: 'Program title is mandatory',
                      minLength: { value: 3, message: 'Must be at least 3 characters' },
                      maxLength: { value: 20, message: 'Must be at most 20 characters' }
                    })}
                    className={`w-full pl-10 pr-4 py-3 bg-slate-50 border ${errors.name ? 'border-red-300 focus:ring-red-500/20 focus:border-red-500' : 'border-slate-200 focus:ring-slate-900/5 focus:border-slate-900'} rounded-xl focus:ring-2 transition-all font-medium text-slate-900`}
                    placeholder="Master of Computer Applications"
                    />
                </div>
                {errors.name && <p className="text-red-500 text-[10px] mt-1.5 font-bold uppercase tracking-widest flex items-center gap-1"><ShieldAlert className="w-3 h-3"/> {errors.name.message as string}</p>}
                </div>

                <div className="col-span-2">
                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Short Name / Code (Institutional Alias)</label>
                <div className="relative group">
                    <ShieldAlert className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-slate-900 transition-colors" />
                    <input
                    {...register('shortName', { 
                      required: 'Short name is required',
                      minLength: { value: 2, message: 'Must be at least 2 characters' },
                      maxLength: { value: 12, message: 'Must be at most 12 characters' }
                    })}
                    className={`w-full pl-10 pr-4 py-3 bg-slate-50 border ${errors.shortName ? 'border-red-300 focus:ring-red-500/20 focus:border-red-500' : 'border-slate-200 focus:ring-slate-900/5 focus:border-slate-900'} rounded-xl focus:ring-2 transition-all font-bold text-slate-900 uppercase`}
                    placeholder="MCA-OL"
                    />
                </div>
                {errors.shortName && <p className="text-red-500 text-[10px] mt-1.5 font-bold uppercase tracking-widest flex items-center gap-1"><ShieldAlert className="w-3 h-3"/> {errors.shortName.message as string}</p>}
                <div style={{ display: 'none' }}>
                </div>
                </div>

                <div className="col-span-2">
                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Parent University Reference</label>
                <div className="relative group">
                    <Landmark className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-slate-900 transition-colors" />
                    <select
                    {...register('universityId', { required: 'Parent university is required' })}
                    disabled={!!editingItem}
                    className={`w-full min-h-[52px] pl-10 pr-10 py-3 appearance-none bg-slate-50 border ${errors.universityId ? 'border-red-300 focus:ring-red-500/20 focus:border-red-500' : 'border-slate-200 focus:ring-slate-900/5 focus:border-slate-900'} rounded-xl focus:ring-2 transition-all font-bold text-slate-900 disabled:opacity-50 disabled:bg-slate-100 cursor-not-allowed`}
                    >
                    <option value="">-- Institutional Mapping Required --</option>
                    {universities.map(u => (
                        <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
                {errors.universityId && <p className="text-red-500 text-[10px] mt-1.5 font-bold uppercase tracking-widest flex items-center gap-1"><ShieldAlert className="w-3 h-3"/> {errors.universityId.message as string}</p>}
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
                    {...register('duration', { required: 'Duration is required', valueAsNumber: true, min: { value: 0.01, message: 'Must be above zero' } })}
                    className={`w-full pl-10 pr-4 py-3 bg-slate-50 border ${errors.duration ? 'border-red-300 focus:ring-red-500/20 focus:border-red-500' : 'border-slate-200 focus:ring-slate-900/5 focus:border-slate-900'} rounded-xl focus:ring-2 transition-all font-medium text-slate-900`}
                    min="1"
                    />
                </div>
                {errors.duration && <p className="text-red-500 text-[10px] mt-1.5 font-bold uppercase tracking-widest flex items-center gap-1"><ShieldAlert className="w-3 h-3"/> {errors.duration.message as string}</p>}
                </div>



                <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Total Credits</label>
                <div className="relative group">
                    <ShieldAlert className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-slate-900 transition-colors" />
                    <input
                    type="number"
                    {...register('totalCredits', { 
                      required: 'Total credits is required', 
                      valueAsNumber: true, 
                      min: { value: 0.01, message: 'Must be above zero' },
                      max: { value: 99.99, message: 'Must be under 100' }
                    })}
                    className={`w-full pl-10 pr-4 py-3 bg-slate-50 border ${errors.totalCredits ? 'border-red-300 focus:ring-red-500/20 focus:border-red-500' : 'border-slate-200 focus:ring-slate-900/5 focus:border-slate-900'} rounded-xl focus:ring-2 transition-all font-medium text-slate-900`}
                    min="1"
                    />
                </div>
                {errors.totalCredits && <p className="text-red-500 text-[10px] mt-1.5 font-bold uppercase tracking-widest flex items-center gap-1"><ShieldAlert className="w-3 h-3"/> {errors.totalCredits.message as string}</p>}
                </div>

                <div className="col-span-2 grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Base Academic Fee (₹)</label>
                    <div className="relative group">
                        <Landmark className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-slate-900 transition-colors" />
                        <input
                        type="number"
                        {...register('baseFee', { 
                          required: 'Base fee is required', 
                          valueAsNumber: true, 
                          min: { value: 0.01, message: 'Must be above 0' } 
                        })}
                        className={`w-full pl-10 pr-4 py-3 bg-slate-50 border ${errors.baseFee ? 'border-red-300 focus:ring-red-500/20 focus:border-red-500' : 'border-slate-200 focus:ring-slate-900/5 focus:border-slate-900'} rounded-xl focus:ring-2 transition-all font-bold text-slate-900`}
                        placeholder="0.00"
                        min="0"
                        step="0.01"
                        />
                    </div>
                    {errors.baseFee && <p className="text-red-500 text-[10px] mt-1.5 font-bold uppercase tracking-widest flex items-center gap-1"><ShieldAlert className="w-3 h-3"/> {errors.baseFee.message as string}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Tax (%)</label>
                    <div className="relative group">
                        <ShieldAlert className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-slate-900 transition-colors" />
                        <input
                        type="number"
                        {...register('taxPercentage', { required: 'Tax percentage is required', valueAsNumber: true, min: { value: 0, message: 'Cannot be negative' }, max: { value: 100, message: 'Cannot exceed 100%' } })}
                        className={`w-full pl-10 pr-4 py-3 bg-slate-50 border ${errors.taxPercentage ? 'border-red-300 focus:ring-red-500/20 focus:border-red-500' : 'border-slate-200 focus:ring-slate-900/5 focus:border-slate-900'} rounded-xl focus:ring-2 transition-all font-bold text-slate-900`}
                        placeholder="18"
                        min="0"
                        max="100"
                        step="0.01"
                        />
                    </div>
                    {errors.taxPercentage && <p className="text-red-500 text-[10px] mt-1.5 font-bold uppercase tracking-widest flex items-center gap-1"><ShieldAlert className="w-3 h-3"/> {errors.taxPercentage.message as string}</p>}
                  </div>
                </div>

                <div className="col-span-2">
                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Total Institutional Fee (₹)</label>
                <div className="relative group">
                    <Landmark className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                    type="number"
                    disabled
                    {...register('totalFee')}
                    className="w-full pl-10 pr-4 py-3 bg-slate-100 border border-slate-200 rounded-xl font-bold text-slate-500 cursor-not-allowed"
                    placeholder="0.00"
                    />
                </div>
                <p className="mt-1.5 text-[10px] text-slate-400 font-bold uppercase ml-1 tracking-tight">Auto-calculated: Base + (Base * Tax / 100)</p>
                </div>

                <div className="col-span-2">
                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-3 ml-1">Permitted Payment Structures</label>
                <div className={`grid grid-cols-3 gap-4 p-4 bg-slate-50 border ${errors.paymentStructure ? 'border-red-300' : 'border-slate-200'} rounded-2xl`}>
                    {['monthly', 'yearly', 'custom'].map((opt) => (
                    <label key={opt} className="flex items-center gap-3 cursor-pointer group">
                        <input
                        type="checkbox"
                        value={opt}
                        {...register('paymentStructure', { validate: (v) => (Array.isArray(v) && v.length > 0) || 'Select at least one payment structure' })}
                        className="w-5 h-5 rounded-lg border-slate-300 text-slate-900 focus:ring-slate-900 transition-all cursor-pointer"
                        />
                        <span className="text-xs font-black text-slate-600 uppercase tracking-wide group-hover:text-slate-900 transition-colors">
                        {opt}
                        </span>
                    </label>
                    ))}
                </div>
                {errors.paymentStructure && <p className="text-red-500 text-[10px] mt-1.5 font-bold uppercase tracking-widest flex items-center gap-1"><ShieldAlert className="w-3 h-3"/> {(errors.paymentStructure as any).message as string}</p>}
                </div>

                {isTenureRequired && (
                <div className="col-span-2">
                    <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1 text-blue-600">
                    Billing Tenure (Installments / Months)
                    </label>
                    <div className="relative group">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-400 group-focus-within:text-blue-600 transition-colors" />
                    <input
                        type="number"
                        {...register('tenure', {
                        required: isTenureRequired ? 'Billing tenure is required' : false,
                        valueAsNumber: true,
                        min: { value: 1, message: 'Must be at least 1 cycle' }
                        })}
                        className={`w-full pl-10 pr-4 py-3 bg-blue-50 border ${errors.tenure ? 'border-red-300 focus:ring-red-500/20 focus:border-red-500' : 'border-blue-100 focus:ring-blue-500/10 focus:border-blue-500'} rounded-xl focus:ring-2 transition-all font-bold text-slate-900 shadow-sm shadow-blue-100/50`}
                        placeholder="Enter tenure in months..."
                    />
                    </div>
                    {errors.tenure && <p className="text-red-500 text-[10px] mt-1.5 font-bold uppercase tracking-widest flex items-center gap-1"><ShieldAlert className="w-3 h-3"/> {errors.tenure.message as string}</p>}
                    <p className="mt-1.5 text-[9px] text-blue-400 font-bold uppercase ml-1 tracking-tight">Specify total payment cycles for this framework. For Monthly plans, this defaults to the program trajectory.</p>
                </div>
                )}

                <div className="col-span-2">
                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Sub-Department Assignment</label>
                <div className="relative group">
                <select
                    {...register('type', { required: 'Sub-department is required' })}
                    className={`w-full min-h-[52px] px-4 pr-10 py-3 appearance-none bg-slate-50 border ${errors.type ? 'border-red-300 focus:ring-red-500/20 focus:border-red-500' : 'border-slate-200 focus:ring-slate-900/5 focus:border-slate-900'} rounded-xl focus:ring-2 transition-all font-bold text-slate-900`}
                >
                    <option value="Bvoc">Bvoc</option>
                    <option value="Skill">Skill</option>
                    <option value="online">online</option>
                    <option value="OpenSchool">OpenSchool</option>
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
                {errors.type && <p className="text-red-500 text-[10px] mt-1.5 font-bold uppercase tracking-widest flex items-center gap-1"><ShieldAlert className="w-3 h-3"/> {errors.type.message as string}</p>}
                {editingItem && watch('type') !== editingItem.type && (
                    <div className="mt-2 p-2 bg-orange-50 border border-orange-200 rounded-lg flex items-start gap-2">
                    <ShieldAlert className="w-4 h-4 text-orange-600 mt-0.5 shrink-0" />
                    <p className="text-[10px] text-orange-700 font-medium">Changing sub-dept affects future enrollment routing. Existing data structures remain persistent.</p>
                    </div>
                )}
                </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 p-8 border-t border-slate-100 shrink-0">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-8 py-3.5 bg-white text-slate-600 font-bold text-xs uppercase tracking-widest rounded-2xl border border-slate-200 hover:bg-slate-50 hover:scale-105 active:scale-95 transition-all shadow-sm"
            >
              Abort Routine
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
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
        onClose={() => { setIsRequestModalOpen(false); setRequestError(''); }}
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
                    onChange={(e) => { setRequestReason(e.target.value); if (requestError) setRequestError(''); }}
                    className={`w-full h-32 px-4 py-3 bg-slate-50 border ${requestError ? 'border-red-300 focus:ring-red-500' : 'border-slate-200 focus:ring-slate-900'} rounded-2xl outline-none focus:ring-2 text-sm placeholder:text-slate-300 font-medium transition-all`}
                    placeholder="Provide a valid reason for this modification/deletion request..."
                />
                {requestError && (
                  <p className="text-red-500 text-[10px] mt-1.5 font-bold uppercase tracking-widest flex items-center gap-1"><ShieldAlert className="w-3 h-3"/> {requestError}</p>
                )}
            </div>

            <div className="flex justify-end gap-3 mt-4 border-t border-slate-100 pt-6 uppercase">
                <button
                type="button"
                onClick={() => { setIsRequestModalOpen(false); setRequestError(''); }}
                className="px-6 py-2 text-slate-500 font-black text-[10px]"
                >
                Cancel
                </button>
                <button
                onClick={submitGatedRequest}
                className="px-8 py-2 bg-amber-500 text-white rounded-xl font-black text-[10px] tracking-widest hover:bg-amber-600 transition-all active:scale-95 shadow-lg shadow-amber-900/20"
                >
                Dispatch to Finance
                </button>
            </div>
        </div>
      </Modal>
    </div>
  );
}
