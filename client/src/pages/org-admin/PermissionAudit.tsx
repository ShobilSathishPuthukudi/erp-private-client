import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { 
  ArrowRight,
  History,
  ShieldCheck,
  Download,
  Share2,
  Printer,
  Search,
  Clock
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function PermissionAudit() {
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchAuditLogs();
  }, []);

  const fetchAuditLogs = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/org-admin/audit/permissions');
      setAuditLogs(data);
    } catch (error) {
      console.error('Audit Fetch Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = auditLogs.filter(log => 
    log.user?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    log.feature?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleExport = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(22);
    doc.setTextColor(15, 23, 42);
    doc.text('Permission Change Audit Log', 14, 22);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 30);
    doc.text('Institutional Compliance Record - Immutable Transaction Log', 14, 35);

    autoTable(doc, {
      startY: 45,
      head: [['Modified By', 'Affected Role', 'Feature / Page', 'Action', 'From', 'To', 'Timestamp']],
      body: auditLogs.map(log => [
        log.user,
        log.role,
        log.feature,
        'Access Level Change',
        log.prev,
        log.next,
        log.time
      ]),
      headStyles: { 
        fillColor: [15, 23, 42], 
        textColor: [255, 255, 255],
        fontSize: 10,
        fontStyle: 'bold'
      },
      bodyStyles: {
        fontSize: 9,
        textColor: [51, 65, 85]
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252]
      },
      margin: { top: 45 }
    });

    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(`Page ${i} of ${pageCount} - Confidential ERP Audit Record`, 14, doc.internal.pageSize.getHeight() - 10);
    }

    doc.save(`Permission_Audit_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const handlePrint = () => {
    window.print();
    toast.success('Preparing audit record for print...');
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success('Audit link copied to clipboard');
  };

  return (
    <div className="p-2 space-y-6 pb-32">
      <PageHeader 
        title="Permission change audit"
        description="Historic records of every modification made to the institutional permission matrix."
        icon={ShieldCheck}
        action={
          <div className="flex gap-3 items-center">
            <button 
              onClick={handleShare}
              className="p-2.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all active:scale-95 group cursor-pointer border border-transparent hover:border-blue-100"
              title="Share audit report"
            >
              <Share2 className="w-5 h-5 group-hover:scale-110 transition-transform" />
            </button>
            
            <button 
              onClick={handlePrint}
              className="p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all active:scale-95 group cursor-pointer border border-transparent hover:border-indigo-100"
              title="Print audit report"
            >
              <Printer className="w-5 h-5 group-hover:scale-110 transition-transform" />
            </button>

            <div className="w-px h-6 bg-slate-200 mx-1"></div>

            <button 
              onClick={handleExport}
              className="p-2.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all active:scale-95 group cursor-pointer border border-transparent hover:border-slate-200"
              title="Download/export log"
            >
              <Download className="w-5 h-5 group-hover:scale-125 transition-transform" />
            </button>
          </div>
        }
      />

      <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white p-2 rounded-3xl border border-slate-200 shadow-sm">
        <div className="relative flex-1 group w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
          <input 
            type="text" 
            placeholder="Search by user or feature..." 
            className="w-full pl-12 pr-4 py-3 bg-slate-50 border-none rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/40 border border-slate-200 overflow-hidden min-h-[400px]">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Modified by</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Role affected</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Feature / Page</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Change detail</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-24 text-center">
                    <div className="flex flex-col items-center gap-3">
                       <div className="w-10 h-10 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin"></div>
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Consulting governance history...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-24 text-center">
                    <div className="flex flex-col items-center gap-2">
                       <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-200">
                          <History className="w-8 h-8" />
                       </div>
                       <p className="text-sm font-bold text-slate-900">No permission changes recorded yet.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/50 transition-all group">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-900 flex items-center justify-center text-white text-[10px] font-bold">
                           {log.user ? log.user.charAt(0) : 'U'}
                        </div>
                        <div className="flex flex-col">
                           <span className="text-xs font-bold text-slate-900">{log.user || "Institutional Admin"}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5 text-center">
                      <span className="px-3 py-1 rounded-full text-[9px] font-black tracking-widest border bg-blue-100 text-blue-700 border-blue-200 uppercase">
                        {log.role}
                      </span>
                    </td>
                    <td className="px-8 py-5">
                      <span className="text-xs font-bold text-slate-800 font-display tracking-tight leading-relaxed">{log.feature}</span>
                    </td>
                    <td className="px-8 py-5 text-center">
                      <div className="flex items-center justify-center gap-2 text-xs">
                        <span className="text-slate-400 font-medium line-through decoration-slate-200 underline-offset-2">{log.prev}</span>
                        <ArrowRight className="w-3 h-3 text-emerald-500" />
                        <span className="font-bold text-slate-900 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 text-[10px] uppercase">{log.next}</span>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex items-center text-xs text-slate-500 font-bold">
                        <Clock className="w-3.5 h-3.5 mr-2 text-slate-300" />
                        {log.time}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-slate-900 rounded-3xl p-8 text-white relative overflow-hidden group border border-slate-800 shadow-2xl">
        <History className="absolute top-0 right-0 -mr-8 -mt-8 w-64 h-64 text-white/5 rotate-12 group-hover:text-white/10 transition-all duration-1000 group-hover:rotate-45" />
        <div className="max-w-2xl relative z-10">
          <h4 className="text-xl font-bold mb-3 font-display">Audit Integrity and Governance</h4>
          <p className="text-slate-400 text-sm leading-relaxed font-medium">
            This log is immutable and system-generated. No user, including the Org Admin, can delete 
            or modify these records. It serves as the primary source of truth for compliance checks 
            regarding data security and access elevation incidents.
          </p>
        </div>
      </div>
    </div>
  );
}
