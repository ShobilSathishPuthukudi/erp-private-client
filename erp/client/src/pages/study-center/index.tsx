import { Routes, Route } from 'react-router-dom';
import Students from './Students';
import ReregPortal from './ReregPortal';
import AdmissionWizard from './AdmissionWizard';
import AccreditationInterest from './AccreditationInterest';
import ProgramOfferings from './ProgramOfferings';
import Announcements from './Announcements';
import { useAuthStore } from '@/store/authStore';

export default function StudyCenterDashboard() {
  const user = useAuthStore(state => state.user);

  return (
    <Routes>
      <Route path="/" element={
        <div className="p-6">
          <h1 className="text-2xl font-bold text-slate-900 mb-4">Study Center Operations</h1>
          <p className="text-slate-500">
            Welcome, {user?.name}. Manage and review all student enrollments securely attached to your physical location.
          </p>
        </div>
      } />
      <Route path="students" element={<Students />} />
      <Route path="admission" element={<AdmissionWizard />} />
      <Route path="accreditation" element={<AccreditationInterest />} />
      <Route path="/" element={<ProgramOfferings />} />
      <Route path="students" element={<Students />} />
      <Route path="rereg" element={<ReregPortal />} />
    </Routes>
  );
}
