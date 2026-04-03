import { Routes, Route } from 'react-router-dom';
import CRM from './CRM';
import SalesPerformance from './SalesPerformance';
import SalesAchievement from './SalesAchievement';
import ReferredLeads from '../academic/ReferredLeads';
import DepartmentTeam from '@/components/team/DepartmentTeam';
import DepartmentTasks from '@/components/team/DepartmentTasks';
import DepartmentLeaves from '@/components/team/DepartmentLeaves';

export default function SalesDashboard() {
  return (
    <Routes>
      <Route path="/" element={
        <div className="space-y-6">
          <SalesAchievement />
          <SalesPerformance />
        </div>
      } />
      <Route path="crm" element={<CRM />} />
      <Route path="crm/pipeline" element={<CRM category="PIPELINE" />} />
      <Route path="crm/outcome" element={<CRM category="CLOSED" />} />
      <Route path="referrals" element={<ReferredLeads />} />
      <Route path="team" element={<DepartmentTeam />} />
      <Route path="tasks" element={<DepartmentTasks />} />
      <Route path="leaves" element={<DepartmentLeaves />} />
    </Routes>
  );
}
