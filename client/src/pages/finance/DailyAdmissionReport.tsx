import { useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { api } from '@/lib/api';
import { Download, Calendar, Users, DollarSign, Target, BarChart3 } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { PageHeader } from '@/components/shared/PageHeader';
import { Link } from 'react-router-dom';

interface ReportStudent {
  id: number;
  uid?: string;
  name: string;
  createdAt: string;
  reviewedAt?: string | null;
  center?: { name?: string | null };
  subDepartment?: { name?: string | null };
  program?: { name?: string | null };
}

interface DailyAdmissionReportData {
  count: number;
  date: string;
  revenue: number;
  monthlyTotal: number;
  target: number;
  cycleRemainingDays: number | null;
  activeSessionName: string | null;
  details: ReportStudent[];
}

export default function DailyAdmissionReport() {
  const [report, setReport] = useState<DailyAdmissionReportData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReport();
  }, []);

  const fetchReport = async () => {
    try {
      const res = await api.get('/dashboard/reports/daily-admissions');
      setReport(res.data);
    } catch {
       console.error('Failed to sync daily admission stream');
    } finally {
       setLoading(false);
    }
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text('RPS - DAILY ADMISSION REPORT', 20, 20);
    doc.setFontSize(10);
    doc.text(`DATE: ${report.date}`, 20, 30);
    
    autoTable(doc, {
      startY: 40,
      head: [['Student Name', 'Center', 'Sub-Dept', 'Program']],
      body: report.details.map((d) => [
        d.name,
        d.center?.name || 'N/A',
        d.subDepartment?.name || 'N/A',
        d.program?.name || 'N/A'
      ]),
    });
    
    doc.save(`Admission_Report_${report.date}.pdf`);
  };

  if (loading) return <div className="p-12 text-center text-slate-300 font-black animate-pulse uppercase">Syncing Admission Stream...</div>;

  if (!report) return (
    <div className="p-12 text-center">
      <div className="inline-block p-8 bg-red-50 rounded-[32px] border border-red-100">
        <h2 className="text-red-900 font-black uppercase tracking-tighter text-xl">System synchronization failure</h2>
        <p className="text-red-600 font-medium mt-2">The institutional admission stream is currently offline or unreachable.</p>
        <button 
          onClick={() => window.location.reload()}
          className="mt-6 bg-red-600 text-white px-6 py-2 rounded-xl font-black uppercase text-xs tracking-widest hover:bg-red-700 transition-all"
        >
          Re-establish Connection
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 md:px-8">
      <PageHeader 
        title="Daily admission intelligence"
        description="Monitor institutional growth in real-time. Branded PDF export enabled for executive reporting."
        icon={BarChart3}
        action={
          <button 
            onClick={exportPDF}
            className="bg-slate-900 text-white px-6 py-3 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-800 transition-all flex items-center gap-2 shadow-lg shadow-slate-900/20"
          >
            <Download className="w-4 h-4" /> Export
          </button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
         <MetricBox icon={<Users />} label="Daily Enrollments" value={report.count} sub="New Students Today" />
         <MetricBox icon={<DollarSign />} label="Daily Revenue" value={`₹${report.revenue.toLocaleString()}`} sub="Verified Collections" />
         <MetricBox 
            icon={<Target />} 
            label="Monthly Target Achievement" 
            value={`${(report.target > 0 ? (report.monthlyTotal / report.target) * 100 : 0).toFixed(1)}%`} 
            sub={`Target: ₹${((report.target || 0) / 1000000).toFixed(1)}M`} 
         />
         <MetricBox
            icon={<Calendar />}
            label="Cycle Remaining"
            value={report.cycleRemainingDays !== null ? `${report.cycleRemainingDays} Days` : 'N/A'}
            sub={report.activeSessionName || 'No Active Admission Window'}
         />
      </div>

      <div className="bg-white border border-slate-200 rounded-[32px] overflow-hidden shadow-sm">
         <div className="p-8 border-b border-slate-100 bg-slate-50/50">
            <h3 className="font-black text-slate-900 uppercase tracking-tighter">Today's Enrollment Audit</h3>
         </div>
         <table className="w-full text-left border-collapse">
            <thead>
               <tr>
                  <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">Student Profile</th>
                  <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">Study Center</th>
                  <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">Sub-Dept</th>
                  <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 text-right">Timestamp</th>
               </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
               {report.details.map((student) => (
                  <tr key={student.id} className="hover:bg-slate-50/50 transition-colors">
                     <td className="p-6">
                        <Link to={`/dashboard/finance/students/${student.id}`} className="font-black text-slate-900 uppercase tracking-tight hover:text-blue-600 transition-colors">{student.name}</Link>
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{student.uid}</p>
                     </td>
                     <td className="p-6 text-[10px] font-black text-slate-600 uppercase tracking-widest">{student.center?.name || 'N/A'}</td>
                     <td className="p-6 text-[10px] font-black text-slate-600 uppercase tracking-widest">{student.subDepartment?.name || 'N/A'}</td>
                     <td className="p-6 text-right font-mono text-[10px] font-bold text-slate-400">{new Date(student.reviewedAt || student.createdAt).toLocaleTimeString()}</td>
                  </tr>
               ))}
               {report.details.length === 0 && (
                  <tr>
                     <td colSpan={4} className="p-12 text-center text-slate-300 font-black uppercase text-xs">No admissions recorded today.</td>
                  </tr>
               )}
            </tbody>
         </table>
      </div>
    </div>
  );
}

function MetricBox({ icon, label, value, sub }: { icon: ReactNode; label: string; value: string | number; sub: string }) {
   return (
      <div className="bg-white p-8 border border-slate-200 rounded-[32px] shadow-sm transform hover:-translate-y-1 transition-all">
         <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-4">
            {icon}
         </div>
         <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">{label}</p>
         <h4 className="text-2xl font-black text-slate-900 tracking-tighter ">{value}</h4>
         <p className="text-[9px] font-bold text-slate-500 mt-2 uppercase tracking-widest">{sub}</p>
      </div>
   );
}
