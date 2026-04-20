import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { DataTable } from '@/components/shared/DataTable';
import { Modal } from '@/components/shared/Modal';
import type { ColumnDef } from '@tanstack/react-table';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import CEOPanelCreate from './CEOPanelCreate';

interface CEOPanelData {
  id: string;
  name: string;
  visibilityScope: string[];
  status: string;
  ceoUser: {
    name: string;
    email: string;
  };
  devCredential?: string;
}

export default function CEOPanels() {
  const [ceos, setCeos] = useState<CEOPanelData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPanel, setEditingPanel] = useState<CEOPanelData | null>(null);

  const fetchCEOs = async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/org-admin/ceo-panels');
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
    setEditingPanel(null);
    setIsModalOpen(true);
  };

  const openEditModal = (panel: CEOPanelData) => {
    setEditingPanel(panel);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Terminate this executive instance partition? This action cannot be undone.')) return;
    try {
      await api.delete(`/org-admin/ceo-panels/${id}`);
      toast.success('Executive Instance Terminated');
      fetchCEOs();
    } catch (error) {
      toast.error('Failed to terminate instance');
    }
  };

  const columns: ColumnDef<CEOPanelData>[] = [
    { 
      accessorKey: 'name', 
      header: 'Panel Identity',
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-bold text-slate-900">{row.original.name}</span>
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{row.original.ceoUser?.name}</span>
        </div>
      )
    },
    { 
      accessorKey: 'ceoUser.email', 
      header: 'Credential Entry',
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-medium text-slate-600">{row.original.ceoUser?.email}</span>
          <span className="text-[10px] text-blue-500 font-black uppercase tracking-widest mt-0.5">Key: {row.original.devCredential || 'Not Set'}</span>
        </div>
      )
    },
    {
      accessorKey: 'visibilityScope',
      header: 'Initial Visibility Scope',
      cell: ({ row }) => {
        const scopes = row.original.visibilityScope || [];
        if (scopes.length === 0) return <span className="text-[10px] font-bold text-slate-400 ">No Restriction Scope</span>;
        return (
          <div className="flex flex-wrap gap-1">
            {scopes.map(scope => (
              <span key={scope} className="px-2 py-0.5 bg-blue-50 text-blue-600 text-[9px] font-black uppercase tracking-wider rounded-md border border-blue-100">
                {scope}
              </span>
            ))}
          </div>
        );
      }
    },
    { 
      accessorKey: 'status', 
      header: 'Operational Status',
      cell: ({ row }) => {
        const status = row.original.status?.toLowerCase();
        return (
          <span className={`px-3 py-1 text-[10px] rounded-full font-black uppercase tracking-widest border ${
            status === 'active' 
              ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
              : 'bg-slate-50 text-slate-500 border-slate-200'
          }`}>
            {status}
          </span>
        );
      }
    },
    {
      id: 'actions',
      header: 'Infrastructure Actions',
      cell: ({ row }) => {
        const panel = row.original;
        return (
          <div className="flex items-center space-x-2">
            <button onClick={() => openEditModal(panel)} className="p-2 hover:bg-slate-100 rounded-xl text-slate-600 transition-colors border border-transparent hover:border-slate-200">
              <Edit2 className="w-4 h-4" />
            </button>
            <button onClick={() => handleDelete(panel.id)} className="p-2 hover:bg-red-50 rounded-xl text-red-600 transition-colors border border-transparent hover:border-red-100">
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
          <h1 className="text-2xl font-bold text-slate-900">CEO panels</h1>
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
        searchPlaceholder="Identify executive instances..." 
        emptyMessage="No CEO panels provisioned yet."
        emptyDescription="Initialize executive partitions to grant filtered institutional oversight."
      />

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingPanel ? "Reconfigure Executive Instance" : "Provision New Identity"}
        maxWidth="4xl"
        hideHeader={true}
      >
        <CEOPanelCreate 
          onClose={() => setIsModalOpen(false)}
          onSuccess={() => fetchCEOs()}
          initialData={editingPanel}
        />
      </Modal>
    </div>
  );
}
