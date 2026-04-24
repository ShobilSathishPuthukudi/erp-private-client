import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Clock, Play, CheckCircle, AlertTriangle, RefreshCw, Layers, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { PageHeader } from '@/components/shared/PageHeader';

export default function CronMonitoring() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const fetchJobs = async () => {
    try {
      setSyncing(true);
      const res = await api.get('/cron');
      setJobs(res.data);
    } catch (error) {
      console.error('Fetch cron jobs error:', error);
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  const triggerJob = async (id: number, name: string) => {
    try {
      await api.post(`/cron/${id}/run`);
      toast.success(`${name} has been manually triggered. Processing...`);
      // Simulating update
      setJobs(jobs.map(j => j.id === id ? { ...j, status: 'running' } : j));
      setTimeout(fetchJobs, 3000);
    } catch (error) {
      toast.error('Failed to trigger background job');
    }
  };

  if (loading) return <div className="p-12 text-center animate-pulse text-slate-400">Syncing background task registry...</div>;

  return (
    <div className="p-2 space-y-6">
      <PageHeader 
        title="Cron monitoring dashboard"
        description="Real-time status of GAP-3 background processors and GAP-2 escalation engines."
        icon={Clock}
        action={
          <button 
            onClick={fetchJobs}
            className="flex items-center px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition-all shadow-sm"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
            Refresh registry
          </button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {jobs.map((job) => (
          <div key={job.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col group hover:shadow-md transition-all">
            <div className="p-6 flex-1">
              <div className="flex items-center justify-between mb-4">
                <div className={`p-2 rounded-lg ${job.status === 'active' ? 'bg-blue-50 text-blue-600' : job.status === 'running' ? 'bg-orange-50 text-orange-600' : 'bg-red-50 text-red-600'}`}>
                  <Clock className={`w-5 h-5 ${job.status === 'running' ? 'animate-spin' : ''}`} />
                </div>
                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${job.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                  {job.status}
                </span>
              </div>
              
              <h3 className="text-lg font-bold text-slate-900 capitalize mb-1">{job.name.replace('-', ' ')}</h3>
              <p className="text-xs text-slate-500 font-mono bg-slate-50 p-1.5 rounded border border-slate-100 mb-4">
                Schedule: {job.schedule}
              </p>

              <div className="space-y-3">
                <div className="flex items-center text-xs text-slate-600">
                  <Calendar className="w-4 h-4 mr-2 text-slate-400" />
                  <span className="font-medium mr-1">Last Run:</span>
                  {job.lastRun ? format(new Date(job.lastRun), 'MMM dd, HH:mm') : 'Never'}
                </div>
                <div className="flex items-center text-xs text-slate-600">
                  <Layers className="w-4 h-4 mr-2 text-slate-400" />
                  <span className="font-medium mr-1">Result:</span>
                  <span className="truncate flex-1 max-w-[150px]">{job.lastResult || 'No data logged'}</span>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-100 mt-auto">
              <button 
                onClick={() => triggerJob(job.id, job.name)}
                disabled={job.status === 'running'}
                className="w-full flex items-center justify-center py-2 bg-slate-900 text-white rounded-lg text-sm font-bold hover:bg-slate-800 transition-all shadow-sm disabled:opacity-50"
              >
                <Play className="w-3 h-3 mr-2" />
                Manual Execution
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-indigo-600 rounded-2xl p-8 text-white relative overflow-hidden shadow-xl shadow-indigo-100">
         <div className="relative z-10 w-full md:w-2/3">
            <h2 className="text-2xl font-bold mb-2">Automated escalation logic (gap-2)</h2>
            <p className="text-indigo-100 text-sm leading-relaxed mb-6">
              The `task-escalation` job bridges our event stream and multi-tier accountability. 
              Once a task becomes overdue, the Department Admin is notified immediately. They can escalate directly or grant a 24-hour grace period. If they do nothing, or the grace period expires, the task escalates to the CEO Dashboard automatically.
            </p>
            <div className="flex items-center space-x-4">
               <div className="flex items-center text-xs font-bold text-green-300">
                  <CheckCircle className="w-4 h-4 mr-1" />
                  Status Sync Active
               </div>
               <div className="flex items-center text-xs font-bold text-orange-300">
                  <AlertTriangle className="w-4 h-4 mr-1" />
                  Escalation Triggers Active
               </div>
            </div>
         </div>
         <Layers className="absolute -bottom-10 -right-10 w-64 h-64 text-white opacity-5" />
      </div>
    </div>
  );
}
