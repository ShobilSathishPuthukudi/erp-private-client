import { Routes, Route, Navigate } from 'react-router-dom';
import Overview from './Overview';
import Escalations from './Escalations';
import DeptPerformance from './DeptPerformance';
import Reports from './Reports';
import PayoutApproval from './PayoutApproval';
import { PieChart } from 'lucide-react';

export default function CEODashboard() {
  return (
    <div className="min-h-screen bg-slate-50/50">
      <div className="max-w-[1600px] mx-auto p-4 lg:p-8">
        
        {/* Executive Header */}
        <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6 shrink-0">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-white shadow-lg shadow-slate-900/20">
                <PieChart className="w-6 h-6" />
              </div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">Executive Control</h1>
            </div>
            <p className="text-slate-500 font-medium ml-13">IITS RPS Global Governance & Risk Management Panel</p>
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
          </Routes>
        </div>

      </div>
    </div>
  );
}
