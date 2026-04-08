import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';

/**
 * Universal Task Redirector
 * Resolves the 404 issue by dynamically routing any user from 
 * the universal '/dashboard/tasks' path to their role-specific task dashboard.
 */
export default function TasksRedirect() {
  const user = useAuthStore(state => state.user);

  if (!user) return <Navigate to="/login" replace />;

  const role = user.role?.toLowerCase()?.trim() || '';
  const subDept = user.subDepartment?.toLowerCase()?.trim();

  console.log(`[NAVIGATE] Redirecting to task portal for: Role=${role}, SubDept=${subDept}`);

  switch (role) {
    case 'hr':
      return <Navigate to="/dashboard/hr/dept-tasks" replace />;
    
    case 'academic':
    case 'operations':
    case 'ops':
      return <Navigate to="/dashboard/academic/tasks" replace />;
    
    case 'finance':
      return <Navigate to="/dashboard/finance/tasks" replace />;
    
    case 'sales':
      return <Navigate to="/dashboard/sales/tasks" replace />;
    
    case 'ceo':
      return <Navigate to="/dashboard/ceo/tasks" replace />;
    
    case 'employee':
      return <Navigate to="/dashboard/employee/tasks" replace />;
    
    case 'bvoc':
    case 'skill':
    case 'online':
    case 'openschool':
      return <Navigate to={`/dashboard/subdept/${role}/tasks`} replace />;
    
    case 'study-center':
    case 'center':
      // Study center doesn't have a direct tasks page, fallback to dashboard
      return <Navigate to="/dashboard/study-center" replace />;

    default:
      // Global fallback to dashboard landing
      return <Navigate to="/dashboard" replace />;
  }
}
