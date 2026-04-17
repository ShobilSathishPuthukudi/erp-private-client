import { useState, useEffect, useCallback } from 'react';
import { ShieldAlert, ArrowRight, Activity, Clock, AlertCircle, Loader2, ShieldCheck } from 'lucide-react';
import { Modal } from '@/components/shared/Modal';
import axios from 'axios';
import { toast } from 'react-hot-toast';

export default function Alerts() {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<any>(null);

  const fetchAlerts = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/org-admin/alerts');
      
      // Filter for Escalated Tasks only and map UI properties
      const mappedAlerts = response.data
        .filter((a: any) => a.type === 'Escalated Task')
        .map((alert: any) => ({
          ...alert,
          icon: ShieldAlert,
          color: 'text-rose-600',
          bg: 'bg-rose-50'
        }));

      setAlerts(mappedAlerts);
    } catch (error) {
      console.error('Fetch Alerts Error:', error);
      toast.error('Failed to sync escalated tasks');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  const handleAction = (alert: any) => {
    setSelectedAlert(alert);
    setIsModalOpen(true);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 font-display tracking-tight">
            Escalated Task Hub
          </h1>
          <p className="text-slate-500 mt-1 font-medium">Critical personnel tasks and institutional deadlines requiring immediate executive oversight.</p>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 animate-pulse">
           <Loader2 className="w-12 h-12 text-slate-300 animate-spin mb-4" />
           <p className="text-slate-400 font-bold tracking-widest text-xs uppercase">Synchronizing Task Telemetry...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
        {alerts.map((alert) => (
          <div key={alert.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 transition-all hover:border-slate-300 hover:shadow-xl hover:shadow-slate-200/40 animate-in slide-in-from-right-4 duration-300 group">
            <div className="flex items-start gap-5">
              <div className={`p-3.5 rounded-2xl ${alert.bg} shadow-inner transition-transform group-hover:scale-110 duration-300`}>
                <alert.icon className={`w-6 h-6 ${alert.color}`} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg border ${alert.bg} ${alert.color} border-current/10 shadow-sm shadow-current/5`}>
                    Personnel Escalation
                  </span>
                  {alert.overdue && (
                    <span className="text-rose-600 text-[10px] font-black uppercase tracking-tight flex items-center bg-rose-50 px-2 py-0.5 rounded-md border border-rose-100">
                      <Clock className="w-3 h-3 mr-1.5 animate-pulse" /> {alert.overdue} Overdue
                    </span>
                  )}
                </div>
                <h3 className="text-lg font-black text-slate-900 tracking-tight">{alert.title}</h3>
                <p className="text-xs text-slate-400 mt-1 font-medium flex items-center gap-2">
                  {alert.department && (
                    <span className="flex items-center gap-1.5">
                      <ShieldCheck className="w-3 h-3" />
                      {alert.department}
                    </span>
                  )}
                  {alert.chain && (
                    <span className="flex items-center gap-1.5 border-l border-slate-200 pl-2">
                       <ArrowRight className="w-3 h-3 text-slate-300" />
                       {alert.chain}
                    </span>
                  )}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <button 
                onClick={() => handleAction(alert)}
                className="px-6 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-white bg-slate-900 rounded-xl shadow-lg shadow-slate-900/10 hover:bg-slate-800 hover:scale-105 active:scale-95 transition-all cursor-pointer flex items-center"
              >
                Monitoring
              </button>
            </div>
          </div>
        ))}

        {alerts.length === 0 && (
          <div className="bg-slate-50/50 rounded-[2.5rem] border-2 border-dashed border-slate-100 p-20 text-center animate-in fade-in zoom-in-95 duration-500">
            <div className="bg-white w-20 h-20 rounded-full shadow-2xl shadow-slate-200 flex items-center justify-center mx-auto mb-8">
              <ShieldCheck className="w-10 h-10 text-green-500" />
            </div>
            <h3 className="text-2xl font-black text-slate-900 tracking-tight">Queue fully processed!</h3>
            <p className="text-slate-400 mt-2 font-medium">All escalated tasks have been synchronized and accounted for.</p>
          </div>
      )}
      </div>
    )}

      {/* Task Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedAlert?.title}
      >
        <div className="space-y-6">
          <div className="flex items-center gap-4 p-4 bg-blue-50 border border-blue-100 rounded-2xl">
            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm text-blue-600">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-blue-400 tracking-wider">Process tracking</p>
              <p className="text-sm font-bold text-blue-900">Personnel Accountability</p>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 tracking-wider px-1">Institutional context & details</label>
            <p className="text-slate-600 text-sm leading-relaxed bg-white p-4 border border-slate-100 rounded-2xl font-medium">
              {selectedAlert?.details}
            </p>
          </div>

          <div className="space-y-4">
            <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl space-y-3">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Institutional Timeline</p>
              <div className="grid grid-cols-1 gap-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500">Assignment Date</span>
                  <span className="font-bold text-slate-700">{selectedAlert?.assignedDate ? new Date(selectedAlert.assignedDate).toLocaleDateString() : 'N/A'}</span>
                </div>
                <div className="flex justify-between items-center text-xs border-t border-slate-200 pt-2">
                  <span className="text-slate-500">System Deadline</span>
                  <span className="font-bold text-rose-600">{selectedAlert?.dueDate ? new Date(selectedAlert.dueDate).toLocaleDateString() : 'N/A'}</span>
                </div>
                <div className="flex justify-between items-center text-xs border-t border-slate-200 pt-2">
                  <span className="text-slate-500">CEO Escalation</span>
                  <span className="font-bold text-purple-600">
                    {selectedAlert?.dueDate ? new Date(new Date(selectedAlert.dueDate).getTime() + 86400000).toLocaleDateString() : 'N/A'}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-white border border-slate-100 rounded-2xl space-y-3">
               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Personnel Chain</p>
               <div className="flex items-center gap-2">
                  <div className="flex-1 bg-slate-50 p-2 rounded-lg border border-slate-100">
                     <p className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Issued By</p>
                     <p className="text-xs font-bold text-slate-700">{selectedAlert?.assignerName}</p>
                  </div>
                  <ArrowRight className="w-3 h-3 text-slate-300" />
                  <div className="flex-1 bg-indigo-50 p-2 rounded-lg border border-indigo-100">
                     <p className="text-[8px] font-black text-indigo-400 uppercase tracking-tighter">Assigned To</p>
                     <p className="text-xs font-bold text-indigo-700">{selectedAlert?.assigneeName}</p>
                  </div>
               </div>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-100 flex justify-end">
            <button 
              onClick={() => setIsModalOpen(false)}
              className="px-8 py-3 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-slate-800 transition-all active:scale-95 shadow-lg shadow-slate-900/10"
            >
              Close Insight
            </button>
          </div>
        </div>
      </Modal>

      <div className="bg-slate-900 rounded-2xl p-8 text-white relative overflow-hidden shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="max-w-xl text-center md:text-left">
            <h4 className="text-xl font-bold mb-3 font-display">Escalated Task Governance</h4>
            <p className="text-slate-400 leading-relaxed font-medium">
              This hub tracks critical personnel lapses and institutional deadline breaches. 
              Status monitoring is performed in real-time. Unaccounted tasks are automatically 
              flagged for Organization Admin and CEO review.
            </p>
          </div>
          <div className="bg-white/10 p-4 rounded-3xl backdrop-blur-md border border-white/20">
            <div className="flex items-center gap-4 mb-4 pb-4 border-b border-white/10">
              <div className="w-12 h-12 bg-green-500 rounded-2xl flex items-center justify-center shadow-lg shadow-green-500/20">
                <ShieldCheck className="text-white w-6 h-6" />
              </div>
              <div>
                <p className="text-xs text-slate-400 font-bold tracking-wider">Active Monitoring</p>
                <p className="text-[11px] font-bold">Standard Logic</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-500 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                <Activity className="text-white w-6 h-6" />
              </div>
              <div>
                <p className="text-xs text-slate-400 font-bold tracking-wider">Last sync</p>
                <p className="text-[11px] font-bold">Just Now</p>
              </div>
            </div>
          </div>
        </div>
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-slate-800 rounded-full blur-3xl opacity-20"></div>
        <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 bg-blue-500 rounded-full blur-3xl opacity-10"></div>
      </div>
    </div>
  );
}
