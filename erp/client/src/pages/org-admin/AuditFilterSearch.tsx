import { useState, Fragment } from 'react';
import { 
  Filter, 
  FileSpreadsheet,
  RefreshCw,
  SearchCheck,
  ChevronRight,
  Layout
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
        params: { ...filters, limit: 100 } // Get more for search view
      });
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

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 font-display tracking-tight">Advanced Audit Intelligence</h1>
          <p className="text-slate-500 mt-1 font-medium">Filter deep into the system history to isolate specific incidents or behavioral patterns.</p>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={() => {
              setFilters({ startDate: '', endDate: '', user: '', module: 'All', action: '', entity: '' });
              setResults([]);
              setHasSearched(false);
            }}
            className="px-6 py-3 bg-white border-2 border-slate-200 rounded-2xl text-sm font-bold text-slate-600 hover:border-slate-300 transition-all flex items-center shadow-sm"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Reset
          </button>
          <button 
            onClick={handleSearch}
            className="px-8 py-3 bg-slate-900 text-white font-bold rounded-2xl text-sm shadow-xl shadow-slate-900/10 flex items-center hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            <SearchCheck className="w-4 h-4 mr-2" />
            Execute Search
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Primary Search Filters */}
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/40 overflow-hidden">
            <div className="bg-slate-50 p-6 border-b border-slate-100 flex items-center gap-3">
              <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
                <Filter className="w-5 h-5 text-slate-600" />
              </div>
              <h2 className="text-lg font-bold text-slate-900 font-display">Search Parameters</h2>
            </div>
            
            <div className="p-8 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">Date Boundary (From/To)</label>
                  <div className="flex items-center gap-3">
                    <input 
                      type="date" 
                      value={filters.startDate}
                      onChange={(e) => setFilters({...filters, startDate: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500" 
                    />
                    <ChevronRight className="w-4 h-4 text-slate-300" />
                    <input 
                      type="date" 
                      value={filters.endDate}
                      onChange={(e) => setFilters({...filters, endDate: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500" 
                    />
                  </div>
                </div>
                <div className="space-y-3">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">Module Filter</label>
                  <select 
                    value={filters.module}
                    onChange={(e) => setFilters({...filters, module: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {modules.map(mod => <option key={mod} value={mod}>{mod}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">Action Type</label>
                  <div className="flex gap-2">
                    {actions.map(action => (
                      <button
                        key={action}
                        onClick={() => setFilters({...filters, action: filters.action === action ? '' : action})}
                        className={`flex-1 py-3 rounded-xl border-2 font-bold text-xs transition-all ${
                          filters.action === action
                          ? 'border-slate-900 bg-slate-900 text-white'
                          : 'border-slate-100 bg-slate-50 text-slate-400 hover:border-slate-200'
                        }`}
                      >
                        {action}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-3">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">Entity Type</label>
                  <select 
                    value={filters.entity}
                    onChange={(e) => setFilters({...filters, entity: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Entity...</option>
                    {entities.map(ent => <option key={ent} value={ent}>{ent}</option>)}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {hasSearched && (
            <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xl shadow-slate-200/40">
              <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
                <span className="text-xs font-bold uppercase tracking-widest">Search Results: {results.length} Matches</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b">
                    <tr>
                      <th className="px-6 py-4">Action</th>
                      <th className="px-6 py-4">Entity</th>
                      <th className="px-6 py-4">Performer</th>
                      <th className="px-6 py-4 text-right">Data</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y text-sm">
                    {loading ? (
                      <tr><td colSpan={4} className="p-10 text-center animate-pulse">Filtering institutional records...</td></tr>
                    ) : results.length === 0 ? (
                      <tr><td colSpan={4} className="p-10 text-center text-slate-400 italic">No matching records found.</td></tr>
                    ) : (results || []).map(row => (
                      <Fragment key={row.id}>
                        <tr className="hover:bg-slate-50 cursor-pointer" onClick={() => setExpandedRow(expandedRow === row.id ? null : row.id)}>
                          <td className="px-6 py-4 font-bold">{row?.action}</td>
                          <td className="px-6 py-4 font-bold text-blue-600">{row?.entity}</td>
                          <td className="px-6 py-4">@{row?.user?.name || 'System'}</td>
                          <td className="px-6 py-4 text-right">
                            <span className="text-[10px] font-bold bg-slate-100 px-2 py-1 rounded-lg">JSON</span>
                          </td>
                        </tr>
                        {expandedRow === row.id && (
                          <tr className="bg-slate-50">
                            <td colSpan={4} className="p-4">
                              <pre className="text-[10px] bg-white border p-4 rounded-xl overflow-x-auto max-h-[300px]">
                                {JSON.stringify({ before: row?.before, after: row?.after }, null, 2)}
                              </pre>
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

        {/* Export & Intelligence Cards */}
        <div className="space-y-8">
          <div className="bg-slate-900 rounded-3xl p-8 text-white shadow-2xl relative overflow-hidden group">
            <Layout className="absolute top-0 right-0 -mr-8 -mt-8 w-40 h-40 text-white/5 rotate-12 transition-transform duration-500 group-hover:rotate-45" />
            <h3 className="text-lg font-bold mb-4 font-display">Forensic Export</h3>
            <div className="space-y-4 relative z-10">
              <button 
                onClick={() => handleExport('xlsx')}
                className="w-full bg-white/10 hover:bg-white/20 transition-all p-4 rounded-2xl flex items-center justify-between group/btn text-sm font-bold"
              >
                <div className="flex items-center">
                  <FileSpreadsheet className="w-5 h-5 mr-3 text-emerald-400" />
                  Structured Excel (.xlsx)
                </div>
                <ChevronRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
              </button>
              <button 
                onClick={() => handleExport('csv')}
                className="w-full bg-white/10 hover:bg-white/20 transition-all p-4 rounded-2xl flex items-center justify-between group/btn text-sm font-bold"
              >
                <div className="flex items-center text-rose-300">
                  <FileSpreadsheet className="w-5 h-5 mr-3" />
                  Flat CSV File (.csv)
                </div>
                <ChevronRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-inner">
            <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest mb-4">Real-time Search Note</p>
            <p className="text-sm text-slate-600 border-l-4 border-blue-500 pl-4 py-2 bg-blue-50/30 rounded-r-xl leading-relaxed font-medium">
              Searching across the "Entity Snapshot" requires high overhead. 
              Please narrow your date range for faster search results when filtering by value changes.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
