import { useState, useEffect } from 'react';
import { 
  Building2,
  Share2,
  Printer,
  Download,
  LayoutGrid,
  List,
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  Power,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Shield,
  Layers,
  MapPin,
  School
} from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import toast from 'react-hot-toast';
import { Modal } from '../../components/shared/Modal';
import DepartmentCreate from './DepartmentCreate';

export default function DepartmentsList() {
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPolicyModalOpen, setIsPolicyModalOpen] = useState(false);
  const [policy, setPolicy] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDept, setSelectedDept] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const fetchPolicy = async () => {
    try {
      const response = await fetch('/api/org-admin/config/policies');
      if (response.ok) {
        const data = await response.json();
        setPolicy(data.governance_policy);
      }
    } catch (error) {
      console.error('Failed to fetch governance policy:', error);
    }
  };

  const fetchDepartments = async () => {
    try {
      const response = await fetch('/api/departments');
      if (!response.ok) throw new Error('Failed to fetch');
      const data = await response.json();
      setDepartments(data);
      setLoading(false);
    } catch (error) {
      console.error("Failed to fetch departments", error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
    fetchPolicy();
  }, []);

  const toggleStatus = async (id: number, currentStatus: string) => {
    try {
      const newStatus = (currentStatus === 'active' || currentStatus === 'Active') ? 'inactive' : 'active';
      const response = await fetch(`/api/departments/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (response.ok) fetchDepartments();
    } catch (error) {
      console.error("Failed to toggle status", error);
    }
  };

  const deleteDept = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this department?")) return;
    try {
      const response = await fetch(`/api/departments/${id}`, {
        method: 'DELETE'
      });
      if (response.ok) fetchDepartments();
    } catch (error) {
      console.error("Failed to delete department", error);
    }
  };

  const handlePrint = () => {
    window.print();
    toast.success('Preparing departmental registry for print');
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success('Registry link copied to clipboard');
  };

  const handleExportExcel = () => {
    const data = departments.map(d => ({
      ID: d.id,
      'Department Name': d.name.toUpperCase(),
      Administrator: d.admin?.name || 'Unassigned',
      Status: d.status,
      Type: d.type
    }));
    
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Departments");
    XLSX.writeFile(wb, "Departmental_Registry.xlsx");
    toast.success('Excel manifest generated');
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    const tableData = departments.map(d => [
      d.id,
      d.name.toUpperCase(),
      d.admin?.name || 'Unassigned',
      d.status,
      d.type
    ]);

    doc.setFontSize(18);
    doc.text('Institutional Departmental Registry', 14, 22);
    autoTable(doc, {
      startY: 35,
      head: [['ID', 'Department Name', 'Administrator', 'Status', 'Type']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [15, 23, 42] }
    });

    doc.save("Departmental_Registry.pdf");
    toast.success('PDF Registry generated');
  };

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');

  const filteredDepts = departments.filter(dept => {
    const type = (dept.type || '').toLowerCase();
    const name = (dept.name || '').toLowerCase();

    // Strict Identity Filter: Show only core departments
    if ((type !== 'departments' && type !== 'department') || dept.parentId !== null) return false;
    
    const matchesSearch = (name.includes(searchTerm.toLowerCase()) || 
                          (dept.admin?.name || '').toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = filterStatus === 'All' || (dept.status && dept.status.toLowerCase() === filterStatus.toLowerCase());
    
    return matchesStatus && matchesSearch;
  });

  const getEntityTag = (type: string, name: string) => {
    const isSub = ['BVoc', 'Online', 'Skill', 'Open School'].some(s => name.includes(s));
    
    if (isSub) {
      return (
        <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 border border-amber-100 text-[10px] font-black uppercase tracking-tight">
          <Layers className="w-3 h-3" />
          Sub-Department
        </span>
      );
    }

    const t = type?.toLowerCase();
    if (t === 'university') return <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-100/50 text-indigo-700 border border-indigo-200 text-[10px] font-black uppercase tracking-tight"><School className="w-3 h-3" /> University</span>;
    if (t === 'branch') return <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-100/50 text-rose-700 border border-rose-200 text-[10px] font-black uppercase tracking-tight"><MapPin className="w-3 h-3" /> Regional Branch</span>;
    if (t === 'center' || t === 'partner-center') return <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-teal-100/50 text-teal-700 border border-teal-200 text-[10px] font-black uppercase tracking-tight"><MapPin className="w-3 h-3" /> Partner Center</span>;
    
    return <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-black uppercase tracking-tight"><Shield className="w-3 h-3" /> Department</span>;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Active': return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-700 flex items-center w-fit"><CheckCircle2 className="w-3 h-3 mr-1" /> Active</span>;
      case 'Inactive': return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 flex items-center w-fit"><Power className="w-3 h-3 mr-1" /> Inactive</span>;
      default: return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 flex items-center w-fit"><AlertCircle className="w-3 h-3 mr-1" /> Draft</span>;
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-slate-900/20">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 font-display tracking-tight">Institutional Departments</h1>
            <p className="text-slate-500 mt-1">Manage core institutional pillars and functional administration.</p>
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
            title="Print Role Registry"
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
            <div className="absolute right-0 top-full pt-2 hidden group-hover/export:block z-50 transition-all duration-200">
              <div className="w-48 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2">
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
          <button 
            onClick={() => {
              setSelectedDept(null);
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-blue-700 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-blue-500/20"
          >
            <Plus className="w-5 h-5 mr-2" />
            New Department
          </button>
        </div>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        hideHeader={true}
      >
        <DepartmentCreate 
          initialData={selectedDept}
          context="department"
          defaultType={selectedDept?.type || ''}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedDept(null);
          }}
          onSuccess={() => {
            fetchDepartments();
          }}
        />
      </Modal>

      {/* Controls & Cards Grid */}
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
          <div className="relative flex-1 max-w-md w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search by name or admin..." 
              className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none shadow-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center bg-white p-1 rounded-2xl border border-slate-200 shadow-sm gap-1">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-400 px-3 tracking-wider">
              <Filter className="w-3.5 h-3.5" />
              <span>Status</span>
            </div>
            <select 
              className="bg-slate-50 border-none rounded-xl px-4 py-2 text-sm font-bold outline-none focus:ring-0 text-slate-700 cursor-pointer mr-2"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="All">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            <div className="w-px h-6 bg-slate-100 mx-2" />

            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-xl transition-all ${
                viewMode === 'grid' 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' 
                  : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
              }`}
              title="Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-xl transition-all ${
                viewMode === 'list' 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' 
                  : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
              }`}
              title="List View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-slate-100 shadow-sm">
             <div className="w-10 h-10 border-4 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
             <p className="text-xs font-bold text-slate-400 tracking-wider mt-4">Hydrating institutional data...</p>
          </div>
        ) : filteredDepts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-slate-200 border-dashed text-slate-400">
            No departments found matching your search.
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDepts.map((dept) => (
              <div 
                key={dept.id} 
                onClick={() => {
                  setSelectedDept(dept);
                  setIsModalOpen(true);
                }}
                className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden group cursor-pointer transition-all duration-500 hover:shadow-2xl hover:border-blue-400/30 hover:-translate-y-2 hover:scale-[1.01]"
              >
                <div className={`h-2 ${
                  dept.status === 'active' || dept.status === 'Active' ? 'bg-green-500' : 'bg-rose-500'
                }`}></div>
                <div className="p-6 space-y-6">
                  <div className="flex justify-between items-start gap-4">
                    <div className="min-w-0">
                      <h3 className="text-xl font-bold text-slate-900 mb-2 truncate uppercase tracking-tight" title={dept.name}>{dept.name.toUpperCase()}</h3>
                      <div className="flex flex-wrap gap-2">
                        {getStatusBadge(dept.status === 'active' || dept.status === 'Active' ? 'Active' : 'Inactive')}
                        {getEntityTag(dept.type, dept.name)}
                      </div>
                    </div>
                    <div className={`flex-shrink-0 p-3 rounded-2xl border transition-all duration-300 shadow-sm ${
                      dept.status === 'active' || dept.status === 'Active'
                        ? 'bg-emerald-50 text-emerald-600 border-emerald-100 group-hover:bg-emerald-600 group-hover:text-white'
                        : 'bg-rose-50 text-rose-600 border-rose-100 group-hover:bg-rose-600 group-hover:text-white'
                    }`}>
                      {dept.type?.toLowerCase() === 'university' && <School className="w-6 h-6" />}
                      {(dept.type?.toLowerCase() === 'branch' || dept.type?.toLowerCase() === 'center') && <Building2 className="w-6 h-6" />}
                      {(!['university', 'branch', 'center'].includes(dept.type?.toLowerCase())) && <Shield className="w-6 h-6" />}
                    </div>
                   </div>

                   <div className="space-y-2">
                    <p className="text-[10px] text-slate-400 font-bold tracking-wider px-1">Active features</p>
                    <div className="flex flex-wrap gap-2">
                        {(dept.metadata?.features || dept.features || []).map((f: any) => {
                            const id = typeof f === 'string' ? f : f.id;
                            const perms = typeof f === 'string' ? ['read'] : (f.permissions || []);
                            const permSuffix = perms.length > 0 
                                ? ` (${perms.map((p: string) => p.charAt(0).toLowerCase()).join('/')})` 
                                : '';
                            
                            return (
                                <span key={id} className="bg-slate-50 text-slate-600 text-[9px] px-2 py-0.5 rounded-lg font-bold border border-slate-100 tracking-tighter">
                                    {id}{permSuffix}
                                </span>
                            );
                        })}
                        {(dept.metadata?.features || dept.features || []).length === 0 && (
                            <span className="text-[9px] text-slate-400 font-medium ">No features provisioned</span>
                        )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 pt-4 border-t border-slate-50">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-[10px] font-bold text-blue-700">
                      {(dept.admin?.name || 'U').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold tracking-tight">Admin managed by</p>
                      <p className={`text-xs font-bold ${!dept.admin ? 'text-rose-500' : 'text-slate-700'}`}>{dept.admin?.name || 'Unassigned'}</p>
                    </div>
                  </div>

                  <div className="flex justify-end items-center gap-2 pt-2">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedDept(dept);
                        setIsModalOpen(true);
                      }}
                      className="p-2.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all hover:scale-110 active:scale-95"
                      title="Edit department"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleStatus(dept.id, dept.status);
                      }}
                      className={`p-2.5 rounded-xl transition-all hover:scale-110 active:scale-95 ${
                        dept.status === 'active' || dept.status === 'Active' 
                        ? 'bg-rose-50/50 text-slate-400 hover:text-rose-600 hover:bg-rose-100/50 hover:border-rose-200' 
                        : 'bg-green-50/50 text-slate-400 hover:text-green-600 hover:bg-green-100/50 hover:border-green-200'
                      }`}
                      title={dept.status === 'active' ? 'Deactivate' : 'Activate'}
                    >
                      <Power className="w-4 h-4" />
                    </button>
                    {dept.type === 'Custom' && (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteDept(dept.id);
                        }}
                        className="p-3 bg-slate-50/50 text-slate-400 hover:text-rose-600 hover:bg-rose-100/50 hover:border-rose-200 rounded-xl transition-all border border-slate-100 active:scale-[0.95]"
                        title="Delete department"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
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
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Department Name</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Administrator</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Governance Status</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Unit Type</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredDepts.map((dept) => (
                    <tr 
                      key={dept.id} 
                      onClick={() => {
                        setSelectedDept(dept);
                        setIsModalOpen(true);
                      }}
                      className="hover:bg-slate-50/50 transition-colors group cursor-pointer"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg border transition-all duration-300 ${
                            dept.status?.toLowerCase() === 'active'
                              ? 'bg-emerald-50 text-emerald-600 border-emerald-100 group-hover:bg-emerald-600 group-hover:text-white'
                              : 'bg-rose-50 text-rose-600 border-rose-100 group-hover:bg-rose-600 group-hover:text-white'
                          }`}>
                            {dept.type?.toLowerCase() === 'university' ? <School className="w-4 h-4" /> : <Building2 className="w-4 h-4" />}
                          </div>
                          <div className="flex flex-col">
                            <p className="font-bold text-slate-900 text-sm">{dept.name.toUpperCase()}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-xs text-slate-500 font-medium">{dept.admin?.name || 'Unassigned'}</p>
                      </td>
                      <td className="px-6 py-4">
                         {getStatusBadge(dept.status?.toLowerCase() === 'active' ? 'Active' : 'Inactive')}
                      </td>
                      <td className="px-6 py-4 text-[10px] text-slate-400 font-bold tracking-wider">
                         {getEntityTag(dept.type, dept.name)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                           <button 
                             onClick={(e) => { 
                               e.stopPropagation();
                               setSelectedDept(dept); 
                               setIsModalOpen(true); 
                             }}
                             className="p-2 text-slate-400 hover:text-blue-600"
                           ><Edit2 className="w-4 h-4" /></button>
                           <button 
                             onClick={(e) => {
                               e.stopPropagation();
                               toggleStatus(dept.id, dept.status);
                             }}
                             className="p-2 text-slate-400 hover:text-emerald-600"
                           ><Power className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <div className="bg-slate-900 rounded-3xl p-8 text-white flex flex-col md:flex-row items-center justify-between gap-8 shadow-2xl relative overflow-hidden">
        <ShieldCheck className="absolute top-0 right-0 -mr-12 -mt-12 w-48 h-48 text-white/5 rotate-12" />
        <div className="max-w-xl relative z-10">
          <h4 className="text-xl font-bold mb-3 font-display">Institutional Integrity & Continuity</h4>
          <p className="text-slate-400 text-sm leading-relaxed font-medium">
            Departments are the core building blocks of your ERP. Ensure each and every unit has a designated administrator 
            for smooth workflow execution. Deactivating a department will suspend all related dashboards while preserving 
            historical audit trails.
          </p>
        </div>
        <button 
          onClick={() => setIsPolicyModalOpen(true)}
          className="px-6 py-4 bg-white text-slate-900 font-bold rounded-2xl shadow-xl hover:scale-[1.05] transition-all relative z-10"
        >
          Governance Policy
        </button>
      </div>

      <Modal
        isOpen={isPolicyModalOpen}
        onClose={() => setIsPolicyModalOpen(false)}
        title={policy?.title || "Institutional Governance & Hierarchy"}
      >
        <div className="space-y-6">
          <div className="bg-indigo-50 border border-indigo-100 p-6 rounded-2xl">
            <h3 className="text-indigo-900 font-bold flex items-center gap-2 mb-2 text-sm uppercase tracking-wider">
              <Shield className="w-4 h-4" />
              Institutional Structure
            </h3>
            <p className="text-indigo-800 text-sm leading-relaxed">
              {policy?.description || "The institutional hierarchy enforces a strictly layered governance model. Departments are autonomous units linked to a centralized Permission Matrix that defines access levels for every role within the organization."}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(policy?.blocks || [
              { title: "Departmental Autonomy", content: "Each department operates within its provisioned data boundaries. Personnel management and resource allocation are isolated ensuring peak organizational stability." },
              { title: "Governance Matrix", content: "Structural changes are synchronized with the Master Permission Matrix. This ensures that any new department inherits the institution's standardized identity system." }
            ]).map((block: any, i: number) => (
              <div key={i} className="p-5 border border-slate-100 rounded-2xl bg-white shadow-sm">
                <h4 className="font-bold text-slate-900 mb-2 flex items-center gap-2 text-sm">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>
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
              className="bg-slate-900 text-white px-6 py-2 rounded-xl font-bold hover:bg-slate-800 transition-all text-sm"
            >
              Acknowledge Policy
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
