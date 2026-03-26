import { Routes, Route } from 'react-router-dom';
import Employees from './Employees';
import Leaves from './Leaves';
import Attendance from './Attendance';
import Announcements from './Announcements';
import Holidays from './Holidays';

export default function HRDashboard() {
  return (
    <Routes>
      <Route path="/" element={
        <div className="p-6">
          <h1 className="text-2xl font-bold text-slate-900 mb-4">Human Resources</h1>
          <p className="text-slate-500">Manage institutional staff, approve advanced leave requests, track attendance, and broadcast internal announcements globally.</p>
        </div>
      } />
      <Route path="employees" element={<Employees />} />
      <Route path="leaves" element={<Leaves />} />
      <Route path="attendance" element={<Attendance />} />
      <Route path="announcements" element={<Announcements />} />
      <Route path="holidays" element={<Holidays />} />
    </Routes>
  );
}
