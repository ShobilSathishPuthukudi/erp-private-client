import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { DataTable } from '@/components/shared/DataTable';
import * as XLSX from 'xlsx';
import type { ColumnDef } from '@tanstack/react-table';
import toast from 'react-hot-toast';
import { Users, Share2, Printer, Download } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Student {
  id: number;
  name: string;
  enrollStatus: string;
  status: string;
  feeStatus: string;
  marks: Record<string, unknown> | null;
  program?: { name: string; type?: string };
  subDepartment?: { name: string };
  verificationLogs?: unknown[];
}

export default function Students() {
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/academic/students');
      setStudents(res.data);
    } catch {
      toast.error('Failed to parse global student roster');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handlePrint = () => {
    window.print();
    toast.success('Preparing student registry for print');
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success('Registry link copied to clipboard');
  };


  const handleExport = () => {
    if (!students.length) return;
    const exportData = students.map((row) => ({
      SID: `S-${row.id}`,
      Student: row.name,
      'Sub-Department': row.subDepartment?.name || 'GEN-ADMIN',
      Program: row.program?.name || 'Unassigned Core',
      Status: row.status || 'In Review',
      Finance: row.feeStatus || 'pending'
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Student_Roster");
    XLSX.writeFile(workbook, "Institutional_Student_Registry.xlsx");
    toast.success('Institutional manifest generated');
  };

  const columns: ColumnDef<Student>[] = [
    { accessorKey: 'id', header: 'SID', cell: ({ row }) => <span className="font-mono text-slate-500">S-{row.original.id}</span> },
    {
      accessorKey: 'name',
      header: 'Student',
      cell: ({ row }) => (
        <Link to={`/dashboard/academic/students/${row.original.id}`} className="font-semibold text-slate-900 hover:text-blue-600 transition-colors">
          {row.original.name}
        </Link>
      )
    },
    { 
      id: 'subDepartment', 
      header: 'Sub-Department', 
      cell: ({ row }) => (
        <div className="inline-block text-slate-700 bg-slate-100 px-2 py-1 text-[10px] font-bold uppercase tracking-widest rounded border border-slate-200 leading-normal max-w-[140px]">
          {row.original.subDepartment?.name || 'GEN-ADMIN'}
        </div>
      )
    },
    { 
      id: 'program', 
      header: 'Program', 
      cell: ({ row }) => (
        <div className="inline-block text-slate-700 bg-slate-50 px-2 py-1 text-xs rounded border border-slate-200 leading-normal max-w-[140px]">
          {row.original.program?.name || 'Unassigned Core'}
        </div>
      )
    },
    { 
      accessorKey: 'enrollStatus', 
      header: 'Status', 
      cell: ({ row }) => {
        const s = row.original.status;
        return (
          <span className={`uppercase font-black text-[9px] tracking-widest px-3 py-1.5 rounded-full border ${
            s === 'ENROLLED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 
            s === 'OPS_APPROVED' ? 'bg-amber-50 text-amber-700 border-amber-200' :
            s === 'REJECTED' ? 'bg-red-50 text-red-700 border-red-200' :
            'bg-slate-50 text-slate-700 border-slate-200'
          }`}>
            {s || 'In Review'}
          </span>
        );
      }
    },
    { accessorKey: 'feeStatus', header: 'Finance', cell: ({ row }) => <span className="uppercase text-[10px] text-slate-500 font-bold">{row.original.feeStatus}</span> }
  ];
  return (
    <div className="p-2 space-y-6 flex flex-col h-[calc(100vh-8rem)]">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white px-6 py-5 rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50 gap-6 shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center text-white shadow-lg shadow-slate-900/20 shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight leading-tight mb-0.5">Student status</h1>
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
          data={students} 
          isLoading={isLoading} 
          searchKey="name" 
          searchPlaceholder="Locate by student legal string..." 
        />
      </div>
    </div>
  );
}
