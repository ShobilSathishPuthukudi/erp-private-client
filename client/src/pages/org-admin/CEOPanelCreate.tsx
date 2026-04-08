import { useState, useEffect } from 'react';
import { 
  Shield, 
  CheckCircle2, 
  AlertCircle,
  X,
  Eye,
  EyeOff
} from 'lucide-react';

interface CEOPanelCreateProps {
  onClose: () => void;
  onSuccess: () => void;
  initialData?: any;
}

export default function CEOPanelCreate({ onClose, onSuccess, initialData }: CEOPanelCreateProps) {
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    email: initialData?.ceoUser?.email || '',
    password: initialData?.devCredential || '',
    visibilityScope: initialData?.visibilityScope || [] as string[],
    status: initialData?.status || 'Active'
  });

  const [departments] = useState<string[]>([
    'Administration',
    'Operations',
    'Finance',
    'Human Resources',
    'Marketing',
    'Sales & CRM',
    'Academic Operations Department',
    'Employee Performance'
  ]);

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [emailError, setEmailError] = useState('');

  const isNameValid = formData.name.length >= 3 && formData.name.length <= 50;
  const isEmailValid = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/.test(formData.email) && formData.email.length <= 30;
  const isPasswordValid = initialData 
    ? (!formData.password || (formData.password.length >= 6 && formData.password.length <= 30))
    : (formData.password.length >= 6 && formData.password.length <= 30);
  const isScopeValid = formData.visibilityScope.length > 0;
  const isFormValid = isNameValid && isEmailValid && isPasswordValid && isScopeValid;

  useEffect(() => {
    // Deliberately bypassed dynamic fetching to strictly restrict executive visibility scope options
    // to top-tier institutional pillars only. Sub-departments and centers should not be individual CEO visibility targets.
  }, []);

  const toggleScope = (dept: string) => {
    setFormData(prev => ({
      ...prev,
      visibilityScope: prev.visibilityScope.includes(dept) 
        ? prev.visibilityScope.filter((d: string) => d !== dept) 
        : [...prev.visibilityScope, dept]
    }));
  };

  return (
    <div className="bg-white overflow-hidden transition-all duration-300 flex flex-col max-h-[calc(100vh-100px)] lg:max-h-[85vh]">
      <div className="bg-slate-900 p-6 text-white flex justify-between items-center shrink-0 sticky top-0 z-10 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="bg-white/20 p-2 rounded-xl backdrop-blur-md">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest leading-none mb-1">
              {initialData ? 'Panel Editor' : 'Infrastructure Service'}
            </p>
            <h2 className="text-xl font-bold tracking-tight">
              {initialData ? `Edit ${initialData.name}` : 'CEO Instance Provisioner'}
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

      <form className="flex-1 flex flex-col overflow-hidden" 
        onSubmit={async (e) => {
          e.preventDefault();
          setSubmitted(true);
          setEmailError('');
          if (!isFormValid) return;

          setLoading(true);
          try {
            const url = initialData ? `/api/org-admin/ceo-panels/${initialData.id}` : '/api/org-admin/ceo-panels';
            const method = initialData ? 'PUT' : 'POST';
            const response = await fetch(url, {
              method,
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(formData)
            });
            if (response.ok) {
              onSuccess();
              onClose();
            } else {
              const errData = await response.json();
              const errorMsg = errData.details || errData.error || 'Failed to provision';
              if (errorMsg.toLowerCase().includes('email') || errorMsg.toLowerCase().includes('provisioned')) {
                setEmailError('Institutional identity already provisioned for this email.');
              } else {
                window.alert(`Error: ${errorMsg}`);
              }
            }
          } catch (error) {
            console.error("Failed to save CEO panel", error);
            window.alert('Network error while provisioning panel.');
          } finally {
            setLoading(false);
          }
        }}
      >
        <div className="flex-1 overflow-y-auto p-10 min-h-0 custom-scrollbar">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
          {/* Left Column: Identity & Access */}
          <div className="space-y-5">
            <div className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-end justify-between px-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">CEO Panel Label</label>
                  {formData.name.length > 0 && <span className={`text-[10px] font-bold ${!isNameValid ? 'text-rose-500' : 'text-slate-400'}`}>3-50 chars</span>}
                </div>
                <input 
                  type="text" 
                  placeholder="CEO - Academic Division"
                  minLength={3}
                  maxLength={50}
                  className={`w-full px-5 py-4 bg-slate-50 border rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium text-slate-900 ${submitted && !isNameValid ? 'border-rose-500 bg-rose-50/50' : 'border-slate-200'}`}
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
                {submitted && !isNameValid && (
                  <p className="text-xs text-rose-500 font-bold px-1 mt-1">CEO Panel Label must be 3 to 50 characters.</p>
                )}
                {(!submitted || isNameValid) && (
                  <p className="text-[10px] text-slate-400 px-1 text-left">Unique label for this executive oversight instance.</p>
                )}
              </div>

              <div className="space-y-3">
                <div className="flex items-end justify-between px-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Login ID (Institutional Email)</label>
                  {formData.email.length > 0 && <span className={`text-[10px] font-bold ${!isEmailValid ? 'text-rose-500' : 'text-slate-400'}`}>Max 30 chars</span>}
                </div>
                <input 
                  type="email" 
                  name="ceo-email"
                  placeholder="ceo@institution.edu"
                  autoComplete="off"
                  disabled={!!initialData}
                  maxLength={30}
                  className={`w-full px-5 py-4 bg-slate-50 border rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium text-slate-900 disabled:opacity-60 ${submitted && !isEmailValid ? 'border-rose-500 bg-rose-50/50' : 'border-slate-200'}`}
                  value={formData.email}
                  onChange={(e) => {
                    setFormData({ ...formData, email: e.target.value });
                    if (emailError) setEmailError('');
                  }}
                />
                {submitted && !isEmailValid && (
                  <p className="text-xs text-rose-500 font-bold px-1 mt-1">Please enter a valid institution email prefix.</p>
                )}
                {emailError && (
                  <p className="text-xs text-rose-500 font-bold px-1 mt-1 animate-in fade-in">{emailError}</p>
                )}
              </div>

                <div className="space-y-3">
                  <div className="flex items-end justify-between px-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Access Password</label>
                    {formData.password.length > 0 && <span className={`text-[10px] font-bold ${!isPasswordValid ? 'text-rose-500' : 'text-slate-400'}`}>6-30 chars</span>}
                  </div>
                  <div className="relative">
                    <input 
                      type={showPassword ? "text" : "password"} 
                      name="ceo-password"
                      placeholder="Institutional credential..."
                      autoComplete="new-password"
                      minLength={6}
                      maxLength={30}
                      className={`w-full px-5 py-4 bg-slate-50 border rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium text-slate-900 pr-14 ${submitted && !isPasswordValid ? 'border-rose-500 bg-rose-50/50' : 'border-slate-200'}`}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 p-2 hover:bg-slate-200 rounded-xl text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {submitted && !isPasswordValid && (
                    <p className="text-xs text-rose-500 font-bold px-1 mt-1">Access Password must be exactly 6 to 30 characters.</p>
                  )}
                </div>
            </div>

            <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-5 flex items-start gap-4 mx-1">
              <AlertCircle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <p className="text-[11px] font-medium text-blue-800 leading-relaxed text-left">
                <span className="block font-black uppercase tracking-wider text-[9px] mb-1">Administrative Alert</span>
                The provisioned executive identity will only be authorized to access telemetry from the specific visibility scope selected on the right. Scoped data includes Finance, HR, Employee Performance, and Operational logs.
              </p>
            </div>
          </div>

          {/* Right Column: Visibility Scope */}
          <div className="space-y-6">
            <div className="flex flex-col gap-2 border-b border-slate-100 pb-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                  Initial Visibility Scope <span className="text-rose-500">*</span>
                </label>
                <div className="flex gap-3">
                  <button 
                    type="button" 
                    onClick={() => setFormData({ ...formData, visibilityScope: departments })}
                    className="text-[10px] font-bold text-blue-600 hover:text-blue-700 bg-blue-50 px-3 py-1 rounded-full border border-blue-100 transition-colors"
                  >
                    Select All
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setFormData({ ...formData, visibilityScope: [] })}
                    className="text-[10px] font-bold text-slate-400 hover:text-slate-500 bg-slate-50 px-3 py-1 rounded-full border border-slate-100 transition-colors"
                  >
                    Clear Selection
                  </button>
                </div>
              </div>
              {submitted && !isScopeValid && (
                <p className="text-xs text-rose-500 font-bold px-1 animate-in fade-in">Please select at least one priority visibility tier.</p>
              )}
            </div>
            
            <div className="grid grid-cols-2 gap-3 max-h-[380px] overflow-y-auto pr-2 custom-scrollbar">
              {departments.map((dept) => (
                <button
                  key={dept}
                  type="button"
                  onClick={() => toggleScope(dept)}
                  className={`flex items-center gap-3 p-4 rounded-2xl border-2 text-left transition-all ${
                    formData.visibilityScope.includes(dept)
                    ? 'border-blue-600 bg-blue-50 text-blue-900 shadow-md translate-y-[-1px]'
                    : 'border-slate-100 hover:border-slate-300 text-slate-600 bg-white'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-colors ${
                    formData.visibilityScope.includes(dept) ? 'bg-blue-600 border-blue-600' : 'bg-white border-slate-200'
                  }`}>
                    {formData.visibilityScope.includes(dept) && <CheckCircle2 className="w-3 h-3 text-white" />}
                  </div>
                  <span className="text-xs font-bold truncate">{dept}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

        {/* Footer Actions */}
        <div className="flex justify-end gap-3 p-8 bg-slate-50 border-t border-slate-200 shrink-0">
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
                {initialData ? 'Synchronizing...' : 'Provisioning...'}
              </span>
            ) : (
              <span>
                {initialData ? 'Save Changes' : 'CONFIRM AND PROVISION CEO'}
              </span>
            )}
          </button>
        </div>
  </form>

</div>
  );
}
