import { useState, useEffect, Fragment, useMemo } from 'react';
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
  ChevronRight,
  Plus,
  Trash2,
  Globe,
  Building2,
  Home,
  User,
  Users
} from 'lucide-react';

/**
 * ACTION_REGISTRY
 * Authoritative hierarchy of institutional flows and atomic actions.
 * Derived from institutional audit of backend route controllers.
 */
const ACTION_REGISTRY = [
  {
    id: 'gov',
    name: 'Governance',
    flows: [
      {
        id: 'gov_inst',
        name: 'Institutional Oversight',
        actions: [
          { id: 'GOV_PROVISION_EXEC', name: 'Provision Executive' },
          { id: 'GOV_POLICY_UPDATE', name: 'Update Policy' }
        ]
      }
    ]
  },
  {
    id: 'acad',
    name: 'Academic',
    flows: [
      {
        id: 'acad_prog',
        name: 'Program Lifecycle',
        actions: [
          { id: 'ACAD_UNI_SEED', name: 'Seed University' },
          { id: 'ACAD_PROG_ENG', name: 'Engineer Program' },
          { id: 'ACAD_BATCH_INIT', name: 'Initialize Batch' }
        ]
      }
    ]
  },
  {
    id: 'fin',
    name: 'Finance',
    flows: [
      {
        id: 'fin_coll',
        name: 'Collection & Ratification',
        actions: [
          { id: 'FIN_FEE_MAP', name: 'Map Fee Schema' },
          { id: 'FIN_PAY_VERIFY', name: 'Verify Payment' },
          { id: 'FIN_INV_ISSUE', name: 'Issue Invoice' }
        ]
      }
    ]
  },
  {
    id: 'hr',
    name: 'HR & Workforce',
    flows: [
      {
        id: 'hr_work',
        name: 'Workforce Management',
        actions: [
          { id: 'HR_HIRE', name: 'Hiring Registry' },
          { id: 'HR_LEAVE_S1', name: 'Phase 1 Leave Approval' },
          { id: 'HR_LEAVE_S2', name: 'Phase 2 Leave Approval' }
        ]
      }
    ]
  },
  {
    id: 'sales',
    name: 'Sales & CRM',
    flows: [
      {
        id: 'sales_acq',
        name: 'Partner Acquisition',
        actions: [
          { id: 'SALES_LEAD_CAP', name: 'Capture Lead' },
          { id: 'SALES_LEAD_QUAL', name: 'Qualify Lead' },
          { id: 'SALES_CONV', name: 'Convert Center' }
        ]
      }
    ]
  }
];

const SCOPE_OPTIONS = [
  { id: 'GLOBAL', label: 'Global', icon: Globe },
  { id: 'DEPARTMENT', label: 'Department', icon: Building2 },
  { id: 'CENTER', label: 'Center', icon: Home },
  { id: 'SELF', label: 'Self', icon: User }
];

export default function PermissionMatrix() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [roles, setRoles] = useState<any[]>([]);
  const [matrixState, setMatrixState] = useState<any>({});
  const [initialMatrix, setInitialMatrix] = useState<string>('');
  const [expandedModules, setExpandedModules] = useState<string[]>(['gov', 'acad']);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [{ data: rolesData }, { data: matrixData }] = await Promise.all([
        api.get('/org-admin/roles'),
        api.get('/org-admin/permissions/matrix/full')
      ]);

      // Remove "System" role if present
      const filteredRoles = rolesData.filter((r: any) => r.name.toLowerCase() !== 'system');
      setRoles(filteredRoles);

      // Initialize Matrix State
      const currentMatrix = matrixData?.matrix || {};
      
      // Auto-populate system roles (CEO / Org Admin) with locked full access
      filteredRoles.forEach((role: any) => {
        if (!role.isCustom) {
          const roleName = role.name;
          if (!currentMatrix[roleName]) currentMatrix[roleName] = {};
          
          if (['Organization Admin', 'CEO'].includes(roleName)) {
            // Full Access for all actions
            ACTION_REGISTRY.forEach(mod => {
              mod.flows.forEach(flow => {
                flow.actions.forEach(action => {
                  currentMatrix[roleName][action.id] = {
                    create: true,
                    read: true,
                    update: true,
                    delete: true,
                    approve: true,
                    scope: 'GLOBAL',
                    ownership: false
                  };
                });
              });
            });
          }
        }
      });

      setMatrixState(currentMatrix);
      setInitialMatrix(JSON.stringify(currentMatrix));
    } catch (error) {
      toast.error('Failed to load institutional governance ledger');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (roleName: string, actionId: string, key: string) => {
    const isLocked = roles.find(r => r.name === roleName)?.isCustom === false && 
                    ['Organization Admin', 'CEO'].includes(roleName);
    if (isLocked) return;

    setMatrixState((prev: any) => {
      const rolePerms = prev[roleName] || {};
      const actionPerms = rolePerms[actionId] || {
        create: false,
        read: false,
        update: false,
        delete: false,
        approve: false,
        scope: 'SELF',
        ownership: false
      };

      const newVal = !actionPerms[key];
      const updatedAction = { ...actionPerms, [key]: newVal };

      // Validation Guards
      if (key === 'read' && !newVal) {
        // Turning off Read turns off everything else
        updatedAction.create = false;
        updatedAction.update = false;
        updatedAction.delete = false;
        updatedAction.approve = false;
      }
      if ((key === 'approve' || key === 'create' || key === 'update' || key === 'delete') && newVal) {
        // Turning on any write/approve turns on Read
        updatedAction.read = true;
      }
      if (key === 'delete' && newVal) {
        // Turning on Delete turns on Update
        updatedAction.update = true;
      }
      if (key === 'update' && !newVal) {
        // Turning off Update turns off Delete
        updatedAction.delete = false;
      }

      return {
        ...prev,
        [roleName]: {
          ...rolePerms,
          [actionId]: updatedAction
        }
      };
    });
  };

  const handleScopeChange = (roleName: string, actionId: string, scope: string) => {
    const isLocked = roles.find(r => r.name === roleName)?.isCustom === false && 
                    ['Organization Admin', 'CEO'].includes(roleName);
    if (isLocked) return;

    setMatrixState((prev: any) => {
      const rolePerms = prev[roleName] || {};
      const actionPerms = rolePerms[actionId] || { scope: 'SELF' };
      
      const updatedAction = { 
        ...actionPerms, 
        scope,
        // If scope becomes GLOBAL, ownership must be FALSE
        ownership: scope === 'GLOBAL' ? false : actionPerms.ownership
      };

      return {
        ...prev,
        [roleName]: {
          ...rolePerms,
          [actionId]: updatedAction
        }
      };
    });
  };

  const handleOwnershipToggle = (roleName: string, actionId: string) => {
    const isLocked = roles.find(r => r.name === roleName)?.isCustom === false && 
                    ['Organization Admin', 'CEO'].includes(roleName);
    if (isLocked) return;

    setMatrixState((prev: any) => {
      const rolePerms = prev[roleName] || {};
      const actionPerms = rolePerms[actionId] || { ownership: false, scope: 'SELF' };
      
      if (actionPerms.scope === 'GLOBAL') return prev; // Cannot toggle ownership for GLOBAL scope

      const updatedAction = { ...actionPerms, ownership: !actionPerms.ownership };

      return {
        ...prev,
        [roleName]: {
          ...rolePerms,
          [actionId]: updatedAction
        }
      };
    });
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await api.post('/org-admin/permissions/matrix/update-full', { matrix: matrixState });
      setInitialMatrix(JSON.stringify(matrixState));
      toast.success('Action-level institutional permissions synchronized');
    } catch (error) {
      toast.error('Failed to persist governance configuration');
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = initialMatrix !== JSON.stringify(matrixState);

  const toggleModule = (id: string) => {
    setExpandedModules(prev => 
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="w-12 h-12 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin"></div>
        <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest animate-pulse">Reconciling Governance Registry...</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-8 pb-32">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-slate-900/20">
            <Shield className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900 font-display tracking-tight uppercase">Action Permission Matrix</h1>
            <p className="text-slate-500 text-xs font-medium mt-1">Institutional flow configuration. Map atomic actions to role jurisdictions.</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button 
            className="flex items-center gap-2 px-5 py-3 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors"
            onClick={() => setMatrixState(JSON.parse(initialMatrix))}
          >
            <RotateCcw className="w-4 h-4" /> Reset
          </button>
          <button 
            onClick={handleSave}
            disabled={!hasChanges || saving}
            className={`flex items-center gap-2 px-8 py-3.5 rounded-2xl font-bold text-sm shadow-2xl transition-all ${
              !hasChanges || saving 
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                : 'bg-blue-600 text-white shadow-blue-600/30 hover:bg-blue-700 hover:-translate-y-0.5 active:translate-y-0'
            }`}
          >
            {saving ? (
               <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : (
              <Save className="w-4 h-4" />
            )}
            Save Configuration
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="space-y-6">
        {ACTION_REGISTRY.map(module => (
          <div key={module.id} className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden transition-all duration-300">
            <button 
              onClick={() => toggleModule(module.id)}
              className={`w-full px-8 py-5 flex items-center justify-between transition-colors ${
                expandedModules.includes(module.id) ? 'bg-slate-900 text-white' : 'hover:bg-slate-50 text-slate-900'
              }`}
            >
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                   expandedModules.includes(module.id) ? 'bg-white/10' : 'bg-slate-100'
                }`}>
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                   <h3 className="text-lg font-black tracking-tight uppercase">{module.name} Module</h3>
                   <span className={`text-[10px] font-bold uppercase tracking-widest ${
                      expandedModules.includes(module.id) ? 'text-white/40' : 'text-slate-400'
                   }`}>{module.flows.length} Operational Flow{module.flows.length !== 1 ? 's' : ''}</span>
                </div>
              </div>
              {expandedModules.includes(module.id) ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
            </button>

            {expandedModules.includes(module.id) && (
              <div className="p-8 space-y-12 bg-slate-50/30">
                {module.flows.map(flow => (
                  <div key={flow.id} className="space-y-6">
                    <div className="flex items-center gap-3">
                      <div className="h-4 w-1 bg-blue-600 rounded-full"></div>
                      <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest">{flow.name}</h4>
                    </div>

                    <div className="grid grid-cols-1 gap-8">
                       {flow.actions.map(action => (
                         <div key={action.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                           <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                              <div className="flex items-center gap-3">
                                <Plus className="w-4 h-4 text-blue-600" />
                                <span className="text-xs font-black text-slate-800 uppercase tracking-tighter">{action.name}</span>
                              </div>
                              <span className="text-[10px] font-bold text-slate-400 bg-white px-3 py-1 rounded-full border border-slate-200 tracking-wider">ID: {action.id}</span>
                           </div>

                           <div className="overflow-x-auto">
                             <table className="w-full text-left border-collapse">
                               <thead>
                                 <tr className="border-b border-slate-100">
                                   <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest w-[200px]">Institutional Role</th>
                                   <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Create</th>
                                   <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Read</th>
                                   <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Update</th>
                                   <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Delete</th>
                                   <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Approve</th>
                                   <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest w-[180px]">Scope</th>
                                   <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Ownership</th>
                                 </tr>
                               </thead>
                               <tbody className="divide-y divide-slate-50">
                                 {roles.map(role => {
                                    const actionPerms = matrixState[role.name]?.[action.id] || {
                                      create: false,
                                      read: false,
                                      update: false,
                                      delete: false,
                                      approve: false,
                                      scope: 'SELF',
                                      ownership: false
                                    };

                                    const isSystemLocked = !role.isCustom && ['Organization Admin', 'CEO'].includes(role.name);

                                    return (
                                      <tr key={role.id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="px-6 py-4">
                                          <div className="flex items-center gap-3">
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                                              isSystemLocked ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500'
                                            }`}>
                                              <User className="w-4 h-4" />
                                            </div>
                                            <div className="flex flex-col">
                                              <span className="text-xs font-bold text-slate-800">{role.name}</span>
                                              {!role.isCustom && (
                                                <span className="text-[8px] font-black uppercase text-blue-600 tracking-tighter">System Role</span>
                                              )}
                                            </div>
                                          </div>
                                        </td>
                                        
                                        {/* Perm toggles */}
                                        {['create', 'read', 'update', 'delete', 'approve'].map(key => (
                                          <td key={key} className="px-6 py-4 text-center">
                                            <button 
                                              onClick={() => handleToggle(role.name, action.id, key)}
                                              disabled={isSystemLocked}
                                              className={`w-10 h-6 p-0.5 rounded-full transition-all relative ${
                                                actionPerms[key] 
                                                  ? key === 'read' ? 'bg-blue-600 shadow-md shadow-blue-500/20' : 
                                                    key === 'approve' ? 'bg-slate-900 shadow-md shadow-slate-900/20' : 
                                                    'bg-indigo-600 shadow-md shadow-indigo-500/20'
                                                  : 'bg-slate-200'
                                              } ${isSystemLocked ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:scale-105'}`}
                                            >
                                              <div className={`w-5 h-5 bg-white rounded-full transition-all shadow-sm ${
                                                actionPerms[key] ? 'translate-x-4' : 'translate-x-0'
                                              }`} />
                                            </button>
                                          </td>
                                        ))}

                                        {/* Scope Select */}
                                        <td className="px-6 py-4">
                                          <div className="flex items-center gap-2">
                                            <select 
                                              disabled={isSystemLocked}
                                              value={actionPerms.scope}
                                              onChange={(e) => handleScopeChange(role.name, action.id, e.target.value)}
                                              className={`w-full bg-slate-100 border border-slate-200 rounded-lg px-3 py-1.5 text-[10px] font-bold outline-none transition-all ${
                                                isSystemLocked ? 'opacity-50 cursor-not-allowed' : 'focus:border-blue-500 focus:bg-white cursor-pointer'
                                              }`}
                                            >
                                              {SCOPE_OPTIONS.map(opt => (
                                                <option key={opt.id} value={opt.id}>{opt.label}</option>
                                              ))}
                                            </select>
                                          </div>
                                        </td>

                                        {/* Ownership Toggle */}
                                        <td className="px-6 py-4 text-center">
                                          <button 
                                            onClick={() => handleOwnershipToggle(role.name, action.id)}
                                            disabled={isSystemLocked || actionPerms.scope === 'GLOBAL'}
                                            className={`w-6 h-6 rounded-md flex items-center justify-center transition-all border-2 ${
                                              actionPerms.ownership 
                                                ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-600/20' 
                                                : 'bg-white border-slate-200 text-slate-300'
                                            } ${isSystemLocked || actionPerms.scope === 'GLOBAL' ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer hover:border-blue-400'}`}
                                          >
                                            <UserCheck className="w-3.5 h-3.5" />
                                          </button>
                                        </td>
                                      </tr>
                                    );
                                 })}
                               </tbody>
                             </table>
                           </div>
                         </div>
                       ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Persistence Notice */}
      <div className="p-10 bg-slate-900 rounded-[2.5rem] relative overflow-hidden flex flex-col lg:flex-row justify-between items-center gap-10">
        <Shield className="absolute top-0 right-0 -mr-24 -mt-24 w-80 h-80 text-white/5 rotate-12" />
        <div className="flex items-start gap-6 relative z-10 max-w-3xl text-white">
          <div className="p-4 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20">
            <Info className="w-8 h-8 text-blue-400" />
          </div>
          <div>
            <h4 className="text-2xl font-bold mb-3 font-display">Governance Protocol Notice</h4>
            <p className="text-sm text-slate-400 font-medium leading-relaxed">
              This matrix synchronizes atomic institutional actions with role-based jurisdictions. 
              Organization Admin and CEO roles are system-managed to prevent institutional paralysis. 
              <strong>Read</strong> access is the fundamental dependency for all further actions. 
              <strong>Scope</strong> determines data isolation, while <strong>Ownership</strong> enables self-service overrides for local data.
            </p>
          </div>
        </div>
        
        <div className="flex gap-4 w-full lg:w-auto relative z-10">
           <button 
            disabled={!hasChanges || saving}
            onClick={handleSave}
            className={`px-12 py-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-2xl transition-all flex items-center justify-center min-w-[240px] ${
              !hasChanges || saving 
                ? 'bg-white/5 text-slate-500 cursor-not-allowed border border-white/10' 
                : 'bg-blue-600 text-white shadow-blue-600/40 hover:bg-blue-500 hover:scale-[1.02] active:scale-[0.98] cursor-pointer'
            }`}
           >
             {saving ? 'Synchronizing Registry...' : 'Execute Matrix Synchronization'}
           </button>
        </div>
      </div>
    </div>
  );
}
