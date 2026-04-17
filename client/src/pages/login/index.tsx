import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { createPortal } from 'react-dom';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import toast from 'react-hot-toast';
import { Eye, EyeOff, Zap, ArrowRight, UserCircle, X, Search } from 'lucide-react';
import { toSentenceCase } from '@/lib/utils';

const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
  password: z.string().min(1, 'Password is required').min(6, 'Password must be at least 6 characters'),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [showStudentSelector, setShowStudentSelector] = useState(false);
  const [showCEOSelector, setShowCEOSelector] = useState(false);
  const [showCenterSelector, setShowCenterSelector] = useState(false);
  const [showStaffSelector, setShowStaffSelector] = useState(false);
  
  const [demoStudents, setDemoStudents] = useState<any[]>([]);
  const [demoCEOs, setDemoCEOs] = useState<any[]>([]);
  const [demoCenters, setDemoCenters] = useState<any[]>([]);
  const [demoStaff, setDemoStaff] = useState<any[]>([]);
  const [recentAdmins, setRecentAdmins] = useState<any[]>([]);
  
  const [searching, setSearching] = useState(false);
  const [fetchingCEOs, setFetchingCEOs] = useState(false);
  const [fetchingCenters, setFetchingCenters] = useState(false);
  const [fetchingStaff, setFetchingStaff] = useState(false);
  const [fetchingRecent, setFetchingRecent] = useState(false);
  
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.login);

  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema)
  });

  const fetchRecentAdmins = async () => {
    try {
      setFetchingRecent(true);
      const res = await api.get('/auth/recent-admins');
      setRecentAdmins(res.data);
    } catch (error) {
      console.error('Recent admins fetch failed');
    } finally {
      setFetchingRecent(false);
    }
  };

  useEffect(() => {
    fetchRecentAdmins();
  }, []);

  const openStudentSelector = async () => {
    try {
      setSearching(true);
      setShowStudentSelector(true);
      const res = await api.get('/auth/demo-students');
      setDemoStudents(res.data);
    } catch (error) {
      toast.error('Failed to wake student node');
    } finally {
      setSearching(false);
    }
  };

  const openCEOSelector = async () => {
    try {
      setFetchingCEOs(true);
      setShowCEOSelector(true);
      const res = await api.get('/auth/demo-ceos');
      setDemoCEOs(res.data);
    } catch (error) {
      toast.error('Failed to fetch executive roster');
    } finally {
      setFetchingCEOs(false);
    }
  };

  const openCenterSelector = async () => {
    try {
      setFetchingCenters(true);
      setShowCenterSelector(true);
      const res = await api.get('/auth/demo-centers');
      setDemoCenters(res.data);
    } catch (error) {
      toast.error('Failed to fetch verified center roster');
    } finally {
      setFetchingCenters(false);
    }
  };

  const openStaffSelector = async () => {
    try {
      setFetchingStaff(true);
      setShowStaffSelector(true);
      const res = await api.get('/auth/demo-staff');
      setDemoStaff(res.data);
    } catch (error) {
      toast.error('Failed to scan staff registry');
    } finally {
      setFetchingStaff(false);
    }
  };

  useEffect(() => {
    if (showStudentSelector || showCEOSelector || showCenterSelector || showStaffSelector) {
      document.body.style.overflow = 'hidden';
      document.body.classList.add('modal-open-blur');
    } else {
      document.body.style.overflow = 'auto';
      document.body.classList.remove('modal-open-blur');
    }
    return () => {
      document.body.style.overflow = 'auto';
      document.body.classList.remove('modal-open-blur');
    };
  }, [showStudentSelector, showCEOSelector, showCenterSelector, showStaffSelector]);

  const selectStudent = (student: any) => {
    setValue('email', student.email, { shouldValidate: true, shouldDirty: true });
    setValue('password', 'Student@123', { shouldValidate: true, shouldDirty: true });
    setShowStudentSelector(false);
    toast.success(`Identity assumed: ${student.name}`);
  };

  const selectCEO = (ceo: any) => {
    setShowCEOSelector(false);
    setTimeout(() => {
      setValue('email', ceo.email, { shouldValidate: true, shouldDirty: true });
      setValue('password', ceo.password || 'password123', { shouldValidate: true, shouldDirty: true });
      toast.success(`Identity assumed: ${ceo.name}`);
    }, 100);
  };

  const selectCenter = (center: any) => {
    setValue('email', center.email, { shouldValidate: true, shouldDirty: true });
    setValue('password', center.password || 'password123', { shouldValidate: true, shouldDirty: true });
    setShowCenterSelector(false);
    toast.success(`Identity assumed: ${center.name}`);
  };

  const selectStaff = (staff: any) => {
    setValue('email', staff.email, { shouldValidate: true, shouldDirty: true });
    setValue('password', staff.password || 'password123', { shouldValidate: true, shouldDirty: true });
    setShowStaffSelector(false);
    toast.success(`Identity assumed: ${staff.name}`);
  };

  const onSubmit = async (data: LoginForm) => {
    try {
      const response = await api.post('/auth/login', data);
      const { user, token } = response.data;
      setAuth(user, token);
      const roleData = user.role.toLowerCase().trim();
      const dashboardPath = (['partner-center', 'partner center', 'partner centers'].includes(roleData)) ? 'partner-center' : (user.role === 'Organization Admin' ? 'org-admin' : roleData);
      navigate(`/dashboard/${dashboardPath}`);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Login failed');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-12">
      <div className="max-w-7xl w-full grid grid-cols-1 lg:grid-cols-2 gap-20 items-stretch">
        
        {/* Left Side: Login Form */}
        <div className="bg-white p-12 lg:p-16 rounded-3xl shadow-2xl shadow-slate-200/50 border border-slate-100 flex flex-col">
          <div className="mb-10">
            <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-2">Institutional Login</h2>
            <p className="text-slate-500 font-medium">Global Audit System v1.0</p>
          </div>

          <form autoComplete="off" onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">Email Identifier</label>
              <input
                type="email"
                autoComplete="off"
                placeholder="admin@erp.com"
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

          <div className="mt-6 pt-6 border-t border-slate-100 flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-widest">
            <span>Server: 127.0.0.1:3000</span>
            <span className="text-emerald-500 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
              Core System Online
            </span>
          </div>
        </div>

        {/* Right Side: Quick Login Demo Access Card */}
        <div className="bg-white p-12 lg:p-16 rounded-3xl shadow-2xl shadow-slate-200/50 border border-slate-100 flex flex-col min-h-[520px]">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">Quick Login Panel</h2>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">14 Roles • 1-Click Authentication</p>
            </div>
            <div className="bg-blue-50 text-blue-600 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider">
              Dev Mode Only
            </div>
          </div>

          <div className="space-y-6 max-h-[480px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
            {/* Dynamic Recent Admins */}
            {recentAdmins.length > 0 && (
              <div className="space-y-3">
                <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest pl-1 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-pulse"></span>
                  Newly Provisioned
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {recentAdmins.map((admin) => (
                    <button
                      key={admin.uid}
                      type="button"
                      onClick={() => {
                        setValue('email', admin.email, { shouldValidate: true, shouldDirty: true });
                        setValue('password', admin.password || 'password123', { shouldValidate: true, shouldDirty: true });
                      }}
                      className="flex items-center gap-3 p-3 bg-white border border-rose-100 rounded-2xl hover:border-rose-400 hover:shadow-xl hover:shadow-rose-500/5 transition-all group active:scale-[0.97]"
                    >
                      <div className="w-9 h-9 rounded-xl bg-rose-600 text-white flex items-center justify-center text-[10px] font-black shadow-lg shadow-rose-500/20 group-hover:scale-110 transition-transform flex-shrink-0">
                        {admin.uid.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="text-left min-w-0">
                        <p className="text-[10px] font-black text-slate-800 truncate leading-tight tracking-tight">{toSentenceCase(admin.name)}</p>
                        <p className="text-[9px] text-slate-400 font-bold truncate mt-0.5">{toSentenceCase(admin.role)}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-3">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Standard Demo Roles</p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { role: 'Organization Admin', email: 'admin@erp.com', initial: 'OA', color: 'bg-slate-900', desc: 'Org Configuration' },
                  { role: 'CEO', email: 'ceo@erp.com', initial: 'CEO', color: 'bg-indigo-950', desc: 'Corporate HUD' },
                  { role: 'Academic Operations Admin', email: 'operations@erp.com', initial: 'OPS', color: 'bg-sky-600', desc: 'Academic Mgmt' },
                  { role: 'Finance Admin', email: 'finance@erp.com', initial: 'FO', color: 'bg-emerald-600', desc: 'Revenue & Audit' },
                  { role: 'HR Admin', email: 'hr@erp.com', initial: 'HR', color: 'bg-rose-600', desc: 'People & Attendance' },
                  { role: 'Sales Admin', email: 'sales@erp.com', initial: 'SL', color: 'bg-amber-600', desc: 'Lead Pipeline' },
                  { role: 'Partner Centers', email: 'center@erp.com', initial: 'PC', color: 'bg-violet-600', desc: 'Center Ops' },
                  { role: 'Employee', email: 'employee@erp.com', initial: 'SP', color: 'bg-slate-500', desc: 'Personal Utility' },
                  { role: 'Open School Admin', email: 'open-school@erp.com', initial: 'OS', color: 'bg-orange-600', desc: 'Sub-Dept Portal' },
                  { role: 'Online Admin', email: 'online@erp.com', initial: 'ON', color: 'bg-cyan-600', desc: 'Virtual Learning' },
                  { role: 'Skill Admin', email: 'skill@erp.com', initial: 'SK', color: 'bg-lime-600', desc: 'Vocational Training' },
                  { role: 'BVoc Admin', email: 'bvoc@erp.com', initial: 'BV', color: 'bg-fuchsia-600', desc: 'Degree Portal' }
                ].map((demo) => (
                  <button
                    key={demo.role}
                    type="button"
                    onClick={() => {
                      if (demo.role === 'Active Student') {
                        openStudentSelector();
                        return;
                      }
                      if (demo.role.includes('CEO')) {
                        openCEOSelector();
                        return;
                      }
                      if (demo.role.includes('Partner Center')) {
                        openCenterSelector();
                        return;
                      }
                      if (demo.role === 'Employee') {
                        openStaffSelector();
                        return;
                      }
                      setValue('email', demo.email, { shouldValidate: true, shouldDirty: true });
                      setValue('password', 'password123', { shouldValidate: true, shouldDirty: true });
                    }}
                    className="flex items-center gap-3 p-3.5 bg-slate-50 border border-slate-100 rounded-2xl hover:bg-white hover:border-blue-200 hover:shadow-xl hover:shadow-blue-500/5 transition-all group active:scale-[0.97]"
                  >
                    <div className={`w-10 h-10 rounded-xl ${demo.color} text-white flex items-center justify-center text-xs font-black shadow-lg shadow-current/20 group-hover:scale-110 transition-transform flex-shrink-0`}>
                      {demo.initial}
                    </div>
                    <div className="text-left min-w-0">
                      <p className="text-[11px] font-black text-slate-800 truncate leading-tight tracking-wide">{toSentenceCase(demo.role)}</p>
                      <p className="text-[10px] text-slate-400 font-bold truncate mt-0.5">{demo.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Portals nested in Root 171 */}
        {showStudentSelector && createPortal(
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowStudentSelector(false)} />
            <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl relative z-10 overflow-hidden border border-slate-200 animate-in zoom-in-95 fade-in duration-200">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div>
                  <h3 className="text-xl font-black text-slate-900 tracking-tight">Active Student Nodes</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Select an enrolled candidate to assume identity</p>
                </div>
                <button onClick={() => setShowStudentSelector(false)} className="p-2 hover:bg-slate-200 rounded-xl transition-colors text-slate-400 hover:text-slate-900">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 max-h-[400px] overflow-y-auto custom-scrollbar">
                {searching ? (
                  <div className="flex flex-col items-center justify-center py-12 space-y-4">
                    <div className="w-10 h-10 border-4 border-blue-500/20 border-t-blue-600 rounded-full animate-spin" />
                    <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest animate-pulse">Scanning Institutional Ledger...</p>
                  </div>
                ) : demoStudents.length > 0 ? (
                  <div className="grid grid-cols-1 gap-3">
                    {demoStudents.map((student) => (
                      <button key={student.uid} onClick={() => selectStudent(student)} className="flex items-center gap-4 p-4 bg-slate-50/50 border border-slate-100 rounded-2xl hover:bg-white hover:border-blue-300 hover:shadow-xl hover:shadow-blue-500/10 transition-all group text-left active:scale-[0.98]">
                        <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:scale-110 transition-transform flex-shrink-0">
                          <UserCircle className="w-7 h-7" />
                        </div>
                        <div className="min-w-0 flex-grow">
                          <p className="text-sm font-black text-slate-900 truncate uppercase tracking-tight">{student.name}</p>
                          <p className="text-[11px] font-bold text-slate-400 truncate mt-0.5">{student.uid} • {student.email}</p>
                        </div>
                        <div className="bg-blue-50 p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                          <ArrowRight className="w-4 h-4 text-blue-600" />
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 space-y-4">
                    <div className="bg-slate-100 w-16 h-16 rounded-3xl flex items-center justify-center mx-auto">
                      <Search className="w-8 h-8 text-slate-300" />
                    </div>
                    <div>
                      <p className="text-sm font-black text-slate-900 uppercase">No Active Nodes Located</p>
                    </div>
                  </div>
                )}
              </div>
              <div className="p-6 bg-slate-50 border-t border-slate-100 text-center">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Universal Student Guardrail: Student@123</p>
              </div>
            </div>
          </div>
        , document.body)}

        {showCEOSelector && createPortal(
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowCEOSelector(false)} />
            <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl relative z-10 overflow-hidden border border-slate-200 animate-in zoom-in-95 fade-in duration-200">
              <div className="p-6 border-b border-indigo-100 flex items-center justify-between bg-indigo-50/50">
                <div>
                  <h3 className="text-xl font-black text-indigo-950 tracking-tight">Active Executive Nodes</h3>
                  <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mt-1">Select a provisioned CEO to assume corporate identity</p>
                </div>
                <button onClick={() => setShowCEOSelector(false)} className="p-2 hover:bg-indigo-100 rounded-xl transition-colors text-indigo-400 hover:text-indigo-950">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 max-h-[400px] overflow-y-auto custom-scrollbar">
                {fetchingCEOs ? (
                  <div className="flex flex-col items-center justify-center py-12 space-y-4">
                    <div className="w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-600 rounded-full animate-spin" />
                    <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest animate-pulse">Syncing Executive Roster...</p>
                  </div>
                ) : demoCEOs.length > 0 ? (
                  <div className="grid grid-cols-1 gap-3">
                    {demoCEOs.map((ceo) => (
                      <button key={ceo.uid} onClick={() => selectCEO(ceo)} className="flex items-center gap-4 p-4 bg-slate-50/50 border border-slate-100 rounded-2xl hover:bg-white hover:border-indigo-300 hover:shadow-xl hover:shadow-indigo-500/10 transition-all group text-left active:scale-[0.98]">
                        <div className="w-12 h-12 rounded-xl bg-indigo-950 text-white flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:scale-110 transition-transform flex-shrink-0">
                          <Zap className="w-6 h-6" />
                        </div>
                        <div className="min-w-0 flex-grow">
                          <p className="text-sm font-black text-slate-900 truncate uppercase tracking-tight">{ceo.name}</p>
                          <p className="text-[11px] font-bold text-slate-400 truncate mt-0.5">{ceo.uid} • {ceo.email}</p>
                        </div>
                        <div className="bg-indigo-50 p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                          <ArrowRight className="w-4 h-4 text-indigo-950" />
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 space-y-4">
                    <div className="bg-slate-100 w-16 h-16 rounded-3xl flex items-center justify-center mx-auto">
                      <UserCircle className="w-8 h-8 text-slate-300" />
                    </div>
                    <div>
                      <p className="text-sm font-black text-slate-900 uppercase">No Executive Records</p>
                    </div>
                  </div>
                )}
              </div>
              <div className="p-6 bg-slate-50 border-t border-slate-100 text-center">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Universal Executive Access: password123</p>
              </div>
            </div>
          </div>
        , document.body)}

        {showCenterSelector && createPortal(
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowCenterSelector(false)} />
            <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl relative z-10 overflow-hidden border border-slate-200 animate-in zoom-in-95 fade-in duration-200">
              <div className="p-6 border-b border-violet-100 flex items-center justify-between bg-violet-50/50">
                <div>
                  <h3 className="text-xl font-black text-violet-950 tracking-tight">Verified Institutional Centers</h3>
                  <p className="text-[10px] font-bold text-violet-400 uppercase tracking-widest mt-1">Select a certified partner node to assume identity</p>
                </div>
                <button onClick={() => setShowCenterSelector(false)} className="p-2 hover:bg-violet-100 rounded-xl transition-colors text-violet-400 hover:text-violet-950">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 max-h-[400px] overflow-y-auto custom-scrollbar">
                {fetchingCenters ? (
                  <div className="flex flex-col items-center justify-center py-12 space-y-4">
                    <div className="w-10 h-10 border-4 border-violet-500/20 border-t-violet-600 rounded-full animate-spin" />
                    <p className="text-[10px] font-black text-violet-600 uppercase tracking-widest animate-pulse">Scanning Partner Network...</p>
                  </div>
                ) : demoCenters.length > 0 ? (
                  <div className="grid grid-cols-1 gap-3">
                    {demoCenters.map((center) => (
                      <button key={center.uid} onClick={() => selectCenter(center)} className="flex items-center gap-4 p-4 bg-slate-50/50 border border-slate-100 rounded-2xl hover:bg-white hover:border-violet-300 hover:shadow-xl hover:shadow-violet-500/10 transition-all group text-left active:scale-[0.98]">
                        <div className="w-12 h-12 rounded-xl bg-violet-600 text-white flex items-center justify-center shadow-lg shadow-violet-500/20 group-hover:scale-110 transition-transform flex-shrink-0 uppercase font-black text-xs">
                          {center.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2)}
                        </div>
                        <div className="min-w-0 flex-grow">
                          <p className="text-sm font-black text-slate-900 truncate uppercase tracking-tight">{center.name}</p>
                          <p className="text-[11px] font-bold text-slate-400 truncate mt-0.5">{center.uid} • {center.email}</p>
                        </div>
                        <div className="bg-violet-50 p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                          <ArrowRight className="w-4 h-4 text-violet-600" />
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 space-y-4">
                    <div className="bg-slate-100 w-16 h-16 rounded-3xl flex items-center justify-center mx-auto">
                      <Zap className="w-8 h-8 text-slate-300" />
                    </div>
                    <div>
                      <p className="text-sm font-black text-slate-900 uppercase">No Verified Centers</p>
                    </div>
                  </div>
                )}
              </div>
              <div className="p-6 bg-slate-50 border-t border-slate-100 text-center">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Universal Partner Access: password123</p>
              </div>
            </div>
          </div>
        , document.body)}

        {showStaffSelector && createPortal(
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowStaffSelector(false)} />
            <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl relative z-10 overflow-hidden border border-slate-200 animate-in zoom-in-95 fade-in duration-200">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div>
                  <h3 className="text-xl font-black text-slate-900 tracking-tight">Newly Registered Employees</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Select an institutional employee node to assume identity</p>
                </div>
                <button onClick={() => setShowStaffSelector(false)} className="p-2 hover:bg-slate-200 rounded-xl transition-colors text-slate-400 hover:text-slate-900">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 max-h-[400px] overflow-y-auto custom-scrollbar">
                {fetchingStaff ? (
                  <div className="flex flex-col items-center justify-center py-12 space-y-4">
                    <div className="w-10 h-10 border-4 border-slate-500/20 border-t-slate-600 rounded-full animate-spin" />
                    <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest animate-pulse">Scanning Staff Registry...</p>
                  </div>
                ) : demoStaff.length > 0 ? (
                  <div className="grid grid-cols-1 gap-3">
                    {demoStaff.map((staff) => (
                      <button key={staff.uid} onClick={() => selectStaff(staff)} className="flex items-center gap-4 p-4 bg-slate-50/50 border border-slate-100 rounded-2xl hover:bg-white hover:border-blue-300 hover:shadow-xl hover:shadow-blue-500/10 transition-all group text-left active:scale-[0.98]">
                        <div className="w-12 h-12 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-lg shadow-slate-500/20 group-hover:scale-110 transition-transform flex-shrink-0">
                          <UserCircle className="w-7 h-7" />
                        </div>
                        <div className="min-w-0 flex-grow">
                          <p className="text-sm font-black text-slate-900 truncate uppercase tracking-tight">{staff.name}</p>
                          <p className="text-[11px] font-bold text-slate-400 truncate mt-0.5">{toSentenceCase(staff.role)} • {toSentenceCase(staff.department)}</p>
                        </div>
                        <div className="bg-slate-50 p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                          <ArrowRight className="w-4 h-4 text-slate-900" />
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 space-y-4">
                    <div className="bg-slate-100 w-16 h-16 rounded-3xl flex items-center justify-center mx-auto">
                      <Search className="w-8 h-8 text-slate-300" />
                    </div>
                    <div>
                      <p className="text-sm font-black text-slate-900 uppercase">No Staff Records Located</p>
                    </div>
                  </div>
                )}
              </div>
              <div className="p-6 bg-slate-50 border-t border-slate-100 text-center">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-relaxed">
                  Universal Staff Guardrail: password123 <br/>
                  <span className="text-blue-500 ">Personalized: Registration Credentials Used</span>
                </p>
              </div>
            </div>
          </div>
        , document.body)}
      </div>
    </div>
  );
}
