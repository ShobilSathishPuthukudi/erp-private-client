import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { DataTable } from '@/components/shared/DataTable';
import type { ColumnDef } from '@tanstack/react-table';
import { CheckCircle, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';

interface UserInfo {
  uid: string;
  name: string;
  email?: string;
}

interface Leave {
  id: number;
  employeeId: string;
  employee: UserInfo;
  type: string;
  fromDate: string;
  toDate: string;
  status: string;
  step1Approver?: UserInfo;
  step2Approver?: UserInfo;
  createdAt: string;
}

export default function Leaves() {
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchLeaves = async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/hr/leaves');
      setLeaves(res.data);
    } catch (error) {
      toast.error('Failed to fetch leave requests');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaves();
  }, []);

  const handleAction = async (id: number, action: 'approve' | 'reject') => {
    if (!window.confirm(`Are you sure you want to ${action} this leave request?`)) return;
    try {
      await api.put(`/hr/leaves/${id}/${action}`);
      toast.success(`Leave request ${action}d successfully`);
      fetchLeaves();
    } catch (error: any) {
      toast.error(error.response?.data?.error || `Failed to ${action} leave`);
    }
  };

  const generateTestLeave = async () => {
    try {
      // Find an employee to use
      const empRes = await api.get('/hr/employees');
      if (empRes.data.length === 0) {
        return toast.error('Create at least one employee first to generate a test leave.');
      }
      
      const payload = {
        employeeId: empRes.data[0].uid,
        type: 'Sick Leave',
        fromDate: new Date().toISOString().split('T')[0],
        toDate: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
      };

      await api.post('/hr/leaves/test-create', payload);
      toast.success('Test leave created in pending_step2 status');
      fetchLeaves();
    } catch (error: any) {
      toast.error('Failed to generate test leave');
    }
  };

  const columns: ColumnDef<Leave>[] = [
    { 
      id: 'employee',
      header: 'Employee',
      cell: ({ row }) => {
        const emp = row.original.employee;
        return (
          <div>
            <p className="font-medium text-slate-900">{emp?.name || row.original.employeeId}</p>
            {emp?.email && <p className="text-xs text-slate-500">{emp.email}</p>}
          </div>
        );
      }
    },
    { accessorKey: 'type', header: 'Leave Type' },
    { 
      id: 'dates', 
      header: 'Duration',
      cell: ({ row }) => (
        <span className="text-sm">
          {row.original.fromDate} to {row.original.toDate}
        </span>
      )
    },
    { 
      accessorKey: 'status', 
      header: 'Status',
      cell: ({ row }) => {
        const s = row.original.status;
        let color = 'bg-slate-100 text-slate-700';
        if (s === 'approved') color = 'bg-green-100 text-green-700';
        if (s.includes('rejected')) color = 'bg-red-100 text-red-700';
        if (s.includes('pending')) color = 'bg-orange-100 text-orange-700';
        
        return (
          <span className={`px-2 py-1 text-[10px] rounded-full font-bold uppercase ${color}`}>
            {s.replace('_', ' ')}
          </span>
        );
      }
    },
    {
      id: 'actions',
      header: 'HR Actions (Step 2)',
      cell: ({ row }) => {
        const leave = row.original;
        if (leave.status !== 'pending_step2') {
          return <span className="text-xs text-slate-400 italic">No action required</span>;
        }

        return (
          <div className="flex items-center space-x-2">
            <button 
              onClick={() => handleAction(leave.id, 'approve')} 
              className="flex items-center space-x-1 px-2 py-1 bg-green-50 text-green-700 hover:bg-green-100 rounded text-xs font-medium transition-colors"
              title="Approve Leave"
            >
              <CheckCircle className="w-4 h-4" />
              <span>Approve</span>
            </button>
            <button 
              onClick={() => handleAction(leave.id, 'reject')} 
              className="flex items-center space-x-1 px-2 py-1 bg-red-50 text-red-700 hover:bg-red-100 rounded text-xs font-medium transition-colors"
              title="Reject Leave"
            >
              <XCircle className="w-4 h-4" />
              <span>Reject</span>
            </button>
          </div>
        );
      }
    }
  ];

  return (
    <div className="space-y-6 flex flex-col h-[calc(100vh-8rem)]">
      <div className="flex justify-between items-center shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Leave Approvals</h1>
          <p className="text-slate-500">Review and authorize advanced (Step-2) employee leave requests</p>
        </div>
        
        {/* Helper button to seed a test leave request for verification */}
        <button 
          onClick={generateTestLeave}
          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-md text-sm font-medium transition-colors border border-slate-200"
        >
          Inject Test Leave
        </button>
      </div>

      <div className="flex-1 min-h-0 bg-white shadow-sm border border-slate-200 rounded-lg flex flex-col">
        <DataTable 
          columns={columns} 
          data={leaves} 
          isLoading={isLoading} 
          searchKey="employee.name" 
          searchPlaceholder="Search by employee name..." 
        />
      </div>
    </div>
  );
}
