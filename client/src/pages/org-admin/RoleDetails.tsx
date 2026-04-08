import { 
  Shield, 
  ShieldCheck, 
  ShieldAlert, 
  Info, 
  X,
  CheckCircle2,
  AlertCircle,
  Lock,
  Layers,
  Fingerprint
} from 'lucide-react';
import { toSentenceCase } from '@/lib/utils';

interface RoleDetailsProps {
  role: any;
  onClose: () => void;
  onAudit: (roleId: number, isAudited: boolean) => void;
}

export default function RoleDetails({ role, onClose, onAudit }: RoleDetailsProps) {
  if (!role) return null;

  const isVerified = role.isAudited;

  return (
    <div className="flex flex-col max-h-[calc(100vh-120px)] lg:max-h-[85vh] overflow-hidden rounded-3xl bg-white shadow-2xl transition-all duration-300">
      {/* Header: Institutional Glassmorphism Style */}
      <div className="bg-slate-900 px-6 py-6 text-white flex justify-between items-start shrink-0 relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-8 -mt-8 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="flex items-start gap-4 relative z-10 text-left">
          <div className={`p-3.5 rounded-xl backdrop-blur-md border shrink-0 ${
            role.status === 'active' ? 'bg-blue-50/20 border-blue-400/30' : 'bg-slate-500/20 border-slate-400/30'
          }`}>
            <Shield className="w-7 h-7 text-white" />
          </div>
          <div className="flex flex-col items-start text-left">
            <div className="flex items-center gap-3 mb-1.5">
               <p className="text-[9px] text-blue-400 font-black uppercase tracking-[0.2em] leading-none">
                 Institutional Identity
               </p>
               {!role.isCustom && (
                 <span className="bg-white/10 text-white/60 text-[8px] font-bold px-2 py-0.5 rounded border border-white/5 uppercase tracking-widest">
                   System Reserved
                 </span>
               )}
            </div>
            <h2 className="text-2xl font-extrabold tracking-tight font-display text-left leading-tight">
              {toSentenceCase(role.name)}
            </h2>
            <div className="flex items-center gap-2 mt-2 text-slate-400 font-medium text-sm">
               <Fingerprint className="w-3.5 h-3.5" />
               <span className="font-mono text-[10px] opacity-60">ID: {role.id.toString().padStart(4, '0')}</span>
            </div>
          </div>
        </div>
        <button 
          onClick={onClose}
          className="p-2.5 bg-white/5 hover:bg-white/10 rounded-xl transition-all text-white/40 hover:text-white border border-white/5 relative z-20 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6 [scrollbar-width:thin] [scrollbar-color:theme(colors.slate.200)_transparent] bg-white">
        
        {/* Core Description */}
        <section className="space-y-2">
           <div className="flex items-center gap-2 text-slate-400">
             <Info className="w-3 h-3" />
             <h3 className="text-[9px] font-black uppercase tracking-[0.1em]">Functional Scope & Purpose</h3>
           </div>
           <div className="p-5 border border-slate-100 bg-slate-50/50 rounded-2xl relative group hover:border-blue-100 transition-all text-left">
             <p className="text-slate-700 font-bold leading-relaxed text-sm">
               {role.description || "No formal mission statement has been defined for this institutional scope. Please verify functional rights in the governance matrix."}
             </p>
           </div>
        </section>

        {/* Status and Governance Grid */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
           {/* Governance Card */}
           <div className={`p-5 rounded-2xl border transition-all flex flex-col items-start text-left ${
             role.isAdminEligible 
               ? 'border-blue-100 bg-blue-50/20' 
               : 'border-slate-50 bg-slate-50/30 opacity-60 grayscale-[0.5]'
           }`}>
             <div className="flex items-center gap-3 mb-3">
                <div className={`p-2 rounded-xl shrink-0 ${role.isAdminEligible ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-200 text-slate-500'}`}>
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                   <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 leading-none mb-1">Authorization</p>
                   <h4 className="text-sm font-bold text-slate-900 leading-none">Admin Eligibility</h4>
                </div>
             </div>
             <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
               {role.isAdminEligible 
                 ? "Authorized as a Verified Candidate for institutional department management."
                 : "Pre-defined operational role. Restricted from primary department management."
               }
             </p>
           </div>

           {/* Deployment Status */}
           <div className={`p-5 rounded-2xl border transition-all flex flex-col items-start text-left ${
             role.status === 'active' 
               ? 'border-emerald-100 bg-emerald-50/20' 
               : 'border-rose-100 bg-rose-50/20'
           }`}>
             <div className="flex items-center gap-3 mb-3">
                <div className={`p-2 rounded-xl shrink-0 ${role.status === 'active' ? 'bg-emerald-600 text-white shadow-lg' : 'bg-rose-600 text-white shadow-lg'}`}>
                   {role.status === 'active' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                </div>
                <div>
                   <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 leading-none mb-1">Current State</p>
                   <h4 className="text-sm font-bold text-slate-900 leading-none">{toSentenceCase(role.status)}</h4>
                </div>
             </div>
             <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
               {role.status === 'active' 
                 ? "Identity marker is active for user provisioning and audit flows."
                 : "This role has been suspended. Users currently have limited access."
               }
             </p>
           </div>
        </section>

        {/* Technical Data Blocks */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-3">
           <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col items-start text-left space-y-1 overflow-hidden">
              <Layers className="w-3 h-3 text-blue-600" />
              <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Logic Class</p>
              <p className="text-xs font-bold text-slate-900 leading-none">{role.isCustom ? 'Custom' : 'Pre-defined'}</p>
           </div>
           <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col items-start text-left space-y-1 overflow-hidden">
              <Lock className="w-3 h-3 text-emerald-600" />
              <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Mutability</p>
              <p className="text-xs font-bold text-slate-900 leading-none">{role.isCustom ? 'Modifiable' : 'Locked'}</p>
           </div>
           <div className={`p-4 border rounded-2xl flex flex-col items-start text-left space-y-1 overflow-hidden transition-all ${
             isVerified ? 'bg-emerald-50 border-emerald-100' : 'bg-amber-50 border-amber-100'
           }`}>
              {isVerified ? <CheckCircle2 className="w-3 h-3 text-emerald-600" /> : <ShieldAlert className="w-3 h-3 text-amber-600" />}
              <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Audit Status</p>
              <p className={`text-xs font-bold leading-none ${isVerified ? 'text-emerald-700' : 'text-amber-700'}`}>
                {isVerified ? 'Verified' : 'Audit Pending'}
              </p>
           </div>
        </section>

        {/* Governance Notice */}
        <div className="p-6 bg-slate-900 rounded-3xl text-white flex flex-col md:flex-row items-center md:items-start justify-between gap-6 shadow-xl relative overflow-hidden shrink-0">
           <ShieldCheck className="absolute right-0 top-0 -mr-6 -mt-6 w-32 h-32 text-white/5 opacity-40 rotate-12" />
           <div className="max-w-xl relative z-10 text-left flex flex-col items-center md:items-start text-center md:text-left">
              <h5 className="text-[11px] font-bold mb-1.5 flex items-center gap-2">
                 {isVerified ? <ShieldCheck className="w-3.5 h-3.5 text-blue-400" /> : <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />}
                 {!role.isCustom ? "Default Permissions Mapped" : (isVerified ? "Compliance Audit Complete" : "Permission Mapping Required")}
              </h5>
              <p className="text-[10px] text-slate-400 leading-relaxed font-medium">
                 {!role.isCustom 
                   ? "Pre-defined institutional permissions are automatically assigned to this reserved role." 
                   : (isVerified 
                       ? "Verification audit complete. This functional identity is compliant with current institutional safety policies."
                       : "Functional rights for this role must be manually defined in the Institutional Permission Matrix before verification audit.")}
              </p>
           </div>
           
           <div className="flex items-center gap-3 relative z-20">
             {role.isCustom && !isVerified && (
                <button 
                  onClick={() => onAudit(role.id, true)}
                  className="px-6 py-2.5 bg-emerald-600 text-white font-bold text-[10px] uppercase tracking-widest rounded-xl shadow-lg hover:bg-emerald-500 hover:scale-105 active:scale-95 transition-all shrink-0 cursor-pointer"
                >
                  Verify Role
                </button>
             )}
             <button 
               onClick={onClose}
               className="px-6 py-2.5 bg-blue-600 text-white font-bold text-[10px] uppercase tracking-widest rounded-xl shadow-lg hover:bg-blue-500 hover:scale-105 active:scale-95 transition-all shrink-0 cursor-pointer"
             >
               Close View
             </button>
           </div>
        </div>
      </div>
    </div>
  );
}
