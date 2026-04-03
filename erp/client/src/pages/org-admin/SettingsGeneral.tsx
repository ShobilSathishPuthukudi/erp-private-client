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
  ShieldCheck,
  LayoutGrid,
  X
} from 'lucide-react';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import { Modal } from '@/components/shared/Modal';
import { useOrgStore } from '@/store/orgStore';

export default function SettingsGeneral() {
  const updateOrgStore = useOrgStore(state => state.updateConfig);
  const [formData, setFormData] = useState({
    orgName: '',
    orgShortName: '',
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
        if (item.key === 'ORG_SHORT_NAME') mapped.orgShortName = item.value;
        if (item.key === 'TIMEZONE') mapped.timezone = item.value;
        if (item.key === 'ACADEMIC_YEAR_START') mapped.academicYearStart = item.value;
        if (item.key === 'ACADEMIC_YEAR_END') mapped.academicYearEnd = item.value;
        if (item.key === 'CURRENCY') mapped.currency = item.value;
        if (item.key === 'ORG_LOGO') mapped.orgLogo = item.value;
      });
      setFormData(mapped);
      setOriginalData(mapped);
      updateOrgStore({ orgName: mapped.orgName, orgLogo: mapped.orgLogo });
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
        { key: 'ORG_SHORT_NAME', value: formData.orgShortName, group: 'General' },
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
      updateOrgStore({ orgName: formData.orgName, orgLogo: formData.orgLogo });
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
      updateOrgStore({ orgLogo: newLogoUrl });
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
      <div className="p-8 max-w-7xl mx-auto py-32 text-center text-slate-400 animate-pulse">
        Synchronizing institutional constants...
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex justify-between items-end">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-slate-900/20">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 font-display tracking-tight">Organization Profile</h1>
            <p className="text-slate-500 mt-1 font-medium">Global institutional configuration and branding hub.</p>
          </div>
        </div>
        {isProfileSet && (
          <button 
            onClick={() => setIsProfileModalOpen(true)}
            className="px-6 py-3 bg-slate-900 text-white rounded-2xl text-sm font-bold hover:bg-slate-800 hover:scale-105 active:scale-95 transition-all flex items-center shadow-xl"
          >
            <UserCircle2 className="w-4 h-4 mr-2 text-blue-400" />
            Edit Profile
          </button>
        )}
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
            className="mt-8 px-8 py-3 bg-blue-600 text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 hover:bg-blue-700 hover:scale-105 active:scale-95 transition-all"
          >
            Start Setup Now
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-200 overflow-hidden">
          {/* Main Dashboard View (Read-only) */}
          <div className="bg-slate-900 p-8 text-white flex justify-between items-center relative overflow-hidden">
            <Building2 className="absolute -right-4 -bottom-4 w-32 h-32 text-white/5 rotate-6" />
            <div className="flex items-start gap-8 relative z-10 w-full">
              <div className="w-28 h-28 bg-white rounded-3xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.3)] flex items-center justify-center border-2 border-white/20 shrink-0">
                <img 
                  src={formData.orgLogo || "/logo-placeholder.png"} 
                  alt="Logo" 
                  className={`w-full h-full object-cover ${!formData.orgLogo && 'opacity-20'}`} 
                />
              </div>
              <div className="flex-1 pt-1">
                 <div className="flex items-center gap-2 mb-3">
                    <div className="px-3 py-1 bg-blue-500/10 text-blue-300 text-[10px] font-bold tracking-wider rounded-full border border-blue-400/20">
                      Institutional ID
                    </div>
                    {formData.orgShortName && (
                      <div className="px-3 py-1 bg-white/10 text-white text-[10px] font-bold tracking-wider rounded-full border border-white/20">
                        {formData.orgShortName}
                      </div>
                    )}
                 </div>
                 <h2 className="text-4xl font-black text-white leading-tight drop-shadow-sm mb-4">
                   {formData.orgName || 'Unnamed Institution'}
                 </h2>
                 <div className="flex items-center gap-6 text-white/60">
                    <div className="flex items-center gap-2">
                       <Globe className="w-4 h-4 text-blue-400" />
                       <span className="text-sm font-bold">{formData.timezone || 'Timezone Unset'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                       <Banknote className="w-4 h-4 text-emerald-400" />
                       <span className="text-sm font-bold">{formData.currency || 'Currency Unset'}</span>
                    </div>
                 </div>
              </div>
            </div>
          </div>

          <div className="p-10 pb-16 grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
            {/* Regional Setting */}
            <div className="p-6 bg-slate-50/50 rounded-2xl border border-slate-100 flex items-start gap-4 group hover:bg-white transition-all hover:shadow-md hover:border-slate-200">
              <Globe className="w-6 h-6 text-blue-600 shrink-0 group-hover:rotate-12 transition-transform" />
              <div>
                <h4 className="text-[10px] font-bold text-slate-400 tracking-wider mb-1 leading-none">Regional setting</h4>
                <p className="font-bold text-slate-900">{formData.timezone || 'Not Configured'}</p>
              </div>
            </div>

            {/* Academic Cycle (Tall Card) */}
            <div className="md:row-span-2 p-8 bg-slate-50/50 rounded-3xl border border-slate-100 flex flex-col justify-center items-center text-center gap-6 group hover:bg-white transition-all hover:shadow-lg hover:border-blue-100">
                <div className="p-4 bg-white rounded-3xl shadow-sm border border-slate-100 group-hover:scale-110 transition-transform group-hover:bg-blue-50">
                  <Calendar className="w-8 h-8 text-rose-600 group-hover:text-blue-600 group-hover:rotate-12 transition-all" />
                </div>
                <div>
                    <h4 className="text-[10px] font-black text-slate-400 tracking-wider leading-none mb-3">Academic cycle opening</h4>
                    <p className="text-3xl font-black text-slate-900 leading-tight tracking-tight">{formData.academicYearStart || 'N/A'}</p>
                    <p className="text-[10px] text-slate-400 mt-2 font-bold tracking-wider">Institutional reporting start</p>
                </div>
            </div>

            {/* Base Currency */}
            <div className="p-6 bg-slate-50/50 rounded-2xl border border-slate-100 flex items-start gap-4 group hover:bg-white transition-all hover:shadow-md hover:border-slate-200">
              <Banknote className="w-6 h-6 text-emerald-600 shrink-0 group-hover:rotate-12 transition-transform" />
              <div>
                <h4 className="text-[10px] font-bold text-slate-400 tracking-wider mb-1 leading-none">Base currency</h4>
                <p className="font-bold text-slate-900">{formData.currency || 'Not Configured'}</p>
              </div>
            </div>
          </div>

          <div className="bg-slate-900 p-4 flex items-center justify-center gap-2">
             <ShieldCheck className="w-4 h-4 text-emerald-400" />
             <p className="text-[10px] text-slate-400 font-bold tracking-wider">Authenticated operational constants</p>
          </div>
        </div>
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
        maxWidth="6xl"
        hideHeader={true}
      >
        <div className="bg-white overflow-hidden transition-all duration-300 flex flex-col max-h-[calc(100vh-100px)] lg:max-h-[85vh]">
          {/* Custom Header */}
          <div className="bg-slate-900 p-6 text-white flex justify-between items-center shrink-0 sticky top-0 z-10 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2 rounded-xl backdrop-blur-md">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest leading-none mb-1">
                  Institutional Identity
                </p>
                <h2 className="text-xl font-bold tracking-tight">
                  {isProfileSet ? "Update Institutional Profile" : "Add Institutional Profile"}
                </h2>
              </div>
            </div>
            <button 
              onClick={() => setIsProfileModalOpen(false)}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white/60 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-10 min-h-0 custom-scrollbar">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-12">
              {/* Branding Column */}
              <div className="md:col-span-4 flex items-start justify-center pt-2">
                  <div className="relative flex flex-col items-center w-full max-w-[240px]">
                    <div className="w-full aspect-square rounded-[2.5rem] relative group transition-all flex items-center justify-center border-2 border-slate-100 bg-slate-50/50 hover:bg-slate-50 overflow-hidden shadow-inner">
                        <img 
                          src={formData.orgLogo || "/logo-placeholder.png"} 
                          alt="Preview" 
                          className={`w-full h-full object-cover transition-all duration-700 group-hover:scale-110 group-hover:blur-md ${!formData.orgLogo && 'opacity-10 grayscale blur-[2px]'}`} 
                        />
                        <label className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-all flex flex-col items-center justify-center cursor-pointer text-slate-900 z-20">
                            <div className="p-4 bg-white/80 rounded-2xl mb-4 shadow-xl border border-white/50 backdrop-blur-md transform translate-y-4 group-hover:translate-y-0 transition-all duration-500">
                               <Upload className="w-8 h-8 text-blue-600 animate-bounce" />
                            </div>
                            <span className="text-[9px] font-black tracking-wider text-slate-900 bg-white/80 px-4 py-2 rounded-full border border-white/50 backdrop-blur-md shadow-lg transform translate-y-4 group-hover:translate-y-0 transition-all duration-500 delay-75">Update logo</span>
                            <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} />
                        </label>
                    </div>
                    <div className="mt-8 flex flex-col items-center gap-2 w-full text-center">
                      <p className="text-slate-400 text-[9px] font-bold tracking-wider opacity-50">Institutional identity asset</p>
                      <div className="w-12 h-1 bg-slate-100 rounded-full" />
                    </div>
                  </div>
              </div>

              <div className="md:col-span-8 space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6">
                      <div className="space-y-3">
                          <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Legal name</label>
                          <input 
                              type="text" 
                              className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm"
                              placeholder="Cambridge Academy"
                              value={formData.orgName}
                              onChange={e => setFormData({...formData, orgName: e.target.value})}
                          />
                      </div>
                      <div className="space-y-3">
                          <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Institutional alias</label>
                          <input 
                              type="text" 
                              className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm"
                              placeholder="CAMBRIDGE"
                              value={formData.orgShortName}
                              onChange={e => setFormData({...formData, orgShortName: e.target.value.toUpperCase()})}
                          />
                      </div>
                      <div className="space-y-3">
                          <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Regional timezone</label>
                          <div className="relative">
                            <select 
                                className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500 appearance-none text-sm"
                                value={formData.timezone}
                                onChange={e => setFormData({...formData, timezone: e.target.value})}
                            >
                                <option value="">Select timezone</option>
                                <option>(GMT+05:30) Mumbai, Kolkata</option>
                                <option>UTC (00:00)</option>
                            </select>
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                               <Globe className="w-4 h-4" />
                            </div>
                          </div>
                      </div>
                      <div className="space-y-3">
                          <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Session start</label>
                          <input 
                              type="date" 
                              className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                              value={formData.academicYearStart}
                              onChange={e => setFormData({...formData, academicYearStart: e.target.value})}
                          />
                      </div>
                      <div className="space-y-3">
                          <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Transactional currency</label>
                          <div className="relative">
                            <select 
                                className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500 appearance-none text-sm"
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
                  </div>

                  <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-5 flex items-start gap-4">
                    <LayoutGrid className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                    <p className="text-[11px] font-medium text-blue-800 leading-relaxed">
                      <span className="block font-black uppercase tracking-wider text-[9px] mb-1">Academic Governance</span>
                      Institutional markers propagate system-wide. Logo updates immediately affect PDF headers, invoice watermarks, and portal branding modules.
                    </p>
                  </div>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex justify-end gap-3 p-8 bg-slate-50 border-t border-slate-200 shrink-0">
            <button 
              type="button"
              onClick={() => setIsProfileModalOpen(false)}
              className="px-8 py-3.5 bg-white text-slate-600 font-bold text-xs uppercase tracking-widest rounded-2xl hover:bg-slate-50 hover:scale-105 active:scale-95 transition-all border border-slate-200 shadow-sm"
            >
              Cancel
            </button>
            <button 
              onClick={() => handleSave()}
              disabled={!hasChanges}
              className="px-8 py-3.5 bg-slate-900 text-white font-bold text-xs uppercase tracking-widest rounded-2xl shadow-xl shadow-slate-900/10 hover:bg-slate-800 hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
            >
              <div className="flex items-center gap-2">
                <Save className="w-4 h-4 text-blue-400" />
                <span>Save Profile Changes</span>
              </div>
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
