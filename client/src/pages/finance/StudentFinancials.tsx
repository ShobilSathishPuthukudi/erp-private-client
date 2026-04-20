import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '@/lib/api';
import { ArrowLeft, Receipt, User, ShieldCheck } from 'lucide-react';
import AgingPanel from '@/components/finance/AgingPanel';
import { DataTable } from '@/components/shared/DataTable';
import type { ColumnDef } from '@tanstack/react-table';
import toast from 'react-hot-toast';

interface Student {
  id: number;
  name: string;
  enrollStatus: string;
  feeStatus: string;
}

interface Invoice {
  id: number;
  invoiceNo: string;
  total: string;
  status: string;
  createdAt: string;
}

export default function StudentFinancials() {
  const { id } = useParams();
  const [student, setStudent] = useState<Student | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [sRes, iRes] = await Promise.all([
          api.get(`/academic/students/${id}`),
          api.get(`/finance/invoices?studentId=${id}`) // Assuming filter exists
        ]);
        setStudent(sRes.data);
        setInvoices(iRes.data.filter((inv: any) => inv.studentId === parseInt(id!)));
      } catch (error) {
        toast.error('Failed to sync institutional financial profile');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const columns: ColumnDef<Invoice>[] = [
    { accessorKey: 'invoiceNo', header: 'Audit Ref' },
    { accessorKey: 'createdAt', header: 'Timestamp', cell: ({ row }) => new Date(row.original.createdAt).toLocaleDateString() },
    { accessorKey: 'total', header: 'Value', cell: ({ row }) => `₹${parseFloat(row.original.total).toLocaleString('en-IN')}` },
    { 
        accessorKey: 'status', 
        header: 'Status',
        cell: ({ row }) => (
            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                row.original.status === 'issued' ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-500'
            }`}>
                {row.original.status}
            </span>
        )
    }
  ];

  if (isLoading) return <div className="p-20 text-center font-mono animate-pulse uppercase tracking-widest text-slate-400 font-bold">Hydrating Institutional Ledger...</div>;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto flex flex-col h-[calc(100vh-8rem)]">
        <div className="flex justify-between items-center">
            <div className="flex items-center gap-6">
                <Link to="/dashboard/finance/invoices" className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
                    <ArrowLeft className="w-5 h-5 text-slate-600" />
                </Link>
                <div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight">Financial audit profile</h1>
                    <p className="text-slate-500 text-sm font-medium">Verified billing history for <b>{student?.name}</b></p>
                </div>
            </div>
            <div className="flex gap-2">
                <span className="px-4 py-1.5 bg-blue-50 border border-blue-100 rounded-xl text-[10px] font-black text-blue-700 uppercase tracking-widest flex items-center gap-2">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Forensic Verified
                </span>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 shrink-0">
            <div className="md:col-span-2">
                <AgingPanel type="student" id={id!} />
            </div>
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
                <div className="flex justify-between items-start">
                    <div className="p-3 bg-slate-100 rounded-2xl">
                        <User className="w-6 h-6 text-slate-600" />
                    </div>
                    <span className="bg-emerald-50 text-emerald-600 px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest border border-emerald-100">
                        {student?.feeStatus || 'Verified'}
                    </span>
                </div>
                <div>
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Enrollment Status</p>
                   <p className="text-lg font-black text-slate-900 uppercase tracking-tight">{student?.enrollStatus.replace('_', ' ')}</p>
                </div>
            </div>
        </div>

        <div className="flex-1 min-h-0 bg-white border border-slate-200 rounded-3xl shadow-sm flex flex-col overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center gap-3">
                <Receipt className="w-5 h-5 text-slate-400" />
                <span className="font-black text-slate-900 uppercase tracking-widest text-sm">Historical Invoice Ledger</span>
            </div>
            <div className="flex-1 overflow-auto">
                <DataTable columns={columns} data={invoices} isLoading={false} searchKey="invoiceNo" />
            </div>
        </div>
    </div>
  );
}
