import { useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { CheckCircle, Megaphone, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ReferralForm() {
  const { code } = useParams();
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    notes: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post(`${import.meta.env.VITE_API_URL}/leads/public/referral`, {
        ...formData,
        referralCode: code
      });
      setSubmitted(true);
      toast.success('Interest registered successfully');
    } catch (error) {
      toast.error('Failed to submit interest');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-3xl p-12 text-center shadow-xl shadow-slate-200 border border-slate-100 animate-in fade-in zoom-in duration-500">
           <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10" />
           </div>
           <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter mb-4">Interest Certified</h2>
           <p className="text-slate-500 font-medium mb-8">Thank you for your interest in partnering with RPS. Our regional development team will reach out within 24 operational hours.</p>
           <button 
                onClick={() => window.location.reload()}
                className="text-blue-600 font-black text-xs uppercase tracking-widest hover:underline"
            >
                Submit another inquiry
            </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 font-sans">
      <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-2 bg-white rounded-[40px] shadow-2xl shadow-slate-200 overflow-hidden border border-slate-100">
        <div className="bg-slate-900 p-12 text-white flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-10">
                <Megaphone className="w-48 h-48 -rotate-12" />
            </div>
            <div className="relative z-10">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full text-[10px] font-black uppercase tracking-widest mb-8">
                    <ShieldCheck className="w-3 h-3 text-blue-400" />
                    Institutional Partner Program
                </div>
                <h1 className="text-4xl lg:text-5xl font-black leading-none uppercase tracking-tighter mb-6">
                    Expand Your <br/> <span className="text-blue-500">Academic</span> <br/> Horizon.
                </h1>
                <p className="text-slate-400 font-medium max-w-xs leading-relaxed ">Join India's most advanced ERP-driven educational ecosystem and scale your study center operations.</p>
            </div>
            <div className="pt-12 border-t border-white/10 mt-12 relative z-10">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em] mb-4">Trusted by 500+ Centers</p>
                <div className="flex -space-x-3">
                    {[1,2,3,4].map(i => (
                        <div key={i} className="w-8 h-8 rounded-full border-2 border-slate-900 bg-slate-800" />
                    ))}
                </div>
            </div>
        </div>

        <div className="p-12 lg:p-16">
            <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter mb-8 ">Register Interest</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-4">
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Institutional Head Name</label>
                        <input 
                            required
                            className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                            placeholder="Dr. Satish Kumar"
                            value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
                        />
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Email Address</label>
                            <input 
                                type="email"
                                required
                                className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                placeholder="name@center.com"
                                value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})}
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">WhatsApp Number</label>
                            <input 
                                type="tel"
                                required
                                className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                placeholder="+91 00000 00000"
                                value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})}
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Proposed Location / Notes</label>
                        <textarea 
                            rows={3}
                            className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 text-sm font-medium text-slate-900 outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none"
                            placeholder="Briefly describe your existing infrastructure..."
                            value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})}
                        />
                    </div>
                </div>

                <div className="pt-4">
                    <button 
                        type="submit" 
                        disabled={loading}
                        className="w-full bg-slate-900 text-white rounded-2xl py-4 font-black uppercase text-xs tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 disabled:opacity-50"
                    >
                        {loading ? 'Certifying Inquiry...' : 'Synchronize Interest'}
                    </button>
                    <p className="text-center text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-6">
                        Secured by institutional encryption
                    </p>
                </div>
            </form>
        </div>
      </div>
    </div>
  );
}
