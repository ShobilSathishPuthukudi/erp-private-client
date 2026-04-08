import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { Mail, Phone, Globe, ShieldCheck, FileText, Loader2, ArrowRight, Eye, EyeOff, X, GraduationCap, Building2, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export default function CenterRegistration() {
  const { code } = useParams();
  const [bdeInfo, setBdeInfo] = useState<any>(null);
  const [orgInfo, setOrgInfo] = useState<any>(null);
  const [universities, setUniversities] = useState<any[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    website: 'https://www.google.com',
    description: '',
    password: '',
    confirmPassword: '',
    infrastructure: {
      labCapacity: '',
      classroomCount: '',
    },
    interest: {
      universityId: '',
      programIds: [] as number[]
    }
  });

  const [passwordMatch, setPasswordMatch] = useState(true);
  const [passwordLengthError, setPasswordLengthError] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    setPasswordMatch(formData.password === formData.confirmPassword || !formData.confirmPassword);
    if (formData.password.length >= 6) setPasswordLengthError(false);
  }, [formData.password, formData.confirmPassword]);

  useEffect(() => {
    fetchBdeInfo();
    fetchOrgInfo();
    fetchUniversities();
  }, [code]);

  const fetchBdeInfo = async () => {
    try {
      const res = await axios.get(`${API_URL}/public/bde-info/${code}`);
      setBdeInfo(res.data);
    } catch (error) {
      console.error('Invalid BDE ID:', error);
      toast.error('Invalid or expired referral link');
    } finally {
      setLoading(false);
    }
  };

  const fetchOrgInfo = async () => {
    try {
      const res = await axios.get(`${API_URL}/public/org-info`);
      setOrgInfo(res.data);
    } catch (error) {
      console.error('Failed to fetch org info');
    }
  };

  const fetchUniversities = async () => {
    try {
      const res = await axios.get(`${API_URL}/public/universities`);
      setUniversities(res.data);
    } catch (error) {
       console.error('Fetch Universities failed');
    }
  };

  const fetchPrograms = async (uniId: string) => {
    try {
      const res = await axios.get(`${API_URL}/public/programs/${uniId}`);
      setPrograms(res.data);
    } catch (error) {
       console.error('Fetch Programs failed');
    }
  };

  const handleUniversityChange = (uniId: string) => {
    setFormData({ 
      ...formData, 
      interest: { universityId: uniId, programIds: [] } 
    });
    setPrograms([]);
    if (uniId) fetchPrograms(uniId);
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.interest.programIds.length === 0) {
      toast.error('Select at least one program to initialize partnership');
      return;
    }
    if (!passwordMatch) {
      toast.error('Passwords do not match');
      return;
    }
    if (formData.password.length < 6) {
      setPasswordLengthError(true);
      return;
    }

    setSubmitting(true);
    try {
      await axios.post(`${API_URL}/public/register-center`, {
        ...formData,
        code
      });
      setSubmitted(true);
      toast.success('Registration request submitted successfully!');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to submit registration');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-[3rem] p-12 shadow-2xl shadow-blue-100 border border-slate-100 text-center animate-in fade-in zoom-in duration-500">
          <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-8 border-2 border-emerald-100">
            <CheckCircle2 className="w-10 h-10 text-emerald-500" />
          </div>
          <h2 className="text-3xl font-black text-slate-900 uppercase italic tracking-tighter mb-4">Registration Received</h2>
          <p className="text-slate-500 font-bold mb-8 leading-relaxed">
            Thank you for your interest. Our regional head will review your institutional profile and get back to you within 24 hours.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-slate-50 flex flex-col lg:flex-row overflow-hidden">
      {/* Left Panel: Branding & BDE Context */}
      <div className="lg:w-[35%] bg-slate-900 p-8 lg:p-12 text-white flex flex-col justify-between relative overflow-hidden shrink-0">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl -mr-48 -mt-48"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-600/10 rounded-full blur-3xl -ml-32 -mb-32"></div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
               <ShieldCheck className="w-5 h-5 text-slate-900" />
            </div>
            <span className="text-lg font-black tracking-tighter uppercase italic">{orgInfo?.name || 'Institutional Portal'}</span>
          </div>

          <h1 className="text-3xl lg:text-4xl font-black tracking-tighter italic uppercase leading-[0.95] mb-6">
            Institutional <br /> Partnership <br /> <span className="text-blue-500">Growth</span>
          </h1>
          
          <p className="text-slate-400 font-bold text-sm max-w-xs leading-relaxed mb-8">
            Partner with India's fastest growing institutional ecosystem. Expand your reach and impact.
          </p>

          <div className="space-y-4">
            <div className="flex items-center gap-3 bg-white/5 p-3 rounded-xl border border-white/10 w-fit">
              <Globe className="w-4 h-4 text-blue-400" />
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">Global Standards</span>
            </div>
            <div className="flex items-center gap-4 bg-white/5 p-3 rounded-xl border border-white/10 w-fit">
              <Building2 className="w-4 h-4 text-indigo-400" />
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">Unified Governance</span>
            </div>
          </div>
        </div>

        {bdeInfo && (
          <div className="mt-8 relative z-10">
            <div className="p-4 bg-white/5 border border-white/10 rounded-[1.5rem] backdrop-blur-md">
              <p className="text-[9px] font-black text-blue-400 uppercase tracking-[0.2em] mb-2 leading-none">Partner Invitation</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center font-black text-lg italic">
                  {bdeInfo.name?.charAt(0)}
                </div>
                <div>
                  <h4 className="font-black text-base uppercase tracking-tight">{bdeInfo.name}</h4>
                  <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest leading-none mt-1">Institutional BDE</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Right Panel: Form */}
      <div className="flex-1 p-6 lg:p-10 flex items-center justify-center overflow-y-auto lg:overflow-hidden bg-white">
        <div className="max-w-xl w-full">
          <div className="mb-6">
            <h2 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter">Registration Protocol</h2>
            <p className="text-slate-500 font-bold uppercase tracking-widest text-[9px] mt-1">Institutional website is optional; all other fields are mandatory.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block pl-1">Center Legal Name</label>
                <div className="relative">
                  <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300" />
                  <input 
                    type="text" 
                    required
                    className="w-full bg-slate-50 border-2 border-slate-50 rounded-xl pl-11 pr-4 py-2.5 text-sm font-bold focus:bg-white focus:border-blue-600 focus:ring-0 transition-all"
                    placeholder="Acme Institute"
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block pl-1">Primary Email</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300" />
                  <input 
                    type="email" 
                    required
                    className="w-full bg-slate-50 border-2 border-slate-50 rounded-xl pl-11 pr-4 py-2.5 text-sm font-bold focus:bg-white focus:border-blue-600 focus:ring-0 transition-all"
                    placeholder="center@example.com"
                    value={formData.email}
                    onChange={e => setFormData({...formData, email: e.target.value})}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block pl-1">Contact Phone</label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300" />
                  <input 
                    type="tel" 
                    required
                    className="w-full bg-slate-50 border-2 border-slate-50 rounded-xl pl-11 pr-4 py-2.5 text-sm font-bold focus:bg-white focus:border-blue-600 focus:ring-0 transition-all font-mono"
                    placeholder="+91-XXXXX-XXXXX"
                    value={formData.phone}
                    onChange={e => setFormData({...formData, phone: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block pl-1">Institutional Website (Optional)</label>
                <div className="relative">
                  <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300" />
                  <input 
                    type="url" 
                    className="w-full bg-slate-50 border-2 border-slate-50 rounded-xl pl-11 pr-4 py-2.5 text-sm font-bold focus:bg-white focus:border-blue-600 focus:ring-0 transition-all"
                    placeholder="https://acme-edu.org"
                    value={formData.website}
                    onChange={e => setFormData({...formData, website: e.target.value})}
                  />
                </div>
              </div>
            </div>

            {/* Credential Block */}
            <div className="p-5 bg-blue-50/30 rounded-[1.5rem] border border-blue-100/50 space-y-4">
              <div className="flex items-center gap-3 mb-1">
                <ShieldCheck className="w-4 h-4 text-blue-600" />
                <h3 className="text-[10px] font-black text-blue-900 uppercase tracking-[0.2em]">Security Credentials</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block pl-1">Create Password</label>
                  <div className="relative">
                    <input 
                      type={showPassword ? "text" : "password"}
                      required
                      className={`w-full bg-white border-2 rounded-xl pl-4 pr-11 py-2.5 text-sm font-bold focus:ring-0 transition-all shadow-sm ${!passwordMatch ? 'border-red-200 focus:border-red-500' : 'border-white focus:border-blue-600'}`}
                      placeholder="••••••"
                      value={formData.password}
                      onChange={e => setFormData({...formData, password: e.target.value})}
                    />
                    <button 
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-blue-600 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {passwordLengthError ? (
                    <p className="text-[8px] font-black text-red-500 pl-1 uppercase tracking-wider animate-pulse">Password must be at least 6 characters</p>
                  ) : (
                    <p className="text-[8px] font-medium text-slate-400 pl-1 uppercase tracking-wider">Minimum 6 characters required</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block pl-1">Confirm Password</label>
                  <div className="relative">
                    <input 
                      type={showConfirmPassword ? "text" : "password"}
                      required
                      className={`w-full bg-white border-2 rounded-xl pl-4 pr-11 py-2.5 text-sm font-bold focus:ring-0 transition-all shadow-sm ${!passwordMatch ? 'border-red-200 focus:border-red-500' : 'border-white focus:border-blue-600'}`}
                      placeholder="••••••"
                      value={formData.confirmPassword}
                      onChange={e => setFormData({...formData, confirmPassword: e.target.value})}
                    />
                    <button 
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-blue-600 transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
              {!passwordMatch && (
                <p className="text-[9px] font-black text-red-500 uppercase tracking-widest mt-1 animate-pulse">Credentials do not match</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block pl-1">Primary Interest: University</label>
                <div className="relative">
                  <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300" />
                  <select 
                    required
                    className="w-full bg-slate-50 border-2 border-slate-50 rounded-xl pl-11 pr-4 py-2.5 text-sm font-bold focus:bg-white focus:border-blue-600 focus:ring-0 transition-all appearance-none"
                    value={formData.interest.universityId}
                    onChange={e => handleUniversityChange(e.target.value)}
                  >
                    <option value="">Select Institution</option>
                    {universities.map(u => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block pl-1">Primary Interest: Programs</label>
                <div className="relative">
                  <GraduationCap className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300 pointer-events-none" />
                  <select 
                    disabled={!formData.interest.universityId}
                    className="w-full bg-slate-50 border-2 border-slate-50 rounded-xl pl-11 pr-4 py-2.5 text-sm font-bold focus:bg-white focus:border-blue-600 focus:ring-0 transition-all appearance-none disabled:opacity-50 disabled:bg-slate-50 cursor-not-allowed"
                    value=""
                    onChange={e => {
                      const val = Number(e.target.value);
                      if (val && !formData.interest.programIds.includes(val)) {
                        setFormData({
                          ...formData,
                          interest: {
                            ...formData.interest,
                            programIds: [...formData.interest.programIds, val]
                          }
                        });
                      }
                    }}
                  >
                    <option value="">Add Program...</option>
                    {programs
                      .filter(p => !formData.interest.programIds.includes(p.id))
                      .map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                  </select>
                </div>

                {/* Program Capsules */}
                <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto pr-1 scrollbar-hide">
                  {formData.interest.programIds.map(id => {
                    const prog = programs.find(p => p.id === id);
                    if (!prog) return null;
                    return (
                      <div key={id} className="flex items-center gap-2 bg-blue-600 text-white pl-3 pr-2 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm animate-in fade-in zoom-in duration-200">
                        <span>{prog.name}</span>
                        <button 
                          type="button"
                          onClick={() => setFormData({
                            ...formData,
                            interest: {
                              ...formData.interest,
                              programIds: formData.interest.programIds.filter(pid => pid !== id)
                            }
                          })}
                          className="p-0.5 hover:bg-white/20 rounded-full transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    );
                  })}
                  {formData.interest.programIds.length === 0 && (
                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest pl-1 italic">No programs selected yet</p>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block pl-1">Institutional Description</label>
              <div className="relative">
                <FileText className="absolute left-4 top-3 w-3.5 h-3.5 text-slate-300" />
                <textarea 
                  rows={2}
                  required
                  className="w-full bg-slate-50 border-2 border-slate-50 rounded-xl pl-11 pr-4 py-2 text-sm font-medium focus:bg-white focus:border-blue-600 focus:ring-0 transition-all resize-none"
                  placeholder="Tell us about your center and existing operations..."
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={submitting || !passwordMatch}
              className="w-full bg-blue-600 text-white py-3.5 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Finalizing Registration...
                </>
              ) : (
                <>
                  Initialize Partnership
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] text-center max-w-xs mx-auto leading-relaxed">
              By submitting, you agree to our institutional audit and verification protocols.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
