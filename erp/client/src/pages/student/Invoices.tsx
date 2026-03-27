import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { DataTable } from '@/components/shared/DataTable';
import type { ColumnDef } from '@tanstack/react-table';
import { Download, CreditCard, ShieldCheck } from 'lucide-react';
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

  const handlePay = async (invoiceId: number) => {
    try {
      const res = await api.post(`/finance/student/pay-invoice/${invoiceId}`);
      toast.success(res.data.message);
      fetchInvoices(); // Refresh list
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Payment transaction failed');
    }
  };

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
      header: 'Interaction',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          {row.original.status === 'issued' && (
            <button 
              onClick={() => handlePay(row.original.id)}
              className="flex items-center space-x-2 px-4 py-2 bg-slate-900 text-white hover:bg-slate-800 rounded-xl transition-all text-xs font-black uppercase tracking-widest shadow-lg shadow-slate-200 active:scale-95"
            >
              <CreditCard className="w-3.5 h-3.5 text-blue-400" />
              <span>Pay Now</span>
            </button>
          )}
          {row.original.status === 'paid' && (
            <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-xl text-[10px] font-black uppercase tracking-widest">
               <ShieldCheck className="w-3.5 h-3.5" />
               <span>Verified</span>
            </div>
          )}
          <button 
            onClick={() => downloadInvoice(row.original.id)}
            className="p-2.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
            title="Download PDF"
          >
            <Download className="w-4 h-4" />
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
           <p className="text-slate-500 text-sm font-medium">Settle your tuition fees securely via the integrated institutional gateway.</p>
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
