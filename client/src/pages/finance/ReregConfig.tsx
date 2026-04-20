import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import { Settings, ShieldCheck } from 'lucide-react';

export default function ReregConfig() {
  const [configs, setConfigs] = useState<any[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    programId: '',
    deadline: '',
    autoApprovalThreshold: 0,
    escalationDays: 7
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [res, progRes] = await Promise.all([
        api.get('/rereg/config/all'), // Specific admin route
        api.get('/academic/programs')
      ]);
      setConfigs(res.data);
      setPrograms(progRes.data);
    } catch (error) {
       console.error('Config fetch failed');
    } finally {
      setLoading(false);
    }
  };

  const today = new Date().toISOString().split('T')[0];

  const isFormValid =
    !!formData.programId &&
    !!formData.deadline &&
    formData.deadline >= today &&
    Number.isFinite(formData.autoApprovalThreshold) &&
    formData.autoApprovalThreshold >= 0 &&
    Number.isFinite(formData.escalationDays) &&
    formData.escalationDays >= 1;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) {
      toast.error('Please complete all required fields');
      return;
    }
    try {
      await api.post('/rereg/config', formData);
      toast.success('REREG profile deployed');
      setFormData({ programId: '', deadline: '', autoApprovalThreshold: 0, escalationDays: 7 });
      fetchData();
    } catch (error) {
      toast.error('Failed to deploy config');
    }
  };

  if (loading) return <div className="animate-pulse h-64 bg-slate-50 rounded-2xl" />;

  return (
    <div className="space-y-6">
      <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6">
        <div>
           <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-3 tracking-tight">
              <Settings className="w-7 h-7 text-blue-600" />
              Re-Registration Configuration
           </h2>
           <p className="text-slate-500 mt-1">Configure institutional billing cycles, deadlines, and auto-approval thresholds.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
         <div className="lg:col-span-1 bg-white border border-slate-200 rounded-[32px] p-8 shadow-sm h-fit">
            <h3 className="font-black text-slate-900 uppercase tracking-tighter mb-6">Create Cycle Profile</h3>
            <form onSubmit={handleSave} className="space-y-6">
               <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Target Program <span className="text-rose-500">*</span></label>
                  <select
                    required
                    className="w-full bg-slate-50 border-transparent rounded-xl px-4 py-3 text-sm focus:bg-white"
                    value={formData.programId}
                    onChange={(e) => setFormData({ ...formData, programId: e.target.value })}
                  >
                     <option value="">Select Institutional Program</option>
                     {programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
               </div>
               <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">REREG Deadline <span className="text-rose-500">*</span></label>
                  <input
                    type="date"
                    required
                    min={today}
                    className="w-full bg-slate-50 border-transparent rounded-xl px-4 py-3 text-sm focus:bg-white"
                    value={formData.deadline}
                    onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                  />
               </div>
               <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Auto-Approval Threshold (₹) <span className="text-rose-500">*</span></label>
                  <input
                    type="number"
                    required
                    min={0}
                    step="0.01"
                    className="w-full bg-slate-50 border-transparent rounded-xl px-4 py-3 text-sm focus:bg-white"
                    value={Number.isFinite(formData.autoApprovalThreshold) ? formData.autoApprovalThreshold : ''}
                    onChange={(e) => {
                      const v = e.target.value;
                      setFormData({ ...formData, autoApprovalThreshold: v === '' ? NaN : parseFloat(v) });
                    }}
                  />
               </div>
               <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Escalation Window (Days) <span className="text-rose-500">*</span></label>
                  <input
                    type="number"
                    required
                    min={1}
                    step="1"
                    className="w-full bg-slate-50 border-transparent rounded-xl px-4 py-3 text-sm focus:bg-white"
                    value={Number.isFinite(formData.escalationDays) ? formData.escalationDays : ''}
                    onChange={(e) => {
                      const v = e.target.value;
                      setFormData({ ...formData, escalationDays: v === '' ? NaN : parseInt(v, 10) });
                    }}
                  />
               </div>
               <button
                 type="submit"
                 disabled={!isFormValid}
                 className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black uppercase tracking-widest disabled:bg-slate-300 disabled:cursor-not-allowed"
               >
                 Deploy Cycle Profile
               </button>
            </form>
         </div>

         <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
            {configs.map((c, idx) => (
              <div key={idx} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:border-blue-200 transition-all">
                 <div className="flex justify-between items-start mb-4">
                    <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                       <ShieldCheck className="w-5 h-5" />
                    </div>
                    {c.isActive && <span className="bg-emerald-50 text-emerald-600 text-[9px] font-black px-2 py-1 rounded uppercase tracking-widest">Active Cycle</span>}
                 </div>
                 <h4 className="font-bold text-slate-900 border-b border-slate-50 pb-2 mb-4">{c.program?.name || 'Institutional Program'}</h4>
                 <div className="space-y-3">
                    <div className="flex justify-between text-xs">
                       <span className="text-slate-400 font-bold uppercase tracking-widest">Deadline</span>
                       <span className="text-slate-900 font-black">{new Date(c.deadline).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                       <span className="text-slate-400 font-bold uppercase tracking-widest">Threshold</span>
                       <span className="text-slate-900 font-black">₹{c.autoApprovalThreshold.toLocaleString()}</span>
                    </div>
                 </div>
              </div>
            ))}
         </div>
      </div>
    </div>
  );
}
