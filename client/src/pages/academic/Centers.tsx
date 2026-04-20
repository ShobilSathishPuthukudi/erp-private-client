import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { DataTable } from '@/components/shared/DataTable';
import * as XLSX from 'xlsx';
import type { ColumnDef } from '@tanstack/react-table';
import toast from 'react-hot-toast';
import { Users, Share2, Printer, Download } from 'lucide-react';

interface Center {
  id: number;
  name: string;
  status: string;
  email?: string;
  phone?: string;
  address?: string;
}

export default function Centers() {
  const [centers, setCenters] = useState<Center[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/academic/centers');
      setCenters(res.data);
    } catch (error) {
      toast.error('Failed to parse global center registry');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handlePrint = () => {
    window.print();
    toast.success('Preparing center registry for print');
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success('Registry link copied to clipboard');
  };


  const handleExport = () => {
    if (!centers.length) return;
    const exportData = centers.map((row: any) => {
      const entry: any = {};
      columns.forEach((col: any) => {
        if (col.header && typeof col.header === 'string') {
          let value = '';
          if (col.accessorKey) {
            value = row[col.accessorKey];
          } else if (col.accessorFn) {
            value = col.accessorFn(row);
          } else if (col.id) {
             // Handle nested or specialized IDs if needed
             if (col.id === 'subDepartment') value = row.subDepartment?.name || 'GEN-ADMIN';
             else if (col.id === 'program') value = row.program?.name || 'Unassigned Core';
             else value = row[col.id];
          }
          entry[col.header] = value;
        }
      });
      return entry;
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Center_Registry");
    XLSX.writeFile(workbook, "Institutional_Center_Registry.xlsx");
    toast.success('Institutional layout generated');
  };

  const columns: ColumnDef<Center>[] = [
    { accessorKey: 'id', header: 'CID', cell: ({ row }) => <span className="font-mono text-slate-500">C-{row.original.id}</span> },
    { accessorKey: 'name', header: 'Center', cell: ({ row }) => <span className="font-semibold text-slate-900">{row.original.name}</span> },
    { accessorKey: 'email', header: 'Primary Contact', cell: ({ row }) => <span className="text-slate-600 font-medium text-[11px]">{row.original.email || 'N/A'}</span> },
    { accessorKey: 'phone', header: 'Comm line', cell: ({ row }) => <span className="text-slate-600 font-mono text-[10px]">{row.original.phone || 'N/A'}</span> },
    { 
      accessorKey: 'status', 
      header: 'Status', 
      cell: ({ row }) => {
        const s = row.original.status?.toUpperCase() || 'UNKNOWN';
        return (
          <span className={`uppercase font-black text-[9px] tracking-widest px-3 py-1.5 rounded-full border ${
            s === 'ACTIVE' || s === 'APPROVED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 
            s === 'STAGED' || s === 'PENDING' ? 'bg-amber-50 text-amber-700 border-amber-200' :
            s === 'REJECTED' || s === 'SUSPENDED' ? 'bg-red-50 text-red-700 border-red-200' :
            'bg-slate-50 text-slate-700 border-slate-200'
          }`}>
            {s}
          </span>
        );
      }
    }
  ];
  return (
    <div className="p-2 space-y-6 flex flex-col h-[calc(100vh-8rem)]">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white px-6 py-5 rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50 gap-6 shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center text-white shadow-lg shadow-slate-900/20 shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight leading-tight mb-0.5">Center status</h1>
            <p className="text-slate-500 font-medium text-sm">Read-only global registry. Modifications disabled for organizational visibility.</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={handleShare}
            className="p-2.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all active:scale-95 group cursor-pointer"
            title="Share Registry Link"
          >
            <Share2 className="w-5 h-5 group-hover:scale-110 transition-transform" />
          </button>
          <button 
            onClick={handlePrint}
            className="p-2.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all active:scale-95 group cursor-pointer"
            title="Print Registry"
          >
            <Printer className="w-5 h-5 group-hover:scale-110 transition-transform" />
          </button>
          <button 
            onClick={handleExport}
            className="p-2.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all active:scale-95 group cursor-pointer"
            title="Export to Excel"
          >
            <Download className="w-5 h-5 group-hover:scale-110 transition-transform" />
          </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
        <DataTable 
          columns={columns} 
          data={centers} 
          isLoading={isLoading} 
          searchKey="name" 
          searchPlaceholder="Locate by center legal string..." 
        />
      </div>
    </div>
  );
}
