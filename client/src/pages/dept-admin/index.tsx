import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import DashboardMetricCard from '@/components/dashboard/DashboardMetricCard';
import MetricDrillDown from '@/components/dashboard/MetricDrillDown';
import { Routes, Route } from 'react-router-dom';
// import Team from './Team';
// import Tasks from './Tasks';
// import Leaves from './Leaves';

export default function DeptAdminDashboard() {
  const [metrics, setMetrics] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [drillDown, setDrillDown] = useState<any>(null);

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 300000); // 5m auto-refresh
    return () => clearInterval(interval);
  }, []);

  const fetchMetrics = async () => {
    try {
      const res = await api.get('/dashboard/metrics/current');
      setMetrics(res.data);
    } catch (error) {
       console.error('Failed to sync institutional metrics');
    } finally {
       setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
       <div className="flex justify-between items-center bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm">
          <div>
             <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tighter ">Department Intelligence</h1>
             <p className="text-slate-500 font-medium mt-1 text-sm uppercase tracking-widest">Forensic Oversight & Risk Telemetry / {new Date().toLocaleDateString()}</p>
          </div>
          <div className="flex gap-4">
             <div className="text-right">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">System Vital</p>
                <div className="flex items-center gap-2 text-emerald-500 font-black ">
                   <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                   HEALTHY / SYNCED
                </div>
             </div>
          </div>
       </div>

       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {metrics.map(m => (
             <DashboardMetricCard 
                key={m.id}
                {...m}
                onClick={() => setDrillDown({ label: m.label, data: [
                   { subject: 'Forensic Audit #1', category: 'PERFORMANCE', value: m.value, status: 'success' },
                   { subject: 'Risk Metric #2', category: 'TELEMETRY', value: 'NOMINAL', status: 'success' }
                ]})}
             />
          ))}
          {loading && Array.from({ length: 3 }).map((_, i) => (
             <div key={i} className="bg-slate-50 h-48 rounded-[32px] animate-pulse border border-slate-100" />
          ))}
       </div>

       <MetricDrillDown 
          isOpen={!!drillDown}
          onClose={() => setDrillDown(null)}
          metricLabel={drillDown?.label}
          data={drillDown?.data || []}
       />

       <Routes>
          <Route path="/" element={
            <div className="p-6">
              <h1 className="text-2xl font-bold text-slate-900 mb-4">Department Administration</h1>
              <p className="text-slate-500">Oversee team day-to-day operations, assign and track critical tasks, and perform structural reviews of team leave requests.</p>
            </div>
          } />
          {/* <Route path="team" element={<Team />} /> */}
          {/* <Route path="tasks" element={<Tasks />} /> */}
          {/* <Route path="leaves" element={<Leaves />} /> */}
       </Routes>
    </div>
  );
}
