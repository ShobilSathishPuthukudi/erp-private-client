import { NavLink } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { Home, Users, FileText, BookOpen, Calendar, DollarSign, Database, CheckSquare } from 'lucide-react';
import { clsx } from 'clsx';

const menus = {
  'org-admin': [
    { name: 'Dashboard', path: '/dashboard/org-admin', icon: Home },
    { name: 'Departments', path: '/dashboard/org-admin/departments', icon: Database },
    { name: 'CEO Panels', path: '/dashboard/org-admin/ceo-panels', icon: Users },
    { name: 'Audit', path: '/dashboard/org-admin/audit', icon: FileText },
  ],
  'ceo': [
    { name: 'Dashboard', path: '/dashboard/ceo', icon: Home },
    { name: 'Escalations', path: '/dashboard/ceo/escalations', icon: FileText },
    { name: 'Reports', path: '/dashboard/ceo/reports', icon: Database },
  ],
  'finance': [
    { name: 'Dashboard', path: '/dashboard/finance', icon: Home },
    { name: 'Invoices', path: '/dashboard/finance/invoices', icon: DollarSign },
    { name: 'Payments', path: '/dashboard/finance/payments', icon: FileText },
  ],
  'hr': [
    { name: 'Dashboard', path: '/dashboard/hr', icon: Home },
    { name: 'Employees', path: '/dashboard/hr/employees', icon: Users },
    { name: 'Leave Approv.', path: '/dashboard/hr/leaves', icon: Calendar },
  ],
  'academic': [
    { name: 'Dashboard', path: '/dashboard/academic', icon: Home },
    { name: 'Universities', path: '/dashboard/academic/universities', icon: BookOpen },
    { name: 'Programs', path: '/dashboard/academic/programs', icon: FileText },
  ],
  'dept-admin': [
    { name: 'Dashboard', path: '/dashboard/dept-admin', icon: Home },
    { name: 'Tasks', path: '/dashboard/dept-admin/tasks', icon: CheckSquare },
    { name: 'Team Leave', path: '/dashboard/dept-admin/leaves', icon: Calendar },
  ],
  'student': [
    { name: 'Dashboard', path: '/dashboard/student', icon: Home },
    { name: 'My Invoices', path: '/dashboard/student/invoices', icon: DollarSign },
    { name: 'My Docs', path: '/dashboard/student/documents', icon: FileText },
  ],
  'default': [
    { name: 'Home', path: '/dashboard', icon: Home },
  ]
};

export default function Sidebar({ isOpen }: { isOpen: boolean }) {
  const user = useAuthStore(state => state.user);
  const role = user?.role || 'default';
  const links = menus[role as keyof typeof menus] || menus['default'];

  return (
    <aside className={clsx(
      "fixed inset-y-0 left-0 bg-white text-slate-600 border-r border-slate-200 w-64 transform transition-transform duration-300 ease-in-out z-20 flex flex-col shadow-sm",
      isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
    )}>
      <div className="flex items-center justify-center h-16 px-6 bg-white border-b border-slate-200">
        <span className="text-xl font-bold text-blue-600 tracking-widest">ERP</span>
      </div>
      <div className="py-4 overflow-y-auto flex-1">
        <ul className="space-y-1">
          {links.map((link) => {
            const Icon = link.icon;
            return (
              <li key={link.path}>
                <NavLink
                  to={link.path}
                  end
                  className={({ isActive }) => clsx(
                    "flex items-center px-6 py-3 text-sm font-medium transition-colors border-l-4",
                    isActive 
                      ? "bg-blue-50 text-blue-700 border-blue-600" 
                      : "border-transparent hover:bg-slate-50 hover:text-slate-900 text-slate-600"
                  )}
                >
                  <Icon className="w-5 h-5 mr-3" />
                  {link.name}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </div>

      {user && (
        <div className="border-t border-slate-200 p-4 bg-slate-50 mt-auto">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 flex-shrink-0 rounded-full bg-white flex items-center justify-center text-slate-600 font-bold overflow-hidden border border-slate-200 shadow-sm">
              {user.avatar ? (
                <img src={user.avatar} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                user.name ? user.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() : 'U'
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 truncate">{user.name || 'User'}</p>
              <p className="text-xs text-slate-500 truncate capitalize">{user.role?.replace('-', ' ')}</p>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
