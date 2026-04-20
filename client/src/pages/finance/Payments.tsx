import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { DataTable } from '@/components/shared/DataTable';
import { PaymentReviewModal } from '@/components/finance/PaymentReviewModal';
import type { ColumnDef } from '@tanstack/react-table';
import { CheckCircle, Clock, XCircle, FileText, CreditCard } from 'lucide-react';
import toast from 'react-hot-toast';
import { PageHeader } from '@/components/shared/PageHeader';
import jsPDF from 'jspdf';
import { Link } from 'react-router-dom';

interface Payment {
  id: number;
  studentId: number;
  amount: string;
  mode: string;
  status: 'pending' | 'verified' | 'failed';
  date: string;
  student?: {
    name: string;
    enrollStatus: string;
  };
}

export default function Payments() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);

  const fetchPayments = async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/finance/payments');
      setPayments(res.data);
    } catch (error) {
      toast.error('Failed to fetch payments');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  const handleVerifyRequest = (payment: Payment) => {
    setSelectedPayment(payment);
    setIsReviewModalOpen(true);
  };

  const verifyPayment = async (remarks: string) => {
    try {
      if (!selectedPayment) return;
      // Step 1: Verify on Backend & Auto-Generate Invoice record
      const res = await api.post(`/finance/payments/${selectedPayment.id}/verify`, { remarks });
      toast.success('Payment verified! Executing GAP-1 Invoice auto-generation...');
      
      const { invoice } = res.data;
      
      // Step 2: Dynamic JS PDF generation directly on the client
      const doc = new jsPDF();
      
      // Branding Header
      doc.setFontSize(22);
      doc.setTextColor(15, 23, 42);
      doc.text('RPS Educational Institution', 20, 20);
      
      // Document Identifier
      doc.setFontSize(14);
      doc.setTextColor(71, 85, 105);
      doc.text('OFFICIAL TAX INVOICE', 20, 30);
      
      // Database Metadata Records
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.text(`Invoice No: ${invoice.invoiceNo}`, 20, 50);
      doc.text(`Date Issued: ${new Date(invoice.createdAt).toLocaleDateString()}`, 20, 60);
      doc.text(`Transaction Reference: PMT-${invoice.paymentId}`, 20, 70);
      
      // UI Divider Bar
      doc.setDrawColor(203, 213, 225);
      doc.line(20, 80, 190, 80);
      
      // Payment Breakdown Headers
      doc.setFontSize(11);
      doc.text('Description', 20, 95);
      doc.text('Calculated Value', 140, 95);
      
      // Financial Logic Matrix
      doc.setFontSize(12);
      doc.text('Academic Tuition Fee Installment', 20, 105);
      doc.text(`Rs. ${parseFloat(invoice.amount).toFixed(2)}`, 140, 105);
      
      doc.text('Government GST Calculation (18%)', 20, 115);
      doc.text(`Rs. ${parseFloat(invoice.gst).toFixed(2)}`, 140, 115);
      
      doc.line(20, 125, 190, 125);
      
      // Reconciled Total
      doc.setFontSize(14);
      doc.setTextColor(37, 99, 235);
      doc.text('Total Reconciled:', 100, 140);
      doc.setFontSize(16);
      doc.text(`Rs. ${parseFloat(invoice.total).toFixed(2)}`, 140, 140);
      
      // Legal Footer Disclaimers
      doc.setFontSize(10);
      doc.setTextColor(148, 163, 184);
      doc.text('Notice: This is a computer-generated transactional document processed automatically.', 20, 270);
      doc.text('No physical signature is required per internal compliance protocols.', 20, 275);
      
      // Trigger user side download intercept
      doc.save(`${invoice.invoiceNo}.pdf`);
      
      setIsReviewModalOpen(false);
      setSelectedPayment(null);
      // Refresh local Datatable UI
      fetchPayments();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Verification logic failure');
    }
  };

  const columns: ColumnDef<Payment>[] = [
    { accessorKey: 'id', header: 'Ref ID', cell: ({ row }) => <span className="font-mono text-slate-500">#{row.original.id}</span> },
    { 
      id: 'student', 
      header: 'Student Profile',
      cell: ({ row }) => {
        const student = row.original.student;
        return (
          <div>
            {student?.name ? (
              <Link to={`/dashboard/finance/students/${row.original.studentId}`} className="font-semibold text-slate-800 hover:text-blue-600 transition-colors">
                {student.name}
              </Link>
            ) : (
              <p className="font-semibold text-slate-800">{`Anonymous Form ID: ${row.original.studentId}`}</p>
            )}
            {student && <p className="text-xs text-slate-500 uppercase font-medium">{student.enrollStatus} enrollment</p>}
          </div>
        );
      }
    },
    { 
      accessorKey: 'amount', 
      header: 'Transfer Value',
      cell: ({ row }) => <span className="font-semibold text-slate-900">Rs. {parseFloat(row.original.amount).toLocaleString('en-IN')}</span>
    },
    { accessorKey: 'mode', header: 'Payment Mode', cell: ({ row }) => <span className="uppercase text-[10px] tracking-wider font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded">{row.original.mode}</span> },
    { accessorKey: 'date', header: 'Received Date', cell: ({ row }) => <span className="text-slate-600">{new Date(row.original.date).toLocaleDateString()}</span> },
    { 
      accessorKey: 'status', 
      header: 'Audited Status',
      cell: ({ row }) => {
        const status = row.original.status;
        if (status === 'verified') return <span className="flex items-center text-green-700 text-[10px] font-bold px-2 py-1 rounded-full"><CheckCircle className="w-4 h-4 mr-1 text-green-500" /> VERIFIED</span>;
        if (status === 'failed') return <span className="flex items-center text-red-700 text-[10px] font-bold px-2 py-1 rounded-full"><XCircle className="w-4 h-4 mr-1 text-red-500" /> FAILED</span>;
        return <span className="flex items-center text-amber-700 text-[10px] font-bold px-2 py-1 rounded-full"><Clock className="w-4 h-4 mr-1 text-amber-500" /> PENDING</span>;
      }
    },
    {
      id: 'actions',
      header: 'ERP Core Actions',
      cell: ({ row }) => {
        const payment = row.original;
        if (payment.status !== 'pending') return <span className="text-[10px] text-slate-400 font-medium tracking-wider uppercase border border-slate-200 px-2 py-1 rounded bg-slate-50">Locked Log</span>;
        return (
          <button 
            onClick={() => handleVerifyRequest(payment)} 
            className="flex items-center space-x-1 text-xs font-semibold text-white bg-slate-900 px-3 py-1.5 rounded shadow-sm hover:bg-slate-800 transition-colors"
          >
            <FileText className="w-3 h-3" />
            <span>Deploy Auto-Invoice</span>
          </button>
        );
      }
    }
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <PageHeader 
        title="Student payment pipelines"
        description="Review pending student transfers and securely generate fully tax-compliant PDF invoices instantly."
        icon={CreditCard}
      />

      <DataTable 
        columns={columns} 
        data={payments} 
        isLoading={isLoading} 
      />

      <PaymentReviewModal 
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        onConfirm={verifyPayment}
        payment={selectedPayment}
      />
    </div>
  );
}
