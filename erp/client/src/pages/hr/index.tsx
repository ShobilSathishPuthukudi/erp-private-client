import { Routes, Route } from 'react-router-dom';
import Employees from './Employees';
import Vacancies from './Vacancies';
import Performance from './Performance';
import HRTasks from './Tasks';
import Leaves from './Leaves';
import Attendance from './Attendance';
import Announcements from './Announcements';
import Holidays from './Holidays';

export default function HRDashboard() {
  return (
    <Routes>
      <Route path="/" element={
        <div className="p-6">
          <h1 className="text-2xl font-bold text-slate-900 mb-4">Workforce Control System</h1>
          <p className="text-slate-500">Manage institutional strategy through vacancy-based hiring, hierarchical personnel control, and performance analytics.</p>
        </div>
      } />
      <Route path="vacancies" element={<Vacancies />} />
      <Route path="employees" element={<Employees />} />
      <Route path="performance" element={<Performance />} />
      <Route path="tasks" element={<HRTasks />} />
      <Route path="leaves" element={<Leaves />} />
      <Route path="attendance" element={<Attendance />} />
      <Route path="announcements" element={<Announcements />} />
      <Route path="holidays" element={<Holidays />} />
    </Routes>
  );
}
