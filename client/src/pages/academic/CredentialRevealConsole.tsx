import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import { Clock, Key, EyeOff, Copy, ShieldAlert } from 'lucide-react';

interface Props {
  requestId: number;
  onExpiry: () => void;
}

export default function CredentialRevealConsole({ requestId, onExpiry }: Props) {
  const [credentials, setCredentials] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState(1800); // 30 mins
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCredentials();
  }, [requestId]);

  const fetchCredentials = async () => {
    try {
      const res = await api.get(`/academic/credentials/reveal/${requestId}`);
      setCredentials(res.data);
    } catch (error) {
       toast.error('Reveal window expired or unauthorized');
       onExpiry();
    } finally {
       setLoading(false);
    }
  };

  useEffect(() => {
    if (timeLeft <= 0) {
      onExpiry();
      return;
    }
    const timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  if (loading) return <div className="p-12 text-center animate-pulse">Initiating Security Reveal...</div>;

  return (
    <div className="bg-slate-900 text-white rounded-[32px] p-8 lg:p-12 shadow-2xl relative overflow-hidden">
       <div className="absolute top-0 right-0 p-12 opacity-5 translate-x-12 -translate-y-12">
          <Clock className="w-64 h-64" />
       </div>

       <div className="relative z-10 space-y-10">
          <div className="flex justify-between items-start">
             <div>
                <h3 className="text-3xl font-black uppercase tracking-tighter mb-2">Authenticated Reveal</h3>
                <p className="text-slate-400 text-xs font-medium ">High-security window authorized by Finance. Document and destroy upon closure.</p>
             </div>
             <div className="bg-rose-500/10 border border-rose-500/20 px-6 py-4 rounded-3xl flex flex-col items-center gap-1 min-w-[120px]">
                <Clock className="w-5 h-5 text-rose-500 animate-pulse" />
                <p className="font-mono text-2xl font-black text-rose-500 tracking-tighter">{formatTime(timeLeft)}</p>
                <p className="text-[9px] font-black uppercase text-rose-400 tracking-widest">Self-Destruct</p>
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <CredentialCard icon={<Key />} label="System UID" value={credentials.loginId} />
             <CredentialCard icon={<EyeOff />} label="Access Token" value={credentials.password} sensitive />
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex gap-3 text-slate-400 text-[10px] font-bold leading-relaxed">
             <ShieldAlert className="w-4 h-4 shrink-0 text-amber-500" />
             Access will be physically destroyed upon the conclusion of the countdown. Copying or storing these credentials outside the ERP is a strict violation of forensic institutional protocol.
          </div>
       </div>
    </div>
  );
}

function CredentialCard({ icon, label, value, sensitive }: any) {
  const [show, setShow] = useState(!sensitive);
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col gap-1 hover:bg-white/10 transition-colors group">
       <div className="flex justify-between items-center mb-2">
          <div className="w-8 h-8 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center">
             {icon}
          </div>
          <button 
             onClick={() => {
                navigator.clipboard.writeText(value);
                toast.success(`${label} copied`);
             }}
             className="text-slate-500 hover:text-white transition-colors"
          >
             <Copy className="w-4 h-4" />
          </button>
       </div>
       <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{label}</p>
       <div className="flex justify-between items-center">
          <p className="font-mono text-lg font-black tracking-tighter text-blue-400 truncate">
             {show ? value : '••••••••••••••••'}
          </p>
          {sensitive && (
             <button onClick={() => setShow(!show)} className="text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-white underline">
                {show ? 'Hide' : 'Reveal'}
             </button>
          )}
       </div>
    </div>
  );
}
