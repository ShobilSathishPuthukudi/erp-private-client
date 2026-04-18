import { useEffect, useState, useMemo } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { Users, ShieldCheck, Building2, UserCog, Briefcase, Share2, Printer, Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { DataTable } from '@/components/shared/DataTable';
import { PageHeader } from '@/components/shared/PageHeader';
import { useAuthStore } from '@/store/authStore';
import { getNormalizedRole } from '@/lib/roles';
import { toSentenceCase } from '@/lib/utils';

type RosterUser = {
  uid: string;
  name: string;
  email?: string;
  role: string;
  status: string;
  subDepartment?: string | null;
  createdAt: string;
  department?: {
    id: number;
    name: string;
    type?: string;
  } | null;
};

type TabType = 'centers' | 'admins' | 'employees';

export default function InstitutionalRoster() {
  const user = useAuthStore((state) => state.user);
  const currentRole = getNormalizedRole(user?.role || '');
  const [users, setUsers] = useState<RosterUser[]>([]);
  const [scope, setScope] = useState<string[]>([]);
  const [isRestricted, setIsRestricted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('admins');
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    const fetchRoster = async () => {
      try {
        setIsLoading(true);
        const res = await api.get('/ceo/roster');
        setUsers(Array.isArray(res.data?.users) ? res.data.users : []);
        setScope(Array.isArray(res.data?.visibilityScope) ? res.data.visibilityScope : []);
        setIsRestricted(Boolean(res.data?.restricted));
      } catch (error) {
        toast.error('Failed to fetch institutional structure');
        setUsers([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRoster();
  }, []);

  const filteredData = useMemo(() => {
    // 1. Remove students as requested
    const nonStudents = users.filter(u => u.role !== 'student');

    // 2. Filter based on active tab
    switch (activeTab) {
      case 'centers':
        return nonStudents.filter(u => u.role === 'Partner Center');
      case 'admins':
        return nonStudents.filter(u => u.role.toLowerCase().includes('admin'));
      case 'employees':
        return nonStudents.filter(u => u.role === 'Employee');
      default:
        return [];
    }
  }, [users, activeTab]);

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success('Registry link copied to clipboard');
  };

  const handlePrint = () => {
    window.print();
    toast.success('Preparing institutional structure for print');
  };

  const handleExportExcel = () => {
    try {
      const data = filteredData.map(u => ({
        'User ID': u.uid,
        Name: u.name,
        Email: u.email || 'N/A',
        Role: u.role,
        Department: u.department?.name || u.subDepartment || 'Unassigned',
        Status: u.status,
        Created: new Date(u.createdAt).toLocaleDateString()
      }));
      
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, activeTab.toUpperCase());
      XLSX.writeFile(wb, `Institutional_Structure_${activeTab}.xlsx`);
      toast.success('Excel manifest generated');
    } catch (error) {
      toast.error('Failed to generate Excel export');
    }
  };

  const handleExportPDF = () => {
    try {
      const doc = new jsPDF();
      const tableData = filteredData.map(u => [
        u.uid,
        u.name,
        u.email || 'N/A',
        u.role,
        u.department?.name || u.subDepartment || 'Unassigned',
        u.status
      ]);

      doc.setFontSize(18);
      doc.text(`Institutional Structure - ${activeTab.toUpperCase()}`, 14, 22);
      autoTable(doc, {
        startY: 35,
        head: [['UID', 'Name', 'Email', 'Role', 'Department/Sub-Dept', 'Status']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [79, 70, 229] } // Indigo-600
      });

      doc.save(`Institutional_Structure_${activeTab}.pdf`);
      toast.success('PDF Document generated');
    } catch (error) {
      toast.error('Failed to generate PDF export');
    }
  };

  const columns: ColumnDef<RosterUser>[] = [
    {
      accessorKey: 'uid',
      header: 'User ID'
    },
    {
      accessorKey: 'name',
      header: 'Name',
      cell: ({ row }) => <span className="font-semibold text-slate-900">{row.original.name}</span>
    },
    {
      accessorKey: 'email',
      header: 'Email',
      cell: ({ row }) => row.original.email || 'No email'
    },
    {
      accessorKey: 'role',
      header: 'Role',
      cell: ({ row }) => toSentenceCase(row.original.role)
    },
    {
      id: 'department',
      header: 'Department',
      cell: ({ row }) => row.original.department?.name || row.original.subDepartment || 'Unassigned'
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const status = row.original.status || 'unknown';
        const color =
          status === 'active'
            ? 'bg-emerald-100 text-emerald-700'
            : status === 'pending_dept'
              ? 'bg-amber-100 text-amber-700'
              : 'bg-slate-100 text-slate-700';

        return (
          <span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${color}`}>
            {status.replace('_', ' ')}
          </span>
        );
      }
    },
    {
      accessorKey: 'createdAt',
      header: 'Created',
      cell: ({ row }) => new Date(row.original.createdAt).toLocaleDateString()
    }
  ];

  const tabs = [
    { id: 'admins', name: 'Admins', icon: UserCog, count: users.filter(u => u.role.toLowerCase().includes('admin')).length },
    { id: 'employees', name: 'Employees', icon: Briefcase, count: users.filter(u => u.role === 'Employee').length },
    { id: 'centers', name: 'Partner Centers', icon: Building2, count: users.filter(u => u.role === 'Partner Center').length },
  ];

  const title = currentRole === 'ceo' ? 'Executive Structure' : 'Institutional Structure';
  const description = isRestricted
    ? `Read-only personnel visibility for your authorized scope: ${scope.join(', ') || 'No scope assigned'}`
    : 'Read-only institution-wide personnel visibility';

  const headerIcons = (
    <div className="flex items-center gap-3">
      <button 
        onClick={handleShare}
        className="p-2.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all active:scale-95 group cursor-pointer"
        title="Share Structure Link"
      >
        <Share2 className="w-5 h-5 group-hover:scale-110 transition-transform" />
      </button>
      <button 
        onClick={handlePrint}
        className="p-2.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all active:scale-95 group cursor-pointer"
        title="Print Structure"
      >
        <Printer className="w-5 h-5 group-hover:scale-110 transition-transform" />
      </button>
      <div className="relative group/export">
        <button 
          className="p-2.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all active:scale-95 group cursor-pointer"
          title="Download/Export Structure"
        >
          <Download className="w-5 h-5 group-hover:scale-110 transition-transform" />
        </button>
        <div className="absolute right-0 top-full pt-2 hidden group-hover/export:block z-50">
          <div className="w-48 bg-white border border-slate-200 rounded-2xl shadow-xl cursor-pointer overflow-hidden animate-in fade-in slide-in-from-top-2">
            <button 
              onClick={handleExportExcel}
              className="w-full text-left px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all border-b border-slate-100 cursor-pointer"
            >
              Excel (.xlsx) Manifest
            </button>
            <button 
              onClick={handleExportPDF}
              className="w-full text-left px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all cursor-pointer"
            >
              PDF (.pdf) Document
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 flex flex-col h-[calc(100vh-8rem)]">
      <PageHeader
        title={title}
        description={description}
        icon={Users}
        action={headerIcons}
      />

      <div className="flex bg-slate-100/50 p-1 rounded-2xl border border-slate-200 w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as TabType)}
            className={`
              flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-200
              ${activeTab === tab.id 
                ? 'bg-white text-indigo-600 shadow-lg shadow-indigo-100 ring-1 ring-slate-200' 
                : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'}
            `}
          >
            <tab.icon className={`w-3.5 h-3.5 ${activeTab === tab.id ? 'text-indigo-600' : 'text-slate-400'}`} />
            {tab.name}
            <span className={`ml-1 px-1.5 py-0.5 rounded-md text-[9px] ${activeTab === tab.id ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-200 text-slate-600'}`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      <div className="flex-1 min-h-0 bg-white shadow-xl shadow-slate-200/50 border border-slate-200 rounded-[2rem] flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          <DataTable
            columns={columns}
            data={filteredData}
            isLoading={isLoading}
            searchKey="name"
            searchPlaceholder={`Search ${activeTab}...`}
            headerAction={
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm">
                <ShieldCheck className="w-4 h-4" />
                <span className="text-[10px] font-black uppercase tracking-widest">Read Only</span>
              </div>
            }
            emptyMessage={`No ${activeTab} found.`}
            emptyDescription={`There are no records classified as ${activeTab} in the current scope.`}
          />
        </div>
      </div>
    </div>
  );
}
