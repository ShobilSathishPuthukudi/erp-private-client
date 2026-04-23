import { useState } from 'react';
import { 
  Shield, 
  X, 
  Info
} from 'lucide-react';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';

interface RoleCreateProps {
  initialData?: any;
  onClose: () => void;
  onSuccess: () => void;
}

export default function RoleCreate({ initialData, onClose, onSuccess }: RoleCreateProps) {
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [backendNameError, setBackendNameError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    description: initialData?.description || '',
    status: initialData?.status || 'active',
    isAdminEligible: initialData?.isAdminEligible || false
  });

  const isNameValid = formData.name.length >= 3 && formData.name.length <= 30;
  const isDescValid = formData.description.trim().length > 0 && formData.description.length <= 100;
  const isFormValid = isNameValid && isDescValid;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    if (!isFormValid) return;

    try {
      setLoading(true);
      if (initialData) {
        await api.put(`/org-admin/roles/${initialData.id}`, formData);
        toast.success('Institutional role updated');
      } else {
        await api.post('/org-admin/roles', formData);
        toast.success('New institutional role provisioned');
      }
      onSuccess();
    } catch (error: any) {
      const errMsg = error.response?.data?.error;
      if (errMsg === 'Role identifier already exists') {
        setBackendNameError(errMsg);
      } else {
        toast.error(errMsg || 'Failed to persist role configuration');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col max-h-[calc(100vh-120px)] lg:max-h-[85vh] transition-all duration-300">
      {/* Header: Dark Institutional Style - Sticky */}
      <div className="bg-slate-900 p-6 text-white flex justify-between items-center shrink-0 border-b border-slate-800 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="bg-white/20 p-2 rounded-xl backdrop-blur-md">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest leading-none mb-1">
              Infrastructure Service
            </p>
            <h2 className="text-xl font-bold tracking-tight">
              {initialData ? `Configure ${initialData.name}` : 'Institutional Role Provisioner'}
            </h2>
          </div>
        </div>
        <button 
          onClick={onClose}
          className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white/60 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
        <div className="flex-1 overflow-y-auto p-10 space-y-8 min-h-0 [scrollbar-width:thin] [scrollbar-color:theme(colors.slate.200)_transparent]">
          <div className="space-y-6">
            <div className="space-y-3">
              <div className="flex items-end justify-between px-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Role Identifier <span className="text-rose-500">*</span></label>
                {formData.name.length > 0 && <span className={`text-[10px] font-bold ${!isNameValid ? 'text-rose-500' : 'text-slate-400'}`}>3-30 chars</span>}
              </div>
              <input 
                type="text" 
                disabled={initialData && !initialData.isCustom}
                minLength={3}
                maxLength={30}
                placeholder="Regional Director, Academic Audit Lead" 
                className={`w-full px-5 py-4 bg-slate-50 border rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium text-slate-900 disabled:opacity-60 ${(submitted && !isNameValid) || backendNameError ? 'border-rose-500 bg-rose-50/50' : 'border-slate-200'}`}
                value={formData.name}
                onChange={(e) => {
                  setFormData({ ...formData, name: e.target.value });
                  setBackendNameError(null);
                }}
              />
              {((submitted && !isNameValid) || backendNameError) && (
                <p className="text-xs text-rose-500 font-bold px-1 mt-1">
                  {backendNameError || 'Role Identifier must be between 3 and 30 characters.'}
                </p>
              )}
              {!backendNameError && (!submitted || isNameValid) && (
                <p className="text-[10px] text-slate-400 px-1 text-left">Defining the institutional marker for this scope of authority.</p>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex items-end justify-between px-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Functional Description <span className="text-rose-500">*</span></label>
                {formData.description.length > 0 && <span className={`text-[10px] font-bold ${!isDescValid ? 'text-rose-500' : 'text-slate-400'}`}>Max 100 chars</span>}
              </div>
              <textarea 
                rows={3}
                maxLength={100}
                placeholder="Define the scope and responsibilities assigned to this role..." 
                className={`w-full px-5 py-4 bg-slate-50 border rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium text-slate-900 resize-none ${submitted && !isDescValid ? 'border-rose-500 bg-rose-50/50' : 'border-slate-200'}`}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
              {submitted && !isDescValid && (
                <p className="text-xs text-rose-500 font-bold px-1 mt-1">
                  {formData.description.trim().length === 0 ? 'Functional Description is required.' : 'Functional Description cannot exceed 100 characters.'}
                </p>
              )}
            </div>



            <div className="space-y-4">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Governance Setting</label>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, isAdminEligible: !formData.isAdminEligible })}
                className={`w-full flex items-center justify-between px-6 py-5 rounded-2xl border-2 transition-all ${
                  formData.isAdminEligible 
                    ? 'border-blue-600 bg-blue-50/30 shadow-sm shadow-blue-500/10' 
                    : 'border-slate-100 bg-slate-50/50 grayscale opacity-50 shadow-sm'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`p-2.5 rounded-xl transition-all duration-300 ${formData.isAdminEligible ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'bg-slate-200 text-slate-500'}`}>
                    <Shield className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-bold text-slate-900 uppercase tracking-tight">Verified Admin Candidate</p>
                    <p className="text-[10px] font-medium text-slate-500 leading-tight">Enable if users with this role can manage departments.</p>
                  </div>
                </div>
                <div className={`w-11 h-6 rounded-full p-1 transition-all duration-300 flex items-center ${formData.isAdminEligible ? 'bg-blue-600' : 'bg-slate-300'}`}>
                  <div className={`w-4 h-4 bg-white rounded-full transition-all duration-300 shadow-sm ${formData.isAdminEligible ? 'translate-x-5' : 'translate-x-0'}`} />
                </div>
              </button>
            </div>
          </div>

          <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-6 flex items-start gap-4 mx-1">
            <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="block font-black uppercase tracking-wider text-[9px] text-blue-800">Governance Notice</span>
              <p className="text-[11px] font-medium text-blue-900/70 leading-relaxed">
                Provisioning a new institutional role creates a global identity marker across the ERP. 
                You must manually define its permissions in the <span className="text-blue-600 font-bold">Master Permission Matrix</span> 
                to grant functional access to specific modules. Standard roles are protected from deactivation.
              </p>
            </div>
          </div>
        </div>

        {/* Footer Actions: Scoped to Slate Style - Sticky Bottom */}
        <div className="flex justify-end gap-3 p-8 bg-slate-50 border-t border-slate-200 shrink-0 sticky bottom-0 z-10 rounded-b-2xl">
          <button 
            type="button"
            onClick={onClose}
            className="px-8 py-3.5 bg-white text-slate-600 font-bold text-xs uppercase tracking-widest rounded-2xl hover:bg-slate-50 hover:scale-105 active:scale-95 transition-all border border-slate-200 shadow-sm"
          >
            Cancel
          </button>
          <button 
            type="submit"
            disabled={loading}
            className="px-8 py-3.5 bg-slate-900 text-white font-bold text-xs uppercase tracking-widest rounded-2xl shadow-xl shadow-slate-900/10 hover:bg-slate-800 hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                Provisioning...
              </span>
            ) : (
              <span>
                {initialData ? 'Save Changes' : 'Confirm & Provision Role'}
              </span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
