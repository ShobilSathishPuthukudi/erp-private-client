import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { DataTable } from '@/components/shared/DataTable';
import { Modal } from '@/components/shared/Modal';
import type { ColumnDef } from '@tanstack/react-table';
import { Eye } from 'lucide-react';
import toast from 'react-hot-toast';

interface AuditLogEntry {
  id: number;
  entity: string;
  action: string;
  userId: string;
  before: any;
  after: any;
  module: string;
  timestamp: string;
  user?: {
    name: string;
    email: string;
    role: string;
  };
}

export default function AuditLogs() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null);

  const fetchLogs = async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/audit');
      setLogs(res.data);
    } catch (error: any) {
      if (error.response?.status !== 404) {
        toast.error('Failed to fetch audit logs');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const columns: ColumnDef<AuditLogEntry>[] = [
    {
      accessorKey: 'timestamp',
      header: 'Timestamp',
      cell: ({ row }) => new Date(row.original.timestamp).toLocaleString()
    },
    {
      id: 'actor',
      header: 'Actor',
      cell: ({ row }) => {
        const u = row.original.user;
        if (!u) return <span className="text-slate-500 text-xs">System / Unknown</span>;
        return (
          <div>
            <p className="font-medium text-slate-900">{u.name}</p>
            <p className="text-xs text-slate-500">{u.email} ({u.role})</p>
          </div>
        );
      }
    },
    { accessorKey: 'module', header: 'Module', cell: ({ row }) => <span className="uppercase text-xs font-bold text-slate-500">{row.original.module}</span> },
    { accessorKey: 'entity', header: 'Entity' },
    { 
      accessorKey: 'action', 
      header: 'Action',
      cell: ({ row }) => {
        const action = row.original.action.toUpperCase();
        let color = 'bg-slate-100 text-slate-700';
        if (action === 'CREATE') color = 'bg-green-100 text-green-700';
        if (action === 'UPDATE') color = 'bg-blue-100 text-blue-700';
        if (action === 'DELETE') color = 'bg-red-100 text-red-700';
        return <span className={`px-2 py-1 text-[10px] rounded-full font-bold ${color}`}>{action}</span>;
      }
    },
    {
      id: 'details',
      header: 'Details',
      cell: ({ row }) => (
        <button 
          onClick={() => setSelectedLog(row.original)}
          className="p-1.5 hover:bg-slate-100 rounded-md text-slate-600 transition-colors flex items-center space-x-1 border border-slate-200"
        >
          <Eye className="w-4 h-4" />
          <span className="text-xs font-medium">View JSON</span>
        </button>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">System Audit Logs</h1>
          <p className="text-slate-500">Immutable record of system-wide entity modifications mapped sequentially</p>
        </div>
      </div>

      <DataTable 
        columns={columns} 
        data={logs} 
        isLoading={isLoading} 
        searchKey="entity" 
        searchPlaceholder="Search entities..." 
        exportFileName="IITS_System_Audit_Log"
        emptyMessage="No audit logs recorded yet."
        emptyDescription="System activities will appear here once users begin interacting with the platform."
      />

      <Modal
        isOpen={!!selectedLog}
        onClose={() => setSelectedLog(null)}
        title="Audit Log Details"
        maxWidth="4xl"
      >
        {selectedLog && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4 bg-white p-4 rounded-lg border border-slate-200">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase">Actor Info</p>
                <p className="text-sm font-medium">{selectedLog.user?.name || selectedLog.userId}</p>
                <p className="text-xs text-slate-500">{selectedLog.user?.email || 'System Operation'}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase">Modification</p>
                <p className="text-sm font-bold text-blue-600 uppercase">{selectedLog.action} <span className="text-slate-900">{selectedLog.entity}</span></p>
                <p className="text-xs text-slate-500">{new Date(selectedLog.timestamp).toUTCString()}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-semibold text-slate-700 mb-2">Before Changes</p>
                <pre className="bg-slate-900 text-slate-300 p-4 rounded-lg text-xs overflow-x-auto max-h-96">
                  {JSON.stringify(selectedLog.before, null, 2) || 'null'}
                </pre>
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-700 mb-2">After Changes</p>
                <pre className="bg-slate-900 text-green-400 p-4 rounded-lg text-xs overflow-x-auto max-h-96 border border-slate-800 shadow-inner">
                  {JSON.stringify(selectedLog.after, null, 2) || 'null'}
                </pre>
              </div>
            </div>
            
            <div className="flex justify-end pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setSelectedLog(null)}
                  className="px-6 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 font-medium"
                >
                  Close Viewer
                </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
