import { RefreshCcw, ServerCrash, Home } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSystemStore } from '@/store/systemStore'; // New Import

export default function ServerError() {
  const navigate = useNavigate();
  const setSystemOffline = useSystemStore((state) => state.setSystemOffline); // New Hook

  const handleReload = () => {
    setSystemOffline(false); // Reset state
    window.location.reload();
  };

  const handleGoHome = () => {
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Dynamic Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-indigo-500/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-rose-500/10 rounded-full blur-[120px] animate-pulse" />
      </div>

      <div className="max-w-2xl w-full text-center space-y-12 relative z-10">
        {/* Error Graphic */}
        <div className="flex justify-center">
          <div className="relative">
            <div className="absolute inset-0 bg-rose-500/20 rounded-full blur-3xl scale-150 animate-pulse" />
            <div className="w-32 h-32 bg-slate-900 border-2 border-rose-500/30 rounded-3xl flex items-center justify-center relative shadow-2xl skew-y-3 hover:skew-y-0 transition-transform duration-500">
              <ServerCrash className="w-16 h-16 text-rose-500 drop-shadow-[0_0_15px_rgba(244,63,94,0.5)]" />
            </div>
            <div className="absolute -top-2 -right-2 w-8 h-8 bg-rose-500 rounded-full flex items-center justify-center border-4 border-slate-950 animate-bounce">
              <span className="text-white text-[10px] font-bold">500</span>
            </div>
          </div>
        </div>

        {/* Messaging */}
        <div className="space-y-4">
          <h1 className="text-5xl font-black text-white tracking-tighter sm:text-6xl">
            SYSTEM <span className="text-rose-500">OFFLINE</span>
          </h1>
          <p className="text-slate-400 text-lg max-w-lg mx-auto font-medium leading-relaxed">
            The institutional data bridge has encountered a critical telemetry failure. 
            Backend protocols are currently unresponsive or unreachable.
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <button
            onClick={handleReload}
            className="group relative w-full sm:w-auto px-8 py-4 bg-white text-slate-950 font-bold rounded-2xl shadow-[0_0_30px_rgba(255,255,255,0.15)] hover:shadow-[0_0_50px_rgba(255,255,255,0.25)] hover:scale-105 transition-all duration-300 flex items-center justify-center overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
            <RefreshCcw className="w-5 h-5 mr-3 group-hover:rotate-180 transition-transform duration-700" />
            RELOAD SYSTEM
          </button>
          
          <button
            onClick={handleGoHome}
            className="w-full sm:w-auto px-8 py-4 bg-slate-900 text-slate-300 font-bold rounded-2xl border border-slate-800 hover:border-slate-700 hover:text-white hover:bg-slate-800 transition-all duration-300 flex items-center justify-center"
          >
            <Home className="w-5 h-5 mr-3" />
            RETURN TO BASE
          </button>
        </div>

        {/* Technical Footer */}
        <div className="pt-12 border-t border-slate-900 max-w-md mx-auto">
          <div className="flex items-center justify-center space-x-6">
            <div className="text-left">
              <p className="text-[10px] uppercase font-bold text-slate-600 tracking-[0.2em]">Error Code</p>
              <p className="text-sm font-mono text-rose-500/80">INST_500_FAIL</p>
            </div>
            <div className="w-px h-8 bg-slate-900" />
            <div className="text-left">
              <p className="text-[10px] uppercase font-bold text-slate-600 tracking-[0.2em]">Module status</p>
              <p className="text-sm font-mono text-amber-500/80">RECONNECTING...</p>
            </div>
          </div>
        </div>
      </div>

      {/* Aesthetic Micro-details */}
      <div className="absolute bottom-8 left-8 text-slate-900 font-mono text-[10px] tracking-widest hidden md:block">
        IITS INSTITUTIONAL CORE // GOVERNANCE_RECOVERY_PROTOCOL
      </div>
    </div>
  );
}
