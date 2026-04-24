import { useState, useEffect } from 'react';
import { 
  Users,
  Share2,
  Printer,
  Download,
  LayoutGrid,
  List,
  Plus,
  Search,
  Edit2,
  Shield,
  Power,
  Trash2
} from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import toast from 'react-hot-toast';
import { Modal } from '../../components/shared/Modal';
import { PageHeader } from '@/components/shared/PageHeader';
import CEOPanelCreate from './CEOPanelCreate';
import { api } from '@/lib/api';

export default function CEOPanelsList() {
  const formatScopes = (scopes: any) => {
    const raw = Array.isArray(scopes) ? scopes : (scopes || '').split(',');
    const map: Record<string, string> = {
      'Administration': 'Global(All)',
      'Operations': 'Operations & Regional',
      'Finance': 'Finance & Accounting',
      'Human Resources': 'HR & Marketing',
      'Marketing': 'HR & Marketing',
      'Sales & CRM': 'Sales intelligence',
      'Academic Operations Department': 'Academic & Enrollment',
      'Employee Performance': 'HR & Marketing'
    };
    const parsed = [...new Set(raw.filter(Boolean).map((s: string) => map[s.trim()] || s.trim()))];
    
    if (parsed.includes('Global(All)')) {
      return ['Global(All)'];
    }
    return parsed;
  };

  const [panels, setPanels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPanel, setSelectedPanel] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isPolicyModalOpen, setIsPolicyModalOpen] = useState(false);
  const [policy, setPolicy] = useState<any>(null);
  const [panelToDelete, setPanelToDelete] = useState<any>(null);

  useEffect(() => {
    fetchPanels();
    fetchPolicy();
  }, []);

  const fetchPolicy = async () => {
    try {
      const { data } = await api.get('/org-admin/config/policies');
      setPolicy(data.security_policy);
    } catch (error) {
      console.error('Failed to fetch security policy:', error);
    }
  };

  const fetchPanels = async () => {
    try {
      const { data } = await api.get('/org-admin/ceo-panels');
      setPanels(data);
      setLoading(false);
    } catch (error) {
      console.error("Failed to fetch CEO panels", error);
      setLoading(false);
    }
  };

  const handleToggleStatus = async (id: number, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'Active' ? 'Inactive' : 'Active';
      await api.put(`/org-admin/ceo-panels/${id}`, { status: newStatus });
      fetchPanels();
    } catch (error) {
      console.error("Failed to toggle status", error);
    }
  };

  const confirmDelete = async () => {
    if (!panelToDelete) return;
    try {
      await api.delete(`/org-admin/ceo-panels/${panelToDelete.id}`);
      toast.success('Executive Instance Terminated');
      fetchPanels();
      setPanelToDelete(null);
    } catch (error) {
      console.error("Failed to delete", error);
      toast.error('Failed to terminate instance');
    }
  };

  const handlePrint = () => {
    window.print();
    toast.success('Preparing executive registry for print');
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success('Registry link copied to clipboard');
  };

  const handleExportExcel = () => {
    const data = panels.map(p => ({
      ID: p.id,
      'Panel Name': p.name,
      'Executive User': p.ceoUser?.name || 'Unassigned',
      Status: p.status,
      Visibility: formatScopes(p.visibilityScope).join(', ')
    }));
    
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "CEO_Panels");
    XLSX.writeFile(wb, "Executive_Registry.xlsx");
    toast.success('Excel manifest generated');
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    const tableData = panels.map(p => [
      p.id,
      p.name,
      p.ceoUser?.name || 'Unassigned',
      p.status,
      formatScopes(p.visibilityScope).join(', ')
    ]);

    doc.setFontSize(18);
    doc.text('Institutional Executive Registry', 14, 22);
    autoTable(doc, {
      startY: 35,
      head: [['ID', 'Panel Identity', 'Executive User', 'Status', 'Visibility']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [15, 23, 42] }
    });

    doc.save("Executive_Registry.pdf");
    toast.success('PDF Registry generated');
  };

  const [searchTerm, setSearchTerm] = useState('');

  const filteredPanels = panels.filter(panel => 
    panel.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (panel.ceoUser?.name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-2 space-y-6">
      <PageHeader 
        title="Executive management"
        description="Provision and manage CEO-level administrative dashboards."
        icon={Users}
        action={
          <div className="flex items-center gap-3">
            <button 
              onClick={handleShare}
              className="p-2.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all active:scale-95 group cursor-pointer"
              title="Share registry link"
            >
              <Share2 className="w-5 h-5 group-hover:scale-110 transition-transform" />
            </button>
            <button 
              onClick={handlePrint}
              className="p-2.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all active:scale-95 group cursor-pointer"
              title="Print executive registry"
            >
              <Printer className="w-5 h-5 group-hover:scale-110 transition-transform" />
            </button>
            <div className="relative group/export">
              <button 
                className="p-2.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all active:scale-95 group cursor-pointer"
                title="Download/export registry"
              >
                <Download className="w-5 h-5 group-hover:scale-110 transition-transform" />
              </button>
              <div className="absolute right-0 top-full pt-2 hidden group-hover/export:block z-50 transition-all duration-200">
                <div className="w-48 bg-white border border-slate-200 rounded-2xl shadow-xl cursor-pointer overflow-hidden animate-in fade-in slide-in-from-top-2">
                  <button 
                    onClick={handleExportExcel}
                    className="w-full text-left px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all border-b border-slate-100 cursor-pointer"
                  >
                    Excel (.xlsx) manifest
                  </button>
                  <button 
                    onClick={handleExportPDF}
                    className="w-full text-left px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all cursor-pointer"
                  >
                    PDF (.pdf) document
                  </button>
                </div>
              </div>
            </div>
            <button 
              onClick={() => {
                setSelectedPanel(null);
                setIsModalOpen(true);
              }}
              className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-blue-700 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-blue-500/20 cursor-pointer"
            >
              <Plus className="w-5 h-5" />
              New CEO
            </button>
          </div>
        }
      />

      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedPanel(null);
        }}
        maxWidth="6xl"
        hideHeader={true}
      >
        <CEOPanelCreate 
          initialData={selectedPanel}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedPanel(null);
          }}
          onSuccess={fetchPanels}
        />
      </Modal>

      <div className="space-y-6">
        <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
          <div className="relative flex-1 max-w-md w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search by panel profile or user..." 
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
              title="Grid View"
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
              title="List View"
            >
              <List className="w-4 h-4" />
            </button>

          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-slate-100 shadow-sm">
             <div className="w-10 h-10 border-4 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
             <p className="text-[10px] font-bold text-slate-400 tracking-wider mt-4">Provisioning executive interfaces...</p>
          </div>
        ) : filteredPanels.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-slate-200 border-dashed text-slate-400">
            No CEO panels found matching your search.
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPanels.map((panel) => (
              <div 
                key={panel.id} 
                onClick={() => {
                  setSelectedPanel(panel);
                  setIsModalOpen(true);
                }}
                className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden group cursor-pointer transition-all duration-500 hover:shadow-2xl hover:border-blue-400/30 hover:-translate-y-2 hover:scale-[1.01]"
              >
                <div className={`h-2 ${
                  panel.status?.toLowerCase() === 'active' ? 'bg-green-500' : 'bg-rose-500'
                }`}></div>
                <div className="p-6 space-y-6">
                  <div className="flex justify-between items-start gap-4">
                    <div className="min-w-0">
                      <h3 className="text-xl font-bold text-slate-900 mb-2 truncate" title={panel.name}>{panel.name}</h3>
                      <div className="flex flex-wrap gap-2">
                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap ${
                          panel.status?.toLowerCase() === 'active' ? 'bg-green-100 text-green-700' : 'bg-rose-100 text-rose-700'
                        }`}>
                          {panel.status}
                        </span>
                        <span className="text-[10px] text-slate-400 font-bold tracking-wider pt-1 whitespace-nowrap">CEO oversight</span>
                      </div>
                    </div>
                    <div className={`flex-shrink-0 p-3 rounded-2xl border transition-all duration-300 shadow-sm ${
                      panel.status?.toLowerCase() === 'active'
                        ? 'bg-emerald-50 text-emerald-600 border-emerald-100 group-hover:bg-emerald-600 group-hover:text-white'
                        : 'bg-rose-50 text-rose-600 border-rose-100 group-hover:bg-rose-600 group-hover:text-white'
                    }`}>
                      <Shield className="w-6 h-6" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-[10px] text-slate-400 font-bold tracking-wider px-1">Visibility scope</p>
                    <div className="flex flex-wrap gap-2">
                      {formatScopes(panel.visibilityScope).map((s: string) => (
                        <span key={s} className="bg-slate-100 text-slate-600 text-[10px] px-2.5 py-1 rounded-lg font-bold border border-slate-200/50">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 pt-4 border-t border-slate-50">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-[10px] font-bold text-blue-700">
                      {(panel.ceoUser?.name || 'U').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold tracking-tight">Profile assigned to</p>
                      <p className="text-xs font-bold text-slate-700">@{panel.ceoUser?.name || 'Unknown'}</p>
                    </div>
                  </div>

                  <div className="flex justify-end items-center gap-2 pt-2">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedPanel(panel);
                        setIsModalOpen(true);
                      }}
                      className="p-3 bg-slate-50/50 text-slate-400 hover:text-slate-900 hover:bg-slate-100/50 hover:border-slate-200 rounded-xl transition-all border border-slate-100 hover:scale-110 active:scale-95 cursor-pointer"
                      title="Edit Panel"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>

                    <button 
                       onClick={(e) => {
                         e.stopPropagation();
                         setPanelToDelete(panel);
                       }}
                       className="p-3 bg-slate-50/50 text-slate-400 hover:text-rose-600 hover:bg-rose-100/50 hover:border-rose-200 rounded-xl transition-all border border-slate-100 active:scale-[0.95] cursor-pointer"
                       title="Delete Panel"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleStatus(panel.id, panel.status);
                      }}
                      className={`p-3 rounded-xl transition-all border border-slate-100 active:scale-[0.95] ${
                        panel.status?.toLowerCase() === 'active' 
                        ? 'bg-rose-50/50 text-slate-400 hover:text-rose-600 hover:bg-rose-100/50 hover:border-rose-200' 
                        : 'bg-green-50/50 text-slate-400 hover:text-green-600 hover:bg-green-100/50 hover:border-green-200'
                      }`}
                      title={panel.status?.toLowerCase() === 'active' ? 'Disable Access' : 'Enable Access'}
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
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Executive Name</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Assigned User</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Visibility Scope</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Operational Status</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                   {filteredPanels.map((panel) => (
                    <tr 
                      key={panel.id} 
                      onClick={() => {
                        setSelectedPanel(panel);
                        setIsModalOpen(true);
                      }}
                      className="hover:bg-slate-50/50 transition-colors group cursor-pointer"
                    >

                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                           <div className={`p-2 rounded-lg border transition-all duration-300 ${
                            panel.status?.toLowerCase() === 'active'
                              ? 'bg-emerald-50 text-emerald-600 border-emerald-100 group-hover:bg-emerald-600 group-hover:text-white'
                              : 'bg-rose-50 text-rose-600 border-rose-100 group-hover:bg-rose-600 group-hover:text-white'
                          }`}>
                            <Shield className="w-4 h-4" />
                          </div>
                          <p className="font-bold text-slate-900 text-sm">{panel.name}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs font-bold text-slate-600">
                         @{panel.ceoUser?.name || 'Unknown'}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {formatScopes(panel.visibilityScope).slice(0, 3).map((s: string) => (
                            <span key={s} className="bg-slate-100 text-slate-600 text-[9px] px-2 py-0.5 rounded font-bold">
                              {s}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                         <span className={`px-2.5 py-1 text-[10px] rounded-full font-bold uppercase tracking-tight ${
                            panel.status?.toLowerCase() === 'active' ? 'bg-green-100 text-green-700' : 'bg-rose-100 text-rose-700'
                          }`}>
                            {panel.status}
                          </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                         <div className="flex items-center justify-end gap-2">
                           <button 
                             onClick={(e) => { 
                               e.stopPropagation();
                               setSelectedPanel(panel); 
                               setIsModalOpen(true); 
                             }} 
                             className="p-2 text-slate-400 hover:text-blue-600 transition-colors cursor-pointer"
                           ><Edit2 className="w-4 h-4" /></button>
                           <button 
                             onClick={(e) => {
                               e.stopPropagation();
                               handleToggleStatus(panel.id, panel.status);
                             }} 
                             className="p-2 text-slate-400 hover:text-emerald-600 transition-colors cursor-pointer"
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
        <Shield className="absolute top-0 right-0 -mr-12 -mt-12 w-48 h-48 text-white/5 rotate-12" />
        <div className="max-w-xl relative z-10">
          <h4 className="text-xl font-bold mb-3 font-display">Executive Governance & Oversight</h4>
          <p className="text-slate-400 text-sm leading-relaxed font-medium">
            CEO Panels provide a centralized view of performance across multiple departments. 
            Ensure each executive has the appropriate visibility scope to facilitate data-driven 
            decision making while maintaining strict departmental boundaries.
          </p>
        </div>
        <button 
          onClick={() => setIsPolicyModalOpen(true)}
          className="px-6 py-4 bg-white text-slate-900 font-bold rounded-2xl shadow-xl cursor-pointer hover:scale-[1.05] transition-all relative z-10 cursor-pointer"
        >
          Security Policy
        </button>

      </div>

      <Modal
        isOpen={isPolicyModalOpen}
        onClose={() => setIsPolicyModalOpen(false)}
        title={policy?.title || "Executive Security & Data Boundaries"}
      >
        <div className="space-y-6">
          <div className="bg-blue-50 border border-blue-100 p-6 rounded-2xl cursor-pointer">
            <h3 className="text-blue-900 font-bold flex items-center gap-2 mb-2 text-sm uppercase tracking-wider">
              <Shield className="w-4 h-4" />
              Institutional Visibility Guard
            </h3>
            <p className="text-blue-800 text-sm leading-relaxed">
              {policy?.description || "The 'Visibility Guard' is a centralized security middleware that strictly isolates executive data. No CEO can view student records, financial metrics, or performance scorecards outside their provisioned scope."}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(policy?.blocks || [
              { title: "Departmental Isolation", content: "Database queries are dynamically patched with categorical filters mapped to the executive's Initial Visibility Scope." },
              { title: "Audit Integrity", content: "Every attempt to access or modify visibility configurations is recorded in the immutable Audit Log." }
            ]).map((block: any, i: number) => (
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
              className="bg-slate-900 text-white px-6 py-2 rounded-xl font-bold hover:bg-slate-800 transition-all text-sm cursor-pointer"
            >
              Acknowledge Policy
            </button>

          </div>
        </div>
      </Modal>

      <Modal
        isOpen={!!panelToDelete}
        onClose={() => setPanelToDelete(null)}
        title="Confirm Termination"
      >
        <div className="space-y-6">
          <div className="bg-rose-50 border border-rose-100 p-6 rounded-2xl cursor-pointer">
              <h3 className="text-rose-900 font-bold flex items-center gap-2 mb-2 text-sm uppercase tracking-wider">
                <Trash2 className="w-4 h-4" />
                Permanent Deletion
              </h3>
              <p className="text-rose-800 text-sm leading-relaxed">
                Are you sure you want to permanently delete the executive panel <strong>{panelToDelete?.name}</strong>? This will destroy all dashboard configurations for <strong>@{panelToDelete?.ceoUser?.name || 'Unknown'}</strong>. This action cannot be reversed.
              </p>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
             <button 
               onClick={() => setPanelToDelete(null)}
               className="px-6 py-2.5 bg-white text-slate-600 border border-slate-200 rounded-xl font-bold hover:bg-slate-50 transition-all text-sm"
             >
               Cancel
             </button>
             <button 
               onClick={confirmDelete}
               className="px-6 py-2.5 bg-rose-600 text-white rounded-xl font-bold hover:bg-rose-700 hover:scale-105 active:scale-95 transition-all shadow-lg shadow-rose-500/20 text-sm flex items-center gap-2"
             >
               <Trash2 className="w-4 h-4" />
               Confirm Termination
             </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
