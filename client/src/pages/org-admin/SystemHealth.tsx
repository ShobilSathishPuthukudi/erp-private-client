import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Activity, Server, Database, MemoryStick, History, Shield, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { DataTable } from '@/components/shared/DataTable';

interface Stats {
  uptime: number;
  memory: {
    heapUsed: number;
    heapTotal: number;
    rss: number;
  };
  database: {
    status: string;
    latency: string;
  };
  counts: {
    totalAuditLogs: number;
    recent24h: number;
  };
  nodeVersion: string;
  platform: string;
}

export default function SystemHealth() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchEverything = async () => {
    try {
      setIsRefreshing(true);
      const [statsRes, logsRes] = await Promise.all([
        api.get('/audit/stats'),
        api.get('/audit')
      ]);
      setStats(statsRes.data);
      setLogs(logsRes.data);
    } catch (error) {
      console.error('Failed to fetch system data:', error);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchEverything();
    const interval = setInterval(fetchEverything, 30000); // Poll every 30s
    return () => clearInterval(interval);
  }, []);

  const formatUptime = (seconds: number) => {
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${d}d ${h}h ${m}m`;
  };

  const columns = [
    { 
      header: 'Timestamp', 
      accessor: (row: any) => format(new Date(row.timestamp), 'MMM dd, HH:mm:ss'),
      className: 'font-mono text-[11px]'
    },
    { 
      header: 'User', 
      accessor: (row: any) => row.user?.name || 'System',
      className: 'font-medium'
    },
    { 
      header: 'Action', 
      accessor: 'action',
      render: (row: any) => (
        <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[10px] font-bold uppercase border border-slate-200">
          {row.action}
        </span>
      )
    },
    { 
      header: 'Metadata', 
      accessor: 'details',
      className: 'text-slate-500 max-w-xs truncate'
    },
    { 
      header: 'Source IP', 
      accessor: 'ipAddress',
      className: 'text-slate-400 font-mono text-[10px]'
    }
  ];

  if (loading && !stats) return <div className="p-12 text-center animate-pulse text-slate-400">Loading platform telemetry...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">System Health & Audits</h1>
          <p className="text-slate-500 text-sm">Real-time telemetry and architectural oversight console.</p>
        </div>
        <button 
          onClick={fetchEverything}
          disabled={isRefreshing}
          className="flex items-center px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          {isRefreshing ? 'Syncing...' : 'Sync Metrics'}
        </button>
      </div>

      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Server className="w-5 h-5" /></div>
              <span className="text-[10px] font-bold text-green-600 uppercase">Live</span>
            </div>
            <p className="text-slate-500 text-xs font-medium">Server Uptime</p>
            <p className="text-xl font-bold text-slate-900">{formatUptime(stats.uptime)}</p>
            <p className="text-[10px] text-slate-400 mt-1">v{stats.nodeVersion} • {stats.platform}</p>
          </div>

          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 bg-purple-50 text-purple-600 rounded-lg"><Database className="w-5 h-5" /></div>
              <span className="text-[10px] font-bold text-slate-400 uppercase">{stats.database.latency}</span>
            </div>
            <p className="text-slate-500 text-xs font-medium">Database Node</p>
            <p className="text-xl font-bold text-slate-900 capitalize">{stats.database.status}</p>
            <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
               <div className="bg-green-500 h-full w-[95%]"></div>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 bg-orange-50 text-orange-600 rounded-lg"><MemoryStick className="w-5 h-5" /></div>
              <span className="text-[10px] font-bold text-slate-400 uppercase">{stats.memory.heapUsed}MB / {stats.memory.heapTotal}MB</span>
            </div>
            <p className="text-slate-500 text-xs font-medium">Memory Utilization</p>
            <p className="text-xl font-bold text-slate-900">{Math.round((stats.memory.heapUsed / stats.memory.heapTotal) * 100)}% Heap</p>
            <p className="text-[10px] text-slate-400 mt-1">RSS: {stats.memory.rss}MB Total Alloc</p>
          </div>

          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 bg-slate-50 text-slate-600 rounded-lg"><History className="w-5 h-5" /></div>
              <div className="flex items-center text-[10px] font-bold text-blue-600 uppercase">
                <Activity className="w-3 h-3 mr-1" />
                {stats.counts.recent24h} logs/24h
              </div>
            </div>
            <p className="text-slate-500 text-xs font-medium">Total Audit Events</p>
            <p className="text-xl font-bold text-slate-900">{stats.counts.totalAuditLogs.toLocaleString()}</p>
            <p className="text-[10px] text-slate-400 mt-1">Operational footprint</p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
           <div className="flex items-center">
             <Shield className="w-5 h-5 text-slate-400 mr-2" />
             <h2 className="font-bold text-slate-900 text-sm">System-wide Security Audit Log</h2>
           </div>
           <span className="text-[10px] text-slate-400 font-mono">Real-time Stream</span>
        </div>
        <DataTable columns={columns} data={logs} exportFileName="IITS_Security_Audit_Log" />
      </div>
    </div>
  );
}
