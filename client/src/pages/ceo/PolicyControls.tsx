import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import { Shield, Clock, Wallet, AlertTriangle, Save, RefreshCw, Zap, ShieldCheck, Lock } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

interface Policies {
  leaveSlaDays: number;
  taskSlaDays: number;
  taskEscalationGraceHours: number;
  leaveEscalationGraceHours: number;
  highValueThreshold: number;
  riskTriggers: string[];
}

export default function PolicyControls() {
  const [policies, setPolicies] = useState<Policies>({
    leaveSlaDays: 2,
    taskSlaDays: 3,
    taskEscalationGraceHours: 48,
    leaveEscalationGraceHours: 48,
    highValueThreshold: 50000,
    riskTriggers: []
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { user } = useAuthStore();

  useEffect(() => {
    fetchPolicies();
  }, []);

  const fetchPolicies = async () => {
    try {
      const res = await api.get('/ceo/policies');
      setPolicies(res.data);
    } catch (error) {
      toast.error('Failed to load governance policies');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await api.post('/ceo/policies', policies);
      toast.success('Governance policies synchronized');
    } catch (error) {
      toast.error('Failed to update policies');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  return (
    <div className="p-2 space-y-8 flex flex-col">
      <div className="max-w-4xl space-y-8 pb-20">
      
      <div className="flex items-center justify-between">
         <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Governance framework</h2>
            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mt-1">Institutional SLA & Risk Threshold Management</p>
         </div>
         {user?.role === 'CEO' || user?.role === 'Organization Admin' ? (
           <button 
             onClick={handleSave}
             disabled={saving}
             className="flex items-center gap-2 bg-slate-900 text-white px-8 py-4 rounded-2xl font-black text-sm hover:shadow-2xl hover:shadow-slate-900/40 transition-all active:scale-95 disabled:opacity-50"
           >
              {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Commit Framework
           </button>
         ) : (
           <div className="flex items-center gap-2 bg-slate-100 text-slate-400 px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest border border-slate-200">
             <Lock className="w-4 h-4" />
             Read-Only Policy Monitor
           </div>
         )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* SLA Card */}
        <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-xl shadow-slate-200/40 space-y-8 relative overflow-hidden group">
           <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-bl-[100px] -z-0"></div>
           <div className="relative z-10">
              <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white mb-6 shadow-lg shadow-blue-600/20">
                 <Clock className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">SLA Performance Thresholds</h3>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Defines critical escalation triggers</p>
           
              <div className="mt-8 space-y-6">
                 <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Leave Approval SLA (Days)</label>
                    <input 
                      type="number" 
                      value={policies.leaveSlaDays}
                      onChange={(e) => setPolicies({...policies, leaveSlaDays: parseInt(e.target.value)})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-black focus:ring-2 focus:ring-blue-600/10 outline-none"
                    />
                 </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Task Completion SLA (Days)</label>
                    <input 
                      type="number" 
                      value={policies.taskSlaDays}
                      onChange={(e) => setPolicies({...policies, taskSlaDays: parseInt(e.target.value)})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-black focus:ring-2 focus:ring-blue-600/10 outline-none"
                    />
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Task Escalation Grace (Hrs)</label>
                        <input 
                          type="number" 
                          value={policies.taskEscalationGraceHours}
                          onChange={(e) => setPolicies({...policies, taskEscalationGraceHours: parseInt(e.target.value)})}
                          className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-black focus:ring-2 focus:ring-blue-600/10 outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-[10px) font-black text-slate-400 uppercase tracking-widest mb-3">Leave Escalation Grace (Hrs)</label>
                        <input 
                          type="number" 
                          value={policies.leaveEscalationGraceHours}
                          onChange={(e) => setPolicies({...policies, leaveEscalationGraceHours: parseInt(e.target.value)})}
                          className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-black focus:ring-2 focus:ring-blue-600/10 outline-none"
                        />
                    </div>
                 </div>
              </div>
           </div>
        </div>

        {/* Risk Card */}
        <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-xl shadow-slate-200/40 space-y-8 relative overflow-hidden group">
           <div className="absolute top-0 right-0 w-32 h-32 bg-rose-50 rounded-bl-[100px] -z-0"></div>
           <div className="relative z-10">
              <div className="w-12 h-12 rounded-2xl bg-rose-600 flex items-center justify-center text-white mb-6 shadow-lg shadow-rose-600/20">
                 <Shield className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Institutional Risk Guard</h3>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Financial & Security telemetry triggers</p>
           
              <div className="mt-8 space-y-6">
                 <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">High-Value Invoice Alert (INR)</label>
                    <div className="relative">
                       <input 
                        type="number" 
                        value={policies.highValueThreshold}
                        onChange={(e) => setPolicies({...policies, highValueThreshold: parseInt(e.target.value)})}
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 pl-10 text-sm font-black focus:ring-2 focus:ring-rose-600/10 outline-none"
                       />
                       <Wallet className="absolute left-4 top-4 w-4 h-4 text-slate-400" />
                    </div>
                 </div>
                 
                 <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Active Compliance Triggers</label>
                    <div className="space-y-3">
                       {[
                         { id: 'CREDENTIAL_REVEAL', label: 'Credential Reveal Auditing', icon: ShieldCheck },
                         { id: 'OVERDUE_TASK', label: 'Delayed Task Escalation', icon: AlertTriangle },
                         { id: 'BULK_DELETE', label: 'Atomic Mutation Guard', icon: Zap }
                       ].map(trigger => (
                         <div key={trigger.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                            <div className="flex items-center gap-3">
                               <trigger.icon className="w-4 h-4 text-slate-400" />
                               <span className="text-xs font-bold text-slate-700">{trigger.label}</span>
                            </div>
                            <div className="w-8 h-4 rounded-full bg-emerald-500 flex items-center justify-end px-0.5 shadow-inner">
                               <div className="w-3 h-3 bg-white rounded-full shadow-sm" />
                            </div>
                         </div>
                       ))}
                    </div>
                 </div>
              </div>
           </div>
        </div>

      </div>

      <div className="bg-slate-900 p-10 rounded-[40px] text-white shadow-2xl relative overflow-hidden">
         <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-bl-[200px] -z-0"></div>
         <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="max-w-md">
               <h4 className="text-xl font-black mb-2">Governance Sync Active</h4>
               <p className="text-white/50 text-xs font-bold uppercase tracking-widest leading-relaxed">
                  Changes to this framework are broadcasted to all departmental governors in real-time. Policy overrides are permanently logged in the institutional audit ledger.
               </p>
            </div>
            <div className="flex items-center gap-4">
               <div className="text-right">
                  <p className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.2em]">Framework Status</p>
                  <p className="text-lg font-black">L-II Secured</p>
               </div>
               <div className="w-12 h-12 rounded-full border-4 border-emerald-500/20 flex items-center justify-center">
                  <div className="w-6 h-6 rounded-full bg-emerald-500 animate-pulse" />
               </div>
            </div>
         </div>
      </div>

    </div>
  );
}
