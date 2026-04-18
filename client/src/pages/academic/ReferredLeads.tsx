import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Users2, ArrowUpRight, Clock, BookOpen, Target, Landmark } from 'lucide-react';
import toast from 'react-hot-toast';

interface ReferredLeadsProps {
  defaultTab?: 'leads' | 'centers';
}

export default function ReferredLeads({ defaultTab }: ReferredLeadsProps) {
  const [data, setData] = useState<{ centers: any[], leads: any[] }>({ centers: [], leads: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'leads' | 'centers'>(defaultTab || 'leads');

  useEffect(() => {
    if (defaultTab) {
      setActiveTab(defaultTab);
    }
  }, [defaultTab]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/academic/referrals');
      setData(res.data);
    } catch (error) {
      toast.error('Failed to synchronize referral telemetry');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="p-2 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-8 rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50 gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
              <Users2 className="w-6 h-6" />
            </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">
            {activeTab === 'leads' ? 'Student Prospects' : 'Institutional Nodes'}
          </h1>
          </div>
          <p className="text-slate-500 font-medium ml-15">
            {activeTab === 'leads' 
              ? 'Audit and track student candidacies referred by Strategic BDEs.' 
              : 'Audit and manage institutional partner nodes referred across the network.'}
          </p>
        </div>
        <div className="flex items-center gap-4 bg-slate-50 p-2 rounded-2xl border border-slate-200">
            <div className="px-5 py-2">
                <span className="text-2xl font-black text-slate-900">
                  {activeTab === 'leads' ? data.leads.length : data.centers.length}
                </span>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">
                  {activeTab === 'leads' ? 'Total Prospects' : 'Total Nodes'}
                </p>
            </div>
            <div className="w-px h-8 bg-slate-200" />
            <div className="px-5 py-2">
                <span className={`text-2xl font-black ${activeTab === 'leads' ? 'text-amber-500' : 'text-emerald-500'}`}>
                  {activeTab === 'leads' 
                    ? data.leads.length 
                    : data.centers.filter(c => c.auditStatus === 'approved').length}
                </span>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">
                  {activeTab === 'leads' ? 'Active Sync' : 'Verified Nodes'}
                </p>
            </div>
        </div>
      </div>

      {!defaultTab && (
        <div className="flex gap-2 p-1.5 bg-slate-100 rounded-2xl w-fit">
          <button 
              onClick={() => setActiveTab('leads')}
              className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'leads' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
          >
              Student Prospects
          </button>
          <button 
              onClick={() => setActiveTab('centers')}
              className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'centers' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
          >
              Institutional Nodes
          </button>
        </div>
      )}

      <div className="bg-white rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden">
        {isLoading ? (
            <div className="p-20 text-center animate-pulse text-slate-400 font-black uppercase tracking-[0.3em]">Downloading Telemetry...</div>
        ) : (
            <table className="w-full text-left">
                <thead className="bg-slate-50/50 border-b border-slate-100">
                    <tr>
                        <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">{activeTab === 'leads' ? 'Candidacy Trace' : 'Node Identity'}</th>
                        <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Strategic BDE Reference</th>
                        <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">{activeTab === 'leads' ? 'Target Program' : 'Sanctuary Status'}</th>
                        <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Last Synced</th>
                        <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {(activeTab === 'leads' ? data.leads : data.centers).map((item, i) => (
                        <tr key={i} className="hover:bg-slate-50/50 transition-colors group">
                            <td className="px-8 py-6">
                                <div className="flex flex-col">
                                    <span className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors uppercase tracking-tight">{item.name}</span>
                                    <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1 uppercase">
                                        {activeTab === 'leads' ? <Target className="w-3 h-3" /> : <Landmark className="w-3 h-3" />}
                                        {item.email || item.shortName || 'TRC-NODE-' + item.id}
                                    </span>
                                </div>
                            </td>
                            <td className="px-8 py-6">
                                <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-500 font-black text-[10px]">
                                        {(item.referrer?.name || item.referringBDE?.name || 'S').charAt(0)}
                                    </div>
                                    <span className="text-sm font-bold text-slate-700">{item.referrer?.name || item.referringBDE?.name || 'Strategic Sales'}</span>
                                </div>
                            </td>
                            <td className="px-8 py-6">
                                {activeTab === 'leads' ? (
                                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 uppercase tracking-tighter">
                                        <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                                        {item.notes || 'General Interest'}
                                    </div>
                                ) : (
                                    <span className={`px-2 py-1 text-[10px] font-black uppercase rounded-full tracking-widest ${item.auditStatus === 'approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                        {item.auditStatus || item.status}
                                    </span>
                                )}
                            </td>
                            <td className="px-8 py-6">
                                <span className="text-[10px] text-slate-400 font-bold uppercase flex items-center gap-1.5">
                                    <Clock className="w-3 h-3" />
                                    {new Date(item.createdAt).toLocaleDateString()}
                                </span>
                            </td>
                            <td className="px-8 py-6">
                                <button className="p-2 border border-slate-200 rounded-xl hover:bg-slate-900 hover:text-white transition-all active:scale-95 shadow-sm group">
                                    <ArrowUpRight className="w-4 h-4" />
                                </button>
                            </td>
                        </tr>
                    ))}
                    {(activeTab === 'leads' ? data.leads : data.centers).length === 0 && (
                        <tr>
                            <td colSpan={5} className="px-8 py-20 text-center text-slate-400 font-black text-xs uppercase tracking-widest">Zero Referral Synchronization in Database</td>
                        </tr>
                    )}
                </tbody>
            </table>
        )}
      </div>
    </div>
  );
}
