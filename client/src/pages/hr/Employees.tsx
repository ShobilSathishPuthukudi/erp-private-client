import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useNavigate } from 'react-router-dom';
import { DataTable } from '@/components/shared/DataTable';
import { Modal } from '@/components/shared/Modal';
import type { ColumnDef } from '@tanstack/react-table';
import { Plus, Edit2, Trash2, Users, X, Eye, EyeOff, ChevronDown, Mail, Building2, ShieldCheck, CalendarDays, UserSquare2, Smartphone, Clock, FileText, DollarSign } from 'lucide-react';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import { PageHeader } from '@/components/shared/PageHeader';
import { toSentenceCase } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';

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
  phone?: string;
  dateOfBirth?: string;
  bio?: string;
  address?: string;
  baseSalary?: string | number;
  leaveBalance?: number;
  manager?: { name: string };
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
  
  const navigate = useNavigate();
  const currentUser = useAuthStore(state => state.user);
  const updateUser = useAuthStore(state => state.updateUser);

  const { register, handleSubmit, reset, watch, setError, clearErrors, formState: { errors, isSubmitting } } = useForm({
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

  const syncCurrentSessionUser = (updatedUser?: Partial<Employee> & { departmentName?: string }) => {
    if (!currentUser || !updatedUser || currentUser.uid !== updatedUser.uid) return;

    updateUser({
      name: updatedUser.name,
      email: updatedUser.email,
      avatar: updatedUser.avatar || undefined,
      deptId: updatedUser.deptId ?? undefined,
      departmentName: updatedUser.departmentName,
      subDepartment: updatedUser.subDepartment || undefined,
      phone: updatedUser.phone || undefined,
      dateOfBirth: updatedUser.dateOfBirth || undefined,
      bio: updatedUser.bio || undefined,
      address: updatedUser.address || undefined
    });
  };

  const onSubmit = async (data: any) => {
    try {
      if (!editingEmployee && !data.password) {
        setError('password', { type: 'manual', message: 'Password is required for new employees' });
        return;
      }
      if (!editingEmployee && !avatarFile) {
        setError('avatar' as any, { type: 'manual', message: 'Employee photo is required' });
        return;
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
        const response = await api.put(`/hr/employees/${editingEmployee.uid}`, payload);
        syncCurrentSessionUser(response.data?.user);
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
      const status = error.response?.status;
      const msg = error.response?.data?.error || error.response?.data?.message || 'Operation failed';
      if (status === 409 && /name/i.test(msg)) {
        setError('name', { type: 'server', message: msg });
      } else if (/email/i.test(msg)) {
        setError('email', { type: 'server', message: msg });
      } else if (/password/i.test(msg)) {
        setError('password', { type: 'server', message: msg });
      } else if (/vacancy/i.test(msg)) {
        setError('vacancyId', { type: 'server', message: msg });
      } else {
        setError('root' as any, { type: 'server', message: msg });
      }
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
    { 
      accessorKey: 'name', 
      header: 'Full name',
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-slate-900 overflow-hidden flex items-center justify-center text-[10px] font-black text-white shrink-0 shadow-lg shadow-slate-900/10">
            {row.original.avatar ? (
              <img src={row.original.avatar} alt="" className="w-full h-full object-cover" />
            ) : (
              row.original.name.charAt(0).toUpperCase()
            )}
          </div>
          <span className="font-bold text-slate-900 tracking-tight">{row.original.name}</span>
        </div>
      )
    },
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
        let color = 'bg-slate-50 text-slate-400 border-slate-100';
        if (status === 'active') color = 'bg-emerald-50 text-emerald-600 border-emerald-100';
        if (status === 'suspended') color = 'bg-rose-50 text-rose-600 border-rose-100';
        return (
          <span className={`px-3 py-1 text-[9px] rounded-full font-black tracking-widest border ${color}`}>
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
            <button
              onClick={(event) => {
                event.stopPropagation();
                openEditModal(emp);
              }}
              className="p-1 hover:bg-slate-100 rounded text-slate-600 transition-colors"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              onClick={(event) => {
                event.stopPropagation();
                handleDelete(emp);
              }}
              className="p-1 hover:bg-red-50 rounded text-red-600 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        );
      }
    }
  ];

  return (
    <div className="p-2 space-y-6 flex flex-col h-[calc(100vh-8rem)]">
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
          onRowClick={(employee) => navigate(`/dashboard/hr/employees/${employee.uid}`)}
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
              <p className="text-xs text-slate-400 font-bold tracking-widest leading-none mb-1">
                Human resources
              </p>
              <h2 className="text-xl font-bold tracking-tight">
                {editingEmployee ? "Edit personnel details" : "Register new employee"}
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
            {(errors as any).root && (
              <div className="p-3 rounded-xl border border-rose-200 bg-rose-50">
                <p className="text-xs font-bold text-rose-700">{(errors as any).root.message}</p>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Identity Group */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 tracking-widest">Full name</label>
                <input
                  {...register('name', { 
                      required: 'Name is required',
                      minLength: { value: 3, message: 'Must be between 3 to 24 characters' },
                      maxLength: { value: 24, message: 'Must be between 3 to 24 characters' }
                  })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl mt-1 focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium text-slate-900"
                  placeholder="John Smith"
                />
                {errors.name && <p className="text-[10px] font-bold text-rose-600 mt-1 tracking-tight">{errors.name.message as string}</p>}
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 tracking-widest">Email address</label>
                <input
                  type="email"
                  {...register('email', { 
                      required: 'Email is required',
                      maxLength: { value: 50, message: 'Must be below 50 characters' }
                  })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl mt-1 focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium text-slate-900"
                  placeholder="j.smith@erp.com"
                />
                {errors.email && <p className="text-[10px] font-bold text-rose-600 mt-1 tracking-tight">{errors.email.message as string}</p>}
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 tracking-widest">
                  Password {editingEmployee && <span className="text-slate-400 font-normal normal-case ">(Leave blank to keep current)</span>}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    {...register('password', { 
                        required: !editingEmployee ? 'Password is required for new hires' : false,
                        minLength: { value: 6, message: 'Must be between 6 to 20 characters' },
                        maxLength: { value: 20, message: 'Must be between 6 to 20 characters' }
                    })}
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
                {errors.password && <p className="text-[10px] font-bold text-rose-600 mt-1 tracking-tight">{errors.password.message as string}</p>}
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 tracking-widest">Employee photo</label>
                <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-slate-50 p-2 min-h-[52px]">
                  <div className="w-9 h-9 rounded-lg overflow-hidden bg-slate-200 flex items-center justify-center text-slate-500 font-black text-xs shrink-0">
                    {avatarPreview ? (
                      <img src={avatarPreview} alt="" className="w-full h-full object-cover" />
                    ) : (
                      (watch('name') || editingEmployee?.name || 'U').charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="flex-1 space-y-0.5 mt-0.5">
                    <input
                      id="employee-photo-upload"
                      type="file"
                      accept="image/*"
                      onChange={(event) => {
                        const file = event.target.files?.[0] || null;
                        if (file && file.size > 5 * 1024 * 1024) {
                            (event.target as any).value = null;
                            setError('avatar' as any, { type: 'manual', message: 'Employee photo must be below 5mb' });
                            setAvatarFile(null);
                            setAvatarPreview(editingEmployee?.avatar || '');
                            return;
                        }
                        clearErrors('avatar' as any);
                        setAvatarFile(file);
                        setAvatarPreview(file ? URL.createObjectURL(file) : (editingEmployee?.avatar || ''));
                      }}
                      className="hidden"
                    />
                    <label 
                      htmlFor="employee-photo-upload"
                      className="flex items-center gap-2 cursor-pointer w-fit mb-1"
                    >
                      <span className="block rounded-md bg-slate-900 px-2 py-1 text-[9px] font-black tracking-widest text-white hover:bg-slate-800 transition-colors shadow-sm">
                        Choose file
                      </span>
                      <span className="text-xs text-slate-600 font-medium truncate max-w-[140px]">
                        {avatarFile ? avatarFile.name : (editingEmployee?.avatar ? 'Existing photo' : 'No file chosen')}
                      </span>
                    </label>
                    <div className="flex items-center justify-between pr-2">
                      <p className="text-[8px] font-bold tracking-widest text-slate-400 mt-1">PNG/JPG/WebP &lt; 5MB</p>
                      {(errors as any).avatar && <p className="text-[8px] font-bold text-rose-600 tracking-tight mt-1">{(errors as any).avatar.message}</p>}
                    </div>
                  </div>
                </div>
              </div>

              <div className="col-span-1 md:col-span-2 h-px bg-slate-100 my-2" />

              {/* Role Group */}
              {!editingEmployee && (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 tracking-widest">Select vacancy (required)</label>
                  <div className="relative group">
                  <select
                    {...register('vacancyId', { required: 'Vacancy is required for new hires' })}
                    className="w-full min-h-[52px] px-4 pr-10 py-3 appearance-none bg-slate-50 border border-slate-200 rounded-xl mt-1 focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium cursor-pointer hover:bg-white text-slate-900"
                  >
                    <option value="">-- Select Open Vacancy --</option>
                    {vacancies.filter(v => v.status === 'OPEN').map((v) => (
                      <option key={v.id} value={v.id}>{v.title}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none mt-0.5" />
                  </div>
                  {errors.vacancyId && <p className="text-[10px] font-bold text-rose-600 mt-1 tracking-tight">{errors.vacancyId.message as string}</p>}
                </div>
              )}

              <div className={`space-y-2 ${editingEmployee ? 'col-span-1 md:col-span-2' : ''}`}>
                <label className="text-xs font-bold text-slate-500 tracking-widest">Reporting manager</label>
                <div className="relative group mt-1">
                <select
                  {...register('reportingManagerUid', { required: 'Reporting manager is required' })}
                  className="w-full min-h-[52px] px-4 pr-10 py-3 appearance-none bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium cursor-pointer hover:bg-white text-slate-900"
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
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
                {errors.reportingManagerUid && <p className="text-[10px] font-bold text-rose-600 mt-1 tracking-tight">{errors.reportingManagerUid.message as string}</p>}
              </div>

              {!editingEmployee && selectedVacancy && (
                <div className="col-span-1 md:col-span-2 rounded-2xl border border-blue-100 bg-blue-50/60 p-4 w-full">
                  <p className="text-[10px] font-black tracking-widest text-blue-500">Vacancy scope</p>
                  <p className="mt-2 text-sm font-bold text-slate-900">
                    {selectedVacancy.title}
                  </p>
                  <p className="mt-1 text-xs text-slate-600">
                    Department assignment is inherited from the selected vacancy{selectedVacancy.subDepartment && selectedVacancy.subDepartment !== 'General' ? ` (${selectedVacancy.subDepartment})` : ''}, and all new registrations are created as `Employee`.
                  </p>
                </div>
              )}

            </div>
          </div>

          <div className="flex justify-end gap-3 p-8 bg-slate-50 border-t border-slate-200 shrink-0">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-8 py-3.5 bg-white text-slate-600 font-bold text-xs tracking-widest rounded-2xl border border-slate-200 hover:bg-slate-50 hover:scale-105 active:scale-95 transition-all shadow-sm"
            >
              Discard
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-8 py-3.5 bg-slate-900 text-white font-bold text-xs tracking-widest rounded-2xl shadow-xl shadow-slate-900/10 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:scale-100"
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
            <h3 className="text-xl font-black text-slate-900 mb-2 tracking-tight">Confirm</h3>
            <p className="text-slate-500 font-medium px-4 text-sm leading-relaxed">
              Are you sure you want to eliminate the personnel record for <span className="text-rose-600 font-bold">{employeeToDelete?.name}</span>? This action is permanent and will be logged in the audit trail.
            </p>
          </div>
          <div className="flex gap-4 pt-4">
            <button 
              onClick={() => setEmployeeToDelete(null)}
              className="flex-1 px-6 py-3 bg-white border border-slate-200 text-slate-600 font-black text-[10px] tracking-widest rounded-xl hover:bg-slate-50 transition-all active:scale-95 shadow-sm"
            >
              Cancel
            </button>
            <button 
              onClick={confirmDelete}
              className="flex-1 px-6 py-3 bg-rose-600 text-white font-black text-[10px] tracking-widest rounded-xl shadow-lg shadow-rose-600/20 hover:bg-rose-700 transition-all active:scale-95"
            >
              Confirm
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
