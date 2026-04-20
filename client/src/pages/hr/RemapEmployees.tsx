import { useEffect, useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { Shuffle, RefreshCcw } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { DataTable } from '@/components/shared/DataTable';
import { Modal } from '@/components/shared/Modal';
import { PageHeader } from '@/components/shared/PageHeader';
import { toSentenceCase } from '@/lib/utils';

type DepartmentRecord = {
  id: number;
  name: string;
  type: string;
  parent?: { id: number; name: string } | null;
};

type EmployeeRecord = {
  uid: string;
  name: string;
  email: string;
  role?: string;
  avatar?: string | null;
  deptId?: number | null;
  subDepartment?: string | null;
  reportingManagerUid?: string | null;
  department?: { id: number; name: string } | null;
  manager?: { uid: string; name: string } | null;
  assignedAdminRoles?: { id: number; name: string; scopeType: string; scopeSubDepartment?: string | null }[];
  vacancyId?: number | null;
};

export default function RemapEmployees() {
  const [employees, setEmployees] = useState<EmployeeRecord[]>([]);
  const [departments, setDepartments] = useState<DepartmentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeRecord | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [targetDepartmentId, setTargetDepartmentId] = useState('');
  const [targetManagerUid, setTargetManagerUid] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [employeesRes, departmentsRes] = await Promise.all([
        api.get('/hr/employees'),
        api.get('/departments')
      ]);

      const eligibleEmployees = (employeesRes.data || []).filter((employee: EmployeeRecord) => {
        const canonicalRole = (employee.role || '').toLowerCase();
        const isCreatedEmployee = Boolean(employee.vacancyId) || employee.uid?.startsWith('EMP-');
        const isMappedAdmin = Array.isArray(employee.assignedAdminRoles) && employee.assignedAdminRoles.length > 0;
        return isCreatedEmployee || canonicalRole === 'employee' || isMappedAdmin;
      });

      const eligibleDepartments = (departmentsRes.data || []).filter((department: DepartmentRecord) => {
        const type = (department.type || '').toLowerCase();
        return ['departments', 'department', 'sub-departments', 'sub-department'].includes(type);
      });

      setEmployees(eligibleEmployees);
      setDepartments(eligibleDepartments);
    } catch (error) {
      toast.error('Failed to load remap registry');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const managerOptions = useMemo(() => {
    if (!targetDepartmentId) return [];
    const targetDepartment = departments.find((department) => String(department.id) === targetDepartmentId);
    if (!targetDepartment) return [];

    const normalizedTargetType = (targetDepartment.type || '').toLowerCase();
    const parentDepartmentName = targetDepartment.parent?.name || targetDepartment.name;
    const targetSubDepartment =
      normalizedTargetType.startsWith('sub-') ? targetDepartment.name : null;

    return employees.filter((employee) => {
      if (selectedEmployee && employee.uid === selectedEmployee.uid) return false;
      const role = (employee.role || '').toLowerCase();
      const isManagerRole = role.includes('admin');
      if (!isManagerRole) return false;

      const employeeDepartmentName = employee.department?.name || '';
      const sameDepartment =
        employeeDepartmentName === parentDepartmentName ||
        employeeDepartmentName === targetDepartment.name;
      const sameSubDepartment = !targetSubDepartment || employee.subDepartment === targetSubDepartment;

      return sameDepartment && sameSubDepartment;
    });
  }, [departments, employees, selectedEmployee, targetDepartmentId]);

  useEffect(() => {
    if (!targetManagerUid) return;
    const stillValid = managerOptions.some((manager) => manager.uid === targetManagerUid);
    if (!stillValid) {
      setTargetManagerUid('');
    }
  }, [managerOptions, targetManagerUid]);

  const openRemapModal = (employee: EmployeeRecord) => {
    setSelectedEmployee(employee);
    setTargetDepartmentId('');
    setTargetManagerUid(employee.reportingManagerUid || '');
    setIsModalOpen(true);
  };

  const closeRemapModal = () => {
    setSelectedEmployee(null);
    setTargetDepartmentId('');
    setTargetManagerUid('');
    setIsModalOpen(false);
  };

  const handleSubmit = async () => {
    if (!selectedEmployee || !targetDepartmentId) {
      toast.error('Select a target department to continue');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await api.put(`/hr/employees/${selectedEmployee.uid}/remap`, {
        departmentId: Number(targetDepartmentId),
        reportingManagerUid: targetManagerUid || null
      });
      toast.success(res.data?.message || 'Employee remapped successfully');
      closeRemapModal();
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to remap employee');
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns: ColumnDef<EmployeeRecord>[] = [
    {
      accessorKey: 'name',
      header: 'Employee',
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-slate-100 overflow-hidden flex items-center justify-center shrink-0">
            {row.original.avatar ? (
              <img src={row.original.avatar} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-xs font-black text-slate-500">
                {row.original.name?.charAt(0)?.toUpperCase() || 'U'}
              </span>
            )}
          </div>
          <div>
            <p className="font-semibold text-slate-900">{row.original.name}</p>
            <p className="text-xs text-slate-500">{row.original.email}</p>
          </div>
        </div>
      )
    },
    {
      id: 'currentScope',
      header: 'Current scope',
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-medium text-slate-800">{row.original.department?.name || 'Unassigned'}</span>
          <span className="text-[10px] text-slate-400 font-bold">
            {toSentenceCase(row.original.subDepartment || 'General')}
          </span>
        </div>
      )
    },
    {
      id: 'currentManager',
      header: 'Reporting manager',
      cell: ({ row }) => row.original.manager?.name || <span className="text-slate-400">None</span>
    },
    {
      id: 'adminMapping',
      header: 'Admin mapping',
      cell: ({ row }) => {
        const mappedRoles = row.original.assignedAdminRoles || [];
        if (mappedRoles.length === 0) {
          return <span className="text-slate-400 text-xs">None</span>;
        }

        return (
          <div className="flex flex-col gap-1">
            {mappedRoles.map((role) => (
              <span key={role.id} className="inline-flex w-fit px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-amber-50 text-amber-700 border border-amber-100">
                {toSentenceCase(role.name)}
              </span>
            ))}
          </div>
        );
      }
    },
    {
      id: 'actions',
      header: 'Action',
      cell: ({ row }) => (
        <button
          onClick={() => openRemapModal(row.original)}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-900 text-white text-xs font-black uppercase tracking-widest hover:bg-blue-600 transition-all active:scale-95"
        >
          <RefreshCcw className="w-3.5 h-3.5" />
          Remap
        </button>
      )
    }
  ];

  const selectedDepartment = departments.find((department) => String(department.id) === targetDepartmentId);
  const selectedEmployeeHasAdminMapping = Boolean(selectedEmployee?.assignedAdminRoles?.length);

  return (
    <div className="space-y-6 flex flex-col h-[calc(100vh-8rem)]">
      <PageHeader
        title="Employee remap"
        description="Move existing employees into a different department or unit and clear any seeded admin mapping automatically."
        icon={Shuffle}
      />

      <div className="flex-1 min-h-0 bg-white shadow-sm border border-slate-200 rounded-lg flex flex-col">
        <DataTable
          columns={columns}
          data={employees}
          isLoading={isLoading}
          searchKey="name"
          searchPlaceholder="Search employees by name..."
          exportFileName="Employee_Remap_Registry"
        />
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={closeRemapModal}
        title="Remap Employee"
        maxWidth="lg"
      >
        <div className="space-y-5">
          {selectedEmployee && (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Selected employee</p>
              <p className="mt-2 text-base font-bold text-slate-900">{selectedEmployee.name}</p>
              <p className="text-xs text-slate-500">{selectedEmployee.email}</p>
            </div>
          )}

          {selectedEmployeeHasAdminMapping && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-amber-600">Admin mapping detected</p>
              <p className="mt-2 text-sm text-amber-900 font-medium">
                This employee is currently mapped to a seeded admin role. Remapping will clear that admin assignment, revert the employee role to <span className="font-black">Employee</span>, and restore the default seeded admin fallback profile.
              </p>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Target department</label>
            <select
              value={targetDepartmentId}
              onChange={(event) => setTargetDepartmentId(event.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium text-slate-900"
            >
              <option value="">Select target department</option>
              {departments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.parent?.name ? `${department.parent.name} / ${department.name}` : department.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Reporting manager</label>
            <select
              value={targetManagerUid}
              onChange={(event) => setTargetManagerUid(event.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium text-slate-900"
            >
              <option value="">No direct manager</option>
              {managerOptions.map((manager) => (
                <option key={manager.uid} value={manager.uid}>
                  {manager.name} ({toSentenceCase(manager.role || 'Employee')})
                </option>
              ))}
            </select>
          </div>

          {selectedDepartment && (
            <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-blue-600">Resolved target scope</p>
              <p className="mt-2 text-sm font-bold text-slate-900">
                {selectedDepartment.parent?.name ? `${selectedDepartment.parent.name} / ${selectedDepartment.name}` : selectedDepartment.name}
              </p>
              <p className="mt-1 text-xs text-slate-600">
                Sub-department routing will be inferred automatically from the selected target.
              </p>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={closeRemapModal}
              className="flex-1 py-3 px-4 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-50 transition-all active:scale-95"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting || !targetDepartmentId}
              className="flex-1 py-3 px-4 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-blue-600 transition-all active:scale-95 disabled:opacity-50 disabled:hover:bg-slate-900"
            >
              {isSubmitting ? 'Remapping...' : 'Confirm Remap'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
