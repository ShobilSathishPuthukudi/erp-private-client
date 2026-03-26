import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { DataTable } from '@/components/shared/DataTable';
import type { ColumnDef } from '@tanstack/react-table';
import toast from 'react-hot-toast';

interface TeamMember {
  uid: string;
  name: string;
  email: string;
  status: string;
  createdAt: string;
}

export default function Team() {
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchTeam = async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/dept-admin/team');
      setTeam(res.data);
    } catch (error) {
      toast.error('Failed to fetch team members');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTeam();
  }, []);

  const columns: ColumnDef<TeamMember>[] = [
    { accessorKey: 'uid', header: 'Emp ID' },
    { 
      accessorKey: 'name', 
      header: 'Staff Name',
      cell: ({ row }) => <span className="font-semibold text-slate-800">{row.original.name}</span>
    },
    { accessorKey: 'email', header: 'Email Address' },
    { 
      accessorKey: 'status', 
      header: 'Status',
      cell: ({ row }) => {
        const status = row.original.status;
        let color = 'bg-slate-100 text-slate-700';
        if (status === 'active') color = 'bg-green-100 text-green-700';
        if (status === 'suspended') color = 'bg-red-100 text-red-700';
        return (
          <span className={`px-2 py-1 text-xs rounded-full font-medium ${color}`}>
            {status.toUpperCase()}
          </span>
        );
      }
    },
    {
      id: 'joined',
      header: 'Joined Date',
      cell: ({ row }) => new Date(row.original.createdAt).toLocaleDateString()
    }
  ];

  return (
    <div className="space-y-6 flex flex-col h-[calc(100vh-8rem)]">
      <div className="flex justify-between items-center shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Team Roster</h1>
          <p className="text-slate-500">View all personnel assigned to your department</p>
        </div>
      </div>

      <div className="flex-1 min-h-0 bg-white shadow-sm border border-slate-200 rounded-lg flex flex-col">
        <DataTable 
          columns={columns} 
          data={team} 
          isLoading={isLoading} 
          searchKey="name" 
          searchPlaceholder="Search personnel by name..." 
        />
      </div>
    </div>
  );
}
