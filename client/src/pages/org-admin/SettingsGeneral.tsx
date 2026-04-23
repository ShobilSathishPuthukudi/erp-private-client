import { useState, useEffect } from 'react';
import { 
  Building2, 
  Upload, 
  Globe, 
  Calendar, 
  Banknote,

  Info,
  ShieldCheck,
  LayoutGrid,
  X,
  Plus,
  Edit3,
  Trash2,
  MapPin,
  AlertTriangle
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
    orgLogo: '',
    orgAddress: ''
  });
  const [touched, setTouched] = useState<Record<string, boolean>>({});
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
      
      // Auto-fetch defaults logic
      const localTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const locale = Intl.NumberFormat().resolvedOptions().locale;
      
      const currencyMap: Record<string, string> = {
        'en-IN': 'INR (₹)',
        'hi-IN': 'INR (₹)',
        'en-US': 'USD ($)',
        'en-GB': 'GBP (£)',
        'en-AU': 'AUD ($)',
        'en-CA': 'CAD ($)',
        'de-DE': 'EUR (€)',
        'fr-FR': 'EUR (€)',
      };
      
      const localCurrency = currencyMap[locale] || currencyMap[locale.split('-')[0]] || 'USD ($)';

      const mapped = { 
        ...formData,
        timezone: localTimezone,
        currency: localCurrency
      };

      data.forEach((item: any) => {
        if (item.key === 'ORG_NAME' && item.value) mapped.orgName = item.value;
        if (item.key === 'ORG_SHORT_NAME' && item.value) mapped.orgShortName = item.value;
        if (item.key === 'TIMEZONE' && item.value) mapped.timezone = item.value;
        if (item.key === 'ACADEMIC_YEAR_START' && item.value) mapped.academicYearStart = item.value;
        if (item.key === 'ACADEMIC_YEAR_END' && item.value) mapped.academicYearEnd = item.value;
        if (item.key === 'CURRENCY' && item.value) mapped.currency = item.value;
        if (item.key === 'ORG_LOGO' && item.value) mapped.orgLogo = item.value;
        if (item.key === 'ORG_ADDRESS' && item.value) mapped.orgAddress = item.value;
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
        { key: 'CURRENCY', value: formData.currency, group: 'General' },
        { key: 'ORG_ADDRESS', value: formData.orgAddress, group: 'General' }
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
  const isFormValid = formData.orgName.length >= 3 && formData.orgName.length <= 15 && 
                      formData.orgShortName.length >= 2 && formData.orgShortName.length <= 12 && 
                      (!formData.orgAddress || formData.orgAddress.length <= 30);

  if (loading) {
    return (
      <div className="p-8 max-w-7xl mx-auto py-32 text-center text-slate-400 animate-pulse">
        Synchronizing institutional constants...
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-12">
      <div className="flex justify-between items-end">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-slate-900/20">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 font-display tracking-tight">Institutional profile card</h1>
            <p className="text-slate-500 mt-1 font-medium">Global institutional configuration and primary branch branding hub.</p>
          </div>
        </div>
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
        <div className="space-y-16">
          {/* Institutional Hub Card (Primary Branch) */}
          <div className="space-y-6">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
               <ShieldCheck className="w-5 h-5 text-emerald-600" />
               <h3 className="text-sm font-bold text-slate-400 uppercase tracking-[0.2em]">Institutional Identity Hub</h3>
            </div>
            
            <div className="bg-white rounded-[2rem] shadow-xl shadow-slate-200/40 border border-slate-200 overflow-hidden group hover:shadow-2xl hover:shadow-blue-900/10 transition-all duration-500 hover:-translate-y-2">
              <div className="bg-slate-800 p-8 text-white flex justify-between items-center relative overflow-hidden transition-colors duration-500 group-hover:bg-slate-900">
                <Building2 className="absolute -right-6 -bottom-6 w-32 h-32 text-white/5 rotate-12 transition-transform duration-700 group-hover:scale-110" />
                <div className="flex items-start gap-8 relative z-10 w-full">
                  <div className="w-24 h-24 bg-white rounded-3xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.4)] flex items-center justify-center shrink-0 transform transition-transform group-hover:scale-105 duration-500 mt-1">
                    <img 
                      src={formData.orgLogo || "/logo-placeholder.png"} 
                      alt="Logo" 
                      className={`w-full h-full object-cover ${!formData.orgLogo && 'opacity-20'}`} 
                    />
                  </div>
                  <div className="flex-1 pt-1 min-w-0">
                     <div className="flex items-center gap-2 mb-3">
                        <div className="px-3 py-1 bg-blue-500/20 text-blue-300 text-[9px] font-black tracking-widest rounded-full border border-blue-400/10 uppercase">
                          Primary Branch
                        </div>
                        {formData.orgShortName && (
                          <div className="px-3 py-1 bg-white/10 text-white/90 text-[9px] font-black tracking-widest rounded-full border border-white/10 uppercase hidden sm:flex">
                            {formData.orgShortName}
                          </div>
                        )}
                     </div>
                     <h2 className="text-3xl sm:text-4xl font-black text-white leading-tight drop-shadow-sm truncate pr-4">
                       {formData.orgName || 'Unnamed Institution'}
                     </h2>
                     <p className="text-xs text-white/50 font-medium tracking-wide mt-2">Institutional Configuration Hub</p>
                  </div>
                  <div className="absolute top-0 right-0 flex items-center gap-2">
                    <button 
                      onClick={() => setIsProfileModalOpen(true)}
                      className="p-3 text-white/60 hover:text-white transition-all hover:scale-110 active:scale-95 bg-white/5 hover:bg-white/10 rounded-xl border border-white/5 flex items-center gap-2 shadow-sm"
                      title="Configure Profile"
                    >
                      <Edit3 className="w-5 h-5 text-blue-400" />
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] hidden sm:inline-block">Configure</span>
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 bg-white relative z-10">
                 <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-100 transition-colors group-hover:bg-white group-hover:border-blue-100">
                    <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 leading-none">Global Region</h4>
                    <div className="flex items-center gap-2.5">
                       <Globe className="w-4 h-4 text-blue-600" />
                       <span className="text-[11px] font-bold text-slate-800 truncate">{formData.timezone || 'System Timezone'}</span>
                    </div>
                 </div>
                 <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-100 transition-colors group-hover:bg-white group-hover:border-blue-100">
                    <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 leading-none">Base Currency</h4>
                    <div className="flex items-center gap-2.5">
                       <Banknote className="w-4 h-4 text-emerald-600" />
                       <span className="text-[11px] font-bold text-slate-800">{formData.currency || 'System Currency'}</span>
                    </div>
                 </div>
                 <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-100 transition-colors group-hover:bg-white group-hover:border-blue-100 md:col-span-2 lg:col-span-1">
                    <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 leading-none">Academic Cycle</h4>
                    <div className="flex items-center gap-2.5">
                       <Calendar className="w-4 h-4 text-rose-500" />
                       <span className="text-[11px] font-bold text-slate-800">{formData.academicYearStart || 'TBD'} - {formData.academicYearEnd || 'TBD'}</span>
                    </div>
                 </div>
                 <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-100 transition-colors group-hover:bg-white group-hover:border-blue-100 md:col-span-2 lg:col-span-3 lg:col-start-1">
                    <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 leading-none">HQ Physical Location</h4>
                    <div className="flex items-start gap-2.5">
                       <MapPin className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                       <span className="text-[11px] font-bold text-slate-800 leading-relaxed whitespace-pre-wrap">
                         {formData.orgAddress || 'Headquarters location details pending configuration'}
                       </span>
                    </div>
                 </div>
              </div>
            </div>
          </div>


        </div>
      )}

      {/* Info Banner */}
      <div className="bg-blue-50/50 border border-blue-100 rounded-[2rem] p-8 flex items-start gap-6 group hover:bg-blue-50 transition-colors">
        <Info className="w-8 h-8 text-blue-600 shrink-0 mt-0.5 group-hover:rotate-12 transition-transform" />
        <div className="space-y-2">
           <h4 className="text-xl font-bold mb-3 font-display text-blue-900">Governance Disclosure</h4>
           <p className="text-xs font-medium text-blue-800/80 leading-relaxed max-w-4xl">
             Primary institutional branding parameters are inherited by all child branches unless explicitly overridden during regional center registration. 
             Logo updates to the primary profile will automatically propagate to all regional hubs currently using inherited branding vectors.
           </p>
        </div>
      </div>

      {/* Modals */}
      <Modal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        hideHeader={true}
        isTransparent={true}
      >
        <div className="bg-white w-full max-w-4xl rounded-[2.5rem] flex flex-col max-h-[90vh] overflow-hidden">
          <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
            <div className="flex items-center gap-5">
              <div className="w-14 h-14 bg-slate-900 rounded-3xl flex items-center justify-center text-white shadow-2xl shadow-slate-900/30">
                <Building2 className="w-7 h-7" />
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-900 tracking-tight">Identity configuration</h2>
                <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mt-0.5">Primary institutional Hub Management</p>
              </div>
            </div>
            <button onClick={() => setIsProfileModalOpen(false)} className="w-12 h-12 flex items-center justify-center rounded-2xl hover:bg-slate-100 transition-colors text-slate-400 hover:text-slate-900">
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-10 bg-slate-50/30">
            <div className="space-y-10">
               {/* Branding Section */}
               <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
                  <div className="md:col-span-4 space-y-4">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Institutional Logo</label>
                    <div className="relative group aspect-square w-full">
                      <div className="absolute inset-0 bg-white rounded-[2rem] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center overflow-hidden transition-all group-hover:border-blue-400 group-hover:bg-blue-50/10 group-hover:scale-[0.98]">
                        {formData.orgLogo ? (
                          <img src={formData.orgLogo} alt="Org Logo" className="w-full h-full object-cover" />
                        ) : (
                          <div className="flex flex-col items-center gap-3 text-slate-300">
                            <Upload className="w-10 h-10" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Upload Branding</span>
                          </div>
                        )}
                        <input 
                          type="file" 
                          onChange={handleLogoUpload}
                          className="absolute inset-0 opacity-0 cursor-pointer"
                          accept="image/*"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="md:col-span-8 space-y-8">
                      <div className="space-y-3">
                          <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Institutional name <span className="text-rose-500">*</span></label>
                          <input 
                              type="text" 
                              required
                              minLength={3}
                              maxLength={15}
                              className="w-full px-6 py-4 bg-white border border-slate-200 rounded-2xl font-black text-slate-900 outline-none focus:ring-4 focus:ring-blue-500/10 transition-all text-sm shadow-sm"
                              placeholder="e.g. Imperial Institute"
                              value={formData.orgName}
                              onChange={e => setFormData({...formData, orgName: e.target.value})}
                              onBlur={() => setTouched({ ...touched, orgName: true })}
                          />
                          {touched.orgName && !formData.orgName && <p className="text-[10.5px] text-rose-500 font-bold mt-1.5 px-1 animate-in fade-in">This field is required</p>}
                          {formData.orgName.length > 0 && formData.orgName.length < 3 && <p className="text-[10.5px] text-rose-500 font-bold mt-1.5 px-1 animate-in fade-in">Must be at least 3 characters</p>}
                          {formData.orgName.length > 15 && <p className="text-[10.5px] text-rose-500 font-bold mt-1.5 px-1 animate-in fade-in">Must be at most 15 characters</p>}
                      </div>
                      <div className="space-y-3">
                          <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Administrative short name <span className="text-rose-500">*</span></label>
                          <input 
                              type="text" 
                              required
                              minLength={2}
                              maxLength={12}
                              className="w-full px-6 py-4 bg-white border border-slate-200 rounded-2xl font-bold text-slate-900 outline-none focus:ring-4 focus:ring-blue-500/10 transition-all text-sm shadow-sm"
                              placeholder="e.g. IITS-GLOBAL"
                              value={formData.orgShortName}
                              onChange={e => setFormData({...formData, orgShortName: e.target.value})}
                              onBlur={() => setTouched({ ...touched, orgShortName: true })}
                          />
                          {touched.orgShortName && !formData.orgShortName && <p className="text-[10.5px] text-rose-500 font-bold mt-1.5 px-1 animate-in fade-in">This field is required</p>}
                          {formData.orgShortName.length > 0 && formData.orgShortName.length < 2 && <p className="text-[10.5px] text-rose-500 font-bold mt-1.5 px-1 animate-in fade-in">Must be at least 2 characters</p>}
                          {formData.orgShortName.length > 12 && <p className="text-[10.5px] text-rose-500 font-bold mt-1.5 px-1 animate-in fade-in">Must be at most 12 characters</p>}
                      </div>
                      <div className="space-y-3">
                          <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Primary Physical Location</label>
                          <textarea 
                              rows={2}
                              maxLength={30}
                              className="w-full px-6 py-4 bg-white border border-slate-200 rounded-2xl font-bold text-slate-900 outline-none focus:ring-4 focus:ring-blue-500/10 transition-all text-sm shadow-sm"
                              placeholder="e.g. 123 Institutional Core Directory, Corporate Blvd"
                              value={formData.orgAddress}
                              onChange={e => setFormData({...formData, orgAddress: e.target.value})}
                              onBlur={() => setTouched({ ...touched, orgAddress: true })}
                          />
                          {formData.orgAddress && formData.orgAddress.length > 30 && <p className="text-[10.5px] text-rose-500 font-bold mt-1.5 px-1 animate-in fade-in">Must be at most 30 characters</p>}
                      </div>
                  </div>
               </div>

               {/* Configuration Section */}
               <div className="bg-white rounded-[2rem] p-8 border border-slate-100 shadow-sm space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-3">
                          <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Global Timezone</label>
                          <div className="relative">
                            <input 
                                type="text" 
                                className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm"
                                placeholder="e.g. Asia/Kolkata"
                                value={formData.timezone}
                                onChange={e => setFormData({...formData, timezone: e.target.value})}
                            />
                            <Globe className="absolute right-6 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                          </div>
                      </div>
                      <div className="space-y-3">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Academic Cycle Start</label>
                        <input 
                            type="date" 
                            className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                            value={formData.academicYearStart}
                            onChange={e => setFormData({...formData, academicYearStart: e.target.value})}
                        />
                      </div>
                      <div className="space-y-3">
                          <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Transactional Currency</label>
                          <div className="relative">
                            <select 
                                className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500 appearance-none text-sm"
                                value={formData.currency}
                                onChange={e => setFormData({...formData, currency: e.target.value})}
                            >
                                <option value="">Select Currency</option>
                                <option value="INR (₹)">INR (₹)</option>
                                <option value="USD ($)">USD ($)</option>
                                <option value="GBP (£)">GBP (£)</option>
                                <option value="EUR (€)">EUR (€)</option>
                            </select>
                            <Banknote className="absolute right-6 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 pointer-events-none" />
                          </div>
                      </div>
                      <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-5 flex items-start gap-4">
                        <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                        <p className="text-[10px] font-bold text-blue-800 leading-relaxed uppercase tracking-wider">
                          Policy Propagation: Child nodes inherit these markers by default.
                        </p>
                      </div>
                  </div>
               </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 p-8 bg-slate-50 border-t border-slate-200 shrink-0">
            <button 
              type="button"
              onClick={() => setIsProfileModalOpen(false)}
              className="px-10 py-4 bg-white text-slate-600 font-black text-[10px] uppercase tracking-[0.2em] rounded-2xl hover:bg-slate-50 transition-all border border-slate-200 shadow-sm"
            >
              Discard
            </button>
            <button 
              onClick={() => handleSave()}
              disabled={!hasChanges || !isFormValid}
              className="px-10 py-4 bg-slate-900 text-white font-black text-[10px] uppercase tracking-[0.2em] rounded-2xl shadow-2xl shadow-slate-900/20 hover:bg-slate-950 hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
            >
              Save Constellation
            </button>
          </div>
        </div>
      </Modal>


    </div>
  );
}
