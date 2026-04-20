import { Routes, Route } from 'react-router-dom';
import SalesPerformance from './SalesPerformance';
import SalesAchievement from './SalesAchievement';
import SalesTargetInbox from './SalesTargetInbox';
import ReferredLeads from '../academic/ReferredLeads';
import DepartmentTeam from '@/components/team/DepartmentTeam';
import DepartmentTasks from '@/components/team/DepartmentTasks';
import DepartmentLeaves from '@/components/team/DepartmentLeaves';
import TeamLeaveStatus from '@/components/team/TeamLeaveStatus';

import { useAuthStore } from '@/store/authStore';
import { DashboardGreeting } from '@/components/shared/DashboardGreeting';
import { TrendingUp, Users } from 'lucide-react';

export default function SalesDashboard() {
  const { user } = useAuthStore();
  return (
    <Routes>
      <Route path="/" element={
        <div className="space-y-10">
          <DashboardGreeting 
            role="Director - Growth & CRM"
            name={user?.name || 'Academic Administrator'}
            subtitle={`Sales telemetry and conversion velocity overview for ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}. Growth & Outreach protocols active.`}
            actions={[
              {
                label: 'CRM Analytics',
                link: '/dashboard/sales/crm',
                icon: TrendingUp
              },
              {
                label: 'Lead Capture',
                link: '/dashboard/sales/prospects',
                icon: Users
              }
            ]}
          />
          <SalesAchievement />
          <SalesPerformance />
        </div>
      } />
      <Route path="prospects" element={<ReferredLeads defaultTab="leads" />} />
      <Route path="nodes" element={<ReferredLeads defaultTab="centers" />} />
      <Route path="targets" element={<SalesTargetInbox />} />
      <Route path="team" element={<DepartmentTeam />} />
      <Route path="tasks" element={<DepartmentTasks />} />
      <Route path="leaves" element={<DepartmentLeaves />} />
      <Route path="leave-status" element={<TeamLeaveStatus />} />
    </Routes>
  );
}
