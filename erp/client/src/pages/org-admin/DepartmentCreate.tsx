import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Users, 
  ChevronDown, 
  AlertCircle, 
  Calendar, 
  Globe, 
  Banknote, 
  Upload, 
  X, 
  CreditCard, 
  Briefcase, 
  ShieldCheck, 
  Eye, 
  Edit3, 
  UserPlus
} from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

interface DepartmentCreateProps {
  onClose: () => void;
  onSuccess: () => void;
  initialData?: any;
  context?: 'department' | 'sub-department' | 'branch';
  defaultType?: string;
}

export default function DepartmentCreate({ onClose, onSuccess, initialData, context = 'department', defaultType }: DepartmentCreateProps) {
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [isNewAdmin, setIsNewAdmin] = useState(false);
  const [validation, setValidation] = useState({
    singletonError: ''
  });
  const [existingDepts, setExistingDepts] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    type: initialData?.type || defaultType || '',
    description: initialData?.description || '',
    adminId: initialData?.adminId || '',
    adminName: '',
    adminEmail: '',
    adminPassword: '',
    shortName: initialData?.shortName || initialData?.metadata?.shortName || '',
    logo: initialData?.metadata?.logo || '',
    timezone: initialData?.metadata?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
    currency: initialData?.metadata?.currency || (Intl.NumberFormat(undefined, {style: 'currency', currency: 'USD'}).resolvedOptions().currency === 'USD' ? 'INR (₹)' : 'USD ($)'), // Default to INR based on location or fallback
    academicYearStart: initialData?.metadata?.academicYearStart || '',
    features: initialData?.metadata?.features || []
  });

  const availableFeatures = [
    { id: 'admissions', name: 'Student Admissions', icon: UserPlus, desc: 'End-to-end enrollment workflow from lead to active student.' },
    { id: 'finance', name: 'Fee & Billing', icon: CreditCard, desc: 'Automated invoice generation, scholarship management, and payment reconciliation.' },
    { id: 'academics', name: 'LMS & Academics', icon: Briefcase, desc: 'Centralized course content, virtual classrooms, and examination management.' },
    { id: 'hr', name: 'Human Resources', icon: Users, desc: 'Payroll processing, leave management, and personnel records.' }
  ];

  useEffect(() => {
    fetchUsers();
    fetchExistingDepts();
    if (!initialData?.id) {
       // Attempt to fetch parent org defaults if building a regional center
       fetchOrgDefaults();
    }
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await axios.get('/api/org-admin/verified-admins');
      setUsers(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Error fetching users:', err);
      setUsers([]);
    }
  };

  const fetchExistingDepts = async () => {
    try {
      const res = await axios.get('/api/departments');
      setExistingDepts(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Error fetching departments:', err);
    }
  };

  const fetchOrgDefaults = async () => {
    try {
      const res = await axios.get('/api/org-admin/config');
      if (res.data) {
        setFormData(prev => ({
          ...prev,
          timezone: res.data.timezone || prev.timezone,
          currency: res.data.currency || prev.currency
        }));
      }
    } catch (err) {
      console.warn('Could not fetch parent org defaults', err);
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, logo: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const toggleFeature = (featureId: string) => {
    setFormData(prev => {
      const exists = prev.features.find((f: any) => f.id === featureId);
      if (exists) {
        return { ...prev, features: prev.features.filter((f: any) => f.id !== featureId) };
      }
      return { 
        ...prev, 
        features: [...prev.features, { id: featureId, permissions: ['read'] }]
      };
    });
  };

  const togglePermission = (featureId: string, permId: string) => {
    setFormData(prev => ({
      ...prev,
      features: prev.features.map((f: any) => {
        if (f.id !== featureId) return f;
        const perms = f.permissions.includes(permId)
          ? f.permissions.filter((p: string) => p !== permId)
          : [...f.permissions, permId];
        return { ...f, permissions: perms };
      })
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        name: formData.name,
        shortName: formData.shortName,
        type: formData.type,
        description: formData.description,
        adminId: isNewAdmin ? null : formData.adminId,
        adminName: isNewAdmin ? formData.adminName : null,
        adminEmail: isNewAdmin ? formData.adminEmail : null,
        adminPassword: isNewAdmin ? formData.adminPassword : null,
        logo: formData.logo,
        timezone: formData.timezone,
        currency: formData.currency,
        academicYearStart: formData.academicYearStart,
        features: formData.features
      };

      if (initialData?.id) {
        await axios.put(`/api/departments/${initialData.id}`, payload);
      } else {
        await axios.post('/api/departments', payload);
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error saving department:', err);
      const errorMessage = err.response?.data?.error || err.response?.data?.message || 'Failed to save institutional branch';
      
      if (errorMessage.includes('singleton')) {
        setValidation({ singletonError: errorMessage });
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[100] p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-4xl rounded-none shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-500">
        <div className="bg-slate-900 p-6 text-white flex justify-between items-center shrink-0 sticky top-0 z-10 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-xl backdrop-blur-md">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-widest leading-none mb-1">
                {initialData?.type || defaultType || 'Resource Allocation'}
              </p>
              <h2 className="text-xl font-bold tracking-tight">
                {initialData?.id 
                  ? `Edit ${context === 'branch' ? 'Institutional Branch' : context === 'sub-department' ? 'Institutional Sub-Department' : 'Organization Unit'}` 
                  : `Register New ${context === 'branch' ? 'Institutional Branch' : context === 'sub-department' ? 'Institutional Sub-Department' : 'Institutional Department'}`}
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

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-10 bg-slate-50/30 custom-scrollbar">
            <div className="space-y-10">
            
            {/* Dept Name / Branch Identity */}
            <div className="space-y-6">
              {!initialData?.id && (context === 'department' || context === 'sub-department') && (
                <div className="space-y-2 mb-4">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block text-left px-1">Standard Institutional Unit Type</label>
                  <div className="flex flex-wrap gap-2 w-full">
                    {[
                      { id: 'Finance', cat: 'Default' }, { id: 'HR', cat: 'Default' }, { id: 'Sales', cat: 'Default' }, { id: 'Academic Operations', cat: 'Default' },
                      { id: 'BVoc', cat: 'Sub' }, { id: 'Online', cat: 'Sub' }, { id: 'Skill', cat: 'Sub' }, { id: 'Open School', cat: 'Sub' },
                      { id: 'Custom', cat: 'Custom' }
                    ].filter(t => {
                      if (String(context) === 'sub-department') return t.cat === 'Sub' || t.cat === 'Custom';
                      return t.cat === 'Default' || t.cat === 'Custom';
                    }).map(t => {
                      const isExisting = existingDepts.some(d => d.name.toLowerCase() === (t.id + ' Department').toLowerCase());
                      return (
                        <button
                          key={t.id}
                          type="button"
                          disabled={isExisting}
                          onClick={() => setFormData({ ...formData, type: t.id, name: t.id + ' Department' })}
                          className={`py-2.5 px-4 rounded-xl text-[10px] font-black uppercase tracking-tight transition-all border flex-grow sm:flex-grow-0 whitespace-nowrap shadow-sm flex items-center gap-2 ${
                            formData.type === t.id 
                              ? 'bg-slate-900 text-white border-slate-900 shadow-lg scale-[1.05]' 
                              : isExisting
                                ? 'bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed opacity-60 pointer-events-none select-none'
                                : 'bg-white text-slate-500 border-slate-100 hover:border-slate-300'
                          }`}
                        >
                          {t.id}
                          {isExisting && <ShieldCheck className="w-3 h-3 text-slate-300" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              {formData.type === 'branch' ? (
                <div className="space-y-4 p-5 bg-white rounded-2xl border border-slate-100 shadow-sm">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <h3 className="text-base font-bold text-slate-800 tracking-tight">Institutional Branch Identity</h3>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.15em] block text-left px-1">Institutional Branch Legal Name</label>
                      <input 
                        type="text" 
                        placeholder="Regional Branch"
                        className="w-full px-5 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium text-slate-700 text-sm shadow-sm"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.15em] block text-left px-1">Institutional Alias (Short Name)</label>
                      <input 
                        type="text" 
                        placeholder="DI-NORTH"
                        className="w-full px-5 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium text-slate-700 text-sm shadow-sm"
                        value={formData.shortName}
                        onChange={(e) => setFormData({ ...formData, shortName: e.target.value })}
                      />
                      <p className="text-[10px] text-slate-400 text-left font-medium mt-2 px-1">Used for regional branding and ID generation.</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">{context === 'branch' ? 'Institutional Branch Name' : 'Identified Department Name'}</label>
                  <input 
                    type="text" 
                    placeholder="Global Finance"
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl mt-1 focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium disabled:opacity-50 disabled:bg-slate-100/50 disabled:cursor-not-allowed"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    disabled={formData.type !== 'Custom'}
                  />
                  {formData.type !== 'Custom' && (
                    <p className="text-[10px] text-slate-400 mt-1">Identified name is synchronized with standard unit hierarchy to maintain audit continuity.</p>
                  )}
                </div>
              )}
            </div>

            {/* Admin Assignment */}
            <div className="space-y-4">
              <div className="flex flex-col gap-4">
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.15em] block text-left mt-1 px-1">Assign Organization Admin</label>
                
                <div className="flex items-center justify-start">
                  <div className="flex p-1 bg-slate-100/80 rounded-full border border-slate-200 w-fit">
                    <button
                      type="button"
                      onClick={() => setIsNewAdmin(false)}
                      className={`flex items-center gap-2 py-2 px-5 rounded-full text-[9px] font-black uppercase tracking-tight transition-all ${
                        !isNewAdmin 
                          ? 'bg-white text-blue-600 shadow-sm' 
                          : 'text-slate-400 hover:text-slate-600'
                      }`}
                    >
                      <Users className="w-3.5 h-3.5" />
                      Existing Org Admin
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsNewAdmin(true)}
                      className={`flex items-center gap-2 py-2 px-5 rounded-full text-[9px] font-black uppercase tracking-tight transition-all ${
                        isNewAdmin 
                          ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/10' 
                          : 'text-slate-400 hover:text-slate-600'
                      }`}
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      Create New
                    </button>
                  </div>
                </div>
              </div>

              {!isNewAdmin ? (
                <div className="space-y-3">
                  <div className="relative group w-full">
                      <select 
                        key={`admin-select-${users.length}`}
                        className="w-full px-5 py-3.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold appearance-none cursor-pointer hover:bg-slate-50 text-left text-sm text-slate-800 shadow-sm"
                        value={formData.adminId}
                        onChange={(e) => setFormData({ ...formData, adminId: e.target.value })}
                      >
                        <option value="">Select verified admin</option>
                        {users.map((u) => (
                          <option key={u.uid} value={u.uid}>
                            {u.name} — {u.role} ({u.email})
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 pointer-events-none group-hover:text-blue-500 transition-colors" />
                  </div>
                  <p className="text-[10px] text-slate-400 text-left font-medium px-4">Select an existing user to manage this department</p>
                </div>
              ) : (
                <div className="space-y-4 p-6 bg-slate-50 rounded-[2rem] border border-slate-100 animate-in fade-in slide-in-from-right-4 duration-500">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input 
                      type="text" 
                      placeholder="Admin Full Name"
                      className="w-full px-6 py-4 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium shadow-sm"
                      value={formData.adminName}
                      onChange={(e) => setFormData({ ...formData, adminName: e.target.value })}
                    />
                    <input 
                      type="email" 
                      placeholder="Login Email / ID"
                      className="w-full px-6 py-4 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium shadow-sm"
                      value={formData.adminEmail}
                      onChange={(e) => setFormData({ ...formData, adminEmail: e.target.value })}
                    />
                  </div>
                  <input 
                    type="password" 
                    placeholder="Set Access Password"
                    className="w-full px-6 py-4 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium shadow-sm"
                    value={formData.adminPassword}
                    onChange={(e) => setFormData({ ...formData, adminPassword: e.target.value })}
                  />
                  <p className="text-[10px] text-slate-400 text-left px-4">New administrators will receive secure login credentials upon registration completion.</p>
                </div>
              )}
            </div>

            <div className="md:col-span-2">
              {/* Regional Settings (Visible only for Center) */}
              {(formData.type === 'Center' || formData.type === 'branch') && (
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start p-6 bg-white rounded-2xl border border-slate-100 shadow-sm animate-in fade-in slide-in-from-bottom-6 duration-700 mt-2">
                  
                  {/* Logo Column */}
                  <div className="md:col-span-3 flex flex-col items-center">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.15em] mb-3">Regional Logo</label>
                    <div className="relative group w-full aspect-square max-w-[120px]">
                      <div className="absolute inset-0 bg-white rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center overflow-hidden transition-all group-hover:border-blue-400 group-hover:bg-blue-50/10">
                        {formData.logo ? (
                          <img src={formData.logo} alt="Branch Logo" className="w-full h-full object-cover" />
                        ) : (
                          <div className="flex flex-col items-center gap-3 text-slate-300 group-hover:text-blue-500">
                            <Upload className="w-7 h-7" />
                            <span className="text-[8px] font-black uppercase tracking-[0.1em]">Upload Branding</span>
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

                  {/* Grid Column */}
                  <div className="md:col-span-9 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6">
                    {/* Timezone */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Globe className="w-3.5 h-3.5 text-blue-500" />
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.12em]">Regional Timezone</label>
                      </div>
                      <input 
                        type="text" 
                        className="w-full px-5 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium text-slate-700 text-sm shadow-sm"
                        placeholder="e.g. Asia/Kolkata"
                        value={formData.timezone}
                        onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                      />
                    </div>

                    {/* Currency */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Banknote className="w-3.5 h-3.5 text-emerald-500" />
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.12em]">Local Currency</label>
                      </div>
                      <input 
                        type="text" 
                        className="w-full px-5 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium text-slate-700 text-sm shadow-sm"
                        placeholder="e.g. INR (₹)"
                        value={formData.currency}
                        onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                      />
                    </div>

                    {/* Academic Year */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-rose-500" />
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.12em]">Academic Year Start</label>
                      </div>
                      <div className="relative">
                        <input 
                          type="date" 
                          className="w-full px-5 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium text-slate-700 text-sm shadow-sm relative z-10 bg-transparent"
                          value={formData.academicYearStart}
                          onChange={(e) => setFormData({ ...formData, academicYearStart: e.target.value })}
                        />
                      </div>
                    </div>

                    {/* Inherited Box */}
                    <div className="flex flex-col justify-end pb-0.5">
                       <div className="flex items-center justify-center py-3 bg-blue-50/50 rounded-xl border border-blue-100 w-full animate-in fade-in zoom-in-95 duration-500">
                         <span className="text-[9px] font-black text-blue-700 uppercase tracking-[0.05em] px-4">Inherited from Org Policy</span>
                       </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Feature & Permission Assignment (Flowchart Step 5) - Hidden for pre-defined flows like Center */}
              {!initialData?.type && formData.type && (
                <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-500 mt-8">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                     <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Feature & Access Config</h3>
                     {formData.features.length > 0 && (
                      <span className="bg-emerald-600 text-white text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-tighter">
                        {formData.features.length} Components Active
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     {availableFeatures.map((feature) => (
                        <FeatureConfigCard 
                          key={feature.id}
                          feature={feature}
                          config={formData.features.find((f: any) => f.id === feature.id)}
                          onToggle={() => toggleFeature(feature.id)}
                          onPermissionToggle={(permId: string) => togglePermission(feature.id, permId)}
                        />
                     ))}
                  </div>

                  <div className="bg-blue-50/50 border border-blue-100 p-5 rounded-2xl flex items-start gap-4 mx-2">
                    <AlertCircle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                    <p className="text-[11px] font-semibold text-blue-800 leading-relaxed">
                      <span className="block text-blue-900 font-bold uppercase tracking-tight mb-1">Governance Tip</span>
                      Pre-defined department types (Finance, HR, etc.) come with industry-standard default permissions. 
                      Custom departments allow you to select individual features and build a tailored permissions matrix later.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
          </div>

          <div className="flex justify-end gap-3 p-8 bg-slate-50 border-t border-slate-200 shrink-0">
            <button 
              type="button"
              className="px-8 py-3.5 bg-white text-slate-600 font-bold text-xs uppercase tracking-widest rounded-2xl hover:bg-slate-50 hover:scale-105 active:scale-95 transition-all border border-slate-200 shadow-sm"
              onClick={onClose}
            >
              Discard
            </button>
            <button 
              type="submit"
              disabled={
                !formData.type || 
                !formData.name || 
                ((formData.type === 'Center' || formData.type === 'branch') && !formData.shortName) ||
                (!isNewAdmin && !formData.adminId) ||
                (isNewAdmin && (!formData.adminEmail || !formData.adminPassword || !formData.adminName)) ||
                !!validation.singletonError || 
                loading
              }
              className="px-8 py-3.5 bg-slate-900 text-white font-bold text-xs uppercase tracking-widest rounded-2xl shadow-xl shadow-slate-900/10 hover:bg-slate-800 hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
            >
              {initialData?.id ? 'Synchronize Updates' : `Register Institutional ${context === 'branch' ? 'Branch' : 'Department'}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function FeatureConfigCard({ feature, config, onToggle, onPermissionToggle }: any) {
  const [showDetails, setShowDetails] = useState(false);
  const isEnabled = !!config;

  return (
    <div className={`group rounded-2xl border-2 transition-all duration-300 flex flex-col ${
      isEnabled ? 'border-blue-600 bg-white ring-4 ring-blue-50/50' : 'border-slate-100 bg-slate-50/30 hover:border-slate-300'
    }`}>
      <div className="p-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <button
            type="button"
            onClick={() => setShowDetails(!showDetails)}
            title="Click for full module brief"
            className={`p-2 rounded-xl border transition-all hover:scale-110 active:scale-95 shrink-0 ${
              isEnabled ? 'bg-blue-600 text-white border-blue-500' : 'bg-white text-slate-400 border-slate-200 shadow-sm'
            }`}
          >
            <feature.icon className="w-4 h-4" />
          </button>
          <div className="min-w-0 cursor-default" onClick={() => setShowDetails(!showDetails)}>
            <h4 className={`text-xs font-bold truncate ${isEnabled ? 'text-blue-900' : 'text-slate-800'}`}>
              {feature.name}
            </h4>
          </div>
        </div>
        
        <button
          type="button"
          onClick={onToggle}
          className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all hover:scale-105 active:scale-95 shrink-0 ${
            isEnabled 
            ? 'bg-blue-100 text-blue-700 hover:bg-rose-100 hover:text-rose-700' 
            : 'bg-white border border-slate-200 text-slate-400 hover:bg-slate-900 hover:text-white'
          }`}
        >
          {isEnabled ? 'Disable' : 'Enable'}
        </button>
      </div>

      {showDetails && (
        <div className="px-4 pb-4 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className={`p-3 rounded-xl text-[10px] leading-relaxed font-medium border ${
            isEnabled ? 'bg-blue-50/50 border-blue-100 text-blue-700' : 'bg-white border-slate-100 text-slate-500 italic'
          }`}>
            {feature.desc}
          </div>
        </div>
      )}

      {isEnabled && (
        <div className="px-4 pb-4 pt-0 flex flex-col gap-3 mt-auto">
          <div className="h-px bg-slate-100 w-full" />
          <div className="flex items-center gap-2">
             {[
               { id: 'read', label: 'View', icon: Eye },
               { id: 'write', label: 'Manage', icon: Edit3 },
               { id: 'approve', label: 'Audit', icon: ShieldCheck }
             ].map((perm) => {
               const isPermActive = config.permissions.includes(perm.id);
               return (
                 <button
                   key={perm.id}
                   type="button"
                   onClick={() => onPermissionToggle(perm.id)}
                   className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[9px] font-black transition-all hover:scale-105 active:scale-95 ${
                     isPermActive
                     ? 'bg-blue-600 border-blue-600 text-white'
                     : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300'
                   }`}
                 >
                   <perm.icon className="w-3 h-3" />
                   {perm.label}
                 </button>
               );
             })}
          </div>
        </div>
      )}
    </div>
  );
}
