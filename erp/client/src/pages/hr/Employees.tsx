import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { DataTable } from '@/components/shared/DataTable';
import { Modal } from '@/components/shared/Modal';
import type { ColumnDef } from '@tanstack/react-table';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';

interface Employee {
  uid: string;
  name: string;
  email: string;
  status: 'active' | 'inactive' | 'suspended';
  deptId: number | null;
  department?: { id: number, name: string };
  createdAt: string;
}

interface Department {
  id: number;
  name: string;
}

interface Vacancy {
  id: number;
  title: string;
  departmentId: number;
  subDepartment: string;
  status: 'OPEN' | 'CLOSED';
}

export default function Employees() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [allEmployees, setAllEmployees] = useState<Employee[]>([]);
  const [vacancies, setVacancies] = useState<Vacancy[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  const { register, handleSubmit, reset, watch, formState: { errors, isSubmitting } } = useForm();

  const fetchInitialData = async () => {
    try {
      setIsLoading(true);
      const [empRes, deptRes, vacRes] = await Promise.all([
        api.get('/hr/employees'),
        api.get('/departments'),
        api.get('/hr/vacancies')
      ]);
      setEmployees(empRes.data);
      setAllEmployees(empRes.data);
      setDepartments(deptRes.data);
      setVacancies(vacRes.data);
    } catch (error) {
      toast.error('Failed to fetch data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  const selectedVacancyId = watch('vacancyId');
  useEffect(() => {
    if (selectedVacancyId) {
      const v = vacancies.find(v => v.id === parseInt(selectedVacancyId));
      if (v) {
        reset((prev) => ({ ...prev, deptId: v.departmentId }));
      }
    }
  }, [selectedVacancyId, vacancies, reset]);

  const openCreateModal = () => {
    setEditingEmployee(null);
    reset({ name: '', email: '', password: '', status: 'active', deptId: '', vacancyId: '', reportingManagerUid: '' });
    setIsModalOpen(true);
  };

  const openEditModal = (employee: any) => {
    setEditingEmployee(employee);
    reset({ 
      name: employee.name, 
      email: employee.email, 
      password: '', 
      status: employee.status,
      deptId: employee.deptId || '',
      reportingManagerUid: employee.reportingManagerUid || ''
    });
    setIsModalOpen(true);
  };

  const onSubmit = async (data: any) => {
    try {
      const payload = { ...data, deptId: data.deptId ? parseInt(data.deptId) : null };
      
      if (!editingEmployee && !payload.password) {
        return toast.error('Password is required for new employees');
      }

      if (editingEmployee) {
        await api.put(`/hr/employees/${editingEmployee.uid}`, payload);
        toast.success('Employee updated');
      } else {
        await api.post('/hr/employees', payload);
        toast.success('Employee created');
      }
      setIsModalOpen(false);
      
      // Refresh list
      const res = await api.get('/hr/employees');
      setEmployees(res.data);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Operation failed');
    }
  };

  const handleDelete = async (uid: string) => {
    if (!window.confirm('Are you sure you want to delete this employee?')) return;
    try {
      await api.delete(`/hr/employees/${uid}`);
      toast.success('Employee deleted');
      const res = await api.get('/hr/employees');
      setEmployees(res.data);
    } catch (error) {
      toast.error('Failed to delete employee');
    }
  };

  const columns: ColumnDef<Employee>[] = [
    { accessorKey: 'uid', header: 'Emp ID' },
    { accessorKey: 'name', header: 'Full Name' },
    { accessorKey: 'email', header: 'Email Address' },
    { 
      id: 'department',
      header: 'Org Structure',
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-semibold text-slate-700">{row.original.department?.name || 'Unassigned'}</span>
          <span className="text-[10px] text-slate-400 font-bold uppercase">{(row.original as any).subDepartment || 'General'}</span>
        </div>
      )
    },
    { 
      id: 'manager',
      header: 'Reporting Manager',
      cell: ({ row }) => {
        return (row.original as any).manager?.name || <span className="text-slate-400 italic">None</span>;
      }
    },
    { 
      accessorKey: 'status', 
      header: 'Status',
      cell: ({ row }) => {
        const status = row.original.status;
        let color = 'bg-slate-100 text-slate-700';
        if (status === 'active') color = 'bg-green-100 text-green-700';
        if (status === 'suspended') color = 'bg-red-100 text-red-700';
        return (
          <span className={`px-2 py-1 text-xs rounded-full font-medium ${color}`}>
            {status.toUpperCase()}
          </span>
        );
      }
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const emp = row.original;
        return (
          <div className="flex items-center space-x-2">
            <button onClick={() => openEditModal(emp)} className="p-1 hover:bg-slate-100 rounded text-slate-600 transition-colors">
              <Edit2 className="w-4 h-4" />
            </button>
            <button onClick={() => handleDelete(emp.uid)} className="p-1 hover:bg-red-50 rounded text-red-600 transition-colors">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        );
      }
    }
  ];

  return (
    <div className="space-y-6 flex flex-col h-[calc(100vh-8rem)]">
      <div className="flex justify-between items-center shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Personnel Directory</h1>
          <p className="text-slate-500">Manage institutional staff details and assignments</p>
        </div>
        <button 
          onClick={openCreateModal}
          className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Register Staff</span>
        </button>
      </div>

      <div className="flex-1 min-h-0 bg-white shadow-sm border border-slate-200 rounded-lg flex flex-col">
        <DataTable 
          columns={columns} 
          data={employees} 
          isLoading={isLoading} 
          searchKey="name" 
          searchPlaceholder="Search personnel by name..." 
          exportFileName="IITS_Personnel_Directory"
        />
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingEmployee ? "Edit Employee details" : "Register new Employee"}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
            <input
              {...register('name', { required: 'Name is required' })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 shadow-sm"
              placeholder="e.g. John Smith"
            />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message as string}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
            <input
              type="email"
              {...register('email', { required: 'Email is required' })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 shadow-sm"
              placeholder="e.g. j.smith@iits.edu"
            />
            {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message as string}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Department assignment {selectedVacancyId && <span className="text-blue-600 font-bold">(Allocated via Vacancy)</span>}
            </label>
            <select
              {...register('deptId')}
              disabled={!!selectedVacancyId}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 shadow-sm bg-slate-50 disabled:opacity-70 cursor-not-allowed"
            >
              <option value="">-- No Department Assigned --</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>

          {!editingEmployee && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Select Vacancy (Required)</label>
              <select
                {...register('vacancyId', { required: 'Vacancy is required for new hires' })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 shadow-sm bg-white"
              >
                <option value="">-- Select Open Vacancy --</option>
                {vacancies.filter(v => v.status === 'OPEN').map((v) => (
                  <option key={v.id} value={v.id}>{v.title}</option>
                ))}
              </select>
              {errors.vacancyId && <p className="text-red-500 text-xs mt-1">{errors.vacancyId.message as string}</p>}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Reporting Manager</label>
            <select
              {...register('reportingManagerUid')}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 shadow-sm bg-white"
            >
              <option value="">-- No Direct Manager --</option>
              {allEmployees.filter(e => e.uid !== (editingEmployee as any)?.uid).map((e) => (
                <option key={e.uid} value={e.uid}>{e.name} ({e.uid})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Password {editingEmployee && <span className="text-slate-400 font-normal">(Leave blank to keep current)</span>}
            </label>
            <input
              type="password"
              {...register('password')}
              autoComplete="new-password"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 shadow-sm"
              placeholder={editingEmployee ? "Enter new password" : "Required password"}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Account Status</label>
            <select
              {...register('status')}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 shadow-sm bg-white"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>

          <div className="pt-4 flex justify-end space-x-3 border-t border-slate-100 mt-6">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm"
            >
              {isSubmitting ? 'Processing...' : (editingEmployee ? 'Save Updates' : 'Register')}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
