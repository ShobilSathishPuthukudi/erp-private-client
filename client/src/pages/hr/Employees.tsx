import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { DataTable } from '@/components/shared/DataTable';
import { Modal } from '@/components/shared/Modal';
import type { ColumnDef } from '@tanstack/react-table';
import { Plus, Edit2, Trash2, Users, X, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import { PageHeader } from '@/components/shared/PageHeader';
import { toSentenceCase } from '@/lib/utils';

interface Employee {
  uid: string;
  name: string;
  email: string;
  status: 'active' | 'inactive' | 'suspended';
  deptId: number | null;
  department?: { id: number, name: string };
  role?: string;
  avatar?: string | null;
  subDepartment?: string | null;
  reportingManagerUid?: string | null;
  vacancyId?: number | null;
  createdAt: string;
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
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState('');

  const { register, handleSubmit, reset, watch, formState: { errors, isSubmitting } } = useForm({
    defaultValues: {
      name: '',
      email: '',
      password: '',
      status: 'active',
      vacancyId: '',
      reportingManagerUid: ''
    }
  });

  const fetchVacancies = async () => {
    try {
      const res = await api.get('/hr/vacancies');
      setVacancies(res.data);
    } catch (error) {
      console.error('Failed to refresh vacancies:', error);
    }
  };

  const fetchInitialData = async () => {
    try {
      setIsLoading(true);
      const [empRes, vacRes] = await Promise.all([
        api.get('/hr/employees'),
        api.get('/hr/vacancies')
      ]);
      // Filter strictly for HR-registered personnel (those possessing a vacancyId)
      // This structural discriminator naturally excludes external entities like Partner Centers, Students, and Universities
      const hrPersonnel = empRes.data.filter((e: any) => e.vacancyId !== null && e.vacancyId !== undefined);
      
      setEmployees(hrPersonnel);
      // allEmployees is used for Reporting Manager selection: include structural admins as possible managers
      setAllEmployees(empRes.data.filter((e: any) => {
        const r = e.role?.toLowerCase() || '';
        return !['student', 'partner center', 'ceo'].includes(r);
      }));
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
  const selectedVacancy = selectedVacancyId
    ? vacancies.find(v => v.id === parseInt(selectedVacancyId))
    : null;

  const openCreateModal = () => {
    setEditingEmployee(null);
    setAvatarFile(null);
    setAvatarPreview('');
    setShowPassword(false);
    reset({ name: '', email: '', password: '', status: 'active', vacancyId: '', reportingManagerUid: '' });
    fetchVacancies(); // Ensure vacancy list is fresh when opening registration card
    setIsModalOpen(true);
  };

  const openEditModal = (employee: any) => {
    setEditingEmployee(employee);
    setAvatarFile(null);
    setAvatarPreview(employee.avatar || '');
    setShowPassword(false);
    reset({ 
      name: employee.name, 
      email: employee.email, 
      password: '', 
      status: employee.status,
      reportingManagerUid: employee.reportingManagerUid || '',
      vacancyId: employee.vacancyId ? String(employee.vacancyId) : ''
    });
    setIsModalOpen(true);
  };

  const onSubmit = async (data: any) => {
    try {
      if (!editingEmployee && !data.password) {
        return toast.error('Password is required for new employees');
      }

      const payload = new FormData();
      payload.append('name', data.name);
      payload.append('email', data.email);
      payload.append('reportingManagerUid', data.reportingManagerUid || '');
      if (!editingEmployee) {
        payload.append('vacancyId', data.vacancyId);
      }
      if (data.password) {
        payload.append('password', data.password);
      }
      if (avatarFile) {
        payload.append('avatar', avatarFile);
      }

      if (editingEmployee) {
        await api.put(`/hr/employees/${editingEmployee.uid}`, payload);
        toast.success('Employee updated');
      } else {
        await api.post('/hr/employees', payload);
        toast.success('Employee created');
      }
      setIsModalOpen(false);
      
      // Refresh list with structural filters applied
      const res = await api.get('/hr/employees');
      setEmployees(res.data.filter((e: any) => e.vacancyId !== null && e.vacancyId !== undefined));
      setAllEmployees(res.data.filter((e: any) => {
        const r = e.role?.toLowerCase() || '';
        return !['student', 'partner center', 'ceo'].includes(r);
      }));
      
      // Also refresh vacancies to reflect the updated status (e.g. if the role was just filled and closed)
      fetchVacancies();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Operation failed');
    }
  };

  const handleDelete = (emp: Employee) => {
    setEmployeeToDelete(emp);
  };

  const confirmDelete = async () => {
    if (!employeeToDelete) return;
    try {
      await api.delete(`/hr/employees/${employeeToDelete.uid}`);
      toast.success('Personnel record purged successfully');
      setEmployeeToDelete(null);
      // Refresh list with structural filters applied
      const res = await api.get('/hr/employees');
      setEmployees(res.data.filter((e: any) => e.vacancyId !== null && e.vacancyId !== undefined));
      setAllEmployees(res.data.filter((e: any) => {
        const r = e.role?.toLowerCase() || '';
        return !['student', 'partner center', 'ceo'].includes(r);
      }));
    } catch (error) {
      toast.error('Failed to eliminate personnel record');
    }
  };

  const columns: ColumnDef<Employee>[] = [
    { accessorKey: 'name', header: 'Full name' },
    { accessorKey: 'email', header: 'Email address' },
    { 
      id: 'department',
      header: 'Org structure',
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-semibold text-slate-700">{row.original.department?.name || 'Unassigned'}</span>
          <span className="text-[10px] text-slate-400 font-bold">{toSentenceCase((row.original as any).subDepartment || 'General')}</span>
        </div>
      )
    },
    { 
      id: 'manager',
      header: 'Reporting manager',
      cell: ({ row }) => {
        return (row.original as any).manager?.name || <span className="text-slate-400 ">None</span>;
      }
    },
    {
      accessorKey: 'role',
      header: 'Functional role',
      cell: ({ row }) => (
        <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
          {toSentenceCase(row.original.role || 'Employee')}
        </span>
      )
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
            {toSentenceCase(status)}
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
            <button onClick={() => handleDelete(emp)} className="p-1 hover:bg-red-50 rounded text-red-600 transition-colors">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        );
      }
    }
  ];

  return (
    <div className="space-y-6 flex flex-col h-[calc(100vh-8rem)]">
      <PageHeader 
        title="Personnel directory"
        description="Create employees from approved vacancies and maintain workforce records"
        icon={Users}
        action={
          <button 
            onClick={openCreateModal}
            className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors shadow-sm whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>Create Employee</span>
          </button>
        }
      />

      <div className="flex-1 min-h-0 bg-white shadow-sm border border-slate-200 rounded-lg flex flex-col">
        <DataTable 
          columns={columns} 
          data={employees} 
          isLoading={isLoading} 
          searchKey="name" 
          searchPlaceholder="Search personnel by name..." 
          exportFileName="Personnel_Directory"
        />
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        hideHeader
        maxWidth="4xl"
      >
        <div className="bg-slate-900 p-6 text-white flex justify-between items-center shrink-0 relative border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-xl backdrop-blur-md">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-widest leading-none mb-1">
                Human Resources
              </p>
              <h2 className="text-xl font-bold tracking-tight">
                {editingEmployee ? "Edit Personnel Details" : "Register New Employee"}
              </h2>
            </div>
          </div>
          <button 
            onClick={() => setIsModalOpen(false)}
            className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-lg transition-all hover:scale-110 active:scale-90 text-white/60 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col">
          <div className="p-8 space-y-6 bg-white overflow-y-auto max-h-[calc(100vh-240px)]">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Full Name</label>
                <input
                  {...register('name', { required: 'Name is required' })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl mt-1 focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium text-slate-900"
                  placeholder="John Smith"
                />
                {errors.name && <p className="text-[10px] font-bold text-rose-600 mt-1 uppercase tracking-tight">{errors.name.message as string}</p>}
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Email Address</label>
                <input
                  type="email"
                  {...register('email', { required: 'Email is required' })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl mt-1 focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium text-slate-900"
                  placeholder="j.smith@erp.com"
                />
                {errors.email && <p className="text-[10px] font-bold text-rose-600 mt-1 uppercase tracking-tight">{errors.email.message as string}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {!editingEmployee && (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Select Vacancy (Required)</label>
                  <select
                    {...register('vacancyId', { required: 'Vacancy is required for new hires' })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl mt-1 focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium cursor-pointer hover:bg-white text-slate-900"
                  >
                    <option value="">-- Select Open Vacancy --</option>
                    {vacancies.filter(v => v.status === 'OPEN').map((v) => (
                      <option key={v.id} value={v.id}>{v.title}</option>
                    ))}
                  </select>
                  {errors.vacancyId && <p className="text-[10px] font-bold text-rose-600 mt-1 uppercase tracking-tight">{errors.vacancyId.message as string}</p>}
                </div>
              )}

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Employee Photo <span className="text-slate-400 font-normal normal-case">(Optional)</span></label>
                <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="w-16 h-16 rounded-2xl overflow-hidden bg-slate-200 flex items-center justify-center text-slate-500 font-black text-lg">
                    {avatarPreview ? (
                      <img src={avatarPreview} alt="" className="w-full h-full object-cover" />
                    ) : (
                      (watch('name') || editingEmployee?.name || 'U').charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="flex-1 space-y-2">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(event) => {
                        const file = event.target.files?.[0] || null;
                        setAvatarFile(file);
                        setAvatarPreview(file ? URL.createObjectURL(file) : (editingEmployee?.avatar || ''));
                      }}
                      className="block w-full text-sm text-slate-700 file:mr-4 file:rounded-xl file:border-0 file:bg-slate-900 file:px-4 file:py-2.5 file:text-xs file:font-black file:uppercase file:tracking-widest file:text-white hover:file:bg-slate-800"
                    />
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">PNG, JPG, or WebP up to 5MB</p>
                  </div>
                </div>
              </div>
            </div>

            {!editingEmployee && selectedVacancy && (
              <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-blue-500">Vacancy Scope</p>
                <p className="mt-2 text-sm font-bold text-slate-900">
                  {selectedVacancy.title}
                </p>
                <p className="mt-1 text-xs text-slate-600">
                  Department assignment is inherited from the selected vacancy{selectedVacancy.subDepartment && selectedVacancy.subDepartment !== 'General' ? ` (${selectedVacancy.subDepartment})` : ''}, and all new registrations are created as `Employee`.
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Reporting Manager</label>
                <select
                  {...register('reportingManagerUid', { required: 'Reporting manager is required' })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl mt-1 focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium cursor-pointer hover:bg-white text-slate-900"
                >
                  <option value="">-- No Direct Manager --</option>
                  {allEmployees
                    .filter(e => e.uid !== (editingEmployee as any)?.uid)
                    .filter(e => {
                      const role = e.role?.toLowerCase() || '';
                      return role.includes('admin');
                    })
                    .map((e) => (
                    <option key={e.uid} value={e.uid}>{e.name} ({toSentenceCase(e.role || '')})</option>
                  ))}
                </select>
                {errors.reportingManagerUid && <p className="text-[10px] font-bold text-rose-600 mt-1 uppercase tracking-tight">{errors.reportingManagerUid.message as string}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                Password {editingEmployee && <span className="text-slate-400 font-normal normal-case ">(Leave blank to keep current)</span>}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  {...register('password', { required: !editingEmployee ? 'Password is required for new hires' : false })}
                  autoComplete="new-password"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl mt-1 focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium pr-12 text-slate-900"
                  placeholder={editingEmployee ? "Enter new password" : "Required password"}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 hover:bg-slate-200 rounded-lg text-slate-400 transition-all"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="text-[10px] font-bold text-rose-600 mt-1 uppercase tracking-tight">{errors.password.message as string}</p>}
            </div>
          </div>

          <div className="flex justify-end gap-3 p-8 bg-slate-50 border-t border-slate-200 shrink-0">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-8 py-3.5 bg-white text-slate-600 font-bold text-xs uppercase tracking-widest rounded-2xl border border-slate-200 hover:bg-slate-50 hover:scale-105 active:scale-95 transition-all shadow-sm"
            >
              Discard
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-8 py-3.5 bg-slate-900 text-white font-bold text-xs uppercase tracking-widest rounded-2xl shadow-xl shadow-slate-900/10 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:scale-100"
            >
              {isSubmitting ? 'Processing...' : (editingEmployee ? 'Save Updates' : 'Register')}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal 
        isOpen={!!employeeToDelete} 
        onClose={() => setEmployeeToDelete(null)} 
        title="Personnel termination protocol"
        maxWidth="md"
      >
        <div className="p-6 text-center space-y-6">
          <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center mx-auto ring-8 ring-rose-50/50">
            <Trash2 className="w-10 h-10 text-rose-600" />
          </div>
          <div>
            <h3 className="text-xl font-black text-slate-900 mb-2 uppercase tracking-tight">Confirm</h3>
            <p className="text-slate-500 font-medium px-4 text-sm leading-relaxed">
              Are you sure you want to eliminate the personnel record for <span className="text-rose-600 font-bold">{employeeToDelete?.name}</span>? This action is permanent and will be logged in the audit trail.
            </p>
          </div>
          <div className="flex gap-4 pt-4">
            <button 
              onClick={() => setEmployeeToDelete(null)}
              className="flex-1 px-6 py-3 bg-white border border-slate-200 text-slate-600 font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-slate-50 transition-all active:scale-95 shadow-sm"
            >
              Cancel
            </button>
            <button 
              onClick={confirmDelete}
              className="flex-1 px-6 py-3 bg-rose-600 text-white font-black text-[10px] uppercase tracking-widest rounded-xl shadow-lg shadow-rose-600/20 hover:bg-rose-700 transition-all active:scale-95"
            >
              Confirm
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
