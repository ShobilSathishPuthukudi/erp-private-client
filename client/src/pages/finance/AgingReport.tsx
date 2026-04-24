import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Clock, AlertTriangle, ChevronRight, Search, Download } from 'lucide-react';
import { clsx } from 'clsx';
import { PageHeader } from '@/components/shared/PageHeader';

export default function AgingReport() {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await api.get('/distribution/reports/aging');
      setReports(res.data);
    } catch (error) {
       console.error('Failed to sync aging buckets');
    } finally {
       setLoading(false);
    }
  };

  const filtered = reports.filter(r => 
    r.name.toLowerCase().includes(search.toLowerCase()) || 
    r.uid.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="p-12 text-center text-slate-300 font-black animate-pulse uppercase">Calculating Aging Buckets...</div>;

  return (
    <div className="p-2 space-y-8">
      <PageHeader 
        title="Fee Aging & Outstanding Telemetry"
        description="Monitor center-wise payment delays across forensic 30/60/90+ day cycles."
        icon={Clock}
        action={
          <div className="flex flex-col md:flex-row gap-4 items-center">
            <div className="bg-slate-50 p-2 rounded-2xl border border-slate-100 flex items-center gap-3 px-4 w-full md:w-auto">
               <Search className="w-4 h-4 text-slate-400" />
               <input 
                 type="text" 
                 placeholder="Search Center..." 
                 className="bg-transparent border-none focus:ring-0 text-xs font-bold w-48"
                 value={search}
                 onChange={(e) => setSearch(e.target.value)}
               />
            </div>
            <button className="bg-slate-900 text-white px-6 py-3 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-800 transition-all flex items-center gap-2 shadow-lg shadow-slate-900/20 whitespace-nowrap">
               <Download className="w-4 h-4" /> PDF Report
            </button>
          </div>
        }
      />

      <div className="bg-white border border-slate-200 rounded-[32px] overflow-hidden shadow-sm">
         <table className="w-full text-left border-collapse">
            <thead>
               <tr className="bg-slate-50/50">
                  <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">Study Center</th>
                  <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 text-center">Current</th>
                  <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 text-center">30 Days</th>
                  <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 text-center">60 Days</th>
                  <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 text-center">90+ Days</th>
                  <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 text-right">Total Outstanding</th>
               </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 font-mono text-[11px] font-bold">
               {filtered.map((row) => (
                  <tr key={`${row.centerId}-${row.uid}`} className="hover:bg-slate-50/50 transition-colors group cursor-default">
                     <td className="p-6">
                        <div className="flex items-center gap-3">
                           <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-400 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
                              <ChevronRight className="w-4 h-4" />
                           </div>
                           <div>
                              <p className="font-black text-slate-900 uppercase tracking-tight text-[12px]">{row.name}</p>
                              <p className="text-[9px] text-slate-400 uppercase tracking-widest">{row.uid}</p>
                           </div>
                        </div>
                     </td>
                     <td className="p-6 text-center text-slate-600">₹{row.buckets.current.toLocaleString()}</td>
                     <td className={clsx("p-6 text-center", row.buckets.d30 > 0 ? "text-amber-600 bg-amber-50/30" : "text-slate-300")}>₹{row.buckets.d30.toLocaleString()}</td>
                     <td className={clsx("p-6 text-center", row.buckets.d60 > 0 ? "text-orange-600 bg-orange-50/30" : "text-slate-300")}>₹{row.buckets.d60.toLocaleString()}</td>
                     <td className={clsx("p-6 text-center font-black", row.buckets.d90 > 0 ? "text-rose-600 bg-rose-50/30" : "text-slate-300")}>
                        ₹{row.buckets.d90.toLocaleString()}
                     </td>
                     <td className="p-6 text-right font-black text-slate-900 text-[13px] tracking-tighter">
                        ₹{row.total.toLocaleString()}
                     </td>
                  </tr>
               ))}
            </tbody>
         </table>
      </div>

      <div className="bg-amber-50 border border-amber-100 p-6 rounded-[24px] flex gap-4 text-amber-700">
         <AlertTriangle className="w-6 h-6 shrink-0" />
         <div className="text-xs font-bold leading-relaxed">
            Forensic Warning: 90+ day buckets represent high-risk institutional liabilities. Centers with cumulative aging {'>'} ₹500,000 are automatically flagged for enrollment suspension.
         </div>
      </div>
    </div>
  );
}
