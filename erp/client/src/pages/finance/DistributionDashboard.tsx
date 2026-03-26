import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import { PieChart, Settings, Download, Save } from 'lucide-react';

export default function DistributionDashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isConfiguring, setIsConfiguring] = useState<number | null>(null);
  const [config, setConfig] = useState({ universityShare: 0, platformShare: 0, partnerShare: 0 });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await api.get('/distribution/dashboard');
      setData(res.data);
    } catch (error) {
       console.error('Failed to fetch financial splits');
    } finally {
       setLoading(false);
    }
  };

  const handleSaveConfig = async (programId: number) => {
    const total = Number(config.universityShare) + Number(config.platformShare) + Number(config.partnerShare);
    if (total !== 100) {
      toast.error(`Forensic mismatch: Split total is ${total}%, must be 100%`);
      return;
    }

    try {
      await api.post('/distribution/configs', { programId, ...config });
      toast.success('Financial split versioned and activated');
      setIsConfiguring(null);
      fetchData();
    } catch (error) {
       toast.error('Failed to save distribution config');
    }
  };

  if (loading) return <div className="p-12 text-center text-slate-300 font-black animate-pulse uppercase">Syncing Partner Ledgers...</div>;

  return (
    <div className="space-y-8">
      <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6">
        <div>
           <h2 className="text-2xl font-black text-slate-900 flex items-center gap-3 uppercase tracking-tighter">
              <PieChart className="w-8 h-8 text-blue-600" />
              Partner Revenue Distributions
           </h2>
           <p className="text-slate-500 mt-1 font-medium italic">Configure program-based fee splits and monitor partner-based payout queues forensically.</p>
        </div>
        <button className="bg-slate-900 text-white px-6 py-3 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-800 transition-all flex items-center gap-2">
           <Download className="w-4 h-4" /> Export Ledger
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         {data.stats.map((stat: any) => (
           <div key={stat.partnerType} className="bg-white p-8 border border-slate-200 rounded-[32px] shadow-sm group">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">{stat.partnerType} Share</p>
              <div className="flex justify-between items-baseline">
                 <p className="text-3xl font-black text-slate-900 tracking-tighter italic">₹{(stat.totalAmount || 0).toLocaleString()}</p>
                 <span className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full">{stat.count} Entries</span>
              </div>
           </div>
         ))}
      </div>

      <div className="bg-white border border-slate-200 rounded-[32px] overflow-hidden shadow-sm">
         <table className="w-full text-left border-collapse">
            <thead>
               <tr className="bg-slate-50/50">
                  <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">Program Engine</th>
                  <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">Uni Share</th>
                  <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">Platform Share</th>
                  <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">Partner Share</th>
                  <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 text-right">Actions</th>
               </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
               {data.programs.map((prog: any) => {
                  const activeConfig = prog.distributions?.[0] || { universityShare: 0, platformShare: 0, partnerShare: 0 };
                  const isEditing = isConfiguring === prog.id;

                  return (
                    <tr key={prog.id} className="hover:bg-slate-50/50 transition-colors">
                       <td className="p-6 font-black text-slate-900 uppercase tracking-tight">{prog.name}</td>
                       <td className="p-6">
                          {isEditing ? (
                             <input 
                               type="number" 
                               className="w-20 bg-slate-100 border-none rounded-xl px-3 py-2 text-xs font-bold"
                               value={config.universityShare}
                               onChange={(e) => setConfig({ ...config, universityShare: Number(e.target.value) })}
                             />
                          ) : (
                             <span className="font-mono text-xs font-bold text-slate-600">{activeConfig.universityShare}%</span>
                          )}
                       </td>
                       <td className="p-6">
                          {isEditing ? (
                             <input 
                               type="number" 
                               className="w-20 bg-slate-100 border-none rounded-xl px-3 py-2 text-xs font-bold"
                               value={config.platformShare}
                               onChange={(e) => setConfig({ ...config, platformShare: Number(e.target.value) })}
                             />
                          ) : (
                             <span className="font-mono text-xs font-bold text-slate-600">{activeConfig.platformShare}%</span>
                          )}
                       </td>
                       <td className="p-6">
                          {isEditing ? (
                             <input 
                               type="number" 
                               className="w-20 bg-slate-100 border-none rounded-xl px-3 py-2 text-xs font-bold"
                               value={config.partnerShare}
                               onChange={(e) => setConfig({ ...config, partnerShare: Number(e.target.value) })}
                             />
                          ) : (
                             <span className="font-mono text-xs font-bold text-slate-600">{activeConfig.partnerShare}%</span>
                          )}
                       </td>
                       <td className="p-6 text-right">
                          {isEditing ? (
                             <div className="flex justify-end gap-2">
                                <button 
                                  onClick={() => setIsConfiguring(null)}
                                  className="p-2 bg-slate-100 text-slate-500 rounded-xl hover:bg-slate-200"
                                >
                                   X
                                </button>
                                <button 
                                  onClick={() => handleSaveConfig(prog.id)}
                                  className="p-2 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 shadow-lg shadow-emerald-200"
                                >
                                   <Save className="w-4 h-4" />
                                </button>
                             </div>
                          ) : (
                             <button 
                               onClick={() => {
                                 setIsConfiguring(prog.id);
                                 setConfig({ 
                                    universityShare: activeConfig.universityShare, 
                                    platformShare: activeConfig.platformShare, 
                                    partnerShare: activeConfig.partnerShare 
                                 });
                               }}
                               className="p-3 bg-slate-50 text-slate-400 rounded-2xl hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                             >
                                <Settings className="w-4 h-4" />
                             </button>
                          )}
                       </td>
                    </tr>
                  );
               })}
            </tbody>
         </table>
      </div>
    </div>
  );
}
