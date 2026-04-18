import { useState, useEffect, useMemo } from 'react';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import {
  Shield,
  Info,
  Save,
  RotateCcw,
  ChevronDown,
  Lock,
  Globe,
  Building2,
  Home,
  User,
  Check,
} from 'lucide-react';

const ACTION_REGISTRY = [
  {
    id: 'gov',
    name: 'Governance',
    flows: [
      {
        id: 'gov_inst',
        name: 'Institutional Oversight',
        actions: [
          { id: 'GOV_PROVISION_EXEC', name: 'Provision Executive' },
          { id: 'GOV_POLICY_UPDATE', name: 'Update Policy' },
        ],
      },
    ],
  },
  {
    id: 'acad',
    name: 'Academic',
    flows: [
      {
        id: 'acad_prog',
        name: 'Program Lifecycle',
        actions: [
          { id: 'ACAD_UNI_SEED', name: 'Seed University' },
          { id: 'ACAD_PROG_ENG', name: 'Engineer Program' },
          { id: 'ACAD_BATCH_INIT', name: 'Initialize Batch' },
        ],
      },
    ],
  },
  {
    id: 'fin',
    name: 'Finance',
    flows: [
      {
        id: 'fin_coll',
        name: 'Collection & Ratification',
        actions: [
          { id: 'FIN_FEE_MAP', name: 'Map Fee Schema' },
          { id: 'FIN_PAY_VERIFY', name: 'Verify Payment' },
          { id: 'FIN_INV_ISSUE', name: 'Issue Invoice' },
        ],
      },
    ],
  },
  {
    id: 'hr',
    name: 'HR & Workforce',
    flows: [
      {
        id: 'hr_work',
        name: 'Workforce Management',
        actions: [
          { id: 'HR_HIRE', name: 'Hiring Registry' },
          { id: 'HR_LEAVE_S1', name: 'Phase 1 Leave Approval' },
          { id: 'HR_LEAVE_S2', name: 'Phase 2 Leave Approval' },
        ],
      },
    ],
  },
  {
    id: 'sales',
    name: 'Sales & CRM',
    flows: [
      {
        id: 'sales_acq',
        name: 'Partner Acquisition',
        actions: [
          { id: 'SALES_LEAD_CAP', name: 'Capture Lead' },
          { id: 'SALES_LEAD_QUAL', name: 'Qualify Lead' },
          { id: 'SALES_CONV', name: 'Convert Center' },
        ],
      },
    ],
  },
];

const SCOPE_OPTIONS = [
  { id: 'GLOBAL', label: 'Global', icon: Globe },
  { id: 'DEPARTMENT', label: 'Department', icon: Building2 },
  { id: 'CENTER', label: 'Center', icon: Home },
  { id: 'SELF', label: 'Self', icon: User },
];

const PERM_KEYS = ['create', 'read', 'update', 'delete', 'approve'] as const;
type PermKey = typeof PERM_KEYS[number];

const PERM_LABEL: Record<PermKey, string> = {
  create: 'Create',
  read: 'Read',
  update: 'Update',
  delete: 'Delete',
  approve: 'Approve',
};

const LOCKED_ROLES = ['Organization Admin', 'CEO'];

const DEFAULT_PERMS = {
  create: false,
  read: false,
  update: false,
  delete: false,
  approve: false,
  scope: 'SELF',
  ownership: false,
};

export default function PermissionMatrix() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [roles, setRoles] = useState<any[]>([]);
  const [matrixState, setMatrixState] = useState<any>({});
  const [initialMatrix, setInitialMatrix] = useState<string>('');
  const [expandedModules, setExpandedModules] = useState<string[]>(['gov', 'acad']);
  const [selectedRoleName, setSelectedRoleName] = useState<string>('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [{ data: rolesData }, { data: matrixData }] = await Promise.all([
        api.get('/org-admin/roles'),
        api.get('/org-admin/permissions/matrix/full'),
      ]);

      const filteredRoles = rolesData.filter((r: any) => r.name.toLowerCase() !== 'system');
      setRoles(filteredRoles);

      const currentMatrix = matrixData?.matrix || {};

      filteredRoles.forEach((role: any) => {
        if (!role.isCustom) {
          const roleName = role.name;
          if (!currentMatrix[roleName]) currentMatrix[roleName] = {};

          if (LOCKED_ROLES.includes(roleName)) {
            ACTION_REGISTRY.forEach((mod) => {
              mod.flows.forEach((flow) => {
                flow.actions.forEach((action) => {
                  currentMatrix[roleName][action.id] = {
                    create: true,
                    read: true,
                    update: true,
                    delete: true,
                    approve: true,
                    scope: 'GLOBAL',
                    ownership: false,
                  };
                });
              });
            });
          }
        }
      });

      setMatrixState(currentMatrix);
      setInitialMatrix(JSON.stringify(currentMatrix));

      const firstSelectable =
        filteredRoles.find((r: any) => !LOCKED_ROLES.includes(r.name)) || filteredRoles[0];
      if (firstSelectable) setSelectedRoleName(firstSelectable.name);
    } catch (error) {
      toast.error('Failed to load permission matrix');
    } finally {
      setLoading(false);
    }
  };

  const selectedRole = useMemo(
    () => roles.find((r) => r.name === selectedRoleName),
    [roles, selectedRoleName],
  );

  const isRoleLocked = (roleName: string) => {
    const role = roles.find((r) => r.name === roleName);
    return role && !role.isCustom && LOCKED_ROLES.includes(roleName);
  };

  const isLocked = selectedRoleName ? isRoleLocked(selectedRoleName) : false;

  const getActionPerms = (roleName: string, actionId: string) => ({
    ...DEFAULT_PERMS,
    ...(matrixState[roleName]?.[actionId] || {}),
  });

  const updateAction = (actionId: string, updater: (prev: any) => any) => {
    if (!selectedRoleName || isLocked) return;
    setMatrixState((prev: any) => {
      const rolePerms = prev[selectedRoleName] || {};
      const actionPerms = { ...DEFAULT_PERMS, ...(rolePerms[actionId] || {}) };
      return {
        ...prev,
        [selectedRoleName]: {
          ...rolePerms,
          [actionId]: updater(actionPerms),
        },
      };
    });
  };

  const handleToggle = (actionId: string, key: PermKey) => {
    updateAction(actionId, (perms) => {
      const newVal = !perms[key];
      const next = { ...perms, [key]: newVal };

      if (key === 'read' && !newVal) {
        next.create = false;
        next.update = false;
        next.delete = false;
        next.approve = false;
      }
      if ((key === 'approve' || key === 'create' || key === 'update' || key === 'delete') && newVal) {
        next.read = true;
      }
      if (key === 'delete' && newVal) {
        next.update = true;
      }
      if (key === 'update' && !newVal) {
        next.delete = false;
      }

      return next;
    });
  };

  const handleScopeChange = (actionId: string, scope: string) => {
    updateAction(actionId, (perms) => ({
      ...perms,
      scope,
      ownership: scope === 'GLOBAL' ? false : perms.ownership,
    }));
  };

  const handleOwnershipToggle = (actionId: string) => {
    updateAction(actionId, (perms) => {
      if (perms.scope === 'GLOBAL') return perms;
      return { ...perms, ownership: !perms.ownership };
    });
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await api.post('/org-admin/permissions/matrix/update-full', { matrix: matrixState });
      setInitialMatrix(JSON.stringify(matrixState));
      toast.success('Permissions saved');
    } catch (error) {
      toast.error('Failed to save permissions');
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = initialMatrix !== JSON.stringify(matrixState);

  const toggleModule = (id: string) =>
    setExpandedModules((prev) => (prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]));

  const grantedActionCount = useMemo(() => {
    if (!selectedRoleName) return 0;
    let count = 0;
    ACTION_REGISTRY.forEach((mod) =>
      mod.flows.forEach((flow) =>
        flow.actions.forEach((action) => {
          const p = getActionPerms(selectedRoleName, action.id);
          if (p.read || p.create || p.update || p.delete || p.approve) count += 1;
        }),
      ),
    );
    return count;
  }, [selectedRoleName, matrixState]);

  const totalActionCount = useMemo(
    () =>
      ACTION_REGISTRY.reduce(
        (sum, mod) => sum + mod.flows.reduce((s, flow) => s + flow.actions.length, 0),
        0,
      ),
    [],
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="w-8 h-8 border-2 border-slate-200 border-t-slate-900 rounded-full animate-spin" />
        <p className="text-sm text-slate-500">Loading permissions…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-6xl mx-auto px-4 md:px-8 py-8 pb-32 space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-900 text-white">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
                Permission Matrix
              </h1>
              <p className="text-sm text-slate-500 mt-0.5">
                Configure what each role can do across institutional actions.
              </p>
            </div>
          </div>
        </div>

        {/* Role selector */}
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Editing role</p>
            {selectedRoleName && (
              <p className="text-xs text-slate-500">
                <span className="font-semibold text-slate-900 tabular-nums">{grantedActionCount}</span>
                <span className="text-slate-400"> / {totalActionCount}</span>
                <span className="ml-1">actions granted</span>
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {roles.map((role) => {
              const locked = isRoleLocked(role.name);
              const isSelected = role.name === selectedRoleName;
              return (
                <button
                  key={role.id}
                  onClick={() => setSelectedRoleName(role.name)}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                    isSelected
                      ? 'border-slate-900 bg-slate-900 text-white'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  {locked && <Lock className="w-3 h-3" />}
                  {role.name}
                </button>
              );
            })}
          </div>

          {selectedRole && (
            <div className="mt-4 flex items-start gap-2 text-xs text-slate-500">
              {isLocked ? (
                <>
                  <Lock className="w-3.5 h-3.5 mt-0.5 shrink-0 text-amber-600" />
                  <span>
                    <span className="font-medium text-amber-700">System role.</span> Full access is
                    enforced automatically and cannot be modified from this screen.
                  </span>
                </>
              ) : (
                <>
                  <Info className="w-3.5 h-3.5 mt-0.5 shrink-0 text-slate-400" />
                  <span>
                    Read is required for any other action. Enabling Create, Update, Delete, or
                    Approve auto-enables Read. Delete requires Update.
                  </span>
                </>
              )}
            </div>
          )}
        </div>

        {/* Modules */}
        <div className="space-y-4">
          {ACTION_REGISTRY.map((module) => {
            const isExpanded = expandedModules.includes(module.id);
            const moduleActionCount = module.flows.reduce((s, f) => s + f.actions.length, 0);
            const moduleGranted = selectedRoleName
              ? module.flows.reduce(
                  (sum, flow) =>
                    sum +
                    flow.actions.filter((a) => {
                      const p = getActionPerms(selectedRoleName, a.id);
                      return p.read || p.create || p.update || p.delete || p.approve;
                    }).length,
                  0,
                )
              : 0;

            return (
              <div
                key={module.id}
                className="rounded-xl border border-slate-200 bg-white overflow-hidden"
              >
                <button
                  onClick={() => toggleModule(module.id)}
                  className="w-full px-5 py-4 flex items-center justify-between hover:bg-slate-50 transition"
                >
                  <div className="flex items-center gap-3">
                    <ChevronDown
                      className={`w-4 h-4 text-slate-400 transition-transform ${
                        isExpanded ? '' : '-rotate-90'
                      }`}
                    />
                    <span className="font-medium text-slate-900">{module.name}</span>
                    <span className="text-xs text-slate-500">
                      {moduleGranted}/{moduleActionCount}
                    </span>
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-slate-100">
                    {module.flows.map((flow) => (
                      <div key={flow.id}>
                        <div className="px-5 pt-4 pb-2">
                          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                            {flow.name}
                          </p>
                        </div>

                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-slate-100">
                                <th className="px-5 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-slate-500 min-w-[220px]">
                                  Action
                                </th>
                                {PERM_KEYS.map((k) => (
                                  <th
                                    key={k}
                                    className="px-2 py-2.5 text-center text-[11px] font-medium uppercase tracking-wider text-slate-500"
                                  >
                                    {PERM_LABEL[k]}
                                  </th>
                                ))}
                                <th className="px-3 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-slate-500 min-w-[140px]">
                                  Scope
                                </th>
                                <th className="px-3 py-2.5 text-center text-[11px] font-medium uppercase tracking-wider text-slate-500">
                                  Ownership
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {flow.actions.map((action) => {
                                const perms = selectedRoleName
                                  ? getActionPerms(selectedRoleName, action.id)
                                  : DEFAULT_PERMS;
                                return (
                                  <tr key={action.id} className="hover:bg-slate-50/60 transition">
                                    <td className="px-5 py-3">
                                      <div className="flex flex-col">
                                        <span className="font-medium text-slate-900">
                                          {action.name}
                                        </span>
                                        <span className="mt-0.5 font-mono text-[10px] text-slate-400">
                                          {action.id}
                                        </span>
                                      </div>
                                    </td>

                                    {PERM_KEYS.map((k) => (
                                      <td key={k} className="px-2 py-3 text-center">
                                        <button
                                          onClick={() => handleToggle(action.id, k)}
                                          disabled={isLocked}
                                          className={`inline-flex h-6 w-6 items-center justify-center rounded-md border transition ${
                                            perms[k]
                                              ? 'border-slate-900 bg-slate-900 text-white'
                                              : 'border-slate-200 bg-white text-transparent hover:border-slate-400'
                                          } ${
                                            isLocked
                                              ? 'opacity-50 cursor-not-allowed'
                                              : 'cursor-pointer'
                                          }`}
                                          aria-label={`${PERM_LABEL[k]} — ${action.name}`}
                                          aria-pressed={perms[k]}
                                        >
                                          {perms[k] && <Check className="w-3.5 h-3.5" />}
                                        </button>
                                      </td>
                                    ))}

                                    <td className="px-3 py-3">
                                      <select
                                        value={perms.scope}
                                        disabled={isLocked}
                                        onChange={(e) =>
                                          handleScopeChange(action.id, e.target.value)
                                        }
                                        className={`w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100 ${
                                          isLocked
                                            ? 'opacity-50 cursor-not-allowed'
                                            : 'cursor-pointer'
                                        }`}
                                      >
                                        {SCOPE_OPTIONS.map((opt) => (
                                          <option key={opt.id} value={opt.id}>
                                            {opt.label}
                                          </option>
                                        ))}
                                      </select>
                                    </td>

                                    <td className="px-3 py-3 text-center">
                                      <button
                                        onClick={() => handleOwnershipToggle(action.id)}
                                        disabled={isLocked || perms.scope === 'GLOBAL'}
                                        className={`inline-flex h-6 w-6 items-center justify-center rounded-md border transition ${
                                          perms.ownership
                                            ? 'border-slate-900 bg-slate-900 text-white'
                                            : 'border-slate-200 bg-white text-transparent hover:border-slate-400'
                                        } ${
                                          isLocked || perms.scope === 'GLOBAL'
                                            ? 'opacity-40 cursor-not-allowed'
                                            : 'cursor-pointer'
                                        }`}
                                        aria-pressed={perms.ownership}
                                        title={
                                          perms.scope === 'GLOBAL'
                                            ? 'Ownership is implicit at Global scope'
                                            : 'Restrict to records the user owns'
                                        }
                                      >
                                        {perms.ownership && <Check className="w-3.5 h-3.5" />}
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Sticky save bar */}
      {hasChanges && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40">
          <div className="flex items-center gap-3 rounded-full border border-slate-200 bg-white px-4 py-2 shadow-lg shadow-slate-900/10">
            <span className="text-xs text-slate-600">Unsaved changes</span>
            <button
              onClick={() => setMatrixState(JSON.parse(initialMatrix))}
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 transition disabled:opacity-50"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-4 py-1.5 text-xs font-medium text-white hover:bg-slate-800 transition disabled:opacity-60"
            >
              {saving ? (
                <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              Save
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
