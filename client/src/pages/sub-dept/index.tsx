import { Routes, Route, Navigate } from 'react-router-dom';
import { useApplyTheme } from '@/hooks/useApplyTheme';
import Programs from './Programs';
import Students from './Students';
import StudentDetails from '../academic/StudentDetails';
import Centers from './Centers';
import Sessions from './Sessions';
import CredentialRequests from './CredentialRequests';
import DashboardLanding from './DashboardLanding';
import StudentValidation from './StudentValidation';
import DepartmentTeam from '@/components/team/DepartmentTeam';
import DepartmentTasks from '@/components/team/DepartmentTasks';
import DepartmentLeaves from '@/components/team/DepartmentLeaves';
import TeamLeaveStatus from '@/components/team/TeamLeaveStatus';
import SubDeptInternalMarks from './InternalMarks';
import { useAuthStore } from '@/store/authStore';

export default function SubDeptDashboard() {
  useApplyTheme();
  const user = useAuthStore(state => state.user);
  
  return (
    <Routes>
      <Route path=":unit/*">
        <Route index element={<DashboardLanding />} />
        <Route path="portal" element={<DashboardLanding />} />
        <Route path="programs" element={<Programs />} />
        <Route path="students" element={<Students />} />
        <Route path="students/:id" element={<StudentDetails />} />
        <Route path="validation" element={<StudentValidation />} />
        <Route path="centers" element={<Centers />} />
        <Route path="sessions" element={<Sessions />} />
        <Route path="internal-marks" element={<SubDeptInternalMarks />} />
        <Route path="credentials" element={<CredentialRequests />} />
        <Route path="team" element={<DepartmentTeam />} />
        <Route path="tasks" element={<DepartmentTasks />} />
        <Route path="leaves" element={<DepartmentLeaves />} />
        <Route path="leave-status" element={<TeamLeaveStatus />} />
      </Route>
      
      {/* Fallback for role-specific unit landing */}
      <Route path="*" element={<Navigate to={user?.subDepartment?.toLowerCase() || user?.role?.toLowerCase() || 'portal'} replace />} />
    </Routes>
  );
}
