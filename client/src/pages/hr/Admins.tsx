import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { DataTable } from '@/components/shared/DataTable';
import type { ColumnDef } from '@tanstack/react-table';
import { ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { PageHeader } from '@/components/shared/PageHeader';
import { toSentenceCase } from '@/lib/utils';

interface Administrator {
  uid: string;
  name: string;
  email: string;
  status: 'active' | 'inactive' | 'suspended';
  deptId: number | null;
  department?: { id: number, name: string };
  role?: string;
  createdAt: string;
}

export default function Admins() {
  const [admins, setAdmins] = useState<Administrator[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchInitialData = async () => {
    try {
      setIsLoading(true);
      const empRes = await api.get('/hr/employees');
      
      // Strict filter for administrators only, excluding abstract ceos
      const adminStaff = empRes.data.filter((e: any) => {
        const r = e.role?.toLowerCase() || '';
        return r.includes('admin') && !['ceo'].includes(r);
      });
      
      setAdmins(adminStaff);
    } catch (error) {
      toast.error('Failed to fetch administrators');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  const columns: ColumnDef<Administrator>[] = [
    { accessorKey: 'name', header: 'Full name' },
    { accessorKey: 'email', header: 'Email address' },
    { 
      id: 'department',
      header: 'Assigned Division',
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-semibold text-slate-700">{row.original.department?.name || 'System / Universal'}</span>
        </div>
      )
    },
    {
      accessorKey: 'role',
      header: 'Control Authority',
      cell: ({ row }) => (
        <span className="text-[10px] font-black text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-100">
          {toSentenceCase(row.original.role || 'Administrator')}
        </span>
      )
    },
    { 
      accessorKey: 'status', 
      header: 'System Status',
      cell: ({ row }) => {
        const status = row.original.status;
        let color = 'bg-slate-100 text-slate-700';
        if (status === 'active') color = 'bg-emerald-100 text-emerald-700';
        if (status === 'suspended') color = 'bg-red-100 text-red-700';
        return (
          <span className={`px-2 py-1 text-xs rounded-full font-medium ${color}`}>
            {toSentenceCase(status)}
          </span>
        );
      }
    }
  ];

  return (
    <div className="space-y-6 flex flex-col h-[calc(100vh-8rem)]">
      <PageHeader 
        title="Administrators List"
        description="Read-only view of structural system administrators and department heads."
        icon={ShieldCheck}
      />

      <div className="flex-1 min-h-0 bg-white shadow-sm border border-slate-200 rounded-lg flex flex-col">
        <DataTable 
          columns={columns} 
          data={admins} 
          isLoading={isLoading} 
          searchKey="name" 
          searchPlaceholder="Search administrators by name..." 
          exportFileName="IITS_Administrators_Registry"
        />
      </div>
    </div>
  );
}
