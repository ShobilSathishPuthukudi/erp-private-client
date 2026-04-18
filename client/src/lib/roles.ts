// Canonical names of seeded admin roles (core department + sub-department).
// Users in these sessions share a role-level admin password seeded on the
// backend, so self-service change-password is hidden for them — only the
// Organization Admin can alter that credential.
const SEEDED_ADMIN_PANEL_ROLES = new Set([
  'hr admin',
  'finance admin',
  'sales admin',
  'sales & crm admin',
  'academic operations admin',
  'operations admin',
  'bvoc admin',
  'bvoc department admin',
  'online admin',
  'online department admin',
  'skill admin',
  'skill department admin',
  'open school admin',
]);

export const isSeededAdminPanelRole = (role?: string | null): boolean => {
  if (!role) return false;
  return SEEDED_ADMIN_PANEL_ROLES.has(role.toLowerCase().trim());
};

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
