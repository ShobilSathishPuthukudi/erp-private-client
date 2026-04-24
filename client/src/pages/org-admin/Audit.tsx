import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Modal } from '@/components/shared/Modal';
import { 
  Eye, 
  ShieldCheck, 
  Search, 
  Filter, 
  Download, 
  LayoutGrid, 
  List, 
  RotateCcw,
  Clock,
  History,
  User,
  Activity,
  ArrowRight,
  Share2,
  Printer
} from 'lucide-react';
import toast from 'react-hot-toast';
import { toSentenceCase } from '@/lib/utils';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { PageHeader } from '@/components/shared/PageHeader';

interface AuditLogEntry {
  id: number;
  entity: string;
  action: string;
  userId: string;
  before: any;
  after: any;
  module: string;
  timestamp: string;
  user?: {
    name: string;
    email: string;
    role: string;
  };
}

export default function AuditLogs() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterModule, setFilterModule] = useState('All');

  const fetchLogs = async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/audit');
      setLogs(res.data);
    } catch (error: any) {
      if (error.response?.status !== 404) {
        toast.error('Failed to fetch audit logs');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const handleExportExcel = () => {
    const data = filteredLogs.map(log => ({
      ID: log.id,
      Timestamp: new Date(log.timestamp).toLocaleString(),
      Actor: log.user?.name || log.userId,
      Action: log.action,
      Entity: log.entity,
      Module: log.module
    }));
    
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "System Audit Log");
    XLSX.writeFile(wb, "IITS_System_Audit_Log.xlsx");
    toast.success('Excel audit report generated');
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    const tableData = filteredLogs.map(log => [
      new Date(log.timestamp).toLocaleString(),
      log.user?.name || log.userId,
      log.action,
      log.entity,
      log.module
    ]);

    doc.setFontSize(18);
    doc.text('Institutional Audit Ledger', 14, 22);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 30);

    autoTable(doc, {
      startY: 35,
      head: [['Timestamp', 'Actor/Operator', 'Action', 'Entity', 'Domain']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [15, 23, 42] },
      styles: { fontSize: 8 }
    });

    doc.save("IITS_Audit_Ledger.pdf");
    toast.success('PDF Audit ledger generated');
  };

  const handlePrint = () => {
    window.print();
    toast.success('Preparing ledger for print...');
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success('Ledger link copied to clipboard');
  };

  const modules = ['All', ...Array.from(new Set(logs.map(l => l.module)))];

  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      log.entity.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.user?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.action.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesModule = filterModule === 'All' || log.module === filterModule;
    
    return matchesSearch && matchesModule;
  });

  return (
    <div className="p-2 space-y-6 pb-32">
      {/* Premium Header - Sourced from RolesList */}
      <PageHeader 
        title="System audit ledger"
        description="Immutable record of high-authority institutional modifications."
        icon={History}
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

            <div className="relative group/export">
              <button 
                className="p-2.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all active:scale-95 group cursor-pointer border border-transparent hover:border-slate-200"
                title="Download/export ledger"
              >
                <Download className="w-5 h-5 group-hover:scale-125 transition-transform" />
              </button>
              <div className="absolute right-0 top-full pt-2 hidden group-hover/export:block z-50">
                <div className="w-48 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2">
                  <button 
                    onClick={handleExportExcel}
                    className="w-full text-left px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all border-b border-slate-100 cursor-pointer uppercase tracking-tight"
                  >
                    Excel (.xlsx) manifest
                  </button>
                  <button 
                    onClick={handleExportPDF}
                    className="w-full text-left px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all cursor-pointer uppercase tracking-tight"
                  >
                    PDF (.pdf) document
                  </button>
                </div>
              </div>
            </div>

            <button 
              onClick={fetchLogs}
              disabled={isLoading}
              className="flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-2xl font-bold hover:bg-slate-800 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-slate-900/20 group cursor-pointer"
            >
              <RotateCcw className={`w-4 h-4 group-hover:rotate-180 transition-transform duration-500 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        }
      />

      {/* Control Bar - Sourced from RolesList */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white p-2 rounded-3xl border border-slate-200 shadow-sm">
        <div className="relative flex-1 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
          <input 
            type="text" 
            placeholder="Search by entity, actor or action..." 
            className="w-full pl-12 pr-4 py-3 bg-slate-50 border-none rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200 shadow-inner">
            <div className="flex items-center gap-2 px-3">
              <Filter className="w-3 h-3 text-slate-400" />
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Domain</span>
            </div>
            <select 
              className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold outline-none focus:ring-0 text-slate-700 cursor-pointer shadow-sm"
              value={filterModule}
              onChange={(e) => setFilterModule(e.target.value)}
            >
              {modules.map(m => (
                <option key={m} value={m}>{toSentenceCase(m)}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center bg-white p-1 rounded-2xl border border-slate-200 shadow-sm gap-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2.5 rounded-xl transition-all cursor-pointer ${
                viewMode === 'grid' 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20 px-4' 
                  : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2.5 rounded-xl transition-all cursor-pointer ${
                viewMode === 'list' 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20 px-4' 
                  : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
              }`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid/List View - Sourced from RolesList */}
      <div className="min-h-[400px]">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 space-y-4 bg-white rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/40">
            <div className="w-12 h-12 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin"></div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest animate-pulse">Consulting system ledger...</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 space-y-4 bg-white rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/40">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-200">
               <ShieldCheck className="w-8 h-8" />
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-slate-900">No audit records found</p>
              <p className="text-sm text-slate-500">System activities will materialize here after modifications.</p>
            </div>
          </div>
        ) : viewMode === 'list' ? (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/40 overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Timestamp</th>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Action</th>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Operator</th>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Entity & Domain</th>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 font-medium">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/50 transition-all group cursor-pointer" onClick={() => setSelectedLog(log)}>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2 text-slate-600">
                         <Clock className="w-3.5 h-3.5 text-slate-300" />
                         <span className="text-xs font-bold">{new Date(log.timestamp).toLocaleString()}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <span className={`px-3 py-1 rounded-full text-[9px] font-black tracking-widest border ${
                        log.action === 'CREATE' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                        log.action === 'UPDATE' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
                        log.action === 'DELETE' ? 'bg-rose-100 text-rose-700 border-rose-200' :
                        'bg-slate-100 text-slate-700 border-slate-200'
                      }`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-900 flex items-center justify-center text-white text-[10px] font-bold">
                           {log.user?.name ? log.user.name.charAt(0) : 'S'}
                        </div>
                        <div className="flex flex-col">
                           <span className="text-xs font-bold text-slate-900">{log.user?.name || "System Operator"}</span>
                           <span className="text-[10px] text-slate-400">{log.user?.email || "internal@system.logic"}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2">
                         <span className="text-sm font-bold text-slate-800">{toSentenceCase(log.entity)}</span>
                         <ArrowRight className="w-3 h-3 text-slate-300" />
                         <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest bg-slate-100 px-2 py-0.5 rounded">
                           {toSentenceCase(log.module)}
                         </span>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <button className="p-2 text-slate-400 group-hover:text-blue-600 group-hover:bg-blue-50 rounded-xl transition-all">
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredLogs.map((log) => (
              <div 
                key={log.id} 
                onClick={() => setSelectedLog(log)}
                className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden group cursor-pointer transition-all duration-500 hover:shadow-2xl hover:border-blue-400/30 hover:-translate-y-2 hover:scale-[1.01]"
              >
                <div className={`h-1.5 transition-all duration-300 ${
                   log.action === 'CREATE' ? 'bg-blue-400 group-hover:bg-blue-600' : 
                   log.action === 'UPDATE' ? 'bg-emerald-400 group-hover:bg-emerald-600' : 
                   log.action === 'DELETE' ? 'bg-rose-400 group-hover:bg-rose-600' : 'bg-slate-400'
                }`}></div>
                
                <div className="p-6 space-y-6">
                   <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                         <div className="w-10 h-10 rounded-2xl bg-slate-900 flex items-center justify-center text-white shadow-lg shadow-slate-900/20 group-hover:scale-110 transition-transform">
                            {log.user?.name ? log.user.name.charAt(0) : <History className="w-5 h-5" />}
                         </div>
                         <div className="flex flex-col">
                            <h3 className="text-sm font-bold text-slate-900 tracking-tight">{log.user?.name || "System Operator"}</h3>
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">{log.user?.role || "Logic Layer"}</span>
                         </div>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-black tracking-widest border ${
                        log.action === 'CREATE' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                        log.action === 'UPDATE' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                        log.action === 'DELETE' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                        'bg-slate-50 text-slate-400 border-slate-100'
                      }`}>
                        {log.action}
                      </span>
                   </div>

                   <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-3">
                      <div className="flex items-center justify-between">
                         <div className="flex items-center gap-2">
                           <Activity className="w-3.5 h-3.5 text-slate-400" />
                           <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Entry Detail</span>
                         </div>
                         <span className="text-[9px] text-slate-400 font-bold italic">#{log.id}</span>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                         <p className="text-xs font-bold text-slate-800 truncate">{toSentenceCase(log.entity)}</p>
                         <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest bg-white px-2 py-1 rounded shadow-sm border border-slate-100 whitespace-nowrap">
                           {toSentenceCase(log.module)}
                         </span>
                      </div>
                   </div>

                   <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                      <div className="flex items-center gap-2 text-slate-400">
                         <Clock className="w-3 h-3" />
                         <span className="text-[10px] font-bold">{new Date(log.timestamp).toLocaleDateString()}</span>
                      </div>
                      <button className="text-xs font-bold text-blue-600 flex items-center gap-1 group-hover:gap-2 transition-all">
                         Investigate <ArrowRight className="w-3 h-3" />
                      </button>
                   </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal
        isOpen={!!selectedLog}
        onClose={() => setSelectedLog(null)}
        title="Institutional Audit Investigation"
      >
        {selectedLog && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-6 bg-slate-50 p-6 rounded-3xl border border-slate-200">
              <div className="space-y-1">
                <div className="flex items-center gap-2 mb-2">
                   <User className="w-4 h-4 text-slate-400" />
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Operator Identity</p>
                </div>
                <p className="text-base font-black text-slate-900 tracking-tight">{selectedLog.user?.name || selectedLog.userId}</p>
                <p className="text-xs text-slate-500 font-medium">{selectedLog.user?.email || 'Low-level system operation'}</p>
                <span className="inline-block mt-2 px-2.5 py-1 bg-slate-900 text-white text-[9px] font-black rounded-lg uppercase tracking-widest">
                   {selectedLog.user?.role || "System Administrator"}
                </span>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 mb-2">
                   <ShieldCheck className="w-4 h-4 text-slate-400" />
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Governance Meta</p>
                </div>
                <p className="text-base font-black text-blue-600 tracking-tight">
                  {selectedLog.action} <span className="text-slate-900">{toSentenceCase(selectedLog.entity)}</span>
                </p>
                <p className="text-xs text-slate-500 font-medium">{new Date(selectedLog.timestamp).toUTCString()}</p>
                <div className="mt-2 flex items-center gap-2">
                   <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[9px] font-black rounded uppercase">
                     {selectedLog.module}
                   </span>
                   <span className="px-2 py-0.5 bg-slate-200 text-slate-500 text-[9px] font-black rounded uppercase">
                     Node: #{selectedLog.id}
                   </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between px-2">
                   <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Registry State (Before)</p>
                   <span className="text-[8px] px-1.5 py-0.5 bg-slate-100 text-slate-400 rounded-full font-bold uppercase">Archive</span>
                </div>
                <pre className="bg-slate-950 text-slate-300 p-6 rounded-3xl text-[10px] font-mono overflow-x-auto max-h-96 border border-slate-800 shadow-2xl">
                  {JSON.stringify(selectedLog.before, null, 2) || 'null'}
                </pre>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between px-2">
                   <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Registry State (After)</p>
                   <span className="text-[8px] px-1.5 py-0.5 bg-emerald-100 text-emerald-600 rounded-full font-bold uppercase">Mutated</span>
                </div>
                <pre className="bg-slate-950 text-emerald-400 p-6 rounded-3xl text-[10px] font-mono overflow-x-auto max-h-96 border border-emerald-900/30 shadow-2xl">
                  {JSON.stringify(selectedLog.after, null, 2) || 'null'}
                </pre>
              </div>
            </div>
            
            <div className="flex justify-end pt-6 border-t border-slate-100 gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedLog(null)}
                  className="px-8 py-3 bg-slate-900 text-white rounded-2xl hover:bg-slate-800 transition-all text-xs font-black uppercase tracking-[0.2em] shadow-lg shadow-slate-900/20 cursor-pointer active:scale-95"
                >
                  Terminate Investigation
                </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
