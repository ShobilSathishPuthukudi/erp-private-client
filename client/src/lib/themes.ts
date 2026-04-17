export interface ThemePreset {
  id: string;
  name: string;
  description: string;
  swatch: string;
  vars: Record<string, string>;
}

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: 'default',
    name: 'Slate Default',
    description: 'Neutral institutional slate with a white chrome shell.',
    swatch: 'linear-gradient(135deg, #ffffff 0%, #e2e8f0 100%)',
    vars: {
      '--shell-border': '#e2e8f0',
      '--layout-chrome-bg': '#ffffff',
      '--layout-chrome-text': '#475569',
      '--shell-surface': '#ffffff',
      '--theme-accent': '#2563eb',
      '--theme-accent-fg': '#ffffff',
      '--theme-soft': '#eff6ff',
    },
  },
  {
    id: 'indigo',
    name: 'Indigo Horizon',
    description: 'Deep indigo accents suited for executive dashboards.',
    swatch: 'linear-gradient(135deg, #eef2ff 0%, #4f46e5 100%)',
    vars: {
      '--shell-border': '#e0e7ff',
      '--layout-chrome-bg': '#f8fafc',
      '--layout-chrome-text': '#3730a3',
      '--shell-surface': '#eef2ff',
      '--theme-accent': '#4f46e5',
      '--theme-accent-fg': '#ffffff',
      '--theme-soft': '#eef2ff',
    },
  },
  {
    id: 'emerald',
    name: 'Emerald Ledger',
    description: 'Fresh emerald palette for finance and academic operations.',
    swatch: 'linear-gradient(135deg, #ecfdf5 0%, #059669 100%)',
    vars: {
      '--shell-border': '#d1fae5',
      '--layout-chrome-bg': '#f0fdf4',
      '--layout-chrome-text': '#065f46',
      '--shell-surface': '#ecfdf5',
      '--theme-accent': '#059669',
      '--theme-accent-fg': '#ffffff',
      '--theme-soft': '#d1fae5',
    },
  },
  {
    id: 'amber',
    name: 'Amber Signal',
    description: 'Warm amber tone, good for sales and outreach panels.',
    swatch: 'linear-gradient(135deg, #fffbeb 0%, #d97706 100%)',
    vars: {
      '--shell-border': '#fde68a',
      '--layout-chrome-bg': '#fffbeb',
      '--layout-chrome-text': '#92400e',
      '--shell-surface': '#fef3c7',
      '--theme-accent': '#d97706',
      '--theme-accent-fg': '#ffffff',
      '--theme-soft': '#fef3c7',
    },
  },
  {
    id: 'rose',
    name: 'Rose Rollout',
    description: 'Soft rose palette, useful for HR and announcements.',
    swatch: 'linear-gradient(135deg, #fff1f2 0%, #e11d48 100%)',
    vars: {
      '--shell-border': '#fecdd3',
      '--layout-chrome-bg': '#fff1f2',
      '--layout-chrome-text': '#9f1239',
      '--shell-surface': '#ffe4e6',
      '--theme-accent': '#e11d48',
      '--theme-accent-fg': '#ffffff',
      '--theme-soft': '#ffe4e6',
    },
  },
  {
    id: 'midnight',
    name: 'Midnight Ops',
    description: 'High-contrast dark chrome for low-light operations.',
    swatch: 'linear-gradient(135deg, #0f172a 0%, #6366f1 100%)',
    vars: {
      '--shell-border': '#1e293b',
      '--layout-chrome-bg': '#0f172a',
      '--layout-chrome-text': '#e2e8f0',
      '--shell-surface': '#1e293b',
      '--theme-accent': '#818cf8',
      '--theme-accent-fg': '#0f172a',
      '--theme-soft': '#1e293b',
    },
  },
];

export interface PanelDescriptor {
  key: string;
  label: string;
  match: (pathname: string) => boolean;
  availableFor: (role: string) => boolean;
}

const startsWith = (prefix: string) => (pathname: string) => pathname.startsWith(prefix);

export const PANELS: PanelDescriptor[] = [
  { key: 'org-admin', label: 'Organization Admin', match: startsWith('/dashboard/org-admin'), availableFor: (r) => r === 'organization admin' || r === 'operations' },
  { key: 'ceo', label: 'CEO', match: startsWith('/dashboard/ceo'), availableFor: (r) => r === 'ceo' || r === 'organization admin' },
  { key: 'hr', label: 'HR', match: startsWith('/dashboard/hr'), availableFor: (r) => r === 'hr' || r === 'organization admin' },
  { key: 'finance', label: 'Finance', match: startsWith('/dashboard/finance'), availableFor: (r) => r === 'finance' || r === 'operations' || r === 'organization admin' },
  { key: 'sales', label: 'Sales', match: startsWith('/dashboard/sales'), availableFor: (r) => r === 'sales' || r === 'organization admin' || r === 'ceo' },
  { key: 'academic', label: 'Academic Operations', match: (p) => p.startsWith('/dashboard/academic') || p.startsWith('/dashboard/operations'), availableFor: (r) => r === 'operations' || r === 'organization admin' },
  { key: 'openschool', label: 'Open School', match: startsWith('/dashboard/subdept/openschool'), availableFor: (r) => r === 'openschool' || r === 'operations' || r === 'organization admin' },
  { key: 'online', label: 'Online', match: startsWith('/dashboard/subdept/online'), availableFor: (r) => r === 'online' || r === 'operations' || r === 'organization admin' },
  { key: 'skill', label: 'Skill', match: startsWith('/dashboard/subdept/skill'), availableFor: (r) => r === 'skill' || r === 'operations' || r === 'organization admin' },
  { key: 'bvoc', label: 'BVoc', match: startsWith('/dashboard/subdept/bvoc'), availableFor: (r) => r === 'bvoc' || r === 'operations' || r === 'organization admin' },
  { key: 'partner-center', label: 'Partner Center', match: startsWith('/dashboard/partner-center'), availableFor: (r) => r === 'partner-center' || r === 'organization admin' },
  { key: 'student', label: 'Student', match: startsWith('/dashboard/student'), availableFor: (r) => r === 'student' || r === 'organization admin' },
  { key: 'employee', label: 'Employee', match: startsWith('/dashboard/employee'), availableFor: (r) => r === 'employee' || r === 'organization admin' || r === 'hr' },
  { key: 'profile', label: 'Profile & Shared Pages', match: (p) => p.startsWith('/dashboard/profile') || p.startsWith('/dashboard/notifications') || p.startsWith('/dashboard/shared') || p.startsWith('/dashboard/change-password'), availableFor: () => true },
];

export const DEFAULT_THEME_ID = 'default';

export const findPanelByPath = (pathname: string): PanelDescriptor | undefined =>
  PANELS.find((p) => p.match(pathname));

export const getPresetById = (id: string): ThemePreset =>
  THEME_PRESETS.find((t) => t.id === id) || THEME_PRESETS[0];
