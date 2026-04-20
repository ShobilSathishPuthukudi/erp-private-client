import { useState, Fragment } from 'react';
import { 
  Filter, 
  FileSpreadsheet,
  RefreshCw,
  SearchCheck,
  ChevronRight,
  Layout,
  Search,
  ArrowRight,
  Database,
  History,
  ShieldCheck,
  Download,
  Share2,
  Printer,
  Clock,
  User,
  Info,
  PlusCircle,
  Trash2
} from 'lucide-react';
import { api } from '@/lib/api';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';

export default function AuditFilterSearch() {
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    user: '',
    module: 'All',
    action: '',
    entity: ''
  });

  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [expandedRow, setExpandedRow] = useState<number | null>(null);

  const actions = ['Create', 'Update', 'Delete'];
  const entities = ['Student', 'Employee', 'Payment', 'Invoice', 'Department', 'User', 'Config', 'Center', 'Course', 'Vacancy', 'Leave', 'Task', 'Fee'];
  const modules = ['All', 'Auth', 'Academic', 'Finance', 'HR', 'Org-Admin', 'Security', 'Settings'];

  const handleSearch = async () => {
    setLoading(true);
    setHasSearched(true);
    try {
      const { data } = await api.get('/audit', { 
        params: { ...filters, limit: 100 }
      });

      if (filters.startDate && filters.endDate && new Date(filters.endDate) < new Date(filters.startDate)) {
        toast.error("Chronological Error: 'To' date must be after 'From' date.");
        setLoading(false);
        return;
      }

      setResults(data?.logs || []);
      setLoading(false);
    } catch (error: any) {
      console.error("Search failed", error);
      toast.error("Audit search unavailable (ECONNREFUSED)");
      setLoading(false);
    }
  };

  const handleExport = (type: 'xlsx' | 'csv') => {
    if (results.length === 0) {
      toast.error("No data to export. Execute search first.");
      return;
    }

    const exportData = (results || []).map(row => ({
      ID: row?.id,
      Entity: row?.entity,
      Action: row?.action,
      PerformedBy: row?.user?.name || 'System',
      Role: row?.user?.role || 'Service',
      Module: row?.module,
      Timestamp: row?.timestamp ? new Date(row.timestamp).toLocaleString() : 'N/A',
      Before: JSON.stringify(row?.before || {}),
      After: JSON.stringify(row?.after || {})
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Audit Logs");
    
    if (type === 'xlsx') {
      XLSX.writeFile(workbook, `audit_log_${new Date().getTime()}.xlsx`);
    } else {
      XLSX.writeFile(workbook, `audit_log_${new Date().getTime()}.csv`, { bookType: 'csv' });
    }
    toast.success(`Exported to ${type.toUpperCase()}`);
  };

  const handlePrint = () => {
    window.print();
    toast.success('Preparing forensic report for print...');
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success('Report link copied to clipboard');
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 pb-32">
      {/* Premium Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-slate-900/20">
            <SearchCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 font-display tracking-tight">Forensic search intelligence</h1>
            <p className="text-slate-500 mt-1 font-medium text-sm tracking-tight text-[11px] uppercase opacity-70">Isolate behavioral patterns and institutional data mutations.</p>
          </div>
        </div>
        <div className="flex gap-3 items-center">
          <button 
            onClick={handleShare}
            className="p-2.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all active:scale-95 group cursor-pointer border border-transparent hover:border-blue-100"
            title="Share Forensic Query"
          >
            <Share2 className="w-5 h-5 group-hover:scale-110 transition-transform" />
          </button>
          
          <button 
            onClick={handlePrint}
            className="p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all active:scale-95 group cursor-pointer border border-transparent hover:border-indigo-100"
            title="Print Forensic Report"
          >
            <Printer className="w-5 h-5 group-hover:scale-110 transition-transform" />
          </button>

          <div className="w-px h-6 bg-slate-200 mx-1"></div>

          <button 
            onClick={handleSearch}
            className="flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-2xl font-bold hover:bg-slate-800 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-slate-900/20 group cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 group-hover:rotate-180 transition-transform duration-500 ${loading ? 'animate-spin' : ''}`} />
            Search
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Primary Search Filters */}
        <div className="lg:col-span-3 space-y-8">
          <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl shadow-slate-200/40 overflow-hidden">
            <div className="bg-slate-50/50 p-6 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
                  <Filter className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest leading-none">Search parameters</h2>
                  <p className="text-[10px] text-slate-400 font-bold tracking-tight mt-1 uppercase">Define your investigation scope</p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setFilters({ startDate: '', endDate: '', user: '', module: 'All', action: '', entity: '' });
                  setResults([]);
                  setHasSearched(false);
                }}
                className="text-xs font-black text-slate-400 hover:text-rose-600 transition-colors uppercase tracking-widest px-4 py-2 hover:bg-rose-50 rounded-xl"
              >
                Reset Filters
              </button>
            </div>
            
            <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Date Boundary (From / To)</label>
                  <div className="flex flex-row items-center gap-3 w-full bg-slate-50 p-2 rounded-2xl border border-slate-100">
                    <input 
                      type="date" 
                      value={filters.startDate}
                      onChange={(e) => {
                        const newStart = e.target.value;
                        setFilters({
                          ...filters, 
                          startDate: newStart,
                          endDate: (filters.endDate && new Date(filters.endDate) < new Date(newStart)) ? newStart : filters.endDate
                        });
                      }}
                      className="flex-1 min-w-0 px-3 py-2 bg-white border border-slate-100 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-sans" 
                    />
                    <ArrowRight className={`w-3 h-3 flex-shrink-0 ${filters.startDate ? 'text-blue-500' : 'text-slate-300'}`} />
                    <input 
                      type="date" 
                      value={filters.endDate}
                      disabled={!filters.startDate}
                      min={filters.startDate}
                      onChange={(e) => setFilters({...filters, endDate: e.target.value})}
                      className="flex-1 min-w-0 px-3 py-2 bg-white border border-slate-100 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-sans" 
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Action Engine</label>
                  <div className="flex gap-2 bg-slate-50 p-2 rounded-2xl border border-slate-100">
                    {actions.map(action => (
                      <button
                        key={action}
                        onClick={() => setFilters({...filters, action: filters.action === action ? '' : action})}
                        className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                          filters.action === action
                          ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/20'
                          : 'bg-white text-slate-400 hover:text-slate-600 shadow-sm border border-slate-100'
                        }`}
                      >
                        {action}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Institutional Module</label>
                  <select 
                    value={filters.module}
                    onChange={(e) => setFilters({...filters, module: e.target.value})}
                    className="w-full px-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/10 transition-all appearance-none cursor-pointer"
                  >
                    {modules.map(mod => <option key={mod} value={mod}>{mod}</option>)}
                  </select>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Target Entity Type</label>
                  <select 
                    value={filters.entity}
                    onChange={(e) => setFilters({...filters, entity: e.target.value})}
                    className="w-full px-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/10 transition-all appearance-none cursor-pointer"
                  >
                    <option value="">(Universal Search)</option>
                    {entities.map(ent => <option key={ent} value={ent}>{ent}</option>)}
                  </select>
                </div>
            </div>
          </div>

          {hasSearched && (
            <div className="bg-white rounded-[2rem] border border-slate-200 overflow-hidden shadow-2xl shadow-slate-200/60 animate-in fade-in slide-in-from-bottom-4 duration-700">
              <div className="p-5 bg-slate-900 text-white flex justify-between items-center px-8">
                <div className="flex items-center gap-3">
                   <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                   <span className="text-[10px] font-black uppercase tracking-[0.2em]">{results.length} Verified Intelligence Matches</span>
                </div>
                <div className="flex items-center gap-4 text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                   <span>Full Ledger Snapshot</span>
                </div>
              </div>

              <div className="overflow-x-auto overflow-y-hidden">
                <table className="w-full text-left border-collapse table-fixed">
                  <thead className="bg-slate-50/80 text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] border-b border-slate-100">
                    <tr>
                      <th className="px-8 py-5 w-[30%]">Action & Entity</th>
                      <th className="px-8 py-5 w-[30%]">Performer</th>
                      <th className="px-8 py-5 w-[20%]">Module</th>
                      <th className="px-8 py-5 w-[20%] text-right">Verification</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {loading ? (
                      <tr>
                        <td colSpan={4} className="py-32 text-center">
                          <div className="flex flex-col items-center justify-center gap-4">
                             <div className="w-10 h-10 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin"></div>
                             <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Sifting deep telemetry...</p>
                          </div>
                        </td>
                      </tr>
                    ) : results.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-32 text-center px-8">
                           <div className="flex flex-col items-center justify-center gap-3 text-slate-300">
                              <Search className="w-12 h-12 opacity-20" />
                              <p className="font-black text-[10px] tracking-widest uppercase">No matching telemetry found in snapshot.</p>
                           </div>
                        </td>
                      </tr>
                    ) : (results || []).map(row => (
                      <Fragment key={row.id}>
                        <tr 
                          className={`hover:bg-slate-50 transition-all cursor-pointer group ${expandedRow === row.id ? 'bg-blue-50/30' : ''}`} 
                          onClick={() => setExpandedRow(expandedRow === row.id ? null : row.id)}
                        >
                          <td className="px-8 py-6">
                            <div className="flex items-center gap-4">
                               <div className={`p-2.5 rounded-xl border ${
                                 row.action === 'Create' ? 'bg-emerald-50 border-emerald-100 text-emerald-600' :
                                 row.action === 'Update' ? 'bg-blue-50 border-blue-100 text-blue-600' : 'bg-rose-50 border-rose-100 text-rose-600'
                               }`}>
                                  <Database className="w-4 h-4" />
                               </div>
                               <div className="min-w-0 flex-1">
                                 <div className="font-black text-slate-900 text-sm tracking-tight uppercase leading-none truncate w-full block" title={row?.action}>
                                   {row?.action}
                                 </div>
                                 <div className="text-[10px] font-black text-blue-600 tracking-tight mt-1 uppercase opacity-80 truncate" title={row?.entity}>{row?.entity}</div>
                               </div>
                            </div>
                          </td>
                          <td className="px-8 py-6">
                            <div className="flex items-center gap-3">
                               <div className="w-8 h-8 rounded-full bg-slate-900 flex items-center justify-center text-white text-[10px] font-black">
                                  {(row?.user?.name || 'S').charAt(0)}
                               </div>
                               <div>
                                 <div className="font-bold text-slate-700 text-xs tracking-tight">@{row?.user?.name || 'System'}</div>
                                 <div className="text-[10px] text-slate-400 uppercase font-black tracking-widest mt-0.5">{row?.user?.role || 'Service'}</div>
                               </div>
                            </div>
                          </td>
                          <td className="px-8 py-6">
                            <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest bg-slate-100 px-2 py-1 rounded inline-block">
                              {row.module}
                            </div>
                            <div className="text-[9px] font-black text-slate-400 uppercase tracking-tighter mt-1">
                              {row.timestamp ? new Date(row.timestamp).toLocaleDateString() : 'N/A'}
                            </div>
                          </td>
                          <td className="px-8 py-6 text-right">
                            <button className={`inline-flex items-center px-4 py-2 rounded-2xl text-[10px] font-black tracking-widest uppercase transition-all ${
                              expandedRow === row.id 
                              ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/30 ring-4 ring-slate-900/10' 
                              : 'bg-white text-slate-400 border border-slate-100 hover:border-slate-300 group-hover:bg-slate-100'
                            }`}>
                              {expandedRow === row.id ? 'Collapse' : 'Details'}
                            </button>
                          </td>
                        </tr>
                        {expandedRow === row.id && (
                          <tr className="bg-slate-50/50">
                            <td colSpan={4} className="px-8 py-10">
                              <div className="mb-8 flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-100 shadow-sm border-l-4 border-l-blue-600">
                                <div className="flex items-center gap-4">
                                  <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400">
                                    <Info className="w-5 h-5" />
                                  </div>
                                  <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Investigation Target</p>
                                    <h3 className="text-sm font-black text-slate-900 uppercase">
                                      {row?.action} <span className="text-blue-500 mx-2 text-xs opacity-50">/</span> {row?.entity}
                                    </h3>
                                  </div>
                                </div>
                                <div className="flex items-center gap-3">
                                  <div className="text-right">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Performer Handle</p>
                                    <p className="text-xs font-bold text-slate-700 tracking-tight">@{row?.user?.name || 'System'}</p>
                                  </div>
                                  <div className="w-9 h-9 rounded-full bg-slate-900 flex items-center justify-center text-white text-[10px] font-black">
                                    {(row?.user?.name || 'S').charAt(0)}
                                  </div>
                                </div>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-start">
                                <div className="space-y-4">
                                  <div className="flex items-center gap-2 px-1">
                                    <div className="w-1.5 h-1.5 rounded-full bg-slate-400"></div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Baseline State (Previous)</p>
                                  </div>
                                  <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-inner-sm max-h-[300px] overflow-y-auto font-sans">
                                    {row.before ? (
                                      Object.entries(row.before).map(([k, v]) => (
                                        <div key={k} className="flex justify-between items-center text-[11px] border-b border-slate-50 py-3 last:border-0 hover:bg-slate-50/50 px-2 rounded-lg transition-colors">
                                          <span className="font-black text-slate-400 uppercase tracking-tighter w-1/3">{k}</span>
                                          <span className="font-bold text-slate-600 text-right w-2/3 truncate" title={String(v)}>
                                            {typeof v === 'object' ? 'JSON_DATA' : String(v)}
                                          </span>
                                        </div>
                                      ))
                                    ) : (
                                      <div className="flex flex-col items-center justify-center py-12 text-slate-200">
                                         <PlusCircle className="w-8 h-8 opacity-20 mb-2" />
                                         <p className="text-[10px] font-black uppercase tracking-widest">Initial Provisioning</p>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                <div className="space-y-4">
                                  <div className="flex items-center gap-2 px-1">
                                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                                    <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Resultant State (Updated)</p>
                                  </div>
                                  <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-inner-sm max-h-[300px] overflow-y-auto font-sans">
                                    {row.after ? (
                                      Object.entries(row.after).map(([k, v]) => (
                                        <div key={k} className="flex justify-between items-center text-[11px] border-b border-slate-50 py-3 last:border-0 hover:bg-blue-50/30 px-2 rounded-lg transition-colors">
                                          <span className="font-black text-slate-400 uppercase tracking-tighter w-1/3">{k}</span>
                                          <span className="font-black text-slate-900 text-right w-2/3 truncate" title={String(v)}>
                                            {typeof v === 'object' ? 'JSON_DATA' : String(v)}
                                          </span>
                                        </div>
                                      ))
                                    ) : (
                                      <div className="flex flex-col items-center justify-center py-12 text-rose-200">
                                         <Trash2 className="w-8 h-8 opacity-20 mb-2" />
                                         <p className="text-[10px] font-black uppercase tracking-widest">Resource Decommissioned</p>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Intelligence Sidebar */}
        <div className="space-y-8">
          <div className="bg-slate-900 rounded-[2rem] p-8 text-white shadow-2xl relative overflow-hidden group border border-slate-800">
            <Layout className="absolute top-0 right-0 -mr-8 -mt-8 w-48 h-48 text-white/5 rotate-12 transition-transform duration-1000 group-hover:rotate-45" />
            <div className="relative z-10">
              <h3 className="text-sm font-black mb-6 font-display uppercase tracking-widest border-b border-white/10 pb-4">Forensic Manifest</h3>
              <div className="space-y-4">
                <button 
                  onClick={() => handleExport('xlsx')}
                  className="w-full bg-white/5 hover:bg-white/10 border border-white/10 hover:scale-[1.02] active:scale-[0.98] transition-all p-4 rounded-2xl flex items-center justify-between group/btn text-xs font-black uppercase tracking-widest"
                >
                  <div className="flex items-center">
                    <FileSpreadsheet className="w-5 h-5 mr-3 text-blue-400" />
                    Structured Excel
                  </div>
                  <ChevronRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                </button>
                <button 
                  onClick={() => handleExport('csv')}
                  className="w-full bg-white/5 hover:bg-white/10 border border-white/10 hover:scale-[1.02] active:scale-[0.98] transition-all p-4 rounded-2xl flex items-center justify-between group/btn text-xs font-black uppercase tracking-widest text-slate-400 hover:text-white"
                >
                  <div className="flex items-center">
                    <Download className="w-5 h-5 mr-3" />
                    Flat CSV File
                  </div>
                  <ChevronRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-[2rem] border border-slate-200 p-8 shadow-sm group hover:border-blue-600 transition-all border-b-4 border-b-blue-600">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-blue-50 p-2 rounded-xl text-blue-600">
                 <Info className="w-5 h-5" />
              </div>
              <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Inquiry Intelligence</h4>
            </div>
            <p className="text-[11px] text-slate-500 border-l-4 border-blue-500 pl-4 py-2 bg-blue-50/20 rounded-r-xl leading-relaxed font-bold uppercase tracking-tight">
              Large snapshots require high overhead. 
              Narrow your date boundary to optimize telemetry speed.
            </p>
          </div>
        </div>
      </div>
      
      <div className="text-center text-[10px] font-black text-slate-400 uppercase tracking-widest opacity-50 py-10">
         IITS institutional governance search engine v1.4.2 stable
      </div>
    </div>
  );
}
