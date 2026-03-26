import { useState } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { 
  Search, 
  User, 
  Clock, 
  ArrowRight,
  History,
  FileText
} from 'lucide-react';

export default function PermissionAudit() {
  const [auditLogs] = useState([
    { id: 1, user: 'Admin_Shobil', role: 'Dept Admin', feature: 'Finance > Fee Structures', prev: 'Read Only', next: 'Read + Write', time: '2026-03-25 02:30 PM' },
    { id: 2, user: 'Admin_Shobil', role: 'CEO', feature: 'Dashboard > Alerts', prev: 'Full Access', next: 'No Access', time: '2026-03-25 01:15 PM' },
    { id: 3, user: 'System', role: 'Employee', feature: 'Academic > Partner Universities', prev: 'No Access', next: 'Read Only', time: '2026-03-24 11:00 AM' },
    { id: 4, user: 'Admin_Shobil', role: 'Dept Admin', feature: 'Departments > All', prev: 'Read + Write', next: 'Full Access', time: '2026-03-24 09:45 AM' },
  ]);
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = () => {
    setIsExporting(true);
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(22);
    doc.setTextColor(15, 23, 42); // slate-900
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
    setIsExporting(false);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 font-display tracking-tight">Permission Change Audit</h1>
        <p className="text-slate-500 mt-1">Historic records of every modification made to the role permission matrix.</p>
      </div>

      <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/40 border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search by user or feature..." 
              className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
            />
          </div>
          <button 
            onClick={handleExport}
            disabled={isExporting}
            className={`px-4 py-2 text-sm font-bold flex items-center transition-colors rounded-xl border border-slate-200 shadow-sm ${
              isExporting ? 'text-slate-300 bg-slate-50 cursor-not-allowed' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <FileText className={`w-4 h-4 mr-2 ${isExporting ? 'animate-pulse' : ''}`} /> 
            {isExporting ? 'Generating PDF...' : 'Export Log'}
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Modified By</th>
                <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Role Affected</th>
                <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Feature / Page</th>
                <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Change Detail</th>
                <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {auditLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/30 transition-colors">
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                        <User className="w-4 h-4 text-slate-500" />
                      </div>
                      <span className="text-sm font-bold text-slate-900">{log.user}</span>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700">
                      {log.role}
                    </span>
                  </td>
                  <td className="px-8 py-5">
                    <span className="text-sm font-bold text-slate-700 font-display tracking-tight">{log.feature}</span>
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-slate-400 line-through decoration-slate-300">{log.prev}</span>
                      <ArrowRight className="w-3 h-3 text-emerald-500" />
                      <span className="font-bold text-slate-900">{log.next}</span>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex items-center text-xs text-slate-500 font-medium">
                      <Clock className="w-3.5 h-3.5 mr-2 text-slate-400" />
                      {log.time}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-slate-900 rounded-3xl p-8 text-white relative overflow-hidden group border border-slate-800">
        <History className="absolute top-0 right-0 -mr-8 -mt-8 w-48 h-48 text-white/5 rotate-12 group-hover:text-white/10 transition-all" />
        <div className="max-w-xl relative z-10">
          <h2 className="text-2xl font-bold mb-3 font-display">Audit Integrity and Governance</h2>
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
