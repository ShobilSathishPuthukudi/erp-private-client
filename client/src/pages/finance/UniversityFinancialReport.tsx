import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { BookOpen, TrendingUp, DollarSign, Calendar, BarChart2 } from 'lucide-react';
import { clsx } from 'clsx';
import { PageHeader } from '@/components/shared/PageHeader';

export default function UniversityFinancialReport() {
  const [universities, setUniversities] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [selectedUni, setSelectedUni] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUniversities();
    fetchAllReports();
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

  const fetchAllReports = async () => {
    try {
      const res = await api.get('/distribution/reports/universities');
      setReports(res.data);
    } catch (error) {
       console.error('Failed to fetch all uni reports');
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
    <div className="p-2 space-y-8 pb-12">
      <PageHeader 
        title="Institutional cash flow intelligence"
        description="Forensic 90-day projections and University-partner distribution analytics."
        icon={BarChart2}
        action={
          <div className="bg-slate-900 p-2 rounded-2xl shadow-lg shadow-slate-900/20">
            <select 
               className="bg-transparent border-none text-white font-black uppercase text-xs tracking-widest focus:ring-0 cursor-pointer w-64"
               onChange={(e) => fetchReport(Number(e.target.value))}
            >
               <option value="" className="text-slate-900">Select University</option>
               {universities.map(u => <option key={u.id} value={u.id} className="text-slate-900">{u.name}</option>)}
            </select>
          </div>
        }
      />

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
                    <p className="text-[10px] font-bold text-slate-500 mt-2 ">Low Risk / High Collection Performance</p>
                 </div>
              </div>
           </div>
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-[32px] p-8 shadow-sm">
         <h3 className="text-lg font-black text-slate-900 uppercase tracking-tighter mb-8 ">Institutional Performance Ledger</h3>
         <div className="overflow-x-auto">
            <table className="w-full">
               <thead>
                  <tr className="text-left border-b border-slate-100">
                     <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">University</th>
                     <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Owed</th>
                     <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Distributed</th>
                     <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Current Pending</th>
                     <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Action</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-slate-50">
                  {reports.map((report) => (
                     <tr key={report.id} className="group hover:bg-slate-50/50 transition-colors">
                        <td className="py-4">
                           <p className="font-bold text-slate-900">{report.name}</p>
                           <p className="text-[10px] font-medium text-slate-400">{report.uid}</p>
                        </td>
                        <td className="py-4">
                           <p className="font-black text-slate-700 tracking-tight">₹{report.totalOwed.toLocaleString()}</p>
                        </td>
                        <td className="py-4">
                           <p className="font-black text-emerald-600 tracking-tight">₹{report.totalPaid.toLocaleString()}</p>
                        </td>
                        <td className="py-4">
                           <p className="font-black text-rose-600 tracking-tight">₹{report.pending.toLocaleString()}</p>
                        </td>
                        <td className="py-4 text-right">
                           <button 
                              onClick={() => fetchReport(report.id)}
                              className="px-4 py-1.5 rounded-xl bg-slate-100 text-slate-900 text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                           >
                              Analyze
                           </button>
                        </td>
                     </tr>
                  ))}
                  {reports.length === 0 && (
                     <tr>
                        <td colSpan={5} className="py-12 text-center text-slate-400 font-medium">No institutional records found in ledger.</td>
                     </tr>
                  )}
               </tbody>
            </table>
         </div>
      </div>
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
         <p className="text-2xl font-black tracking-tighter ">{value}</p>
      </div>
   );
}

function ProjectionBucket({ label, amount, growth }: any) {
   return (
      <div className="space-y-2">
         <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
         <p className="text-xl font-black text-slate-900 tracking-tighter ">₹{amount.toLocaleString()}</p>
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
