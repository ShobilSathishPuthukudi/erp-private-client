import { Routes, Route } from 'react-router-dom';
import { useApplyTheme } from '@/hooks/useApplyTheme';
import SalesPerformance from './SalesPerformance';
import SalesAchievement from './SalesAchievement';
import SalesTargetInbox from './SalesTargetInbox';
import DepartmentTeam from '@/components/team/DepartmentTeam';
import DepartmentTasks from '@/components/team/DepartmentTasks';
import DepartmentLeaves from '@/components/team/DepartmentLeaves';
import TeamLeaveStatus from '@/components/team/TeamLeaveStatus';

import { useAuthStore } from '@/store/authStore';
import { DashboardGreeting } from '@/components/shared/DashboardGreeting';
import { TrendingUp, Users, Target } from 'lucide-react';

export default function SalesDashboard() {
  useApplyTheme();
  const { user } = useAuthStore();
  return (
    <Routes>
      <Route path="/" element={
        <div className="p-2 space-y-10">
          <DashboardGreeting 
            role="Director - Growth & CRM"
            name={user?.name || 'Academic Administrator'}
            subtitle={`Sales telemetry and conversion velocity overview for ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}. Growth & Outreach protocols active.`}
            actions={[
              {
                label: 'Onboarding hub',
                link: '/dashboard/operations/onboarding-hub',
                icon: TrendingUp
              },
              {
                label: 'Target workflow',
                link: '/dashboard/sales/targets',
                icon: Target
              }
            ]}
          />
          <SalesAchievement />
          <SalesPerformance />
        </div>
      } />
      <Route path="targets" element={<SalesTargetInbox />} />
      <Route path="team" element={<DepartmentTeam />} />
      <Route path="tasks" element={<DepartmentTasks />} />
      <Route path="leaves" element={<DepartmentLeaves />} />
      <Route path="leave-status" element={<TeamLeaveStatus />} />
    </Routes>
  );
}
