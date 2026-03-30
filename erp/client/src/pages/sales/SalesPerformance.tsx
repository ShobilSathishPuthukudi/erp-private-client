import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Building, Users, DollarSign, TrendingUp, Copy, Database, Calendar, Search } from 'lucide-react';
import toast from 'react-hot-toast';

interface Referral {
  id: number;
  name: string;
  status: string;
  createdAt: string;
  revenue: number;
}

export default function SalesPerformance() {
  const [performance, setPerformance] = useState<any>(null);
  const [referralCode, setReferralCode] = useState<string>('');
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [perfRes, codeRes] = await Promise.all([
        api.get('/sales/performance'),
        api.get('/sales/referral-code')
      ]);
      setPerformance(perfRes.data);
      setReferralCode(codeRes.data.referralCode);
    } catch (error) {
      console.error('Sales performance load error:', error);
      toast.error('Failed to load sales performance data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const copyReferralLink = () => {
    const link = `${window.location.origin}/referral/${referralCode}`;
    navigator.clipboard.writeText(link);
    toast.success('Referral link copied to clipboard');
  };

  if (loading) return (
    <div className="space-y-8 animate-pulse">
       <div className="grid grid-cols-4 gap-6">
          {[1,2,3,4].map(i => <div key={i} className="h-32 bg-slate-50 rounded-3xl border-2 border-slate-100" />)}
       </div>
       <div className="h-64 bg-slate-900 rounded-[2rem]" />
    </div>
  );

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard icon={<Building className="w-5 h-5 shadow-sm" />} label="Centers Referred" value={performance?.centerCount || 0} color="blue" />
        <StatCard icon={<Users className="w-5 h-5 shadow-sm" />} label="Total Admissions" value={performance?.studentCount || 0} color="indigo" />
        <StatCard icon={<DollarSign className="w-5 h-5 shadow-sm" />} label="Yield Revenue" value={`₹${(performance?.totalRevenue || 0).toLocaleString()}`} color="emerald" />
        <StatCard icon={<TrendingUp className="w-5 h-5 shadow-sm" />} label="Efficiency Rate" value={`${performance?.centerCount > 0 ? ((performance.studentCount / performance.centerCount) * 5).toFixed(1) : 0}%`} color="amber" />
      </div>

      <div className="bg-slate-950 rounded-[2.5rem] p-10 lg:p-16 text-white relative overflow-hidden shadow-2xl shadow-slate-200 group">
        <div className="absolute -top-24 -right-24 p-12 opacity-10 group-hover:opacity-20 transition-opacity duration-1000">
            <Database className="w-96 h-96 text-blue-500" />
        </div>
        <div className="relative z-10 max-w-2xl">
            <div className="inline-flex items-center gap-2 bg-blue-500/20 text-blue-400 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest mb-6">
               <Calendar className="w-3.5 h-3.5" />
               Institutional Engine Active
            </div>
            <h2 className="text-4xl font-black uppercase tracking-tighter mb-4 italic leading-none">Global Referral Anchor</h2>
            <p className="text-slate-400 font-medium mb-10 leading-relaxed italic text-lg pr-4">Distribute your unique referral anchor to prospective Study Centers. Every conversion via this link is forensically tagged for revenue attribution and incentive calculation.</p>
            
            <div className="flex items-center gap-4 bg-white/5 border border-white/10 rounded-[2rem] p-3 pl-8 hover:border-blue-500/50 transition-colors group">
                <code className="flex-1 font-mono text-blue-400 font-bold truncate text-sm">
                    {window.location.origin}/referral/{referralCode}
                </code>
                <button 
                    onClick={copyReferralLink}
                    className="bg-white text-slate-950 px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all flex items-center gap-2 shadow-xl shadow-white/5"
                >
                    <Copy className="w-4 h-4" /> Copy Link
                </button>
            </div>
        </div>
      </div>

      <div className="bg-white border-2 border-slate-100 rounded-[3rem] overflow-hidden shadow-2xl shadow-slate-100/50">
        <div className="p-10 border-b border-slate-100 flex justify-between items-center bg-slate-50/30">
            <div>
               <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter italic">Referral Acquisition Pipeline</h3>
               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Forensic Yield Tracking per Institutional Node</p>
            </div>
            <div className="relative">
               <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
               <input type="text" placeholder="Search Node..." className="bg-white border-2 border-slate-100 rounded-2xl pl-12 pr-6 py-2.5 text-xs font-bold focus:border-blue-500 outline-none w-64 transition-all" />
            </div>
        </div>
        <div className="overflow-x-auto">
            <table className="w-full text-left">
                <thead className="bg-slate-900 text-[10px] font-black text-white uppercase tracking-[0.2em]">
                    <tr>
                        <th className="px-10 py-6">Institutional Entity</th>
                        <th className="px-10 py-6">Acquisition</th>
                        <th className="px-10 py-6">Verification</th>
                        <th className="px-10 py-6 text-right">Revenue Yield</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-sm">
                    {performance?.centers?.map((c: Referral) => (
                        <tr key={c.id} className="hover:bg-blue-50/30 transition-all group">
                            <td className="px-10 py-6">
                               <div className="font-black text-slate-900 uppercase tracking-tighter italic text-base">{c.name}</div>
                               <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Node ID: {c.id}</div>
                            </td>
                            <td className="px-10 py-6 text-slate-500 font-mono italic font-bold">{new Date(c.createdAt).toLocaleDateString()}</td>
                            <td className="px-10 py-6">
                                <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border-2 ${c.status === 'active' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>
                                    {c.status}
                                </span>
                            </td>
                            <td className="px-10 py-6 text-right font-black text-slate-900 text-lg tracking-tighter">₹{(c.revenue || 0).toLocaleString()}</td>
                        </tr>
                    ))}
                    {(!performance?.centers || performance?.centers.length === 0) && (
                        <tr>
                            <td colSpan={4} className="px-10 py-24 text-center">
                               <div className="w-20 h-20 bg-slate-50 rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-inner">
                                  <Building className="w-10 h-10 text-slate-200" />
                               </div>
                               <h4 className="text-sm font-black text-slate-300 uppercase tracking-[0.2em] italic">No active referrals synchronized</h4>
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
      </div>
    </div>
  );
}


function StatCard({ icon, label, value, color }: any) {
    const colors: any = {
        blue: 'bg-blue-50 text-blue-600',
        indigo: 'bg-indigo-50 text-indigo-600',
        emerald: 'bg-emerald-50 text-emerald-600',
        amber: 'bg-amber-50 text-amber-600'
    };
    return (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className={`w-10 h-10 ${colors[color]} rounded-2xl flex items-center justify-center mb-4`}>
                {icon}
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
            <p className="text-2xl font-black text-slate-900 tracking-tighter">{value}</p>
        </div>
    );
}
