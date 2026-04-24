import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { Modal } from '@/components/shared/Modal';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Users, 
  X, 
  Eye, 
  EyeOff, 
  ChevronDown, 
  Mail, 
  Building2, 
  ShieldCheck, 
  CalendarDays, 
  UserSquare2, 
  Smartphone, 
  Clock, 
  FileText, 
  DollarSign,
  ArrowLeft,
  Printer,
  Share2,
  MapPin,
  Globe,
  Camera
} from 'lucide-react';
import toast from 'react-hot-toast';
import { toSentenceCase } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import { PageHeader } from '@/components/shared/PageHeader';

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
  websiteUrl?: string;
}

export default function EmployeeDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [allEmployees, setAllEmployees] = useState<Employee[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'details' | 'institutional'>('overview');
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const currentUser = useAuthStore(state => state.user);
  const updateUser = useAuthStore(state => state.updateUser);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm();

  const fetchEmployee = async () => {
    try {
      setIsLoading(true);
      const res = await api.get(`/hr/employees/${id}`);
      setEmployee(res.data);
    } catch (error) {
      toast.error('Failed to retrieve personnel record');
      navigate('/dashboard/hr/employees');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchEmployee();
      fetchAllEmployees();
    }
  }, [id]);

  const fetchAllEmployees = async () => {
    try {
      const res = await api.get('/hr/employees');
      setAllEmployees(res.data);
    } catch (error) {
      console.error('Failed to fetch personnel directory', error);
    }
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

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file size (< 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB');
      return;
    }

    try {
      setIsUploadingAvatar(true);
      const formData = new FormData();
      formData.append('avatar', file);

      const response = await api.put(`/hr/employees/${id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      syncCurrentSessionUser(response.data?.user);
      toast.success('Institutional photo synchronized');
      fetchEmployee();
    } catch (error: any) {
      console.error('AVATAR_UPLOAD_ERROR:', error);
      toast.error(error.response?.data?.message || 'Photo synchronization failed');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const onEditSubmit = async (data: any) => {
    try {
      const response = await api.put(`/hr/employees/${id}`, data);
      syncCurrentSessionUser(response.data?.user);
      toast.success('Personnel record updated successfully');
      setIsEditModalOpen(false);
      fetchEmployee();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Update failed');
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <div className="w-12 h-12 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin" />
        <p className="text-xs font-black tracking-widest text-slate-400">Synchronizing personnel ledger...</p>
      </div>
    );
  }

  if (!employee) return null;

  return (
    <>
      <div className="p-2 space-y-6 max-w-7xl mx-auto">
      <PageHeader 
        title="Personnel details"
        description="Identity Verification & Institutional Lifecycle Management"
        icon={UserSquare2}
        action={
          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigate('/dashboard/hr/employees')}
              className="flex items-center gap-2 px-6 py-2.5 bg-slate-900 text-white rounded-xl border border-slate-800 font-bold text-sm hover:bg-slate-800 transition-all group"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              Back to Directory
            </button>
            <div className="flex items-center gap-3">
              <button className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 transition-all border border-slate-200">
                <Printer className="w-5 h-5" />
              </button>
              <button className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 transition-all border border-slate-200">
                <Share2 className="w-5 h-5" />
              </button>
            </div>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Main Content Area */}
        <div className="lg:col-span-8 space-y-8">

          {/* Main Identity Card */}
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-xl shadow-slate-200/50">
            <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
              <div className="relative group">
                <input 
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                  accept="image/*"
                />
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingAvatar}
                  className="relative h-32 w-32 md:h-40 md:w-40 flex items-center justify-center overflow-hidden rounded-[2rem] border border-slate-100 bg-slate-50 text-4xl font-black shadow-inner transition-all duration-500 hover:scale-[1.02] group/avatar disabled:opacity-50"
                  title="Change Personnel Photo"
                >
                  {employee.avatar ? (
                    <img src={employee.avatar} alt={employee.name} className="h-full w-full object-cover transition-opacity duration-300 group-hover/avatar:opacity-40" />
                  ) : (
                    <span className="text-slate-200 transition-opacity duration-300 group-hover/avatar:opacity-40">
                      {employee.name.charAt(0).toUpperCase()}
                    </span>
                  )}

                  {/* Hover Overlay */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-opacity duration-300">
                    <div className="w-10 h-10 rounded-full bg-slate-900/10 backdrop-blur-md flex items-center justify-center mb-1">
                      {isUploadingAvatar ? (
                        <div className="w-5 h-5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Camera className="w-5 h-5 text-slate-900" />
                      )}
                    </div>
                    <span className="text-[10px] font-black tracking-widest text-slate-900">Change</span>
                  </div>
                </button>
                <div className={`absolute -bottom-1 -right-1 h-6 w-6 rounded-full border-4 border-white ${
                  employee.status === 'active' ? 'bg-emerald-500' : 'bg-rose-500'
                } shadow-lg z-10`} />
              </div>

              <div className="flex-1 text-center md:text-left">
                <h2 className="text-4xl font-black text-slate-900 tracking-tighter mb-4">{employee.name}</h2>
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mb-8 text-[10px] font-black tracking-[0.1em]">
                  <span className="px-3 py-1 bg-slate-50 text-slate-600 rounded-lg border border-slate-100 flex items-center gap-2">
                    <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
                    {employee.role || 'Personnel'}
                  </span>
                  {(() => {
                    const s = employee.status?.toLowerCase();
                    const config = {
                      active: { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-100', dot: 'bg-emerald-500' },
                      inactive: { bg: 'bg-rose-50', text: 'text-rose-600', border: 'border-rose-100', dot: 'bg-rose-500' },
                      suspended: { bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-100', dot: 'bg-slate-500' }
                    }[s] || { bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-100', dot: 'bg-slate-500' };

                    return (
                      <span className={`px-3 py-1 ${config.bg} ${config.text} rounded-lg border ${config.border} flex items-center gap-1.5`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${config.dot} animate-pulse`} />
                        {employee.status?.toUpperCase() || 'STAGED'}
                      </span>
                    );
                  })()}
                </div>

                <div className="flex flex-wrap justify-center md:justify-start gap-3">
                  <button 
                    onClick={() => {
                      reset({
                        name: employee.name,
                        email: employee.email,
                        phone: employee.phone,
                        dateOfBirth: employee.dateOfBirth,
                        bio: employee.bio,
                        address: employee.address,
                        baseSalary: employee.baseSalary,
                        leaveBalance: employee.leaveBalance,
                        status: employee.status,
                        reportingManagerUid: employee.reportingManagerUid,
                        websiteUrl: employee.websiteUrl
                      });
                      setIsEditModalOpen(true);
                    }}
                    className="flex items-center gap-2 px-8 py-3 bg-blue-600 text-white rounded-2xl font-black text-xs tracking-widest shadow-xl shadow-blue-900/20 hover:bg-blue-700 transition-all active:scale-95 group"
                  >
                    <Edit2 className="w-4 h-4" />
                    Edit Profile
                  </button>
                  <button className="flex items-center gap-2 px-8 py-3 bg-white text-blue-600 rounded-2xl font-black text-xs tracking-widest border border-blue-600 hover:bg-blue-50 transition-all">
                    Generate ID Card
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden">
            <div className="flex border-b border-slate-100 px-4">
              {[
                { id: 'overview', label: 'Overview', icon: Building2 },
                { id: 'details', label: 'Profile Details', icon: Mail },
                { id: 'institutional', label: 'Institutional', icon: ShieldCheck }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 px-6 py-6 text-[10px] font-black tracking-widest transition-all relative ${
                    activeTab === tab.id ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                  {activeTab === tab.id && (
                    <div className="absolute bottom-0 left-6 right-6 h-1 bg-blue-600 rounded-t-full shadow-lg shadow-blue-900/20" />
                  )}
                </button>
              ))}
            </div>

            <div className="p-10">

        {/* Content Section */}
        <div className="animate-in fade-in slide-in-from-bottom-6 duration-700">
            {activeTab === 'overview' && (
              <div className="grid gap-8 md:grid-cols-2">
                <div className="group rounded-[2.5rem] border border-slate-200 bg-white p-8 shadow-sm hover:shadow-xl hover:shadow-slate-200/40 transition-all duration-500">
                  <div className="flex items-center gap-4 mb-8">
                    <div className="p-3 bg-blue-50 rounded-2xl text-blue-600 group-hover:scale-110 transition-transform">
                      <UserSquare2 className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-[11px] font-black tracking-[0.2em] text-slate-400">Primary identity</p>
                        <h4 className="font-bold text-slate-900">Personnel Fundamentals</h4>
                    </div>
                  </div>
                  <div className="space-y-8">
                    <div className="flex items-start gap-5">
                      <div className="bg-slate-50 p-3 rounded-xl text-slate-400">
                        <Mail className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <p className="text-[11px] font-bold tracking-widest text-slate-400 mb-1">Corporate relay</p>
                        <p className="text-base font-black text-slate-800 break-all">{employee.email}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="group rounded-[2.5rem] border border-slate-200 bg-white p-8 shadow-sm hover:shadow-xl hover:shadow-slate-200/40 transition-all duration-500">
                  <div className="flex items-center gap-4 mb-8">
                    <div className="p-3 bg-indigo-50 rounded-2xl text-indigo-600 group-hover:scale-110 transition-transform">
                      <Clock className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-[11px] font-black tracking-[0.2em] text-slate-400">Temporal data</p>
                        <h4 className="font-bold text-slate-900">Lifecycle Tracking</h4>
                    </div>
                  </div>
                  <div className="space-y-8">
                    <div className="flex items-start gap-5">
                      <div className="bg-slate-50 p-3 rounded-xl text-slate-400">
                        <CalendarDays className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <p className="text-[11px] font-bold tracking-widest text-slate-400 mb-1">Enlistment date</p>
                        <p className="text-base font-black text-slate-800">
                          {employee.createdAt ? new Date(employee.createdAt).toLocaleDateString('en-US', { day: '2-digit', month: 'long', year: 'numeric' }) : 'Pending Synchronization'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-5">
                      <div className="bg-slate-50 p-3 rounded-xl text-slate-400">
                        <UserSquare2 className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <p className="text-[11px] font-bold tracking-widest text-slate-400 mb-1">Identity node UID</p>
                        <p className="text-base font-bold text-slate-500 font-mono tracking-tight cursor-copy hover:text-blue-600 transition-colors"
                           onClick={() => {
                             navigator.clipboard.writeText(employee.uid);
                             toast.success('UID copied to tactical clip');
                           }}
                        >{employee.uid}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'details' && (
              <div className="space-y-8">
                <div className="rounded-[3rem] border border-slate-200 bg-white p-10 shadow-sm">
                  <div className="flex items-center gap-5 mb-10">
                    <div className="w-14 h-14 bg-slate-950 rounded-[1.25rem] flex items-center justify-center text-white shadow-2xl shadow-slate-900/20">
                      <FileText className="w-7 h-7" />
                    </div>
                    <div>
                      <h4 className="text-xl font-black text-slate-900 tracking-tight">Personal portfolio</h4>
                      <p className="text-[11px] font-bold text-slate-400 tracking-[0.2em]">Metadata & identity context</p>
                    </div>
                  </div>

                  <div className="grid gap-12 md:grid-cols-2">
                    <div className="space-y-2">
                      <p className="text-[11px] font-black tracking-widest text-slate-400 ml-1">Biological date of birth</p>
                      <p className="text-base font-bold text-slate-800 bg-slate-50 p-5 rounded-2xl border border-slate-100">
                        {employee.dateOfBirth ? (
                          employee.dateOfBirth
                        ) : (
                          <button onClick={() => setIsEditModalOpen(true)} className="text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors">
                            Set date of birth...
                          </button>
                        )}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-[11px] font-black tracking-widest text-slate-400 ml-1">Logistics hub (address)</p>
                      <p className="text-base font-bold text-slate-800 bg-slate-50 p-5 rounded-2xl border border-slate-100">
                        {employee.address ? (
                          employee.address
                        ) : (
                          <button onClick={() => setIsEditModalOpen(true)} className="text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors">
                            Registry address missing - Add now
                          </button>
                        )}
                      </p>
                    </div>
                    <div className="md:col-span-2 space-y-2">
                      <p className="text-[11px] font-black tracking-widest text-slate-400 ml-1">Professional byte (bio)</p>
                      <div className="text-base font-medium text-slate-600 leading-[1.8] bg-slate-50 p-8 rounded-[2rem] border border-slate-100 italic">
                        {employee.bio ? (
                          `"${employee.bio}"`
                        ) : (
                          <button onClick={() => setIsEditModalOpen(true)} className="text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors not-italic">
                            Click to add professional byte...
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'institutional' && (
              <div className="space-y-8">
                <div className="rounded-[3rem] border border-slate-200 bg-white p-10 shadow-sm">
                  <div className="flex items-center gap-4 mb-10">
                    <div className="p-3.5 bg-emerald-50 rounded-2xl text-emerald-600">
                      <Building2 className="w-7 h-7" />
                    </div>
                    <div>
                        <p className="text-[11px] font-black tracking-[0.2em] text-slate-400">Organizational grid</p>
                        <h4 className="text-xl font-black text-slate-900 tracking-tight">Structural hierarchy</h4>
                    </div>
                  </div>
                  
                  <div className="grid gap-8 md:grid-cols-2">
                    <div className="p-6 bg-slate-50 rounded-[1.75rem] border border-slate-100">
                      <p className="text-[11px] font-bold tracking-widest text-slate-400 mb-2">Primary department</p>
                      <p className="text-lg font-black text-slate-800">{employee.department?.name || 'Central Command'}</p>
                    </div>
                    <div className="p-6 bg-slate-50 rounded-[1.75rem] border border-slate-100">
                      <p className="text-[11px] font-bold tracking-widest text-slate-400 mb-2">Vertical sub-unit</p>
                      <p className="text-lg font-black text-slate-800">
                        {employee.subDepartment && employee.subDepartment.toLowerCase() !== 'general' 
                          ? toSentenceCase(employee.subDepartment) 
                          : 'Nil'}
                      </p>
                    </div>
                    <div className="md:col-span-2 p-6 bg-blue-600/5 rounded-[1.75rem] border border-blue-600/10 flex items-center justify-between">
                      <div>
                        <p className="text-[11px] font-bold tracking-widest text-blue-500 mb-2">Reporting authority</p>
                        <p className="text-lg font-black text-slate-900">{employee.manager?.name || 'No Direct Oversight'}</p>
                        <p className="text-[10px] font-medium text-slate-400 mt-1 tracking-widest">Chain of command verified</p>
                      </div>
                      <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-xl shadow-slate-200/50">
                        <ShieldCheck className="w-7 h-7 text-blue-600" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            </div>
          </div>
        </div>
      </div>

      {/* Sidebar Info Area */}
        <div className="lg:col-span-4 space-y-8">
          {/* Quick Contacts */}
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-xl shadow-slate-200/50">
            <h3 className="text-[10px] font-black text-slate-400 tracking-[0.2em] mb-8">Primary contacts</h3>
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center shrink-0 border border-slate-100">
                  <Mail className="w-5 h-5 text-slate-400" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-500 mb-1">Corporate pipeline</p>
                  {employee.email ? (
                    <p className="text-sm font-bold text-slate-900 break-all">{employee.email}</p>
                  ) : (
                    <button onClick={() => setIsEditModalOpen(true)} className="text-xs font-bold text-blue-600 hover:underline decoration-2">Set corporate email</button>
                  )}
                </div>
              </div>
              
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center shrink-0 border border-slate-100">
                  <Smartphone className="w-5 h-5 text-slate-400" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-500 mb-1">Voice protocol</p>
                  {employee.phone ? (
                    <p className="text-sm font-bold text-slate-900">{employee.phone}</p>
                  ) : (
                    <button onClick={() => setIsEditModalOpen(true)} className="text-xs font-bold text-blue-600 hover:underline decoration-2">Add phone relay</button>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center shrink-0 border border-slate-100">
                  <Globe className="w-5 h-5 text-slate-400" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-500 mb-1">Institutional portfolio</p>
                  {employee.websiteUrl ? (
                    <a href={employee.websiteUrl} target="_blank" className="text-sm font-bold text-blue-600 flex items-center gap-1.5 hover:underline decoration-2">
                       {employee.websiteUrl?.replace('https://', '').replace('http://', '')}
                       <Share2 className="w-3 h-3" />
                    </a>
                  ) : (
                    <button onClick={() => setIsEditModalOpen(true)} className="text-xs font-bold text-blue-600 hover:underline decoration-2">Register portfolio URL</button>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-4 pt-6 border-t border-slate-100">
                <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center shrink-0 border border-slate-100">
                  <MapPin className="w-5 h-5 text-slate-400" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-500 mb-1">Geographic origin</p>
                  {employee.address ? (
                    <p className="text-xs font-medium text-slate-600 leading-normal">{employee.address}</p>
                  ) : (
                    <button onClick={() => setIsEditModalOpen(true)} className="text-xs font-bold text-blue-600 hover:underline decoration-2">Pin registry address</button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Personnel Stats */}
          <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white shadow-2xl shadow-slate-900/30">
            <h3 className="text-[10px] font-black text-slate-400 tracking-[0.2em] mb-8">Academics & population</h3>
            <div className="grid grid-cols-1 gap-4">
              <div className="p-6 bg-white/5 rounded-3xl border border-white/5 backdrop-blur-sm">
                <p className="text-[10px] font-black text-indigo-400 tracking-widest mb-2">Base salary</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-black">₹{employee.baseSalary ? parseFloat(employee.baseSalary as string).toLocaleString() : '0'}</span>
                  <span className="text-[10px] font-bold text-slate-500">/mo</span>
                </div>
              </div>
              <div className="p-6 bg-white/5 rounded-3xl border border-white/5 backdrop-blur-sm">
                <p className="text-[10px] font-black text-emerald-400 tracking-widest mb-2">Leave balance</p>
                <p className="text-3xl font-black">{employee.leaveBalance || 0}</p>
                <p className="text-[10px] font-bold text-slate-500 mt-1">Available days</p>
              </div>
            </div>
          </div>
	  </div>
	</div>
      </div>

	    <Modal 
	      isOpen={isEditModalOpen} 
      onClose={() => setIsEditModalOpen(false)} 
      title="Modify personnel record"
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit(onEditSubmit)} className="p-8 space-y-8 bg-white">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Section: Identity */}
          <div className="md:col-span-2">
            <h3 className="text-[10px] font-black tracking-[0.3em] text-blue-500 mb-6 flex items-center gap-3">
              Institutional identity
              <span className="h-px flex-1 bg-blue-100" />
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black tracking-widest text-slate-400 ml-1">Full identity name</label>
                <input 
                  {...register('name', { required: true })}
                  className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-bold text-slate-900"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black tracking-widest text-slate-400 ml-1">Corporate email address</label>
                <input 
                  {...register('email', { required: true })}
                  className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-bold text-slate-900"
                />
              </div>
            </div>
          </div>

          {/* Section: Contact & Personal */}
          <div className="md:col-span-2">
            <h3 className="text-[10px] font-black tracking-[0.3em] text-slate-400 mb-6 flex items-center gap-3">
              Communication & Lifecycle
              <span className="h-px flex-1 bg-slate-100" />
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black tracking-widest text-slate-400 ml-1">Contact relay (phone)</label>
                <input 
                  {...register('phone')}
                  placeholder="+x xxxx xxxx"
                  className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-bold text-slate-900"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black tracking-widest text-slate-400 ml-1">Biological date of birth</label>
                <input 
                  type="date"
                  {...register('dateOfBirth')}
                  className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-bold text-slate-900"
                />
              </div>
              <div className="md:col-span-2 space-y-2">
                <label className="text-[10px] font-black tracking-widest text-slate-400 ml-1">Institutional portfolio (website/URL)</label>
                <input 
                  {...register('websiteUrl')}
                  placeholder="https://linkedin.com/in/..."
                  className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-bold text-slate-900"
                />
              </div>
              <div className="md:col-span-2 space-y-2">
                <label className="text-[10px] font-black tracking-widest text-slate-400 ml-1">Logistics hub (address)</label>
                <input 
                  {...register('address')}
                  className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-bold text-slate-900"
                />
              </div>
              <div className="md:col-span-2 space-y-2">
                <label className="text-[10px] font-black tracking-widest text-slate-400 ml-1">Professional portfolio (bio)</label>
                <textarea 
                  {...register('bio')}
                  rows={3}
                  className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-medium text-slate-600 leading-relaxed"
                />
              </div>
            </div>
          </div>

          {/* Section: Operational Data */}
          <div className="md:col-span-2">
            <h3 className="text-[10px] font-black tracking-[0.3em] text-emerald-500 mb-6 flex items-center gap-3">
              Operational & Financial Protocols
              <span className="h-px flex-1 bg-emerald-50" />
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black tracking-widest text-slate-400 ml-1">Base monthly salary (₹)</label>
                <input 
                  type="number"
                  {...register('baseSalary')}
                  className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all font-black text-slate-900"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black tracking-widest text-slate-400 ml-1">Leave balance cap</label>
                <input 
                  type="number"
                  {...register('leaveBalance')}
                  className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all font-black text-slate-900"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black tracking-widest text-slate-400 ml-1">Operational status</label>
                <select 
                  {...register('status')}
                  className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-bold text-slate-900 appearance-none"
                >
                  <option value="active">Active Duty</option>
                  <option value="inactive">Inactive</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>
              <div className="space-y-2 text-white">
                <label className="text-[10px] font-black tracking-widest text-slate-400 ml-1 text-slate-400">Chain of command (manager)</label>
                <select 
                  {...register('reportingManagerUid')}
                  className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-bold text-slate-900 appearance-none"
                >
                  <option value="">No Direct Oversight</option>
                  {allEmployees.map(e => (
                    <option key={e.uid} value={e.uid}>{e.name} ({e.uid})</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-4 pt-6 border-t border-slate-100">
          <button 
            type="button"
            onClick={() => setIsEditModalOpen(false)}
            className="px-8 py-3.5 bg-white border border-slate-200 rounded-2xl text-slate-600 font-bold text-xs tracking-widest hover:bg-slate-50 transition-all active:scale-95"
          >
            Discard
          </button>
          <button 
            type="submit"
            disabled={isSubmitting}
            className="px-10 py-3.5 bg-slate-900 text-white rounded-2xl font-black text-xs tracking-widest shadow-xl shadow-slate-900/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
          >
            {isSubmitting ? 'Syncing...' : 'Update Record'}
          </button>
        </div>
      </form>
    </Modal>
    </>
  );
}
