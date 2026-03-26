import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import { Target, Plus, Users, DollarSign, TrendingUp, Search, Filter } from 'lucide-react';
import { Modal } from '@/components/shared/Modal';

export default function TargetManager() {
  const [targets, setTargets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    targetableType: 'user',
    targetableId: '',
    metric: 'enrollment',
    value: 0,
    startDate: '',
    endDate: '',
    rules: [{ achievement: 100, reward: 0 }]
  });

  useEffect(() => {
    fetchTargets();
  }, []);

  const fetchTargets = async () => {
    try {
      const res = await api.get('/targets/my-targets'); // Placeholder, admin needs all targets
      setTargets(res.data);
    } catch (error) {
      toast.error('Failed to load institutional targets');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/targets/finance/targets', formData);
      toast.success('Institutional target deployed');
      setIsModalOpen(false);
      fetchTargets();
    } catch (error) {
      toast.error('Failed to deploy target');
    }
  };

  const addRule = () => {
    setFormData({ ...formData, rules: [...formData.rules, { achievement: 100, reward: 0 }] });
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6">
        <div>
           <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
              <Target className="w-8 h-8 text-blue-600" />
              Performance Hub
           </h1>
           <p className="text-slate-500 mt-2 text-sm leading-relaxed max-w-xl">
              Define revenue and enrollment goals for individuals and centers. 
              Configure forensic incentive structures to automate performance rewards.
           </p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-blue-700 transition-all shadow-lg active:scale-95"
        >
          <Plus className="w-5 h-5" />
          Assign New Target
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
         {targets.map((t, idx) => (
           <div key={idx} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:border-blue-200 transition-all">
              <div className="flex justify-between items-start mb-4">
                 <div className="p-2 bg-slate-50 rounded-lg">
                    {t.metric === 'revenue' ? <DollarSign className="w-5 h-5 text-emerald-600" /> : <Users className="w-5 h-5 text-blue-600" />}
                 </div>
                 <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.targetableType}</span>
              </div>
              <h3 className="font-bold text-slate-900">{t.targetableId}</h3>
              <p className="text-2xl font-black text-slate-900 mt-2">
                {t.metric === 'revenue' ? `₹${t.value.toLocaleString()}` : t.value}
              </p>
              <div className="mt-4 flex items-center gap-2 text-xs text-slate-500 font-medium">
                 <Calendar className="w-3 h-3" />
                 {new Date(t.startDate).toLocaleDateString()} - {new Date(t.endDate).toLocaleDateString()}
              </div>
           </div>
         ))}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Assign Institutional Target">
        <form onSubmit={handleCreate} className="space-y-6">
           <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                 <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Target Level</label>
                 <select 
                   className="w-full bg-slate-50 border-transparent rounded-xl px-4 py-3 text-sm focus:bg-white focus:ring-2 ring-blue-500 transition-all"
                   value={formData.targetableType}
                   onChange={(e) => setFormData({ ...formData, targetableType: e.target.value })}
                 >
                    <option value="user">Individual (BDE)</option>
                    <option value="center">Study Center</option>
                    <option value="department">Department</option>
                 </select>
              </div>
              <div className="space-y-2">
                 <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Target ID / UID</label>
                 <input 
                   type="text"
                   className="w-full bg-slate-50 border-transparent rounded-xl px-4 py-3 text-sm focus:bg-white focus:ring-2 ring-blue-500 transition-all"
                   placeholder="e.g. BDE-001"
                   value={formData.targetableId}
                   onChange={(e) => setFormData({ ...formData, targetableId: e.target.value })}
                 />
              </div>
           </div>

           <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                 <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Performance Metric</label>
                 <select 
                   className="w-full bg-slate-50 border-transparent rounded-xl px-4 py-3 text-sm focus:bg-white focus:ring-2 ring-blue-500 transition-all"
                   value={formData.metric}
                   onChange={(e) => setFormData({ ...formData, metric: e.target.value as any })}
                 >
                    <option value="enrollment">Student Enrollment</option>
                    <option value="revenue">Revenue Generation</option>
                    <option value="conversion_rate">Lead Conversion (%)</option>
                 </select>
              </div>
              <div className="space-y-2">
                 <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Target Value</label>
                 <input 
                   type="number"
                   className="w-full bg-slate-50 border-transparent rounded-xl px-4 py-3 text-sm focus:bg-white focus:ring-2 ring-blue-500 transition-all"
                   value={formData.value}
                   onChange={(e) => setFormData({ ...formData, value: parseFloat(e.target.value) })}
                 />
              </div>
           </div>

           <div className="space-y-4">
              <div className="flex justify-between items-center">
                 <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Tiered Incentive Structure</label>
                 <button type="button" onClick={addRule} className="text-blue-600 text-xs font-bold">+ Add Tier</button>
              </div>
              {formData.rules.map((rule, idx) => (
                <div key={idx} className="flex gap-4 items-center bg-slate-50 p-4 rounded-xl">
                   <div className="flex-1 space-y-1">
                      <p className="text-[9px] font-bold text-slate-400 lowercase italic">at achievement %</p>
                      <input 
                        type="number"
                        className="w-full bg-white border-transparent rounded-lg px-3 py-2 text-xs"
                        value={rule.achievement}
                        onChange={(e) => {
                          const newRules = [...formData.rules];
                          newRules[idx].achievement = parseFloat(e.target.value);
                          setFormData({ ...formData, rules: newRules });
                        }}
                      />
                   </div>
                   <div className="flex-1 space-y-1">
                      <p className="text-[9px] font-bold text-slate-400 lowercase italic">reward amount (₹)</p>
                      <input 
                        type="number"
                        className="w-full bg-white border-transparent rounded-lg px-3 py-2 text-xs"
                        value={rule.reward}
                        onChange={(e) => {
                          const newRules = [...formData.rules];
                          newRules[idx].reward = parseFloat(e.target.value);
                          setFormData({ ...formData, rules: newRules });
                        }}
                      />
                   </div>
                </div>
              ))}
           </div>

           <button 
             type="submit"
             className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-slate-800 transition-all"
           >
             Deploy Target Mesh
           </button>
        </form>
      </Modal>
    </div>
  );
}

function Calendar({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}
