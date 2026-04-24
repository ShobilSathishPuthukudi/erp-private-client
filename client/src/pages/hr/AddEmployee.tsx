import { useState, useEffect, useMemo } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
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
  Sparkles,
  ArrowRight,
  ShieldAlert,
  Eye,
  EyeOff,
  Hash,
  CheckCircle2,
  Briefcase,
  AtSign,
} from 'lucide-react';

interface Department {
  id: number;
  name: string;
  type?: string;
}

export default function AddEmployee() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { register, handleSubmit, reset, watch, setValue, setError, formState: { errors, isSubmitting } } = useForm();

  const watchedName = watch('name');
  const watchedEmail = watch('email');
  const watchedDeptId = watch('departmentId');
  const watchedSubDept = watch('subDepartment');
  const watchedRole = watch('role');
  const watchedPassword = watch('password');
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
        setRoles(roleRes.data.filter((role: any) => role.name === 'Employee'));
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
      toast.success('Registration forwarded · Awaiting department sanction');
      reset();
    } catch (error: any) {
      const status = error.response?.status;
      const msg = error.response?.data?.message || error.response?.data?.error || 'Onboarding failed';
      if (status === 409 && /name/i.test(msg)) {
        setError('name', { type: 'server', message: msg });
      } else if (/email/i.test(msg)) {
        setError('email', { type: 'server', message: msg });
      } else if (/department/i.test(msg)) {
        setError('departmentId', { type: 'server', message: msg });
      } else {
        setError('root' as any, { type: 'server', message: msg });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const initials = useMemo(() => {
    if (!watchedName) return '—';
    const parts = watchedName.trim().split(/\s+/);
    return parts.slice(0, 2).map((p: string) => p[0]?.toUpperCase() || '').join('');
  }, [watchedName]);

  const selectedDept = useMemo(
    () => departments.find(d => d.id.toString() === String(watchedDeptId ?? '')),
    [departments, watchedDeptId]
  );

  const completion = useMemo(() => {
    const required = [watchedName, watchedEmail, watchedPassword, watchedDeptId, watchedRole];
    const filled = required.filter((v) => v && String(v).trim().length > 0).length;
    return Math.round((filled / required.length) * 100);
  }, [watchedName, watchedEmail, watchedPassword, watchedDeptId, watchedRole]);

  return (
    <div className="p-2 max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-2 duration-500">
      <PageHeader 
        title="Institutional staff intake"
        description="Onboard new personnel into the institutional framework. Records enter a pending sanction queue by default."
        icon={UserPlus}
        action={
          <div className="flex items-center gap-3 shrink-0 bg-white p-3 rounded-2xl border border-slate-200">
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-black tracking-widest text-slate-400">Form completion</span>
              <span className="text-sm font-black text-slate-900 tabular-nums">{completion}%</span>
            </div>
            <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-500"
                style={{ width: `${completion}%` }}
              />
            </div>
          </div>
        }
      />

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-6"
      >
        <aside className="lg:sticky lg:top-6 self-start space-y-5">
          <div className="relative overflow-hidden rounded-3xl bg-slate-900 p-6 text-white shadow-xl shadow-slate-900/20">
            <div className="absolute -right-10 -top-10 w-44 h-44 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -left-16 -bottom-20 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="relative">
              <p className="text-[10px] font-black tracking-[0.3em] text-slate-400 mb-5">Identity preview</p>
              <div className="flex items-center gap-4 mb-5">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-xl font-black shadow-lg shadow-blue-900/30 border border-white/10">
                  {initials}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-black truncate">{watchedName || 'Unnamed staff'}</p>
                  <p className="text-[11px] text-slate-400 truncate font-medium">{watchedEmail || 'pending.email@erp.com'}</p>
                </div>
              </div>

              <div className="space-y-2.5 text-[11px]">
                <div className="flex items-center justify-between gap-3 py-2 px-3 rounded-xl bg-white/5 border border-white/10">
                  <span className="flex items-center gap-2 text-slate-400 font-bold tracking-wider">
                    <Building2 className="w-3 h-3" /> Dept
                  </span>
                  <span className="font-black text-right truncate">{selectedDept?.name || '—'}</span>
                </div>
                <div className="flex items-center justify-between gap-3 py-2 px-3 rounded-xl bg-white/5 border border-white/10">
                  <span className="flex items-center gap-2 text-slate-400 font-bold tracking-wider">
                    <Sparkles className="w-3 h-3" /> Sub
                  </span>
                  <span className="font-black text-right truncate">{watchedSubDept || 'Universal'}</span>
                </div>
                <div className="flex items-center justify-between gap-3 py-2 px-3 rounded-xl bg-white/5 border border-white/10">
                  <span className="flex items-center gap-2 text-slate-400 font-bold tracking-wider">
                    <ShieldCheck className="w-3 h-3" /> Role
                  </span>
                  <span className="font-black text-right truncate">{watchedRole || '—'}</span>
                </div>
              </div>

              <div className="mt-5 pt-5 border-t border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                  <span className="text-[10px] font-bold tracking-wider text-amber-300">Pending sanction</span>
                </div>
                <Briefcase className="w-3.5 h-3.5 text-slate-500" />
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-amber-500/15 flex items-center justify-center shrink-0">
                <ShieldAlert className="w-4 h-4 text-amber-700" />
              </div>
              <div>
                <h4 className="text-[11px] font-black tracking-wider text-amber-900">Governance rail</h4>
                <p className="text-[11px] text-amber-800 font-medium leading-relaxed mt-1.5">
                  Non-HR enrollments require jurisdictional sign-off. The record is created but inactive until the targeted department admin sanctions it.
                </p>
              </div>
            </div>
          </div>
        </aside>

        <div className="bg-white rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/40 overflow-hidden">
          {(errors as any).root && (
            <div className="px-6 py-3 border-b border-rose-100 bg-rose-50 flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" />
              <p className="text-xs font-bold text-rose-700">{(errors as any).root.message}</p>
            </div>
          )}

          <section className="p-6 md:p-8 space-y-6">
            <header className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center">
                <User className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <h2 className="text-sm font-black text-slate-900 tracking-tight">Basic identity</h2>
                <p className="text-[11px] text-slate-500 font-medium">Legal name, credentials and contact</p>
              </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <FieldWrap label="Full legal name" icon={<User className="w-4 h-4" />} error={errors.name?.message as string}>
                <input
                  {...register('name', { required: 'Full name is required' })}
                  className={inputCls(!!errors.name)}
                  placeholder="Alexander Pierce"
                />
              </FieldWrap>

              <FieldWrap label="Institutional email" icon={<AtSign className="w-4 h-4" />} error={errors.email?.message as string}>
                <input
                  type="email"
                  {...register('email', {
                    required: 'Email is required',
                    maxLength: { value: 50, message: 'Institutional email must not exceed 50 characters' },
                    validate: (v) => v.toLowerCase() !== 'admin@erp.com' || 'This institutional email (admin@erp.com) is already reserved'
                  })}
                  className={inputCls(!!errors.email)}
                  placeholder="staff@erp.com"
                />
                {suggestedEmail && suggestedEmail !== watchedEmail && (
                  <button
                    type="button"
                    onClick={() => setValue('email', suggestedEmail)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-blue-50 text-blue-700 px-2.5 py-1 rounded-lg text-[9px] font-black hover:bg-blue-600 hover:text-white transition-all border border-blue-100 shadow-sm animate-in fade-in slide-in-from-right-1"
                  >
                    Use · {suggestedEmail.split('@')[0]}
                  </button>
                )}
              </FieldWrap>

              <div className="md:col-span-2">
                <FieldWrap label="Secure passcode" icon={<Lock className="w-4 h-4" />} error={errors.password?.message as string} hint="Range: 6-20 characters">
                  <input
                    type={showPassword ? "text" : "password"}
                    {...register('password', { 
                      required: 'Passcode is required', 
                      minLength: { value: 6, message: 'Minimum 6 characters' },
                      maxLength: { value: 20, message: 'Maximum 20 characters' }
                    })}
                    className={`${inputCls(!!errors.password)} pr-12`}
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700 transition-all"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </FieldWrap>
              </div>
            </div>
          </section>

          <div className="h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />

          <section className="p-6 md:p-8 space-y-6">
            <header className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center">
                <Building2 className="w-4 h-4 text-indigo-600" />
              </div>
              <div>
                <h2 className="text-sm font-black text-slate-900 tracking-tight">Institutional placement</h2>
                <p className="text-[11px] text-slate-500 font-medium">Where this person will operate</p>
              </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <FieldWrap label="Department scope" icon={<Building2 className="w-4 h-4" />} error={errors.departmentId?.message as string}>
                <select
                  {...register('departmentId', { required: 'Department is required' })}
                  className={`${inputCls(!!errors.departmentId)} appearance-none`}
                >
                  <option value="">Select department</option>
                  {departments
                    .filter(d => !['university', 'partner-center', 'branch'].includes(d.type?.toLowerCase() || ''))
                    .map((dept) => (
                      <option key={dept.id} value={dept.id}>{dept.name}</option>
                    ))}
                </select>
              </FieldWrap>

              <FieldWrap label="Sub-department alignment" icon={<Hash className="w-4 h-4" />} hint="Optional">
                <select
                  {...register('subDepartment')}
                  className={`${inputCls(false)} appearance-none`}
                >
                  <option value="">Universal (no sub-dept)</option>
                  <option value="Open School">Open School</option>
                  <option value="Online">Online</option>
                  <option value="Skill">Skill</option>
                  <option value="BVoc">BVoc</option>
                </select>
              </FieldWrap>

              <div className="md:col-span-2">
                <FieldWrap label="Institutional staff role" icon={<ShieldCheck className="w-4 h-4" />} error={errors.role?.message as string}>
                  <select
                    {...register('role', { required: 'Institutional role is required' })}
                    className={`${inputCls(!!errors.role)} appearance-none`}
                  >
                    <option value="">Select role</option>
                    {roles.map((role: any) => (
                      <option key={role.id} value={role.name}>{role.name}</option>
                    ))}
                  </select>
                </FieldWrap>
              </div>
            </div>
          </section>

          <footer className="px-6 md:px-8 py-5 bg-slate-50/80 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-2 text-[11px] text-slate-500 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              Record created in <span className="font-black text-slate-700">pending sanction</span> mode
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => reset()}
                className="px-5 py-2.5 text-[11px] font-black tracking-wider text-slate-500 hover:text-slate-900 transition-colors"
              >
                Reset form
              </button>
              <button
                type="submit"
                disabled={isSubmitting || isLoading}
                className="group px-6 py-2.5 bg-slate-900 hover:bg-blue-600 text-white rounded-xl text-[11px] font-black tracking-wider flex items-center gap-2 transition-all active:scale-95 shadow-lg shadow-slate-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Finalizing…' : (
                  <>
                    Sanction registration
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </>
                )}
              </button>
            </div>
          </footer>
        </div>
      </form>
    </div>
  );
}

function FieldWrap({
  label,
  hint,
  error,
  icon,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between ml-0.5">
        <label className="text-[10px] font-black text-slate-500 tracking-wider">{label}</label>
        {hint && !error && <span className="text-[10px] text-slate-400 font-medium">{hint}</span>}
      </div>
      <div className="relative">
        {icon && (
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
            {icon}
          </span>
        )}
        <div className={icon ? '[&>input]:pl-10 [&>select]:pl-10' : ''}>{children}</div>
      </div>
      {error && (
        <p className="text-[10px] font-bold text-rose-600 flex items-center gap-1 ml-0.5">
          <ShieldAlert className="w-3 h-3" /> {error}
        </p>
      )}
    </div>
  );
}

function inputCls(hasError: boolean) {
  return `w-full py-3 px-3.5 bg-slate-50 border ${
    hasError
      ? 'border-rose-300 focus:ring-rose-500/20 focus:border-rose-500'
      : 'border-slate-200 focus:ring-blue-500/20 focus:border-blue-500'
  } rounded-xl focus:ring-2 focus:outline-none transition-all text-sm font-medium text-slate-900 placeholder:text-slate-400`;
}
