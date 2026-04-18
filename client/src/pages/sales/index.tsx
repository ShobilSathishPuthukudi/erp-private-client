import { Routes, Route } from 'react-router-dom';
import SalesPerformance from './SalesPerformance';
import SalesAchievement from './SalesAchievement';
import ReferredLeads from '../academic/ReferredLeads';
import DepartmentTeam from '@/components/team/DepartmentTeam';
import DepartmentTasks from '@/components/team/DepartmentTasks';
import DepartmentLeaves from '@/components/team/DepartmentLeaves';
import TeamLeaveStatus from '@/components/team/TeamLeaveStatus';

export default function SalesDashboard() {
  return (
    <Routes>
      <Route path="/" element={
        <div className="space-y-6">
          <SalesAchievement />
          <SalesPerformance />
        </div>
      } />
      <Route path="prospects" element={<ReferredLeads defaultTab="leads" />} />
      <Route path="nodes" element={<ReferredLeads defaultTab="centers" />} />
      <Route path="team" element={<DepartmentTeam />} />
      <Route path="tasks" element={<DepartmentTasks />} />
      <Route path="leaves" element={<DepartmentLeaves />} />
      <Route path="leave-status" element={<TeamLeaveStatus />} />
    </Routes>
  );
}
