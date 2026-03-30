import { useState, useEffect } from 'react';
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
  RotateCcw
} from 'lucide-react';

export default function PermissionMatrix() {
  const [selectedRole, setSelectedRole] = useState('Dept Admin');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [roles, setRoles] = useState<any[]>([]);

  const [permissions, setPermissions] = useState<any[]>([]);
  const [initialPermissions, setInitialPermissions] = useState<string>('');

  // Base module set for the institutional ERP
  const DEFAULT_MODULE_PAGES = [
    { module: 'Dashboard', page: 'Overview' },
    { module: 'Dashboard', page: 'Alerts' },
    { module: 'Departments', page: 'All Departments' },
    { module: 'Finance', page: 'Fee Structures' },
    { module: 'Finance', page: 'Payment Processing' },
    { module: 'HR', page: 'Employee Onboarding' },
    { module: 'Academic', page: 'Partner Universities' },
    { module: 'Sales', page: 'Lead Pipeline' }
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
      
      // If no permissions exist for this role yet, initialize with defaults
      if (data.length === 0) {
        const defaultPerms = DEFAULT_MODULE_PAGES.map((mp, idx) => ({
          id: `new-${idx}`,
          module: mp.module,
          page: mp.page,
          read: selectedRole === 'Org Admin',
          write: selectedRole === 'Org Admin',
          approve: selectedRole === 'Org Admin',
          locked: false
        }));
        setPermissions(defaultPerms);
        setInitialPermissions(JSON.stringify(defaultPerms));
      } else {
        const formattedData = data.map((p: any) => ({
          ...p,
          read: p.canRead,
          write: p.canWrite,
          approve: p.canApprove
        }));
        setPermissions(formattedData);
        setInitialPermissions(JSON.stringify(formattedData));
      }
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
              className="px-4 py-3 bg-white border-2 border-slate-200 rounded-2xl text-sm font-bold text-slate-900 outline-none focus:border-blue-600 transition-all min-w-[200px]"
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
              <h3 className="text-lg font-bold text-slate-900 font-display">Access Rights: {selectedRole}</h3>
              <p className="text-[10px] text-slate-400 font-bold tracking-wider">Modified: 2 minutes ago</p>
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
                {permissions.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-8 py-5">
                      <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full tracking-wider">
                        {p.module}
                      </span>
                    </td>
                    <td className="px-8 py-5">
                      <div className="font-bold text-slate-800 text-base tracking-tight">{p.page}</div>
                    </td>
                    <td className="px-8 py-5 text-center">
                      <button 
                        onClick={() => togglePermission(p.id, 'read')}
                        className={`w-10 h-10 rounded-full border-2 transition-all mx-auto flex items-center justify-center hover:scale-110 active:scale-95 ${
                          p.read ? 'bg-blue-600 border-blue-600 shadow-xl shadow-blue-500/40 scale-110' : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        {p.read ? <Eye className="w-5 h-5 text-white" /> : <LockIcon className="w-4 h-4 text-slate-200" />}
                      </button>
                    </td>
                    <td className="px-8 py-5 text-center">
                      <button 
                        onClick={() => togglePermission(p.id, 'write')}
                        className={`w-10 h-10 rounded-full border-2 transition-all mx-auto flex items-center justify-center ${
                          p.write ? 'bg-indigo-600 border-indigo-600 shadow-xl shadow-indigo-500/40 scale-110' : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        {p.write ? <Edit3 className="w-5 h-5 text-white" /> : <LockIcon className="w-4 h-4 text-slate-200" />}
                      </button>
                    </td>
                    <td className="px-8 py-5 text-center">
                      <button 
                        onClick={() => togglePermission(p.id, 'approve')}
                        className={`w-10 h-10 rounded-full border-2 transition-all mx-auto flex items-center justify-center hover:scale-110 active:scale-95 ${
                          p.approve ? 'bg-emerald-600 border-emerald-600 shadow-xl shadow-emerald-500/40 scale-110' : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        {p.approve ? <UserCheck className="w-5 h-5 text-white" /> : <LockIcon className="w-4 h-4 text-slate-200" />}
                      </button>
                    </td>
                    <td className="px-8 py-5 text-center text-slate-400 group-hover:text-slate-600">
                      <div className="flex items-center justify-center">
                        <LockIcon className="w-4 h-4 opacity-20" />
                      </div>
                    </td>
                  </tr>
                ))}
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
            <button className="px-6 py-3.5 bg-white/5 text-white font-bold text-sm rounded-2xl border border-white/10 hover:bg-white/10 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center min-w-[160px]">
              <RotateCcw className="w-4 h-4 mr-2" /> Reset Defaults
            </button>
            <button 
              className={`px-10 py-3.5 font-bold text-sm rounded-2xl shadow-2xl transition-all flex items-center justify-center min-w-[180px] hover:scale-[1.02] active:scale-[0.98] ${
                saving || !hasChanges 
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none' 
                  : 'bg-blue-600 text-white shadow-blue-600/40 hover:bg-blue-500 hover:scale-[1.02] active:scale-[0.98]'
              }`}
              onClick={handleSave}
              disabled={saving || !hasChanges}
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
