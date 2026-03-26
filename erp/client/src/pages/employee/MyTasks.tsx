import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { DataTable } from '@/components/shared/DataTable';
import type { ColumnDef } from '@tanstack/react-table';
import toast from 'react-hot-toast';

interface Task {
  id: number;
  title: string;
  deadline: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'in_progress' | 'completed' | 'overdue';
  createdAt: string;
}

export default function MyTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchTasks = async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/portals/employee/tasks');
      setTasks(res.data);
    } catch (error) {
      toast.error('Failed to fetch your assigned tasks');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const handleStatusChange = async (id: number, newStatus: string) => {
    try {
      await api.put(`/portals/employee/tasks/${id}/status`, { status: newStatus });
      toast.success('Task status updated successfully');
      fetchTasks();
    } catch (error) {
      toast.error('Failed to update task status');
    }
  };

  const columns: ColumnDef<Task>[] = [
    { 
      accessorKey: 'title', 
      header: 'Task Title',
      cell: ({ row }) => <span className="font-semibold text-slate-900">{row.original.title}</span>
    },
    { 
      accessorKey: 'deadline', 
      header: 'Deadline',
      cell: ({ row }) => new Date(row.original.deadline).toLocaleDateString()
    },
    { 
      accessorKey: 'priority', 
      header: 'Priority',
      cell: ({ row }) => {
        const p = row.original.priority;
        let color = 'bg-slate-100 text-slate-700';
        if (p === 'low') color = 'bg-blue-50 text-blue-700';
        if (p === 'medium') color = 'bg-yellow-50 text-yellow-700';
        if (p === 'high') color = 'bg-orange-100 text-orange-700';
        if (p === 'urgent') color = 'bg-red-100 text-red-700 font-bold';
        return <span className={`px-2 py-1 text-[10px] rounded-sm uppercase ${color}`}>{p}</span>;
      }
    },
    {
      id: 'status_update',
      header: 'My Progress',
      cell: ({ row }) => {
        const currentStatus = row.original.status;
        return (
          <select 
            value={currentStatus}
            onChange={(e) => handleStatusChange(row.original.id, e.target.value)}
            className={`px-2 py-1 text-xs rounded-full font-medium border-none focus:ring-2 focus:ring-blue-500 cursor-pointer ${
              currentStatus === 'completed' ? 'bg-green-100 text-green-700' :
              currentStatus === 'in_progress' ? 'bg-blue-100 text-blue-700' :
              currentStatus === 'overdue' ? 'bg-red-100 text-red-700 font-bold' :
              'bg-slate-100 text-slate-700'
            }`}
          >
            <option value="pending">PENDING</option>
            <option value="in_progress">IN PROGRESS</option>
            <option value="completed">COMPLETED</option>
            {currentStatus === 'overdue' && <option value="overdue">OVERDUE</option>}
          </select>
        );
      }
    }
  ];

  return (
    <div className="space-y-6 flex flex-col h-[calc(100vh-8rem)]">
      <div className="flex justify-between items-center shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Assigned Tasks</h1>
          <p className="text-slate-500">Track and update the status of your daily deliverables</p>
        </div>
      </div>

      <div className="flex-1 min-h-0 bg-white shadow-sm border border-slate-200 rounded-lg flex flex-col">
        <DataTable 
          columns={columns} 
          data={tasks} 
          isLoading={isLoading} 
          searchKey="title" 
          searchPlaceholder="Search your tasks..." 
        />
      </div>
    </div>
  );
}
