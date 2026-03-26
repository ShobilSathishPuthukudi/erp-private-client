import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import toast from 'react-hot-toast';
import { Eye, EyeOff } from 'lucide-react';

const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
  password: z.string().min(1, 'Password is required').min(6, 'Password must be at least 6 characters'),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.login);

  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema)
  });

  const onSubmit = async (data: LoginForm) => {
    try {
      const response = await api.post('/auth/login', data);
      setAuth(response.data.user, response.data.token);
      navigate(`/dashboard/${response.data.user.role}`);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Login failed');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <div className="max-w-5xl w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Side: Login Form */}
        <div className="lg:col-span-5 bg-white p-10 rounded-3xl shadow-2xl shadow-slate-200/50 border border-slate-100 flex flex-col h-full min-h-[520px]">
          <div className="mb-10">
            <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-2">Institutional Login</h2>
            <p className="text-slate-500 font-medium">Global Audit System v3.0 (GAP-5 Ready)</p>
          </div>

          <form autoComplete="off" onSubmit={handleSubmit(onSubmit)} className="space-y-6 flex-grow">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">Email Identifier</label>
              <input
                type="email"
                autoComplete="off"
                placeholder="e.g. admin@iits.edu"
                {...register('email')}
                className="block w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-slate-900 outline-none transition-all font-medium text-slate-900"
              />
              {errors.email && <p className="text-red-500 text-[11px] font-bold mt-1 pl-1">{errors.email.message}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">Secure Access Key</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="••••••••"
                  {...register('password')}
                  className="block w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-slate-900 outline-none transition-all font-medium text-slate-900"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-5 text-slate-400 hover:text-slate-600 focus:outline-none transition-colors"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {errors.password && <p className="text-red-500 text-[11px] font-bold mt-1 pl-1">{errors.password.message}</p>}
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex justify-center items-center py-4 px-6 border border-transparent rounded-2xl shadow-xl shadow-slate-900/10 text-sm font-bold text-white bg-slate-900 hover:bg-slate-800 active:scale-[0.98] transition-all disabled:opacity-50"
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    Authenticating...
                  </span>
                ) : 'Enter Platform'}
              </button>
            </div>
          </form>

          <div className="mt-10 pt-6 border-t border-slate-100 flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-widest">
            <span>Server: 127.0.0.1:3000</span>
            <span className="text-emerald-500 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
              Core System Online
            </span>
          </div>
        </div>

        {/* Right Side: Quick Login Demo Access Card */}
        <div className="lg:col-span-7 bg-white p-10 rounded-3xl shadow-2xl shadow-slate-200/50 border border-slate-100 h-full min-h-[520px]">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">Quick Login Panel</h2>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">14 Roles • 1-Click Authentication</p>
            </div>
            <div className="bg-blue-50 text-blue-600 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider">
              Dev Mode Only
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 max-h-[480px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
            {[
              { role: 'System Admin', email: 'admin@iits.edu', initial: 'SA', color: 'bg-slate-900', desc: 'Org Configuration' },
              { role: 'Executive CEO', email: 'ceo@iits.edu', initial: 'CEO', color: 'bg-indigo-950', desc: 'Global Dashboard' },
              { role: 'Dept Head', email: 'dept@iits.edu', initial: 'DH', color: 'bg-blue-600', desc: 'Team Overseer' },
              { role: 'Operations', email: 'ops@iits.edu', initial: 'OPS', color: 'bg-sky-600', desc: 'Academic Mgmt' },
              { role: 'Finance', email: 'finance@iits.edu', initial: 'FO', color: 'bg-emerald-600', desc: 'Revenue & Audit' },
              { role: 'HR Manager', email: 'hr@iits.edu', initial: 'HR', color: 'bg-rose-600', desc: 'People & Attendance' },
              { role: 'BDE/Sales', email: 'sales@iits.edu', initial: 'SL', color: 'bg-amber-600', desc: 'Lead Pipeline' },
              { role: 'Partner Center', email: 'center@iits.edu', initial: 'PC', color: 'bg-violet-600', desc: 'Center Ops' },
              { role: 'Active Student', email: 'student@iits.edu', initial: 'ST', color: 'bg-indigo-600', desc: 'LMS & Fee' },
              { role: 'Staff Portal', email: 'employee@iits.edu', initial: 'SP', color: 'bg-slate-500', desc: 'Personal Utility' },
              { role: 'OpenSchool', email: 'openschool@iits.edu', initial: 'OS', color: 'bg-orange-600', desc: 'Sub-Dept Portal' },
              { role: 'Online Ed', email: 'online@iits.edu', initial: 'ON', color: 'bg-cyan-600', desc: 'Virtual Learning' },
              { role: 'Skill Dev', email: 'skill@iits.edu', initial: 'SK', color: 'bg-lime-600', desc: 'Vocational Training' },
              { role: 'BVoc Admin', email: 'bvoc@iits.edu', initial: 'BV', color: 'bg-fuchsia-600', desc: 'Degree Portal' }
            ].map((demo) => (
              <button
                key={demo.email}
                type="button"
                onClick={() => {
                  setValue('email', demo.email, { shouldValidate: true, shouldDirty: true });
                  setValue('password', 'password123', { shouldValidate: true, shouldDirty: true });
                }}
                className="flex items-center gap-3 p-3.5 bg-slate-50 border border-slate-100 rounded-2xl hover:bg-white hover:border-blue-200 hover:shadow-xl hover:shadow-blue-500/5 transition-all group active:scale-[0.97]"
              >
                <div className={`w-10 h-10 rounded-xl ${demo.color} text-white flex items-center justify-center text-xs font-black shadow-lg shadow-${demo.color.split('-')[1]}-500/20 group-hover:scale-110 transition-transform flex-shrink-0`}>
                  {demo.initial}
                </div>
                <div className="text-left min-w-0">
                  <p className="text-[11px] font-black text-slate-800 truncate leading-tight uppercase tracking-wide">{demo.role}</p>
                  <p className="text-[10px] text-slate-400 font-bold truncate mt-0.5">{demo.desc}</p>
                </div>
              </button>
            ))}
          </div>
          
          <div className="mt-8 bg-blue-50/50 rounded-2xl p-4 flex items-center gap-4 border border-blue-50">
             <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
             <p className="text-[10px] font-black text-blue-700 uppercase tracking-widest">Universal Dev Credentials: password123</p>
          </div>
        </div>
      </div>
    </div>
  );
}
