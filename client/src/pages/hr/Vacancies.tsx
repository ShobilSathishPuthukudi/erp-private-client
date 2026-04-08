import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { DataTable } from '@/components/shared/DataTable';
import { Modal } from '@/components/shared/Modal';
import type { ColumnDef } from '@tanstack/react-table';
import { Plus, Briefcase, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import { PageHeader } from '@/components/shared/PageHeader';
import { toSentenceCase } from '@/lib/utils';

interface Vacancy {
  id: number;
  title: string;
  departmentId: number;
  subDepartment: string;
  count: number;
  filledCount: number;
  status: 'OPEN' | 'CLOSED';
  department?: { name: string };
}

export default function Vacancies() {
  const [vacancies, setVacancies] = useState<Vacancy[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm();

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [vacRes, deptRes] = await Promise.all([
        api.get('/hr/vacancies'),
        api.get('/departments')
      ]);
      setVacancies(vacRes.data);
      // Safety Filter: Ensure non-functional units are excluded even if backend returns them
      const filteredDepts = (deptRes.data || []).filter((d: any) => 
        !['university', 'partner-center', 'branch'].includes(d.type?.toLowerCase())
      );
      setDepartments(filteredDepts);
    } catch (error) {
      toast.error('Failed to fetch vacancies');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onSubmit = async (data: any) => {
    try {
      await api.post('/hr/vacancies', data);
      toast.success('Vacancy opened successfully');
      setIsModalOpen(false);
      reset();
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to open vacancy');
    }
  };

  const columns: ColumnDef<Vacancy>[] = [
    { accessorKey: 'id', header: 'Id' },
    { 
      accessorKey: 'title', 
      header: 'Position title',
      cell: ({ row }) => toSentenceCase(row.original.title)
    },
    { 
      id: 'department',
      header: 'Department',
      cell: ({ row }) => toSentenceCase(row.original.department?.name || 'N/A')
    },
    { 
      id: 'capacity',
      header: 'Capacity',
      cell: ({ row }) => `${row.original.filledCount} / ${row.original.count}`
    },
    { 
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <span className={`px-2 py-1 rounded-full text-xs font-bold ${
          row.original.status === 'OPEN' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
        }`}>
          {toSentenceCase(row.original.status)}
        </span>
      )
    }
  ];

  return (
    <div className="p-6 space-y-6">
      <PageHeader 
        title="Workforce Planning"
        description="Manage institutional vacancies and hiring quotas"
        icon={Briefcase}
        action={
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center space-x-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-all font-medium whitespace-nowrap"
          >
            <Plus className="w-5 h-5" />
            <span>Open Vacancy</span>
          </button>
        }
      />

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <DataTable 
          columns={columns} 
          data={vacancies} 
          isLoading={isLoading} 
          searchKey="title"
          searchPlaceholder="Search positions..."
        />
      </div>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        hideHeader 
        maxWidth="4xl"
      >
        <div className="bg-slate-900 p-6 text-white flex justify-between items-center shrink-0 relative border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-xl backdrop-blur-md">
              <Briefcase className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-widest leading-none mb-1">
                Institutional Workforce
              </p>
              <h2 className="text-xl font-bold tracking-tight">Open New Vacancy</h2>
            </div>
          </div>
          <button 
            onClick={() => setIsModalOpen(false)}
            className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-lg transition-all hover:scale-110 active:scale-90 text-white/60 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col">
          <div className="p-8 space-y-6 bg-white overflow-y-auto max-h-[calc(100vh-240px)]">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Position Title</label>
              <input 
                {...register('title', { required: 'Title is required' })}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl mt-1 focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium"
                placeholder="Senior Admissions Officer"
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Department</label>
                <select 
                  {...register('departmentId', { required: true })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl mt-1 focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium appearance-none cursor-pointer hover:bg-white"
                >
                  <option value="">Select Department</option>
                  {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Total Positions (Quota)</label>
                <input 
                  type="number"
                  {...register('count', { required: true, min: 1 })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl mt-1 focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium"
                  defaultValue={1}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Requirements / Remarks</label>
              <textarea 
                {...register('requirements')}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl mt-1 focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium"
                rows={3}
                placeholder="Specify key qualifications or job responsibilities..."
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 p-8 bg-slate-50 border-t border-slate-200 shrink-0">
            <button 
              type="button" 
              onClick={() => setIsModalOpen(false)} 
              className="px-8 py-3.5 bg-white text-slate-600 font-bold text-xs uppercase tracking-widest rounded-2xl border border-slate-200 hover:bg-slate-50 hover:scale-105 active:scale-95 transition-all shadow-sm"
            >
              Discard
            </button>
            <button 
              type="submit" 
              disabled={isSubmitting}
              className="px-8 py-3.5 bg-slate-900 text-white font-bold text-xs uppercase tracking-widest rounded-2xl shadow-xl shadow-slate-900/10 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:scale-100"
            >
              {isSubmitting ? 'Processing...' : 'Deploy Vacancy'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
