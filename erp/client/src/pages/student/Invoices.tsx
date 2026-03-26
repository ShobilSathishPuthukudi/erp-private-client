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
    // In a real scenario, this would trigger a jsPDF blob download or fetch PDF from server
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
        if (s === 'paid') color = 'bg-green-100 text-green-700';
        if (s === 'draft' || s === 'issued') color = 'bg-blue-100 text-blue-700';
        if (s === 'cancelled') color = 'bg-red-100 text-red-700';
        return <span className={`px-2 py-1 text-xs rounded-full font-bold uppercase ${color}`}>{s}</span>;
      }
    },
    {
      id: 'actions',
      header: 'Receipt',
      cell: ({ row }) => (
        <button 
          onClick={() => downloadInvoice(row.original.id)}
          className="flex items-center space-x-1 px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-md transition-colors text-xs font-medium"
        >
          <Download className="w-3 h-3" />
          <span>Download PDF</span>
        </button>
      )
    }
  ];

  return (
    <div className="space-y-6 flex flex-col h-[calc(100vh-8rem)]">
      <div className="flex justify-between items-center shrink-0">
        <div>
           <h1 className="text-2xl font-bold text-slate-900">Financial History</h1>
           <p className="text-slate-500">Track your tuition payments and download official GST fee receipts.</p>
        </div>
      </div>

      <div className="flex-1 min-h-0 bg-white shadow-sm border border-slate-200 rounded-lg flex flex-col">
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
