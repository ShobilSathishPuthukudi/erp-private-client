import { Routes, Route, Navigate } from 'react-router-dom';
import Overview from './Overview';
import Escalations from './Escalations';
import PayoutApproval from './PayoutApproval';
import EmployeePerformance from './EmployeePerformance';
import Announcements from './Announcements';
import HRBroadcasts from './HRBroadcasts';
import InstitutionalRoster from '@/components/team/InstitutionalRoster';
import DepartmentTasks from '@/components/team/DepartmentTasks';

export default function CEODashboard() {
  return (
    <div className="min-h-screen bg-[var(--page-bg)]">
      <div className="max-w-[1600px] mx-auto p-4 lg:p-8">
        
        {/* Dynamic Routed Content */}
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <Routes>
            <Route index element={<Navigate to="kpis" replace />} />
            <Route path="kpis" element={<Overview view="kpis" />} />
            <Route path="trends" element={<Overview view="trends" />} />
            <Route path="performance" element={<EmployeePerformance />} />
            <Route path="escalations" element={<Escalations />} />
            <Route path="payouts" element={<PayoutApproval />} />
            <Route path="announcements" element={<Announcements />} />
            <Route path="hr-broadcasts" element={<HRBroadcasts />} />
            
            {/* Team Management Integration */}
            <Route path="team" element={<InstitutionalRoster />} />
            <Route path="tasks" element={<DepartmentTasks />} />
          </Routes>
        </div>

      </div>
    </div>
  );
}
