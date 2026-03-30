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
  reason?: string;
  createdAt: string;
}

export default function Leaves() {
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchLeaves = async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/dept-admin/leaves');
      setLeaves(res.data);
    } catch (error) {
      toast.error('Failed to fetch team leave requests');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaves();
  }, []);

  const handleAction = async (id: number, action: 'approve' | 'reject') => {
    if (!window.confirm(`Are you sure you want to ${action} this leave request at Step-1?`)) return;
    try {
      await api.put(`/dept-admin/leaves/${id}/${action}`);
      toast.success(`Leave request ${action}d successfully and escalated if needed.`);
      fetchLeaves();
    } catch (error: any) {
      toast.error(error.response?.data?.error || `Failed to ${action} leave`);
    }
  };

  const generateTestLeave = async () => {
    try {
      const teamRes = await api.get('/dept-admin/team');
      if (teamRes.data.length === 0) {
        return toast.error('Create at least one employee in your department first to simulate a test leave.');
      }
      
      const payload = {
        employeeId: teamRes.data[0].uid,
        type: 'Annual Leave',
        fromDate: new Date(Date.now() + 86400000 * 5).toISOString().split('T')[0],
        toDate: new Date(Date.now() + 86400000 * 10).toISOString().split('T')[0],
      };

      await api.post('/dept-admin/leaves/test-create', payload);
      toast.success('Test leave created in pending_step1 status');
      fetchLeaves();
    } catch (error: any) {
      toast.error('Failed to simulate test leave');
    }
  };

  const columns: ColumnDef<Leave>[] = [
    { 
      id: 'employee',
      header: 'Team Member',
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
      accessorKey: 'reason', 
      header: 'Reason / Details',
      cell: ({ row }) => <span className="text-xs text-slate-600 italic line-clamp-1" title={row.original.reason}>{row.original.reason || 'No details provided'}</span>
    },
    { 
      id: 'dates', 
      header: 'Given Duration',
      cell: ({ row }) => (
        <span className="text-sm">
          {row.original.fromDate} to {row.original.toDate}
        </span>
      )
    },
    { 
      accessorKey: 'status', 
      header: 'Current Status',
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
      header: 'Dept Action (Step 1)',
      cell: ({ row }) => {
        const leave = row.original;
        if (leave.status !== 'pending_step1') {
          return <span className="text-xs text-slate-400 italic">No action required</span>;
        }

        return (
          <div className="flex items-center space-x-2">
            <button 
              onClick={() => handleAction(leave.id, 'approve')} 
              className="flex items-center space-x-1 px-2 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded text-xs font-medium transition-colors"
              title="Approve Leave (Escalate to HR)"
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
          <h1 className="text-2xl font-bold text-slate-900">Team Leave Requests</h1>
          <p className="text-slate-500">Provide Step-1 structural approval for your team members' absence requests</p>
        </div>
        
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
          searchPlaceholder="Search by team member name..." 
        />
      </div>
    </div>
  );
}
