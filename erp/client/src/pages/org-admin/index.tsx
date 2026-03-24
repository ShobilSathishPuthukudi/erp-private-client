import { Routes, Route } from 'react-router-dom';
import Departments from './Departments';

export default function OrgAdminDashboard() {
  return (
    <Routes>
      <Route path="/" element={<div className="p-6"><h1 className="text-2xl font-bold text-slate-900 mb-4">Org Admin Dashboard</h1><p className="text-slate-500">Welcome to the central admin portal. System metrics will be displayed here.</p></div>} />
      <Route path="departments" element={<Departments />} />
      <Route path="ceo-panels" element={<div><h1 className="text-2xl font-bold">CEO Panels (Coming Soon)</h1></div>} />
      <Route path="audit" element={<div><h1 className="text-2xl font-bold">Audit (Coming Soon)</h1></div>} />
    </Routes>
  );
}
