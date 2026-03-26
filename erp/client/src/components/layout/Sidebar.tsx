import { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import {
  Home,
  Users,
  BookOpen,
  DollarSign,
  Database,
  CheckSquare,
  Bell,
  Activity,
  Settings,
  Megaphone,
  TrendingUp,
  RefreshCw,
  ShieldCheck,
  PieChart,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { clsx } from 'clsx';

type MenuItem = {
  name: string;
  path: string;
  icon: any;
  isGroup?: false;
};

type MenuGroup = {
  name: string;
  icon: any;
  isGroup: true;
  items: { name: string; path: string }[];
};

type MenuLink = MenuItem | MenuGroup;

const menus: Record<string, MenuLink[]> = {
  'org-admin': [
    {
      name: 'Dashboard',
      icon: Home,
      isGroup: true,
      items: [
        { name: 'Overview', path: '/dashboard/org-admin/overview' },
        { name: 'Alerts', path: '/dashboard/org-admin/alerts' },
      ]
    },
    {
      name: 'Departments',
      icon: Database,
      isGroup: true,
      items: [
        { name: 'All Departments', path: '/dashboard/org-admin/departments' },
        { name: 'Manage Custom', path: '/dashboard/org-admin/departments/custom' },
      ]
    },
    {
      name: 'CEO Panels',
      icon: Users,
      isGroup: true,
      items: [
        { name: 'All Panels', path: '/dashboard/org-admin/ceo-panels' },
        { name: 'Visibility Config', path: '/dashboard/org-admin/ceo-panels/visibility' },
      ]
    },
    {
      name: 'Permissions',
      icon: ShieldCheck,
      isGroup: true,
      items: [
        { name: 'Permission Matrix', path: '/dashboard/org-admin/permissions/matrix' },
        { name: 'Audit Log', path: '/dashboard/org-admin/permissions/audit' },
      ]
    },
    {
      name: 'Audit System',
      icon: Activity,
      isGroup: true,
      items: [
        { name: 'All Actions', path: '/dashboard/org-admin/audit/all' },
        { name: 'Filter & Search', path: '/dashboard/org-admin/audit/search' },
        { name: 'Compliance Report', path: '/dashboard/org-admin/audit/compliance' },
      ]
    },
    {
      name: 'Org Settings',
      icon: Settings,
      isGroup: true,
      items: [
        { name: 'General Settings', path: '/dashboard/org-admin/settings/general' },
        { name: 'Integrations', path: '/dashboard/org-admin/settings/integrations' },
        { name: 'Custom Fields', path: '/dashboard/org-admin/settings/custom-fields' },
      ]
    },
    {
      name: 'File Storage',
      icon: Database,
      isGroup: true,
      items: [
        { name: 'Storage Config', path: '/dashboard/org-admin/settings/storage-config' },
      ]
    },
  ],
  'ceo': [
    {
      name: 'Executive Panel',
      icon: PieChart,
      isGroup: true,
      items: [
        { name: 'KPIs Overview', path: '/dashboard/ceo/kpis' },
        { name: 'Growth Trends', path: '/dashboard/ceo/trends' },
        { name: 'Critical Inbox', path: '/dashboard/ceo/escalations' },
        { name: 'Dept Scorecard', path: '/dashboard/ceo/performance' },
        { name: 'Board Reports', path: '/dashboard/ceo/reports' },
      ]
    },
    {
      name: 'Operations',
      icon: TrendingUp,
      isGroup: true,
      items: [
        { name: 'Payout Approvals', path: '/dashboard/ceo/payouts' },
      ]
    },
    {
      name: 'Infrastructure',
      icon: Activity,
      isGroup: true,
      items: [
        { name: 'System Health', path: '/dashboard/org-admin/system-health' },
      ]
    }
  ],
  'finance': [
    { name: 'Dashboard', path: '/dashboard/finance', icon: Home },
    {
      name: 'Revenue Ops',
      icon: DollarSign,
      isGroup: true,
      items: [
        { name: 'Invoices', path: '/dashboard/finance/invoices' },
        { name: 'Payments', path: '/dashboard/finance/payments' },
        { name: 'Daily Admissions', path: '/dashboard/finance/daily-admissions' },
      ]
    },
    {
      name: 'Academic Finance',
      icon: RefreshCw,
      isGroup: true,
      items: [
        { name: 'REREG Verification', path: '/dashboard/finance/rereg' },
        { name: 'REREG Config', path: '/dashboard/finance/rereg-config' },
        { name: 'Credential Approv.', path: '/dashboard/finance/credentials' },
      ]
    },
    {
      name: 'Analytics',
      icon: PieChart,
      isGroup: true,
      items: [
        { name: 'Performance Hub', path: '/dashboard/finance/performance' },
        { name: 'Financial Splits', path: '/dashboard/finance/distributions' },
        { name: 'Aging Telemetry', path: '/dashboard/finance/aging' },
        { name: 'Uni Intelligence', path: '/dashboard/finance/university-reports' },
      ]
    }
  ],
  'hr': [
    { name: 'Dashboard', path: '/dashboard/hr', icon: Home },
    {
      name: 'People',
      icon: Users,
      isGroup: true,
      items: [
        { name: 'Employees', path: '/dashboard/hr/employees' },
        { name: 'Leave Approv.', path: '/dashboard/hr/leaves' },
        { name: 'Attendance', path: '/dashboard/hr/attendance' },
      ]
    },
    {
      name: 'Communications',
      icon: Bell,
      isGroup: true,
      items: [
        { name: 'Announcements', path: '/dashboard/hr/announcements' },
        { name: 'Holidays', path: '/dashboard/hr/holidays' },
      ]
    }
  ],
  'academic': [
    { name: 'Dashboard', path: '/dashboard/academic', icon: Home },
    {
      name: 'Architecture',
      icon: Database,
      isGroup: true,
      items: [
        { name: 'Universities', path: '/dashboard/academic/universities' },
        { name: 'Programs', path: '/dashboard/academic/programs' },
      ]
    },
    {
      name: 'Student Review',
      icon: Users,
      isGroup: true,
      items: [
        { name: 'Pending Reviews', path: '/dashboard/academic/pending-reviews' },
        { name: 'All Students', path: '/dashboard/academic/students' },
      ]
    },
    {
      name: 'Marks & Sessions',
      icon: BookOpen,
      isGroup: true,
      items: [
        { name: 'Session Management', path: '/dashboard/academic/sessions' },
        { name: 'Exams & Results', path: '/dashboard/academic/exams' },
      ]
    },
    {
      name: 'Credentials',
      icon: ShieldCheck,
      isGroup: true,
      items: [
        { name: 'Credential Requests', path: '/dashboard/academic/credential-requests' },
        { name: 'Security Control', path: '/dashboard/academic/security' },
      ]
    },
    {
      name: 'Operational Support',
      icon: Activity,
      isGroup: true,
      items: [
        { name: 'Staff Details', path: '/dashboard/academic/staff' },
        { name: 'Task Management', path: '/dashboard/academic/tasks' },
        { name: 'Announcements', path: '/dashboard/academic/announcements' },
        { name: 'Referred Leads', path: '/dashboard/academic/referrals' },
        { name: 'Finance Requests', path: '/dashboard/academic/finance-requests' },
      ]
    }
  ],
  'dept-admin': [
    { name: 'Dashboard', path: '/dashboard/dept-admin', icon: Home },
    {
      name: 'Team Management',
      icon: Users,
      isGroup: true,
      items: [
        { name: 'My Team', path: '/dashboard/dept-admin/team' },
        { name: 'Tasks', path: '/dashboard/dept-admin/tasks' },
        { name: 'Team Leave', path: '/dashboard/dept-admin/leaves' },
      ]
    }
  ],
  'openschool': [
    { name: 'Dashboard', path: '/dashboard/openschool', icon: Home },
    {
      name: 'Academic',
      icon: BookOpen,
      isGroup: true,
      items: [
        { name: 'Programs', path: '/dashboard/openschool/programs' },
        { name: 'Students', path: '/dashboard/openschool/students' },
      ]
    },
    {
      name: 'Team',
      icon: Users,
      isGroup: true,
      items: [
        { name: 'My Team', path: '/dashboard/openschool/team' },
        { name: 'Tasks', path: '/dashboard/openschool/tasks' },
        { name: 'Team Leave', path: '/dashboard/openschool/leaves' },
      ]
    }
  ],
  'online': [
    { name: 'Dashboard', path: '/dashboard/online', icon: Home },
    {
      name: 'Academic',
      icon: BookOpen,
      isGroup: true,
      items: [
        { name: 'Programs', path: '/dashboard/online/programs' },
        { name: 'Students', path: '/dashboard/online/students' },
      ]
    },
    {
      name: 'Team',
      icon: Users,
      isGroup: true,
      items: [
        { name: 'My Team', path: '/dashboard/online/team' },
        { name: 'Tasks', path: '/dashboard/online/tasks' },
        { name: 'Team Leave', path: '/dashboard/online/leaves' },
      ]
    }
  ],
  'skill': [
    { name: 'Dashboard', path: '/dashboard/skill', icon: Home },
    {
      name: 'Academic',
      icon: BookOpen,
      isGroup: true,
      items: [
        { name: 'Programs', path: '/dashboard/skill/programs' },
        { name: 'Students', path: '/dashboard/skill/students' },
      ]
    },
    {
      name: 'Team',
      icon: Users,
      isGroup: true,
      items: [
        { name: 'My Team', path: '/dashboard/skill/team' },
        { name: 'Tasks', path: '/dashboard/skill/tasks' },
        { name: 'Team Leave', path: '/dashboard/skill/leaves' },
      ]
    }
  ],
  'bvoc': [
    { name: 'Dashboard', path: '/dashboard/bvoc', icon: Home },
    {
      name: 'Academic',
      icon: BookOpen,
      isGroup: true,
      items: [
        { name: 'Programs', path: '/dashboard/bvoc/programs' },
        { name: 'Students', path: '/dashboard/bvoc/students' },
      ]
    },
    {
      name: 'Team',
      icon: Users,
      isGroup: true,
      items: [
        { name: 'My Team', path: '/dashboard/bvoc/team' },
        { name: 'Tasks', path: '/dashboard/bvoc/tasks' },
        { name: 'Team Leave', path: '/dashboard/bvoc/leaves' },
      ]
    }
  ],
  'study-center': [
    { name: 'Dashboard', path: '/dashboard/study-center', icon: Home },
    {
      name: 'Operations',
      icon: RefreshCw,
      isGroup: true,
      items: [
        { name: 'Students', path: '/dashboard/study-center/students' },
        { name: 'Re-Registration', path: '/dashboard/study-center/rereg' },
        { name: 'Announcements', path: '/dashboard/study-center/announcements' },
      ]
    }
  ],
  'student': [
    { name: 'Dashboard', path: '/dashboard/student', icon: Home },
    {
      name: 'My Portal',
      icon: Users,
      isGroup: true,
      items: [
        { name: 'My Invoices', path: '/dashboard/student/invoices' },
        { name: 'My Docs', path: '/dashboard/student/documents' },
        { name: 'My Surveys', path: '/dashboard/shared/surveys' },
      ]
    }
  ],
  'employee': [
    { name: 'Dashboard', path: '/dashboard/employee', icon: Home },
    {
      name: 'Workplace',
      icon: CheckSquare,
      isGroup: true,
      items: [
        { name: 'My Tasks', path: '/dashboard/employee/tasks' },
        { name: 'My Leaves', path: '/dashboard/employee/leaves' },
      ]
    },
    {
      name: 'Institutional',
      icon: Bell,
      isGroup: true,
      items: [
        { name: 'Institutional Board', path: '/dashboard/employee/announcements' },
        { name: 'Surveys', path: '/dashboard/shared/surveys' },
      ]
    }
  ],
  'sales': [
    { name: 'Dashboard', path: '/dashboard/sales', icon: Home },
    {
      name: 'Sales Ops',
      icon: Users,
      isGroup: true,
      items: [
        { name: 'CRM Pipeline', path: '/dashboard/sales/crm' },
      ]
    }
  ],
  'default': [
    { name: 'Home', path: '/dashboard', icon: Home },
    {
      name: 'Account',
      icon: Settings,
      isGroup: true,
      items: [
        { name: 'My Preferences', path: '/dashboard/profile/preferences' },
      ]
    }
  ]
};

export default function Sidebar({ isOpen }: { isOpen: boolean }) {
  const user = useAuthStore(state => state.user);
  const location = useLocation();
  const role = user?.role || 'default';
  const links = menus[role as keyof typeof menus] || menus['default'];

  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  // Auto-expand group if a sub-item is active
  useEffect(() => {
    const currentPath = location.pathname;
    const initialExpanded: Record<string, boolean> = {};
    
    links.forEach(link => {
      if (link.isGroup) {
        if (link.items.some(item => currentPath === item.path)) {
          initialExpanded[link.name] = true;
        }
      }
    });

    setExpandedGroups(prev => ({ ...prev, ...initialExpanded }));
  }, [location.pathname, links]);

  const toggleGroup = (groupName: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupName]: !prev[groupName]
    }));
  };

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
            if (link.isGroup) {
              const Icon = link.icon;
              const isExpanded = expandedGroups[link.name];
              return (
                <li key={link.name} className="mt-2 first:mt-0">
                  <button
                    onClick={() => toggleGroup(link.name)}
                    className="w-full px-6 py-3 text-sm font-medium flex items-center justify-between hover:bg-slate-50 transition-colors border-l-4 border-transparent text-slate-600 hover:text-slate-900"
                  >
                    <div className="flex items-center">
                      <Icon className="w-5 h-5 mr-3" />
                      {link.name}
                    </div>
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 ml-auto" />
                    ) : (
                      <ChevronRight className="w-4 h-4 ml-auto" />
                    )}
                  </button>
                  {isExpanded && (
                    <ul className="mt-1 space-y-1 transition-all duration-300">
                      {link.items.map((subItem: any) => (
                        <li key={subItem.path}>
                          <NavLink
                            to={subItem.path}
                            end
                            className={({ isActive }) => clsx(
                              "flex items-center px-10 py-2 text-sm font-medium transition-colors border-l-4",
                              isActive 
                                ? "bg-blue-50 text-blue-700 border-blue-600 font-bold" 
                                : "border-transparent hover:bg-slate-50 hover:text-slate-900 text-slate-500"
                            )}
                          >
                            {subItem.name}
                          </NavLink>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            }
            const Icon = (link as any).icon;
            return (
              <li key={(link as any).path}>
                <NavLink
                  to={(link as any).path}
                  end
                  className={({ isActive }) => clsx(
                    "flex items-center px-6 py-3 text-sm font-medium transition-colors border-l-4",
                    isActive 
                      ? "bg-blue-50 text-blue-700 border-blue-600" 
                      : "border-transparent hover:bg-slate-50 hover:text-slate-900 text-slate-600"
                  )}
                >
                  <Icon className="w-5 h-5 mr-3" />
                  {(link as any).name}
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
