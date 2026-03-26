import { useState, useEffect } from 'react';
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
  const roles = ['Org Admin', 'CEO', 'Dept Admin', 'Sub-Dept Admin', 'Employee', 'Study Center', 'Student'];

  const [permissions, setPermissions] = useState([
    { id: 1, module: 'Dashboard', page: 'Overview', read: true, write: false, approve: false, locked: false },
    { id: 2, module: 'Dashboard', page: 'Alerts', read: true, write: true, approve: false, locked: false },
    { id: 3, module: 'Departments', page: 'All Departments', read: true, write: true, approve: true, locked: false },
    { id: 4, module: 'Finance', page: 'Fee Structures', read: true, write: true, approve: false, locked: false },
    { id: 5, module: 'Finance', page: 'Payment Processing', read: true, write: true, approve: true, locked: false },
    { id: 6, module: 'HR', page: 'Employee Onboarding', read: true, write: true, approve: false, locked: false },
    { id: 7, module: 'Academic', page: 'Partner Universities', read: true, write: false, approve: false, locked: false },
  ]);

  // Simulate fetching permissions when role changes
  useEffect(() => {
    // In a real app, you would fetch from /api/permissions?role={selectedRole}
    const randomizePermissions = () => {
      setPermissions(prev => prev.map(p => ({
        ...p,
        read: selectedRole === 'Org Admin' ? true : Math.random() > 0.3,
        write: selectedRole === 'Org Admin' ? true : Math.random() > 0.5,
        approve: selectedRole === 'Org Admin' ? true : Math.random() > 0.7
      })));
    };
    randomizePermissions();
  }, [selectedRole]);

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

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 font-display tracking-tight">Master Permission Matrix</h1>
          <p className="text-slate-500 mt-1">Global access control grid. Definitive Read/Write/Approve settings per role.</p>
        </div>
        <div className="flex gap-3">
          <div className="relative group">
            <label className="absolute -top-2 left-3 bg-white px-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest z-10 pointer-events-none group-focus-within:text-blue-600 transition-colors">Configure Role</label>
            <select 
              className="px-4 py-3 bg-white border-2 border-slate-200 rounded-2xl text-sm font-bold text-slate-900 outline-none focus:border-blue-600 transition-all min-w-[200px]"
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
            >
              {roles.map(role => <option key={role} value={role}>{role}</option>)}
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
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Modified: 2 minutes ago</p>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-blue-100 border border-blue-200"></div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">Read Only</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-indigo-600"></div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">Full Access</span>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white border-b border-slate-100">
                <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] w-1/4">Module Section</th>
                <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] w-1/4">Feature Page</th>
                <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] text-center">Read</th>
                <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] text-center">Write</th>
                <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] text-center">Approve</th>
                <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] text-center">Restriction</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {permissions.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-8 py-5">
                    <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full uppercase tracking-widest">
                      {p.module}
                    </span>
                  </td>
                  <td className="px-8 py-5">
                    <div className="font-bold text-slate-800 text-base tracking-tight">{p.page}</div>
                  </td>
                  <td className="px-8 py-5 text-center">
                    <button 
                      onClick={() => togglePermission(p.id, 'read')}
                      className={`w-10 h-10 rounded-full border-2 transition-all mx-auto flex items-center justify-center ${
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
                      className={`w-10 h-10 rounded-full border-2 transition-all mx-auto flex items-center justify-center ${
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
            <button className="px-6 py-3.5 bg-white/5 text-white font-bold text-sm rounded-2xl border border-white/10 hover:bg-white/10 transition-all flex items-center justify-center min-w-[160px]">
              <RotateCcw className="w-4 h-4 mr-2" /> Reset Defaults
            </button>
            <button 
              className="px-10 py-3.5 bg-blue-600 text-white font-bold text-sm rounded-2xl shadow-2xl shadow-blue-600/40 hover:bg-blue-500 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center min-w-[180px]"
              onClick={() => window.alert('Permissions Updated Successfully')}
            >
              <Save className="w-5 h-5 mr-2" /> Save Matrix
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
