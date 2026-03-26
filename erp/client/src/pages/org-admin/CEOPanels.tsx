import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { DataTable } from '@/components/shared/DataTable';
import { Modal } from '@/components/shared/Modal';
import type { ColumnDef } from '@tanstack/react-table';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';

interface CEOUser {
  uid: string;
  name: string;
  email: string;
  status: 'active' | 'inactive';
  createdAt: string;
}

export default function CEOPanels() {
  const [ceos, setCeos] = useState<CEOUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<CEOUser | null>(null);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm();

  const fetchCEOs = async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/users?role=ceo');
      setCeos(res.data);
    } catch (error: any) {
      if (error.response?.status !== 404) {
        toast.error('Failed to fetch CEO panels');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCEOs();
  }, []);

  const openCreateModal = () => {
    setEditingUser(null);
    reset({ name: '', email: '', password: '', status: 'active' });
    setIsModalOpen(true);
  };

  const openEditModal = (user: CEOUser) => {
    setEditingUser(user);
    reset({ name: user.name, email: user.email, password: '', status: user.status });
    setIsModalOpen(true);
  };

  const onSubmit = async (data: any) => {
    try {
      const payload = { ...data, role: 'ceo' };
      if (!editingUser && !payload.password) {
        return toast.error('Password is required for new accounts');
      }

      if (editingUser) {
        await api.put(`/users/${editingUser.uid}`, payload);
        toast.success('CEO account updated');
      } else {
        await api.post('/users', payload);
        toast.success('CEO account created');
      }
      setIsModalOpen(false);
      fetchCEOs();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Operation failed');
    }
  };

  const handleDelete = async (uid: string) => {
    if (!window.confirm('Are you sure you want to delete this CEO account?')) return;
    try {
      await api.delete(`/users/${uid}`);
      toast.success('Account deleted');
      fetchCEOs();
    } catch (error) {
      toast.error('Failed to delete account');
    }
  };

  const columns: ColumnDef<CEOUser>[] = [
    { accessorKey: 'name', header: 'Full Name' },
    { accessorKey: 'email', header: 'Email Address' },
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
        const user = row.original;
        return (
          <div className="flex items-center space-x-2">
            <button onClick={() => openEditModal(user)} className="p-1 hover:bg-slate-100 rounded text-slate-600 transition-colors">
              <Edit2 className="w-4 h-4" />
            </button>
            <button onClick={() => handleDelete(user.uid)} className="p-1 hover:bg-red-50 rounded text-red-600 transition-colors">
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
          <h1 className="text-2xl font-bold text-slate-900">CEO Panels</h1>
          <p className="text-slate-500">Manage executive CEO accounts and dashboard access</p>
        </div>
        <button 
          onClick={openCreateModal}
          className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Add CEO</span>
        </button>
      </div>

      <DataTable 
        columns={columns} 
        data={ceos} 
        isLoading={isLoading} 
        searchKey="name" 
        searchPlaceholder="Search executives..." 
        emptyMessage="No CEO panels defined yet."
        emptyDescription="Create executive accounts to grant access to the leadership dashboard."
      />

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingUser ? "Edit CEO Account" : "Create CEO Account"}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
            <input
              {...register('name', { required: 'Name is required' })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-slate-500 focus:border-slate-500 shadow-sm"
              placeholder="e.g. John Doe"
            />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message as string}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
            <input
              type="email"
              {...register('email', { required: 'Email is required' })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-slate-500 focus:border-slate-500 shadow-sm"
              placeholder="e.g. ceo@iits.edu"
            />
            {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message as string}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Password {editingUser && <span className="text-slate-400 font-normal">(Leave blank to keep current)</span>}
            </label>
            <input
              type="password"
              {...register('password')}
              autoComplete="new-password"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-slate-500 focus:border-slate-500 shadow-sm"
              placeholder={editingUser ? "Enter new password" : "Required password"}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Account Status</label>
            <select
              {...register('status')}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-slate-500 focus:border-slate-500 shadow-sm"
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
              {isSubmitting ? 'Processing...' : (editingUser ? 'Save Updates' : 'Create CEO')}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
