import { Routes, Route } from 'react-router-dom';
import MyTasks from './MyTasks';
import LeaveRequests from './LeaveRequests';
import Announcements from './Announcements';
import { useAuthStore } from '@/store/authStore';

export default function EmployeePortal() {
  const user = useAuthStore(state => state.user);

  return (
    <Routes>
      <Route path="/" element={
        <div className="p-6">
          <h1 className="text-2xl font-bold text-slate-900 mb-4">Employee Staff Portal</h1>
          <p className="text-slate-500">
            Welcome, {user?.name}. This is your primary hub for managing assigned operational deliverables and tracking your personal leave requests.
          </p>
        </div>
      } />
      <Route path="tasks" element={<MyTasks />} />
      <Route path="leaves" element={<LeaveRequests />} />
      <Route path="announcements" element={<Announcements />} />
    </Routes>
  );
}
