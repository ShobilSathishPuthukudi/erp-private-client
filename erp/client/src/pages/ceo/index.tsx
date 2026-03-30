import { Routes, Route, Navigate } from 'react-router-dom';
import Overview from './Overview';
import Escalations from './Escalations';
import DeptPerformance from './DeptPerformance';
import Reports from './Reports';
import PayoutApproval from './PayoutApproval';
import PolicyControls from './PolicyControls';
import { PieChart } from 'lucide-react';

export default function CEODashboard() {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-[1600px] mx-auto p-4 lg:p-8">
        
        {/* Executive Header */}
        <div className="mb-10 flex flex-col md:flex-row md:items-start justify-between gap-6 shrink-0 pt-4">
          <div className="flex items-start gap-5">
            <div className="w-14 h-14 rounded-2xl bg-slate-900 flex items-center justify-center text-white shadow-xl shadow-slate-900/20 mt-1 relative overflow-hidden group">
              <PieChart className="w-8 h-8 group-hover:scale-110 transition-transform" />
              <div className="absolute inset-0 bg-emerald-500/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            </div>
            <div>
              <div className="flex items-center gap-4 mb-2">
                <h1 className="text-4xl font-black text-slate-900 tracking-tight">
                  {greeting}, Chief
                </h1>
                <div className="flex items-center gap-2 px-3 py-1 bg-slate-900 text-white rounded-full">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></div>
                  <span className="text-[10px] font-black uppercase tracking-widest leading-none">Read-Only Oversight</span>
                </div>
              </div>
              <p className="text-slate-500 font-bold text-sm tracking-tight opacity-70">
                System telemetry and institutional performance overview for {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}.
              </p>
            </div>
          </div>
        </div>

        {/* Dynamic Routed Content */}
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <Routes>
            <Route index element={<Navigate to="kpis" replace />} />
            <Route path="kpis" element={<Overview view="kpis" />} />
            <Route path="trends" element={<Overview view="trends" />} />
            <Route path="escalations" element={<Escalations />} />
            <Route path="performance" element={<DeptPerformance />} />
            <Route path="reports" element={<Reports />} />
            <Route path="payouts" element={<PayoutApproval />} />
            <Route path="policy" element={<PolicyControls />} />
          </Routes>
        </div>

      </div>
    </div>
  );
}
