import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { DataTable } from '@/components/shared/DataTable';
import { Modal } from '@/components/shared/Modal';
import type { ColumnDef } from '@tanstack/react-table';
import { Plus, CheckCircle, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';

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

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm();

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [vacRes, deptRes] = await Promise.all([
        api.get('/hr/vacancies'),
        api.get('/departments')
      ]);
      setVacancies(vacRes.data);
      setDepartments(deptRes.data);
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
    { accessorKey: 'id', header: 'ID' },
    { accessorKey: 'title', header: 'Position Title' },
    { 
      id: 'department',
      header: 'Department',
      cell: ({ row }) => row.original.department?.name || 'N/A'
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
          {row.original.status}
        </span>
      )
    }
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Workforce Planning</h1>
          <p className="text-slate-500">Manage institutional vacancies and hiring quotas</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center space-x-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-all font-medium"
        >
          <Plus className="w-5 h-5" />
          <span>Open Vacancy</span>
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <DataTable 
          columns={columns} 
          data={vacancies} 
          isLoading={isLoading} 
          searchKey="title"
          searchPlaceholder="Search positions..."
        />
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Open New Institutional Vacancy">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">Position Title</label>
            <input 
              {...register('title', { required: 'Title is required' })}
              className="mt-1 w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              placeholder="Senior Admissions Officer"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">Department</label>
              <select 
                {...register('departmentId', { required: true })}
                className="mt-1 w-full p-2 border border-slate-300 rounded-lg"
              >
                <option value="">Select Department</option>
                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Total Positions (Quota)</label>
              <input 
                type="number"
                {...register('count', { required: true, min: 1 })}
                className="mt-1 w-full p-2 border border-slate-300 rounded-lg"
                defaultValue={1}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Requirements / Remarks</label>
            <textarea 
              {...register('requirements')}
              className="mt-1 w-full p-2 border border-slate-300 rounded-lg"
              rows={3}
            />
          </div>
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 font-medium">Cancel</button>
            <button 
              type="submit" 
              disabled={isSubmitting}
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 transition-all shadow-md active:scale-95 disabled:opacity-50"
            >
              {isSubmitting ? 'Processing...' : 'Deploy Vacancy'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
