import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './store/authStore';
import Login from './pages/login';
import DashboardLayout from './components/layout/DashboardLayout';
import ErrorBoundary from './components/shared/ErrorBoundary';

// Dashboard Components
import OrgAdminDashboard from './pages/org-admin';
import AcademicDashboard from './pages/academic';
import FinanceDashboard from './pages/finance';
import HRDashboard from './pages/hr';
import SalesDashboard from './pages/sales';
import CEODashboard from './pages/ceo';
import PartnerCenterDashboard from './pages/study-center';
import StudentPortal from './pages/student';
import EmployeePortal from './pages/employee';
import SubDeptDashboard from './pages/sub-dept';

// Shared & Profile Pages
import ProfilePage from './pages/profile';
import ChangePassword from './pages/profile/ChangePassword';
import Preferences from './pages/profile/Preferences';
import Notifications from './pages/shared/Notifications';
import SurveyHub from './pages/shared/SurveyHub';
import SurveyCreator from './pages/org-admin/SurveyCreator';

// System Pages
import SystemHealth from './pages/org-admin/SystemHealth';
import DataManagement from './pages/org-admin/DataManagement';
import CronMonitoring from './pages/org-admin/CronMonitoring';
import ReferralForm from './pages/public/ReferralForm';
import CenterRegistration from './pages/public/CenterRegistration';
import NotFound from './pages/NotFound';
import ServerError from './pages/ServerError';

// Internal Handlers & Protected Routes
export const getNormalizedRole = (rawRole: string): string => {
  if (!rawRole) return 'guest';
  const r = rawRole.toLowerCase().trim();
  
  if (r.includes('hr')) return 'hr';
  if (r.includes('finance')) return 'finance';
  if (r.includes('sales')) return 'sales';
  if (r.includes('operations') || r.includes('academic')) return 'operations';
  if (r.includes('open school') || r.includes('openschool')) return 'openschool';
  if (r.includes('online')) return 'online';
  if (r.includes('skill')) return 'skill';
  if (r.includes('bvoc')) return 'bvoc';
  if (r === 'ceo') return 'ceo';
  if (r.includes('organization admin') || r === 'admin') return 'organization admin';
  if (r.includes('center')) return 'partner-center';
  
  return r;
};

const ProtectedRoute = ({ children, allowedRoles }: { children: React.ReactNode, allowedRoles?: string[] }) => {
  const user = useAuthStore((state) => state.user);
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const userRole = user.role?.toLowerCase().trim() || '';
  const normalizedUserRole = getNormalizedRole(userRole);
  const normalizedAllowed = allowedRoles?.map(r => getNormalizedRole(r)) || [];

  if (allowedRoles) {
    const hasAccess = normalizedAllowed.some(allowed => 
        userRole.includes(allowed) || normalizedUserRole === allowed
    );

    if (!hasAccess) {
      console.warn(`[AUTH] Access Denied for ${user.uid}: Required one of [${allowedRoles}] but has '${user.role}'`);
      return <Navigate to="/404" replace />; 
    }
  }
  
  return <>{children}</>;
};

const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
};

const TasksRedirect = () => {
  const user = useAuthStore(state => state.user);
  if (!user) return <Navigate to="/login" replace />;
  
  const role = getNormalizedRole(user.role);
  
  if (['openschool', 'online', 'skill', 'bvoc'].includes(role)) {
    return <Navigate to={`/dashboard/subdept/${role}/tasks`} replace />;
  }
  
  if (role === 'operations') {
    return <Navigate to="/dashboard/operations/tasks" replace />;
  }

  const rolePath = role === 'organization admin' ? 'org-admin' : role;
  return <Navigate to={`/dashboard/${rolePath}/tasks`} replace />;
};

export default function App() {
  const user = useAuthStore(state => state.user);

  useEffect(() => {
    // Role normalization now handled by backend, but kept for legacy session safety
    if (user && (user.role?.toLowerCase().trim() === 'center' || user.role?.toLowerCase().trim() === 'study-center')) {
      useAuthStore.getState().updateUser({ role: 'partner-center' });
    }
  }, [user]);

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <ScrollToTop />
        <Toaster position="top-right" />
        <Routes>
          <Route path="/login" element={!user ? <Login /> : <Navigate to="/dashboard" replace />} />
          
          <Route path="/dashboard" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
            <Route index element={<Navigate to={
                user 
                   ? (() => {
                       const role = getNormalizedRole(user.role);
                       if (['openschool', 'online', 'skill', 'bvoc'].includes(role)) {
                         return `/dashboard/subdept/${role}/portal`;
                       }
                       if (role === 'operations') {
                         return '/dashboard/operations/overview';
                       }
                       if (role === 'partner-center') {
                         return '/dashboard/partner-center';
                       }
                       if (role === 'organization admin') {
                         return '/dashboard/org-admin/overview';
                       }
                       if (role === 'hr') return '/dashboard/hr';
                       if (role === 'finance') return '/dashboard/finance';
                       if (role === 'sales') return '/dashboard/sales';
                       return `/dashboard/${role}`;
                     })()
                   : '/login'
            } replace />} />

            <Route path="center" element={<Navigate to="/dashboard/partner-center" replace />} />
            <Route path="center/*" element={<Navigate to="/dashboard/partner-center" replace />} />
            <Route path="study-center" element={<Navigate to="/dashboard/partner-center" replace />} />
            <Route path="study-center/*" element={<Navigate to="/dashboard/partner-center" replace />} />
            
            <Route path="tasks" element={<ProtectedRoute><TasksRedirect /></ProtectedRoute>} />
            <Route path="profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
            <Route path="change-password" element={<ProtectedRoute><ChangePassword /></ProtectedRoute>} />
            <Route path="profile/preferences" element={<ProtectedRoute><Preferences /></ProtectedRoute>} />
            
            <Route path="org-admin/*" element={<ProtectedRoute allowedRoles={['organization admin', 'operations']}><OrgAdminDashboard /></ProtectedRoute>} />
            <Route path="org-admin/system-health" element={<ProtectedRoute allowedRoles={['organization admin', 'ceo', 'operations']}><SystemHealth /></ProtectedRoute>} />
            <Route path="org-admin/data" element={<ProtectedRoute allowedRoles={['organization admin', 'operations']}><DataManagement /></ProtectedRoute>} />
            <Route path="org-admin/cron" element={<ProtectedRoute allowedRoles={['organization admin', 'operations']}><CronMonitoring /></ProtectedRoute>} />
            <Route path="org-admin/surveys" element={<ProtectedRoute allowedRoles={['organization admin', 'operations']}><SurveyCreator /></ProtectedRoute>} />
            
            <Route path="shared/surveys" element={<ProtectedRoute><SurveyHub /></ProtectedRoute>} />
            <Route path="notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
            
            <Route path="ceo/*" element={<ProtectedRoute allowedRoles={['ceo']}><CEODashboard /></ProtectedRoute>} />
            
            {/* Unified Academic & Operations Pillar dashboards */}
            <Route path="academic/*" element={<ProtectedRoute allowedRoles={['operations', 'organization admin']}><AcademicDashboard /></ProtectedRoute>} />
            <Route path="operations/*" element={<ProtectedRoute allowedRoles={['operations', 'organization admin']}><AcademicDashboard /></ProtectedRoute>} />
            
            <Route path="finance/*" element={<ProtectedRoute allowedRoles={['finance', 'operations']}><FinanceDashboard /></ProtectedRoute>} />
            <Route path="hr/*" element={<ProtectedRoute allowedRoles={['hr']}><HRDashboard /></ProtectedRoute>} />
            <Route path="sales/*" element={<ProtectedRoute allowedRoles={['sales', 'organization admin', 'ceo']}><SalesDashboard /></ProtectedRoute>} />
            
            <Route path="partner-center/*" element={<ProtectedRoute allowedRoles={['partner-center']}><PartnerCenterDashboard /></ProtectedRoute>} />
            <Route path="student/*" element={<ProtectedRoute allowedRoles={['student']}><StudentPortal /></ProtectedRoute>} />
            <Route path="employee/*" element={<ProtectedRoute allowedRoles={['employee']}><EmployeePortal /></ProtectedRoute>} />
            
            <Route path="openschool/*" element={<Navigate to="/dashboard/subdept/openschool/portal" replace />} />
            <Route path="online/*" element={<Navigate to="/dashboard/subdept/online/portal" replace />} />
            <Route path="skill/*" element={<Navigate to="/dashboard/subdept/skill/portal" replace />} />
            <Route path="bvoc/*" element={<Navigate to="/dashboard/subdept/bvoc/portal" replace />} />
            
            <Route path="subdept/*" element={<ProtectedRoute allowedRoles={['organization admin', 'SUB_DEPT_ADMIN', 'operations', 'openschool', 'online', 'skill', 'bvoc']}><SubDeptDashboard /></ProtectedRoute>} />
          </Route>
          
          <Route path="/referral/:code" element={<ReferralForm />} />
          <Route path="/register-center/:code" element={<CenterRegistration />} />
          
          <Route path="/server-error" element={<ServerError />} />
          <Route path="/404" element={<NotFound />} />
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
