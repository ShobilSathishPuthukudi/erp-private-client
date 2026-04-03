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
  ChevronDown,
  ChevronRight
} from 'lucide-react';

export default function PermissionMatrix() {
  const [selectedRole, setSelectedRole] = useState('Dept Admin');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [roles, setRoles] = useState<any[]>([]);

  const [permissions, setPermissions] = useState<any[]>([]);
  const [initialPermissions, setInitialPermissions] = useState<string>('');
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);

  // Master permission set: Institutional Modules (Core Pillars) and functional Nodes
  const DEFAULT_MODULE_PAGES = [
    // --- Category: Institutional Modules ---
    { category: 'Institutional Modules', module: 'Organization Admin', page: 'Master Access' },
    { category: 'Institutional Modules', module: 'Academic', page: 'Master Access' },
    { category: 'Institutional Modules', module: 'Finance', page: 'Master Access' },
    { category: 'Institutional Modules', module: 'HR', page: 'Master Access' },
    { category: 'Institutional Modules', module: 'Sales & CRM', page: 'Master Access' },
    { category: 'Institutional Modules', module: 'Operations', page: 'Master Access' },
    { category: 'Institutional Modules', module: 'Portals', page: 'Master Access' },
    { category: 'Institutional Modules', module: 'Assessment', page: 'Master Access' },
    { category: 'Institutional Modules', module: 'Accreditation', page: 'Master Access' },
    { category: 'Institutional Modules', module: 'Inventory & Public', page: 'Master Access' },

    // --- Category: Governance Permission Nodes ---
    { category: 'Governance Permission Nodes', module: 'Academic', page: 'Partner Universities' },
    { category: 'Governance Permission Nodes', module: 'Finance', page: 'Fee Structures' },
    { category: 'Governance Permission Nodes', module: 'Finance', page: 'Payment Processing' },
    { category: 'Governance Permission Nodes', module: 'HR', page: 'Employee Onboarding' },
    { category: 'Governance Permission Nodes', module: 'Sales', page: 'Lead Pipeline' },
    { category: 'Governance Permission Nodes', module: 'Departments', page: 'All Departments' },
    { category: 'Governance Permission Nodes', module: 'Dashboard', page: 'Overview' },
    { category: 'Governance Permission Nodes', module: 'Dashboard', page: 'Alerts' }
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
            else if (selectedRole === 'study-center') {
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
  
  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category) 
        : [...prev, category]
    );
  };

  const hasChanges = initialPermissions !== JSON.stringify(permissions);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
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
        <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-slate-900 p-2.5 rounded-xl shadow-lg">
              <Shield className="w-5 h-5 text-white" />
            </div>
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
          </div>
          <div className="flex items-center gap-6">
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

        <div className="overflow-x-auto min-h-[400px]">
          {loading ? (
             <div className="flex flex-col items-center justify-center py-24 space-y-4">
                <div className="w-12 h-12 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin"></div>
                <p className="text-[10px] font-black text-blue-600 animate-pulse">Syncing governance ledger...</p>
             </div>
          ) : (
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
                {['Institutional Modules', 'Governance Permission Nodes'].map((category) => {
                  const categoryPerms = permissions.filter(p => p.category === category);
                  if (categoryPerms.length === 0) return null;

                  // Group by module within category
                  const modulesInCategory = Array.from(new Set(categoryPerms.map(p => p.module)));

                  return (
                    <Fragment key={category}>
                      <tr className="bg-slate-50/80 sticky top-0 z-20 group/cat cursor-pointer select-none" onClick={() => toggleCategory(category)}>
                        <td colSpan={6} className="px-8 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-6 h-6 flex items-center justify-center rounded-lg bg-white border border-slate-200 group-hover/cat:border-blue-400 group-hover/cat:text-blue-600 transition-all shadow-sm">
                              {expandedCategories.includes(category) ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                            </div>
                            <div className={`w-2 h-2 rounded-full ${category === 'Institutional Modules' ? 'bg-blue-600' : 'bg-emerald-600'}`}></div>
                            <span className="text-[11px] font-black text-slate-600 uppercase tracking-[0.25em]">
                              {category}
                            </span>
                            <div className="h-px flex-1 bg-slate-200/60 ml-2"></div>
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest px-3 py-1 bg-white/50 rounded-full border border-slate-100">
                              {categoryPerms.length} nodes
                            </span>
                          </div>
                        </td>
                      </tr>
                      {expandedCategories.includes(category) && modulesInCategory.map(moduleName => {
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
                                  <div className="font-bold text-slate-800 text-sm lg:text-base tracking-tight">{p.page}</div>
                                  {p.page === 'Master Access' && (
                                    <p className="text-[9px] text-blue-500 font-bold uppercase tracking-tighter mt-0.5">Primary Pillar Authorization</p>
                                  )}
                                </td>
                                <td className="px-8 py-5 text-center">
                                  <button 
                                    onClick={() => togglePermission(p.id, 'read')}
                                    disabled={!roles.find(r => r.name === selectedRole)?.isCustom}
                                    className={`w-10 h-10 rounded-full border-2 transition-all mx-auto flex items-center justify-center hover:scale-110 active:scale-95 cursor-pointer ${
                                      p.read ? 'bg-blue-600 border-blue-600 shadow-xl shadow-blue-500/40' : 'bg-white border-slate-200 hover:border-slate-300'
                                    } disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100`}
                                  >
                                    {p.read ? <Eye className="w-5 h-5 text-white" /> : <LockIcon className="w-4 h-4 text-slate-200" />}
                                  </button>
                                </td>
                                <td className="px-8 py-5 text-center">
                                  <button 
                                    onClick={() => togglePermission(p.id, 'write')}
                                    disabled={!roles.find(r => r.name === selectedRole)?.isCustom}
                                    className={`w-10 h-10 rounded-full border-2 transition-all mx-auto flex items-center justify-center hover:scale-110 active:scale-95 cursor-pointer ${
                                      p.write ? 'bg-indigo-600 border-indigo-600 shadow-xl shadow-indigo-500/40' : 'bg-white border-slate-200 hover:border-slate-300'
                                    } disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100`}
                                  >
                                    {p.write ? <Edit3 className="w-5 h-5 text-white" /> : <LockIcon className="w-4 h-4 text-slate-200" />}
                                  </button>
                                </td>
                                <td className="px-8 py-5 text-center">
                                  <button 
                                    onClick={() => togglePermission(p.id, 'approve')}
                                    disabled={!roles.find(r => r.name === selectedRole)?.isCustom}
                                    className={`w-10 h-10 rounded-full border-2 transition-all mx-auto flex items-center justify-center hover:scale-110 active:scale-95 cursor-pointer ${
                                      p.approve ? 'bg-emerald-600 border-emerald-600 shadow-xl shadow-emerald-500/40' : 'bg-white border-slate-200 hover:border-slate-300'
                                    } disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100`}
                                  >
                                    {p.approve ? <UserCheck className="w-5 h-5 text-white" /> : <LockIcon className="w-4 h-4 text-slate-200" />}
                                  </button>
                                </td>
                                <td className="px-8 py-5 text-center">
                                  <div className="flex items-center justify-center text-[10px] font-bold">
                                    {!roles.find(r => r.name === selectedRole)?.isCustom ? (
                                      <span className="flex items-center gap-1.5 text-slate-400 bg-slate-100 px-2.5 py-1 rounded-lg">
                                        <LockIcon className="w-3 h-3" /> Static
                                      </span>
                                    ) : (
                                      <span className="text-blue-500 bg-blue-50 px-2.5 py-1 rounded-lg">Customizable</span>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </Fragment>
                        );
                      })}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <div className="p-8 bg-slate-900 flex flex-col lg:flex-row justify-between items-center gap-8 relative overflow-hidden">
          <Shield className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 text-white/5 rotate-12" />
          <div className="flex items-start gap-5 relative z-10 max-w-2xl">
            <div className="p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 shrink-0">
              <Info className="w-7 h-7 text-blue-400" />
            </div>
            <div>
              <p className="text-xs text-slate-300 font-medium leading-relaxed">
                <span className="text-white font-bold block mb-1">Governance Notice:</span>
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
