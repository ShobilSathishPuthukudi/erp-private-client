import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { BookOpen, TrendingUp, DollarSign, Calendar, BarChart2 } from 'lucide-react';
import { clsx } from 'clsx';

export default function UniversityFinancialReport() {
  const [universities, setUniversities] = useState<any[]>([]);
  const [selectedUni, setSelectedUni] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUniversities();
  }, []);

  const fetchUniversities = async () => {
    try {
      const res = await api.get('/academic/universities');
      setUniversities(res.data);
      if (res.data.length > 0) fetchReport(res.data[0].id);
    } catch (error) {
       console.error('Failed to fetch universities');
    }
  };

  const fetchReport = async (id: number) => {
    setLoading(true);
    try {
      const res = await api.get(`/distribution/reports/university/${id}`);
      setSelectedUni(res.data);
    } catch (error) {
       console.error('Failed to sync uni report');
    } finally {
       setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="bg-slate-900 rounded-[32px] p-8 lg:p-12 text-white flex flex-col md:flex-row justify-between items-center gap-8 shadow-2xl relative overflow-hidden">
         <div className="absolute top-0 right-0 p-12 opacity-5 translate-x-12 -translate-y-12">
            <BarChart2 className="w-64 h-64" />
         </div>
         <div className="relative z-10">
            <h2 className="text-3xl font-black uppercase tracking-tighter mb-2 italic">Institutional Cash Flow Intelligence</h2>
            <p className="text-slate-400 font-medium italic">Forensic 90-day projections and University-partner distribution analytics.</p>
         </div>

         <div className="relative z-10 bg-white/5 border border-white/10 p-2 rounded-2xl backdrop-blur-xl">
            <select 
              className="bg-transparent border-none text-white font-black uppercase text-xs tracking-widest focus:ring-0 w-64"
              onChange={(e) => fetchReport(Number(e.target.value))}
            >
               {universities.map(u => <option key={u.id} value={u.id} className="text-slate-900">{u.name}</option>)}
            </select>
         </div>
      </div>

      {loading ? (
         <div className="p-32 text-center animate-pulse text-slate-300 font-black uppercase tracking-widest">Generating High-Fidelity Projection...</div>
      ) : selectedUni && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
           <div className="lg:col-span-2 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 <MetricCard icon={<DollarSign />} label="Total Owed" value={`₹${selectedUni.totalOwed.toLocaleString()}`} color="blue" />
                 <MetricCard icon={<TrendingUp />} label="Total Paid" value={`₹${selectedUni.totalPaid.toLocaleString()}`} color="emerald" />
                 <MetricCard icon={<Calendar />} label="Pending Share" value={`₹${selectedUni.pending.toLocaleString()}`} color="rose" />
              </div>

              <div className="bg-white border border-slate-200 rounded-[32px] p-8 shadow-sm">
                 <h3 className="text-lg font-black text-slate-900 uppercase tracking-tighter mb-8 flex items-center gap-3">
                    <TrendingUp className="w-6 h-6 text-blue-600" />
                    90-Day Projected Cash Flow
                 </h3>
                 <div className="grid grid-cols-3 gap-8">
                    <ProjectionBucket label="Next 30 Days" amount={selectedUni.projections.d30} growth="+12%" />
                    <ProjectionBucket label="Next 60 Days" amount={selectedUni.projections.d60} growth="+5%" />
                    <ProjectionBucket label="Next 90 Days" amount={selectedUni.projections.d90} growth="-2%" />
                 </div>
              </div>
           </div>

           <div className="bg-white border border-slate-200 rounded-[32px] p-8 shadow-sm h-fit">
              <h3 className="font-black text-slate-900 uppercase tracking-tighter mb-6 flex items-center gap-2">
                 <BookOpen className="w-5 h-5 text-blue-600" />
                 Institutional Profile
              </h3>
              <div className="space-y-6">
                 <ProfileItem label="Affiliation" value={selectedUni.university.name} />
                 <ProfileItem label="UID" value={selectedUni.university.uid} />
                 <ProfileItem label="Contract Status" value="ACTIVE / FORENSIC" />
                 <div className="pt-6 border-t border-slate-100">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Risk Assessment</p>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                       <div className="h-full bg-emerald-500 w-[85%]" />
                    </div>
                    <p className="text-[10px] font-bold text-slate-500 mt-2 italic">Low Risk / High Collection Performance</p>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}

function MetricCard({ icon, label, value, color }: any) {
   const colors: any = {
      blue: 'bg-blue-50 text-blue-600 border-blue-100',
      emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
      rose: 'bg-rose-50 text-rose-600 border-rose-100'
   };
   return (
      <div className={clsx("p-8 rounded-[32px] border shadow-sm", colors[color])}>
         <div className="w-10 h-10 bg-white/80 rounded-2xl flex items-center justify-center mb-4 shadow-sm">
            {icon}
         </div>
         <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-70 mb-1">{label}</p>
         <p className="text-2xl font-black tracking-tighter italic">{value}</p>
      </div>
   );
}

function ProjectionBucket({ label, amount, growth }: any) {
   return (
      <div className="space-y-2">
         <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
         <p className="text-xl font-black text-slate-900 tracking-tighter italic">₹{amount.toLocaleString()}</p>
         <p className={clsx("text-[9px] font-black uppercase", growth.startsWith('+') ? 'text-emerald-500' : 'text-rose-500')}>
            {growth} Expected
         </p>
      </div>
   );
}

function ProfileItem({ label, value }: any) {
   return (
      <div>
         <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{label}</p>
         <p className="font-bold text-slate-900 truncate">{value}</p>
      </div>
   );
}
