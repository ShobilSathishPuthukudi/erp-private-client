import { useState, useEffect, Fragment } from 'react';
import { 
  Activity, 
  Search, 
  Filter, 
  User,
  Database,
  ArrowRight,
  FileJson,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { api } from '@/lib/api';
import { DashboardGreeting } from '@/components/shared/DashboardGreeting';
import { useAuthStore } from '@/store/authStore';

export default function AuditAllActions() {
  const { user } = useAuthStore();
  const [audits, setAudits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchAudits();
  }, [page]);

  const fetchAudits = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get('/audit', {
        params: { page, limit: 50 }
      });
      setAudits(data?.logs || []);
      setTotalPages(data?.totalPages || 1);
      setTotalCount(data?.total || 0);
      setLoading(false);
    } catch (error: any) {
      console.error("Failed to fetch audits", error);
      setError("Institutional Audit Trail Unavailable (ECONNREFUSED)");
      setLoading(false);
    }
  };
  const filteredAudits = (audits || []).filter(a => 
    a?.entity?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a?.action?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (a?.user?.name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'Create': return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-green-100 text-green-700">CREATE</span>;
      case 'Update': return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700">UPDATE</span>;
      default: return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700">DELETE</span>;
    }
  };

  return (
    <div className="p-2 space-y-6">
      <DashboardGreeting 
        role="System auditor"
        name={user?.name || 'Administrator'}
        subtitle="Forensic ledger monitoring: Every data mutation and state transition is captured with high-fidelity telemetry."
        actions={[
          {
            label: 'Refresh Trail',
            onClick: () => fetchAudits(),
            icon: Activity
          }
        ]}
      />

      <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/40 border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search in current page results..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-blue-500 shadow-sm transition-all"
            />
          </div>
          <button 
            onClick={() => fetchAudits()}
            className="px-6 py-3 bg-slate-900 text-white font-bold rounded-2xl text-sm shadow-lg shadow-slate-900/10 flex items-center hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            <Filter className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh Trail
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Entity & Action</th>
                <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Performed By</th>
                <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Module Context</th>
                <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Timestamp</th>
                <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Data Diff</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 transition-all">
              {loading ? (
                <tr>
                   <td colSpan={5} className="px-8 py-20 text-center">
                     <div className="flex flex-col items-center gap-3">
                       <div className="w-10 h-10 border-4 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
                       <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Reconstructing Transaction Trail...</p>
                     </div>
                   </td>
                </tr>
              ) : error ? (
                <tr>
                   <td colSpan={5} className="px-8 py-20 text-center">
                     <div className="flex flex-col items-center gap-4 text-rose-600">
                       <Activity className="w-10 h-10 mx-auto opacity-20" />
                       <div className="space-y-1">
                         <p className="font-bold">Compliance Stream Interrupted</p>
                         <p className="text-[10px] uppercase font-bold tracking-widest opacity-60">{error}</p>
                       </div>
                       <button 
                         onClick={fetchAudits}
                         className="px-6 py-2 bg-rose-50 border border-rose-100 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-100 transition-colors"
                       >
                         Try Reconnect
                       </button>
                     </div>
                   </td>
                </tr>
              ) : filteredAudits.length === 0 ? (
                <tr>
                   <td colSpan={5} className="px-8 py-20 text-center text-slate-400">
                      <div className="flex flex-col items-center gap-2">
                        <Database className="w-8 h-8 opacity-20 mb-2" />
                        <p className="font-bold text-slate-300">No matching records found.</p>
                      </div>
                   </td>
                </tr>
              ) : filteredAudits.map((audit) => (
                <Fragment key={audit.id}>
                  <tr 
                    className={`hover:bg-slate-50/50 transition-colors group cursor-pointer ${expandedRow === audit.id ? 'bg-blue-50/30' : ''}`} 
                    onClick={() => setExpandedRow(expandedRow === audit.id ? null : audit.id)}
                  >
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${
                          audit.action === 'Create' ? 'bg-green-50 text-green-600' :
                          audit.action === 'Update' ? 'bg-blue-50 text-blue-600' : 'bg-rose-50 text-rose-600'
                        }`}>
                          <Database className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-bold text-slate-900">{audit.entity}</div>
                          <div className="mt-1">{getActionBadge(audit.action)}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-2">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <span className="text-sm font-bold text-slate-700">@{audit.user?.name || 'System'}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter mt-1">{audit.user?.role || 'Service'}</div>
                    </td>
                    <td className="px-8 py-5">
                      <div className="text-xs font-bold text-slate-600 flex items-center">
                        {audit.module}
                        <ArrowRight className="w-3 h-3 ml-2 text-slate-400" />
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <div className="text-xs text-slate-500 font-medium">
                        {new Date(audit.timestamp).toLocaleString(undefined, {
                          dateStyle: 'medium',
                          timeStyle: 'short'
                        })}
                      </div>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <div className={`inline-flex items-center px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all ${
                        expandedRow === audit.id ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200'
                      }`}>
                        <FileJson className="w-3.5 h-3.5 mr-1.5" />
                        {expandedRow === audit.id ? 'Hide Details' : 'View Details'}
                      </div>
                    </td>
                  </tr>
                  
                  {expandedRow === audit.id && (
                    <tr className="bg-slate-50/80 animate-in fade-in slide-in-from-top-2">
                      <td colSpan={5} className="px-8 py-8 border-b border-slate-200 shadow-inner">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          {/* Before View */}
                          <div className="space-y-3">
                            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center">
                              <span className="w-2 h-2 rounded-full bg-rose-400 mr-2"></span>
                              Previous State
                            </h4>
                            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm max-h-[400px] overflow-y-auto font-sans">
                              {audit.before ? (
                                <div className="space-y-2">
                                  {Object.entries(audit.before)
                                    .filter(([key, val]) => audit.action !== 'Update' || !audit.after || JSON.stringify(val) !== JSON.stringify(audit.after[key]))
                                    .map(([key, val]) => (
                                    <div key={key} className="flex justify-between border-b border-slate-50 pb-2 last:border-0">
                                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{key}</span>
                                      <span className="text-xs font-semibold text-slate-600 truncate max-w-[200px]" title={String(val)}>
                                        {typeof val === 'object' && val !== null ? 'JSON Data' : String(val)}
                                      </span>
                                    </div>
                                  ))}
                                  {Object.entries(audit.before).filter(([key, val]) => audit.action !== 'Update' || !audit.after || JSON.stringify(val) !== JSON.stringify(audit.after[key])).length === 0 && (
                                    <div className="text-slate-400 font-medium py-4 text-center text-xs italic">No structural changes detected in previous state.</div>
                                  )}
                                </div>
                              ) : (
                                <div className="text-slate-300 font-bold py-10 text-center text-xs uppercase tracking-widest">Initial Provisioning</div>
                              )}
                            </div>
                          </div>
                          
                          {/* After View */}
                          <div className="space-y-3">
                            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center">
                              <span className="w-2 h-2 rounded-full bg-emerald-400 mr-2"></span>
                              Updated State
                            </h4>
                            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm max-h-[400px] overflow-y-auto font-sans">
                              {audit.after ? (
                                <div className="space-y-2">
                                  {Object.entries(audit.after)
                                    .filter(([key, val]) => audit.action !== 'Update' || !audit.before || JSON.stringify(val) !== JSON.stringify(audit.before[key]))
                                    .map(([key, val]) => (
                                    <div key={key} className="flex justify-between border-b border-slate-50 pb-2 last:border-0">
                                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{key}</span>
                                      <span className="text-xs font-semibold text-slate-900 truncate max-w-[200px]" title={String(val)}>
                                        {typeof val === 'object' && val !== null ? 'JSON Data' : String(val)}
                                      </span>
                                    </div>
                                  ))}
                                  {Object.entries(audit.after).filter(([key, val]) => audit.action !== 'Update' || !audit.before || JSON.stringify(val) !== JSON.stringify(audit.before[key])).length === 0 && (
                                    <div className="text-slate-400 font-medium py-4 text-center text-xs italic">No structural changes detected in updated state.</div>
                                  )}
                                </div>
                              ) : (
                                <div className="text-rose-400 font-bold py-10 text-center text-xs uppercase tracking-widest">Resource Decommissioned</div>
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

        {/* Improved Pagination - Only visible if data exists */}
        {totalCount > 0 && totalPages > 1 && (
          <div className="px-8 py-5 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between animate-in fade-in duration-500">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              Showing Page <span className="text-slate-900">{page}</span> of {totalPages}
            </p>
            <div className="flex gap-2">
              <button 
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
                className="p-2 border border-slate-200 rounded-xl bg-white text-slate-600 disabled:opacity-30 hover:bg-slate-50 transition-colors shadow-sm active:scale-95 transition-transform"
                title="Previous Page"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button 
                disabled={page === totalPages}
                onClick={() => setPage(page + 1)}
                className="p-2 border border-slate-200 rounded-xl bg-white text-slate-600 disabled:opacity-30 hover:bg-slate-50 transition-colors shadow-sm active:scale-95 transition-transform"
                title="Next Page"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>
      
      <div className="bg-blue-600 rounded-3xl p-8 text-white relative overflow-hidden group shadow-2xl">
        <Activity className="absolute bottom-0 right-0 -mr-8 -mb-8 w-48 h-48 text-white/10 group-hover:scale-105 transition-transform" />
        <div className="max-w-2xl relative z-10">
          <h2 className="text-2xl font-bold mb-3 tracking-tight font-display">Gap-5</h2>
          <p className="text-blue-100 text-sm font-medium leading-relaxed">
            This system-level intercept captures every data mutation across IITS ERP. 
            Before and After values are stored as JSON snapshots for granular forensic analysis. 
            This data is used to generate the Monthly Compliance Reports for board review.
          </p>
        </div>
      </div>
    </div>
  );
}
