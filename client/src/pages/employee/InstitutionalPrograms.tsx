import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { 
  GraduationCap, 
  Search, 
  Clock, 
  IndianRupee, 
  Loader2,
  Filter,
  LayoutGrid
} from 'lucide-react';

export default function InstitutionalPrograms() {
  const [programs, setPrograms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');

  useEffect(() => {
    fetchPrograms();
  }, []);

  const fetchPrograms = async () => {
    try {
      const res = await api.get('/academic/programs');
      setPrograms(res.data);
    } catch (error) {
      console.error('Failed to fetch institutional academic programs');
    } finally {
      setLoading(false);
    }
  };

  const filteredPrograms = programs.filter(prog => {
    const matchesSearch = prog.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        prog.university?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = activeFilter === 'all' || prog.type?.toLowerCase().includes(activeFilter.toLowerCase());
    return matchesSearch && matchesFilter;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  const types = ['all', 'skill', 'online', 'openschool', 'bvoc'];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Institutional Catalog</h1>
          <p className="text-slate-500 font-medium mt-1">Authorized list of all defined academic programs and vocational streams.</p>
        </div>
        <div className="flex flex-col md:flex-row gap-4 max-w-2xl w-full">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text"
                placeholder="Search programs..."
                className="w-full pl-12 pr-6 py-3 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-sm font-medium"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
                {types.map(type => (
                    <button
                        key={type}
                        onClick={() => setActiveFilter(type)}
                        className={`px-6 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest border transition-all whitespace-nowrap ${
                            activeFilter === type 
                            ? 'bg-slate-900 text-white border-slate-900 shadow-xl' 
                            : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300'
                        }`}
                    >
                        {type}
                    </button>
                ))}
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filteredPrograms.map((prog) => (
          <div key={prog.id} className="bg-white rounded-[3rem] border border-slate-200 p-10 hover:border-blue-500 transition-all group relative overflow-hidden flex flex-col justify-between">
            <div className="absolute top-0 right-0 p-10 opacity-[0.03] group-hover:scale-110 transition-transform">
               <GraduationCap className="w-32 h-32" />
            </div>
            
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-4">
                 <div className="px-4 py-1.5 bg-blue-50 border border-blue-100 rounded-full">
                    <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">{prog.type}</span>
                 </div>
                 <div className={`px-4 py-1.5 border rounded-full ${
                    prog.status === 'active' ? 'bg-emerald-50 border-emerald-100 text-emerald-600' :
                    prog.status === 'staged' ? 'bg-blue-50 border-blue-100 text-blue-600' :
                    'bg-amber-50 border-amber-100 text-amber-600'
                 }`}>
                    <span className="text-[10px] font-black uppercase tracking-widest">{prog.status}</span>
                 </div>
              </div>

              <h3 className="text-2xl font-black text-slate-900 tracking-tight leading-tight mb-2 group-hover:text-blue-600 transition-colors">
                {prog.name}
              </h3>
              <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-8">
                {prog.university?.name || 'Institutional Program'}
              </p>

              <div className="grid grid-cols-2 gap-4 mb-10">
                 <div className="p-5 bg-slate-50 border border-slate-100 rounded-3xl">
                    <div className="flex items-center gap-2 text-slate-400 mb-2">
                       <Clock className="w-4 h-4" />
                       <span className="text-[10px] font-black uppercase tracking-widest leading-none">Duration</span>
                    </div>
                    <p className="text-lg font-black text-slate-900 leading-none">{prog.duration} Mo.</p>
                 </div>
                 <div className="p-5 bg-slate-50 border border-slate-100 rounded-3xl">
                    <div className="flex items-center gap-2 text-slate-400 mb-2">
                       <IndianRupee className="w-4 h-4" />
                       <span className="text-[10px] font-black uppercase tracking-widest leading-none">Credits</span>
                    </div>
                    <p className="text-lg font-black text-slate-900 leading-none">{prog.totalCredits || 0}</p>
                 </div>
              </div>
            </div>

            <div className="mt-auto space-y-4 pt-6 border-t border-slate-100">
               <div className="flex items-center justify-between">
                  <div>
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 leading-none">Investment</p>
                     <p className="text-xl font-black text-slate-900 tracking-tighter leading-none">₹{prog.totalFee?.toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 leading-none">Batch Size</p>
                     <p className="text-xl font-black text-slate-900 leading-none">{prog.intakeCapacity || 'Unlimited'}</p>
                  </div>
               </div>
               
               <div className="flex items-center gap-3 bg-slate-50 px-5 py-3 rounded-2xl border border-slate-100">
                  <LayoutGrid className="w-4 h-4 text-slate-400" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Sub-Dept ID: {prog.subDeptId}</span>
                  <div className="ml-auto flex items-center gap-1 text-slate-300">
                    <span className="text-[10px] font-bold uppercase tracking-widest italic">ID: {prog.id}</span>
                  </div>
               </div>
            </div>
          </div>
        ))}

        {filteredPrograms.length === 0 && (
          <div className="col-span-full py-24 text-center bg-white rounded-[4rem] border-2 border-dashed border-slate-100">
            <Filter className="w-16 h-16 text-slate-200 mx-auto mb-6" />
            <h3 className="text-2xl font-black text-slate-900 uppercase italic">Catalog Node Empty</h3>
            <p className="text-slate-400 font-bold text-sm uppercase tracking-widest mt-2 max-w-sm mx-auto">No programs found for institutional search criteria of your sector.</p>
          </div>
        )}
      </div>
    </div>
  );
}
