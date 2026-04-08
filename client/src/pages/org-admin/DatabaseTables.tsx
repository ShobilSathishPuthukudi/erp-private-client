import { useState, useEffect } from 'react';
import { 
  Database,
  Search,
  LayoutGrid,
  List,
  Server,
  Layers,
  FileCode2,
  Share2,
  Printer,
  Download,
  Network,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';

export default function DatabaseTables() {
  const [tables, setTables] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'hierarchy'>('hierarchy');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedGroups, setExpandedGroups] = useState<Set<number>>(new Set());

  useEffect(() => {
    fetchTables();
  }, []);

  // Initialize all groups as collapsed to maximize UI density
  useEffect(() => {
    setExpandedGroups(new Set());
  }, []);

  const toggleGroup = (idx: number) => {
    const next = new Set(expandedGroups);
    if (next.has(idx)) next.delete(idx);
    else next.add(idx);
    setExpandedGroups(next);
  };

  const fetchTables = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/org-admin/database/tables');
      setTables(data);
    } catch (error) {
      console.error('Fetch Error:', error);
      toast.error('Failed to load database structures');
    } finally {
      setLoading(false);
    }
  };

  const filteredTables = tables.filter(t => 
    (t.modelName || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
    (t.tableName || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success('Data Registry link copied to clipboard');
  };

  const handlePrint = () => {
    window.print();
    toast.success('Preparing Data Registry for print');
  };

  const handleExport = () => {
    // Generate a quick CSV
    const headers = 'Model Name,Table Name,Attribute Count\n';
    const rows = tables.map(t => `${t.modelName},${t.tableName},${t.attributeCount}`).join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Data_Registry_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    toast.success('Exporting data registry information');
  };

  const hierarchyGroups = [
    { title: 'User & Access Management', models: ['User', 'Role', 'Permission', 'Department', 'CenterSubDept'] },
    { title: 'Academic & Student Lifecycle', models: ['Student', 'Program', 'CenterProgram', 'ProgramFee', 'AdmissionSession', 'Subject', 'Module', 'ProgramOffering'] },
    { title: 'Examinations & Results', models: ['Exam', 'Mark', 'Result', 'Attendance', 'AcademicActionRequest'] },
    { title: 'Finance & Billing', models: ['Invoice', 'Payment', 'EMI', 'Quotation', 'DistributionConfig', 'PaymentDistribution', 'IncentiveRule', 'IncentivePayout'] },
    { title: 'Task & Operations Management', models: ['Task', 'Event', 'Leave', 'Holiday', 'Vacancy'] },
    { title: 'CRM & Admissions (Leads)', models: ['Lead', 'LeadTouchpoint', 'Deal', 'Target', 'Survey', 'SurveyResponse'] },
    { title: 'Governance & Security', models: ['AuditLog', 'OrgConfig', 'CEOPanel', 'CustomField'] },
    { title: 'Requests & Communications', models: ['Notification', 'Announcement', 'AnnouncementRead', 'ChangeRequest', 'CredentialRequest', 'AccreditationRequest', 'ReregRequest', 'ReregConfig'] },
    { title: 'System & Miscellaneous', models: ['File', 'CronJob', 'Referral'] }
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 pb-32">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-slate-900/20">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 font-display tracking-tight">Data Architecture</h1>
            <p className="text-slate-500 mt-1 font-medium">Review the institutional database schema and available data models.</p>
          </div>
        </div>
        <div className="flex gap-3 items-center">
          <button 
            onClick={handleShare}
            className="p-2.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all active:scale-95 group cursor-pointer border border-transparent hover:border-blue-100"
            title="Share Data Registry Link"
          >
            <Share2 className="w-5 h-5 group-hover:scale-110 transition-transform" />
          </button>
          
          <button 
            onClick={handlePrint}
            className="p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all active:scale-95 group cursor-pointer border border-transparent hover:border-indigo-100"
            title="Print Data Registry"
          >
            <Printer className="w-5 h-5 group-hover:scale-110 transition-transform" />
          </button>

          <div className="w-px h-6 bg-slate-200 mx-1"></div>

          <button 
            onClick={handleExport}
            className="p-2.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all active:scale-95 group cursor-pointer border border-transparent hover:border-slate-200"
            title="Download/Export Data Registry"
          >
            <Download className="w-5 h-5 group-hover:scale-125 transition-transform" />
          </button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white p-2 rounded-3xl border border-slate-200 shadow-sm">
        <div className="relative flex-1 group w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
          <input 
            type="text" 
            placeholder="Search by model or table name..." 
            className="w-full pl-12 pr-4 py-3 bg-slate-50 border-none rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-1 bg-white p-1 rounded-2xl border border-slate-200 shadow-sm shrink-0">
             <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-xl transition-all ${
                viewMode === 'grid' 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' 
                  : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
              }`}
              title="Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-xl transition-all ${
                viewMode === 'list' 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' 
                  : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
              }`}
              title="List View"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('hierarchy')}
              className={`p-2 rounded-xl transition-all ${
                viewMode === 'hierarchy' 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' 
                  : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
              }`}
              title="Hierarchy View"
            >
              <Network className="w-4 h-4" />
            </button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 bg-white rounded-3xl border border-slate-100 shadow-sm">
           <div className="w-10 h-10 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin"></div>
           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-4">Scanning backend schema...</p>
        </div>
      ) : filteredTables.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 bg-white rounded-3xl border border-slate-200 border-dashed text-slate-400">
           <Database className="w-12 h-12 text-slate-200 mb-4" />
           <p className="text-sm font-bold text-slate-900">No database structures found.</p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTables.map((table, idx) => (
            <div key={idx} className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden group hover:shadow-xl hover:border-blue-400/30 transition-all duration-300">
              <div className="h-1.5 bg-blue-500"></div>
              <div className="p-6 space-y-5">
                <div className="flex justify-between items-start gap-4">
                  <div className="min-w-0">
                    <h3 className="text-lg font-bold text-slate-900 mb-1 truncate" title={table.modelName}>{table.modelName}</h3>
                    <p className="text-xs font-bold text-slate-400 flex items-center gap-1.5 border border-slate-100 bg-slate-50 px-2 py-1 rounded-md inline-flex">
                       <Server className="w-3 h-3 text-blue-500" />
                       {table.tableName}
                    </p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shrink-0 border border-blue-100">
                    <Layers className="w-5 h-5" />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between pt-2 border-t border-slate-50">
                    <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">Attributes</span>
                    <span className="text-sm font-black text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-full">{table.attributeCount}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : viewMode === 'list' ? (
        <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/40 border border-slate-200 overflow-hidden min-h-[400px]">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Model Name</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Database Table</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Attribute Count</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredTables.map((table, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50 transition-all group">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
                           <FileCode2 className="w-4 h-4" />
                        </div>
                        <span className="text-sm font-bold text-slate-900">{table.modelName}</span>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <span className="px-3 py-1 bg-slate-100 text-slate-700 text-xs font-bold rounded-lg border border-slate-200">{table.tableName}</span>
                    </td>
                    <td className="px-8 py-5">
                      <span className="text-xs font-bold text-slate-600">{table.attributeCount} Column(s)</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : viewMode === 'hierarchy' ? (
        <div className="space-y-8">
          {hierarchyGroups.map((group, gIdx) => {
            const groupTables = filteredTables.filter(t => group.models.includes(t.modelName));
            if (groupTables.length === 0) return null;
            return (
              <div key={gIdx} className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden transition-all duration-300">
                <div 
                  onClick={() => toggleGroup(gIdx)}
                  className="flex items-center justify-between p-6 cursor-pointer hover:bg-slate-50 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 transition-transform group-hover:scale-110">
                      <Database className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 leading-tight">{group.title}</h3>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">{groupTables.length} Mapped Models</p>
                    </div>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 group-hover:text-blue-600 transition-colors">
                    {expandedGroups.has(gIdx) ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </div>
                </div>

                {expandedGroups.has(gIdx) && (
                  <div className="p-6 border-t border-slate-100 bg-white">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      {groupTables.map((table, tIdx) => (
                        <div key={tIdx} className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-start gap-4 hover:border-blue-200 transition-colors group/model">
                          <div className="w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center text-slate-400 shrink-0 group-hover/model:text-blue-500 transition-colors">
                            <FileCode2 className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-slate-900 truncate" title={table.modelName}>{table.modelName}</p>
                            <p className="text-[10px] uppercase font-black tracking-widest text-slate-400 mt-1 truncate" title={table.tableName}>{table.tableName}</p>
                            <p className="text-[10px] font-bold text-blue-600 mt-1">{table.attributeCount} Columns</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : null}

      <div className="bg-slate-900 rounded-3xl p-8 text-white relative overflow-hidden shadow-2xl">
        <Server className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 text-white/5 rotate-12" />
        <div className="max-w-2xl relative z-10">
          <h4 className="text-xl font-bold mb-3 font-display">System Integrity Notice</h4>
          <p className="text-slate-400 text-sm leading-relaxed font-medium">
            This module provides live structural insight into the organization's backend database. 
            Modifications to tables must be performed via authenticated migration pipelines. 
          </p>
        </div>
      </div>
    </div>
  );
}
