import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { DataTable } from '@/components/shared/DataTable';
import { Modal } from '@/components/shared/Modal';
import type { ColumnDef } from '@tanstack/react-table';
import { Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';

interface Leave {
  id: number;
  type: string;
  fromDate: string;
  toDate: string;
  status: string;
  employee?: {
    department?: { name: string };
  };
  createdAt: string;
}

export default function LeaveRequests() {
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { register, handleSubmit, reset, watch, formState: { errors, isSubmitting } } = useForm();
  const fromDate = watch('fromDate');

  // Calculate minimum selectable end date (must be at least one day after start date)
  const getMinEndDate = (startDate: string) => {
    if (!startDate) return undefined;
    const date = new Date(startDate);
    date.setDate(date.getDate() + 1);
    return date.toISOString().split('T')[0];
  };

  const fetchLeaves = async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/portals/employee/leaves');
      setLeaves(res.data);
    } catch (error) {
      toast.error('Failed to fetch your leave requests');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this leave request?')) return;
    try {
      await api.delete(`/portals/employee/leaves/${id}`);
      toast.success('Leave request deleted successfully');
      fetchLeaves();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to delete leave request');
    }
  };

  useEffect(() => {
    fetchLeaves();
  }, []);

  const openCreateModal = () => {
    reset({ 
      type: 'Annual Leave', 
      fromDate: '', 
      toDate: '',
      reason: '' 
    });
    setIsModalOpen(true);
  };

  const onSubmit = async (data: any) => {
    try {
      await api.post('/portals/employee/leaves', data);
      toast.success('Leave request submitted successfully');
      setIsModalOpen(false);
      fetchLeaves();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to submit leave request');
    }
  };

  const columns: ColumnDef<Leave>[] = [
    { 
      accessorKey: 'type', 
      header: 'Leave Type',
      cell: ({ row }) => <span className="font-semibold text-slate-800">{row.original.type}</span>
    },
    { 
      id: 'dates', 
      header: 'Given Duration',
      cell: ({ row }) => (
        <span className="text-sm">
          {new Date(row.original.fromDate).toLocaleDateString()} - {new Date(row.original.toDate).toLocaleDateString()}
        </span>
      )
    },
    { 
      id: 'submitted', 
      header: 'Applied On',
      cell: ({ row }) => new Date(row.original.createdAt).toLocaleDateString()
    },
    { 
      accessorKey: 'status', 
      header: 'Approval Status',
      cell: ({ row }) => {
        const s = row.original.status;
        let color = 'bg-slate-100 text-slate-700';
        if (s === 'approved') color = 'bg-green-100 text-green-700';
        if (s.includes('rejected')) color = 'bg-red-100 text-red-700';
        if (s.includes('pending')) color = 'bg-orange-100 text-orange-700';
        
        return (
          <span className={`px-2 py-1 text-[10px] rounded-full font-bold uppercase ${color}`}>
            {s === 'pending_step1' ? 'pending approval' : (s === 'pending_step2' ? (row.original.employee?.department?.name === 'HR Department' || row.original.employee?.department?.name === 'HR' ? 'forwarded to workforce control' : 'forwarded to hr') : s.replace('_', ' '))}
          </span>
        );
      }
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          {row.original.status === 'pending_step1' && (
            <button 
              onClick={() => handleDelete(row.original.id)}
              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Delete Request"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6 flex flex-col h-[calc(100vh-8rem)]">
      <div className="flex justify-between items-center shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Leave Requests</h1>
          <p className="text-slate-500">Submit and track your history of physical absences</p>
        </div>
        <button 
          onClick={openCreateModal}
          className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors shadow-sm font-medium text-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Request Leave</span>
        </button>
      </div>

      <div className="flex-1 min-h-0 bg-white shadow-sm border border-slate-200 rounded-lg flex flex-col">
        <DataTable 
          columns={columns} 
          data={leaves} 
          isLoading={isLoading} 
          searchKey="type" 
          searchPlaceholder="Search by leave type..." 
        />
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Submit Leave Request"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Leave Category</label>
            <select
              {...register('type')}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 shadow-sm bg-white"
            >
              <option value="Annual Leave">Annual Leave</option>
              <option value="Sick Leave">Sick Leave</option>
              <option value="Maternity / Paternity">Maternity / Paternity</option>
              <option value="Unpaid Leave">Unpaid Leave</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Start Date</label>
              <input
                type="date"
                {...register('fromDate', { required: 'Start date is required' })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 shadow-sm"
              />
              {errors.fromDate && <p className="text-red-500 text-xs mt-1">{errors.fromDate.message as string}</p>}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">End Date</label>
              <input
                type="date"
                disabled={!fromDate}
                min={getMinEndDate(fromDate)}
                {...register('toDate', { 
                  required: 'End date is required',
                  validate: (value) => 
                    !fromDate || value > fromDate || 'End date must be after start date'
                })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 shadow-sm disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed"
              />
              {errors.toDate && <p className="text-red-500 text-xs mt-1">{errors.toDate.message as string}</p>}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Reason / Details</label>
            <textarea
              {...register('reason', { required: 'Please provide a reason for your leave' })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 shadow-sm h-24"
              placeholder="Provide a brief explanation for your absence..."
            />
            {errors.reason && <p className="text-red-500 text-xs mt-1">{errors.reason.message as string}</p>}
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
              {isSubmitting ? 'Submitting...' : 'Submit to Dept Admin'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
