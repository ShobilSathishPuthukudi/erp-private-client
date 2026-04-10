import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { DataTable } from '@/components/shared/DataTable';
import type { ColumnDef } from '@tanstack/react-table';
import toast from 'react-hot-toast';
import { Download } from 'lucide-react';
import jsPDF from 'jspdf';

interface Invoice {
  id: number;
  paymentId: number;
  studentId: number;
  invoiceNo: string;
  amount: string;
  gst: string;
  total: string;
  status: string;
  createdAt: string;
  student?: {
    name: string;
  };
}

export default function Invoices() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchInvoices = async () => {
      try {
        const res = await api.get('/finance/invoices');
        setInvoices(res.data || []);
      } catch (error) {
        console.error("INVOICE_FETCH_ERROR:", error);
        setInvoices([]);
        toast.error('Failed to fetch historical invoices');
      } finally {
        setIsLoading(false);
      }
    };
    fetchInvoices();
  }, []);

  const downloadPDF = (invoice: Invoice) => {
    const doc = new jsPDF();
    
    // Duplicate Document Identifier logic mirroring the core generator to reprint old tickets locally
    doc.setFontSize(22);
    doc.setTextColor(15, 23, 42); 
    doc.text('RPS Educational Institution', 20, 20);
    
    doc.setFontSize(14);
    doc.setTextColor(71, 85, 105); 
    doc.text('OFFICIAL TAX INVOICE (DUPLICATE COPY)', 20, 30);
    
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text(`Invoice No: ${invoice.invoiceNo}`, 20, 50);
    doc.text(`Date Issued: ${new Date(invoice.createdAt).toLocaleDateString()}`, 20, 60);
    doc.text(`Payment Linked ID: PMT-${invoice.paymentId}`, 20, 70);
    
    doc.setDrawColor(203, 213, 225); 
    doc.line(20, 80, 190, 80);
    
    doc.setFontSize(11);
    doc.text('Financial Segment', 20, 95);
    doc.text('Reconciled Input', 140, 95);
    
    doc.setFontSize(12);
    doc.text('Academic Tuition Fee Installment', 20, 105);
    doc.text(`Rs. ${parseFloat(invoice.amount).toFixed(2)}`, 140, 105);
    
    doc.text('Government GST Application (18%)', 20, 115);
    doc.text(`Rs. ${parseFloat(invoice.gst).toFixed(2)}`, 140, 115);
    
    doc.line(20, 125, 190, 125);
    
    doc.setFontSize(14);
    doc.setTextColor(37, 99, 235); 
    doc.text('Grand Total:', 100, 140);
    doc.text(`Rs. ${parseFloat(invoice.total).toFixed(2)}`, 140, 140);
    
    doc.setFontSize(10);
    doc.setTextColor(148, 163, 184); 
    doc.text('Notice: This is a computer-generated duplicate document extracted from historical ledgers.', 20, 270);
    
    doc.save(`COPY_${invoice.invoiceNo}.pdf`);
  };

  const columns: ColumnDef<Invoice>[] = [
    { accessorKey: 'invoiceNo', header: 'Issued Invoice No.', cell: ({ row }) => <span className="font-bold tracking-tight text-slate-800">{row.original.invoiceNo}</span> },
    { accessorKey: 'createdAt', header: 'Issue Timestamp', cell: ({ row }) => new Date(row.original.createdAt).toLocaleDateString() },
    { 
      id: 'student', 
      header: 'Billed Entity',
      cell: ({ row }) => <span className="font-medium text-slate-600">{row.original.student?.name || `Database ID: ${row.original.studentId}`}</span>
    },
    { accessorKey: 'amount', header: 'Base Calculation', cell: ({ row }) => `Rs. ${parseFloat(row.original.amount).toLocaleString('en-IN')}` },
    { accessorKey: 'gst', header: 'Tax Load (18%)', cell: ({ row }) => <span className="text-slate-500 font-mono">Rs. {row.original.gst}</span> },
    { accessorKey: 'total', header: 'Total Value', cell: ({ row }) => <span className="font-bold text-blue-700 bg-blue-50 px-2 py-1 rounded">Rs. {parseFloat(row.original.total).toLocaleString('en-IN')}</span> },
    { 
      accessorKey: 'status', 
      header: 'Fulfillment',
      cell: ({ row }) => (
        <span className="bg-slate-900 border border-slate-700 text-white px-2 py-0.5 text-[10px] tracking-wider rounded font-bold uppercase shadow-sm">
          {row.original.status}
        </span>
      )
    },
    {
      id: 'actions',
      header: 'Extraction',
      cell: ({ row }) => (
        <button 
          onClick={() => downloadPDF(row.original)}
          className="p-2 bg-white border border-slate-200 hover:bg-slate-50 rounded-md text-slate-700 transition-colors shadow-sm flex items-center gap-2"
          title="Print Historical PDF"
        >
          <Download className="w-3 h-3" />
          <span className="text-xs font-semibold">Reprint</span>
        </button>
      )
    }
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Tax Invoice Master Ledger</h1>
          <p className="text-slate-500 mt-1">A consolidated log of all automatically and manually generated GST bills containing historical retrieval modules.</p>
        </div>
      </div>

      <DataTable 
        columns={columns} 
        data={invoices} 
        isLoading={isLoading} 
        searchKey="invoiceNo"
        searchPlaceholder="Locate via exact Invoice strings..."
      />
    </div>
  );
}
