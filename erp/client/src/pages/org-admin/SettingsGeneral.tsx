import { useState, useEffect } from 'react';
import { 
  Building2, 
  Upload, 
  Globe, 
  Calendar, 
  Banknote,
  Save,
  Info,
  UserCircle2,
  ImagePlus,
  ShieldCheck,
  LayoutGrid
} from 'lucide-react';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import { Modal } from '@/components/shared/Modal';

export default function SettingsGeneral() {
  const [formData, setFormData] = useState({
    orgName: '',
    timezone: '',
    academicYearStart: '',
    academicYearEnd: '',
    currency: '',
    orgLogo: ''
  });
  const [originalData, setOriginalData] = useState<typeof formData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/org-admin/config');
      if (!response.ok) throw new Error('Failed to fetch');
      const data = await response.json();
      // Map based on key-value pairs
      const mapped = { ...formData };
      data.forEach((item: any) => {
        if (item.key === 'ORG_NAME') mapped.orgName = item.value;
        if (item.key === 'TIMEZONE') mapped.timezone = item.value;
        if (item.key === 'ACADEMIC_YEAR_START') mapped.academicYearStart = item.value;
        if (item.key === 'ACADEMIC_YEAR_END') mapped.academicYearEnd = item.value;
        if (item.key === 'CURRENCY') mapped.currency = item.value;
        if (item.key === 'ORG_LOGO') mapped.orgLogo = item.value;
      });
      setFormData(mapped);
      setOriginalData(mapped);
      setLoading(false);
    } catch (error) {
      console.error("Failed to fetch settings", error);
      setLoading(false);
    }
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    try {
      const configArray = [
        { key: 'ORG_NAME', value: formData.orgName, group: 'General' },
        { key: 'TIMEZONE', value: formData.timezone, group: 'General' },
        { key: 'ACADEMIC_YEAR_START', value: formData.academicYearStart, group: 'General' },
        { key: 'ACADEMIC_YEAR_END', value: formData.academicYearEnd, group: 'General' },
        { key: 'CURRENCY', value: formData.currency, group: 'General' }
      ];

      const loadToast = toast.loading('Persisting institutional changes...');
      for (const config of configArray) {
        await api.post('/org-admin/config', config);
      }
      
      toast.success('Institutional Details Updated Successfully', { id: loadToast });
      setOriginalData({ ...formData });
      setIsProfileModalOpen(false);
    } catch (error) {
      console.error("Failed to save settings", error);
      toast.error('Failed to update settings');
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formDataUpload = new FormData();
    formDataUpload.append('logo', file);

    const loadToast = toast.loading('Uploading institutional logo...');
    try {
      const { data } = await api.post('/org-admin/logo', formDataUpload, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const newLogoUrl = `${data.logoUrl}?t=${Date.now()}`;
      setFormData(prev => ({ ...prev, orgLogo: newLogoUrl }));
      // Logo upload is an immediate change, so we don't necessarily need to update originalData here 
      // as the button will enable due to the mismatch.
      toast.success('Logo updated successfully!', { id: loadToast });
    } catch (error) {
      console.error('Logo upload failed', error);
      toast.error('Failed to upload logo', { id: loadToast });
    }
  };

  const isProfileSet = formData.orgName || formData.orgLogo;

  const hasChanges = JSON.stringify(formData) !== JSON.stringify(originalData);

  if (loading) {
    return (
      <div className="p-8 max-w-4xl mx-auto py-32 text-center text-slate-400 italic font-bold animate-pulse">
        Synchronizing Institutional Constants...
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 font-display tracking-tight">Organization Profile</h1>
          <p className="text-slate-500 mt-1 font-medium">Global institutional configuration and branding hub.</p>
        </div>
        <button 
          onClick={() => setIsProfileModalOpen(true)}
          className="px-6 py-3 bg-slate-900 text-white rounded-2xl text-sm font-bold hover:bg-slate-800 transition-all flex items-center shadow-xl active:scale-95"
        >
          {isProfileSet ? (
            <>
              <UserCircle2 className="w-4 h-4 mr-2 text-blue-400" />
              Edit Profile
            </>
          ) : (
            <>
              <ImagePlus className="w-4 h-4 mr-2 text-emerald-400" />
              Add Profile
            </>
          )}
        </button>
      </div>

      {!isProfileSet ? (
        <div className="bg-white rounded-3xl border-2 border-dashed border-slate-200 p-16 text-center shadow-sm">
          <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-400">
            <Building2 className="w-10 h-10" />
          </div>
          <h3 className="text-xl font-bold text-slate-900">No Institutional Profile Set</h3>
          <p className="text-slate-500 mt-2 max-w-md mx-auto">
            Your organization's profile details are required to generate official documents, certificates, and invoices.
          </p>
          <button 
            onClick={() => setIsProfileModalOpen(true)}
            className="mt-8 px-8 py-3 bg-blue-600 text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 hover:scale-105 transition-all"
          >
            Start Setup Now
          </button>
        </div>
      ) : (
        <>
          {/* Main Dashboard View (Read-only) */}
          <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-200 overflow-hidden">
            <div className="bg-slate-900 p-8 text-white flex justify-between items-center relative overflow-hidden">
              <Building2 className="absolute -right-4 -bottom-4 w-32 h-32 text-white/5 rotate-6" />
              <div className="flex items-center gap-6 relative z-10">
                <div className="w-28 h-28 bg-white rounded-3xl p-3 shadow-2xl flex items-center justify-center border-2 border-white/20">
                  <img 
                    src={formData.orgLogo || "/logo-placeholder.png"} 
                    alt="Logo" 
                    className="w-full h-full object-fill rounded-xl shadow-inner" 
                  />
                </div>
                <div>
                  <h2 className="text-3xl font-bold font-display tracking-tight leading-tight">{formData.orgName || 'Unnamed Institution'}</h2>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Global Administrative Authority</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 flex items-start gap-4">
                  <Globe className="w-6 h-6 text-blue-600 shrink-0" />
                  <div>
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Regional Setting</h4>
                    <p className="font-bold text-slate-900">{formData.timezone || 'Not Configured'}</p>
                  </div>
                </div>
                <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 flex items-start gap-4">
                  <Banknote className="w-6 h-6 text-emerald-600 shrink-0" />
                  <div>
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Base Currency</h4>
                    <p className="font-bold text-slate-900">{formData.currency || 'Not Configured'}</p>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 space-y-4">
                 <div className="flex items-center gap-2 mb-2">
                    <Calendar className="w-5 h-5 text-rose-600" />
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Academic Year Cycle</h4>
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Start Date</p>
                        <p className="text-lg font-bold text-slate-900">{formData.academicYearStart || 'N/A'}</p>
                    </div>
                    <div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">End Date</p>
                        <p className="text-lg font-bold text-slate-900">{formData.academicYearEnd || 'N/A'}</p>
                    </div>
                 </div>
              </div>
            </div>

            <div className="bg-slate-900 p-4 flex items-center justify-center gap-2">
               <ShieldCheck className="w-4 h-4 text-emerald-400" />
               <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Authenticated Operational Constants</p>
            </div>
          </div>
        </>
      )}

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6 flex items-start gap-4 group">
        <Info className="w-6 h-6 text-blue-600 shrink-0 mt-0.5 group-hover:rotate-12 transition-transform" />
        <p className="text-xs font-bold text-blue-800 leading-relaxed font-display">
          These institutional markers propagate system-wide. Logo updates immediately affect PDF headers, invoice watermarks, and 
          portal branding modules. Ensure all regional settings match your local legal requirements.
        </p>
      </div>

      <Modal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        title={isProfileSet ? "Update Institutional Profile" : "Add Institutional Profile"}
        maxWidth="4xl"
      >
        <div className="space-y-8 py-4">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
            {/* Branding Column */}
            <div className="md:col-span-4">
               <div className="bg-slate-900 rounded-3xl p-8 text-center space-y-4 relative overflow-hidden h-full flex flex-col items-center justify-center min-h-[300px]">
                <div className="relative z-10 w-full">
                  <div className="w-44 h-44 bg-white rounded-3xl mx-auto p-4 shadow-2xl relative group overflow-hidden border-4 border-white/10">
                      <img 
                        src={formData.orgLogo || "/logo-placeholder.png"} 
                        alt="Preview" 
                        className={`w-full h-full object-fill rounded-2xl ${!formData.orgLogo && 'opacity-20 grayscale'}`} 
                      />
                      <label className="absolute inset-0 bg-slate-900/80 opacity-0 group-hover:opacity-100 transition-all flex flex-col items-center justify-center cursor-pointer text-white backdrop-blur-sm">
                          <Upload className="w-8 h-8 mb-2 animate-bounce" />
                          <span className="text-xs font-bold uppercase tracking-widest">Update Logo</span>
                          <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} />
                      </label>
                  </div>
                  <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-6">Institutional Identity Asset</p>
                </div>
               </div>
            </div>

            {/* Form Column */}
            <div className="md:col-span-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Legal Name</label>
                        <input 
                            type="text" 
                            className="w-full px-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                            placeholder="e.g. Cambridge Academy"
                            value={formData.orgName}
                            onChange={e => setFormData({...formData, orgName: e.target.value})}
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Regional Timezone</label>
                        <div className="relative">
                          <select 
                              className="w-full px-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                              value={formData.timezone}
                              onChange={e => setFormData({...formData, timezone: e.target.value})}
                          >
                              <option value="">Select Timezone</option>
                              <option>(GMT+05:30) Mumbai, Kolkata</option>
                              <option>UTC (00:00)</option>
                          </select>
                          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                             <Globe className="w-4 h-4" />
                          </div>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Session Start</label>
                        <input 
                            type="date" 
                            className="w-full px-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500"
                            value={formData.academicYearStart}
                            onChange={e => setFormData({...formData, academicYearStart: e.target.value})}
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Session End</label>
                        <input 
                            type="date" 
                            className="w-full px-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500"
                            value={formData.academicYearEnd}
                            onChange={e => setFormData({...formData, academicYearEnd: e.target.value})}
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Transactional Currency</label>
                        <div className="relative">
                          <select 
                              className="w-full px-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                              value={formData.currency}
                              onChange={e => setFormData({...formData, currency: e.target.value})}
                          >
                              <option value="">Select Currency</option>
                              <option>INR (₹)</option>
                              <option>USD ($)</option>
                          </select>
                          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                             <Banknote className="w-4 h-4" />
                          </div>
                        </div>
                    </div>
                    <div className="flex items-end">
                         <div className="p-4 bg-slate-100/50 rounded-2xl flex items-center gap-3 w-full border border-slate-200/50">
                            <LayoutGrid className="w-4 h-4 text-slate-400 shrink-0" />
                            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest leading-tight">
                                Academic years map reports and fiscal cycles.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="pt-4">
                  <button 
                      onClick={() => handleSave()}
                      disabled={!hasChanges}
                      className="w-full py-4 bg-blue-600 text-white font-bold rounded-2xl shadow-xl shadow-blue-500/20 hover:scale-[1.01] active:scale-95 transition-all flex items-center justify-center gap-3 group disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                  >
                      <Save className="w-5 h-5 group-hover:rotate-6 transition-transform" />
                      Persist Institutional Settings
                  </button>
                </div>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
