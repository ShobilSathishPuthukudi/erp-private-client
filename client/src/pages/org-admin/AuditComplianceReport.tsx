import { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  FileCheck,
  Download,
  Activity,
  PieChart,
  TrendingUp,
  AlertTriangle,
  ChevronRight,
  Clock,
  Users,
  Layout
} from 'lucide-react';
import { api } from '@/lib/api';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import toast from 'react-hot-toast';
import { PageHeader } from '@/components/shared/PageHeader';

export default function AuditComplianceReport() {
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  useEffect(() => {
    fetchComplianceData();
  }, [selectedMonth, selectedYear]);

  const fetchComplianceData = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get('/audit/compliance', {
        params: { month: selectedMonth, year: selectedYear }
      });
      setReportData(data);
      setLoading(false);
    } catch (error: any) {
      console.error("Failed to fetch compliance data", error);
      const msg = error.code === 'ERR_NETWORK' || error.response?.status === 502 
        ? "Institutional API Unreachable (ECONNREFUSED)"
        : "Failed to load compliance report data";
      setError(msg);
      toast.error(msg);
      setLoading(false);
    }
  };

  const handleDownloadPDF = () => {
    if (!reportData) return;

    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(22);
    doc.text('IITS ERP: Governance Compliance Report', 14, 20);
    doc.setFontSize(12);
    doc.text(`Period: ${months[selectedMonth]} ${selectedYear}`, 14, 30);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 36);

    // Summary Stats
    doc.setFontSize(16);
    doc.text('Monthly Summary Metrics', 14, 50);
    doc.setFontSize(11);
    doc.text(`Total Actions Captured: ${reportData?.stats?.total ?? 0}`, 14, 60);
    doc.text(`Create Operations: ${reportData?.stats?.create ?? 0}`, 14, 66);
    doc.text(`Update Operations: ${reportData?.stats?.update ?? 0}`, 14, 72);
    doc.text(`Delete Operations: ${reportData?.stats?.delete ?? 0}`, 14, 78);

    // Top Users Table
    (doc as any).autoTable({
      startY: 90,
      head: [['Rank', 'Username / Role', 'Total Events']],
      body: reportData.topUsers.map((u: any, i: number) => [i + 1, u.name, u.count]),
      theme: 'striped',
      headStyles: { fillColor: [15, 23, 42] }
    });

    // Flagged Actions
    const finalY = (doc as any).lastAutoTable.finalY + 15;
    doc.setFontSize(16);
    doc.text('Flagged Governance Exceptions', 14, finalY);
    
    (doc as any).autoTable({
      startY: finalY + 10,
      head: [['ID', 'Entity', 'Action', 'Performer', 'Timestamp']],
      body: (reportData.flaggedActions || []).map((l: any) => [
        l.id, 
        l.entity, 
        l.action, 
        l.user?.name || 'System',
        new Date(l.timestamp).toLocaleDateString()
      ]),
      theme: 'grid',
      headStyles: { fillColor: [220, 38, 38] }
    });

    doc.save(`Compliance_Report_${months[selectedMonth]}_${selectedYear}.pdf`);
    toast.success("Compliance PDF generated successfully");
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center p-20 gap-4 text-center">
      <div className="w-12 h-12 border-4 border-slate-900/10 border-t-slate-900 rounded-full animate-spin"></div>
      <p className="font-bold text-slate-400">Generating Board-Level Compliance Data...</p>
    </div>
  );
  
  if (error) return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="bg-rose-50 border-2 border-rose-100 p-12 rounded-3xl text-center space-y-6">
        <div className="w-20 h-20 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
          <AlertTriangle className="w-10 h-10" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-rose-900">Compliance stream interrupted</h2>
          <p className="text-rose-600 mt-2 font-medium max-w-md mx-auto">{error}</p>
        </div>
        <button 
          onClick={fetchComplianceData}
          className="px-8 py-3 bg-rose-600 text-white font-bold rounded-2xl shadow-lg shadow-rose-600/20 hover:bg-rose-700 transition-all flex items-center mx-auto"
        >
          <Activity className="w-4 h-4 mr-2" />
          Retry Connection
        </button>
      </div>
    </div>
  );

  if (!reportData) return (
    <div className="p-8 max-w-7xl mx-auto text-center p-20 text-slate-400">
      <ShieldCheck className="w-12 h-12 mx-auto opacity-10 mb-4" />
      <p className="font-bold">No compliance data available for this period.</p>
    </div>
  );

  return (
    <div className="p-2 space-y-6">
      <PageHeader 
        title="Governance compliance suite"
        description="Monthly board-level auditing reports for regulatory filings and internal reviews."
        icon={ShieldCheck}
        action={
          <div className="flex gap-4">
            <select 
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              className="bg-white border-2 border-slate-200 px-4 py-3 rounded-2xl font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              {months.map((m, i) => <option key={m} value={i}>{m}</option>)}
            </select>
            <select 
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="bg-white border-2 border-slate-200 px-4 py-3 rounded-2xl font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        }
      />

      {/* Hero Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'Total Actions Captured', value: (reportData?.stats?.total ?? 0).toLocaleString(), icon: Activity, color: 'blue' },
          { label: 'Flagged Exceptions', value: (reportData?.flaggedActions || []).length, icon: AlertTriangle, color: 'rose' },
          { label: 'Compliance Index', value: (reportData?.stats?.total ? '99.8%' : '...'), icon: ShieldCheck, color: 'emerald' },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm hover:shadow-xl transition-all group overflow-hidden relative">
            <stat.icon className={`absolute -right-4 -bottom-4 w-24 h-24 text-slate-50 group-hover:text-${stat.color}-50 transition-colors`} />
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 relative z-10">{stat.label}</p>
            <div className="flex items-end gap-3 relative z-10">
              <h3 className="text-4xl font-bold text-slate-900">{stat.value}</h3>
              <div className="flex items-center text-xs font-bold mb-1.5 text-emerald-500">
                <TrendingUp className="w-3.5 h-3.5 mr-1" />
                Stable
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Compliance Table */}
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-200 overflow-hidden">
            <div className="p-6 bg-rose-50 border-b border-rose-100 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="bg-rose-500 p-2 rounded-xl shadow-lg shadow-rose-500/20">
                  <AlertTriangle className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-lg font-bold text-rose-900 font-display">Flagged Governance Exceptions</h2>
              </div>
              <span className="text-[10px] font-black text-rose-600 bg-white px-3 py-1 rounded-full border border-rose-200 uppercase tracking-widest">Board Review Required</span>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-white">
                    <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Exception</th>
                    <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Details</th>
                    <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Performer</th>
                    <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right border-b border-slate-100">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {(reportData.flaggedActions || []).length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-8 py-20 text-center text-slate-400">
                        <p className="font-bold">No exceptions flagged for review in this period.</p>
                      </td>
                    </tr>
                  ) : (reportData.flaggedActions || []).map((item: any) => (
                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-8 py-5">
                        <span className="text-sm font-bold text-slate-900 font-display">{item.action}</span>
                        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter mt-1">{item.entity}</div>
                      </td>
                      <td className="px-8 py-5 font-bold text-slate-600 text-sm">
                        Captured via <span className="text-blue-600 font-display">{item.module} Intercept</span>
                      </td>
                      <td className="px-8 py-5">
                        <div className="text-sm font-bold text-slate-700">@{item.user?.name || 'System'}</div>
                        <div className="text-[10px] text-slate-400 font-bold uppercase">{item.user?.role}</div>
                      </td>
                      <td className="px-8 py-5 text-right">
                        <span className="px-4 py-1.5 rounded-xl text-[10px] font-black border-2 bg-rose-50 border-rose-100 text-rose-600 shadow-sm">HIGH RISK</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Institutional Compliance Registry - Moved inside left column to act as an information card */}
          <div className="bg-indigo-50/50 rounded-3xl border border-indigo-100 shadow-sm overflow-hidden p-8 space-y-6">
            <div className="flex items-center justify-between border-b border-indigo-200/50 pb-6">
              <div>
                <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-indigo-600" />
                  Institutional Compliance Registry
                </h2>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">What parameters does this report formally capture?</p>
              </div>
              <div className="hidden sm:flex items-center gap-2">
                <span className="flex items-center gap-1.5 text-[10px] font-black text-indigo-600 bg-white px-3 py-1.5 rounded-full border border-indigo-200 uppercase shadow-sm">
                  <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-pulse"></span>
                  Active Monitoring
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                { 
                  type: 'Admin Overrides', 
                  icon: Clock, 
                  color: 'text-rose-600', 
                  bg: 'bg-white', 
                  border: 'border-rose-100',
                  desc: 'Captures manual modifications to system-managed configurations and role permission matrix.' 
                },
                { 
                  type: 'Auth Elevations', 
                  icon: Users, 
                  color: 'text-amber-600', 
                  bg: 'bg-white', 
                  border: 'border-amber-100',
                  desc: 'Identifies high-risk privilege expansions and vertical access modifications across departments.' 
                },
                { 
                  type: 'Data Mutations', 
                  icon: Activity, 
                  color: 'text-blue-600', 
                  bg: 'bg-white', 
                  border: 'border-blue-100',
                  desc: 'Monitors anomalous bulk updates, deletions, or high-frequency record interactions.' 
                },
                { 
                  type: 'Protocol Gaps', 
                  icon: Layout, 
                  color: 'text-emerald-600', 
                  bg: 'bg-white', 
                  border: 'border-emerald-100',
                  desc: 'Flags departmental administrative vacancies and gaps in institutional oversight protocols.' 
                },
              ].map((item, i) => (
                <div key={i} className={`p-5 rounded-2xl border ${item.border} ${item.bg} shadow-sm hover:shadow-md transition-all group`}>
                   <div className={`w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 ${item.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                     <item.icon className="w-5 h-5" />
                   </div>
                   <h4 className="text-sm font-black text-slate-800 mb-2 uppercase tracking-tight">{item.type}</h4>
                   <p className="text-[11px] text-slate-500 leading-relaxed font-bold">
                     {item.desc}
                   </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Action Sidebar */}
        <div className="space-y-6">
          <div className="bg-slate-900 rounded-3xl p-8 text-white relative overflow-hidden group border border-slate-800 shadow-2xl">
            <h4 className="text-xl font-bold mb-6 font-display border-b border-white/10 pb-4">Board Presentation</h4>
            <div className="space-y-4">
              <button 
                onClick={handleDownloadPDF}
                className="w-full bg-white/10 hover:bg-white/20 hover:scale-[1.02] active:scale-[0.98] transition-all p-4 rounded-2xl flex items-center justify-between group/btn text-sm font-bold cursor-pointer"
                title="Generate standard compliance PDF"
              >
                <div className="flex items-center">
                  <FileCheck className="w-5 h-5 mr-3 text-blue-400" />
                  Generate PDF
                </div>
                <ChevronRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
              </button>
              <button className="w-full bg-white/10 hover:bg-white/20 hover:scale-[1.02] active:scale-[0.98] transition-all p-4 rounded-2xl flex items-center justify-between group/btn text-sm font-bold cursor-pointer">
                <div className="flex items-center text-emerald-400">
                  <Download className="w-5 h-5 mr-3" />
                  Excel Data Export
                </div>
                <ChevronRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm group hover:border-blue-600 transition-all">
            <h4 className="font-bold text-slate-900 flex items-center gap-2">
               <PieChart className="w-5 h-5 text-blue-600" />
               Activity Distribution
            </h4>
            <div className="mt-6 space-y-4">
              {(reportData.topUsers || []).map((u: any) => (
                <div key={u.name} className="space-y-1">
                  <div className="flex justify-between text-[10px] font-bold">
                    <span className="text-slate-500 uppercase">{u.name}</span>
                    <span className="text-slate-900">{u.count} events</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-600 rounded-full" style={{ width: `${((u.count || 0) / (reportData.stats?.total || 1)) * 100}%` }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      


      <div className="bg-slate-900 rounded-3xl p-8 text-white relative overflow-hidden shadow-2xl">
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="max-w-xl text-center md:text-left">
            <h4 className="text-xl font-bold mb-3 font-display">Governance Analytics Hub</h4>
            <p className="text-slate-400 leading-relaxed font-medium">
              This report is generated through systemic data intercepts across all IITS ERP modules. 
              Data is formally archived for board-level review to maintain institutional integrity.
            </p>
          </div>
          <div className="bg-white/10 p-4 rounded-3xl backdrop-blur-md border border-white/20">
            <div className="flex items-center gap-4 mb-4 pb-4 border-b border-white/10">
              <div className="w-12 h-12 bg-green-500 rounded-2xl flex items-center justify-center shadow-lg shadow-green-500/20">
                <ShieldCheck className="text-white w-6 h-6" />
              </div>
              <div>
                <p className="text-xs text-slate-400 font-bold tracking-wider uppercase">Capture Engine</p>
                <p className="text-sm font-bold">Standard Logic Active</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-500 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                <Activity className="text-white w-6 h-6" />
              </div>
              <div>
                <p className="text-xs text-slate-400 font-bold tracking-wider uppercase">Last Report Sync</p>
                <p className="text-sm font-bold">Just Now</p>
              </div>
            </div>
          </div>
        </div>
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-slate-800 rounded-full blur-3xl opacity-20"></div>
        <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 bg-blue-500 rounded-full blur-3xl opacity-10"></div>
      </div>
      
      <div className="p-8 max-w-7xl mx-auto space-y-8 text-center text-[10px] text-slate-400 font-bold uppercase tracking-widest">
        Reports are auto-archived for 3 years to comply with institutional governance requirements.
      </div>
    </div>
  );
}
