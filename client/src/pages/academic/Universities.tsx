import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '@/lib/api';
import { DataTable } from '@/components/shared/DataTable';
import { Modal } from '@/components/shared/Modal';
import { DashCard } from '@/components/shared/DashCard';
import type { ColumnDef } from '@tanstack/react-table';
import { Edit2, Trash2, Building2, Globe, ShieldCheck, FileText, ShieldAlert, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import { useAuthStore } from '@/store/authStore';

interface University {
  id: number;
  name: string;
  shortName?: string;
  status: 'proposed' | 'draft' | 'staged' | 'active' | 'inactive';
  accreditation?: string;
  websiteUrl?: string;
  affiliationDoc?: string;
  totalPrograms?: number;
  createdAt: string;
}

export default function Universities() {
  const [universities, setUniversities] = useState<University[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<University | null>(null);
  const [deletingItem, setDeletingItem] = useState<University | null>(null);

  const { user } = useAuthStore();
  const isOps = user?.role?.toLowerCase() === 'operations';
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [requestReason, setRequestReason] = useState('');
  const [requestError, setRequestError] = useState('');
  const [pendingAction, setPendingAction] = useState<{ type: 'EDIT' | 'DELETE', data?: any, id?: number } | null>(null);

  const { register, handleSubmit, reset, watch, setError, formState: { isSubmitting, errors, isDirty } } = useForm();
  const watchAllFields = watch();

  const isFormValid = 
    !!watchAllFields.name?.trim() &&
    !!watchAllFields.shortName?.trim() &&
    !!watchAllFields.accreditation?.trim() &&
    !!watchAllFields.websiteUrl?.trim();

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/academic/universities');
      setUniversities(res.data);
    } catch (error) {
      toast.error('Failed to fetch operational configurations');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);



  const openCreateModal = () => {
    setEditingItem(null);
    reset({ name: '', shortName: '', accreditation: '', websiteUrl: '', affiliationDoc: '' });
    setIsModalOpen(true);
  };

  const openEditModal = (item: University) => {
    setEditingItem(item);
    reset({ 
      name: item.name, 
      shortName: item.shortName || '',
      accreditation: item.accreditation || '', 
      websiteUrl: item.websiteUrl || '',
      affiliationDoc: item.affiliationDoc || ''
    });
    setIsModalOpen(true);
  };

  const onSubmit = async (data: any) => {
    try {
      if (isOps && editingItem) {
        setPendingAction({ type: 'EDIT', data, id: editingItem.id });
        setIsRequestModalOpen(true);
        return;
      }

      if (editingItem) {
        await api.put(`/academic/universities/${editingItem.id}`, data);
        toast.success('University topology updated');
      } else {
        await api.post('/academic/universities', data);
        toast.success('Deployed new university endpoint');
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
      } else if (/accreditation/i.test(msg)) {
        setError('accreditation', { type: 'server', message: msg });
      } else if (/url|website/i.test(msg)) {
        setError('websiteUrl', { type: 'server', message: msg });
      } else {
        setError('root', { type: 'server', message: msg });
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
            entityType: 'Department', // Backend uses Department model for Universities
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

  const handleDelete = async (item: University) => {
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
      await api.delete(`/academic/universities/${deletingItem.id}`);
      toast.success('University topology terminated.');
      setDeletingItem(null);
      fetchData();
    } catch (error) {
      toast.error('Deletion protocol was preempted by the system constraints.');
    }
  };

  const columns: ColumnDef<University>[] = [
    { 
      accessorKey: 'name', 
      header: 'University Designation', 
      cell: ({ row }) => (
        <div className="flex flex-col">
          <Link to={`/dashboard/academic/universities/${row.original.id}`} className="font-bold text-slate-900 hover:text-blue-600 transition-colors">
            {row.original.name}
          </Link>
          {row.original.websiteUrl && (
            <a href={row.original.websiteUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] text-slate-400 flex items-center gap-1 hover:text-blue-500">
              <Globe className="w-2.5 h-2.5" />
              Institutional Portal
            </a>
          )}
        </div>
      ) 
    },
    { 
      accessorKey: 'accreditation', 
      header: 'Accreditation',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <ShieldCheck className={`w-4 h-4 ${row.original.accreditation ? 'text-blue-500' : 'text-slate-300'}`} />
          <span className="text-sm font-medium text-slate-600">{row.original.accreditation || 'Pending Review'}</span>
        </div>
      )
    },
    { 
      accessorKey: 'totalPrograms', 
      header: 'Programs',
      cell: ({ row }) => (
        <div className="flex items-center gap-1.5">
          <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 font-bold text-xs border border-blue-100">
            {row.original.totalPrograms || 0}
          </div>
          <span className="text-xs text-slate-500 font-medium">Active Offerings</span>
        </div>
      )
    },
    { 
      accessorKey: 'status', 
      header: 'Status',
      cell: ({ row }) => {
        const s = row.original.status?.toLowerCase();
        let color = 'bg-slate-100 text-slate-600 border-slate-200';
        if (s === 'active') color = 'bg-emerald-50 text-emerald-700 border-emerald-200';
        if (s === 'proposed') color = 'bg-amber-50 text-amber-700 border-amber-200';
        if (s === 'draft') color = 'bg-blue-50 text-blue-700 border-blue-200';
        if (s === 'staged') color = 'bg-indigo-50 text-indigo-700 border-indigo-200';
        if (s === 'inactive') color = 'bg-rose-50 text-rose-700 border-rose-200';
        
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
        const canEdit = item.status?.toLowerCase() === 'proposed';
        return (
          <div className="flex items-center space-x-2">
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (canEdit) openEditModal(item);
              }}
              disabled={!canEdit}
              title={canEdit ? 'Edit university' : 'Only proposed universities can be edited'}
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
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight leading-tight mb-0.5">University architecture</h1>
            <p className="text-slate-500 font-medium text-sm">Accredited Institution Registry & Compliance Ledger</p>
          </div>
        </div>
        {universities.length > 0 && (
          <button 
            onClick={openCreateModal}
            className="px-6 py-3 bg-slate-900 text-white rounded-2xl shadow-xl shadow-slate-900/10 text-xs font-black uppercase tracking-widest flex items-center gap-2 hover:bg-slate-800 transition-all active:scale-95 hover:scale-[1.02]"
          >
            <Building2 className="w-4 h-4" />
            Add University
          </button>
        )}
      </div>

      {!isLoading && universities.length === 0 ? (
        <div className="max-w-xl mx-auto py-20">
          <DashCard 
            title="Initialize Internal University Topology"
            description="Register and configure a new accredited institution within the global ERP ledger to begin institutional mapping."
            onClick={openCreateModal}
            icon={Building2}
            actionLabel="Onboard Institution"
          />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {[
              { status: 'Proposed', color: 'border-amber-200 bg-amber-50 text-amber-700', desc: 'Initial institutional proposal awaiting review.' },
              { status: 'Draft', color: 'border-blue-200 bg-blue-50 text-blue-700', desc: 'Working config; technical parameters being defined.' },
              { status: 'Staged', color: 'border-purple-200 bg-purple-50 text-purple-700', desc: 'Framework defined; awaiting center/program mapping.' },
              { status: 'Active', color: 'border-emerald-200 bg-emerald-50 text-emerald-700', desc: 'Fully operational institution in central ledger.' },
              { status: 'Inactive', color: 'border-rose-200 bg-rose-50 text-rose-700', desc: 'Deactivated endpoint; retained for forensic compliance.' }
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
              data={universities} 
              isLoading={isLoading} 
              searchKey="name" 
              searchPlaceholder="Locate by institutional syntax..." 
            />
          </div>
        </>
      )}

      <Modal
        isOpen={!!deletingItem}
        onClose={() => setDeletingItem(null)}
        title={deletingItem?.status === 'proposed' ? "Confirm Deletion" : "Governance Restriction"}
        maxWidth="md"
      >
        <div className="space-y-6">
          <div className={`p-4 rounded-2xl border flex gap-4 ${deletingItem?.status === 'proposed' ? 'bg-rose-50 border-rose-100' : 'bg-amber-50 border-amber-100'}`}>
            <ShieldAlert className={`w-6 h-6 mt-1 shrink-0 ${deletingItem?.status === 'proposed' ? 'text-rose-600' : 'text-amber-600'}`} />
            <div>
              <h4 className={`text-sm font-black uppercase tracking-tight ${deletingItem?.status === 'proposed' ? 'text-rose-900' : 'text-amber-900'}`}>
                {deletingItem?.status === 'proposed' ? 'Permanent Deletion Protocol' : 'Institutional Deletion Guardrail'}
              </h4>
              <p className={`text-xs mt-1 leading-relaxed font-medium ${deletingItem?.status === 'proposed' ? 'text-rose-700' : 'text-amber-700'}`}>
                {deletingItem?.status === 'proposed' 
                  ? `You are about to eradicate "${deletingItem?.name}" from the institutional registry. This action is irreversible and will cascade down all associated program topology.`
                  : `Compliance Violation: Persistent university records cannot be terminated. The university "${deletingItem?.name}" is currently in the ${deletingItem?.status.toUpperCase()} state. Only records in the PROPOSED state can be safely eradicated from the registry to ensure data integrity.`
                }
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t border-slate-100 uppercase">
            <button
              onClick={() => setDeletingItem(null)}
              className="px-6 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-600 font-black text-[10px] tracking-widest hover:scale-105 active:scale-95 transition-all"
            >
              Cancel
            </button>
            {deletingItem?.status === 'proposed' && (
              <button
                onClick={executeDelete}
                className="px-8 py-2 bg-rose-600 text-white rounded-xl font-black text-[10px] tracking-widest hover:bg-rose-700 transition-all active:scale-95 shadow-lg shadow-rose-900/20"
              >
                Delete
              </button>
            )}
          </div>
        </div>
      </Modal>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} hideHeader={true}>
        <div className="overflow-hidden transition-all duration-300 flex flex-col max-h-[calc(100vh-160px)]">
          <div className="bg-slate-900 p-6 text-white flex justify-between items-center shrink-0 relative border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2 rounded-xl backdrop-blur-md">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest leading-none mb-1">
                  {editingItem ? 'Edit Configuration' : 'University Config'}
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
            {errors.root && (
              <div className="p-3 rounded-xl border border-red-200 bg-red-50 flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
                <p className="text-xs font-bold text-red-700">{(errors.root as any).message}</p>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="col-span-2">
                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Institutional Designation</label>
                <div className="relative group">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-slate-900 transition-colors" />
                    <input
                    {...register('name', { 
                      required: 'Institutional Designation is mandatory',
                      minLength: { value: 3, message: 'Must be at least 3 characters' },
                      maxLength: { value: 20, message: 'Must be at most 20 characters' }
                    })}
                    className={`w-full pl-10 pr-4 py-3 bg-slate-50 border ${errors.name ? 'border-red-300 focus:ring-red-500/20 focus:border-red-500' : 'border-slate-200 focus:ring-slate-900/5 focus:border-slate-900'} rounded-xl focus:ring-2 transition-all font-medium text-slate-900`}
                    placeholder="Cambridge International"
                    />
                </div>
                {errors.name && <p className="text-red-500 text-[10px] mt-1.5 font-bold uppercase tracking-widest flex items-center gap-1"><ShieldAlert className="w-3 h-3"/> {errors.name.message as string}</p>}
                </div>

                <div className="col-span-2">
                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Short Name / Abbreviation</label>
                <div className="relative group">
                    <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-slate-900 transition-colors" />
                    <input
                    {...register('shortName', { 
                      required: 'Short Name / Abbreviation is mandatory',
                      minLength: { value: 2, message: 'Must be at least 2 characters' },
                      maxLength: { value: 12, message: 'Must be at most 12 characters' }
                    })}
                    className={`w-full pl-10 pr-4 py-3 bg-slate-50 border ${errors.shortName ? 'border-red-300 focus:ring-red-500/20 focus:border-red-500' : 'border-slate-200 focus:ring-slate-900/5 focus:border-slate-900'} rounded-xl focus:ring-2 transition-all font-bold text-slate-900 uppercase`}
                    placeholder="CU / LPU"
                    />
                </div>
                {errors.shortName && <p className="text-red-500 text-[10px] mt-1.5 font-bold uppercase tracking-widest flex items-center gap-1"><ShieldAlert className="w-3 h-3"/> {errors.shortName.message as string}</p>}
                </div>

                <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Accreditation (UGC/AICTE)</label>
                <div className="relative group">
                    <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-slate-900 transition-colors" />
                    <input
                    {...register('accreditation', { 
                      required: 'Accreditation details are mandatory',
                      minLength: { value: 2, message: 'Must be at least 2 characters' },
                      maxLength: { value: 20, message: 'Must be at most 20 characters' }
                    })}
                    className={`w-full pl-10 pr-4 py-3 bg-slate-50 border ${errors.accreditation ? 'border-red-300 focus:ring-red-500/20 focus:border-red-500' : 'border-slate-200 focus:ring-slate-900/5 focus:border-slate-900'} rounded-xl focus:ring-2 transition-all font-medium text-slate-900`}
                    placeholder="UGC Category-1"
                    />
                </div>
                {errors.accreditation && <p className="text-red-500 text-[10px] mt-1.5 font-bold uppercase tracking-widest flex items-center gap-1"><ShieldAlert className="w-3 h-3"/> {errors.accreditation.message as string}</p>}
                </div>

                <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Official Institutional URL</label>
                <div className="relative group">
                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-slate-900 transition-colors" />
                    <input
                    {...register('websiteUrl', { 
                      required: 'Official Institutional URL is mandatory',
                      maxLength: { value: 50, message: 'Must be at most 50 characters' }
                    })}
                    className={`w-full pl-10 pr-4 py-3 bg-slate-50 border ${errors.websiteUrl ? 'border-red-300 focus:ring-red-500/20 focus:border-red-500' : 'border-slate-200 focus:ring-slate-900/5 focus:border-slate-900'} rounded-xl focus:ring-2 transition-all font-medium text-slate-900`}
                    placeholder="https://university.edu"
                    />
                </div>
                {errors.websiteUrl && <p className="text-red-500 text-[10px] mt-1.5 font-bold uppercase tracking-widest flex items-center gap-1"><ShieldAlert className="w-3 h-3"/> {errors.websiteUrl.message as string}</p>}
                </div>




            </div>
          </div>

          <div className="flex justify-end gap-3 p-8 border-t border-slate-100 shrink-0">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-8 py-3.5 bg-white text-slate-600 font-bold text-xs uppercase tracking-widest rounded-2xl border border-slate-200 hover:bg-slate-50 hover:scale-105 active:scale-95 transition-all shadow-sm"
            >
              Discard
            </button>
            <button
              type="submit"
              disabled={isSubmitting || (!!editingItem && !isDirty)}
              className="px-8 py-3.5 bg-slate-900 text-white font-bold text-xs uppercase tracking-widest rounded-2xl shadow-xl shadow-slate-900/10 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:active:scale-100"
            >
              {isSubmitting ? 'Syncing...' : (editingItem ? 'Update Node' : 'Initialize Node')}
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
                     You are initiating a {pendingAction?.type.toLowerCase()} operation on a persistent university endpoint. 
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
