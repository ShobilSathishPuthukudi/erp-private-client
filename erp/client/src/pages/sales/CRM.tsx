import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import toast from 'react-hot-toast';
import { Plus, Phone, Mail, LayoutGrid, List as ListIcon, Clock, CheckCircle2, UserCircle2, Users, Edit2, X, ShieldCheck, Check, GitMerge } from 'lucide-react';
import { format } from 'date-fns';
import { Modal } from '@/components/shared/Modal';

type LeadStatus = 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'SHORTLISTED' | 'PROPOSED' | 'CONVERTED' | 'LOST';

interface Lead {
  id: number;
  name: string;
  email: string;
  phone: string;
  status: LeadStatus;
  source: string;
  notes: string;
  lossReason?: string;
  createdAt: string;
  assignee?: {
    name: string;
  };
}

export default function CRM({ category: propCategory }: { category?: 'PIPELINE' | 'CLOSED' }) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<'PIPELINE' | 'CLOSED'>(propCategory || 'PIPELINE');
  const [activeTab, setActiveTab] = useState<LeadStatus>('NEW');
  const [viewMode, setViewMode] = useState<'tabs' | 'list'>('tabs');
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConversionModalOpen, setIsConversionModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', source: '', notes: '', assignedTo: '' });
  const [conversionData, setConversionData] = useState({ programIds: [] as number[], notes: '', shortName: '', email: '' });
  const [editData, setEditData] = useState({ programIds: [] as number[] });
  const [conversionOptions, setConversionOptions] = useState<{ programs: any[], salesStaff: any[] }>({ programs: [], salesStaff: [] });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [updatingLeadId, setUpdatingLeadId] = useState<number | null>(null);

  useEffect(() => {
    fetchLeads();
    fetchConversionOptions();
  }, []);

  useEffect(() => {
    if (propCategory) {
      setActiveCategory(propCategory);
      const group = CATEGORIES.find(c => c.id === propCategory);
      if (group) setActiveTab(group.statuses[0]);
    }
  }, [propCategory]);

  const fetchLeads = async () => {
    try {
      const res = await api.get('/sales/leads');
      setLeads(res.data || []);
    } catch (error) {
      console.error('Failed to load CRM leads:', error);
      setLeads([]);
      toast.error('Failed to load CRM leads');
    } finally {
      setLoading(false);
    }
  };

  const fetchConversionOptions = async () => {
    try {
      const res = await api.get('/sales/conversion-options');
      setConversionOptions(res.data || { programs: [], salesStaff: [] });
    } catch (error) {
      console.error('Failed to load conversion options:', error);
      setConversionOptions({ programs: [], salesStaff: [] });
    }
  };

  const handleStatusChange = async (leadId: number, newStatus: LeadStatus) => {
    setUpdatingLeadId(leadId);
    try {
      if (newStatus === 'CONVERTED') {
        const lead = leads.find(l => l.id === leadId);
        if (lead) {
          setSelectedLead(lead);
          setConversionData({
            ...conversionData,
            email: lead.email || '',
            shortName: lead.name.substring(0, 5).toUpperCase()
          });
          setIsConversionModalOpen(true);
        }
        return;
      }
      
      let lossReason = '';
      if (newStatus === 'LOST') {
        lossReason = window.prompt('Please provide a reason for losing this lead:') || 'No reason provided';
      }

      await api.put(`/sales/leads/${leadId}/status`, { status: newStatus, remarks: lossReason }); 
      toast.success(`Lead lifecycle stage updated to ${newStatus}`);
      fetchLeads();
    } catch (error) {
      toast.error('Failed to update lead stage');
    } finally {
      setUpdatingLeadId(null);
    }
  };

  const onConvertSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLead) return;
    setIsSubmitting(true);
    try {
      await api.post(`/sales/leads/${selectedLead.id}/convert-to-center`, conversionData);
      toast.success('Strategic conversion successful. Center node created for audit.');
      setIsConversionModalOpen(false);
      fetchLeads();
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || error.response?.data?.message || 'Conversion protocol breakdown';
      toast.error(errorMsg, { duration: 5000 });
      console.error('CONVERSION_FAILURE:', error.response?.data);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditPrograms = async (lead: Lead) => {
    setSelectedLead(lead);
    setIsSubmitting(true);
    try {
      const res = await api.get(`/sales/leads/${lead.id}/center-programs`);
      const currentIds = res.data.map((m: any) => m.programId);
      setEditData({ programIds: currentIds });
      setIsEditModalOpen(true);
    } catch (error) {
      toast.error('Failed to load current programs');
    } finally {
      setIsSubmitting(false);
    }
  };

  const onEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLead) return;
    setIsSubmitting(true);
    try {
      await api.put(`/sales/leads/${selectedLead.id}/sync-programs`, editData);
      toast.success('Course mapping re-synchronized successfully.');
      setIsEditModalOpen(false);
      fetchLeads();
    } catch (error: any) {
      toast.error('GORM sync breakdown');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const res = await api.post('/sales/leads', formData);
      setLeads([res.data, ...leads]);
      toast.success('Lead captured successfully');
      setIsModalOpen(false);
      setFormData({ name: '', email: '', phone: '', source: '', notes: '', assignedTo: '' });
    } catch (error) {
      toast.error('Failed to capture lead');
    } finally {
      setIsSubmitting(false);
    }
  };

  const STATUS_COLUMNS: { id: LeadStatus, title: string, color: string }[] = [
    { id: 'NEW', title: 'New Leads', color: 'text-blue-600 bg-blue-50' },
    { id: 'CONTACTED', title: 'Contacted', color: 'text-amber-600 bg-amber-50' },
    { id: 'QUALIFIED', title: 'Qualified', color: 'text-purple-600 bg-purple-50' },
    { id: 'SHORTLISTED', title: 'Shortlisted', color: 'text-pink-600 bg-pink-50' },
    { id: 'PROPOSED', title: 'Proposed', color: 'text-orange-600 bg-orange-50' },
    { id: 'CONVERTED', title: 'Converted', color: 'text-emerald-600 bg-emerald-50' },
    { id: 'LOST', title: 'Lost/Dropped', color: 'text-slate-600 bg-slate-50' }
  ];

  const CATEGORIES: { id: 'PIPELINE' | 'CLOSED', label: string, statuses: LeadStatus[] }[] = [
    { id: 'PIPELINE', label: 'Active Pipeline', statuses: ['NEW', 'CONTACTED', 'QUALIFIED', 'SHORTLISTED', 'PROPOSED'] },
    { id: 'CLOSED', label: 'Strategic Outcome', statuses: ['CONVERTED', 'LOST'] }
  ];

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto p-6">
      <div className="flex justify-between items-center shrink-0">
        <div>
           <h1 className="text-4xl font-black text-slate-900 tracking-tight">CRM Pipeline</h1>
           <p className="text-slate-500 font-medium whitespace-nowrap">Manage institutional leads and convert them into operational centers.</p>
        </div>
        <div className="flex space-x-3">
          <div className="bg-white border border-slate-200 rounded-xl p-1 flex shadow-sm">
            <button 
              onClick={() => setViewMode('tabs')}
              className={`p-2 rounded-lg transition-all ${viewMode === 'tabs' ? 'bg-slate-900 text-white shadow-lg shadow-slate-200' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-slate-900 text-white shadow-lg shadow-slate-200' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <ListIcon className="w-4 h-4" />
            </button>
          </div>
          <button 
            onClick={() => {
              const link = `${window.location.origin}/register-center/${useAuthStore.getState().user?.uid}`;
              navigator.clipboard.writeText(link);
              toast.success('Your unique partnership link has been copied to clipboard!');
            }}
            className="bg-slate-900 text-white px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all shadow-xl shadow-slate-100 active:scale-95 flex items-center gap-2 border border-slate-700"
          >
            <ShieldCheck className="w-4 h-4 text-blue-400" />
            Share Your Link
          </button>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-blue-600 text-white px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 active:scale-95 flex items-center"
          >
            <Plus className="w-4 h-4 mr-2" />
            Capture Lead
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-96 bg-white rounded-[2rem] border-2 border-dashed border-slate-200">
           <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-sm font-black text-slate-400 uppercase tracking-widest">Syncing Pipeline...</p>
           </div>
        </div>
      ) : viewMode === 'tabs' ? (
        <div className="space-y-6">
          {/* Module Context (Conditional based on sidebar state) */}
          {!propCategory && (
            <div className="flex items-center space-x-2 mb-2 bg-slate-50/50 p-1.5 rounded-2xl border border-slate-100 w-fit">
              <button className="px-6 py-2 bg-white text-slate-800 font-black text-[10px] uppercase tracking-[0.2em] rounded-xl shadow-sm flex items-center gap-3 border border-slate-200/50 hover:bg-slate-50 transition-colors">
                <Users className="w-3.5 h-3.5 text-blue-600" />
                Sales Ops
              </button>
              <div className="px-4 text-[10px] font-bold text-slate-300 uppercase tracking-widest hidden md:block border-l border-slate-200 ml-2">
                Unified Institutional CRM
              </div>
            </div>
          )}

          {/* Layer 2: Strategic Navigation (Only shown if NOT in sidebar) */}
          {!propCategory && (
            <div className="flex items-center space-x-10 border-b border-slate-100 pb-px">
              {CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => {
                    setActiveCategory(cat.id);
                    setActiveTab(cat.statuses[0]);
                  }}
                  className={`pb-4 text-[11px] font-black uppercase tracking-[0.2em] transition-all relative ${
                    activeCategory === cat.id ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  {cat.label}
                  {activeCategory === cat.id && (
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600 rounded-t-full shadow-[0_-4px_10px_rgba(37,99,235,0.2)]" />
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Minimal Sub-Tabs */}
          <div className="flex items-center space-x-3 overflow-x-auto pb-2 scrollbar-hide">
            {STATUS_COLUMNS.filter(col => CATEGORIES.find(cat => cat.id === activeCategory)?.statuses.includes(col.id)).map(col => {
              const count = leads.filter(l => l.status === col.id).length;
              return (
                <button
                  key={col.id}
                  onClick={() => setActiveTab(col.id)}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-xl transition-all border ${
                    activeTab === col.id 
                      ? 'bg-slate-900 border-slate-900 text-white shadow-lg' 
                      : 'bg-white border-slate-100 text-slate-500 hover:border-slate-200'
                  }`}
                >
                  <span className="text-[10px] font-black uppercase tracking-widest">{col.title}</span>
                  <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black ${activeTab === col.id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {leads.filter(l => l.status === activeTab).map(lead => {
              const isStatusMismatch = lead.status !== activeTab;
              return (
                <div key={lead.id} className={`bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm hover:shadow-2xl hover:border-blue-200 transition-all group relative overflow-hidden ${isStatusMismatch ? 'opacity-40 grayscale pointer-events-none' : ''}`}>
                <div className={`absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 rounded-full opacity-10 transition-transform group-hover:scale-110 ${STATUS_COLUMNS.find(c => c.id === lead.status)?.color.split(' ')[0]}`}></div>
                
                <div className="flex justify-between items-start mb-4 relative z-10">
                  <div>
                    <h4 className="font-black text-slate-900 uppercase text-lg italic tracking-tight">{lead.name}</h4>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">ID: {lead.id}</span>
                  </div>
                  <div className="relative">
                    <select 
                      disabled={updatingLeadId === lead.id}
                      value={lead.status}
                      onChange={(e) => handleStatusChange(lead.id, e.target.value as LeadStatus)}
                      className="text-[10px] font-black uppercase tracking-tighter border-2 border-slate-100 rounded-xl px-3 py-1.5 bg-slate-50 text-slate-600 cursor-pointer outline-none focus:border-blue-500 transition-all shadow-sm"
                    >
                      {STATUS_COLUMNS.map(c => (
                        <option key={c.id} value={c.id}>{c.title}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-3 mb-6 relative z-10">
                  <div className="flex items-center text-sm text-slate-600 font-bold bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <Phone className="w-4 h-4 mr-3 text-blue-500" />
                    {lead.phone}
                  </div>
                  {lead.email && (
                    <div className="flex items-center text-sm text-slate-600 font-bold bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <Mail className="w-4 h-4 mr-3 text-blue-500" />
                      <span className="truncate">{lead.email}</span>
                    </div>
                  )}
                  {lead.source === 'Referral' && lead.assignee && (
                    <div className="flex items-center text-[10px] font-black uppercase tracking-widest text-indigo-600 bg-indigo-50 p-2 rounded-lg border border-indigo-100">
                      <UserCircle2 className="w-3.5 h-3.5 mr-2" />
                      Proposed By: {lead.assignee.name}
                    </div>
                  )}
                </div>
                
                <div className="flex items-center justify-between text-[10px] text-slate-400 font-black uppercase tracking-widest pt-4 border-t border-slate-100">
                   <div className="flex items-center">
                    <Clock className="w-3.5 h-3.5 mr-2" />
                    {format(new Date(lead.createdAt), 'MMM dd, yyyy')}
                   </div>
                   {lead.source && (
                     <span className="bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">{lead.source}</span>
                   )}
                </div>

                {lead.status === 'CONVERTED' && (
                  <div className="mt-4 pt-4 border-t-2 border-dashed border-emerald-100 flex items-center justify-between text-emerald-600 bg-emerald-50/50 -mx-6 -mb-6 px-6 py-4">
                     <div className="flex flex-col">
                        <span className="text-[10px] font-black uppercase tracking-widest">Master Node Activated</span>
                        <button 
                          onClick={() => handleEditPrograms(lead)}
                          className="text-[9px] font-black uppercase text-blue-600 hover:text-blue-800 transition-colors text-left flex items-center mt-1"
                        >
                          <Edit2 className="w-3 h-3 mr-1" /> Edit Programs
                        </button>
                     </div>
                     <CheckCircle2 className="w-5 h-5" />
                  </div>
                )}
              </div>
              );
            })}
            {leads.filter(l => l.status === activeTab).length === 0 && (
              <div className="col-span-full h-64 border-4 border-dashed border-slate-100 rounded-[3rem] flex flex-col items-center justify-center bg-white/50">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                  <LayoutGrid className="w-8 h-8 text-slate-200" />
                </div>
                <p className="text-sm text-slate-300 font-black uppercase tracking-[0.3em]">No entities in this phase</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* List View */
        <div className="bg-white border border-slate-200 rounded-[2.5rem] shadow-xl shadow-slate-100/50 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-900 text-white text-[10px] uppercase font-black tracking-[0.2em] border-b border-slate-800">
                <tr>
                  <th className="px-8 py-5">Entity Information</th>
                  <th className="px-8 py-5">Communication Channels</th>
                  <th className="px-8 py-5">Origin</th>
                  <th className="px-8 py-5">Capture Date</th>
                  <th className="px-8 py-5">Funnel Stage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {leads.map(lead => (
                  <tr key={lead.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-8 py-5">
                      <div className="font-black text-slate-900 uppercase italic tracking-tight">{lead.name}</div>
                      <div className="text-[10px] font-bold text-slate-400 mt-0.5 uppercase tracking-widest leading-none">ID: LEAD-{lead.id}</div>
                    </td>
                    <td className="px-8 py-5">
                      <div className="text-slate-700 font-bold">{lead.phone}</div>
                      <div className="text-[10px] font-medium text-slate-400 truncate max-w-[150px]">{lead.email || 'NO_EMAIL_TOKEN'}</div>
                    </td>
                    <td className="px-8 py-5">
                       <span className="bg-slate-100 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest text-slate-600 border border-slate-200">{lead.source}</span>
                    </td>
                    <td className="px-8 py-5 text-slate-500 text-xs font-bold">
                      {format(new Date(lead.createdAt), 'MMM dd, yyyy')}
                    </td>
                    <td className="px-8 py-5">
                      <select 
                        disabled={updatingLeadId === lead.id || lead.status !== activeTab}
                        className={`text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-xl border-none ring-1 cursor-pointer transition-all ${
                          lead.status !== activeTab ? 'opacity-30 cursor-not-allowed grayscale' :
                          lead.status === 'CONVERTED' ? 'bg-emerald-50 text-emerald-700 ring-emerald-100' :
                          lead.status === 'LOST' ? 'bg-slate-100 text-slate-600 ring-slate-200' :
                          'bg-white text-blue-700 ring-slate-200 hover:ring-blue-300'
                        }`}
                        value={lead.status}
                        onChange={(e) => handleStatusChange(lead.id, e.target.value as LeadStatus)}
                      >
                        <option value="NEW">New Lead</option>
                        <option value="CONTACTED">Contacted</option>
                        <option value="QUALIFIED">Qualified</option>
                        <option value="SHORTLISTED">Shortlisted</option>
                        <option value="PROPOSED">Proposed</option>
                        <option value="CONVERTED">Converted</option>
                        <option value="LOST">Lost</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Capture Lead Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Institutional Lead Capture">
        <form onSubmit={handleSubmit} className="space-y-6 p-2">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Entity Name / Organization *</label>
            <input 
              type="text" 
              required
              className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3 text-sm focus:border-blue-600 focus:bg-white focus:ring-0 transition-all font-bold" 
              value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} 
            />
          </div>
          
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Primary Phone *</label>
              <input 
                type="tel" 
                required
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3 text-sm focus:border-blue-600 focus:bg-white focus:ring-0 transition-all font-bold" 
                value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} 
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Communication Email</label>
              <input 
                type="email" 
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3 text-sm focus:border-blue-600 focus:bg-white focus:ring-0 transition-all font-bold" 
                value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} 
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Acquisition Source</label>
              <select
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3 text-sm focus:border-blue-600 focus:bg-white focus:ring-0 transition-all font-bold" 
                value={formData.source} onChange={e => setFormData({...formData, source: e.target.value})}
              >
                <option value="">Select source...</option>
                <option value="Website">Institutional Website</option>
                <option value="Referral">Sales Referral</option>
                <option value="Walk-in">Physical Inquiry</option>
                <option value="Campaign">Marketing Deployment</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Sales Staff (Captured By) *</label>
              <select
                required
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3 text-sm focus:border-blue-600 focus:bg-white focus:ring-0 transition-all font-bold" 
                value={formData.assignedTo} onChange={e => setFormData({...formData, assignedTo: e.target.value})}
              >
                <option value="">Select staff...</option>
                {conversionOptions.salesStaff.map(staff => (
                  <option key={staff.uid} value={staff.uid}>{staff.name}</option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Strategic Remarks</label>
            <textarea 
              rows={3}
              className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3 text-sm focus:border-blue-600 focus:bg-white focus:ring-0 transition-all font-medium" 
              value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} 
            />
          </div>

          <div className="pt-6 flex gap-3">
            <button 
              type="button" 
              onClick={() => setIsModalOpen(false)}
              className="flex-1 px-6 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest text-slate-500 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={isSubmitting}
              className="flex-1 px-6 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all disabled:opacity-50"
            >
              {isSubmitting ? 'Capturing...' : 'Establish Lead'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Conversion Modal */}
      <Modal isOpen={isConversionModalOpen} onClose={() => setIsConversionModalOpen(false)} title="Center Conversion Protocol">
         <form onSubmit={onConvertSubmit} className="space-y-6 p-2">
            <div className="p-5 bg-blue-50 border border-blue-100 rounded-3xl">
               <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em] mb-1">Converting Prospect</p>
               <h4 className="text-xl font-black text-blue-900 italic tracking-tight uppercase leading-none">{selectedLead?.name}</h4>
            </div>

            <div className="space-y-2">
               <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Login ID / Primary Email *</label>
               <input 
                  type="email"
                  required
                  placeholder="center@erp.com"

                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3 text-sm focus:border-blue-600 focus:bg-white focus:ring-0 transition-all font-bold"
                  value={conversionData.email}
                  onChange={e => setConversionData({...conversionData, email: e.target.value})}
               />
               <p className="text-[10px] font-bold text-blue-600 mt-1 pl-1 uppercase tracking-tight flex items-center gap-1.5">
                  <ShieldCheck className="w-3 h-3" />
                  This will be the center's unique login identifier
               </p>
            </div>

            <div className="space-y-2">
               <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Center Short Name *</label>
               <input 
                  type="text"
                  required
                  placeholder="IITS-MUM"
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3 text-sm focus:border-blue-600 focus:bg-white focus:ring-0 transition-all font-bold placeholder:text-slate-300 uppercase"
                  value={conversionData.shortName}
                  onChange={e => setConversionData({...conversionData, shortName: e.target.value.toUpperCase()})}
               />
            </div>

            <div className="space-y-3">
               <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Strategic Entry Programs *</label>
               
               {/* Multi-Select Capsule Container */}
               {conversionData.programIds.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                     {conversionData.programIds.map(id => {
                        const p = conversionOptions.programs.find(prog => prog.id === id);
                        return (
                           <div key={id} className="group flex items-center gap-2 bg-blue-50 border border-blue-100 pl-3 pr-1 py-1 rounded-full animate-in fade-in zoom-in duration-200">
                              <span className="text-[10px] font-black text-blue-700 uppercase tracking-tight">
                                 {p?.shortName || p?.name?.substring(0, 10) || 'UNTITLED'} 
                                 <span className="ml-1 text-[8px] opacity-40">({p?.type})</span>
                              </span>
                              <button 
                                 type="button"
                                 onClick={() => setConversionData({
                                    ...conversionData, 
                                    programIds: conversionData.programIds.filter(pid => pid !== id)
                                 })}
                                 className="w-5 h-5 flex items-center justify-center rounded-full bg-white text-blue-400 hover:bg-red-500 hover:text-white transition-all shadow-sm"
                              >
                                 <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                              </button>
                           </div>
                        );
                     })}
                  </div>
               )}

               <select 
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3 text-sm focus:border-blue-600 focus:bg-white focus:ring-0 transition-all font-bold"
                  onChange={e => {
                     const id = parseInt(e.target.value);
                     if (id && !conversionData.programIds.includes(id)) {
                        setConversionData({...conversionData, programIds: [...conversionData.programIds, id]});
                     }
                     e.target.value = ""; // Reset select
                  }}
               >
                  <option value="">Add strategic program...</option>
                  {conversionOptions.programs.filter(p => !conversionData.programIds.includes(p.id)).map(p => (
                     <option key={p.id} value={p.id}>{p.name} ({p.type})</option>
                  ))}
               </select>

               {conversionData.programIds.length === 0 && (
                  <p className="text-[10px] font-bold text-amber-600 animate-pulse">Select one or more programs for center mapping.</p>
               )}
            </div>


            <div className="space-y-2">
               <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Handoff Instructions / Notes</label>
               <textarea 
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3 text-sm focus:border-blue-600 focus:bg-white focus:ring-0 transition-all font-medium h-24"
                  placeholder="Provide forensic context for the operations team..."
                  value={conversionData.notes}
                  onChange={e => setConversionData({...conversionData, notes: e.target.value})}
               />
            </div>

            <div className="pt-6 flex gap-3">
               <button 
                  type="button" 
                  onClick={() => setIsConversionModalOpen(false)}
                  className="flex-1 px-6 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest text-slate-500 hover:bg-slate-100 transition-colors"
               >
                  Decline
               </button>
               <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="flex-1 px-6 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-2xl shadow-slate-200 hover:bg-slate-800 transition-all disabled:opacity-50"
               >
                  {isSubmitting ? 'PROCESSING...' : 'INITIALIZE CENTER'}
               </button>
            </div>
         </form>
      </Modal>

      {/* Edit Programs Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] w-full max-w-xl overflow-hidden shadow-2xl border border-white/20 animate-in fade-in zoom-in duration-300">
            <div className="bg-blue-600 px-10 py-8 text-white relative">
               <button onClick={() => setIsEditModalOpen(false)} className="absolute top-8 right-8 text-white/50 hover:text-white transition-colors">
                  <X className="w-6 h-6" />
               </button>
               <h3 className="text-3xl font-black uppercase tracking-tighter italic">Re-Synchronize Mapping</h3>
               <p className="text-blue-100 text-sm font-bold uppercase tracking-widest mt-1 opacity-70">Center Protocol Revision</p>
            </div>

            <form onSubmit={onEditSubmit} className="p-10 space-y-8">
               <div className="flex items-center space-x-4 bg-blue-50/50 p-4 rounded-[2rem] border border-blue-100/50">
                  <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-200">
                     <ShieldCheck className="w-6 h-6" />
                  </div>
                  <h4 className="text-xl font-black text-blue-900 italic tracking-tight uppercase leading-none">{selectedLead?.name}</h4>
               </div>

               <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Update Associated Programs *</label>
                  
                  <div className="grid grid-cols-2 gap-3 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                     {conversionOptions.programs.map(prog => {
                        const isSelected = editData.programIds.includes(prog.id);
                        return (
                           <button
                              key={prog.id}
                              type="button"
                              onClick={() => {
                                 setEditData({
                                    ...editData,
                                    programIds: isSelected 
                                       ? editData.programIds.filter(id => id !== prog.id)
                                       : [...editData.programIds, prog.id]
                                 });
                              }}
                              className={`p-4 rounded-2xl border-2 transition-all text-left flex items-start space-x-3 ${isSelected ? 'border-blue-600 bg-blue-50/50' : 'border-slate-100 bg-slate-50 flex items-center justify-center'}`}
                           >
                              <div className={`mt-0.5 w-4 h-4 rounded-md border-2 flex items-center justify-center transition-colors ${isSelected ? 'bg-blue-600 border-blue-600' : 'border-slate-300 bg-white'}`}>
                                 {isSelected && <Check className="w-3 h-3 text-white" />}
                              </div>
                              <div className="flex flex-col">
                                 <span className={`text-[10px] font-black uppercase leading-none ${isSelected ? 'text-blue-900' : 'text-slate-600'}`}>{prog.name}</span>
                                 <div className="flex items-center gap-2 mt-1">
                                    {prog.shortName && (
                                       <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">[{prog.shortName}]</span>
                                    )}
                                    <span className={`text-[7px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-widest ${isSelected ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-500'}`}>
                                       {prog.type}
                                    </span>
                                 </div>
                              </div>
                           </button>
                        );
                     })}
                  </div>

                  {/* Selected Capsules */}
                  <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-slate-100">
                     {editData.programIds.map(id => {
                        const p = conversionOptions.programs.find(p => p.id === id);
                        return (
                           <div key={id} className="bg-blue-600 text-white text-[9px] font-black uppercase px-3 py-1.5 rounded-full flex items-center shadow-lg shadow-blue-100">
                              {p?.shortName || p?.name?.substring(0, 3)}
                              <span className="ml-2 opacity-50 text-[7px]">{p?.type}</span>
                              <button type="button" onClick={() => setEditData({...editData, programIds: editData.programIds.filter(pid => pid !== id)})} className="ml-2 hover:text-red-200">
                                 <X className="w-3 h-3" />
                              </button>
                           </div>
                        );
                     })}
                     {editData.programIds.length === 0 && (
                        <span className="text-[10px] font-bold text-slate-300 uppercase italic">No programs mapped for this center.</span>
                     )}
                  </div>
               </div>

               <button
                  type="submit"
                  disabled={isSubmitting || editData.programIds.length === 0}
                  className="w-full bg-slate-900 text-white py-5 rounded-[2rem] font-black uppercase tracking-widest hover:bg-black transition-all shadow-xl shadow-slate-200 disabled:opacity-50 flex items-center justify-center space-x-3 group"
               >
                  {isSubmitting ? 'RE-MAPPING PROTOCOL...' : 'Apply Mapping Changes'}
                  {!isSubmitting && <GitMerge className="w-5 h-5 group-hover:rotate-12 transition-transform" />}
               </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
