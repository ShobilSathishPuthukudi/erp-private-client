import { useState } from 'react';
import { ShieldAlert, Users, Layout, ShieldCheck, ArrowRight, Activity, Clock, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Modal } from '@/components/shared/Modal';

export default function Alerts() {
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState([
    {
      id: 1,
      type: 'Escalated Task',
      title: 'Fee Structure Approval Overdue',
      department: 'Finance',
      overdue: '5 Days',
      chain: 'Finance Admin → CFO → CEO',
      icon: ShieldAlert,
      color: 'text-rose-600',
      bg: 'bg-rose-50',
      actionLabel: 'View Task',
      actionLink: '/dashboard/org-admin/settings/general',
      details: "The proposed fee structure for Academic Year 2026-27 has been pending approval for over 5 days. Institutional policy requires CEO sign-off for any structure exceeding a 5% increase."
    },
    {
      id: 2,
      type: 'Unassigned Admin',
      title: 'Marketing Department',
      createdDate: 'Mar 24, 2026',
      icon: Users,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
      actionLabel: 'Assign Admin',
      actionLink: '/dashboard/org-admin/departments',
      details: "The Marketing department currently has no assigned Administrator. This prevents recruitment approvals and budget releases. Please assign a senior staff member as soon as possible."
    },
    {
      id: 3,
      type: 'CEO Panel Issue',
      title: 'CEO - Operations Panel (No scope)',
      createdDate: 'Mar 25, 2026',
      icon: Layout,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      actionLabel: 'Configure',
      actionLink: '/dashboard/org-admin/ceo-panels/visibility',
      details: "The Operations Panel for the CEO role is currently lacking data scopes. This means the CEO will see an empty panel when logging in. Please map at least one operational unit to the panel."
    },
    {
      id: 4,
      type: 'Audit Exception',
      title: '3 Bulk Deletion Attempts Flagged',
      createdDate: 'March 2026',
      icon: ShieldCheck,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
      actionLabel: 'View Audit Log',
      actionLink: '/dashboard/org-admin/audit/all',
      details: "Internal security triggers flagged multiple bulk deletion attempts in the Student Records module. No data was lost, but the account 'REGISTRAR_01' requires immediate behavioral audit."
    }
  ]);

  const [selectedAlert, setSelectedAlert] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

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
              className="text-xs font-bold text-slate-400 hover:text-rose-600 uppercase tracking-widest transition-colors"
            >
              Dismiss All
            </button>
          )}
          <div className="bg-rose-100 text-rose-700 px-4 py-2 rounded-lg text-sm font-bold flex items-center shadow-sm">
            <ShieldAlert className="w-4 h-4 mr-2" />
            {alerts.length} Critical Alerts
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {alerts.map((alert) => (
          <div key={alert.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 transition-all hover:border-slate-300 animate-in slide-in-from-right-4 duration-300">
            <div className="flex items-start gap-4">
              <div className={`p-3 rounded-xl ${alert.bg}`}>
                <alert.icon className={`w-6 h-6 ${alert.color}`} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${alert.bg} ${alert.color}`}>
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
                className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                onClick={(e) => {
                    e.stopPropagation();
                    handleDismiss(alert.id);
                }}
              >
                Dismiss
              </button>
              <button 
                onClick={() => handleAction(alert)}
                className="px-5 py-2 text-sm font-bold text-white bg-slate-900 rounded-lg shadow-sm hover:bg-slate-800 transition-all flex items-center"
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

      {/* Task Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedAlert?.title}
        maxWidth="md"
      >
        <div className="space-y-6">
          <div className="flex items-center gap-4 p-4 bg-blue-50 border border-blue-100 rounded-2xl">
            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm text-blue-600">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-blue-400 uppercase tracking-widest">Process Tracking</p>
              <p className="text-sm font-bold text-blue-900">{selectedAlert?.type} Isolation</p>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Institutional Context & Details</label>
            <p className="text-slate-600 text-sm leading-relaxed bg-white p-4 border border-slate-100 rounded-2xl font-medium">
              {selectedAlert?.details}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-slate-100 rounded-2xl border border-slate-200">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Target Module</p>
                <p className="text-sm font-bold text-slate-700">{selectedAlert?.department || 'System'}</p>
            </div>
            <div className="p-4 bg-slate-100 rounded-2xl border border-slate-200">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Alert ID</p>
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

      <div className="bg-slate-900 rounded-2xl p-8 text-white relative overflow-hidden shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="max-w-xl text-center md:text-left">
            <h2 className="text-3xl font-bold mb-4">System Governance Alert Hub</h2>
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
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Active Status</p>
                <p className="text-lg font-bold">Standard Logic</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-500 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                <Activity className="text-white w-6 h-6" />
              </div>
              <div>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Last Sync</p>
                <p className="text-lg font-bold">Just Now</p>
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
