import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ShieldCheck, Building2, Phone, Mail, FileText, CheckCircle2, ArrowRight, Loader2, Globe } from 'lucide-react';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export default function CenterRegistration() {
  const { bdeId } = useParams();
  const navigate = useNavigate();
  const [bdeInfo, setBdeInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    description: '',
    infrastructure: {
      labCapacity: '',
      classroomCount: '',
      internetSpeed: '',
    }
  });

  useEffect(() => {
    fetchBdeInfo();
  }, [bdeId]);

  const fetchBdeInfo = async () => {
    try {
      const res = await axios.get(`${API_URL}/public/bde-info/${bdeId}`);
      setBdeInfo(res.data);
    } catch (error) {
      console.error('Invalid BDE ID:', error);
      toast.error('Invalid or expired referral link');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await axios.post(`${API_URL}/public/register-center`, {
        ...formData,
        bdeId
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
            Your institutional profile has been established. Our regional head will contact you within 24 hours for verification.
          </p>
          <button 
            onClick={() => navigate('/login')}
            className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black uppercase text-xs tracking-[0.2em] hover:bg-black transition-all shadow-xl"
          >
            Return to Portal
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row">
      {/* Left Panel: Branding & BDE Context */}
      <div className="lg:w-2/5 bg-slate-900 p-12 lg:p-20 text-white flex flex-col justify-between relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl -mr-48 -mt-48"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-600/10 rounded-full blur-3xl -ml-32 -mb-32"></div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-12">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center">
               <ShieldCheck className="w-6 h-6 text-slate-900" />
            </div>
            <span className="text-xl font-black tracking-tighter uppercase italic">IITS RPS</span>
          </div>

          <h1 className="text-5xl lg:text-6xl font-black tracking-tighter italic uppercase leading-[0.9] mb-8">
            Institutional <br /> Partnership <br /> <span className="text-blue-500">Growth</span>
          </h1>
          
          <p className="text-slate-400 font-bold text-lg max-w-sm leading-relaxed mb-12">
            Partner with India's fastest growing institutional ecosystem. Expand your reach and impact.
          </p>

          <div className="space-y-6">
            <div className="flex items-center gap-4 bg-white/5 p-4 rounded-2xl border border-white/10 w-fit">
              <Globe className="w-5 h-5 text-blue-400" />
              <span className="text-xs font-black uppercase tracking-widest text-slate-300">Global Standards</span>
            </div>
            <div className="flex items-center gap-4 bg-white/5 p-4 rounded-2xl border border-white/10 w-fit">
              <Building2 className="w-5 h-5 text-indigo-400" />
              <span className="text-xs font-black uppercase tracking-widest text-slate-300">Unified Governance</span>
            </div>
          </div>
        </div>

        {bdeInfo && (
          <div className="mt-20 relative z-10">
            <div className="p-8 bg-white/5 border border-white/10 rounded-[2.5rem] backdrop-blur-md">
              <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.3em] mb-3">Partner Invitation</p>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center font-black text-xl italic">
                  {bdeInfo.name?.charAt(0)}
                </div>
                <div>
                  <h4 className="font-black text-lg uppercase tracking-tight">{bdeInfo.name}</h4>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest leading-none mt-1">Institutional BDE</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Right Panel: Form */}
      <div className="flex-1 p-8 lg:p-20 flex items-center justify-center">
        <div className="max-w-xl w-full">
          <div className="mb-12">
            <h2 className="text-3xl font-black text-slate-900 uppercase italic tracking-tighter">Registration Protocol</h2>
            <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px] mt-2">All fields are mandatory for audit clearance.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block pl-1">Center Legal Name</label>
                <div className="relative">
                  <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                  <input 
                    type="text" 
                    required
                    className="w-full bg-white border-2 border-slate-100 rounded-2xl pl-12 pr-6 py-4 text-sm font-bold focus:border-blue-600 focus:ring-0 transition-all shadow-sm"
                    placeholder="Acme Institute"
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block pl-1">Primary Email</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                  <input 
                    type="email" 
                    required
                    className="w-full bg-white border-2 border-slate-100 rounded-2xl pl-12 pr-6 py-4 text-sm font-bold focus:border-blue-600 focus:ring-0 transition-all shadow-sm"
                    placeholder="center@example.com"
                    value={formData.email}
                    onChange={e => setFormData({...formData, email: e.target.value})}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block pl-1">Contact Phone</label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                  <input 
                    type="tel" 
                    required
                    className="w-full bg-white border-2 border-slate-100 rounded-2xl pl-12 pr-6 py-4 text-sm font-bold focus:border-blue-600 focus:ring-0 transition-all shadow-sm"
                    placeholder="+91-XXXXX-XXXXX"
                    value={formData.phone}
                    onChange={e => setFormData({...formData, phone: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block pl-1">Internet Speed (Mbps)</label>
                <div className="relative">
                  <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                  <input 
                    type="text" 
                    className="w-full bg-white border-2 border-slate-100 rounded-2xl pl-12 pr-6 py-4 text-sm font-bold focus:border-blue-600 focus:ring-0 transition-all shadow-sm"
                    placeholder="100 Mbps"
                    value={formData.infrastructure.internetSpeed}
                    onChange={e => setFormData({...formData, infrastructure: { ...formData.infrastructure, internetSpeed: e.target.value}})}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block pl-1">Institutional Description</label>
              <div className="relative">
                <FileText className="absolute left-4 top-6 w-4 h-4 text-slate-300" />
                <textarea 
                  rows={4}
                  className="w-full bg-white border-2 border-slate-100 rounded-2xl pl-12 pr-6 py-4 text-sm font-medium focus:border-blue-600 focus:ring-0 transition-all shadow-sm"
                  placeholder="Tell us about your center and existing operations..."
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={submitting}
              className="w-full bg-blue-600 text-white py-5 rounded-3xl font-black uppercase text-xs tracking-[0.3em] shadow-2xl shadow-blue-100 hover:bg-blue-700 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Finalizing Registration...
                </>
              ) : (
                <>
                  Initialize Partnership
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>

            <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] text-center max-w-xs mx-auto leading-relaxed">
              By submitting, you agree to our institutional audit and verification protocols.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
