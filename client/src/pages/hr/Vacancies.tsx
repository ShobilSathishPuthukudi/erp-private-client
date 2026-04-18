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
import { clsx } from 'clsx';

interface Vacancy {
  id: number;
  title: string;
  departmentId: number;
  subDepartment: string;
  count: number;
  filledCount: number;
  status: 'OPEN' | 'CLOSED';
  requirements?: string;
  department?: { 
    name: string;
    type?: string;
    parent?: { name: string };
  };
}

export default function Vacancies() {
  const [vacancies, setVacancies] = useState<Vacancy[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedVacancy, setSelectedVacancy] = useState<Vacancy | null>(null);

  const { register, handleSubmit, reset, formState: { isSubmitting, errors } } = useForm();

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [vacRes, deptRes] = await Promise.all([
        api.get('/hr/vacancies'),
        api.get('/departments')
      ]);
      setVacancies(vacRes.data);
      // Safety Filter: Ensure non-functional units are excluded even if backend returns them
      const filteredDepts = (deptRes.data || []).filter((d: any) => {
        const type = d.type?.toLowerCase() || '';
        return ['departments', 'department', 'sub-departments', 'sub-department'].includes(type);
      });
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
      cell: ({ row }) => {
        const v = row.original;
        const isSub = v.department?.type?.toLowerCase().startsWith('sub-');
        const deptName = isSub ? v.department?.parent?.name : v.department?.name;
        return toSentenceCase(deptName || 'N/A');
      }
    },
    { 
      id: 'subDepartment',
      header: 'Sub-department',
      cell: ({ row }) => {
        const v = row.original;
        const isSub = v.department?.type?.toLowerCase().startsWith('sub-');
        const subName = isSub ? v.department?.name : (v.subDepartment === 'General' ? 'Nil' : v.subDepartment);
        return toSentenceCase(subName || 'Nil');
      }
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
          onRowClick={(vacancy) => {
            setSelectedVacancy(vacancy);
            setIsDetailModalOpen(true);
          }}
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
                {...register('title', { 
                  required: 'Position title is required',
                  minLength: { value: 3, message: 'Position title must be at least 3 characters' },
                  maxLength: { value: 24, message: 'Position title cannot exceed 24 characters' }
                })}
                className={clsx(
                  "w-full px-4 py-3 bg-slate-50 border rounded-xl mt-1 focus:ring-2 outline-none transition-all font-medium",
                  errors.title ? "border-rose-300 focus:ring-rose-500 bg-rose-50/30" : "border-slate-200 focus:ring-blue-500"
                )}
                placeholder="Senior Admissions Officer"
              />
              {errors.title && <p className="text-[10px] font-bold text-rose-600 uppercase tracking-tight">{errors.title.message as string}</p>}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Department</label>
                <select 
                  {...register('departmentId', { required: 'Department is required' })}
                  className={clsx(
                    "w-full px-4 py-3 bg-slate-50 border rounded-xl mt-1 focus:ring-2 outline-none transition-all font-medium appearance-none cursor-pointer hover:bg-white",
                    errors.departmentId ? "border-rose-300 focus:ring-rose-500 bg-rose-50/30" : "border-slate-200 focus:ring-blue-500"
                  )}
                >
                  <option value="">Select Department</option>
                  {departments.map(d => <option key={d.id} value={d.id}>{d.name} ({toSentenceCase(d.type || 'Department')})</option>)}
                </select>
                {errors.departmentId && <p className="text-[10px] font-bold text-rose-600 uppercase tracking-tight">{errors.departmentId.message as string}</p>}
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Total Positions (Quota)</label>
                <input 
                  type="number"
                  {...register('count', { 
                    required: 'Quota is required', 
                    min: { value: 1, message: 'Must be at least 1' } 
                  })}
                  className={clsx(
                    "w-full px-4 py-3 bg-slate-50 border rounded-xl mt-1 focus:ring-2 outline-none transition-all font-medium",
                    errors.count ? "border-rose-300 focus:ring-rose-500 bg-rose-50/30" : "border-slate-200 focus:ring-blue-500"
                  )}
                  defaultValue={1}
                />
                {errors.count && <p className="text-[10px] font-bold text-rose-600 uppercase tracking-tight">{errors.count.message as string}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Requirements / Remarks</label>
              <textarea 
                {...register('requirements', {
                  required: 'Requirements are required',
                  minLength: { value: 3, message: 'Requirements must be at least 3 characters' },
                  maxLength: { value: 50, message: 'Requirements cannot exceed 50 characters' }
                })}
                className={clsx(
                  "w-full px-4 py-3 bg-slate-50 border rounded-xl mt-1 focus:ring-2 outline-none transition-all font-medium",
                  errors.requirements ? "border-rose-300 focus:ring-rose-500 bg-rose-50/30" : "border-slate-200 focus:ring-blue-500"
                )}
                rows={3}
                placeholder="Specify key qualifications or job responsibilities..."
              />
              {errors.requirements && <p className="text-[10px] font-bold text-rose-600 uppercase tracking-tight">{errors.requirements.message as string}</p>}
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

      {/* Vacancy Detail Modal */}
      <Modal 
        isOpen={isDetailModalOpen} 
        onClose={() => setIsDetailModalOpen(false)} 
        hideHeader 
        maxWidth="2xl"
      >
        {selectedVacancy && (
          <div className="flex flex-col h-full">
            <div className="bg-slate-900 p-6 text-white flex justify-between items-center shrink-0 relative border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded-xl backdrop-blur-md">
                  <Briefcase className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-widest leading-none mb-1">
                    Institutional Vacancy Details
                  </p>
                  <h2 className="text-xl font-bold tracking-tight">{toSentenceCase(selectedVacancy.title)}</h2>
                </div>
              </div>
              <button 
                onClick={() => setIsDetailModalOpen(false)}
                className="p-2 hover:bg-white/10 rounded-lg transition-all text-white/60 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-8 space-y-8 bg-white overflow-y-auto max-h-[80vh]">
              {/* Quick Status Badge */}
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full animate-pulse ${selectedVacancy.status === 'OPEN' ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'bg-red-500'}`} />
                  <span className="text-sm font-bold text-slate-700 tracking-tight">System Status: {toSentenceCase(selectedVacancy.status)}</span>
                </div>
                <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                  Ref ID: #VAC-{selectedVacancy.id.toString().padStart(4, '0')}
                </div>
              </div>

              {/* Grid Information */}
              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Department</label>
                  <div className="flex items-center gap-2 text-slate-700 font-semibold text-sm">
                    <span className="p-1.5 bg-blue-50 text-blue-600 rounded-lg shrink-0"><Briefcase className="w-4 h-4" /></span>
                    <span className="truncate" title={selectedVacancy.department?.name}>
                      {toSentenceCase(selectedVacancy.department?.name || 'Institutional Unit')}
                    </span>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Quota Utilization</label>
                  <div className="flex items-center gap-2 text-slate-700 font-semibold text-sm">
                    <span className="p-1.5 bg-amber-50 text-amber-600 rounded-lg shrink-0"><Briefcase className="w-4 h-4" /></span>
                    <span className="truncate">{selectedVacancy.filledCount} of {selectedVacancy.count} Filled</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Vacancy ID</label>
                  <div className="flex items-center gap-2 text-slate-700 font-semibold text-sm">
                    <span className="p-1.5 bg-slate-50 text-slate-600 rounded-lg shrink-0"><Briefcase className="w-4 h-4" /></span>
                    <span className="truncate">{selectedVacancy.id}</span>
                  </div>
                </div>
              </div>

              {/* Requirements Section */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="h-px bg-slate-200 flex-grow" />
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] whitespace-nowrap">Institutional Requirements</label>
                  <div className="h-px bg-slate-200 flex-grow" />
                </div>
                <div className="bg-slate-50/50 p-6 rounded-3xl border border-slate-100 text-slate-600 leading-relaxed min-h-[120px]">
                  {selectedVacancy.requirements ? (
                    <p className="whitespace-pre-wrap text-sm font-medium">
                      {selectedVacancy.requirements}
                    </p>
                  ) : (
                    <p className="text-sm italic text-slate-400">No specific requirements mentioned for this vacancy.</p>
                  )}
                </div>
              </div>
            </div>

            <div className="p-6 bg-slate-50 border-t border-slate-200 flex justify-end shrink-0 rounded-b-3xl">
              <button 
                onClick={() => setIsDetailModalOpen(false)}
                className="px-10 py-3 bg-slate-900 text-white font-bold text-xs uppercase tracking-widest rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-xl shadow-slate-900/20"
              >
                Close View
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
