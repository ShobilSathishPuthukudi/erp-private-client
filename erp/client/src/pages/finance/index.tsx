import { Routes, Route } from 'react-router-dom';
import Payments from './Payments';
import Invoices from './Invoices';
import FeeConfig from './FeeConfig';
// import AdmissionQueue from './AdmissionQueue'; // Temporarily removed if missing
import InstitutionalApprovals from './InstitutionalApprovals';
import StudentFinancials from './StudentFinancials';
import TargetManager from './TargetManager';
import ReregManager from './ReregManager';
import ReregConfig from './ReregConfig';
import CredentialReviewTab from './CredentialReviewTab';
import DistributionDashboard from './DistributionDashboard';
import AgingReport from './AgingReport';
import UniversityFinancialReport from './UniversityFinancialReport';
import DailyAdmissionReport from './DailyAdmissionReport';

export default function FinanceDashboard() {
  return (
    <Routes>
      <Route path="/" element={
        <div className="p-6">
          <h1 className="text-2xl font-bold text-slate-900 mb-4">Finance Dashboard</h1>
          <p className="text-slate-500">Welcome to the central finance portal. Manage incoming tuition, staff payroll, and global automated invoicing.</p>
        </div>
      } />
      <Route path="payments" element={<Payments />} />
      <Route path="invoices" element={<Invoices />} />
      <Route path="fee-config" element={<FeeConfig />} />
      {/* <Route path="admissions" element={<AdmissionQueue />} /> */}
      <Route path="approvals" element={<InstitutionalApprovals />} />
      <Route path="performance" element={<TargetManager />} />
      <Route path="rereg" element={<ReregManager />} />
      <Route path="rereg-config" element={<ReregConfig />} />
      <Route path="credentials" element={<CredentialReviewTab />} />
      <Route path="distributions" element={<DistributionDashboard />} />
      <Route path="aging" element={<AgingReport />} />
      <Route path="university-reports" element={<UniversityFinancialReport />} />
      <Route path="daily-admissions" element={<DailyAdmissionReport />} />
      <Route path="students/:id" element={<StudentFinancials />} />
    </Routes>
  );
}
