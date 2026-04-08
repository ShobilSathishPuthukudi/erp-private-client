import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  X, 
  ShieldCheck, 
  Shield, 
  Eye, 
  Edit3, 
  Building, 
  Users, 
  BookOpen, 
  Wallet, 
  Bell,
  AlertCircle
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { api } from '@/lib/api';

interface DepartmentCreateProps {
  initialData?: any;
  onClose: () => void;
  onSuccess?: () => void;
  context: 'department' | 'sub-department' | 'center' | 'branch';
  defaultType?: string;
}

const DEFAULT_CONFIGS: Record<string, any[]> = {
  'Finance': [
    { id: 'finance', permissions: ['read', 'write', 'approve'] },
    { id: 'governance', permissions: ['read', 'write', 'approve'] }
  ],
  'HR': [
    { id: 'hr', permissions: ['read', 'write', 'approve'] },
    { id: 'communications', permissions: ['read', 'write', 'approve'] }
  ],
  'Sales': [
    { id: 'communications', permissions: ['read', 'write'] }
  ],
  'Academic Operations': [
    { id: 'academic', permissions: ['read', 'write', 'approve'] },
    { id: 'governance', permissions: ['read', 'write', 'approve'] },
    { id: 'communications', permissions: ['read', 'write', 'approve'] }
  ],
  'Marketing': [
    { id: 'communications', permissions: ['read', 'write'] }
  ],
  'BVoc': [
    { id: 'academic', permissions: ['read', 'write'] },
    { id: 'communications', permissions: ['read', 'write'] }
  ],
  'Online': [
    { id: 'academic', permissions: ['read', 'write'] },
    { id: 'communications', permissions: ['read', 'write'] }
  ],
  'Skill': [
    { id: 'academic', permissions: ['read', 'write'] },
    { id: 'communications', permissions: ['read', 'write'] }
  ],
  'Open School': [
    { id: 'academic', permissions: ['read', 'write'] },
    { id: 'communications', permissions: ['read', 'write'] }
  ]
};

export default function DepartmentCreate({ initialData, onClose, onSuccess, context, defaultType }: DepartmentCreateProps) {
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    shortName: initialData?.shortName || '',
    type: initialData?.type || defaultType || '',
    description: initialData?.description || '',
    adminId: initialData?.adminId || '',
    logo: initialData?.logo || '',
    timezone: initialData?.timezone || 'UTC+5:30',
    currency: initialData?.currency || 'INR',
    academicYearStart: initialData?.academicYearStart || '2024-04-01',
    features: initialData?.features || [],
    parentId: initialData?.parentId || '',
    address: initialData?.address || ''
  });

  const [loading, setLoading] = useState(false);
  const [activeCapsule, setActiveCapsule] = useState<string | null>(null);
  const [existingDepts, setExistingDepts] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [validation, setValidation] = useState({ singletonError: '', nameError: '', featuresError: '' });
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchExistingDepts();
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await api.get('/users');
      const adminUsers = response.data.filter((u: any) => 
        u.role?.toLowerCase().includes('admin') || 
        u.RoleDetails?.isAdminEligible
      );
      setUsers(adminUsers);
    } catch (err) {
      console.error('Error fetching users:', err);
    }
  };

  const fetchExistingDepts = async () => {
    try {
      const response = await api.get('/departments');
      setExistingDepts(response.data);
    } catch (err) {
      console.error('Error fetching departments:', err);
    }
  };

  const availableFeatures = [
    { id: 'academic', name: 'Academic Operations', icon: BookOpen, desc: 'Student lifecycle management, curriculum tracking, and academic scheduling.' },
    { id: 'finance', name: 'Financial Governance', icon: Wallet, desc: 'Fee collections, revenue auditing, and multi-currency fiscal reporting.' },
    { id: 'hr', name: 'Human Resources', icon: Users, desc: 'Staff payroll, performance telemetry, and professional development.' },
    { id: 'governance', name: 'Institutional Governance', icon: Shield, desc: 'Policy enforcement, accreditation tracking, and regional compliance.' },
    { id: 'inventory', name: 'Asset & Inventory', icon: Building, desc: 'Procurement workflows, asset lifecycle, and supply chain management.' },
    { id: 'communications', name: 'Smart Communication', icon: Bell, desc: 'Role-based notifications, institutional broadcasts, and parent engagement.' }
  ];

  const toggleFeature = (featureId: string) => {
    const existingFeature = formData.features.find((f: any) => f.id === featureId);
    const updatedFeatures = existingFeature
      ? formData.features.filter((f: any) => f.id !== featureId)
      : [...formData.features, { id: featureId, permissions: ['read'] }];
    
    setFormData({ ...formData, features: updatedFeatures });
    if (validation.featuresError) setValidation(prev => ({ ...prev, featuresError: '' }));
  };

  const togglePermission = (featureId: string, permission: string) => {
    const updatedFeatures = formData.features.map((f: any) => {
      if (f.id === featureId) {
        const hasPermission = f.permissions.includes(permission);
        const newPermissions = hasPermission
          ? f.permissions.filter((p: string) => p !== permission)
          : [...f.permissions, permission];
        return { ...f, permissions: newPermissions };
      }
      return f;
    });
    setFormData({ ...formData, features: updatedFeatures });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setValidation({ singletonError: '', nameError: '', featuresError: '' });

    const nameExists = existingDepts.some((d: any) => 
      String(d.name).toLowerCase() === String(formData.name).trim().toLowerCase() && 
      d.id !== initialData?.id
    );

    if (nameExists) {
      setValidation(prev => ({ ...prev, nameError: 'This name is already registered.' }));
      setLoading(false);
      return;
    }

    if (!initialData?.id && context !== 'branch' && formData.features.length === 0) {
      setValidation(prev => ({ ...prev, featuresError: 'Please select at least one component module.' }));
      setLoading(false);
      return;
    }

    try {
      const payload = {
        name: formData.name,
        shortName: formData.shortName,
        type: formData.type === 'Custom' ? (context === 'sub-department' ? 'sub-departments' : 'departments') : formData.type,
        description: formData.description,
        adminId: formData.adminId,
        adminName: null,
        adminEmail: null,
        adminPassword: null,
        logo: formData.logo,
        timezone: formData.timezone,
        currency: formData.currency,
        academicYearStart: formData.academicYearStart,
        features: formData.features,
        parentId: formData.parentId || null,
        address: formData.address
      };

      if (initialData?.id) {
        await api.put(`/departments/${initialData.id}`, payload);
        toast.success(`${context.charAt(0).toUpperCase() + context.slice(1)} configuration updated successfully`);
      } else {
        await api.post('/departments', payload);
        toast.success(`New ${context} registered successfully`);
      }
      onSuccess?.();
      onClose();
    } catch (err: any) {
      console.error('Error saving department:', err);
      const errorMessage = err.response?.data?.error || err.response?.data?.message || 'Failed to save institutional branch';
      
      if (errorMessage.includes('singleton')) {
        setValidation({ singletonError: errorMessage, nameError: '', featuresError: '' });
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
              <p className="text-xs text-slate-400 font-bold uppercase tracking-widest leading-none mb-1">Institutional Credential Registry</p>
              <h2 className="text-xl font-black text-white tracking-tight uppercase">
                {initialData?.id ? `Edit ${context === 'branch' ? 'Branch' : 'Institutional Unit'}` : `Register ${context === 'branch' ? 'New Branch' : 'Institutional Unit'}`}
              </h2>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2.5 hover:bg-white/10 rounded-xl transition-all active:scale-90 group"
          >
            <X className="w-6 h-6 text-slate-400 group-hover:text-white group-hover:rotate-90 transition-all duration-300" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-10 bg-slate-50/30 custom-scrollbar">
            <div className="space-y-10">
              {/* Pillar Selection Section */}
              <div className="space-y-6">
                {!initialData?.id && (context === 'department' || context === 'sub-department') && (
                  <div className="space-y-2 mb-4">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block text-left px-1">Standard Institutional Unit Type <span className="text-rose-500">*</span></label>
                    <div className="flex flex-wrap gap-2 w-full">
                      {[
                        { id: 'Finance', cat: 'Default' }, { id: 'HR', cat: 'Default' }, { id: 'Sales', cat: 'Default' }, { id: 'Academic Operations', cat: 'Default' },
                        { id: 'Marketing', cat: 'Default' },
                        { id: 'BVoc', cat: 'Sub' }, { id: 'Online', cat: 'Sub' }, { id: 'Skill', cat: 'Sub' }, { id: 'Open School', cat: 'Sub' },
                        { id: 'Custom', cat: 'Custom' }
                      ].filter(t => {
                        if (String(context) === 'sub-department') return t.cat === 'Sub' || t.cat === 'Custom';
                        return t.cat === 'Default' || t.cat === 'Custom';
                      }).map(t => {
                        return (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => {
                              let dbType = t.id === 'Custom' ? 'Custom' : 'departments';
                              if (t.cat === 'Sub') dbType = 'sub-departments';
                              
                              const defaults = DEFAULT_CONFIGS[t.id] || [];
                              
                              setActiveCapsule(t.id);
                              
                              setFormData({ 
                                ...formData, 
                                type: dbType, 
                                name: '',
                                features: t.id === 'Custom' ? [] : (defaults.length > 0 ? defaults : formData.features)
                              });
                            }}
                            className={`py-2.5 px-4 rounded-xl text-[10px] font-black uppercase tracking-tight transition-all border flex-grow sm:flex-grow-0 whitespace-nowrap shadow-sm flex items-center gap-2 ${
                              activeCapsule === t.id 
                                ? 'bg-slate-900 text-white border-slate-900 shadow-lg scale-[1.05]' 
                                : 'bg-white text-slate-500 border-slate-100 hover:border-blue-200 cursor-pointer'
                            }`}
                          >
                            {t.id}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

                {/* Identity Profiles Section (Greyed out until capsule selection) */}
              <div className={`space-y-10 transition-all duration-500 ${!formData.type ? 'opacity-40 grayscale-[0.5] pointer-events-none' : ''}`}>
                <div className="space-y-6">
                  {(formData.type === 'branch' || formData.type === 'branches' || formData.type === 'departments' || formData.type === 'department' || ((formData.type === 'sub-departments' || formData.type === 'sub-department') && context !== 'sub-department') || formData.type === 'universities') ? (
                    <div className="space-y-4 p-6 bg-white rounded-3xl border border-slate-200 shadow-sm transition-all hover:shadow-md">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-slate-900/10 transition-transform hover:rotate-3">
                          {(formData.type === 'branches' || formData.type === 'branch') ? <Building2 className="w-6 h-6" /> : <ShieldCheck className="w-6 h-6" />}
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-slate-900 tracking-tight leading-none">
                            {(formData.type === 'branches' || formData.type === 'branch') ? 'Regional Branch Identity' : 'Institutional Identity'}
                          </h3>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1.5">
                            {(formData.type === 'branches' || formData.type === 'branch') ? 'Physical Location Discovery' : 'Entity Definition & Protocol'}
                          </p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                           <label className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em] block text-left px-1">
                             {(formData.type === 'branches' || formData.type === 'branch') ? 'Branch Legal Name' : 'Identified Legal Name'} <span className="text-rose-500">*</span>
                           </label>
                           <input 
                             type="text" 
                             placeholder={(formData.type === 'branches' || formData.type === 'branch') ? "Branch name" : "Department name"}
                             className={`w-full px-5 py-3.5 bg-white border rounded-2xl focus:ring-4 outline-none transition-all font-bold text-slate-800 text-sm shadow-sm disabled:bg-slate-50/50 disabled:text-slate-400 ${
                               touched.name && (!formData.name || formData.name.length < 3 || formData.name.length > 20)
                                 ? 'border-rose-300 focus:ring-rose-500/10 focus:border-rose-500'
                                 : 'border-slate-200 focus:ring-blue-500/10 focus:border-blue-500'
                             }`}
                             value={formData.name}
                             onChange={(e) => {
                               setFormData({ ...formData, name: e.target.value });
                               if (validation.nameError) setValidation(prev => ({ ...prev, nameError: '' }));
                             }}
                             disabled={!formData.type}
                             required
                             minLength={3}
                             maxLength={20}
                             onBlur={() => setTouched({ ...touched, name: true })}
                           />
                           <>
                             {validation.nameError && <p className="text-[10.5px] text-rose-500 font-bold mt-1.5 px-1 animate-in fade-in">{validation.nameError}</p>}
                             {touched.name && !formData.name && !validation.nameError && <p className="text-[10.5px] text-rose-500 font-bold mt-1.5 px-1 animate-in fade-in">This field is required</p>}
                             {touched.name && formData.name.length > 0 && formData.name.length < 3 && !validation.nameError && <p className="text-[10.5px] text-rose-500 font-bold mt-1.5 px-1 animate-in fade-in">Must be at least 3 characters</p>}
                             {touched.name && formData.name.length > 20 && !validation.nameError && <p className="text-[10.5px] text-rose-500 font-bold mt-1.5 px-1 animate-in fade-in">Must be at most 20 characters</p>}
                           </>
                        </div>
                        
                        <div className="space-y-2">
                           <label className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em] block text-left px-1">
                             {(formData.type === 'branches' || formData.type === 'branch') ? 'Branch Short ID (Alias)' : 'Institutional Alias (Short ID)'}
                             <span className="text-rose-500 ml-1">*</span>
                           </label>
                           <input 
                             type="text" 
                             placeholder="DI-REG-01"
                             className={`w-full px-5 py-3.5 bg-white border rounded-2xl focus:ring-4 outline-none transition-all font-bold text-slate-800 text-sm shadow-sm ${
                               touched.shortName && (!formData.shortName || formData.shortName.length < 2 || formData.shortName.length > 15)
                                 ? 'border-rose-300 focus:ring-rose-500/10 focus:border-rose-500'
                                 : 'border-slate-200 focus:ring-blue-500/10 focus:border-blue-500'
                             }`}
                             value={formData.shortName}
                             onChange={(e) => setFormData({ ...formData, shortName: e.target.value })}
                             disabled={!formData.type}
                             required
                             minLength={2}
                             maxLength={15}
                             onBlur={() => setTouched({ ...touched, shortName: true })}
                           />
                           <>
                             {touched.shortName && !formData.shortName && <p className="text-[10.5px] text-rose-500 font-bold mt-1.5 px-1 animate-in fade-in">This field is required</p>}
                             {touched.shortName && formData.shortName.length > 0 && formData.shortName.length < 2 && <p className="text-[10.5px] text-rose-500 font-bold mt-1.5 px-1 animate-in fade-in">Must be at least 2 characters</p>}
                             {touched.shortName && formData.shortName.length > 15 && <p className="text-[10.5px] text-rose-500 font-bold mt-1.5 px-1 animate-in fade-in">Must be at most 15 characters</p>}
                           </>
                        </div>
                        
                        {(formData.type === 'branches' || formData.type === 'branch' || formData.type === 'universities') && (
                          <div className="md:col-span-2 space-y-2">
                            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em] block text-left px-1">
                              Institutional Address (Physical Location)
                              <span className="text-rose-500 ml-1">*</span>
                            </label>
                            <textarea 
                              placeholder="123 Academic Way, Knowledge City, Dublin"
                              rows={2}
                              className={`w-full px-5 py-3.5 bg-white border rounded-2xl focus:ring-4 outline-none transition-all font-bold text-slate-800 text-sm shadow-sm ${
                                touched.address && (!formData.address || formData.address.length < 3 || formData.address.length > 30)
                                  ? 'border-rose-300 focus:ring-rose-500/10 focus:border-rose-500'
                                  : 'border-slate-200 focus:ring-blue-500/10 focus:border-blue-500'
                              }`}
                              value={formData.address}
                              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                              disabled={!formData.type}
                              required
                              minLength={3}
                              maxLength={30}
                              onBlur={() => setTouched({ ...touched, address: true })}
                            />
                            <>
                              {touched.address && !formData.address && <p className="text-[10.5px] text-rose-500 font-bold mt-1.5 px-1 animate-in fade-in">This field is required</p>}
                              {touched.address && formData.address.length > 0 && formData.address.length < 3 && <p className="text-[10.5px] text-rose-500 font-bold mt-1.5 px-1 animate-in fade-in">Must be at least 3 characters</p>}
                              {touched.address && formData.address.length > 30 && <p className="text-[10.5px] text-rose-500 font-bold mt-1.5 px-1 animate-in fade-in">Must be at most 30 characters</p>}
                            </>
                          </div>
                        )}
                        <div className="md:col-span-2 space-y-2">
                           <label className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em] block text-left px-1">
                             Assign Administrator
                           </label>
                           <select 
                             className="w-full px-5 py-3.5 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold text-slate-800 text-sm shadow-sm disabled:opacity-50"
                             value={formData.adminId || ''}
                             onChange={(e) => setFormData({ ...formData, adminId: e.target.value })}
                             disabled={!formData.type}
                           >
                             <option value="">Unassigned</option>
                             {users.map((u: any) => (
                               <option key={u.uid} value={u.uid}>{u.name} ({u.role})</option>
                             ))}
                           </select>
                        </div>
                      </div>
                      <p className="text-[10px] text-slate-400 font-medium mt-2 px-1 italic">Short IDs are used for regional branding and cross-institutional synchronization.</p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {context === 'sub-department' && (
                        <div className="space-y-3 p-5 bg-blue-50/30 rounded-2xl border border-blue-100 shadow-sm">
                          <label className="text-[10px] font-bold text-blue-600 uppercase tracking-widest flex items-center gap-2 mb-1">
                            <Building2 className="w-3.5 h-3.5" />
                            Institutional Department Association <span className="text-rose-500">*</span>
                          </label>
                          <div className="flex flex-wrap gap-2">
                            {existingDepts.filter(d => {
                              const type = (d.type || '').toLowerCase();
                              const isSub = ['BVoc', 'Online', 'Skill', 'Open School'].some(s => d.name.includes(s));
                              const isCoreDept = (type === 'departments' || type === 'department') && d.parentId === null;
                              return isCoreDept && !isSub && d.id !== initialData?.id;
                            }).map(d => (
                              <button
                                key={d.id}
                                type="button"
                                disabled={!formData.type}
                                onClick={() => setFormData({ ...formData, parentId: String(d.id), type: context === 'sub-department' ? 'sub-department' : formData.type })}
                                className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-tight transition-all border shadow-sm flex items-center gap-2 ${
                                  String(formData.parentId) === String(d.id)
                                    ? 'bg-blue-600 text-white border-blue-600 shadow-lg scale-[1.02]'
                                    : 'bg-white text-slate-500 border-slate-100 hover:border-blue-200 hover:text-blue-600'
                                }`}
                              >
                                <Shield className={`w-3 h-3 ${String(formData.parentId) === String(d.id) ? 'text-white' : 'text-blue-500'}`} />
                                {d.name.replace(' Department', '').toUpperCase()}
                              </button>
                            ))}
                            {formData.parentId && (
                              <button
                                type="button"
                                disabled={!formData.type}
                                onClick={() => setFormData({ ...formData, parentId: '' })}
                                className="px-3 py-2.5 rounded-xl text-[9px] font-bold text-rose-500 hover:bg-rose-50 transition-colors uppercase tracking-widest"
                              >
                                Reset
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                      
                      <div className="space-y-4 p-6 bg-white rounded-3xl border border-slate-200 shadow-sm transition-all hover:shadow-md">
                        <div className="flex items-center gap-3 mb-6">
                          <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-slate-900/10 transition-transform hover:rotate-3">
                            <ShieldCheck className="w-6 h-6" />
                          </div>
                          <div>
                            <h3 className="text-lg font-bold text-slate-900 tracking-tight leading-none">
                              {context === 'sub-department' ? 'Custom Sub-department Identity' : 'Custom Department Identity'}
                            </h3>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1.5">Tailored Architecture Config</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-2">
                             <label className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em] block text-left px-1">Institutional Unit Name <span className="text-rose-500">*</span></label>
                             <input 
                               type="text" 
                               required
                               placeholder={context === 'sub-department' ? "Sub-department name" : "Department name"}
                               className={`w-full px-5 py-3.5 bg-white border rounded-2xl focus:ring-4 outline-none transition-all font-bold text-slate-800 text-sm shadow-sm ${
                                 touched.name && (!formData.name || formData.name.length < 3 || formData.name.length > 20)
                                   ? 'border-rose-300 focus:ring-rose-500/10 focus:border-rose-500'
                                   : 'border-slate-200 focus:ring-blue-500/10 focus:border-blue-500'
                               }`}
                               value={formData.name}
                               onChange={(e) => {
                                 setFormData({ ...formData, name: e.target.value });
                                 if (validation.nameError) setValidation(prev => ({ ...prev, nameError: '' }));
                               }}
                               disabled={!formData.type}
                               minLength={3}
                               maxLength={20}
                               onBlur={() => setTouched({ ...touched, name: true })}
                             />
                             <>
                               {validation.nameError && <p className="text-[10.5px] text-rose-500 font-bold mt-1.5 px-1 animate-in fade-in">{validation.nameError}</p>}
                               {touched.name && !formData.name && !validation.nameError && <p className="text-[10.5px] text-rose-500 font-bold mt-1.5 px-1 animate-in fade-in">This field is required</p>}
                               {touched.name && formData.name.length > 0 && formData.name.length < 3 && !validation.nameError && <p className="text-[10.5px] text-rose-500 font-bold mt-1.5 px-1 animate-in fade-in">Must be at least 3 characters</p>}
                               {touched.name && formData.name.length > 20 && !validation.nameError && <p className="text-[10.5px] text-rose-500 font-bold mt-1.5 px-1 animate-in fade-in">Must be at most 20 characters</p>}
                             </>
                          </div>
                          <div className="space-y-2">
                             <label className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em] block text-left px-1">Institutional Alias (Short ID) <span className="text-rose-500 ml-1">*</span></label>
                             <input 
                               type="text" 
                               required
                               placeholder="DI-REG-01"
                               className={`w-full px-5 py-3.5 bg-white border rounded-2xl focus:ring-4 outline-none transition-all font-bold text-slate-800 text-sm shadow-sm ${
                                 touched.shortName && (!formData.shortName || formData.shortName.length < 2 || formData.shortName.length > 15)
                                   ? 'border-rose-300 focus:ring-rose-500/10 focus:border-rose-500'
                                   : 'border-slate-200 focus:ring-blue-500/10 focus:border-blue-500'
                               }`}
                               value={formData.shortName}
                               onChange={(e) => setFormData({ ...formData, shortName: e.target.value })}
                               disabled={!formData.type}
                               minLength={2}
                               maxLength={15}
                               onBlur={() => setTouched({ ...touched, shortName: true })}
                             />
                             <>
                               {touched.shortName && !formData.shortName && <p className="text-[10.5px] text-rose-500 font-bold mt-1.5 px-1 animate-in fade-in">This field is required</p>}
                               {touched.shortName && formData.shortName.length > 0 && formData.shortName.length < 2 && <p className="text-[10.5px] text-rose-500 font-bold mt-1.5 px-1 animate-in fade-in">Must be at least 2 characters</p>}
                               {touched.shortName && formData.shortName.length > 15 && <p className="text-[10.5px] text-rose-500 font-bold mt-1.5 px-1 animate-in fade-in">Must be at most 15 characters</p>}
                             </>
                          </div>
                        </div>
                        <div className="space-y-2 pt-2">
                           <label className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em] block text-left px-1">
                             Assign Administrator
                           </label>
                           <select 
                             className="w-full px-5 py-3.5 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold text-slate-800 text-sm shadow-sm disabled:opacity-50"
                             value={formData.adminId || ''}
                             onChange={(e) => setFormData({ ...formData, adminId: e.target.value })}
                             disabled={!formData.type}
                           >
                             <option value="">Unassigned</option>
                             {users.map((u: any) => (
                               <option key={u.uid} value={u.uid}>{u.name} ({u.role})</option>
                             ))}
                           </select>
                        </div>
                        <p className="text-[10px] text-slate-400 font-medium mt-4 px-1 italic">Short IDs are used for regional branding and cross-institutional synchronization.</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Feature & Permission Assignment */}
                {!initialData?.id && context !== 'branch' && (
                  <div className="md:col-span-2">
                    <div className="space-y-6 mt-8">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-6">
                         <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Feature & Access Config</h3>
                         {formData.features.length > 0 && (
                          <span className="bg-emerald-600 text-white text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-tighter animate-in fade-in zoom-in">
                            {formData.features.length} Components Active
                          </span>
                        )}
                      </div>

                      {validation.featuresError && (
                        <p className="text-[10.5px] text-rose-500 font-bold mb-4 px-1 animate-in fade-in">
                          {validation.featuresError}
                        </p>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         {availableFeatures.map((feature) => (
                            <FeatureConfigCard 
                              key={feature.id}
                              feature={feature}
                              disabled={!formData.type || activeCapsule !== 'Custom'}
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
                !formData.name || formData.name.length < 3 || formData.name.length > 20 ||
                !formData.shortName || formData.shortName.length < 2 || formData.shortName.length > 15 ||
                ((formData.type === 'branches' || formData.type === 'branch' || formData.type === 'universities') && (!formData.address || formData.address.length < 3 || formData.address.length > 30)) ||
                (context === 'sub-department' && !formData.parentId) ||
                !!validation.singletonError || 
                loading
              }
              className="px-8 py-3.5 bg-slate-900 text-white font-bold text-xs uppercase tracking-widest rounded-2xl shadow-xl shadow-slate-900/10 hover:bg-slate-800 hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
            >
              {initialData?.id ? 'Synchronize Updates' : `Register New ${formData.type === 'branch' ? 'Branch' : (context === 'sub-department' ? 'Sub-Department' : 'Department')}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function FeatureConfigCard({ feature, config, onToggle, onPermissionToggle, disabled }: any) {
  const [showDetails, setShowDetails] = useState(false);
  const isEnabled = !!config;

  return (
    <div className={`group rounded-2xl border-2 transition-all duration-300 flex flex-col ${
      isEnabled ? 'border-blue-600 bg-white ring-4 ring-blue-50/50' : 'border-slate-100 bg-slate-50/30 hover:border-slate-300'
    } ${disabled ? 'opacity-50 pointer-events-none grayscale' : ''}`}>
      <div className="p-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <button
            type="button"
            disabled={disabled}
            onClick={() => setShowDetails(!showDetails)}
            title="Click for full module brief"
            className={`p-2 rounded-xl border transition-all hover:scale-110 active:scale-95 shrink-0 ${
              isEnabled ? 'bg-blue-600 text-white border-blue-500' : 'bg-white text-slate-400 border-slate-200 shadow-sm'
            }`}
          >
            <feature.icon className="w-4 h-4" />
          </button>
          <div className="min-w-0 cursor-default" onClick={() => !disabled && setShowDetails(!showDetails)}>
            <h4 className={`text-xs font-bold truncate ${isEnabled ? 'text-blue-900' : 'text-slate-800'}`}>
              {feature.name}
            </h4>
          </div>
        </div>
        
        <button
          type="button"
          disabled={disabled}
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
                   disabled={disabled}
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
