import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Building, Users, DollarSign, TrendingUp, Copy, Database, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';

interface Referral {
  id: number;
  name: string;
  status: string;
  createdAt: string;
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
      toast.error('Failed to sync sales telemetry');
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

  if (loading) return <div className="p-12 text-center font-black text-slate-300 uppercase tracking-widest animate-pulse">Syncing Telemetry...</div>;

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard icon={<Building className="w-5 h-5" />} label="Centers Referred" value={performance?.centerCount || 0} color="blue" />
        <StatCard icon={<Users className="w-5 h-5" />} label="Students Enrolled" value={performance?.studentCount || 0} color="indigo" />
        <StatCard icon={<DollarSign className="w-5 h-5" />} label="Institutional Revenue" value={`₹${(performance?.totalRevenue || 0).toLocaleString()}`} color="emerald" />
        <StatCard icon={<TrendingUp className="w-5 h-5" />} label="Conversion Rate" value={`${performance?.centerCount > 0 ? ((performance.studentCount / performance.centerCount) * 10).toFixed(1) : 0}%`} color="amber" />
      </div>

      <div className="bg-slate-900 rounded-[32px] p-8 lg:p-12 text-white relative overflow-hidden shadow-2xl shadow-slate-200">
        <div className="absolute top-0 right-0 p-12 opacity-5">
            <Database className="w-64 h-64" />
        </div>
        <div className="relative z-10 max-w-2xl">
            <h2 className="text-3xl font-black uppercase tracking-tighter mb-4">Your Institutional Engine</h2>
            <p className="text-slate-400 font-medium mb-8 leading-relaxed italic">Distribute your unique referral anchor to prospective Study Centers. Every registration via this link is forensically tagged to your BDE profile for revenue attribution.</p>
            
            <div className="flex items-center gap-4 bg-white/5 border border-white/10 rounded-2xl p-2 pl-6">
                <code className="flex-1 font-mono text-blue-400 font-bold truncate">
                    {window.location.origin}/referral/{referralCode}
                </code>
                <button 
                    onClick={copyReferralLink}
                    className="bg-white text-slate-900 px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:scale-105 transition-transform flex items-center gap-2"
                >
                    <Copy className="w-4 h-4" /> Copy Link
                </button>
            </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-[32px] overflow-hidden shadow-sm">
        <div className="p-8 border-b border-slate-100 flex justify-between items-center">
            <h3 className="font-black text-slate-900 uppercase tracking-tighter">Your Referred Centers</h3>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Forensic Acquisition Pipeline</span>
        </div>
        <div className="overflow-x-auto">
            <table className="w-full text-left">
                <thead className="bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <tr>
                        <th className="px-8 py-4">Institutional Entity</th>
                        <th className="px-8 py-4">Acquisition Date</th>
                        <th className="px-8 py-4">Verification Status</th>
                        <th className="px-8 py-4 text-right">Revenue Yield</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-sm">
                    {performance?.centers?.map((c: Referral) => (
                        <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-8 py-5 font-black text-slate-900 uppercase tracking-tighter">{c.name}</td>
                            <td className="px-8 py-5 text-slate-500 font-mono italic">{new Date(c.createdAt).toLocaleDateString()}</td>
                            <td className="px-8 py-5">
                                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${c.status === 'active' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                                    {c.status}
                                </span>
                            </td>
                            <td className="px-8 py-5 text-right font-black text-slate-900">₹0.00</td>
                        </tr>
                    ))}
                    {(!performance?.centers || performance?.centers.length === 0) && (
                        <tr>
                            <td colSpan={4} className="px-8 py-12 text-center text-slate-300 font-black uppercase text-xs tracking-widest italic">No referrals synchronized yet</td>
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
