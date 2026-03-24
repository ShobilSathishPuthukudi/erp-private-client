import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { DataTable } from '@/components/shared/DataTable';
import { Modal } from '@/components/shared/Modal';
import type { ColumnDef } from '@tanstack/react-table';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

interface Department {
  id: number;
  name: string;
  type: string;
  adminId: string | null;
  status: 'active' | 'inactive';
  createdAt: string;
}

const deptSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  type: z.string().min(1, 'Type is required'),
  status: z.enum(['active', 'inactive']),
});

type DeptForm = z.infer<typeof deptSchema>;

export default function Departments() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<DeptForm>({
    resolver: zodResolver(deptSchema),
    defaultValues: { status: 'active' }
  });

  const fetchDepartments = async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/departments');
      setDepartments(res.data);
    } catch (error) {
      toast.error('Failed to fetch departments');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  const openCreateModal = () => {
    setEditingDept(null);
    reset({ name: '', type: 'academic', status: 'active' });
    setIsModalOpen(true);
  };

  const openEditModal = (dept: Department) => {
    setEditingDept(dept);
    reset({ name: dept.name, type: dept.type, status: dept.status });
    setIsModalOpen(true);
  };

  const onSubmit = async (data: DeptForm) => {
    try {
      if (editingDept) {
        await api.put(`/departments/${editingDept.id}`, data);
        toast.success('Department updated');
      } else {
        await api.post('/departments', data);
        toast.success('Department created');
      }
      setIsModalOpen(false);
      fetchDepartments();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Operation failed');
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this department?')) return;
    try {
      await api.delete(`/departments/${id}`);
      toast.success('Department deleted');
      fetchDepartments();
    } catch (error) {
      toast.error('Failed to delete department');
    }
  };

  const columns: ColumnDef<Department>[] = [
    { accessorKey: 'id', header: 'ID' },
    { accessorKey: 'name', header: 'Department Name' },
    { accessorKey: 'type', header: 'Type', cell: ({ row }) => <span className="capitalize">{row.original.type}</span> },
    { 
      accessorKey: 'status', 
      header: 'Status',
      cell: ({ row }) => {
        const status = row.original.status;
        return (
          <span className={`px-2 py-1 text-xs rounded-full font-medium ${status === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'}`}>
            {status.toUpperCase()}
          </span>
        );
      }
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const dept = row.original;
        return (
          <div className="flex items-center space-x-2">
            <button onClick={() => openEditModal(dept)} className="p-1 hover:bg-slate-100 rounded text-blue-600 transition-colors">
              <Edit2 className="w-4 h-4" />
            </button>
            <button onClick={() => handleDelete(dept.id)} className="p-1 hover:bg-slate-100 rounded text-red-600 transition-colors">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        );
      }
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Departments</h1>
          <p className="text-slate-500">Manage organizational departments and divisions</p>
        </div>
        <button 
          onClick={openCreateModal}
          className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>New Department</span>
        </button>
      </div>

      <DataTable 
        columns={columns} 
        data={departments} 
        isLoading={isLoading} 
        searchKey="name" 
        searchPlaceholder="Search departments..." 
      />

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingDept ? "Edit Department" : "Create Department"}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Department Name</label>
            <input
              {...register('name')}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 shadow-sm"
              placeholder="e.g. School of Computing"
            />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
            <select
              {...register('type')}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 shadow-sm"
            >
              <option value="academic">Academic</option>
              <option value="administrative">Administrative</option>
              <option value="support">Support</option>
            </select>
            {errors.type && <p className="text-red-500 text-xs mt-1">{errors.type.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
            <select
              {...register('status')}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 shadow-sm"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          <div className="pt-4 flex justify-end space-x-3 border-t border-slate-100 mt-6">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm"
            >
              {isSubmitting ? 'Saving...' : 'Save Department'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
