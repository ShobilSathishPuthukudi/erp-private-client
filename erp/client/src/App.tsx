import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from '@/store/authStore';

// Layout
import DashboardLayout from '@/components/layout/DashboardLayout';

// Pages
import LoginPage from '@/pages/login';
import ProfilePage from '@/pages/profile';
import OrgAdminDashboard from '@/pages/org-admin';

// Portals - Placeholders
const CEODashboard = () => <div><h1 className="text-2xl font-bold text-slate-900">CEO Dashboard</h1></div>;
const DeptAdminDashboard = () => <div><h1 className="text-2xl font-bold text-slate-900">Dept Admin Dashboard</h1></div>;
const AcademicDashboard = () => <div><h1 className="text-2xl font-bold text-slate-900">Academic Dashboard</h1></div>;
const FinanceDashboard = () => <div><h1 className="text-2xl font-bold text-slate-900">Finance Dashboard</h1></div>;
const HRDashboard = () => <div><h1 className="text-2xl font-bold text-slate-900">HR Dashboard</h1></div>;
const SalesDashboard = () => <div><h1 className="text-2xl font-bold text-slate-900">Sales Dashboard</h1></div>;
const StudyCenterDashboard = () => <div><h1 className="text-2xl font-bold text-slate-900">Study Center Dashboard</h1></div>;
const StudentPortal = () => <div><h1 className="text-2xl font-bold text-slate-900">Student Portal</h1></div>;
const EmployeePortal = () => <div><h1 className="text-2xl font-bold text-slate-900">Employee Portal</h1></div>;
const OpenSchoolDashboard = () => <div><h1 className="text-2xl font-bold text-slate-900">OpenSchool Dashboard</h1></div>;
const OnlineDashboard = () => <div><h1 className="text-2xl font-bold text-slate-900">Online Dashboard</h1></div>;
const SkillDashboard = () => <div><h1 className="text-2xl font-bold text-slate-900">Skill Dashboard</h1></div>;
const BVocDashboard = () => <div><h1 className="text-2xl font-bold text-slate-900">BVoc Dashboard</h1></div>;

function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode, allowedRoles?: string[] }) {
  const user = useAuthStore((state) => state.user);
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/login" replace />; 
  }
  
  return <>{children}</>;
}

export default function App() {
  const user = useAuthStore((state) => state.user);

  return (
    <BrowserRouter>
      <Toaster position="top-right" />
      <Routes>
        <Route path="/login" element={user ? <Navigate to={`/dashboard/${user.role}`} replace /> : <LoginPage />} />
        
        {/* Dashboards wrapped in DashboardLayout */}
        <Route path="/dashboard" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
          <Route path="profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
          <Route path="org-admin/*" element={<ProtectedRoute allowedRoles={['org-admin']}><OrgAdminDashboard /></ProtectedRoute>} />
          <Route path="ceo/*" element={<ProtectedRoute allowedRoles={['ceo']}><CEODashboard /></ProtectedRoute>} />
          <Route path="dept-admin/*" element={<ProtectedRoute allowedRoles={['dept-admin']}><DeptAdminDashboard /></ProtectedRoute>} />
          <Route path="academic/*" element={<ProtectedRoute allowedRoles={['academic']}><AcademicDashboard /></ProtectedRoute>} />
          <Route path="finance/*" element={<ProtectedRoute allowedRoles={['finance']}><FinanceDashboard /></ProtectedRoute>} />
          <Route path="hr/*" element={<ProtectedRoute allowedRoles={['hr']}><HRDashboard /></ProtectedRoute>} />
          <Route path="sales/*" element={<ProtectedRoute allowedRoles={['sales']}><SalesDashboard /></ProtectedRoute>} />
          <Route path="study-center/*" element={<ProtectedRoute allowedRoles={['study-center']}><StudyCenterDashboard /></ProtectedRoute>} />
          <Route path="student/*" element={<ProtectedRoute allowedRoles={['student']}><StudentPortal /></ProtectedRoute>} />
          <Route path="employee/*" element={<ProtectedRoute allowedRoles={['employee']}><EmployeePortal /></ProtectedRoute>} />
          <Route path="openschool/*" element={<ProtectedRoute allowedRoles={['openschool']}><OpenSchoolDashboard /></ProtectedRoute>} />
          <Route path="online/*" element={<ProtectedRoute allowedRoles={['online']}><OnlineDashboard /></ProtectedRoute>} />
          <Route path="skill/*" element={<ProtectedRoute allowedRoles={['skill']}><SkillDashboard /></ProtectedRoute>} />
          <Route path="bvoc/*" element={<ProtectedRoute allowedRoles={['bvoc']}><BVocDashboard /></ProtectedRoute>} />
          
          <Route index element={<Navigate to={user ? `/dashboard/${user.role}` : '/login'} replace />} />
        </Route>
        
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
