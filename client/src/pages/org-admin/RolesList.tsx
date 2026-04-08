import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  Shield, 
  Plus, 
  Edit2, 
  Power,
  Info,
  Filter,
  ShieldCheck,
  Lock,
  Download,
  LayoutGrid,
  List,
  Share2,
  Printer
} from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Modal } from '@/components/shared/Modal';
import RoleCreate from './RoleCreate';
import RoleDetails from './RoleDetails';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import { toSentenceCase } from '@/lib/utils';

export default function RolesList() {
  const navigate = useNavigate();
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isPolicyModalOpen, setIsPolicyModalOpen] = useState(false);
  const [policy, setPolicy] = useState<any>(null);
  const [selectedRole, setSelectedRole] = useState<any>(null);
  const [viewRole, setViewRole] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('All');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  useEffect(() => {
    fetchRoles();
    fetchPolicy();
  }, []);

  const fetchPolicy = async () => {
    try {
      const { data } = await api.get('/org-admin/config/policies');
      setPolicy(data.audit_policy);
    } catch (error) {
      console.error('Failed to fetch audit policy:', error);
    }
  };

  const fetchRoles = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/org-admin/roles');
      setRoles(data);
    } catch (error) {
      toast.error('Failed to fetch institutional roles');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (role: any) => {
    try {
      if (!role.isCustom && role.status === 'active') {
        toast.error('System roles cannot be deactivated');
        return;
      }

      const newStatus = role.status === 'active' ? 'inactive' : 'active';
      await api.put(`/org-admin/roles/${role.id}`, { status: newStatus });
      toast.success(`${toSentenceCase(role.name)} status updated`);
      fetchRoles();
    } catch (error) {
      toast.error('Failed to update role status');
    }
  };

  const handleAuditRole = async (roleId: number, isAudited: boolean) => {
    try {
      await api.put(`/org-admin/roles/${roleId}/audit`, { isAudited });
      toast.success(isAudited ? 'Role successfully verified' : 'Role verification revoked');
      fetchRoles();
      // Update viewRole if it matches the audited role
      if (viewRole && viewRole.id === roleId) {
        setViewRole({ ...viewRole, isAudited });
      }
    } catch (error) {
      toast.error('Failed to update audit status');
    }
  };

  const handleViewDetails = (role: any) => {
    setViewRole(role);
    setIsDetailModalOpen(true);
  };

  const handleExportExcel = () => {
    const data = roles.map(r => ({
      ID: r.id,
      'Role Name': toSentenceCase(r.name),
      'Functional Scope': r.description || 'No description',
      'Logic Class': r.isCustom ? 'Custom' : 'Pre-defined',
      'Audit Status': r.isAudited ? 'Verified' : 'Pending',
      'Admin Eligibility': r.isAdminEligible ? 'Yes' : 'No'
    }));
    
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Institutional Roles");
    XLSX.writeFile(wb, "Institutional_Role_Registry.xlsx");
    toast.success('Excel manifest generated');
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    const tableData = roles.map(r => [
      r.id,
      toSentenceCase(r.name),
      r.isCustom ? 'Custom' : 'Pre-defined',
      r.isAudited ? 'Verified' : 'Pending'
    ]);

    doc.setFontSize(18);
    doc.text('Institutional Role Registry', 14, 22);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 30);

    autoTable(doc, {
      startY: 35,
      head: [['ID', 'Identity Name', 'Logic Class', 'Audit Status']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [15, 23, 42] },
      styles: { fontSize: 8 }
    });

    doc.save("Institutional_Role_Registry.pdf");
    toast.success('PDF Registry generated');
  };

  const handlePrint = () => {
    window.print();
    toast.success('Preparing document for print');
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success('Registry link copied to clipboard');
  };

  const filteredRoles = roles.filter(role => {
    const matchesSearch = role.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (role.description || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    if (filterType === 'All') return matchesSearch;
    if (filterType === 'Default') return matchesSearch && !role.isCustom;
    if (filterType === 'Custom') return matchesSearch && !!role.isCustom;
    return matchesSearch;
  });


  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 pb-32">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-slate-900/20">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 font-display tracking-tight">Institutional roles</h1>
            <p className="text-slate-500 mt-1">Manage standard and custom roles for the institutional hierarchy.</p>
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
              title="Download/Export Role Registry"
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
              setSelectedRole(null);
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-blue-700 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-blue-500/20 group cursor-pointer"
          >
            <Plus className="w-5 h-5" />
            Create new role
          </button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="relative flex-1 max-w-md w-full group/search">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none z-10 transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover/search:text-blue-600 group-focus-within/search:text-blue-600 group-focus-within/search:left-[calc(1rem-2.5%)] group-focus-within/search:opacity-100" />
          <input 
            type="text" 
            placeholder="Search roles by identifier or description..." 
            className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm outline-none shadow-sm transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:bg-blue-50/20 hover:border-blue-100 hover:shadow-md hover:-translate-y-0.5 focus:ring-0 focus:border-blue-600 focus:w-[105%] focus:-ml-[2.5%] focus:shadow-2xl focus:shadow-blue-500/10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center bg-white p-1 rounded-2xl border border-slate-200 shadow-sm gap-1">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-400 px-3 tracking-wider">
            <Filter className="w-3.5 h-3.5" />
            <span>Type</span>
          </div>
          <select 
            className="bg-slate-50 border-none rounded-xl px-4 py-2 text-sm font-bold outline-none focus:ring-0 text-slate-700 cursor-pointer mr-2"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
          >
            <option value="All">All roles</option>
            <option value="Default">Default</option>
            <option value="Custom">Custom</option>
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-64 bg-slate-100 animate-pulse rounded-3xl" />
          ))}
        </div>
      ) : filteredRoles.length === 0 ? (
        <div className="py-24 flex flex-col items-center justify-center bg-white rounded-3xl border-2 border-dashed border-slate-200 text-slate-400">
          <Shield className="w-12 h-12 mb-4 opacity-20" />
          <p className="font-bold text-sm tracking-tight">No institutional roles found matching your search</p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRoles.map((role) => (
            <div 
              key={role.id} 
              onClick={() => handleViewDetails(role)}
              className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden group cursor-pointer transition-all duration-500 hover:shadow-2xl hover:border-blue-400/30 hover:-translate-y-2 hover:scale-[1.01]"
            >
              <div className={`h-1.5 transition-all duration-300 ${
                role.status === 'active' 
                  ? 'bg-blue-400 group-hover:bg-gradient-to-r group-hover:from-blue-600 group-hover:to-indigo-700' 
                  : 'bg-slate-400 group-hover:bg-slate-600'
              }`}></div>
              <div className="p-6 space-y-6">
                <div className="flex justify-between items-start gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                       <h3 className="text-lg font-bold text-slate-900 truncate uppercase tracking-tight" title={toSentenceCase(role.name)}>{toSentenceCase(role.name)}</h3>
                       {!role.isCustom && (
                         <span className="bg-blue-50 text-blue-600 text-[8px] font-bold px-1.5 py-0.5 rounded border border-blue-100">System</span>
                       )}
                    </div>
                    <p className="text-xs text-slate-500 line-clamp-2 min-h-[32px] font-medium leading-relaxed">
                      {role.description || "No description provided for this institutional identity."}
                    </p>
                  </div>
                  <div className={`flex-shrink-0 p-3 rounded-2xl border transition-all duration-300 ${
                    role.status === 'active' 
                      ? 'bg-blue-50 text-blue-400 border-blue-100 group-hover:bg-gradient-to-br group-hover:from-blue-600 group-hover:to-indigo-700 group-hover:text-white group-hover:shadow-md group-hover:shadow-blue-500/20' 
                      : 'bg-slate-50 text-slate-400 border-slate-100 group-hover:bg-gradient-to-br group-hover:from-slate-800 group-hover:to-slate-950 group-hover:text-white'
                  }`}>
                    <Shield className="w-6 h-6" />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                      role.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {toSentenceCase(role.status)}
                    </span>
                    <span className="text-[10px] text-slate-400 font-bold tracking-wider">
                       {role.isCustom ? 'Custom identity' : 'Pre-defined logic'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!role.isCustom) return;
                      setSelectedRole(role);
                      setIsModalOpen(true);
                    }}
                    disabled={!role.isCustom}
                    className={`flex-1 py-2.5 font-bold text-xs rounded-xl border transition-all flex items-center justify-center gap-2 ${
                      role.isCustom 
                        ? 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200' 
                        : 'bg-slate-50 text-slate-400 border-slate-100 cursor-not-allowed opacity-80'
                    }`}
                  >
                    {role.isCustom ? <Edit2 className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                    {role.isCustom ? 'Configure' : 'Locked'}
                  </button>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!role.isCustom) return;
                      handleToggleStatus(role);
                    }}
                    disabled={!role.isCustom}
                    className={`p-2.5 rounded-xl border transition-all active:scale-[0.95] ${
                      !role.isCustom
                        ? 'bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed opacity-50'
                        : role.status === 'active' 
                          ? 'bg-rose-50 text-rose-600 border-rose-100 hover:bg-rose-100' 
                          : 'bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100'
                    }`}
                    title={!role.isCustom ? 'System roles must remain active' : (role.status === 'active' ? 'Deactivate Role' : 'Activate Role')}
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
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Identity Name</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Metadata Snippet</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Governance Status</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Logic Type</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRoles.map((role) => (
                  <tr 
                    key={role.id} 
                    onClick={() => handleViewDetails(role)}
                    className="hover:bg-slate-50/50 transition-colors group cursor-pointer"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg border transition-all duration-300 ${
                          role.status === 'active' 
                            ? 'bg-blue-50 text-blue-400 border-blue-100 group-hover:bg-gradient-to-br group-hover:from-blue-600 group-hover:to-indigo-700 group-hover:text-white group-hover:shadow-sm group-hover:shadow-blue-500/10' 
                            : 'bg-slate-50 text-slate-200 border-slate-100 group-hover:bg-gradient-to-br group-hover:from-slate-800 group-hover:to-slate-950 group-hover:text-white'
                        }`}>
                          <Shield className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 text-sm uppercase tracking-tight">{toSentenceCase(role.name)}</p>
                          {!role.isCustom && <p className="text-[9px] font-black text-blue-500 uppercase tracking-tighter">System Protected</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-xs text-slate-500 font-medium truncate max-w-md">
                        {role.description || "No description provided."}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                        role.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {toSentenceCase(role.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-[10px] text-slate-400 font-bold tracking-wider">
                        {role.isCustom ? 'Custom' : 'Pre-defined'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                        <button 
                          onClick={() => {
                            if (!role.isCustom) return;
                            setSelectedRole(role);
                            setIsModalOpen(true);
                          }}
                          disabled={!role.isCustom}
                          className={`p-2 rounded-lg border transition-all ${
                            role.isCustom 
                              ? 'text-slate-400 hover:text-blue-600 hover:bg-blue-50 hover:border-blue-100' 
                              : 'text-slate-200 border-slate-50 cursor-not-allowed'
                          }`}
                          title="Configure"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => {
                            if (!role.isCustom) return;
                            handleToggleStatus(role);
                          }}
                          disabled={!role.isCustom}
                          className={`p-2 rounded-lg border transition-all ${
                            !role.isCustom
                              ? 'text-slate-200 border-slate-50 cursor-not-allowed'
                              : role.status === 'active' 
                                ? 'text-rose-400 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-100' 
                                : 'text-emerald-400 hover:text-emerald-600 hover:bg-emerald-50 hover:border-emerald-100'
                          }`}
                          title="Toggle Status"
                        >
                          <Power className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="bg-slate-900 rounded-3xl p-8 text-white flex flex-col md:flex-row items-center justify-between gap-8 shadow-2xl relative overflow-hidden">
        <ShieldCheck className="absolute top-0 right-0 -mr-12 -mt-12 w-48 h-48 text-white/5 rotate-12" />
        <div className="max-w-xl relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-white/10 rounded-lg">
              <Info className="w-5 h-5 text-blue-400" />
            </div>
            <h4 className="text-xl font-bold mb-3 font-display">Identity Governance Notice</h4>
          </div>
          <p className="text-slate-400 text-sm leading-relaxed font-medium">
            Institutional roles define the fundamental access boundaries of the system. 
            New roles created here must be mapped in the <span className="text-blue-400 font-bold">Permission Matrix</span> to 
            grant specific functional rights. Standard roles are protected from deactivation to ensure system stability.
          </p>
        </div>
        <div className="flex gap-4 relative z-10">
           <button 
             onClick={() => setIsPolicyModalOpen(true)}
             className="px-6 py-4 bg-white/10 text-white font-bold rounded-2xl border border-white/10 hover:bg-white/25 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
           >
             Audit Policy
           </button>
           <button 
             onClick={() => navigate('/dashboard/org-admin/permissions/matrix')}
             className="px-8 py-4 bg-blue-600 text-white font-bold rounded-2xl shadow-lg shadow-blue-600/15 hover:bg-blue-700 hover:scale-[1.02] hover:shadow-blue-700/30 active:scale-[0.98] transition-all cursor-pointer"
           >
             Global Access Grid
           </button>
        </div>
      </div>

      <Modal
        isOpen={isPolicyModalOpen}
        onClose={() => setIsPolicyModalOpen(false)}
        title={policy?.title || "Institutional Governance & Hierarchy"}
      >
        <div className="space-y-6">
          <div className="bg-blue-50 border border-blue-100 p-6 rounded-2xl">
            <h3 className="text-blue-900 font-bold flex items-center gap-2 mb-2 text-sm uppercase tracking-wider">
              <Shield className="w-4 h-4" />
              Governance Framework
            </h3>
            <p className="text-blue-800 text-sm leading-relaxed">
              {policy?.description || "The institutional hierarchy enforces a strictly layered governance model. Roles are mapped to a centralized Permission Matrix that defines access levels for every identity within the organization."}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(policy?.blocks || [
              { title: "Identity Isolation", content: "Roles are isolated within their technical domains. Standard system roles are immutable to ensure structural continuity." },
              { title: "Access Audit", content: "Every identity transition and permission mapping is tracked via the immutable Audit Log system for compliance." }
            ]).map((block: any, i: number) => (
              <div key={i} className="p-5 border border-slate-100 rounded-2xl bg-white shadow-sm">
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
              className="bg-slate-900 text-white px-6 py-2 rounded-xl font-bold hover:bg-slate-800 hover:scale-[1.02] active:scale-[0.98] transition-all text-sm cursor-pointer"
            >
              Acknowledge Policy
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedRole(null);
        }}
        maxWidth="xl"
        hideHeader={true}
      >
        <RoleCreate 
          initialData={selectedRole}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedRole(null);
          }}
          onSuccess={() => {
            setIsModalOpen(false);
            setSelectedRole(null);
            fetchRoles();
          }}
        />
      </Modal>

      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setViewRole(null);
        }}
        maxWidth="2xl"
        hideHeader={true}
        isTransparent={true}
      >
        <RoleDetails 
          role={viewRole}
          onClose={() => {
            setIsDetailModalOpen(false);
            setViewRole(null);
          }}
          onAudit={handleAuditRole}
        />
      </Modal>
    </div>
  );
}
