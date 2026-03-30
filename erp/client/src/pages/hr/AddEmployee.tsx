import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import { 
  UserPlus, 
  Mail, 
  Lock, 
  User, 
  Building2, 
  ShieldCheck, 
  Zap,
  ArrowRight,
  ShieldAlert
} from 'lucide-react';

interface Department {
  id: number;
  name: string;
}

export default function AddEmployee() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { register, handleSubmit, reset, watch, setValue, formState: { errors, isSubmitting } } = useForm();

  const watchedName = watch('name');
  const watchedDeptId = watch('departmentId');
  const [suggestedEmail, setSuggestedEmail] = useState('');

  useEffect(() => {
    if (watchedName && watchedDeptId) {
      const dept = departments.find(d => d.id.toString() === watchedDeptId.toString());
      if (dept) {
        const namePart = watchedName.trim().toLowerCase().replace(/\s+/g, '.');
        setSuggestedEmail(`${namePart}@erp.com`);
      }
    } else {
      setSuggestedEmail('');
    }
  }, [watchedName, watchedDeptId, departments]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [deptRes, roleRes] = await Promise.all([
          api.get('/departments'),
          api.get('/org-admin/roles')
        ]);
        setDepartments(deptRes.data);
        setRoles(roleRes.data);
      } catch (error) {
        toast.error('Failed to load institutional configuration');
      }
    };
    fetchData();
  }, []);

  const onSubmit = async (data: any) => {
    try {
      setIsLoading(true);
      await api.post('/hr/employees/onboard', data);
      toast.success('Registration Forwarded: Awaiting Department Sanctuary');
      reset();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Onboarding failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Premium Header */}
      <div className="bg-slate-900 rounded-[2.5rem] p-10 text-white relative overflow-hidden shadow-2xl shadow-slate-900/20">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center border border-blue-500/20">
                <UserPlus className="w-5 h-5 text-blue-400" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-300">Personnel Recruitment</span>
            </div>
            <h1 className="text-4xl font-black tracking-tight mb-2">Register <span className="text-blue-400 italic">Institutional</span> Staff</h1>
            <p className="text-slate-400 font-medium text-sm max-w-md">
              Initiate workforce expansion by registering personnel. Onboarding for non-HR departments requires jurisdictional sanctioning.
            </p>
          </div>
          <div className="flex items-center gap-4 bg-white/5 p-4 rounded-3xl border border-white/10 backdrop-blur-sm">
            <div className="text-right">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">System Status</p>
              <p className="text-xs font-black text-emerald-400">Governance Active</p>
            </div>
            <Zap className="w-6 h-6 text-amber-400 fill-amber-400" />
          </div>
        </div>
        
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 rounded-full blur-[80px] -mr-32 -mt-32" />
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white p-8 md:p-12 rounded-[2.5rem] border border-slate-200 shadow-xl shadow-slate-200/50">
        {/* Left Column: Basic Info */}
        <div className="space-y-6">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-2">
            <User className="w-4 h-4" />
            Basic Identity
          </h3>
          
          <div className="space-y-1">
            <label className="text-[11px] font-black text-slate-500 uppercase ml-1">Full Legal Name</label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none group-focus-within:text-blue-500 transition-colors">
                <User className="w-4 h-4" />
              </div>
              <input
                {...register('name', { required: 'Full name is required' })}
                className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm font-medium"
                placeholder="Alexander Pierce"
              />
            </div>
            {errors.name && <p className="text-rose-500 text-[10px] font-bold mt-1 ml-1">{errors.name.message as string}</p>}
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-black text-slate-500 uppercase ml-1">Institutional Email</label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none group-focus-within:text-blue-500 transition-colors">
                <Mail className="w-4 h-4" />
              </div>
              <input
                type="email"
                {...register('email', { 
                  required: 'Email is required',
                  validate: (v) => v.toLowerCase() !== 'admin@erp.com' || 'This institutional email (admin@erp.com) is already reserved'
                })}
                className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm font-medium"
                placeholder="staff@erp.com"
              />
              {suggestedEmail && (
                <button
                  type="button"
                  onClick={() => setValue('email', suggestedEmail)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 bg-blue-50 text-blue-600 px-3 py-1 rounded-lg text-[10px] font-black uppercase hover:bg-blue-600 hover:text-white transition-all border border-blue-100 shadow-sm animate-in fade-in slide-in-from-right-2"
                >
                  Suggest: {suggestedEmail}
                </button>
              )}
            </div>
            {errors.email && <p className="text-rose-500 text-[10px] font-bold mt-1 ml-1">{errors.email.message as string}</p>}
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-black text-slate-500 uppercase ml-1">Secure Passcode</label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none group-focus-within:text-blue-500 transition-colors">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type="password"
                {...register('password', { required: 'Passcode is required', minLength: { value: 6, message: 'Minimum 6 characters' } })}
                className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm font-medium"
                placeholder="••••••••"
              />
            </div>
            {errors.password && <p className="text-rose-500 text-[10px] font-bold mt-1 ml-1">{errors.password.message as string}</p>}
          </div>
        </div>

        {/* Right Column: Organizational Assignment */}
        <div className="space-y-6">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-2">
            <Building2 className="w-4 h-4" />
            Institutional Placement
          </h3>

          <div className="space-y-1">
            <label className="text-[11px] font-black text-slate-500 uppercase ml-1">Department Scope</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 transition-colors">
                <Building2 className="w-4 h-4" />
              </div>
              <select
                {...register('departmentId', { required: 'Department is required' })}
                className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm font-medium appearance-none"
              >
                <option value="">-- Targeted Department --</option>
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.id}>{dept.name}</option>
                ))}
              </select>
            </div>
            {errors.departmentId && <p className="text-rose-500 text-[10px] font-bold mt-1 ml-1">{errors.departmentId.message as string}</p>}
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-black text-slate-500 uppercase ml-1">Sub-Department Alignment</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 transition-colors">
                <Zap className="w-4 h-4" />
              </div>
              <select
                {...register('subDepartment')}
                className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm font-medium appearance-none"
              >
                <option value="">-- No Sub-Dept (Universal) --</option>
                <option value="OpenSchool">OpenSchool</option>
                <option value="Online">Online</option>
                <option value="Skill">Skill</option>
                <option value="BVoc">BVoc</option>
              </select>
            </div>
          </div>


          <div className="space-y-1">
            <label className="text-[11px] font-black text-slate-500 uppercase ml-1">Ecclesiastical Role</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 transition-colors">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <select
                {...register('role')}
                className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm font-medium appearance-none"
              >
                {roles.length > 0 ? (
                  roles.map(r => (
                    <option key={r.id} value={r.name}>{r.name}</option>
                  ))
                ) : (
                  <>
                    <option value="employee">Standard Employee</option>
                    <option value="dept-admin">Department Administrator</option>
                    <option value="academic">Academic Auditor</option>
                    <option value="sales">Sales Executive</option>
                  </>
                )}
              </select>
            </div>
          </div>
        </div>

        {/* Global Action Section */}
        <div className="md:col-span-2 pt-6 mt-6 border-t border-slate-100">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3 p-4 bg-amber-50 rounded-2xl border border-amber-100 max-w-lg">
              <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0" />
              <p className="text-[11px] text-amber-800 font-medium leading-relaxed">
                By clicking register, the personnel record will be created in <span className="font-black underline">Pending Sanctuary</span> mode. The targeted department admin must sanction this enrollment before the account becomes active.
              </p>
            </div>
            <button
              type="submit"
              disabled={isSubmitting || isLoading}
              className="w-full md:w-auto px-10 py-4 bg-slate-900 text-white rounded-2xl font-black text-sm hover:bg-blue-600 transition-all active:scale-95 group flex items-center justify-center gap-3 shadow-xl shadow-slate-900/10 disabled:opacity-50"
            >
              {isSubmitting ? 'Finalizing Registry...' : (
                <>
                   Sanction Registration
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
