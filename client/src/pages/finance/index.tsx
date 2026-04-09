import { Routes, Route } from 'react-router-dom';
import Payments from './Payments';
import Invoices from './Invoices';
import FeeConfig from './FeeConfig';
// import AdmissionQueue from './AdmissionQueue'; // Temporarily removed if missing
import FinanceMainDashboard from './FinanceMainDashboard';
import InstitutionalApprovals from './InstitutionalApprovals';
import AccreditationQueue from './AccreditationQueue';
import AdmissionSessionsQueue from './AdmissionSessionsQueue';
import StudentFinancials from './StudentFinancials';
import TargetManager from './TargetManager';
import ReregManager from './ReregManager';
import ReregConfig from './ReregConfig';
import CredentialReviewTab from './CredentialReviewTab';
import DistributionDashboard from './DistributionDashboard';
import AgingReport from './AgingReport';
import UniversityFinancialReport from './UniversityFinancialReport';
import DailyAdmissionReport from './DailyAdmissionReport';
import CredentialAudit from './CredentialAudit';
import CenterVerification from './CenterVerification';
import DepartmentTeam from '@/components/team/DepartmentTeam';
import DepartmentTasks from '@/components/team/DepartmentTasks';
import DepartmentLeaves from '@/components/team/DepartmentLeaves';

export default function FinanceDashboard() {
  return (
    <Routes>
      <Route path="/" element={<FinanceMainDashboard />} />
      <Route path="payments" element={<Payments />} />
      <Route path="invoices" element={<Invoices />} />
      <Route path="fee-config" element={<FeeConfig />} />
      {/* <Route path="admissions" element={<AdmissionQueue />} /> */}
      <Route path="approvals" element={<InstitutionalApprovals />} />
      <Route path="accreditation-queue" element={<AccreditationQueue />} />
      <Route path="sessions-queue" element={<AdmissionSessionsQueue />} />
      <Route path="center-verification" element={<CenterVerification />} />
      <Route path="performance" element={<TargetManager />} />
      <Route path="rereg" element={<ReregManager />} />
      <Route path="rereg-config" element={<ReregConfig />} />
      <Route path="credentials" element={<CredentialReviewTab />} />
      <Route path="audit/security" element={<CredentialAudit />} />
      <Route path="distributions" element={<DistributionDashboard />} />
      <Route path="aging" element={<AgingReport />} />
      <Route path="university-reports" element={<UniversityFinancialReport />} />
      <Route path="daily-admissions" element={<DailyAdmissionReport />} />
      <Route path="students/:id" element={<StudentFinancials />} />
      <Route path="team" element={<DepartmentTeam />} />
      <Route path="tasks" element={<DepartmentTasks />} />
      <Route path="leaves" element={<DepartmentLeaves />} />
    </Routes>
  );
}
