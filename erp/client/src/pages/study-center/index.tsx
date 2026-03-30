import { Routes, Route } from 'react-router-dom';
import Students from './Students';
import ReregPortal from './ReregPortal';
import AdmissionWizard from './AdmissionWizard';
import AccreditationInterest from './AccreditationInterest';
import Programs from './ProgramOfferings';
import Announcements from './Announcements';
import Dashboard from './Dashboard';

export default function StudyCenterDashboard() {
  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="programs" element={<Programs />} />
      <Route path="students" element={<Students />} />
      <Route path="admission" element={<AdmissionWizard />} />
      <Route path="rereg" element={<ReregPortal />} />
      <Route path="accreditation" element={<AccreditationInterest />} />
      <Route path="announcements" element={<Announcements />} />
    </Routes>
  );
}
