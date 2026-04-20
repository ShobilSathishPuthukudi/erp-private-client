import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { DataTable } from '@/components/shared/DataTable';
import { Modal } from '@/components/shared/Modal';
import { RemarkModal } from '@/components/shared/RemarkModal';
import type { ColumnDef } from '@tanstack/react-table';
import { DollarSign, Plus, Save, Trash2, Layout } from 'lucide-react';
import toast from 'react-hot-toast';
import { useForm, useFieldArray } from 'react-hook-form';

interface Program {
  id: number;
  name: string;
  status: string;
}

export default function FeeConfig() {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRemarkModalOpen, setIsRemarkModalOpen] = useState(false);
  const [selectedProgram, setSelectedProgram] = useState<Program | null>(null);
  const [pendingData, setPendingData] = useState<any>(null);

  const { register, control, handleSubmit, reset } = useForm({
    defaultValues: {
      name: '',
      schemaType: 'semester',
      installments: [{ label: '1st Installment', amount: 0 }]
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "installments"
  });

  useEffect(() => {
    const fetchPrograms = async () => {
      try {
        const res = await api.get('/academic/programs');
        setPrograms(res.data);
      } catch (error) {
        toast.error('Failed to load program registry');
      } finally {
        setIsLoading(false);
      }
    };
    fetchPrograms();
  }, []);

  const openConfigModal = (program: Program) => {
    setSelectedProgram(program);
    reset({
      name: `${program.name} - Regular Fee`,
      schemaType: 'semester',
      installments: [{ label: 'Term 1', amount: 0 }]
    });
    setIsModalOpen(true);
  };

  const handleAuditRequest = (data: any) => {
    setPendingData(data);
    setIsRemarkModalOpen(true);
  };

  const onSubmit = async (remarks: string) => {
    try {
      const payload = {
        programId: selectedProgram?.id,
        name: pendingData.name,
        remarks,
        schema: {
          type: pendingData.schemaType,
          installments: pendingData.installments
        }
      };
      await api.post('/fees', payload);
      toast.success('Institutional fee schema deployed and program activated');
      setIsRemarkModalOpen(false);
      setIsModalOpen(false);
      setPendingData(null);
      // Refresh programs to see status change
      const res = await api.get('/academic/programs');
      setPrograms(res.data);
    } catch (error: any) {
        toast.error(error.response?.data?.error || 'Logic error during schema deployment');
    }
  };

  const columns: ColumnDef<Program>[] = [
    { accessorKey: 'id', header: 'PID', cell: ({ row }) => <span className="font-mono text-xs text-slate-400">P-{row.original.id}</span> },
    { accessorKey: 'name', header: 'Academic Offering', cell: ({ row }) => <span className="font-bold text-slate-800">{row.original.name}</span> },
    { 
        accessorKey: 'status', 
        header: 'Lifecycle State', 
        cell: ({ row }) => (
            <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                row.original.status === 'draft' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'
            }`}>
                {row.original.status}
            </span>
        )
    },
    {
      id: 'actions',
      header: 'Fee Protocol',
      cell: ({ row }) => (
        <button 
            onClick={() => openConfigModal(row.original)}
            className="flex items-center space-x-2 text-xs font-bold bg-slate-900 text-white px-3 py-1.5 rounded-lg hover:bg-slate-800 transition-colors"
        >
            <DollarSign className="w-3 h-3" />
            <span>Configure Schema</span>
        </button>
      )
    }
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-6">
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Layout className="w-6 h-6 text-blue-600" />
            Program Fee Configuration
        </h1>
        <p className="text-slate-500 mt-1 text-sm">Design and version institutional payment structures for global academic programs.</p>
      </div>

      <DataTable columns={columns} data={programs} isLoading={isLoading} searchKey="name" searchPlaceholder="Filter by program designation..." />

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={`Configure Fee Schema: ${selectedProgram?.name}`}
      >
        <form onSubmit={handleSubmit(handleAuditRequest)} className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
            <div>
                <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-tight">Schema Identifier</label>
                <input 
                    {...register('name', { required: true })}
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="Session 2024-25 EMI Plan"
                />
            </div>

            <div>
                <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-tight">Structure Type</label>
                <select 
                    {...register('schemaType')}
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                >
                    <option value="semester">Semester Scheme</option>
                    <option value="yearly">Yearly Scheme</option>
                    <option value="emi">Custom EMI / Installments</option>
                </select>
            </div>

            <div>
                <div className="flex justify-between items-center mb-4">
                    <label className="text-sm font-bold text-slate-700 uppercase tracking-tight">Installment Breakdown</label>
                    <button 
                        type="button" 
                        onClick={() => append({ label: `Installment ${fields.length + 1}`, amount: 0 })}
                        className="p-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                    </button>
                </div>
                
                <div className="space-y-3">
                    {fields.map((field, index) => (
                        <div key={field.id} className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100 ">
                            <input
                                {...register(`installments.${index}.label` as const, {
                                  required: 'Label required',
                                  validate: (v) => (typeof v === 'string' && v.trim().length > 0) || 'Label required',
                                })}
                                className="flex-1 bg-transparent font-medium text-slate-900 outline-none"
                                placeholder="Label"
                            />
                            <div className="flex items-center gap-1 bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-inner">
                                <span className="text-slate-400 text-xs font-bold">₹</span>
                                <input
                                    type="number"
                                    min={0.01}
                                    step="0.01"
                                    {...register(`installments.${index}.amount` as const, {
                                      required: 'Amount required',
                                      valueAsNumber: true,
                                      validate: (v) =>
                                        (typeof v === 'number' && Number.isFinite(v) && v > 0) ||
                                        'Amount must be greater than zero',
                                    })}
                                    className="w-20 outline-none font-bold text-slate-900"
                                />
                            </div>
                            <button 
                                type="button" 
                                onClick={() => remove(index)}
                                className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            <div className="pt-6 border-t border-slate-100 flex justify-end gap-3 sticky bottom-0 bg-white">
                <button 
                    type="button" 
                    onClick={() => setIsModalOpen(false)}
                    className="px-6 py-2 text-slate-500 font-bold hover:text-slate-700 transition-colors"
                >
                    Abort
                </button>
                <button 
                    type="submit"
                    className="px-8 py-2 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-shadow shadow-lg shadow-slate-200 flex items-center gap-2"
                >
                    <Save className="w-4 h-4" />
                    Certify & Activate
                </button>
            </div>
        </form>
      </Modal>

      <RemarkModal 
        isOpen={isRemarkModalOpen}
        onClose={() => setIsRemarkModalOpen(false)}
        onConfirm={onSubmit}
        title="Fee Schema Audit Certification"
        actionLabel="Certify & Deploy"
      />
    </div>
  );
}
