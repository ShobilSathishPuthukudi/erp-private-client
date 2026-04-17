import { useEffect, useState } from 'react';
import { 
  ArrowRightLeft, 
  ShieldCheck, 
  UserCog, 
  Share2, 
  Printer, 
  Download, 
  LayoutGrid, 
  List, 
  Search,
  Building2,
  Mail,
  MoreVertical,
  ChevronRight,
  Shield,
  AlertCircle
} from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { Modal } from '@/components/shared/Modal';

interface MappedRole {
  id: number;
  name: string;
  description: string;
  status: string;
  department: string;
  scopeType: string;
  scopeSubDepartment?: string | null;
  assignedUser?: {
    uid: string;
    name: string;
    email: string;
    status: string;
    avatar?: string | null;
  } | null;
}

interface CandidateEmployee {
  uid: string;
  name: string;
  email: string;
  role: string;
  avatar?: string | null;
}

export default function RoleMapping() {
  const [roles, setRoles] = useState<MappedRole[]>([]);
  const [selectedRole, setSelectedRole] = useState<MappedRole | null>(null);
  const [assignRole, setAssignRole] = useState<MappedRole | null>(null);
  const [candidates, setCandidates] = useState<CandidateEmployee[]>([]);
  const [selectedUserUid, setSelectedUserUid] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isAssigning, setIsAssigning] = useState(false);
  
  // New State for Premium UI Features
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [isPolicyModalOpen, setIsPolicyModalOpen] = useState(false);
  const [policy, setPolicy] = useState<any>(null);


  const fetchRoles = async () => {
    try {
      setIsLoading(true);
      const { data } = await api.get('/org-admin/admin-role-mappings');
      setRoles(data);
    } catch (error) {
      toast.error('Failed to load admin role mappings');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPolicy = async () => {
    try {
      const { data } = await api.get('/org-admin/config/policies');
      setPolicy(data.security_policy);
    } catch (error) {
      console.error('Failed to fetch security policy:', error);
    }
  };

  useEffect(() => {
    fetchRoles();
    fetchPolicy();
  }, []);

  const filteredRoles = roles.filter(role => 
    role.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    role.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
    role.assignedUser?.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleExportExcel = () => {
    const exportData = roles.map(role => ({
      'Role Name': role.name,
      'Department': role.department,
      'Assigned Admin': role.assignedUser?.name || 'Not Assigned',
      'Email': role.assignedUser?.email || 'N/A',
      'Status': role.status
    }));
    
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Admin Mappings");
    XLSX.writeFile(wb, "ERP_Admin_Role_Mappings.xlsx");
    toast.success('Registry exported to Excel');
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Institutional Admin Role Mappings", 14, 22);
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 30);
    
    autoTable(doc, {
      head: [['Role', 'Department', 'Admin', 'Email', 'Status']],
      body: roles.map(r => [
        r.name, 
        r.department, 
        r.assignedUser?.name || 'N/A', 
        r.assignedUser?.email || 'N/A', 
        r.status
      ]),
      startY: 40,
      theme: 'grid',
      headStyles: { fillStyle: [15, 23, 42] }
    });
    
    doc.save("ERP_Admin_Role_Mappings.pdf");
    toast.success('Registry exported to PDF');
  };

  const handlePrint = () => window.print();
  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success('Registry link copied to clipboard');
  };


  const openAssignModal = async (role: MappedRole) => {
    try {
      setAssignRole(role);
      setSelectedUserUid('');
      const { data } = await api.get(`/org-admin/admin-role-mappings/${role.id}/candidates`);
      setCandidates(data);
    } catch (error) {
      toast.error('Failed to load employees for this role');
    }
  };

  const handleAssign = async () => {
    if (!assignRole || !selectedUserUid) {
      toast.error('Select an employee to continue');
      return;
    }

    try {
      setIsAssigning(true);
      await api.post(`/org-admin/admin-role-mappings/${assignRole.id}/assign`, { userUid: selectedUserUid });
      toast.success(`${assignRole.name} mapped successfully`);
      setAssignRole(null);
      setCandidates([]);
      setSelectedUserUid('');
      fetchRoles();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to assign admin role');
    } finally {
      setIsAssigning(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-10 space-y-10 pb-32">
      {/* Premium Institutional Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-2xl shadow-slate-200/50 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50 rounded-full -mr-32 -mt-32 blur-3xl opacity-50 group-hover:bg-blue-100 transition-colors duration-700"></div>
        
        <div className="flex items-center gap-6 relative z-10">
          <div className="bg-slate-900 p-4 rounded-3xl shadow-2xl shadow-slate-900/20 transform group-hover:rotate-6 transition-transform duration-500">
            <UserCog className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight font-display">Admin Role Mapping</h1>
            <p className="text-slate-500 mt-1 max-w-xl font-medium">HR assigns department/sub-department admin panels to eligible employees. Institutional governance excluded.</p>
          </div>
        </div>

        <div className="flex items-center gap-3 relative z-10">
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
              <div className="w-48 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 cursor-pointer">
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

      <div className="space-y-6">
        {/* Shadowed Search & Controls */}
        <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white/50 backdrop-blur-sm p-2 rounded-[2rem] border border-white/50 shadow-sm">
          <div className="relative flex-1 max-w-md w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search by role, department, or admin..." 
              className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm focus:ring-2 focus:ring-slate-900 outline-none transition-all shadow-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center bg-white p-1 rounded-2xl border border-slate-200 shadow-sm gap-1">
             <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-xl transition-all cursor-pointer ${
                viewMode === 'grid' 
                  ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/20' 
                  : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-xl transition-all cursor-pointer ${
                viewMode === 'list' 
                  ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/20' 
                  : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
              }`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 bg-white rounded-[2.5rem] border border-slate-100 shadow-sm">
             <div className="w-10 h-10 border-4 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
             <p className="text-[10px] font-black text-slate-400 tracking-widest mt-4 uppercase">Syncing Role Registry...</p>
          </div>
        ) : filteredRoles.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 bg-white rounded-[2.5rem] border border-slate-200 border-dashed text-slate-400">
            <ShieldCheck className="w-12 h-12 mb-4 opacity-20" />
            <p className="font-bold">No admin role mappings found matching your search.</p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
            {filteredRoles.map((role) => (
              <div 
                key={role.id} 
                onClick={() => setSelectedRole(role)}
                className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden group transition-all duration-500 hover:shadow-2xl hover:border-slate-900/20 hover:-translate-y-2 hover:scale-[1.01] cursor-pointer"
              >
                <div className={`h-2 ${
                  role.status?.toLowerCase() === 'active' ? 'bg-emerald-500' : 'bg-rose-500'
                }`}></div>
                <div className="p-8 space-y-8">
                  <div className="flex justify-between items-start gap-4">
                    <div className="min-w-0">
                      <h3 className="text-xl font-black text-slate-900 mb-2 truncate leading-tight" title={role.name}>{role.name}</h3>
                      <div className="flex flex-wrap gap-2">
                        <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider ${
                          role.status?.toLowerCase() === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                        }`}>
                          {role.status}
                        </span>
                        <span className="text-[10px] text-slate-400 font-bold tracking-wider pt-1 uppercase">Mapped Admin</span>
                      </div>
                    </div>
                    <div className={`flex-shrink-0 p-4 rounded-3xl border transition-all duration-500 shadow-sm ${
                      role.status?.toLowerCase() === 'active'
                        ? 'bg-emerald-50 text-emerald-600 border-emerald-100 group-hover:bg-slate-900 group-hover:text-white'
                        : 'bg-rose-50 text-rose-600 border-rose-100 group-hover:bg-slate-900 group-hover:text-white'
                    }`}>
                      <ShieldCheck className="w-6 h-6" />
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 group-hover:bg-white group-hover:border-blue-100 transition-all duration-300">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600 shadow-sm">
                        <Building2 className="w-5 h-5" />
                      </div>
                      <div>
                         <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sector Pillar</p>
                         <p className="text-sm font-bold text-slate-900">{role.department}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-4 pt-6 border-t border-slate-50">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-[1.25rem] overflow-hidden bg-slate-100 border-2 border-white shadow-sm flex items-center justify-center text-slate-500 font-black">
                        {role.assignedUser?.avatar ? (
                          <img src={role.assignedUser.avatar} alt="" className="w-full h-full object-cover" />
                        ) : (
                          (role.assignedUser?.name || 'A').charAt(0).toUpperCase()
                        )}
                      </div>
                      <div>
                        <p className="text-xs font-black text-slate-900">{role.assignedUser?.name || 'Not assigned'}</p>
                        <p className="text-[10px] text-slate-400 font-bold truncate max-w-[120px]">{role.assignedUser?.email || 'Awaiting mapping'}</p>
                      </div>
                    </div>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        openAssignModal(role);
                      }}
                      className="p-3 bg-slate-900 text-white hover:bg-slate-800 rounded-xl transition-all shadow-lg shadow-slate-900/10 active:scale-95 cursor-pointer"
                      title={role.assignedUser ? 'Reassign Admin' : 'Assign Admin'}
                    >
                      <ArrowRightLeft className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-200">
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Role Identifier</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Sector Pillar</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Assigned Admin</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRoles.map((role) => (
                    <tr 
                      key={role.id} 
                      onClick={() => setSelectedRole(role)}
                      className="hover:bg-slate-50/50 transition-colors group cursor-pointer"
                    >
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-4">
                           <div className={`p-2.5 rounded-xl border transition-all duration-300 ${
                            role.status?.toLowerCase() === 'active'
                              ? 'bg-emerald-50 text-emerald-600 border-emerald-100 group-hover:bg-slate-900 group-hover:text-white'
                              : 'bg-rose-50 text-rose-600 border-rose-100 group-hover:bg-slate-900 group-hover:text-white'
                          }`}>
                            <ShieldCheck className="w-4 h-4" />
                          </div>
                          <p className="font-bold text-slate-900">{role.name}</p>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                         <div className="flex items-center gap-2">
                            <Building2 className="w-3.5 h-3.5 text-slate-400" />
                            <span className="text-sm font-medium text-slate-600">{role.department}</span>
                         </div>
                      </td>
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-3">
                           <div className="w-8 h-8 rounded-lg overflow-hidden bg-slate-100 flex items-center justify-center text-xs font-black text-slate-500">
                             {role.assignedUser?.avatar ? (
                               <img src={role.assignedUser.avatar} alt="" className="w-full h-full object-cover" />
                             ) : (
                               (role.assignedUser?.name || 'A').charAt(0).toUpperCase()
                             )}
                           </div>
                           <p className="text-sm font-bold text-slate-700">{role.assignedUser?.name || 'Not assigned'}</p>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                         <span className={`px-2.5 py-1 text-[10px] rounded-full font-black uppercase tracking-wider ${
                            role.status?.toLowerCase() === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                          }`}>
                            {role.status}
                          </span>
                      </td>
                      <td className="px-8 py-5 text-right">
                         <button 
                           onClick={(e) => {
                             e.stopPropagation();
                             openAssignModal(role);
                           }}
                           className="p-2.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all active:scale-95 cursor-pointer"
                           title={role.assignedUser ? 'Reassign' : 'Assign'}
                         >
                           <ArrowRightLeft className="w-4 h-4" />
                         </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Institutional Governance Banner */}
      <div className="bg-slate-900 rounded-[2.5rem] p-10 text-white flex flex-col md:flex-row items-center justify-between gap-10 shadow-2xl relative overflow-hidden group">
        <Shield className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 text-white/5 rotate-12 transition-transform duration-1000 group-hover:rotate-45" />
        <div className="max-w-2xl relative z-10">
          <h4 className="text-2xl font-black mb-4 tracking-tight">Institutional Infrastructure & Governance</h4>
          <p className="text-slate-400 font-medium leading-relaxed">
            Admin role mappings establish the primary lines of departmental oversight. 
            HR administrators maintain jurisdictional authority over these assignments. 
            All changes to administrative sovereignty are recorded in the immutable institutional Audit Log to protect system integrity.
          </p>
        </div>
        <button 
          onClick={() => setIsPolicyModalOpen(true)}
          className="px-8 py-4 bg-white text-slate-900 font-black rounded-2xl shadow-xl hover:scale-105 transition-all relative z-10 text-[10px] uppercase tracking-[0.2em] cursor-pointer"
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
        <div className="space-y-8">
          <div className="bg-blue-50 border border-blue-100 p-8 rounded-[2rem] cursor-pointer">
            <h3 className="text-blue-900 font-black flex items-center gap-3 mb-3 text-[10px] uppercase tracking-widest">
              <Shield className="w-5 h-5" />
              Organizational Visibility Guard
            </h3>
            <p className="text-blue-800 text-sm leading-relaxed font-medium">
              The 'Visibility Guard' is a centralized security middleware that strictly isolates departmental data. 
              Personnel registered under a core unit are restricted to their provisioned jurisdiction unless global 
              privileges are explicitly granted by the Organization Administrator.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              { title: "Jurisdictional Isolation", icon: Building2, content: "Database records are strictly filtered by deptId at the controller layer to prevent cross-sector visibility." },
              { title: "Audit Trail Registry", icon: ShieldCheck, content: "All modifications to core infrastructure units are recorded in the immutable institutional Audit Log." }
            ].map((block, i) => (
              <div key={i} className="p-6 border border-slate-100 rounded-[2rem] bg-white shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                <h4 className="font-black text-slate-900 mb-3 flex items-center gap-3 text-xs uppercase tracking-widest">
                  <div className="p-2 bg-slate-50 rounded-xl">
                    <block.icon className="w-4 h-4 text-blue-600" />
                  </div>
                  {block.title}
                </h4>
                <p className="text-xs text-slate-500 leading-relaxed font-medium">
                  {block.content}
                </p>
              </div>
            ))}
          </div>

          <div className="pt-6 border-t border-slate-100 flex justify-end">
            <button 
               onClick={() => setIsPolicyModalOpen(false)}
               className="bg-slate-900 text-white px-8 py-3 rounded-2xl font-black hover:bg-slate-800 transition-all text-[10px] uppercase tracking-[0.2em] cursor-pointer"
             >
               Acknowledge
             </button>
          </div>
        </div>
      </Modal>


      {!isLoading && roles.length === 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-8 text-sm font-medium text-slate-500">
          No seeded admin roles were found.
        </div>
      )}

      <Modal
        isOpen={!!selectedRole}
        onClose={() => setSelectedRole(null)}
        title={selectedRole?.name || 'Role Details'}
      >
        {selectedRole && (
          <div className="space-y-6">
            <div className="p-6 rounded-3xl bg-slate-50 border border-slate-100 flex items-start gap-4">
              <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-200 text-blue-600">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Institutional Pillar</p>
                <p className="text-sm font-bold text-slate-900 mt-1">{selectedRole.department}</p>
              </div>
            </div>

            <div className="p-6 rounded-3xl bg-slate-50 border border-slate-100">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Role Definition</p>
              <p className="text-sm text-slate-600 leading-relaxed font-medium">{selectedRole.description || 'Institutional administrative oversight role.'}</p>
            </div>

            <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Assigned Sovereignty</p>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl overflow-hidden bg-slate-100 border-2 border-white shadow-sm flex items-center justify-center text-slate-500 text-xl font-black">
                  {selectedRole.assignedUser?.avatar ? (
                    <img src={selectedRole.assignedUser.avatar} alt="" className="w-full h-full object-cover" />
                  ) : (
                    (selectedRole.assignedUser?.name || 'A').charAt(0).toUpperCase()
                  )}
                </div>
                <div>
                  <p className="text-base font-black text-slate-900 leading-none">{selectedRole.assignedUser?.name || 'Not assigned'}</p>
                  <div className="flex items-center gap-2 mt-2 text-slate-500">
                    <Mail className="w-3.5 h-3.5" />
                    <p className="text-xs font-medium">{selectedRole.assignedUser?.email || 'Awaiting administrative provisioning.'}</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button 
                 onClick={() => setSelectedRole(null)}
                 className="bg-slate-900 text-white px-8 py-3 rounded-2xl font-black hover:bg-slate-800 transition-all text-[10px] uppercase tracking-widest cursor-pointer"
               >
                 Close Overview
               </button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={!!assignRole}
        onClose={() => {
          setAssignRole(null);
          setCandidates([]);
          setSelectedUserUid('');
        }}
        title={assignRole ? `${assignRole.assignedUser ? 'Reassign' : 'Assign'} Institutional Admin` : 'Admin Provisioning'}
      >
        {assignRole && (
          <div className="space-y-6">
            <div className="p-6 rounded-3xl bg-slate-900 text-white relative overflow-hidden group">
              <Shield className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 text-white/5 rotate-12 transition-transform group-hover:rotate-45" />
              <div className="relative z-10">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50 mb-2">Target Registry</p>
                <h3 className="text-xl font-black tracking-tight mb-4">{assignRole.name}</h3>
                <div className="flex flex-wrap gap-4">
                  <div className="flex items-center gap-2 text-white/70">
                    <Building2 className="w-4 h-4" />
                    <span className="text-xs font-bold">{assignRole.department}</span>
                  </div>
                  <div className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest ${
                    assignRole.assignedUser ? 'bg-amber-100/20 text-amber-400' : 'bg-emerald-100/20 text-emerald-400'
                  }`}>
                    {assignRole.assignedUser ? 'Occupied Sovereignty' : 'Open Provision'}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 px-1">Select Candidate Employee</label>
              <div className="relative group/select">
                <select
                  value={selectedUserUid}
                  onChange={(event) => setSelectedUserUid(event.target.value)}
                  className="w-full pl-6 pr-12 py-5 rounded-[1.5rem] border-2 border-slate-100 bg-slate-50 text-slate-900 text-sm font-bold focus:border-blue-500 focus:bg-white transition-all outline-none appearance-none cursor-pointer"
                >
                  <option value="">Awaiting candidate selection...</option>
                  {candidates.map((candidate) => (
                    <option key={candidate.uid} value={candidate.uid}>
                      {candidate.name} — {candidate.email}
                    </option>
                  ))}
                </select>
                <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 group-hover/select:text-blue-500 transition-colors">
                  <ChevronRight className="w-5 h-5 rotate-90" />
                </div>
              </div>
              {candidates.length === 0 && (
                <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-100 rounded-2xl">
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                  <p className="text-[11px] text-amber-900 font-bold leading-none capitalize">No eligible employees found in this sector scope.</p>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                disabled={!selectedUserUid || isAssigning}
                onClick={handleAssign}
                className="w-full inline-flex items-center justify-center gap-3 px-8 py-5 rounded-[1.5rem] bg-slate-900 text-white text-xs font-black uppercase tracking-widest shadow-2xl shadow-slate-900/20 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transform hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer"
              >
                {isAssigning ? (
                  <div className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    Provisioning Admin...
                  </div>
                ) : (
                  <>
                    <ShieldCheck className="w-5 h-5" />
                    Authorize Role Assignment
                  </>
                )}
              </button>
              <button 
                onClick={() => setAssignRole(null)}
                className="w-full py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors cursor-pointer"
              >
                Cancel Provisioning
              </button>
            </div>
          </div>
        )}
      </Modal>

    </div>
  );
}
