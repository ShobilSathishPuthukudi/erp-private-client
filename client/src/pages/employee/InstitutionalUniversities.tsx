import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { 
  Building2, 
  Search, 
  Globe, 
  CheckCircle2, 
  Loader2,
  GraduationCap
} from 'lucide-react';

export default function InstitutionalUniversities() {
  const [unis, setUnis] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchUnis();
  }, []);

  const fetchUnis = async () => {
    try {
      const res = await api.get('/academic/universities');
      setUnis(res.data);
    } catch (error) {
      console.error('Failed to fetch institutional universities');
    } finally {
      setLoading(false);
    }
  };

  const filteredUnis = unis.filter(uni => 
    uni.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    uni.shortName?.toLowerCase().includes(searchTerm.toLowerCase())
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
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Institutional Universities</h1>
          <p className="text-slate-500 font-medium mt-1">Authorized list of partnered academic institutions for enrollment.</p>
        </div>
        <div className="relative max-w-sm w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text"
            placeholder="Search institutions..."
            className="w-full pl-12 pr-6 py-3 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-sm font-medium"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredUnis.map((uni) => (
          <div key={uni.id} className="bg-white rounded-[2.5rem] border border-slate-200 p-8 hover:border-blue-500 transition-all group relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:scale-110 transition-transform">
               <Building2 className="w-32 h-32" />
            </div>
            
            <div className="relative z-10">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-xl group-hover:bg-blue-600 transition-colors">
                  <span className="text-xl font-black italic">{uni.shortName?.substring(0, 2)}</span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${
                      uni.status === 'active' ? 'bg-emerald-500' : 
                      uni.status === 'staged' ? 'bg-blue-500' : 
                      'bg-amber-500'
                    }`}></span>
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{uni.status}</span>
                  </div>
                  <h3 className="text-lg font-black text-slate-900 leading-tight mt-1">{uni.name}</h3>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="flex items-center gap-3 text-slate-500">
                    <GraduationCap className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-widest">Programs</span>
                  </div>
                  <span className="text-sm font-black text-slate-900">{uni.totalPrograms || 0} Catalog</span>
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="flex items-center gap-3 text-slate-500">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span className="text-xs font-bold uppercase tracking-widest">Accreditation</span>
                  </div>
                  <span className="text-sm font-bold text-slate-900">{uni.accreditation || 'UGC Approved'}</span>
                </div>
              </div>

              <div className="mt-8 flex items-center justify-between pt-6 border-t border-slate-100">
                {uni.websiteUrl ? (
                  <a 
                    href={uni.websiteUrl} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="flex items-center gap-2 text-blue-600 font-black uppercase text-[10px] tracking-widest hover:underline"
                  >
                    <Globe className="w-4 h-4" />
                    Portal
                  </a>
                ) : <span className="text-[10px] text-slate-300 font-bold uppercase tracking-widest">No Portal Linked</span>}
                
                <div className="flex items-center gap-1 text-slate-300">
                  <span className="text-[10px] font-bold uppercase tracking-widest">ID: {uni.id}</span>
                </div>
              </div>
            </div>
          </div>
        ))}

        {filteredUnis.length === 0 && (
          <div className="col-span-full py-20 text-center bg-white rounded-[3rem] border-2 border-dashed border-slate-100">
            <Building2 className="w-12 h-12 text-slate-200 mx-auto mb-4" />
            <h3 className="text-xl font-black text-slate-900 uppercase italic">No Institutions Located</h3>
            <p className="text-slate-400 font-bold text-sm uppercase tracking-widest mt-2">Adjust your search telemetry to find registered nodes.</p>
          </div>
        )}
      </div>
    </div>
  );
}
