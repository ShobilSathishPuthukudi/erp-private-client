import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { 
  Building2, 
  Search, 
  Loader2,
  Filter,
  ExternalLink
} from 'lucide-react';

export default function MyCenters() {
  const [centers, setCenters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchMyCenters();
  }, []);

  const fetchMyCenters = async () => {
    try {
      const res = await api.get('/portals/employee/my-centers');
      setCenters(res.data);
    } catch (error) {
      console.error('Failed to fetch your referred centers');
    } finally {
      setLoading(false);
    }
  };

  const filteredCenters = centers.filter((c: any) => 
    c.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase italic leading-none">Partnership Ledger</h1>
          <p className="text-slate-500 font-medium mt-2">Direct track of institutional nodes registered via your referral identity.</p>
        </div>
        <div className="relative max-w-md w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text"
            placeholder="Search your centers..."
            className="w-full pl-12 pr-6 py-3 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-sm font-medium"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/50 border-b border-slate-100">
              <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Institutional Node</th>
              <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Referral Track</th>
              <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Audit Status</th>
              <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Lifecycle</th>
              <th className="px-8 py-5"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filteredCenters.map((center: any) => (
              <tr key={center.id} className="hover:bg-slate-50/50 transition-colors group">
                <td className="px-8 py-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all">
                      <Building2 className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="font-black text-slate-900 leading-none mb-1">{center.name}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{center.shortName || 'CTR'}</p>
                    </div>
                  </div>
                </td>
                <td className="px-8 py-6">
                   <div className="flex flex-col gap-1">
                      <p className="text-xs font-bold text-slate-600">{center.metadata?.referralCode || 'DIRECT'}</p>
                      <p className="text-[10px] font-medium text-slate-400 italic">ONBOARDED: {new Date(center.createdAt).toLocaleDateString()}</p>
                   </div>
                </td>
                <td className="px-8 py-6">
                  <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border ${
                    center.auditStatus === 'approved' ? 'bg-emerald-50 border-emerald-100 text-emerald-600' :
                    center.auditStatus === 'rejected' ? 'bg-red-50 border-red-100 text-red-600' :
                    'bg-amber-50 border-amber-100 text-amber-600'
                  }`}>
                    <span className="text-[10px] font-black uppercase tracking-widest">{center.auditStatus || 'PENDING'}</span>
                  </div>
                </td>
                <td className="px-8 py-6">
                  <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border ${
                    center.status === 'active' ? 'bg-emerald-50 border-emerald-100 text-emerald-600' :
                    center.status === 'staged' ? 'bg-blue-50 border-blue-100 text-blue-600' :
                    'bg-amber-50 border-amber-100 text-amber-600'
                  }`}>
                    <span className="text-[10px] font-black uppercase tracking-widest">{center.status}</span>
                  </div>
                </td>
                <td className="px-8 py-6 text-right">
                   <button className="p-2 text-slate-300 hover:text-blue-600 transition-colors">
                      <ExternalLink className="w-4 h-4" />
                   </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredCenters.length === 0 && (
          <div className="py-24 text-center">
            <Filter className="w-16 h-16 text-slate-100 mx-auto mb-6" />
            <h3 className="text-2xl font-black text-slate-900 uppercase italic">Referral Track Empty</h3>
            <p className="text-slate-400 font-bold text-sm uppercase tracking-widest mt-2 max-w-sm mx-auto">No centers have registered using your partnership code yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
