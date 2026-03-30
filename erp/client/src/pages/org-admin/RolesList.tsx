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
  ShieldCheck
} from 'lucide-react';
import { Modal } from '@/components/shared/Modal';
import RoleCreate from './RoleCreate';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';

export default function RolesList() {
  const navigate = useNavigate();
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPolicyModalOpen, setIsPolicyModalOpen] = useState(false);
  const [policy, setPolicy] = useState<any>(null);
  const [selectedRole, setSelectedRole] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('All');

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
      toast.success(`${role.name} status updated`);
      fetchRoles();
    } catch (error) {
      toast.error('Failed to update role status');
    }
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
            <h1 className="text-2xl font-bold text-slate-900 font-display tracking-tight">Institutional Roles</h1>
            <p className="text-slate-500 mt-1">Manage standard and custom roles for the institutional hierarchy.</p>
          </div>
        </div>
        <button 
          onClick={() => {
            setSelectedRole(null);
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-blue-700 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-blue-500/20"
        >
          <Plus className="w-5 h-5" />
          Create New Role
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="relative flex-1 max-w-md w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search roles by identifier or description..." 
            className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none shadow-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-3 bg-white p-1 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-400 px-3 tracking-wider">
            <Filter className="w-3.5 h-3.5" />
            <span>Type</span>
          </div>
          <select 
            className="bg-slate-50 border-none rounded-xl px-4 py-2 text-sm font-bold outline-none focus:ring-0 text-slate-700"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
          >
            <option value="All">All Roles</option>
            <option value="Default">Default</option>
            <option value="Custom">Custom</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-64 bg-slate-100 animate-pulse rounded-3xl" />
          ))
        ) : filteredRoles.length === 0 ? (
          <div className="col-span-full py-24 flex flex-col items-center justify-center bg-white rounded-3xl border-2 border-dashed border-slate-200 text-slate-400">
            <Shield className="w-12 h-12 mb-4 opacity-20" />
            <p className="font-bold text-sm tracking-tight">No institutional roles found matching your search</p>
          </div>
        ) : (
          filteredRoles.map((role) => (
            <div key={role.id} className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden group hover:shadow-xl hover:shadow-slate-200/50 transition-all hover:translate-y-[-4px]">
              <div className={`h-2 ${
                role.status === 'active' ? 'bg-blue-600' : 'bg-slate-300'
              }`}></div>
              <div className="p-6 space-y-6">
                <div className="flex justify-between items-start gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                       <h3 className="text-lg font-bold text-slate-900 truncate" title={role.name}>{role.name}</h3>
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
                      ? 'bg-blue-50 text-blue-600 border-blue-100 group-hover:bg-blue-600 group-hover:text-white' 
                      : 'bg-slate-50 text-slate-400 border-slate-100 group-hover:bg-slate-900 group-hover:text-white'
                  }`}>
                    <Shield className="w-6 h-6" />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                      role.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {role.status.charAt(0).toUpperCase() + role.status.slice(1)}
                    </span>
                    <span className="text-[10px] text-slate-400 font-bold tracking-wider">
                       {role.isCustom ? 'Custom identity' : 'Standard logic'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => {
                      setSelectedRole(role);
                      setIsModalOpen(true);
                    }}
                    className="flex-1 py-2.5 bg-slate-50 text-slate-600 font-bold text-xs rounded-xl border border-slate-100 hover:bg-slate-100 transition-all flex items-center justify-center gap-2"
                  >
                    <Edit2 className="w-3.5 h-3.5" /> Configure
                  </button>
                  <button 
                    onClick={() => handleToggleStatus(role)}
                    className={`p-2.5 rounded-xl border transition-all active:scale-[0.95] ${
                      role.status === 'active' 
                        ? 'bg-rose-50 text-rose-600 border-rose-100 hover:bg-rose-100' 
                        : 'bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100'
                    }`}
                    title={role.status === 'active' ? 'Deactivate Role' : 'Activate Role'}
                  >
                    <Power className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="bg-slate-900 rounded-3xl p-8 text-white flex flex-col md:flex-row items-center justify-between gap-8 shadow-2xl relative overflow-hidden">
        <ShieldCheck className="absolute top-0 right-0 -mr-12 -mt-12 w-48 h-48 text-white/5 rotate-12" />
        <div className="max-w-xl relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-white/10 rounded-lg">
              <Info className="w-5 h-5 text-blue-400" />
            </div>
            <h2 className="text-xl font-bold font-display">Identity Governance Notice</h2>
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
             className="px-6 py-4 bg-white/5 text-white font-bold rounded-2xl border border-white/10 hover:bg-white/10 transition-all"
           >
             Audit Policy
           </button>
           <button 
             onClick={() => navigate('/dashboard/org-admin/permissions/matrix')}
             className="px-8 py-4 bg-blue-600 text-white font-bold rounded-2xl shadow-xl shadow-blue-600/20 hover:bg-blue-500 transition-all"
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
              className="bg-slate-900 text-white px-6 py-2 rounded-xl font-bold hover:bg-slate-800 transition-all text-sm"
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
    </div>
  );
}
