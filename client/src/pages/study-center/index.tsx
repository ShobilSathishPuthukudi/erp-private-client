import { Routes, Route } from 'react-router-dom';
import { useApplyTheme } from '@/hooks/useApplyTheme';
import Students from './Students';
import ReregPortal from './ReregPortal';
import AdmissionWizard from './AdmissionWizard';
import AccreditationInterest from './AccreditationInterest';
import Programs from './ProgramOfferings';
import Announcements from './Announcements';
import InternalMarks from './InternalMarks';
import Dashboard from './Dashboard';
import StudentDetails from '../academic/StudentDetails';
import Sessions from '../academic/Sessions';
import Exams from '../academic/Exams';
import MarksEntry from '../academic/MarksEntry';

export default function StudyCenterDashboard() {
  useApplyTheme();
  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="programs" element={<Programs />} />
      <Route path="students" element={<Students />} />
      <Route path="students/:id" element={<StudentDetails />} />
      <Route path="internal-marks" element={<InternalMarks />} />
      <Route path="admission" element={<AdmissionWizard />} />
      <Route path="rereg" element={<ReregPortal />} />
      <Route path="accreditation" element={<AccreditationInterest />} />
      <Route path="announcements" element={<Announcements />} />
      <Route path="sessions" element={<Sessions />} />
      <Route path="exams" element={<Exams />} />
      <Route path="exams/:id/marks" element={<MarksEntry />} />
    </Routes>
  );
}
