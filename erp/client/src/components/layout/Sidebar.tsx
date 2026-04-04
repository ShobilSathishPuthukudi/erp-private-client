import { useState, useEffect, useMemo } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { useOrgStore } from '@/store/orgStore';
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
  TrendingUp,
  RefreshCw,
  ShieldCheck,
  PieChart,
  ChevronDown,
  Hexagon,
  Server
} from 'lucide-react';
import { clsx } from 'clsx';
import './Sidebar.css';

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
  'Organization Admin': [
    {
      name: 'Overview',
      path: '/dashboard/org-admin/overview',
      icon: Home
    },
    {
      name: 'Alerts',
      icon: Bell,
      isGroup: true,
      items: [
        { name: 'Escalated Tasks', path: '/dashboard/org-admin/alerts/escalated' },
        { name: 'Institutional Alerts', path: '/dashboard/org-admin/alerts/institutional' },
      ]
    },
    {
      name: 'Departments',
      icon: Database,
      isGroup: true,
      items: [
        { name: 'Core Departments', path: '/dashboard/org-admin/departments' },
        { name: 'Sub-Departments', path: '/dashboard/org-admin/sub-departments' },
      ]
    },
    {
      name: 'Data Architecture',
      icon: Server,
      isGroup: true,
      items: [
        { name: 'Table Registry', path: '/dashboard/org-admin/database/tables' },
        { name: 'Institutional Hierarchy', path: '/dashboard/org-admin/hierarchy' },
        { name: 'Role Hierarchy', path: '/dashboard/org-admin/roles/hierarchy' },
      ]
    },
    {
      name: 'CEO Panels',
      icon: Users,
      isGroup: true,
      items: [
        { name: 'All Panels', path: '/dashboard/org-admin/ceo-panels' },
      ]
    },
    {
      name: 'Permissions',
      icon: ShieldCheck,
      isGroup: true,
      items: [
        { name: 'Institutional Roles', path: '/dashboard/org-admin/permissions/roles' },
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
      name: 'Settings',
      icon: Settings,
      isGroup: true,
      items: [
        { name: 'General Settings', path: '/dashboard/org-admin/settings/general' },
        { name: 'Governance Policies', path: '/dashboard/org-admin/settings/governance' },
        { name: 'Integrations', path: '/dashboard/org-admin/settings/integrations' },
        { name: 'Custom Fields', path: '/dashboard/org-admin/settings/custom-fields' },
      ]
    },
  ],
  'ceo': [
    {
      name: 'Executive Panel',
      icon: PieChart,
      isGroup: true,
      items: [
        { name: 'Overview', path: '/dashboard/ceo/kpis' },
        { name: 'Growth Trends', path: '/dashboard/ceo/trends' },
        { name: 'Critical Inbox', path: '/dashboard/ceo/escalations' },
        { name: 'Dept Scorecard', path: '/dashboard/ceo/performance' },
        { name: 'Board Reports', path: '/dashboard/ceo/reports' },
        { name: 'Governance Hub', path: '/dashboard/ceo/policy' },
        { name: 'Executive Surveys', path: '/dashboard/shared/surveys' },
      ]
    },
    {
      name: 'Team Management',
      icon: Users,
      isGroup: true,
      items: [
        { name: 'My Team', path: '/dashboard/ceo/team' },
        { name: 'Tasks', path: '/dashboard/ceo/tasks' },
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
    },
    {
      name: 'Team Management',
      icon: Users,
      isGroup: true,
      items: [
        { name: 'My Team', path: '/dashboard/finance/team' },
        { name: 'Tasks', path: '/dashboard/finance/tasks' },
        { name: 'Team Leave', path: '/dashboard/finance/leaves' },
      ]
    }
  ],
  'hr': [
    { name: 'Dashboard', path: '/dashboard/hr', icon: Home },
    {
      name: 'Workforce Control',
      icon: Users,
      isGroup: true,
      items: [
        { name: 'Workforce Planning', path: '/dashboard/hr/vacancies' },
        { name: 'Registration', path: '/dashboard/hr/employees' },
        { name: 'Performance Audit', path: '/dashboard/hr/performance' },
        { name: 'Attendance', path: '/dashboard/hr/attendance' },
        { name: 'Leave Approval', path: '/dashboard/hr/leaves' },
      ]
    },
    {
      name: 'Communications',
      icon: Bell,
      isGroup: true,
      items: [
        { name: 'Internal Notices', path: '/dashboard/hr/announcements' },
        { name: 'Holiday Calendar', path: '/dashboard/hr/holidays' },
        { name: 'Manage Surveys', path: '/dashboard/hr/surveys' },
      ]
    },
    {
      name: 'Team Management',
      icon: Users,
      isGroup: true,
      items: [
        { name: 'My Team', path: '/dashboard/hr/dept-team' },
        { name: 'Tasks', path: '/dashboard/hr/dept-tasks' },
        { name: 'Team Leave', path: '/dashboard/hr/dept-leaves' },
      ]
    }
  ],
  'operations': [
    { name: 'Academic Dashboard', path: '/dashboard/operations/overview', icon: Home },
    {
      name: 'Operations Panel',
      icon: Activity,
      isGroup: true,
      items: [
        { name: 'Center Audit', path: '/dashboard/operations/center-audit' },
        { name: 'Accreditation Queue', path: '/dashboard/operations/accreditation' },
        { name: 'Center Performance', path: '/dashboard/operations/center-performance' },
        { name: 'Sub-Dept Overview', path: '/dashboard/operations/sub-dept-overview' },
      ]
    },
    {
      name: 'Communications',
      icon: Bell,
      isGroup: true,
      items: [
        { name: 'Center Announcements', path: '/dashboard/operations/announcements' },
      ]
    },
    {
      name: 'Architecture',
      icon: Database,
      isGroup: true,
      items: [
        { name: 'Universities', path: '/dashboard/operations/universities' },
        { name: 'Programs', path: '/dashboard/operations/programs' },
        { name: 'Syllabus Management', path: '/dashboard/operations/syllabus' },
      ]
    },
    {
      name: 'Student Review',
      icon: Users,
      isGroup: true,
      items: [
        { name: 'Pending Reviews', path: '/dashboard/operations/pending-reviews' },
        { name: 'Pipeline View', path: '/dashboard/operations/pipeline' },
        { name: 'Resubmission Logs', path: '/dashboard/operations/resubmissions' },
        { name: 'All Students', path: '/dashboard/operations/students' },
      ]
    },
    {
      name: 'Assessment & Marks',
      icon: BookOpen,
      isGroup: true,
      items: [
        { name: 'Internal Marks', path: '/dashboard/academic/internal-marks' },
        { name: 'Session Management', path: '/dashboard/academic/sessions' },
        { name: 'Exams & Results', path: '/dashboard/academic/exams' },
      ]
    },
    {
      name: 'Credentials',
      icon: ShieldCheck,
      isGroup: true,
      items: [
        { name: 'Credential Requests', path: '/dashboard/operations/credential-requests' },
        { name: 'Security Control', path: '/dashboard/operations/security' },
      ]
    },
    {
      name: 'Support Services',
      icon: Bell,
      isGroup: true,
      items: [
        { name: 'Finance Requests', path: '/dashboard/operations/finance-requests' },
      ]
    },
    {
      name: 'Team Management',
      icon: Users,
      isGroup: true,
      items: [
        { name: 'My Team', path: '/dashboard/operations/team' },
        { name: 'Tasks', path: '/dashboard/operations/tasks' },
        { name: 'Team Leave', path: '/dashboard/operations/leaves' },
      ]
    }
  ],
  'academic': [
    { name: 'Academic Dashboard', path: '/dashboard/academic/overview', icon: Home },
    {
      name: 'Operations Panel',
      icon: Activity,
      isGroup: true,
      items: [
        { name: 'Center Audit', path: '/dashboard/academic/center-audit' },
        { name: 'Accreditation Queue', path: '/dashboard/academic/accreditation' },
        { name: 'Center Performance', path: '/dashboard/academic/center-performance' },
        { name: 'Sub-Dept Overview', path: '/dashboard/academic/sub-dept-overview' },
      ]
    },
    {
      name: 'Communications',
      icon: Bell,
      isGroup: true,
      items: [
        { name: 'Center Announcements', path: '/dashboard/academic/announcements' },
      ]
    },
    {
      name: 'Architecture',
      icon: Database,
      isGroup: true,
      items: [
        { name: 'Universities', path: '/dashboard/academic/universities' },
        { name: 'Programs', path: '/dashboard/academic/programs' },
        { name: 'Syllabus Management', path: '/dashboard/academic/syllabus' },
      ]
    },
    {
      name: 'Student Review',
      icon: Users,
      isGroup: true,
      items: [
        { name: 'Pending Reviews', path: '/dashboard/academic/pending-reviews' },
        { name: 'Pipeline View', path: '/dashboard/academic/pipeline' },
        { name: 'Resubmission Logs', path: '/dashboard/academic/resubmissions' },
        { name: 'All Students', path: '/dashboard/academic/students' },
      ]
    },
    {
      name: 'Assessment & Marks',
      icon: BookOpen,
      isGroup: true,
      items: [
        { name: 'Internal Marks', path: '/dashboard/academic/internal-marks' },
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
      name: 'Support Services',
      icon: Bell,
      isGroup: true,
      items: [
        { name: 'Finance Requests', path: '/dashboard/academic/finance-requests' },
      ]
    },
    {
      name: 'Team Management',
      icon: Users,
      isGroup: true,
      items: [
        { name: 'My Team', path: '/dashboard/academic/team' },
        { name: 'Tasks', path: '/dashboard/academic/tasks' },
        { name: 'Team Leave', path: '/dashboard/academic/leaves' },
      ]
    }
  ],
  'openschool': [
    { name: 'Unit Dashboard', path: '/dashboard/subdept/openschool/portal', icon: Home },
    {
      name: 'Unit Operations',
      icon: Users,
      isGroup: true,
      items: [
        { name: 'Student Validation', path: '/dashboard/subdept/openschool/validation' },
        { name: 'My Centers', path: '/dashboard/subdept/openschool/centers' },
      ]
    },
    {
      name: 'Academic Desk',
      icon: BookOpen,
      isGroup: true,
      items: [
        { name: 'Assigned Programs', path: '/dashboard/subdept/openschool/programs' },
        { name: 'Enrollment Intakes', path: '/dashboard/subdept/openschool/sessions' },
        { name: 'Internal Marks', path: '/dashboard/subdept/openschool/internal-marks' },
        { name: 'Academic Performance', path: '/dashboard/subdept/openschool/exams' },
        { name: 'Institutional Roster', path: '/dashboard/subdept/openschool/students' },
      ]
    },
    {
      name: 'Team Management',
      icon: Users,
      isGroup: true,
      items: [
        { name: 'My Team', path: '/dashboard/subdept/openschool/team' },
        { name: 'Tasks', path: '/dashboard/subdept/openschool/tasks' },
        { name: 'Team Leave', path: '/dashboard/subdept/openschool/leaves' },
        { name: 'Unit Surveys', path: '/dashboard/shared/surveys' },
      ]
    }
  ],
  'online': [
    { name: 'Unit Dashboard', path: '/dashboard/subdept/online/portal', icon: Home },
    {
      name: 'Unit Operations',
      icon: Users,
      isGroup: true,
      items: [
        { name: 'Student Validation', path: '/dashboard/subdept/online/validation' },
        { name: 'My Centers', path: '/dashboard/subdept/online/centers' },
      ]
    },
    {
      name: 'Academic Desk',
      icon: BookOpen,
      isGroup: true,
      items: [
        { name: 'Assigned Programs', path: '/dashboard/subdept/online/programs' },
        { name: 'Enrollment Intakes', path: '/dashboard/subdept/online/sessions' },
        { name: 'Internal Marks', path: '/dashboard/subdept/online/internal-marks' },
        { name: 'Academic Performance', path: '/dashboard/subdept/online/exams' },
        { name: 'Institutional Roster', path: '/dashboard/subdept/online/students' },
      ]
    },
    {
      name: 'Team Management',
      icon: Users,
      isGroup: true,
      items: [
        { name: 'My Team', path: '/dashboard/subdept/online/team' },
        { name: 'Tasks', path: '/dashboard/subdept/online/tasks' },
        { name: 'Team Leave', path: '/dashboard/subdept/online/leaves' },
        { name: 'Unit Surveys', path: '/dashboard/shared/surveys' },
      ]
    }
  ],
  'skill': [
    { name: 'Unit Dashboard', path: '/dashboard/subdept/skill/portal', icon: Home },
    {
      name: 'Unit Operations',
      icon: Users,
      isGroup: true,
      items: [
        { name: 'Student Validation', path: '/dashboard/subdept/skill/validation' },
        { name: 'My Centers', path: '/dashboard/subdept/skill/centers' },
      ]
    },
    {
      name: 'Academic Desk',
      icon: BookOpen,
      isGroup: true,
      items: [
        { name: 'Assigned Programs', path: '/dashboard/subdept/skill/programs' },
        { name: 'Enrollment Intakes', path: '/dashboard/subdept/skill/sessions' },
        { name: 'Internal Marks', path: '/dashboard/subdept/skill/internal-marks' },
        { name: 'Academic Performance', path: '/dashboard/subdept/skill/exams' },
        { name: 'Institutional Roster', path: '/dashboard/subdept/skill/students' },
      ]
    },
    {
      name: 'Team Management',
      icon: Users,
      isGroup: true,
      items: [
        { name: 'My Team', path: '/dashboard/subdept/skill/team' },
        { name: 'Tasks', path: '/dashboard/subdept/skill/tasks' },
        { name: 'Team Leave', path: '/dashboard/subdept/skill/leaves' },
        { name: 'Unit Surveys', path: '/dashboard/shared/surveys' },
      ]
    }
  ],
  'bvoc': [
    { name: 'Unit Dashboard', path: '/dashboard/subdept/bvoc/portal', icon: Home },
    {
      name: 'Unit Operations',
      icon: Users,
      isGroup: true,
      items: [
        { name: 'Student Validation', path: '/dashboard/subdept/bvoc/validation' },
        { name: 'My Centers', path: '/dashboard/subdept/bvoc/centers' },
        { name: 'Credential Requests', path: '/dashboard/subdept/bvoc/credentials' },
      ]
    },
    {
      name: 'Academic Desk',
      icon: BookOpen,
      isGroup: true,
      items: [
        { name: 'Assigned Programs', path: '/dashboard/subdept/bvoc/programs' },
        { name: 'Enrollment Intakes', path: '/dashboard/subdept/bvoc/sessions' },
        { name: 'Internal Marks', path: '/dashboard/subdept/bvoc/internal-marks' },
        { name: 'Academic Performance', path: '/dashboard/subdept/bvoc/exams' },
        { name: 'Institutional Roster', path: '/dashboard/subdept/bvoc/students' },
      ]
    },
    {
      name: 'Team Management',
      icon: Users,
      isGroup: true,
      items: [
        { name: 'My Team', path: '/dashboard/subdept/bvoc/team' },
        { name: 'Tasks', path: '/dashboard/subdept/bvoc/tasks' },
        { name: 'Team Leave', path: '/dashboard/subdept/bvoc/leaves' },
        { name: 'Unit Surveys', path: '/dashboard/shared/surveys' },
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
        { name: 'Programs', path: '/dashboard/study-center/programs' },
        { name: 'Students', path: '/dashboard/study-center/students' },
        { name: 'Internal Marks', path: '/dashboard/study-center/internal-marks' },
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
        { name: 'Academic Transcript', path: '/dashboard/student/transcript' },
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
        { name: 'My Centers', path: '/dashboard/employee/centers' },
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
        { name: 'Active Pipeline', path: '/dashboard/sales/crm/pipeline' },
        { name: 'Strategic Outcome', path: '/dashboard/sales/crm/outcome' },
        { name: 'Institutional Referrals', path: '/dashboard/sales/referrals' },
      ]
    },
    {
      name: 'Team Management',
      icon: Users,
      isGroup: true,
      items: [
        { name: 'My Team', path: '/dashboard/sales/team' },
        { name: 'Tasks', path: '/dashboard/sales/tasks' },
        { name: 'Team Leave', path: '/dashboard/sales/leaves' },
      ]
    }
  ],
  'SUB_DEPT_ADMIN': [
    { name: 'Unit Dashboard', path: '/dashboard/subdept/portal', icon: Home },
    {
      name: 'Unit Operations',
      icon: Users,
      isGroup: true,
      items: [
        { name: 'Student Validation', path: '/dashboard/subdept/:unit/validation' },
        { name: 'My Centers', path: '/dashboard/subdept/:unit/centers' },
      ]
    },
    {
      name: 'Academic Desk',
      icon: BookOpen,
      isGroup: true,
      items: [
        { name: 'Assigned Programs', path: '/dashboard/subdept/:unit/programs' },
        { name: 'Enrollment Intakes', path: '/dashboard/subdept/:unit/sessions' },
        { name: 'Academic Performance', path: '/dashboard/subdept/:unit/exams' },
        { name: 'Institutional Roster', path: '/dashboard/subdept/:unit/students' },
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
  const { orgName, orgLogo } = useOrgStore();
  const location = useLocation();
  const navigate = useNavigate();

  const getNormalizedRole = (rawRole: string) => {
    if (!rawRole) return 'default';
    const r = rawRole.toLowerCase().trim();
    
    // Pillar Mappings
    if (r.includes('hr')) return 'hr';
    if (r.includes('finance')) return 'finance';
    if (r.includes('sales')) return 'sales';
    if (r.includes('operations') || r.includes('academic')) return 'operations';
    
    // Unit Mappings
    if (r.includes('openschool')) return 'openschool';
    if (r.includes('online')) return 'online';
    if (r.includes('skill')) return 'skill';
    if (r.includes('bvoc')) return 'bvoc';
    
    // Executive Mappings
    if (r === 'ceo') return 'ceo';
    if (r.includes('organization admin') || r === 'admin') return 'Organization Admin';
    
    // Specialized Mappings
    if (r === 'study-center') return 'study-center';
    if (r === 'student') return 'student';
    if (r === 'employee') return 'employee';
    
    return rawRole; // Fallback to raw if no match
  };

  const role = useMemo(() => getNormalizedRole(user?.role || ''), [user?.role]);
  const unit = user?.subDepartment?.toLowerCase() || 'portal';
  
  const links = useMemo(() => {
    let rawLinks = [...(menus[role as keyof typeof menus] || menus['default'])];

    // Institutional Hierarchy: Dynamically inject Team Management for any staff with subordinates
    if ((user as any)?.isManager && !rawLinks.some(l => l.name === 'Team Management')) {
      const dashboardPath = role === 'Organization Admin' ? 'org-admin' : role;
      rawLinks.push({
        name: 'Team Management',
        icon: Users,
        isGroup: true,
        items: [
          { name: 'My Team', path: `/dashboard/${dashboardPath}/team` },
          { name: 'Tasks', path: `/dashboard/${dashboardPath}/tasks` },
          { name: 'Team Leave', path: `/dashboard/${dashboardPath}/leaves` },
        ]
      });
    }

    return rawLinks.map(link => {
      if (link.isGroup) {
        return {
          ...link,
          items: link.items.map((item: { name: string, path: string }) => ({
            ...item,
            path: item.path.replace(':unit', unit)
          }))
        };
      }
      return {
         ...link,
         path: link.path.replace(':unit', unit)
      } as any;
    });
  }, [role, unit]);

  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  // Auto-expand active group and collapse others when navigating
  useEffect(() => {
    const currentPath = location.pathname;
    let activeGroupName: string | null = null;
    
    links.forEach(link => {
      if (link.isGroup) {
        const isActive = link.items.some((item: any) => currentPath === item.path);
        if (isActive) {
          activeGroupName = link.name;
        }
      }
    });

    if (activeGroupName) {
      setExpandedGroups({ [activeGroupName]: true });
    } else {
      setExpandedGroups({});
    }
  }, [location.pathname, links]);

  const toggleGroup = (groupName: string) => {
    const currentPath = location.pathname;
    let activeGroupName: string | null = null;
    
    links.forEach(link => {
      if (link.isGroup) {
        const isActive = link.items.some((item: any) => currentPath === item.path);
        if (isActive) {
          activeGroupName = link.name;
        }
      }
    });

    setExpandedGroups(prev => {
      const newState: Record<string, boolean> = {
        [groupName]: !prev[groupName]
      };
      
      // Prevent the currently active group from collapsing when opening another group
      if (activeGroupName && activeGroupName !== groupName) {
        newState[activeGroupName] = true;
      }
      
      return newState;
    });
  };

  return (
    <aside className={clsx(
      "sidebar-modern",
      isOpen ? "mobile-open" : ""
    )}>
      <div className="sidebar-content">
        <div className="sidebar-header-modern desktop-only">
          <div 
            className="sidebar-logo-modern cursor-pointer"
            onClick={() => {
              const role = user?.role;
              const dashboardPath = (role === 'center' || role === 'study-center') ? 'study-center' : (role?.toLowerCase() || 'default');
              const finalPath = role === 'Organization Admin' ? '/dashboard/org-admin/overview' : `/dashboard/${dashboardPath}`;
              navigate(finalPath);
            }}
          >
            <div className="logo-icon bg-white overflow-hidden">
              {orgLogo ? (
                <img src={orgLogo} alt="Logo" className="w-full h-full object-cover" />
              ) : (
                <Hexagon size={24} />
              )}
            </div>
            <div className="logo-text">
              <span className="logo-name">{orgName || 'ERP'}</span>
              <span className="logo-subtitle">Enterprise System</span>
            </div>
          </div>
        </div>

        <nav className="sidebar-nav-modern">
          <ul className="sidebar-menu-modern">
            {isOpen && (
              <li className="sidebar-mobile-header">
                <div 
                  className="sidebar-logo-modern cursor-pointer"
                  onClick={() => {
                    const role = user?.role;
                    const dashboardPath = (role === 'center' || role === 'study-center') ? 'study-center' : (role?.toLowerCase() || 'default');
                    const finalPath = role === 'Organization Admin' ? '/dashboard/org-admin/overview' : `/dashboard/${dashboardPath}`;
                    navigate(finalPath);
                  }}
                >
                  <div className="logo-icon bg-white overflow-hidden">
                    {orgLogo ? (
                      <img src={orgLogo} alt="Logo" className="w-full h-full object-cover" />
                    ) : (
                      <Hexagon size={24} />
                    )}
                  </div>
                  <div className="logo-text">
                    <span className="logo-name">{orgName || 'ERP'}</span>
                    <span className="logo-subtitle">Enterprise System</span>
                  </div>
                </div>
              </li>
            )}

            {links.map((link) => {
              if (link.isGroup) {
                const Icon = link.icon;
                const isExpanded = expandedGroups[link.name];
                return (
                  <li key={link.name} className="sidebar-item-modern">
                    <button
                      onClick={() => toggleGroup(link.name)}
                      className={clsx("sidebar-link-modern has-submenu", isExpanded && "open")}
                    >
                      <span className="sidebar-icon-modern">
                        <Icon size={18} />
                      </span>
                      <span className="sidebar-text-modern">{link.name}</span>
                      <span className={clsx("sidebar-arrow-modern", isExpanded && "rotated")}>
                        <ChevronDown size={14} />
                      </span>
                    </button>
                    {isExpanded && (
                      <ul className="sidebar-submenu-modern">
                        {link.items.map((subItem: any) => (
                          <li key={subItem.path}>
                            <NavLink
                              to={subItem.path}
                              end
                              className={({ isActive }) => clsx(
                                "sidebar-sublink-modern",
                                isActive && "active"
                              )}
                            >
                              <div className="submenu-icon-wrapper">
                                <div className="w-1.5 h-1.5 rounded-full bg-current" />
                              </div>
                              <span>{subItem.name}</span>
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
                <li key={(link as any).path} className="sidebar-item-modern">
                  <NavLink
                    to={(link as any).path}
                    end
                    className={({ isActive }) => clsx(
                      "sidebar-link-modern",
                      isActive && "active"
                    )}
                  >
                    <span className="sidebar-icon-modern">
                      <Icon size={18} />
                    </span>
                    <span className="sidebar-text-modern">
                      {(link as any).name}
                    </span>
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </aside>
  );
}
