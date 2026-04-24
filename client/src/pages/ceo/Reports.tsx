import { useState } from 'react';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import { FileText, Download, Calendar, FileSpreadsheet, PieChart, ShieldCheck } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { format, subMonths } from 'date-fns';

export default function Reports() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date());

  const months = Array.from({ length: 12 }, (_, i) => subMonths(new Date(), i));

  const downloadExecutiveSummary = async () => {
    try {
      setIsGenerating(true);
      
      // 1. Fetch metrics for the selected window
      // const monthStart = startOfMonth(selectedMonth);
      // const monthEnd = endOfMonth(selectedMonth);
      const res = await api.get('/ceo/metrics'); // In a real system, pass ?month=
      const metrics = res.data;

      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 20;

      // Header Letterhead
      doc.setFillColor(15, 23, 42); // Slate-900
      doc.rect(0, 0, pageWidth, 45, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      doc.setFont('helvetica', 'bold');
      doc.text('RPS INSTITUTION', margin, 25);
      
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text('Global Executive Governance & Institutional Audit Board', margin, 32);
      doc.text(`Reporting Period: ${format(selectedMonth, 'MMMM yyyy')}`, pageWidth - margin - 50, 32, { align: 'right' });

      // Title
      doc.setTextColor(30, 41, 59);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('Executive Performance Summary', margin, 65);
      
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text(`Generated On: ${format(new Date(), 'PPPP')}`, margin, 72);
      doc.line(margin, 76, pageWidth - margin, 76);

      let y = 90;

      const drawSection = (title: string, items: { label: string, value: string }[]) => {
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42);
        doc.text(title, margin, y);
        y += 8;
        
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(71, 85, 105);
        
        items.forEach(item => {
          doc.text(item.label, margin + 5, y);
          doc.setFont('helvetica', 'bold');
          doc.text(item.value, pageWidth - margin, y, { align: 'right' });
          doc.setFont('helvetica', 'normal');
          y += 7;
        });
        y += 10;
      };

      drawSection('I. Revenue & Fiscal Health', [
        { label: 'Total Fees Collected (MTD):', value: `INR ${metrics.revenueMTD.toLocaleString()}` },
        { label: 'Annual Revenue (YTD):', value: `INR ${metrics.revenueYTD.toLocaleString()}` },
        { label: 'Total Cumulative Fund Acquired:', value: `INR ${metrics.totalFundAcquired.toLocaleString()}` }
      ]);

      drawSection('II. Academic & Enrollment Metrics', [
        { label: 'Active Student Headcount:', value: metrics.totalStudents.toLocaleString() },
        { label: 'Partner Universities Registered:', value: metrics.totalUniversities.toLocaleString() },
        { label: 'Active Academic Programs:', value: metrics.totalPrograms.toLocaleString() }
      ]);

      drawSection('III. Operational Stability & Risk', [
        { label: 'Critical System Escalations:', value: String(metrics.overdueTasks) },
        { label: 'High-Risk Audit Exceptions (24h):', value: String(metrics.auditExceptions) },
        { label: 'Pending Leave Bottlenecks:', value: String(metrics.pendingLeaves) }
      ]);

      // Footer
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text('This document is property of RPS. Distribution to unauthorized personnel is strictly prohibited.', pageWidth / 2, 285, { align: 'center' });

      doc.save(`Executive_Report_${format(selectedMonth, 'MMMM_yyyy')}.pdf`);
      toast.success('Executive Report generated successfully');

    } catch (error) {
      toast.error('Failed to generate report');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="p-2 space-y-8 flex flex-col">
      <PageHeader 
        title="Executive reports"
        description="Access strategic institutional analysis packages and forensic data dumps."
        icon={FileText}
      />
      <div className="space-y-8">
      
      {/* Report Customizer */}
      <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-xl shadow-slate-200/40 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 rounded-bl-full -z-0"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-8">
          <div className="max-w-xl">
             <div className="flex items-center gap-3 mb-4">
               <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center">
                 <Calendar className="w-5 h-5" />
               </div>
               <h2 className="text-xl font-black text-slate-900 tracking-tight">Report configuration</h2>
             </div>
             <p className="text-sm font-medium text-slate-500 leading-relaxed">
               Select the historical period for which you require institutional data extrapolation. Systems auto-regenerate aggregates nightly; mid-day reports reflect up-to-the-minute database synchronization.
             </p>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Reporting month</label>
            <select 
              value={selectedMonth.toISOString()}
              onChange={(e) => setSelectedMonth(new Date(e.target.value))}
              className="bg-slate-50 border border-slate-200 rounded-xl px-6 py-3 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-slate-900/20 focus:border-slate-900 outline-none transition-all cursor-pointer"
            >
              {months.map((m) => (
                <option key={m.toISOString()} value={m.toISOString()}>
                  {format(m, 'MMMM yyyy')}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        
        {/* PDF Executive Summary */}
        <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/40 group hover:-translate-y-1 transition-all">
           <div className="w-14 h-14 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
             <FileText className="w-7 h-7" />
           </div>
            <h3 className="text-lg font-black text-slate-900 mb-2 tracking-tight">Institutional summary</h3>
           <p className="text-xs font-bold text-slate-400 leading-relaxed mb-8">
             Board-ready PDF encompassing revenue trends, enrollment cycles, and governance adherence.
           </p>
           <button 
            onClick={downloadExecutiveSummary}
            disabled={isGenerating}
            className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:shadow-xl hover:shadow-slate-900/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
           >
             {isGenerating ? (
               <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
             ) : (
                <>
                  <Download className="w-4 h-4" />
                  Download PDF (board)
                </>
             )}
           </button>
        </div>

        {/* Excel Data Export */}
        <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/40 group hover:-translate-y-1 transition-all">
           <div className="w-14 h-14 bg-emerald-50 text-emerald-500 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
             <FileSpreadsheet className="w-7 h-7" />
           </div>
            <h3 className="text-lg font-black text-slate-900 mb-2 tracking-tight">XLSX data dump</h3>
           <p className="text-xs font-bold text-slate-400 leading-relaxed mb-8">
             Raw multi-sheet dataset for offline multi-variate analysis and external auditing tools.
           </p>
            <button 
             disabled={true}
             className="w-full bg-slate-50 text-slate-400 py-4 rounded-2xl font-black text-xs uppercase tracking-widest border-2 border-dashed border-slate-100 cursor-not-allowed"
            >
              Download Excel (raw)
            </button>
        </div>

        {/* Compliance Statement */}
        <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/40 group hover:-translate-y-1 transition-all relative overflow-hidden">
           <div className="absolute top-0 right-0 w-16 h-16 bg-blue-50 rounded-bl-full flex items-center justify-center">
              <ShieldCheck className="w-6 h-6 text-blue-200" />
           </div>
           <div className="w-14 h-14 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
             <PieChart className="w-7 h-7" />
           </div>
            <h3 className="text-lg font-black text-slate-900 mb-2 tracking-tight">Audit checklist</h3>
           <p className="text-xs font-bold text-slate-400 leading-relaxed mb-8">
             Visual breakdown of internal compliance gaps and unauthorized access attempts in period.
           </p>
            <button 
             className="w-full bg-slate-50 text-slate-400 py-4 rounded-2xl font-black text-xs uppercase tracking-widest border-2 border-dashed border-slate-100"
            >
              Generate audit vis
            </button>
        </div>

      </div>
    </div>
  );
}
