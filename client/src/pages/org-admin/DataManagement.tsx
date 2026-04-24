import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Database, Download, Shield, Clock, RefreshCw, HardDrive, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { PageHeader } from '@/components/shared/PageHeader';

export default function DataManagement() {
  const [backups, setBackups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isBackingUp, setIsBackingUp] = useState(false);

  const fetchBackups = async () => {
    try {
      const res = await api.get('/data/backups');
      setBackups(res.data);
    } catch (error) {
      console.error('Fetch backups error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBackups();
  }, []);

  const triggerBackup = async () => {
    try {
      setIsBackingUp(true);
      await api.post('/data/backup');
      toast.success('System backup initiated. This may take a few minutes.');
      
      // Poll for completion after 6 seconds
      setTimeout(fetchBackups, 6000);
    } catch (error) {
      toast.error('Failed to initiate backup');
    } finally {
      setIsBackingUp(false);
    }
  };

  if (loading) return <div className="p-12 text-center animate-pulse text-slate-400">Syncing data registry...</div>;

  return (
    <div className="p-2 space-y-6">
      <PageHeader 
        title="Data & backup management"
        description="Institutional data sovereignty and disaster recovery console."
        icon={Database}
        action={
          <button 
            onClick={triggerBackup}
            disabled={isBackingUp}
            className="flex items-center px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition-all disabled:opacity-50 shadow-lg shadow-slate-200"
          >
            <Database className={`w-4 h-4 mr-2 ${isBackingUp ? 'animate-pulse' : ''}`} />
            {isBackingUp ? 'Backing up...' : 'Trigger system backup'}
          </button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-4">
           <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                 <div className="flex items-center">
                    <Clock className="w-5 h-5 text-slate-400 mr-2" />
                    <h3 className="font-bold text-slate-900 text-sm">Historical Snapshots</h3>
                 </div>
                 <button onClick={fetchBackups} className="text-slate-400 hover:text-blue-600 transition-colors">
                    <RefreshCw className="w-4 h-4" />
                 </button>
              </div>
              <div className="divide-y divide-slate-100">
                {backups.map((b) => (
                  <div key={b.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                    <div className="flex items-center space-x-4">
                      <div className={`p-2 rounded-lg ${b.status === 'completed' ? 'bg-green-50 text-green-600' : 'bg-orange-50 text-orange-600 animate-pulse'}`}>
                        <HardDrive className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-800">{b.name}</p>
                        <p className="text-[10px] text-slate-400 uppercase font-medium">
                          {format(new Date(b.timestamp), 'MMM dd, yyyy • HH:mm')} • {b.size}
                        </p>
                      </div>
                    </div>
                    {b.status === 'completed' && (
                      <button className="p-2 text-slate-400 hover:text-blue-600 transition-colors">
                        <Download className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}

                {backups.length === 0 && (
                   <div className="py-20 text-center text-slate-400 text-xs">
                      No backups found in the persistent registry.
                   </div>
                )}
              </div>
           </div>
        </div>

        <div className="space-y-4">
           <div className="bg-blue-600 rounded-2xl p-6 text-white shadow-xl shadow-blue-100">
              <Shield className="w-8 h-8 mb-4 opacity-50" />
              <h3 className="font-bold text-lg">AES-256 Encryption</h3>
              <p className="text-blue-100 text-xs mt-1 leading-relaxed">
                Every snapshot generated is multi-layered and encrypted at rest using institutional keys. Your data remains protected even in external transit.
              </p>
           </div>

           <div className="bg-white rounded-2xl p-6 border border-slate-200">
              <div className="flex items-center text-orange-600 mb-3">
                 <AlertCircle className="w-4 h-4 mr-2" />
                 <h4 className="font-bold text-xs uppercase">Retention Policy</h4>
              </div>
              <p className="text-slate-500 text-[11px] leading-relaxed">
                Backups are retained for <b>90 days</b> before permanent archival. Ensure you rotate your off-site copies monthly for institutional compliance.
              </p>
           </div>
        </div>
      </div>
    </div>
  );
}
