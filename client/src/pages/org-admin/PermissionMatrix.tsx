import { useState, useEffect, Fragment } from 'react';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import { 
  Shield, 
  Lock as LockIcon,
  Eye, 
  Edit3, 
  UserCheck,
  Info,
  Save,
  RotateCcw,
  LayoutGrid,
  List
} from 'lucide-react';

const GOVERNANCE_CATEGORIES = {
  INSTITUTIONAL: 'Institutional Modules',
  GOVERNANCE: 'Governance Nodes'
} as const;

export default function PermissionMatrix() {
  const [selectedRole, setSelectedRole] = useState('Dept Admin');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [roles, setRoles] = useState<any[]>([]);

  const [permissions, setPermissions] = useState<any[]>([]);
  const [initialPermissions, setInitialPermissions] = useState<string>('');
  const [activeTab, setActiveTab] = useState<string>(GOVERNANCE_CATEGORIES.INSTITUTIONAL);
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('grid');

  // Master permission set: Institutional Modules (Core Pillars) and functional Nodes
  const DEFAULT_MODULE_PAGES = [
    // --- Category: Institutional Modules ---
    { category: GOVERNANCE_CATEGORIES.INSTITUTIONAL, module: 'Organization Admin', page: 'Master Access' },
    { category: GOVERNANCE_CATEGORIES.INSTITUTIONAL, module: 'Academic', page: 'Master Access' },
    { category: GOVERNANCE_CATEGORIES.INSTITUTIONAL, module: 'Finance', page: 'Master Access' },
    { category: GOVERNANCE_CATEGORIES.INSTITUTIONAL, module: 'HR', page: 'Master Access' },
    { category: GOVERNANCE_CATEGORIES.INSTITUTIONAL, module: 'Sales & CRM', page: 'Master Access' },
    { category: GOVERNANCE_CATEGORIES.INSTITUTIONAL, module: 'Operations', page: 'Master Access' },
    { category: GOVERNANCE_CATEGORIES.INSTITUTIONAL, module: 'Portals', page: 'Master Access' },
    { category: GOVERNANCE_CATEGORIES.INSTITUTIONAL, module: 'Assessment', page: 'Master Access' },
    { category: GOVERNANCE_CATEGORIES.INSTITUTIONAL, module: 'Accreditation', page: 'Master Access' },
    { category: GOVERNANCE_CATEGORIES.INSTITUTIONAL, module: 'Inventory & Public', page: 'Master Access' },

    // --- Category: Governance Nodes ---
    { category: GOVERNANCE_CATEGORIES.GOVERNANCE, module: 'Academic', page: 'Partner Universities' },
    { category: GOVERNANCE_CATEGORIES.GOVERNANCE, module: 'Finance', page: 'Fee Structures' },
    { category: GOVERNANCE_CATEGORIES.GOVERNANCE, module: 'Finance', page: 'Payment Processing' },
    { category: GOVERNANCE_CATEGORIES.GOVERNANCE, module: 'HR', page: 'Employee Onboarding' },
    { category: GOVERNANCE_CATEGORIES.GOVERNANCE, module: 'Sales', page: 'Lead Pipeline' },
    { category: GOVERNANCE_CATEGORIES.GOVERNANCE, module: 'Departments', page: 'All Departments' },
    { category: GOVERNANCE_CATEGORIES.GOVERNANCE, module: 'Dashboard', page: 'Overview' },
    { category: GOVERNANCE_CATEGORIES.GOVERNANCE, module: 'Dashboard', page: 'Alerts' }
  ];

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (roles.length > 0) {
      fetchPermissions();
    }
  }, [selectedRole, roles]);

  const fetchInitialData = async () => {
    try {
      const { data } = await api.get('/org-admin/roles');
      setRoles(data);
      if (data.length > 0) {
        setSelectedRole(data[0].name);
      }
    } catch (error) {
      toast.error('Failed to load institutional roles');
    }
  };

  const fetchPermissions = async () => {
    try {
      setLoading(true);
      const { data } = await api.get(`/org-admin/permissions/matrix?role=${selectedRole}`);
      
      // Mirror and Synchronize: Match database records with our authoritative DEFAULT_MODULE_PAGES
      const syncedPerms = DEFAULT_MODULE_PAGES.map((def, idx) => {
        const existing = data.find((p: any) => p.module === def.module && p.page === def.page);
        const isCustom = roles.find(r => r.name === selectedRole)?.isCustom;

        let canRead = existing?.canRead || false;
        let canWrite = existing?.canWrite || false;
        let canApprove = existing?.canApprove || false;

        // --- Institutional Authority Ledger (System Managed Overrides) ---
        if (!isCustom) {
            // Absolute Authority: Admins and Executives
            if (selectedRole === 'Organization Admin' || selectedRole === 'CEO' || selectedRole === 'Operations Admin') {
                canRead = true;
                canWrite = true;
                canApprove = true;
            }
            // Functional Authority: Finance Pillar
            else if (selectedRole === 'Finance Admin') {
                if (['Finance', 'Assessment', 'Inventory & Public'].includes(def.module)) {
                    canRead = true;
                    canWrite = true;
                    canApprove = true;
                } else {
                    canRead = true;
                }
            }
            // Functional Authority: HR Pillar
            else if (selectedRole === 'HR Admin') {
                if (['HR', 'Departments', 'Operations'].includes(def.module)) {
                    canRead = true;
                    canWrite = true;
                    canApprove = true;
                } else {
                    canRead = true;
                }
            }
            // Functional Authority: Sales Pillar
            else if (selectedRole === 'Sales & CRM Admin') {
                if (['Sales & CRM', 'Portals', 'Sales'].includes(def.module)) {
                    canRead = true;
                    canWrite = true;
                    canApprove = true;
                } else {
                    canRead = true;
                }
            }
            // Functional Authority: Academic/Unit Pillars
            else if (['BVoc Department Admin', 'Skill Department Admin', 'Open School Admin', 'Online Department Admin'].includes(selectedRole)) {
                if (['Academic', 'Portals', 'Departments', 'Accreditation'].includes(def.module)) {
                    canRead = true;
                    canWrite = true;
                    canApprove = true;
                } else {
                    canRead = true;
                }
            }
            // Operational Authority
            else if (selectedRole === 'partner-center') {
                if (['Portals', 'Academic', 'Sales'].includes(def.module)) {
                    canRead = true;
                    canWrite = true;
                } else {
                    canRead = true;
                }
            }
        }

        return {
          id: existing?.id || `new-${idx}`,
          category: def.category,
          module: def.module,
          page: def.page,
          read: canRead,
          write: canWrite,
          approve: canApprove,
          locked: !isCustom
        };
      });

      setPermissions(syncedPerms);
      setInitialPermissions(JSON.stringify(syncedPerms));
    } catch (error) {
      toast.error('Failed to fetch institutional access rights');
    } finally {
      setLoading(false);
    }
  };
  
    const handleSave = async () => {
      try {
        setSaving(true);
        const payload = {
          role: selectedRole,
          permissions: permissions.map((p: any) => ({
            module: p.module,
            page: p.page,
            canRead: p.read,
            canWrite: p.write,
            canApprove: p.approve
          }))
        };
      
      await api.post('/org-admin/permissions/matrix', payload);
      setInitialPermissions(JSON.stringify(permissions));
      toast.success(`Governance policies updated for ${selectedRole}`);
    } catch (error) {
      toast.error('Failed to persist permission matrix');
    } finally {
      setSaving(false);
    }
  };

  const togglePermission = (id: number, type: 'read' | 'write' | 'approve') => {
    setPermissions((prev: any[]) => prev.map((p: any) => {
      if (p.id === id) {
        const newVal = !p[type];
        // Validation: Cannot have Write/Approve without Read
        if (type === 'read' && !newVal) {
          return { ...p, read: false, write: false, approve: false };
        }
        if ((type === 'write' || type === 'approve') && newVal) {
          return { ...p, [type]: true, read: true };
        }
        return { ...p, [type]: newVal };
      }
      return p;
    }));
  };

  const hasChanges = initialPermissions !== JSON.stringify(permissions);

  const isLockedRole = !roles.find(r => r.name === selectedRole)?.isCustom;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 pb-32">
      <div className="flex justify-between items-end">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-slate-900/20">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 font-display tracking-tight">Master Permission Matrix</h1>
            <p className="text-slate-500 mt-1">Global access control grid. Definitive Read/Write/Approve settings per role.</p>
          </div>
        </div>
        <div className="flex gap-3">

          <div className="relative group">
            <label className="absolute -top-2 left-3 bg-white px-1 text-[10px] font-bold text-slate-400 tracking-wider z-10 pointer-events-none group-focus-within:text-blue-600 transition-colors">Configure role</label>
            <select 
              className="px-4 py-3 bg-white border-2 border-slate-200 rounded-2xl text-sm font-bold text-slate-900 outline-none focus:border-blue-600 transition-all min-w-[200px] cursor-pointer"
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
            >
              {roles.map(role => <option key={role.id} value={role.name}>{role.name}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/40 border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50">
          <div className="flex justify-between items-start mb-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-slate-900 font-display">Access Rights: {selectedRole}</h3>
                {!roles.find(r => r.name === selectedRole)?.isCustom && (
                  <span className="px-2 py-0.5 bg-slate-900 text-white text-[9px] rounded-md font-black uppercase tracking-widest flex items-center gap-1">
                    <LockIcon className="w-2.5 h-2.5" /> System Managed
                  </span>
                )}
              </div>
              <p className="text-[10px] text-slate-400 font-bold tracking-wider">Reflected from Institutional Registry</p>
            </div>

            <div className="flex items-center gap-6 pt-1.5">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-blue-100 border border-blue-200"></div>
                <span className="text-[10px] font-bold text-slate-500 tracking-tight">Read only</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-indigo-600"></div>
                <span className="text-[10px] font-bold text-slate-500 tracking-tight">Full access</span>
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center mt-4">
            <div className="bg-slate-100 p-1 rounded-2xl border border-slate-200 inline-flex items-center shadow-inner">
              {[GOVERNANCE_CATEGORIES.INSTITUTIONAL, GOVERNANCE_CATEGORIES.GOVERNANCE].map((tab) => {
                const count = permissions.filter(p => p.category === tab).length;
                return (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-8 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 min-w-[200px] cursor-pointer ${
                      activeTab === tab 
                        ? 'bg-white text-slate-900 shadow-md ring-1 ring-slate-200' 
                        : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
                    }`}
                  >
                    {tab}
                    <span className={`px-2 py-0.5 rounded-full text-[9px] ${
                      activeTab === tab ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'bg-slate-200 text-slate-500'
                    }`}>
                      {count}
                    </span>
                  </button>
                );
              })}
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
                onClick={() => setViewMode('table')}
                className={`p-2 rounded-xl transition-all cursor-pointer ${
                  viewMode === 'table' 
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' 
                    : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                }`}
                title="Table View"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto min-h-[400px]">
          {loading ? (
             <div className="flex flex-col items-center justify-center py-24 space-y-4">
                <div className="w-12 h-12 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin"></div>
                <p className="text-[10px] font-black text-blue-600 animate-pulse">Syncing governance ledger...</p>
             </div>
          ) : viewMode === 'table' ? (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white border-b border-slate-100">
                  <th className="px-8 py-5 text-[10px] font-bold text-slate-400 tracking-wider w-1/4">Module section</th>
                  <th className="px-8 py-5 text-[10px] font-bold text-slate-400 tracking-wider w-1/4">Feature page</th>
                  <th className="px-8 py-5 text-[10px] font-bold text-slate-400 tracking-wider text-center">Read</th>
                  <th className="px-8 py-5 text-[10px] font-bold text-slate-400 tracking-wider text-center">Write</th>
                  <th className="px-8 py-5 text-[10px] font-bold text-slate-400 tracking-wider text-center">Approve</th>
                  <th className="px-8 py-5 text-[10px] font-bold text-slate-400 tracking-wider text-center">Restriction</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {(() => {
                  const categoryPerms = permissions.filter(p => p.category === activeTab);
                  if (categoryPerms.length === 0) return null;

                  const modulesInCategory = Array.from(new Set(categoryPerms.map(p => p.module)));

                  return modulesInCategory.map(moduleName => {
                    const modulePerms = categoryPerms.filter(p => p.module === moduleName);
                    return (
                      <Fragment key={moduleName}>
                        {modulePerms.map((p, idx) => (
                          <tr key={p.id} className="hover:bg-slate-50/50 transition-colors group border-b border-slate-50 last:border-b-0">
                                <td className="px-8 py-5">
                                  {idx === 0 && (
                                    <div className="flex items-center gap-2">
                                      <span className="text-[10px] font-black text-slate-400 bg-slate-100 px-2.5 py-1 rounded-lg tracking-wider border border-slate-200/50 transition-all group-hover:border-blue-200 group-hover:bg-blue-50 group-hover:text-blue-600">
                                        {p.module}
                                      </span>
                                    </div>
                                  )}
                                </td>
                                <td className="px-8 py-5">
                                  <div className="flex flex-col">
                                    <span className="text-xs font-bold text-slate-800 tracking-tight">{p.page}</span>
                                    <span className="text-[9px] text-slate-400 font-medium">Standard governance node</span>
                                  </div>
                                </td>
                                <td className="px-8 py-5 text-center">
                                  <button 
                                    onClick={() => togglePermission(p.id, 'read')}
                                    disabled={p.locked}
                                    className={`w-10 h-6 p-0.5 rounded-full transition-all relative ${
                                      p.read ? 'bg-blue-600 shadow-md shadow-blue-500/30' : 'bg-slate-200'
                                    } ${p.locked ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:scale-105 active:scale-95'}`}
                                  >
                                    <div className={`w-5 h-5 bg-white rounded-full transition-all shadow-sm flex items-center justify-center ${
                                      p.read ? 'translate-x-4' : 'translate-x-0'
                                    }`}>
                                      <Eye className={`w-3 h-3 ${p.read ? 'text-blue-600' : 'text-slate-400'}`} />
                                    </div>
                                  </button>
                                </td>
                                <td className="px-8 py-5 text-center">
                                  <button 
                                    onClick={() => togglePermission(p.id, 'write')}
                                    disabled={p.locked}
                                    className={`w-10 h-6 p-0.5 rounded-full transition-all relative ${
                                      p.write ? 'bg-indigo-600 shadow-md shadow-indigo-500/30' : 'bg-slate-200'
                                    } ${p.locked ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:scale-105 active:scale-95'}`}
                                  >
                                    <div className={`w-5 h-5 bg-white rounded-full transition-all shadow-sm flex items-center justify-center ${
                                      p.write ? 'translate-x-4' : 'translate-x-0'
                                    }`}>
                                      <Edit3 className={`w-3 h-3 ${p.write ? 'text-indigo-600' : 'text-slate-400'}`} />
                                    </div>
                                  </button>
                                </td>
                                <td className="px-8 py-5 text-center">
                                  <button 
                                    onClick={() => togglePermission(p.id, 'approve')}
                                    disabled={p.locked}
                                    className={`w-10 h-6 p-0.5 rounded-full transition-all relative ${
                                      p.approve ? 'bg-slate-900 shadow-md shadow-slate-900/30' : 'bg-slate-200'
                                    } ${p.locked ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:scale-105 active:scale-95'}`}
                                  >
                                    <div className={`w-5 h-5 bg-white rounded-full transition-all shadow-sm flex items-center justify-center ${
                                      p.approve ? 'translate-x-4' : 'translate-x-0'
                                    }`}>
                                      <UserCheck className={`w-3 h-3 ${p.approve ? 'text-slate-900' : 'text-slate-400'}`} />
                                    </div>
                                  </button>
                                </td>
                                <td className="px-8 py-5 text-center">
                                  {p.locked ? (
                                    <div className="flex items-center justify-center gap-1.5 text-rose-500 bg-rose-50 px-2 py-1 rounded-md border border-rose-100 animate-pulse-slow">
                                      <LockIcon className="w-2.5 h-2.5" />
                                      <span className="text-[9px] font-black uppercase tracking-widest">Locked</span>
                                    </div>
                                  ) : (
                                    <div className="flex items-center justify-center gap-1.5 text-emerald-500 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-100">
                                      <Shield className="w-2.5 h-2.5" />
                                      <span className="text-[9px] font-black uppercase tracking-widest">Open</span>
                                    </div>
                                  )}
                                </td>
                          </tr>
                        ))}
                      </Fragment>
                    );
                  });
                })()}
              </tbody>
            </table>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-8 bg-slate-50/50">
               {(() => {
                  const categoryPerms = permissions.filter(p => p.category === activeTab);
                  if (categoryPerms.length === 0) return null;

                  const modulesInCategory = Array.from(new Set(categoryPerms.map(p => p.module)));

                  return modulesInCategory.map(moduleName => {
                    const modulePerms = categoryPerms.filter(p => p.module === moduleName);
                    return (
                      <div key={moduleName} className={`bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col transition-all duration-500 group hover:shadow-2xl hover:border-blue-400/30 hover:-translate-y-2 hover:scale-[1.01] ${
                        isLockedRole 
                          ? 'cursor-not-allowed opacity-95' 
                          : 'cursor-pointer'
                      }`}>
                        <div className={`px-5 py-4 flex justify-between items-center ${isLockedRole ? 'bg-slate-800' : 'bg-slate-900'}`}>
                           <div className="flex flex-col">
                             <h4 className="text-xs font-black text-white uppercase tracking-widest">{moduleName}</h4>
                             {isLockedRole && (
                               <div className="flex items-center gap-1 mt-0.5">
                                 <LockIcon className="w-2.5 h-2.5 text-rose-400" />
                                 <span className="text-[8px] text-rose-400 font-black uppercase tracking-tighter">Locked</span>
                               </div>
                             )}
                           </div>
                           <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${isLockedRole ? 'bg-rose-500/10 text-rose-400' : 'bg-white/10 text-white/60'}`}>
                              {modulePerms.length} Node{modulePerms.length !== 1 ? 's' : ''}
                           </span>
                        </div>
                        <div className="p-4 space-y-4 flex-1">
                           {modulePerms.map(p => (
                             <div key={p.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-3">
                                <div className="flex justify-between items-start">
                                   <div className="flex flex-col">
                                      <span className="text-xs font-bold text-slate-800">{p.page}</span>
                                      <span className="text-[9px] text-slate-400 font-medium tracking-tight">Access Control</span>
                                   </div>
                                   {p.locked && <LockIcon className="w-3 h-3 text-rose-400" />}
                                </div>
                                <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-200/50">
                                   <div className="flex flex-col items-center gap-1">
                                      <button 
                                        onClick={() => togglePermission(p.id, 'read')}
                                        disabled={p.locked}
                                        className={`w-10 h-6 p-0.5 rounded-full transition-all relative cursor-pointer ${
                                          p.read ? 'bg-blue-600' : 'bg-slate-200'
                                        } ${p.locked ? 'opacity-50 cursor-not-allowed' : 'hover:scale-110'}`}
                                      >
                                        <div className={`w-5 h-5 bg-white rounded-full transition-all shadow-sm flex items-center justify-center ${
                                          p.read ? 'translate-x-4' : 'translate-x-0'
                                        }`}>
                                          <Eye className={`w-2.5 h-2.5 ${p.read ? 'text-blue-600' : 'text-slate-400'}`} />
                                        </div>
                                      </button>
                                      <span className="text-[8px] font-black uppercase text-slate-400 tracking-tighter">Read</span>
                                   </div>
                                   <div className="flex flex-col items-center gap-1">
                                      <button 
                                        onClick={() => togglePermission(p.id, 'write')}
                                        disabled={p.locked}
                                        className={`w-10 h-6 p-0.5 rounded-full transition-all relative cursor-pointer ${
                                          p.write ? 'bg-indigo-600' : 'bg-slate-200'
                                        } ${p.locked ? 'opacity-50 cursor-not-allowed' : 'hover:scale-110'}`}
                                      >
                                        <div className={`w-5 h-5 bg-white rounded-full transition-all shadow-sm flex items-center justify-center ${
                                          p.write ? 'translate-x-4' : 'translate-x-0'
                                        }`}>
                                          <Edit3 className={`w-2.5 h-2.5 ${p.write ? 'text-indigo-600' : 'text-slate-400'}`} />
                                        </div>
                                      </button>
                                      <span className="text-[8px] font-black uppercase text-slate-400 tracking-tighter">Write</span>
                                   </div>
                                   <div className="flex flex-col items-center gap-1">
                                      <button 
                                        onClick={() => togglePermission(p.id, 'approve')}
                                        disabled={p.locked}
                                        className={`w-10 h-6 p-0.5 rounded-full transition-all relative cursor-pointer ${
                                          p.approve ? 'bg-slate-900' : 'bg-slate-200'
                                        } ${p.locked ? 'opacity-50 cursor-not-allowed' : 'hover:scale-110'}`}
                                      >
                                        <div className={`w-5 h-5 bg-white rounded-full transition-all shadow-sm flex items-center justify-center ${
                                          p.approve ? 'translate-x-4' : 'translate-x-0'
                                        }`}>
                                          <UserCheck className={`w-2.5 h-2.5 ${p.approve ? 'text-slate-900' : 'text-slate-400'}`} />
                                        </div>
                                      </button>
                                      <span className="text-[8px] font-black uppercase text-slate-400 tracking-tighter">Approve</span>
                                   </div>
                                </div>
                             </div>
                           ))}
                        </div>
                      </div>
                    );
                  });
               })()}
            </div>
          )}
        </div>

        <div className="p-8 bg-slate-900 flex flex-col lg:flex-row justify-between items-center gap-8 relative overflow-hidden">
          <Shield className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 text-white/5 rotate-12" />
          <div className="flex items-start gap-5 relative z-10 max-w-2xl">
            <div className="p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 shrink-0">
              <Info className="w-7 h-7 text-blue-400" />
            </div>
            <div>
              <h4 className="text-xl font-bold mb-3 font-display text-white">Governance Notice:</h4>
              <p className="text-xs text-slate-300 font-medium leading-relaxed">
                Default institutional roles are system-managed and cannot be edited to maintain core operational security.
                Permissions take effect immediately upon saving. Users currently logged in will see changes upon their next page navigation. 
                Write access automatically requires Read access. Approve access requires both Read and Write.
              </p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto relative z-10">
            <button className="px-6 py-3.5 bg-white/5 text-white font-bold text-sm rounded-2xl border border-white/10 hover:bg-white/10 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center min-w-[160px] cursor-pointer">
              <RotateCcw className="w-4 h-4 mr-2" /> Reset Defaults
            </button>
            <button 
              className={`px-10 py-3.5 font-bold text-sm rounded-2xl shadow-2xl transition-all flex items-center justify-center min-w-[180px] hover:scale-[1.02] active:scale-[0.98] ${
                saving || !hasChanges || !roles.find(r => r.name === selectedRole)?.isCustom
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none' 
                  : 'bg-blue-600 text-white shadow-blue-600/40 hover:bg-blue-500 hover:scale-[1.02] active:scale-[0.98] cursor-pointer'
              }`}
              onClick={handleSave}
              disabled={saving || !hasChanges || !roles.find(r => r.name === selectedRole)?.isCustom}
            >
              {saving ? (
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></span>
              ) : (
                <Save className="w-5 h-5 mr-2" />
              )}
              Save Matrix
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
