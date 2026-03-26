import { Routes, Route } from 'react-router-dom';
import Programs from './Programs';
import Students from './Students';
import AccreditationRequests from './AccreditationRequests';
import Exams from '../academic/Exams';
import MarksEntry from '../academic/MarksEntry';
import Team from '../dept-admin/Team';
import Tasks from '../dept-admin/Tasks';
import Leaves from '../dept-admin/Leaves';
import DashboardLanding from './DashboardLanding';
import { useAuthStore } from '@/store/authStore';

export default function SubDeptDashboard() {
  const user = useAuthStore(state => state.user);
  const portalName = user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'Sub-department';

  return (
    <Routes>
      <Route path="/" element={<DashboardLanding />} />
      <Route path="programs" element={<Programs />} />
      <Route path="students" element={<Students />} />
      <Route path="accreditation" element={<AccreditationRequests />} />
      <Route path="exams" element={<Exams />} />
      <Route path="exams/:id/marks" element={<MarksEntry />} />
      <Route path="team" element={<Team />} />
      <Route path="tasks" element={<Tasks />} />
      <Route path="leaves" element={<Leaves />} />
    </Routes>
  );
}
