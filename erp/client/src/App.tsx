import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from '@/store/authStore';

// Layout
import DashboardLayout from '@/components/layout/DashboardLayout';
import ErrorBoundary from '@/components/shared/ErrorBoundary';

// Pages
import LoginPage from '@/pages/login';
import ProfilePage from '@/pages/profile';
import ChangePassword from '@/pages/profile/ChangePassword';
import Preferences from '@/pages/profile/Preferences';
import OrgAdminDashboard from '@/pages/org-admin';
import SystemHealth from '@/pages/org-admin/SystemHealth';
import DataManagement from '@/pages/org-admin/DataManagement';
import CronMonitoring from '@/pages/org-admin/CronMonitoring';
import FinanceDashboard from '@/pages/finance';
import AcademicDashboard from '@/pages/academic';
import HRDashboard from '@/pages/hr';
import SubDeptDashboard from '@/pages/sub-dept';
import StudyCenterDashboard from '@/pages/study-center';
import StudentPortal from '@/pages/student';
import EmployeePortal from '@/pages/employee';
import SalesDashboard from '@/pages/sales';
import ReferralForm from '@/pages/public/ReferralForm';
import CenterRegistration from '@/pages/public/CenterRegistration';

import CEODashboard from '@/pages/ceo';
import SurveyCreator from '@/pages/org-admin/SurveyCreator';
import SurveyHub from '@/pages/shared/SurveyHub';
import NotFound from '@/pages/NotFound';

// Portals - Placeholders
function ProtectedRoute({ children, allowedRoles }: { children: ReactNode, allowedRoles?: string[] }) {
  const user = useAuthStore((state) => state.user);
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  const userRole = user.role.toLowerCase().trim();
  const normalizedAllowed = allowedRoles?.map(r => r.toLowerCase().trim()) || [];

  if (allowedRoles) {
    console.log(`[AUTH] Checking access: UserRole='${userRole}', Allowed=[${normalizedAllowed.join(', ')}], Match=${normalizedAllowed.includes(userRole)}`);
    if (!normalizedAllowed.includes(userRole)) {
      console.warn(`[AUTH] Access Denied for ${user.uid}: Required one of [${allowedRoles}] but has '${user.role}'`);
      return <Navigate to="/404" replace />; 
    }
  }
  
  return <>{children}</>;
}

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

export default function App() {
  const user = useAuthStore((state) => state.user);

  // Auto-migrate legacy 'center' role from storage to 'study-center'
  useEffect(() => {
    if (user && user.role?.toLowerCase().trim() === 'center') {
      useAuthStore.getState().updateUser({ role: 'study-center' });
    }
  }, [user]);

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <ScrollToTop />
        <Toaster position="top-right" />
        <Routes>
          <Route path="/login" element={user ? <Navigate to={(['center', 'study-center'].includes(user.role.toLowerCase()) ? '/dashboard/study-center' : `/dashboard/${user.role.toLowerCase()}`)} replace /> : <LoginPage />} />
          
          {/* Dashboards wrapped in DashboardLayout */}
          <Route path="/dashboard" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
            <Route index element={<Navigate to={
                user 
                   ? (['openschool', 'online', 'skill', 'bvoc'].includes(user.role.toLowerCase().trim()) 
                        ? `/dashboard/subdept/${user.role.toLowerCase().trim()}` 
                        : (user.role.toLowerCase().trim() === 'operations' 
                           ? '/dashboard/operations/overview'
                           : (['center', 'study-center'].includes(user.role.toLowerCase().trim()) 
                              ? '/dashboard/study-center' 
                              : `/dashboard/${user.role.toLowerCase().trim()}`)))
                   : '/login'
            } replace />} />

            {/* Final Redirect Protection */}
            <Route path="center" element={<Navigate to="/dashboard/study-center" replace />} />
            <Route path="center/*" element={<Navigate to="/dashboard/study-center" replace />} />
            
            <Route path="profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
            <Route path="change-password" element={<ProtectedRoute><ChangePassword /></ProtectedRoute>} />
            <Route path="profile/preferences" element={<ProtectedRoute><Preferences /></ProtectedRoute>} />
            <Route path="org-admin/*" element={<ProtectedRoute allowedRoles={['org-admin', 'system-admin']}><OrgAdminDashboard /></ProtectedRoute>} />
            <Route path="org-admin/system-health" element={<ProtectedRoute allowedRoles={['org-admin', 'system-admin', 'ceo']}><SystemHealth /></ProtectedRoute>} />
            <Route path="org-admin/data" element={<ProtectedRoute allowedRoles={['org-admin', 'system-admin']}><DataManagement /></ProtectedRoute>} />
            <Route path="org-admin/cron" element={<ProtectedRoute allowedRoles={['org-admin', 'system-admin']}><CronMonitoring /></ProtectedRoute>} />
            <Route path="org-admin/surveys" element={<ProtectedRoute allowedRoles={['org-admin', 'system-admin', 'academic']}><SurveyCreator /></ProtectedRoute>} />
            <Route path="shared/surveys" element={<ProtectedRoute><SurveyHub /></ProtectedRoute>} />
            <Route path="ceo/*" element={<ProtectedRoute allowedRoles={['ceo']}><CEODashboard /></ProtectedRoute>} />
            <Route path="academic/*" element={<ProtectedRoute allowedRoles={['academic', 'operations']}><AcademicDashboard /></ProtectedRoute>} />
            <Route path="operations/*" element={<ProtectedRoute allowedRoles={['operations', 'academic']}><AcademicDashboard /></ProtectedRoute>} />
            <Route path="finance/*" element={<ProtectedRoute allowedRoles={['finance']}><FinanceDashboard /></ProtectedRoute>} />
            <Route path="hr/*" element={<ProtectedRoute allowedRoles={['hr']}><HRDashboard /></ProtectedRoute>} />
            <Route path="sales/*" element={<ProtectedRoute allowedRoles={['sales']}><SalesDashboard /></ProtectedRoute>} />
            <Route path="study-center/*" element={<ProtectedRoute allowedRoles={['study-center', 'center']}><StudyCenterDashboard /></ProtectedRoute>} />
            <Route path="student/*" element={<ProtectedRoute allowedRoles={['student']}><StudentPortal /></ProtectedRoute>} />
            <Route path="employee/*" element={<ProtectedRoute allowedRoles={['employee']}><EmployeePortal /></ProtectedRoute>} />
            
            <Route path="openschool/*" element={<Navigate to="/dashboard/subdept/openschool/portal" replace />} />
            <Route path="online/*" element={<Navigate to="/dashboard/subdept/online/portal" replace />} />
            <Route path="skill/*" element={<Navigate to="/dashboard/subdept/skill/portal" replace />} />
            <Route path="bvoc/*" element={<Navigate to="/dashboard/subdept/bvoc/portal" replace />} />
            
            <Route path="subdept/*" element={<ProtectedRoute allowedRoles={['org-admin', 'system-admin', 'SUB_DEPT_ADMIN', 'academic', 'openschool', 'online', 'skill', 'bvoc']}><SubDeptDashboard /></ProtectedRoute>} />
          </Route>
          
          {/* Public Referral & Registration Links */}
          <Route path="/referral/:code" element={<ReferralForm />} />
          <Route path="/register-center/:bdeId" element={<CenterRegistration />} />
          
          {/* Global Fallbacks */}
          <Route path="/404" element={<NotFound />} />
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
