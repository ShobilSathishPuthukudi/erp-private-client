import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { DataTable } from '@/components/shared/DataTable';
import { Modal } from '@/components/shared/Modal';
import type { ColumnDef } from '@tanstack/react-table';
import { Plus, Trash2, Calendar, FileText, Tag, CheckCircle, Info, ChevronDown } from 'lucide-react';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import { clsx } from 'clsx';

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

interface LeaveFormData {
  type: string;
  fromDate: string;
  toDate: string;
  reason: string;
}

const getErrorMessage = (error: unknown, fallback: string) => {
  if (
    error &&
    typeof error === 'object' &&
    'response' in error &&
    error.response &&
    typeof error.response === 'object' &&
    'data' in error.response &&
    error.response.data &&
    typeof error.response.data === 'object' &&
    'error' in error.response.data &&
    typeof error.response.data.error === 'string'
  ) {
    return error.response.data.error;
  }

  return fallback;
};

export default function LeaveRequests() {
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { register, handleSubmit, reset, watch, formState: { errors, isSubmitting } } = useForm<LeaveFormData>();
  const fromDate = watch('fromDate');
  const toDate = watch('toDate');
  const reasonValue = watch('reason') || '';

  const durationDays = (() => {
    if (!fromDate || !toDate) return null;
    const a = new Date(fromDate).getTime();
    const b = new Date(toDate).getTime();
    if (!Number.isFinite(a) || !Number.isFinite(b) || b < a) return null;
    return Math.max(1, Math.round((b - a) / 86400000) + 1);
  })();
  const today = new Date();
  const minStartDate = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().split('T')[0];

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
    } catch {
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
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Failed to delete leave request'));
    }
  };

  useEffect(() => {
    fetchLeaves();
  }, []);

  const openCreateModal = () => {
    reset({ 
      type: '', 
      fromDate: '', 
      toDate: '',
      reason: '' 
    });
    setIsModalOpen(true);
  };

  const onSubmit = async (data: LeaveFormData) => {
    try {
      await api.post('/portals/employee/leaves', data);
      toast.success('Leave request submitted successfully');
      setIsModalOpen(false);
      fetchLeaves();
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Failed to submit leave request'));
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
            {['pending_step1', 'pending admin'].includes(s) ? 'pending admin' : 
             (['pending_step2', 'pending hr'].includes(s) ? (row.original.employee?.department?.name === 'HR Department' || row.original.employee?.department?.name === 'HR' ? 'forwarded to workforce control' : 'pending hr') : 
             s.replace('_', ' '))}
          </span>
        );
      }
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          {['pending_step1', 'pending admin'].includes(row.original.status) && (
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
          <h1 className="text-2xl font-bold text-slate-900">My leave requests</h1>
          <p className="text-slate-500">Submit and track your history of physical absences</p>
        </div>
        <button 
          onClick={openCreateModal}
          className="flex items-center space-x-2 bg-slate-900 hover:bg-slate-800 text-white px-6 py-3 rounded-lg transition-all shadow-lg shadow-slate-200 font-black text-xs uppercase tracking-widest active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Request Leave</span>
        </button>
      </div>

      <div className="flex-1 min-h-0 bg-white shadow-xl shadow-slate-200/50 border border-slate-200 rounded-lg flex flex-col overflow-hidden">
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
        title="Request leave"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Leave type */}
          <div className="space-y-1">
            <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
              Leave Category
            </label>
            <div className="relative group">
              <select
                {...register('type', { required: 'Leave type is required' })}
                className={clsx(
                  "w-full border rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 transition-all appearance-none bg-slate-50/50",
                  errors.type ? "border-rose-300 focus:ring-rose-500 bg-rose-50/30" : "border-slate-200 focus:ring-blue-500"
                )}
              >
                <option value="">Select a category</option>
                <option value="Annual Leave">Annual leave</option>
                <option value="Sick Leave">Sick leave</option>
                <option value="Maternity / Paternity">Maternity / Paternity</option>
                <option value="Unpaid Leave">Unpaid leave</option>
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                <ChevronDown className="w-4 h-4" />
              </div>
            </div>
            {errors.type && <p className="text-[10px] font-bold text-rose-600 uppercase tracking-tight">{errors.type.message as string}</p>}
          </div>

          <div className="space-y-3">
            <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
              Absence Period
            </label>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Starting From</p>
                <div className="relative group">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                  <input
                    type="date"
                    min={minStartDate}
                    {...register('fromDate', {
                      required: 'Start date is required',
                      validate: (value) => value >= minStartDate || 'Past dates are not allowed',
                    })}
                    className={clsx(
                      "w-full border rounded-xl pl-11 pr-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 transition-all bg-white",
                      errors.fromDate ? "border-rose-300 focus:ring-rose-500 bg-rose-50/30" : "border-slate-300 focus:ring-blue-500"
                    )}
                  />
                </div>
                {errors.fromDate && <p className="text-[10px] font-bold text-rose-600 uppercase tracking-tight">{errors.fromDate.message as string}</p>}
              </div>

              <div className="space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Ending On</p>
                <div className="relative group">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                  <input
                    type="date"
                    disabled={!fromDate}
                    min={getMinEndDate(fromDate || '')}
                    {...register('toDate', {
                      required: 'End date is required',
                      validate: (value) => {
                        if (value < minStartDate) return 'Past dates are not allowed';
                        if (fromDate && value <= fromDate) return 'End date must be after start date';
                        return true;
                      },
                    })}
                    className={clsx(
                      "w-full border rounded-xl pl-11 pr-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 transition-all disabled:bg-slate-50 disabled:text-slate-400 bg-white",
                      errors.toDate ? "border-rose-300 focus:ring-rose-500 bg-rose-50/30" : "border-slate-300 focus:ring-blue-500"
                    )}
                  />
                </div>
                {errors.toDate && <p className="text-[10px] font-bold text-rose-600 uppercase tracking-tight">{errors.toDate.message as string}</p>}
              </div>
            </div>

            {durationDays !== null && (
              <div className="flex items-center gap-2 px-4 py-3 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-700 animate-in fade-in slide-in-from-top-1">
                <CheckCircle className="w-4 h-4" />
                <span className="text-[11px] font-black uppercase tracking-widest">
                  Total Duration: {durationDays} {durationDays === 1 ? 'Day' : 'Days'}
                </span>
              </div>
            )}
          </div>

          <div className="space-y-1">
            <div className="flex justify-between items-center mb-1">
              <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                Detailed Reason
              </label>
              <span className={clsx(
                "text-[10px] font-black uppercase tracking-widest",
                reasonValue.length > 30 ? "text-rose-600" : "text-slate-400"
              )}>
                {reasonValue.length} / 30
              </span>
            </div>
            <div className="relative group">
              <FileText className="absolute left-4 top-4 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
              <textarea
                {...register('reason', {
                  required: 'Please provide a reason',
                  minLength: { value: 6, message: 'Reason must be at least 6 characters' },
                  maxLength: { value: 30, message: 'Reason must not exceed 30 characters' },
                })}
                rows={4}
                className={clsx(
                  "w-full border rounded-xl pl-11 pr-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 transition-all resize-none bg-white",
                  errors.reason ? "border-rose-300 focus:ring-rose-500 bg-rose-50/30" : "border-slate-300 focus:ring-blue-500"
                )}
                placeholder="Briefly explain your leave request..."
              />
            </div>
            {errors.reason && <p className="text-[10px] font-bold text-rose-600 uppercase tracking-tight">{errors.reason.message as string}</p>}
          </div>

          <div className="flex items-start gap-3 p-4 bg-slate-50 border border-slate-100 rounded-xl">
            <Info className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
            <p className="text-xs text-slate-500 leading-relaxed font-medium">
              Your request will be reviewed by department administration before being forwarded to Workforce Control (HR).
            </p>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-6 py-2.5 text-xs font-bold uppercase tracking-widest text-slate-600 hover:bg-slate-100 rounded-xl transition-all active:scale-95"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 text-xs font-bold uppercase tracking-widest text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow-lg shadow-slate-900/10 transition-all active:scale-95 disabled:opacity-50 disabled:scale-100"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Request'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
