import { useState, useEffect } from 'react';
import { 
  Cloud, 
  Database, 
  Lock, 
  ShieldCheck, 
  Clock, 
  Settings, 
  Info,
  CheckCircle2
} from 'lucide-react';

export default function SettingsStorageConfig() {
  const [expiry, setExpiry] = useState(15);
  const [maxSize, setMaxSize] = useState(10);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStorageConfig();
  }, []);

  const fetchStorageConfig = async () => {
    try {
      const response = await fetch('/api/org-admin/config?group=Storage');
      if (!response.ok) throw new Error('Failed to fetch');
      const data = await response.json();
      data.forEach((item: any) => {
        if (item.key === 'STORAGE_EXPIRY') setExpiry(Number(item.value));
        if (item.key === 'STORAGE_MAX_SIZE') setMaxSize(Number(item.value));
      });
      setLoading(false);
    } catch (error) {
      console.error("Failed to fetch storage config", error);
      setLoading(false);
    }
  };

  const handleSaveStorage = async () => {
    try {
      const response = await fetch('/api/org-admin/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify([
          { key: 'STORAGE_EXPIRY', value: expiry.toString(), group: 'Storage' },
          { key: 'STORAGE_MAX_SIZE', value: maxSize.toString(), group: 'Storage' }
        ])
      });
      if (response.ok) window.alert('Storage Policies Updated');
    } catch (error) {
      console.error("Failed to save storage config", error);
    }
  };

  const roles = [
    { name: 'Study Center', studentDocs: true, receipts: false, employeeDocs: false },
    { name: 'Finance', studentDocs: true, receipts: true, employeeDocs: false },
    { name: 'HR', studentDocs: false, receipts: false, employeeDocs: true },
    { name: 'CEO', studentDocs: true, receipts: true, employeeDocs: true },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex justify-between items-end">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-slate-900/20">
            <Cloud className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 font-display tracking-tight">Cloud repository</h1>
            <p className="text-slate-500 mt-1 font-medium">Centralized S3 storage controller with role-based access and signed URL policies.</p>
          </div>
        </div>
        <div className="bg-indigo-600 text-white px-5 py-3 rounded-2xl font-bold text-sm shadow-xl shadow-indigo-500/20 flex items-center animate-pulse">
          <Cloud className="w-5 h-5 mr-3" />
          S3 ACTIVE: iits-erp-prod
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Storage Controller (Left) */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-slate-900 rounded-3xl p-8 text-white shadow-2xl relative overflow-hidden group">
            <Database className="absolute -top-4 -right-4 w-32 h-32 text-white/5 rotate-12 transition-transform duration-700 group-hover:scale-110" />
            <div className="relative z-10 space-y-8">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/10 rounded-2xl border border-white/20">
                  <ShieldCheck className="w-6 h-6 text-blue-400" />
                </div>
                <h3 className="text-xl font-bold font-display">Link Isolation</h3>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1 flex items-center">
                    <Clock className="w-3 h-3 mr-2" />
                    Signed URL Expiry
                  </label>
                  <div className="flex items-center gap-3">
                    <input 
                      type="number" 
                      className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 font-bold text-blue-400 w-24 outline-none focus:border-blue-500"
                      value={expiry}
                      onChange={(e) => setExpiry(Number(e.target.value))}
                    />
                    <span className="text-xs font-bold text-slate-500">Minutes</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Max File Payload</label>
                  <div className="flex items-center gap-3">
                    <input 
                      type="number" 
                      className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 font-bold text-emerald-400 w-24 outline-none focus:border-blue-500"
                      value={maxSize}
                      onChange={(e) => setMaxSize(Number(e.target.value))}
                    />
                    <span className="text-xs font-bold text-slate-500">Megabytes (MB)</span>
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <button 
                  disabled={loading}
                  onClick={handleSaveStorage}
                  className="w-full py-4 bg-white text-slate-900 font-bold rounded-2xl shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center disabled:opacity-50"
                >
                  {loading ? 'Synchronizing...' : 'Update Policies'}
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm space-y-4">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-widest">Storage Footprint</h4>
            <div className="space-y-4">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-slate-400">Total Utilization</span>
                <span className="text-slate-900">142.5 GB / 500 GB</span>
              </div>
              <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden flex">
                <div className="bg-blue-600 w-[24%]" />
                <div className="bg-indigo-400 w-[12%]" />
                <div className="bg-emerald-400 w-[8%]" />
              </div>
            </div>
          </div>
        </div>

        {/* Access Matrix (Right) */}
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-slate-900 rounded-xl shadow-lg">
                  <Lock className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 font-display">S3 Role-Based Access Pattern</h3>
              </div>
              <Settings className="w-5 h-5 text-slate-300" />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-white">
                    <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">User Group Role</th>
                    <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 text-center">Student Docs</th>
                    <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 text-center">Fee Receipts</th>
                    <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 text-center">Staff HR Docs</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {roles.map((role) => (
                    <tr key={role.name} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-8 py-6 font-bold text-slate-900 text-sm">{role.name}</td>
                      <td className="px-8 py-6">
                        <div className={`w-8 h-8 rounded-xl mx-auto flex items-center justify-center border-2 transition-all ${
                          role.studentDocs ? 'bg-blue-600 border-blue-600 text-white shadow-lg' : 'bg-white border-slate-100 text-slate-200'
                        }`}>
                          <CheckCircle2 className="w-4 h-4" />
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className={`w-8 h-8 rounded-xl mx-auto flex items-center justify-center border-2 transition-all ${
                          role.receipts ? 'bg-emerald-600 border-emerald-600 text-white shadow-lg' : 'bg-white border-slate-100 text-slate-200'
                        }`}>
                          <CheckCircle2 className="w-4 h-4" />
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className={`w-8 h-8 rounded-xl mx-auto flex items-center justify-center border-2 transition-all ${
                          role.employeeDocs ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'bg-white border-slate-100 text-slate-200'
                        }`}>
                          <CheckCircle2 className="w-4 h-4" />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-8 bg-blue-50/50 border-t border-slate-100 flex items-start gap-4 group">
              <Info className="w-6 h-6 text-blue-600 group-hover:rotate-12 transition-transform" />
              <p className="text-xs text-blue-800 font-bold leading-relaxed max-w-2xl px-1">
                Security Protocol: signed URL expiration prevents unauthorized document leaching. 
                Role access is verified at the system gateway level prior to S3 request generation. 
                All file interactions are logged in the <b>Global Audit System</b>.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
