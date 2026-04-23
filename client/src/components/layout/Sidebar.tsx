import { useState, useEffect, useMemo } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { useOrgStore } from '@/store/orgStore';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { getNormalizedRole } from '@/lib/roles';
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
  Server,
  Megaphone
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
  'organization admin': [
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
      ]
    },
    {
      name: 'Departments',
      icon: Database,
      isGroup: true,
      items: [
        { name: 'Core Departments', path: '/dashboard/org-admin/departments' },
        { name: 'Sub-Departments', path: '/dashboard/org-admin/sub-departments' },
        { name: 'Institutional Structure', path: '/dashboard/org-admin/roster' },
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
        { name: 'Admin Credentials', path: '/dashboard/org-admin/permissions/admin-credentials' },
      ]
    },
    {
      name: 'Onboarding',
      icon: ShieldCheck,
      isGroup: true,
      items: [
        { name: 'Onboarding hub', path: '/dashboard/operations/onboarding-hub' },
        { name: 'Onboarding Pulse', path: '/dashboard/operations/onboarding-pulse' },
        { name: 'Student Status', path: '/dashboard/operations/pending-reviews' },
        { name: 'Center Audit Status', path: '/dashboard/operations/center-audit' },
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
      name: 'Data Architecture',
      icon: Server,
      isGroup: true,
      items: [
        { name: 'Role Hierarchy', path: '/dashboard/org-admin/roles/hierarchy' },
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
      ]
    },
    {
      name: 'Team Management',
      icon: Users,
      isGroup: true,
      items: [
        { name: 'Institutional Structure', path: '/dashboard/ceo/team' },
        { name: 'Tasks', path: '/dashboard/ceo/tasks' },
        { name: 'HR Leaves', path: '/dashboard/ceo/hr-leaves' },
      ]
    },
    {
      name: 'Surveys',
      icon: CheckSquare,
      isGroup: true,
      items: [
        { name: 'Institutional Surveys', path: '/dashboard/shared/surveys' },
      ]
    },
    {
      name: 'Communications',
      icon: Megaphone,
      isGroup: true,
      items: [
        { name: 'Institutional Directives', path: '/dashboard/ceo/announcements' },
        { name: 'HR Broadcasts', path: '/dashboard/ceo/hr-broadcasts' },
      ]
    },
    {
      name: 'Operations',
      icon: TrendingUp,
      isGroup: true,
      items: [
        { name: 'Incentive Payouts', path: '/dashboard/ceo/payouts' },
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
        { name: 'Reveal Pending', path: '/dashboard/finance/credentials' },
      ]
    },
    {
      name: 'Audit System',
      icon: Activity,
      isGroup: true,
      items: [
        { name: 'Student Audit', path: '/dashboard/finance/approvals' },
        { name: 'Accreditation Audits', path: '/dashboard/finance/accreditation-queue' },
        { name: 'Admission Sessions', path: '/dashboard/finance/sessions-queue' },
        { name: 'Center Verification', path: '/dashboard/finance/center-verification' },
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
        { name: 'Yield Analysis', path: '/dashboard/finance/yield' },
      ]
    },
    {
      name: 'Team Management',
      icon: Users,
      isGroup: true,
      items: [
        { name: 'Department Team', path: '/dashboard/finance/team' },
        { name: 'Tasks', path: '/dashboard/finance/tasks' },

        { name: 'Team Leave Status', path: '/dashboard/finance/leave-status' },
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
        { name: 'Employee Remap', path: '/dashboard/hr/remap' },
        { name: 'Role Mapping', path: '/dashboard/hr/role-mapping' },
        { name: 'Administrators', path: '/dashboard/hr/admins' },
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
        { name: 'Employee Requests', path: '/dashboard/hr/employee-communications' },
      ]
    },
    {
      name: 'Team Management',
      icon: Users,
      isGroup: true,
      items: [
        { name: 'Department Team', path: '/dashboard/hr/dept-team' },
        { name: 'Tasks', path: '/dashboard/hr/dept-tasks' },

        { name: 'Team Leave Status', path: '/dashboard/hr/dept-leave-status' },
      ]
    }
  ],
  'operations': [
    { name: 'Academic Dashboard', path: '/dashboard/operations/overview', icon: Home },
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
      name: 'Operations Panel',
      icon: Activity,
      isGroup: true,
      items: [
        { name: 'Center Performance', path: '/dashboard/operations/center-performance' },
        { name: 'Sub-Dept Overview', path: '/dashboard/operations/sub-dept-overview' },
      ]
    },
    {
      name: 'Onboarding Control',
      icon: ShieldCheck,
      isGroup: true,
      items: [
        { name: 'Onboarding hub', path: '/dashboard/operations/onboarding-hub' },
        { name: 'Onboarding Pulse', path: '/dashboard/operations/onboarding-pulse' },
      ]
    },
    {
      name: 'Center Review',
      icon: ShieldCheck,
      isGroup: true,
      items: [
        { name: 'Center Verification', path: '/dashboard/operations/center-audit' },
        { name: 'Accreditation Queue', path: '/dashboard/operations/accreditation' },
        { name: 'All Centers', path: '/dashboard/operations/centers' },
      ]
    },
    {
      name: 'Student Review',
      icon: Users,
      isGroup: true,
      items: [
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
      ]
    },
    {
      name: 'Credentials',
      icon: ShieldCheck,
      isGroup: true,
      items: [
        { name: 'Credential Requests', path: '/dashboard/operations/credential-requests' },
      ]
    },
    {
      name: 'Communications',
      icon: Bell,
      isGroup: true,
      items: [
        { name: 'HR Broadcasts', path: '/dashboard/operations/hr-broadcasts' },
        { name: 'Center Announcements', path: '/dashboard/operations/announcements' },
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
        { name: 'Department Team', path: '/dashboard/operations/team' },
        { name: 'Tasks', path: '/dashboard/operations/tasks' },

        { name: 'Team Leave Status', path: '/dashboard/operations/leave-status' },
      ]
    }
  ],
  'academic': [
    { name: 'Academic Dashboard', path: '/dashboard/academic/overview', icon: Home },
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
      name: 'Operations Panel',
      icon: Activity,
      isGroup: true,
      items: [
        { name: 'Center Performance', path: '/dashboard/academic/center-performance' },
        { name: 'Sub-Dept Overview', path: '/dashboard/academic/sub-dept-overview' },
      ]
    },
    {
      name: 'Center Review',
      icon: ShieldCheck,
      isGroup: true,
      items: [
        { name: 'Center Audit', path: '/dashboard/academic/center-audit' },
        { name: 'Accreditation Queue', path: '/dashboard/academic/accreditation' },
      ]
    },
    {
      name: 'Student Review',
      icon: Users,
      isGroup: true,
      items: [
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
      ]
    },
    {
      name: 'Credentials',
      icon: ShieldCheck,
      isGroup: true,
      items: [
        { name: 'Credential Requests', path: '/dashboard/academic/credential-requests' },
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
        { name: 'Department Team', path: '/dashboard/academic/team' },
        { name: 'Tasks', path: '/dashboard/academic/tasks' },

        { name: 'Team Leave Status', path: '/dashboard/academic/leave-status' },
      ]
    }
  ],
  'openschool': [
    { name: 'Dashboard', path: '/dashboard/subdept/openschool/portal', icon: Home },
    {
      name: 'Operations',
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
        { name: 'Institutional Structure', path: '/dashboard/subdept/openschool/students' },
      ]
    },
    {
      name: 'Communications',
      icon: Bell,
      isGroup: true,
      items: [
        { name: 'Announcements', path: '/dashboard/announcements' },
        { name: 'Surveys', path: '/dashboard/shared/surveys' },
      ]
    },
    {
      name: 'Team Management',
      icon: Users,
      isGroup: true,
      items: [
        { name: 'Team', path: '/dashboard/subdept/openschool/team' },
        { name: 'Tasks', path: '/dashboard/subdept/openschool/tasks' },

        { name: 'Team Leave Status', path: '/dashboard/subdept/openschool/leave-status' },
      ]
    }
  ],
  'online': [
    { name: 'Dashboard', path: '/dashboard/subdept/online/portal', icon: Home },
    {
      name: 'Operations',
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
        { name: 'Institutional Structure', path: '/dashboard/subdept/online/students' },
      ]
    },
    {
      name: 'Communications',
      icon: Bell,
      isGroup: true,
      items: [
        { name: 'Announcements', path: '/dashboard/announcements' },
        { name: 'Surveys', path: '/dashboard/shared/surveys' },
      ]
    },
    {
      name: 'Team Management',
      icon: Users,
      isGroup: true,
      items: [
        { name: 'Team', path: '/dashboard/subdept/online/team' },
        { name: 'Tasks', path: '/dashboard/subdept/online/tasks' },

        { name: 'Team Leave Status', path: '/dashboard/subdept/online/leave-status' },
      ]
    }
  ],
  'skill': [
    { name: 'Dashboard', path: '/dashboard/subdept/skill/portal', icon: Home },
    {
      name: 'Operations',
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
        { name: 'Institutional Structure', path: '/dashboard/subdept/skill/students' },
      ]
    },
    {
      name: 'Communications',
      icon: Bell,
      isGroup: true,
      items: [
        { name: 'Announcements', path: '/dashboard/announcements' },
        { name: 'Surveys', path: '/dashboard/shared/surveys' },
      ]
    },
    {
      name: 'Team Management',
      icon: Users,
      isGroup: true,
      items: [
        { name: 'Team', path: '/dashboard/subdept/skill/team' },
        { name: 'Tasks', path: '/dashboard/subdept/skill/tasks' },

        { name: 'Team Leave Status', path: '/dashboard/subdept/skill/leave-status' },
      ]
    }
  ],
  'bvoc': [
    { name: 'Dashboard', path: '/dashboard/subdept/bvoc/portal', icon: Home },
    {
      name: 'Operations',
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
        { name: 'Institutional Structure', path: '/dashboard/subdept/bvoc/students' },
      ]
    },
    {
      name: 'Communications',
      icon: Bell,
      isGroup: true,
      items: [
        { name: 'Announcements', path: '/dashboard/announcements' },
        { name: 'Surveys', path: '/dashboard/shared/surveys' },
      ]
    },
    {
      name: 'Team Management',
      icon: Users,
      isGroup: true,
      items: [
        { name: 'Team', path: '/dashboard/subdept/bvoc/team' },
        { name: 'Tasks', path: '/dashboard/subdept/bvoc/tasks' },

        { name: 'Team Leave Status', path: '/dashboard/subdept/bvoc/leave-status' },
      ]
    }
  ],
  'partner-center': [
    { name: 'Dashboard', path: '/dashboard/partner-center', icon: Home },
    {
      name: 'Operations',
      icon: RefreshCw,
      isGroup: true,
      items: [
        { name: 'Programs', path: '/dashboard/partner-center/programs' },
        { name: 'Request New Program', path: '/dashboard/partner-center/accreditation' },
        { name: 'Students', path: '/dashboard/partner-center/students' },
        { name: 'Internal Marks', path: '/dashboard/partner-center/internal-marks' },
        { name: 'Re-Registration', path: '/dashboard/partner-center/rereg' },
        { name: 'Announcements', path: '/dashboard/partner-center/announcements' },
        { name: 'Session Management', path: '/dashboard/partner-center/sessions' },
        { name: 'Exams & Results', path: '/dashboard/partner-center/exams' },
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
        { name: 'Contact HR', path: '/dashboard/employee/hr-contact' },
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
      name: 'Onboarding',
      icon: ShieldCheck,
      isGroup: true,
      items: [
        { name: 'Onboarding hub', path: '/dashboard/operations/onboarding-hub' },
        { name: 'Onboarding Pulse', path: '/dashboard/operations/onboarding-pulse' },
        { name: 'Student Status', path: '/dashboard/operations/pending-reviews' },
        { name: 'Center Audit Status', path: '/dashboard/operations/center-audit' },
      ]
    },
    {
      name: 'Sales Ops',
      icon: Users,
      isGroup: true,
      items: [
        { name: 'Target Workflow', path: '/dashboard/sales/targets' },
      ]
    },
    {
      name: 'Team Management',
      icon: Users,
      isGroup: true,
      items: [
        { name: 'Department Team', path: '/dashboard/sales/team' },
        { name: 'Tasks', path: '/dashboard/sales/tasks' },

        { name: 'Team Leave Status', path: '/dashboard/sales/leave-status' },
      ]
    }
  ],
  'SUB_DEPT_ADMIN': [
    { name: 'Dashboard', path: '/dashboard/subdept/portal', icon: Home },
    {
      name: 'Operations',
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
        { name: 'Institutional Structure', path: '/dashboard/subdept/:unit/students' },
      ]
    },
    {
      name: 'Communications',
      icon: Bell,
      isGroup: true,
      items: [
        { name: 'Announcements', path: '/dashboard/announcements' },
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


  const role = useMemo(() => getNormalizedRole(user?.role || ''), [user?.role]);

  const { data: summary } = useQuery({
    queryKey: ['org-monitor', 'summary'],
    queryFn: async () => (await api.get('/org-monitor/summary')).data,
    enabled: role === 'Organization Admin',
  });
  const unit = user?.subDepartment?.toLowerCase() || 'portal';
  
  const links = useMemo(() => {
    let rawLinks = [...(menus[role as keyof typeof menus] || menus['default'])];

    // My Centers is a sales-only affordance on the Employee portal; hide it
    // for employees belonging to any other department.
    if (role === 'employee') {
      const isSalesEmployee = (user?.departmentName || '').toLowerCase().includes('sales');
      if (!isSalesEmployee) {
        rawLinks = rawLinks.map(link => {
          if (link.isGroup && link.name === 'Workplace') {
            return {
              ...link,
              items: link.items.filter((it: any) => it.name !== 'My Centers')
            };
          }
          return link;
        });
      }
    }

    // Academic Hierarchy: Dynamically inject Team Management for any staff with subordinates
    if ((user as any)?.isManager && role !== 'Organization Admin' && !rawLinks.some(l => l.name === 'Team Management')) {
      const dashboardPath = role === 'Organization Admin' ? 'org-admin' : role;
      rawLinks.push({
        name: 'Team Management',
        icon: Users,
        isGroup: true,
        items: [
          { name: role === 'openschool' || role === 'online' || role === 'skill' || role === 'bvoc' ? 'Team' : 'Department Team', path: `/dashboard/${dashboardPath}/team` },
          { name: 'Tasks', path: `/dashboard/${dashboardPath}/tasks` },

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
  }, [role, unit, user?.departmentName]);

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

  const toggleGroup = (event: React.MouseEvent, groupName: string) => {
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

    const willExpand = !expandedGroups[groupName];

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

    // Automatically scroll to ensure sub-menu is visible
    if (willExpand) {
      const target = event.currentTarget.parentElement;
      setTimeout(() => {
        target?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 150);
    }
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
              let dashboardPath = role;
              if (role === 'organization admin') dashboardPath = 'org-admin/overview';
              else if (role === 'operations') dashboardPath = 'operations/overview';
              else if (role === 'ceo') dashboardPath = 'ceo/kpis';
              navigate(`/dashboard/${dashboardPath}`);
            }}
          >
            <div className="logo-icon overflow-hidden">
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
                    const dashboardPath = role === 'organization admin' ? 'org-admin/overview' : role;
                    navigate(`/dashboard/${dashboardPath}`);
                  }}
                >
                  <div className="logo-icon overflow-hidden">
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
                      onClick={(e) => toggleGroup(e, link.name)}
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
