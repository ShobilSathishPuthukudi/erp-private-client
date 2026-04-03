import { useState, useEffect, useCallback } from 'react';
import { ShieldAlert, Users, Layout, ShieldCheck, ArrowRight, Activity, Clock, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Modal } from '@/components/shared/Modal';
import axios from 'axios';
import { toast } from 'react-hot-toast';

export default function Alerts() {
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<any>(null);

  const fetchAlerts = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/org-admin/alerts');
      
      // Map icons and colors based on type
      const mappedAlerts = response.data.map((alert: any) => {
        let icon = ShieldAlert;
        let color = 'text-slate-600';
        let bg = 'bg-slate-50';

        switch (alert.type) {
          case 'Escalated Task':
            icon = ShieldAlert;
            color = 'text-rose-600';
            bg = 'bg-rose-50';
            break;
          case 'Unassigned Admin':
            icon = Users;
            color = 'text-amber-600';
            bg = 'bg-amber-50';
            break;
          case 'CEO Panel Issue':
            icon = Layout;
            color = 'text-blue-600';
            bg = 'bg-blue-50';
            break;
          case 'Audit Exception':
            icon = ShieldCheck;
            color = 'text-emerald-600';
            bg = 'bg-emerald-50';
            break;
        }

        return { ...alert, icon, color, bg };
      });

      setAlerts(mappedAlerts);
    } catch (error) {
      console.error('Fetch Alerts Error:', error);
      toast.error('Failed to sync system alerts');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  const handleDismiss = (id: number) => {
    setAlerts(prev => prev.filter(a => a.id !== id));
  };

  const handleAction = (alert: any) => {
    if (alert.actionLabel === 'View Task') {
      setSelectedAlert(alert);
      setIsModalOpen(true);
    } else {
      navigate(alert.actionLink);
    }
  };

  const handleDismissAll = () => {
    setAlerts([]);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 font-display">System Action Alerts</h1>
          <p className="text-slate-500 mt-1">Critical configuration issues requiring your immediate attention.</p>
        </div>
        <div className="flex gap-4 items-center">
          {alerts.length > 0 && (
            <button 
              onClick={handleDismissAll}
              className="text-xs font-bold text-slate-400 hover:text-rose-600 hover:scale-110 active:scale-90 tracking-wider transition-all"
            >
              Dismiss all
            </button>
          )}
          <div className="bg-rose-100 text-rose-700 px-4 py-2 rounded-lg text-sm font-bold flex items-center shadow-sm">
            <ShieldAlert className="w-4 h-4 mr-2" />
            {alerts.length} Critical Alerts
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 animate-pulse">
           <Loader2 className="w-12 h-12 text-slate-300 animate-spin mb-4" />
           <p className="text-slate-400 font-bold tracking-widest text-xs uppercase">Synchronizing Institutional Health...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
        {alerts.map((alert) => (
          <div key={alert.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 transition-all hover:border-slate-300 animate-in slide-in-from-right-4 duration-300">
            <div className="flex items-start gap-4">
              <div className={`p-3 rounded-xl ${alert.bg}`}>
                <alert.icon className={`w-6 h-6 ${alert.color}`} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-full ${alert.bg} ${alert.color}`}>
                    {alert.type}
                  </span>
                  {alert.overdue && (
                    <span className="text-rose-600 text-[10px] font-bold flex items-center">
                      <Clock className="w-3 h-3 mr-1" /> {alert.overdue} Overdue
                    </span>
                  )}
                </div>
                <h3 className="text-lg font-bold text-slate-900">{alert.title}</h3>
                <p className="text-sm text-slate-500 mt-1">
                  {alert.department && `Department: ${alert.department} • `}
                  {alert.chain && `Chain: ${alert.chain}`}
                  {alert.createdDate && `Created: ${alert.createdDate}`}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <button 
                className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-rose-600 hover:bg-rose-50 hover:scale-105 active:scale-95 rounded-lg transition-all"
                onClick={(e) => {
                    e.stopPropagation();
                    handleDismiss(alert.id);
                }}
              >
                Dismiss
              </button>
              <button 
                onClick={() => handleAction(alert)}
                className="px-5 py-2 text-sm font-bold text-white bg-slate-900 rounded-lg shadow-sm hover:bg-slate-800 hover:scale-105 active:scale-95 transition-all flex items-center"
              >
                {alert.actionLabel}
                <ArrowRight className="w-4 h-4 ml-2" />
              </button>
            </div>
          </div>
        ))}

        {alerts.length === 0 && (
          <div className="bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 p-12 text-center">
            <div className="bg-white w-16 h-16 rounded-full shadow-sm flex items-center justify-center mx-auto mb-4">
              <ShieldCheck className="w-8 h-8 text-green-500" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">Everything is ship-shape!</h3>
            <p className="text-slate-500 mt-2">No critical system alerts found for your attention.</p>
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
              <p className="text-sm font-bold text-blue-900">{selectedAlert?.type} Isolation</p>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 tracking-wider px-1">Institutional context & details</label>
            <p className="text-slate-600 text-sm leading-relaxed bg-white p-4 border border-slate-100 rounded-2xl font-medium">
              {selectedAlert?.details}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-slate-100 rounded-2xl border border-slate-200">
                 <p className="text-[10px] font-bold text-slate-400 tracking-wider mb-1">Target module</p>
                 <p className="text-sm font-bold text-slate-700">{selectedAlert?.department || 'System'}</p>
            </div>
            <div className="p-4 bg-slate-100 rounded-2xl border border-slate-200">
                 <p className="text-[10px] font-bold text-slate-400 tracking-wider mb-1">Alert id</p>
                 <p className="text-sm font-bold text-slate-700">SRV-{selectedAlert?.id}X</p>
            </div>
          </div>

          <button 
            onClick={() => {
                setIsModalOpen(false);
                if (selectedAlert?.actionLink) navigate(selectedAlert.actionLink);
            }}
            className="w-full py-4 bg-blue-600 text-white font-bold rounded-2xl shadow-xl shadow-blue-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center"
          >
            <CheckCircle2 className="w-5 h-5 mr-2" />
            Investigate Root Cause
          </button>
        </div>
      </Modal>
      
      {/* Alert Glossary Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-8 space-y-6 border-b-4 border-b-blue-600">
        <div className="flex items-center justify-between border-b border-slate-100 pb-6">
          <div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-blue-600" />
              Institutional Alert Registry
            </h2>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">What alerts are currently being monitored?</p>
          </div>
          <div className="hidden md:flex items-center gap-2">
            <span className="flex items-center gap-1.5 text-[10px] font-black text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full uppercase">
              <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-pulse"></span>
              Live Monitoring Active
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { 
              type: 'Escalated Task', 
              icon: Clock, 
              color: 'text-rose-600', 
              bg: 'bg-rose-50', 
              border: 'border-rose-100',
              desc: 'High-priority task has exceeded its institutional deadline without resolution.' 
            },
            { 
              type: 'Structural Gap', 
              icon: Users, 
              color: 'text-amber-600', 
              bg: 'bg-amber-50', 
              border: 'border-amber-100',
              desc: 'A department is currently lacking a designated administrator (Unassigned Admin).' 
            },
            { 
              type: 'Scope Failure', 
              icon: Layout, 
              color: 'text-blue-600', 
              bg: 'bg-blue-50', 
              border: 'border-blue-100',
              desc: 'An executive CEO panel is missing visibility scopes, preventing data aggregation.' 
            },
            { 
              type: 'Audit Exception', 
              icon: Activity, 
              color: 'text-emerald-600', 
              bg: 'bg-emerald-50', 
              border: 'border-emerald-100',
              desc: 'Anomalous record activity detected (e.g. bulk deletions in target modules).' 
            },
          ].map((item, i) => (
            <div key={i} className={`p-5 rounded-2xl border ${item.border} ${item.bg}/30 hover:shadow-lg transition-all group`}>
               <div className={`w-10 h-10 rounded-xl ${item.bg} ${item.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-sm`}>
                 <item.icon className="w-5 h-5" />
               </div>
               <h4 className="text-sm font-bold text-slate-800 mb-2 uppercase tracking-tight">{item.type}</h4>
               <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
                 {item.desc}
               </p>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-slate-900 rounded-2xl p-8 text-white relative overflow-hidden shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="max-w-xl text-center md:text-left">
            <h2 className="text-xl font-black mb-4">System Governance Alert Hub</h2>
            <p className="text-slate-400 leading-relaxed font-medium">
              These alerts are automatically generated by systemic event processors. 
              Dismissing an alert will hide it from the dashboard, but the underlying 
              configuration issue must be resolved in the respective panel.
            </p>
          </div>
          <div className="bg-white/10 p-4 rounded-3xl backdrop-blur-md border border-white/20">
            <div className="flex items-center gap-4 mb-4 pb-4 border-b border-white/10">
              <div className="w-12 h-12 bg-green-500 rounded-2xl flex items-center justify-center shadow-lg shadow-green-500/20">
                <ShieldCheck className="text-white w-6 h-6" />
              </div>
              <div>
                <p className="text-xs text-slate-400 font-bold tracking-wider">Active status</p>
                <p className="text-sm font-bold">Standard Logic</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-500 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                <Activity className="text-white w-6 h-6" />
              </div>
              <div>
                <p className="text-xs text-slate-400 font-bold tracking-wider">Last sync</p>
                <p className="text-sm font-bold">Just Now</p>
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
