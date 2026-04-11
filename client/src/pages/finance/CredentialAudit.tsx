import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { DataTable } from '@/components/shared/DataTable';
import type { ColumnDef } from '@tanstack/react-table';
import { ShieldAlert, Terminal, User, Clock, FileSearch } from 'lucide-react';
import toast from 'react-hot-toast';

interface CredentialAudit {
  id: number;
  center: { name: string, shortName: string };
  requester: { name: string, role: string };
  remarks: string;
  status: string;
  updatedAt: string;
  approvedBy: string;
}

export default function CredentialAudit() {
  const [data, setData] = useState<CredentialAudit[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAudit = async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/finance/credentials/audit');
      setData(res.data);
    } catch (error) {
      toast.error('Failed to synchronize security telemetry');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAudit();
  }, []);

  const columns: ColumnDef<CredentialAudit>[] = [
    { 
        accessorKey: 'center.name', 
        header: 'Target Institutional Node', 
        cell: ({ row }) => <span className="font-black text-slate-900 uppercase tracking-tighter">{row.original.center?.name}</span> 
    },
    { 
        accessorKey: 'requester.name', 
        header: 'Access Pathway', 
        cell: ({ row }) => (
            <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                    <User className="w-4 h-4" />
                </div>
                <div className="flex flex-col">
                    <p className="font-bold text-slate-900">{row.original.requester?.name}</p>
                    <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">{row.original.requester?.role}</p>
                </div>
            </div>
        ) 
    },
    { 
        accessorKey: 'remarks', 
        header: 'Forensic Justification', 
        cell: ({ row }) => <p className="text-xs text-slate-500 font-medium max-w-sm italic">"{row.original.remarks}"</p> 
    },
    { 
        accessorKey: 'status', 
        header: 'Protocol Outcome',
        cell: ({ row }) => (
            <span className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest border ${
                row.original.status === 'approved' 
                ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                : 'bg-rose-50 text-rose-700 border-rose-100'
            }`}>
                {row.original.status}
            </span>
        )
    },
    { 
        accessorKey: 'updatedAt', 
        header: 'Timestamp', 
        cell: ({ row }) => (
            <div className="flex flex-col">
                <span className="text-[10px] font-bold text-slate-900 uppercase">{new Date(row.original.updatedAt).toLocaleDateString()}</span>
                <span className="text-[9px] font-medium text-slate-400">{new Date(row.original.updatedAt).toLocaleTimeString()}</span>
            </div>
        ) 
    },
    {
      accessorKey: 'approvedBy',
      header: 'Authority',
      cell: ({ row }) => <span className="text-[10px] font-black text-slate-600 bg-slate-100 px-3 py-1 rounded-lg uppercase tracking-widest">{row.original.approvedBy || 'SYSTEM'}</span>
    }
  ];

  return (
    <div className="space-y-8 p-10 min-h-screen">
      <div className="bg-white p-10 rounded-[48px] border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-8 relative overflow-hidden group">
         <div className="absolute top-0 right-0 p-10">
            <ShieldAlert className="w-40 h-40 text-slate-50 -rotate-12 group-hover:rotate-0 transition-transform duration-700" />
         </div>
         <div className="relative z-10">
            <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-2xl shadow-slate-900/20">
                    <Terminal className="w-7 h-7" />
                </div>
                <h1 className="text-4xl font-black text-slate-900 tracking-tight uppercase">Security Audit Ledger</h1>
            </div>
            <p className="text-slate-500 font-medium max-w-2xl leading-relaxed">System-wide forensic trail for Partner Center credential reveals. All access decisions are permanently logged and audited by the Finance Department.</p>
         </div>
         <div className="relative z-10 flex gap-4">
            <div className="bg-emerald-50 px-6 py-4 rounded-3xl border border-emerald-100 text-center">
                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Total Audits</p>
                <p className="text-2xl font-black text-emerald-900 tracking-tighter">{data.length}</p>
            </div>
            <button onClick={fetchAudit} className="bg-white hover:bg-slate-50 text-slate-900 border border-slate-200 px-8 py-4 rounded-3xl font-black uppercase text-xs tracking-widest transition-all active:scale-95 flex items-center gap-3">
                <Clock className="w-4 h-4" /> Sync Registry
            </button>
         </div>
      </div>

      <div className="bg-white shadow-xl shadow-slate-200/50 border border-slate-200 rounded-[48px] p-2 overflow-hidden flex flex-col h-[calc(100vh-25rem)]">
        <DataTable columns={columns} data={data} isLoading={isLoading} searchKey="remarks" />
      </div>

      <div className="p-8 bg-slate-900 rounded-[40px] shadow-2xl shadow-slate-900/20 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8">
             <FileSearch className="w-20 h-20 text-white/5" />
          </div>
          <div className="relative z-10 space-y-3">
             <p className="text-xs font-black text-white/40 uppercase tracking-[0.2em]">Forensic Protocol v3.14</p>
             <p className="text-white text-sm font-medium max-w-4xl opacity-80 leading-relaxed">This ledger represents a physically grounded audit history. Academic Operations is strictly prohibited from direct data mutations without Finance ratification. Any unauthorized reveal attempt triggers a high-priority institutional security alert.</p>
          </div>
      </div>
    </div>
  );
}
