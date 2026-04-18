import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { DataTable } from '@/components/shared/DataTable';
import type { ColumnDef } from '@tanstack/react-table';
import toast from 'react-hot-toast';
import { toSentenceCase } from '@/lib/utils';
import { Users } from 'lucide-react';

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
    { accessorKey: 'uid', header: 'Emp id' },
    { 
      accessorKey: 'name', 
      header: 'Staff name',
      cell: ({ row }) => <span className="font-semibold text-slate-800">{row.original.name}</span>
    },
    { accessorKey: 'email', header: 'Email address' },
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
            {toSentenceCase(status)}
          </span>
        );
      }
    },
    {
      id: 'joined',
      header: 'Joined date',
      cell: ({ row }) => new Date(row.original.createdAt).toLocaleDateString()
    }
  ];

  return (
    <div className="p-2 lg:p-6 space-y-4 max-w-[1600px] mx-auto min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white px-6 py-5 rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50 gap-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center text-white shadow-lg shadow-slate-900/20 shrink-0">
             <Users className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight leading-tight mb-0.5">Department team roster</h1>
            <p className="text-slate-500 font-medium text-sm">View all personnel assigned to your department</p>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-[500px] bg-white shadow-xl shadow-slate-200/50 border border-slate-200 rounded-3xl flex flex-col overflow-hidden">
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
