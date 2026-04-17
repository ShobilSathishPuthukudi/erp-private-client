import { useEffect, useState } from 'react';
import { 
  Building2, 
  Power, 
  ShieldCheck, 
  Share2, 
  Printer, 
  Download, 
  LayoutGrid, 
  List, 
  Search,
  Shield,
  Plus
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Modal } from '../../components/shared/Modal';

interface DepartmentRecord {
  id: number;
  name: string;
  shortName?: string | null;
  status: string;
  type?: string | null;
  admin?: {
    uid: string;
    name: string;
    email: string;
  } | null;
}

export default function DepartmentsList() {
  const [departments, setDepartments] = useState<DepartmentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [isPolicyModalOpen, setIsPolicyModalOpen] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState<DepartmentRecord | null>(null);

  const fetchDepartments = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/departments');
      setDepartments(
        data.filter((item: any) =>
          ['departments', 'department'].includes((item.type || '').toLowerCase()) && item.parentId === null
        )
      );
    } catch (error) {
      toast.error('Failed to synchronize core departments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  const handleDeactivate = async (department: DepartmentRecord) => {
    if (department.status === 'inactive') return;
    if (!window.confirm(`Deactivate ${department.name} and all linked staff, sub-departments, and admin roles?`)) return;

    try {
      await api.post(`/org-admin/departments/${department.id}/deactivate`);
      toast.success(`${department.name} deactivated`);
      fetchDepartments();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to deactivate department');
    }
  };

  const handlePrint = () => {
    window.print();
    toast.success('Preparing institutional registry for print');
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success('Registry link copied to clipboard');
  };

  const handleExportExcel = () => {
    const data = filteredDepartments.map(d => ({
      ID: d.id,
      'Department Name': d.name,
      Identity: d.shortName || 'N/A',
      Status: d.status,
      Admin: d.admin?.name || 'Unassigned'
    }));
    
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Core_Departments");
    XLSX.writeFile(wb, "Institutional_Departments.xlsx");
    toast.success('Excel manifest generated');
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    const tableData = filteredDepartments.map(d => [
      d.id,
      d.name,
      d.shortName || 'N/A',
      d.status,
      d.admin?.name || 'Unassigned'
    ]);

    doc.setFontSize(18);
    doc.text('Institutional Core Department Registry', 14, 22);
    autoTable(doc, {
      startY: 35,
      head: [['ID', 'Department Identity', 'Pillar Identity', 'Status', 'Assigned Admin']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [15, 23, 42] }
    });

    doc.save("Department_Registry.pdf");
    toast.success('PDF Registry generated');
  };

  const filteredDepartments = departments.filter(dept => 
    dept.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (dept.admin?.name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Premium Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-slate-900/20">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 font-display tracking-tight">Core Departments</h1>
            <p className="text-slate-500 mt-1">Manage foundational organizational sectors and institutional pillars.</p>
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
          <div className="relative group/export">
            <button 
              className="p-2.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all active:scale-95 group cursor-pointer"
              title="Download/Export Registry"
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
      </div>

      {/* Control Bar */}
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
          <div className="relative flex-1 max-w-md w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search by department name or admin..." 
              className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center bg-white p-1 rounded-2xl border border-slate-200 shadow-sm gap-1">
             <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-xl transition-all cursor-pointer ${
                viewMode === 'grid' 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' 
                  : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-xl transition-all cursor-pointer ${
                viewMode === 'list' 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' 
                  : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
              }`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>

        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-slate-100 shadow-sm">
             <div className="w-10 h-10 border-4 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
             <p className="text-[10px] font-bold text-slate-400 tracking-wider mt-4 uppercase">Synchronizing infrastructure...</p>
          </div>
        ) : filteredDepartments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-slate-200 border-dashed text-slate-400 text-sm font-medium">
            No core departments found matching your search.
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDepartments.map((dept) => (
              <div 
                key={dept.id} 
                onClick={() => setSelectedDepartment(dept)}
                className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden group transition-all duration-500 hover:shadow-2xl hover:border-blue-400/30 hover:-translate-y-2 hover:scale-[1.01] cursor-pointer"
              >

                <div className={`h-2 ${
                  dept.status?.toLowerCase() === 'active' ? 'bg-green-500' : 'bg-rose-500'
                }`}></div>
                <div className="p-6 space-y-6">
                  <div className="flex justify-between items-start gap-4">
                    <div className="min-w-0">
                      <h3 className="text-xl font-bold text-slate-900 mb-2 truncate" title={dept.name}>{dept.name}</h3>
                      <div className="flex flex-wrap gap-2">
                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap uppercase tracking-tight ${
                          dept.status?.toLowerCase() === 'active' ? 'bg-green-100 text-green-700' : 'bg-rose-100 text-rose-700'
                        }`}>
                          {dept.status}
                        </span>
                        <span className="text-[10px] text-slate-400 font-bold tracking-wider pt-1 whitespace-nowrap uppercase">Seeded Pillar</span>
                      </div>
                    </div>
                    <div className={`flex-shrink-0 p-3 rounded-2xl border transition-all duration-300 shadow-sm ${
                      dept.status?.toLowerCase() === 'active'
                        ? 'bg-blue-50 text-blue-600 border-blue-100 group-hover:bg-blue-600 group-hover:text-white'
                        : 'bg-rose-50 text-rose-600 border-rose-100 group-hover:bg-rose-600 group-hover:text-white'
                    }`}>
                      <Building2 className="w-6 h-6" />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 group-hover:bg-white group-hover:border-blue-100 transition-all">
                      <p className="text-[10px] text-slate-400 font-bold tracking-wider uppercase mb-1">Assigned Admin</p>
                      <p className="text-sm font-bold text-slate-700 truncate">{dept.admin?.name || 'Not assigned yet'}</p>
                      <p className="text-[10px] text-slate-500 truncate mt-0.5">{dept.admin?.email || 'Awaiting role mapping...'}</p>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
                      Core Institutional Unit
                    </div>
                  </div>

                  <div className="flex justify-end items-center gap-2 pt-2">
                    <button 
                      disabled={dept.status === 'inactive'}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeactivate(dept);
                      }}
                      className={`p-3 rounded-xl transition-all border border-slate-100 active:scale-[0.95] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer ${
                        dept.status?.toLowerCase() === 'active' 
                        ? 'bg-rose-50/50 text-slate-400 hover:text-rose-600 hover:bg-rose-100/50 hover:border-rose-200' 
                        : 'bg-slate-50 text-slate-300'
                      }`}
                      title={dept.status?.toLowerCase() === 'active' ? 'Deactivate Department' : 'Already Inactive'}
                    >
                      <Power className="w-4 h-4" />
                    </button>

                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-200">
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest cursor-pointer">Department Unit</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest cursor-pointer">Admin Liaison</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest cursor-pointer">Operational Role</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest cursor-pointer">System Status</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredDepartments.map((dept) => (
                    <tr 
                      key={dept.id} 
                      onClick={() => setSelectedDepartment(dept)}
                      className="hover:bg-slate-50/50 transition-colors group cursor-pointer"
                    >

                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                           <div className={`p-2 rounded-lg border transition-all duration-300 ${
                            dept.status?.toLowerCase() === 'active'
                              ? 'bg-blue-50 text-blue-600 border-blue-100 group-hover:bg-blue-600 group-hover:text-white'
                              : 'bg-rose-50 text-rose-600 border-rose-100 group-hover:bg-rose-600 group-hover:text-white'
                          }`}>
                            <Building2 className="w-4 h-4" />
                          </div>
                          <p className="font-bold text-slate-900 text-sm">{dept.name}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs font-bold text-slate-600">
                         {dept.admin?.name || 'Unassigned'}
                      </td>
                      <td className="px-6 py-4">
                        <span className="bg-slate-100 text-slate-600 text-[9px] px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                           {dept.shortName || 'Seeded Pillar'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                         <span className={`px-2.5 py-1 text-[10px] rounded-full font-bold uppercase tracking-wider ${
                            dept.status?.toLowerCase() === 'active' ? 'bg-green-100 text-green-700' : 'bg-rose-100 text-rose-700'
                          }`}>
                            {dept.status}
                          </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                          <button 
                            disabled={dept.status === 'inactive'}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeactivate(dept);
                            }}
                            className="p-2 text-slate-400 hover:text-rose-600 disabled:opacity-20 transition-colors cursor-pointer"
                          ><Power className="w-4 h-4" /></button>

                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Institutional Banner */}
      <div className="bg-slate-900 rounded-3xl p-8 text-white flex flex-col md:flex-row items-center justify-between gap-8 shadow-2xl relative overflow-hidden">
        <Shield className="absolute top-0 right-0 -mr-12 -mt-12 w-48 h-48 text-white/5 rotate-12" />
        <div className="max-w-xl relative z-10">
          <h4 className="text-xl font-bold mb-3 font-display">Institutional Infrastructure & Governance</h4>
          <p className="text-slate-400 text-sm leading-relaxed font-medium">
            Core departments represent the foundational sectors of the organization. 
            All departmental configurations are synchronized with the institutional structure registry. 
            Deactivation of a core unit propagates status updates across all linked administrative roles and personnel.
          </p>
        </div>
        <button 
          onClick={() => setIsPolicyModalOpen(true)}
          className="px-6 py-4 bg-white text-slate-900 font-bold rounded-2xl shadow-xl cursor-pointer hover:scale-[1.05] transition-all relative z-10 text-xs uppercase tracking-widest cursor-pointer"
        >
          Security Policy
        </button>
      </div>

      {/* Security Policy Modal */}
      <Modal
        isOpen={isPolicyModalOpen}
        onClose={() => setIsPolicyModalOpen(false)}
        title="Institutional Data Isolation & Boundaries"
      >
        <div className="space-y-6">
          <div className="bg-blue-50 border border-blue-100 p-6 rounded-2xl cursor-pointer">
            <h3 className="text-blue-900 font-bold flex items-center gap-2 mb-2 text-sm uppercase tracking-wider">
              <Shield className="w-4 h-4" />
              Organizational Visibility Guard
            </h3>
            <p className="text-blue-800 text-sm leading-relaxed">
              The 'Visibility Guard' is a centralized security middleware that strictly isolates departmental data. 
              Personnel registered under a core unit are restricted to their provisioned jurisdiction unless global 
              privileges are explicitly granted by the Organization Administrator.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { title: "Jurisdictional Isolation", content: "Database records are strictly filtered by deptId at the controller layer to prevent cross-sector visibility." },
              { title: "Audit Trail Registry", content: "All modifications to core infrastructure units are recorded in the immutable institutional Audit Log." }
            ].map((block, i) => (
              <div key={i} className="p-5 border border-slate-100 rounded-2xl bg-white shadow-sm cursor-pointer">
                <h4 className="font-bold text-slate-900 mb-2 flex items-center gap-2 text-sm">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                  {block.title}
                </h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  {block.content}
                </p>
              </div>
            ))}
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <button 
              onClick={() => setIsPolicyModalOpen(false)}
              className="bg-slate-900 text-white px-6 py-2 rounded-xl font-bold hover:bg-slate-800 transition-all text-sm uppercase tracking-widest cursor-pointer"
            >
              Acknowledge
            </button>
          </div>
        </div>
      </Modal>

      {/* Core Department Details Modal */}
      <Modal
        isOpen={!!selectedDepartment}
        onClose={() => setSelectedDepartment(null)}
        title="Core Department Insight"
      >
        {selectedDepartment && (
          <div className="space-y-8">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-4">
                <div className={`p-4 rounded-2xl shadow-lg ${
                  selectedDepartment.status?.toLowerCase() === 'active' ? 'bg-blue-600 text-white' : 'bg-slate-900 text-white'
                }`}>
                  <Building2 className="w-8 h-8" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase">{selectedDepartment.name}</h2>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                      selectedDepartment.status?.toLowerCase() === 'active' ? 'bg-green-100 text-green-700' : 'bg-rose-100 text-rose-700'
                    }`}>
                      {selectedDepartment.status}
                    </span>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 px-2.5 py-0.5 rounded-full">
                      Pillar Identity: {selectedDepartment.shortName || 'SEEDED'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Assigned Administrative Liaison</p>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center text-slate-900 font-black text-lg">
                    {selectedDepartment.admin?.name?.charAt(0) || '?'}
                  </div>
                  <div className="min-w-0">
                    <p className="font-black text-slate-900 uppercase tracking-tight truncate">{selectedDepartment.admin?.name || 'Unassigned'}</p>
                    <p className="text-[11px] font-bold text-slate-500 truncate">{selectedDepartment.admin?.email || 'Awaiting role mapping'}</p>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-blue-50/50 rounded-[2rem] border border-blue-100/50">
                <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em] mb-4">Operational Monitoring</p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-[11px] font-black text-blue-700 uppercase tracking-tight">
                    <ShieldCheck className="w-4 h-4" />
                    Core Institutional Unit
                  </div>
                  <p className="text-[10px] font-bold text-blue-600/60 leading-relaxed uppercase tracking-tight">
                    This unit is a foundational pillar of the organization, protected by strict data isolation protocols.
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-slate-100 flex justify-end">
              <button 
                onClick={() => setSelectedDepartment(null)}
                className="px-8 py-3 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-slate-800 transition-all active:scale-95 shadow-lg shadow-slate-900/10"
              >
                Close Insight
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
