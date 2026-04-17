export const CORE_DEPARTMENTS = [
  {
    key: 'hr',
    name: 'HR',
    shortName: 'HR',
    adminRoleName: 'HR Admin',
    description: 'Human resources and workforce governance.',
  },
  {
    key: 'finance',
    name: 'Finance',
    shortName: 'FIN',
    adminRoleName: 'Finance Admin',
    description: 'Finance operations and fiscal control.',
  },
  {
    key: 'sales',
    name: 'Sales',
    shortName: 'SAL',
    adminRoleName: 'Sales Admin',
    description: 'Sales pipeline and business development.',
  },
  {
    key: 'academic-operations',
    name: 'Academic Operations',
    shortName: 'AO',
    adminRoleName: 'Academic Operations Admin',
    description: 'Academic operations, execution, and delivery.',
  }
];

export const SUB_DEPARTMENTS = [
  {
    key: 'bvoc',
    name: 'BVoc',
    shortName: 'BV',
    parentKey: 'academic-operations',
    adminRoleName: 'BVoc Admin',
    description: 'BVoc execution unit under Academic Operations.',
  },
  {
    key: 'online',
    name: 'Online',
    shortName: 'ONL',
    parentKey: 'academic-operations',
    adminRoleName: 'Online Admin',
    description: 'Online execution unit under Academic Operations.',
  },
  {
    key: 'skill',
    name: 'Skill',
    shortName: 'SKL',
    parentKey: 'academic-operations',
    adminRoleName: 'Skill Admin',
    description: 'Skill execution unit under Academic Operations.',
  },
  {
    key: 'open-school',
    name: 'Open School',
    shortName: 'OPS',
    parentKey: 'academic-operations',
    adminRoleName: 'Open School Admin',
    description: 'Open School execution unit under Academic Operations.',
  }
];

export const INSTITUTIONAL_ROLES = [
  {
    name: 'Organization Admin',
    description: 'Primary institutional custodian with authority over system configuration and governance.',
    scopeType: 'institutional',
    isAdminEligible: true,
  },
  {
    name: 'CEO',
    description: 'Executive oversight identity with institution-wide visibility.',
    scopeType: 'institutional',
    isAdminEligible: false,
  },
  {
    name: 'Employee',
    description: 'Standard workforce identity for institutional staff.',
    scopeType: 'institutional',
    isAdminEligible: false,
  }
];

export const LEGACY_ROLE_ALIASES = {
  'sales & crm admin': 'Sales Admin',
  'sales admin': 'Sales Admin',
  'finance admin': 'Finance Admin',
  'hr admin': 'HR Admin',
  'operations admin': 'Academic Operations Admin',
  'academic operations admin': 'Academic Operations Admin',
  'bvoc department admin': 'BVoc Admin',
  'bvoc admin': 'BVoc Admin',
  'online department admin': 'Online Admin',
  'online admin': 'Online Admin',
  'skill department admin': 'Skill Admin',
  'skill admin': 'Skill Admin',
  'open school admin': 'Open School Admin',
  'organization admin': 'Organization Admin',
  'employee': 'Employee',
  'ceo': 'CEO',
};

export const SEEDED_ADMIN_ROLE_NAMES = [
  ...CORE_DEPARTMENTS.map((item) => item.adminRoleName),
  ...SUB_DEPARTMENTS.map((item) => item.adminRoleName),
];

export const SEEDED_DEPARTMENT_NAMES = [
  ...CORE_DEPARTMENTS.map((item) => item.name),
  ...SUB_DEPARTMENTS.map((item) => item.name),
];

const toInstitutionKey = (value = '') =>
  value
    .toLowerCase()
    .trim()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '');

const CANONICAL_DEPARTMENT_ALIASES = {
  Finance: ['Finance', 'Finance Department'],
  HR: ['HR', 'HR Department', 'Human Resources', 'Human Resources Department'],
  Sales: ['Sales', 'Sales Department', 'Sales & CRM', 'Sales and CRM'],
  Admissions: ['Admissions', 'Admissions Department'],
  'Academic Operations': ['Academic Operations', 'Academic Operations Department', 'Operations', 'Operations Department', 'Academics'],
  'Open School': ['Open School', 'Open School Department', 'OpenSchool'],
  Online: ['Online', 'Online Department', 'Online Education'],
  Skill: ['Skill', 'Skill Department', 'Skill Development'],
  BVoc: ['BVoc', 'BVoc Department'],
};

const DEPARTMENT_ALIAS_LOOKUP = Object.entries(CANONICAL_DEPARTMENT_ALIASES).reduce((acc, [canonicalName, aliases]) => {
  aliases.forEach((alias) => {
    acc[toInstitutionKey(alias)] = canonicalName;
  });
  return acc;
}, {});

export const normalizeInstitutionRoleName = (roleName = '') => {
  const normalized = roleName.toLowerCase().trim();
  return LEGACY_ROLE_ALIASES[normalized] || roleName;
};

export const normalizeDepartmentName = (departmentName = '') => {
  const canonicalName = DEPARTMENT_ALIAS_LOOKUP[toInstitutionKey(departmentName)];
  return canonicalName || departmentName;
};

export const normalizeSubDepartmentName = (subDepartmentName = '') => {
  const canonicalName = DEPARTMENT_ALIAS_LOOKUP[toInstitutionKey(subDepartmentName)];
  if (canonicalName === 'Open School') return 'Open School';
  if (canonicalName === 'Online') return 'Online';
  if (canonicalName === 'Skill') return 'Skill';
  if (canonicalName === 'BVoc') return 'BVoc';
  return subDepartmentName;
};

export const getDepartmentNameAliases = (departmentName = '') => {
  const canonicalName = normalizeDepartmentName(departmentName);
  const aliases = CANONICAL_DEPARTMENT_ALIASES[canonicalName] || [canonicalName];
  return [...new Set([departmentName, canonicalName, ...aliases].filter(Boolean))];
};

export const getSubDepartmentNameAliases = (subDepartmentName = '') => {
  const canonicalName = normalizeSubDepartmentName(subDepartmentName);
  const aliases = CANONICAL_DEPARTMENT_ALIASES[canonicalName] || [canonicalName];
  return [...new Set([subDepartmentName, canonicalName, ...aliases].filter(Boolean))];
};
