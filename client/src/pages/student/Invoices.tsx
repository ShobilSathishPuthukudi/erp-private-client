import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { DataTable } from '@/components/shared/DataTable';
import type { ColumnDef } from '@tanstack/react-table';
import { Download } from 'lucide-react';
import toast from 'react-hot-toast';

interface Invoice {
  id: number;
  invoiceNo: string;
  amount: string;
  gst: string;
  total: string;
  status: string;
  createdAt: string;
}

export default function Invoices() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchInvoices = async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/portals/student/invoices');
      setInvoices(res.data);
    } catch (error) {
      toast.error('Failed to fetch your invoices');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  const downloadInvoice = async (invoiceId: number) => {
    toast.success(`Initializing download for Invoice #${invoiceId}...`);
  };

  const columns: ColumnDef<Invoice>[] = [
    { 
      accessorKey: 'invoiceNo', 
      header: 'Invoice Reference',
      cell: ({ row }) => <span className="font-semibold text-slate-800">{row.original.invoiceNo}</span>
    },
    { 
      id: 'date', 
      header: 'Generated On',
      cell: ({ row }) => new Date(row.original.createdAt).toLocaleDateString()
    },
    { 
      accessorKey: 'total', 
      header: 'Total Amount',
      cell: ({ row }) => <span className="font-bold text-slate-900">₹{parseFloat(row.original.total).toLocaleString()}</span>
    },
    { 
      accessorKey: 'status', 
      header: 'Payment Status',
      cell: ({ row }) => {
        const s = row.original.status;
        let color = 'bg-slate-100 text-slate-700';
        if (s === 'paid') color = 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200';
        if (s === 'issued') color = 'bg-blue-100 text-blue-700 ring-1 ring-blue-200';
        if (s === 'cancelled') color = 'bg-red-100 text-red-700';
        return <span className={`px-3 py-1 text-[10px] rounded-full font-black uppercase tracking-widest ${color}`}>{s}</span>;
      }
    },
    {
      id: 'actions',
      header: 'Document',
      cell: ({ row }) => (
        <div className="flex items-center">
          <button 
            onClick={() => downloadInvoice(row.original.id)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-50 text-slate-600 hover:bg-slate-900 hover:text-white rounded-xl transition-all text-[10px] font-black uppercase tracking-widest border border-slate-200 hover:border-slate-900 active:scale-95 group"
            title="Download PDF"
          >
            <Download className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
            <span>Download Invoice</span>
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6 flex flex-col h-[calc(100vh-8rem)] p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center shrink-0">
        <div>
           <h1 className="text-3xl font-black text-slate-900 tracking-tight">Institutional Billing</h1>
           <p className="text-slate-500 text-sm font-medium">Access and download your academic fee invoices issued by the institution.</p>
        </div>
      </div>

      <div className="flex-1 min-h-0 bg-white shadow-xl shadow-slate-100/50 border border-slate-200 rounded-[2rem] flex flex-col overflow-hidden">
        <DataTable 
          columns={columns} 
          data={invoices} 
          isLoading={isLoading} 
          searchKey="invoiceNo" 
          searchPlaceholder="Search by invoice number..." 
        />
      </div>
    </div>
  );
}
