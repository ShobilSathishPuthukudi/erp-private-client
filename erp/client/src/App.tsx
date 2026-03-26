import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from '@/store/authStore';

// Layout
import DashboardLayout from '@/components/layout/DashboardLayout';
import ErrorBoundary from '@/components/shared/ErrorBoundary';

// Pages
import LoginPage from '@/pages/login';
import ProfilePage from '@/pages/profile';
import Preferences from '@/pages/profile/Preferences';
import OrgAdminDashboard from '@/pages/org-admin';
import SystemHealth from '@/pages/org-admin/SystemHealth';
import DataManagement from '@/pages/org-admin/DataManagement';
import CronMonitoring from '@/pages/org-admin/CronMonitoring';
import FinanceDashboard from '@/pages/finance';
import AcademicDashboard from '@/pages/academic';
import HRDashboard from '@/pages/hr';
import DeptAdminDashboard from '@/pages/dept-admin';
import SubDeptDashboard from '@/pages/sub-dept';
import StudyCenterDashboard from '@/pages/study-center';
import StudentPortal from '@/pages/student';
import EmployeePortal from '@/pages/employee';
import SalesDashboard from '@/pages/sales';
import ReferralForm from '@/pages/public/ReferralForm';

import CEODashboard from '@/pages/ceo';
import SurveyCreator from '@/pages/org-admin/SurveyCreator';
import SurveyHub from '@/pages/shared/SurveyHub';
import NotFound from '@/pages/NotFound';

// Portals - Placeholders
function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode, allowedRoles?: string[] }) {
  const user = useAuthStore((state) => state.user);
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  if (allowedRoles && !allowedRoles.includes(user.role.toLowerCase()) && !allowedRoles.includes(user.role)) {
    return <Navigate to="/404" replace />; 
  }
  
  return <>{children}</>;
}

export default function App() {
  const user = useAuthStore((state) => state.user);

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Toaster position="top-right" />
        <Routes>
          <Route path="/login" element={user ? <Navigate to={`/dashboard/${user.role}`} replace /> : <LoginPage />} />
          
          {/* Dashboards wrapped in DashboardLayout */}
          <Route path="/dashboard" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
            <Route path="profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
            <Route path="profile/preferences" element={<ProtectedRoute><Preferences /></ProtectedRoute>} />
            <Route path="org-admin/*" element={<ProtectedRoute allowedRoles={['org-admin', 'system-admin']}><OrgAdminDashboard /></ProtectedRoute>} />
            <Route path="org-admin/system-health" element={<ProtectedRoute allowedRoles={['org-admin', 'system-admin']}><SystemHealth /></ProtectedRoute>} />
            <Route path="org-admin/data" element={<ProtectedRoute allowedRoles={['org-admin', 'system-admin']}><DataManagement /></ProtectedRoute>} />
            <Route path="org-admin/cron" element={<ProtectedRoute allowedRoles={['org-admin', 'system-admin']}><CronMonitoring /></ProtectedRoute>} />
            <Route path="org-admin/surveys" element={<ProtectedRoute allowedRoles={['org-admin', 'system-admin', 'academic']}><SurveyCreator /></ProtectedRoute>} />
            <Route path="shared/surveys" element={<ProtectedRoute><SurveyHub /></ProtectedRoute>} />
            <Route path="ceo/*" element={<ProtectedRoute allowedRoles={['ceo']}><CEODashboard /></ProtectedRoute>} />
            <Route path="dept-admin/*" element={<ProtectedRoute allowedRoles={['dept-admin']}><DeptAdminDashboard /></ProtectedRoute>} />
            <Route path="academic/*" element={<ProtectedRoute allowedRoles={['academic']}><AcademicDashboard /></ProtectedRoute>} />
            <Route path="finance/*" element={<ProtectedRoute allowedRoles={['finance']}><FinanceDashboard /></ProtectedRoute>} />
            <Route path="hr/*" element={<ProtectedRoute allowedRoles={['hr']}><HRDashboard /></ProtectedRoute>} />
            <Route path="sales/*" element={<ProtectedRoute allowedRoles={['sales']}><SalesDashboard /></ProtectedRoute>} />
            <Route path="study-center/*" element={<ProtectedRoute allowedRoles={['study-center']}><StudyCenterDashboard /></ProtectedRoute>} />
            <Route path="student/*" element={<ProtectedRoute allowedRoles={['student']}><StudentPortal /></ProtectedRoute>} />
            <Route path="employee/*" element={<ProtectedRoute allowedRoles={['employee']}><EmployeePortal /></ProtectedRoute>} />
            
            {/* Unit Role Redirects (Legacy support) */}
            <Route path="openschool/*" element={<Navigate to="/dashboard/subdept/openschool/portal" replace />} />
            <Route path="online/*" element={<Navigate to="/dashboard/subdept/online/portal" replace />} />
            <Route path="skill/*" element={<Navigate to="/dashboard/subdept/skill/portal" replace />} />
            <Route path="bvoc/*" element={<Navigate to="/dashboard/subdept/bvoc/portal" replace />} />
            
            <Route path="subdept/*" element={<ProtectedRoute allowedRoles={['org-admin', 'system-admin', 'SUB_DEPT_ADMIN', 'academic', 'openschool', 'online', 'skill', 'bvoc']}><SubDeptDashboard /></ProtectedRoute>} />
            
            <Route index element={<Navigate to={
                user 
                   ? (['openschool', 'online', 'skill', 'bvoc'].includes(user.role.toLowerCase()) 
                        ? `/dashboard/subdept/${user.role.toLowerCase()}` 
                        : `/dashboard/${user.role.toLowerCase()}`)
                   : '/login'
            } replace />} />
          </Route>
          
          {/* Public Referral Link */}
          <Route path="/referral/:code" element={<ReferralForm />} />
          
          {/* Global Fallbacks */}
          <Route path="/404" element={<NotFound />} />
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
