import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import { Plus, Phone, Mail, LayoutGrid, List as ListIcon, Clock, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import { Modal } from '@/components/shared/Modal';

type LeadStatus = 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'CONVERTED' | 'LOST';

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
}

export default function CRM() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConversionModalOpen, setIsConversionModalOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', source: '', notes: '' });
  const [conversionData, setConversionData] = useState({ subDeptId: '', operationsId: '', notes: '' });
  const [conversionOptions, setConversionOptions] = useState<{ subDepts: any[], opsManagers: any[] }>({ subDepts: [], opsManagers: [] });
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchLeads();
    fetchConversionOptions();
  }, []);

  const fetchLeads = async () => {
    try {
      const res = await api.get('/sales/leads');
      setLeads(res.data);
    } catch (error) {
      toast.error('Failed to load CRM leads');
    } finally {
      setLoading(false);
    }
  };

  const fetchConversionOptions = async () => {
    try {
      const res = await api.get('/sales/conversion-options');
      setConversionOptions(res.data);
    } catch (error) {
      console.error('Failed to load conversion options');
    }
  };

  const handleStatusChange = async (leadId: number, newStatus: LeadStatus) => {
    try {
      if (newStatus === 'CONVERTED') {
        const lead = leads.find(l => l.id === leadId);
        if (lead) {
          setSelectedLead(lead);
          setIsConversionModalOpen(true);
        }
        return;
      }
      
      let lossReason = '';
      if (newStatus === 'LOST') {
        lossReason = window.prompt('Please provide a reason for losing this lead:') || 'No reason provided';
      }

      await api.put(`/lead/${leadId}/stage`, { status: newStatus, remarks: lossReason }); 
      toast.success(`Lead lifecycle stage updated to ${newStatus}`);
      fetchLeads();
    } catch (error) {
      toast.error('Failed to update lead stage');
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
      toast.error(error.response?.data?.error || 'Conversion protocol breakdown');
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
      setFormData({ name: '', email: '', phone: '', source: '', notes: '' });
    } catch (error) {
      toast.error('Failed to capture lead');
    } finally {
      setIsSubmitting(false);
    }
  };

  const STATUS_COLUMNS: { id: LeadStatus, title: string, color: string }[] = [
    { id: 'NEW', title: 'New Leads', color: 'bg-blue-100 text-blue-800 border-blue-200' },
    { id: 'CONTACTED', title: 'Contacted', color: 'bg-amber-100 text-amber-800 border-amber-200' },
    { id: 'QUALIFIED', title: 'Qualified', color: 'bg-purple-100 text-purple-800 border-purple-200' },
    { id: 'CONVERTED', title: 'Converted', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
    { id: 'LOST', title: 'Lost/Dropped', color: 'bg-slate-100 text-slate-800 border-slate-200' }
  ];

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto p-6">
      <div className="flex justify-between items-center shrink-0">
        <div>
           <h1 className="text-4xl font-black text-slate-900 tracking-tight italic">Revenue Pipeline</h1>
           <p className="text-slate-500 font-medium">Manage institutional leads and convert them into operational centers.</p>
        </div>
        <div className="flex space-x-3">
          <div className="bg-white border border-slate-200 rounded-xl p-1 flex shadow-sm">
            <button 
              onClick={() => setViewMode('kanban')}
              className={`p-2 rounded-lg transition-all ${viewMode === 'kanban' ? 'bg-slate-900 text-white shadow-lg shadow-slate-200' : 'text-slate-400 hover:text-slate-600'}`}
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
      ) : viewMode === 'kanban' ? (
        <div className="flex space-x-6 overflow-x-auto pb-8 h-[calc(100vh-220px)] min-h-[600px] snap-x">
          {STATUS_COLUMNS.map(col => {
            const columnLeads = leads.filter(l => l.status === col.id);
            return (
              <div key={col.id} className="min-w-[340px] w-[340px] flex flex-col snap-start">
                <div className={`px-6 py-4 rounded-t-[2rem] border-t border-x border-b-4 bg-white shadow-sm flex justify-between items-center ${col.color}`}>
                  <h3 className="text-xs font-black uppercase tracking-[0.2em]">{col.title}</h3>
                  <span className="bg-white/50 px-3 py-1 rounded-full text-[10px] font-black">{columnLeads.length}</span>
                </div>
                <div className="bg-slate-50/50 border-x border-b border-slate-200 rounded-b-[2rem] p-4 flex-1 overflow-y-auto space-y-4">
                  {columnLeads.map(lead => (
                    <div key={lead.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-xl hover:border-blue-200 transition-all group relative">
                      <div className="flex justify-between items-start mb-3">
                        <h4 className="font-black text-slate-900 uppercase text-sm italic">{lead.name}</h4>
                        <div className="relative opacity-0 group-hover:opacity-100 transition-opacity">
                          <select 
                            value={lead.status}
                            onChange={(e) => handleStatusChange(lead.id, e.target.value as LeadStatus)}
                            className="text-[9px] font-black uppercase tracking-tighter border-2 border-slate-100 rounded-lg px-2 py-1 bg-slate-50 text-slate-600 cursor-pointer outline-none focus:border-blue-500"
                          >
                            <option value="NEW">New</option>
                            <option value="CONTACTED">Contacted</option>
                            <option value="QUALIFIED">Qualified</option>
                            <option value="CONVERTED">Converted</option>
                            <option value="LOST">Lost</option>
                          </select>
                        </div>
                      </div>
                      <div className="space-y-2 mb-4">
                        <div className="flex items-center text-xs text-slate-500 font-bold">
                          <Phone className="w-3.5 h-3.5 mr-2 text-blue-400" />
                          {lead.phone}
                        </div>
                        {lead.email && (
                          <div className="flex items-center text-xs text-slate-500 font-bold">
                            <Mail className="w-3.5 h-3.5 mr-2 text-blue-400" />
                            <span className="truncate">{lead.email}</span>
                          </div>
                        )}
                        <div className="flex items-center text-[10px] text-slate-400 font-black uppercase tracking-widest mt-4">
                           <Clock className="w-3.5 h-3.5 mr-2" />
                           {format(new Date(lead.createdAt), 'MMM dd, yyyy')}
                        </div>
                      </div>
                      
                      {lead.status === 'CONVERTED' && (
                        <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-emerald-600">
                           <span className="text-[10px] font-black uppercase tracking-widest">Institutional Node</span>
                           <CheckCircle2 className="w-4 h-4" />
                        </div>
                      )}
                    </div>
                  ))}
                  {columnLeads.length === 0 && (
                    <div className="h-32 border-2 border-dashed border-slate-200 rounded-3xl flex items-center justify-center bg-white/50">
                      <p className="text-[10px] text-slate-300 font-black uppercase tracking-[0.2em] italic">Empty Phase</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
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
                        value={lead.status}
                        onChange={(e) => handleStatusChange(lead.id, e.target.value as LeadStatus)}
                        className={`text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-xl border-none ring-1 cursor-pointer transition-all ${
                          lead.status === 'CONVERTED' ? 'bg-emerald-50 text-emerald-700 ring-emerald-100' :
                          lead.status === 'LOST' ? 'bg-slate-100 text-slate-600 ring-slate-200' :
                          'bg-white text-blue-700 ring-slate-200 hover:ring-blue-300'
                        }`}
                      >
                        <option value="NEW">New Lead</option>
                        <option value="CONTACTED">Contacted</option>
                        <option value="QUALIFIED">Qualified</option>
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
               <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Target Sub-Department *</label>
               <select 
                  required
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3 text-sm focus:border-blue-600 focus:bg-white focus:ring-0 transition-all font-bold"
                  value={conversionData.subDeptId}
                  onChange={e => setConversionData({...conversionData, subDeptId: e.target.value})}
               >
                  <option value="">Locate designated unit...</option>
                  {conversionOptions.subDepts.map(sd => (
                     <option key={sd.id} value={sd.id}>{sd.name}</option>
                  ))}
               </select>
            </div>

            <div className="space-y-2">
               <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Operations Oversight Manager *</label>
               <select 
                  required
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3 text-sm focus:border-blue-600 focus:bg-white focus:ring-0 transition-all font-bold"
                  value={conversionData.operationsId}
                  onChange={e => setConversionData({...conversionData, operationsId: e.target.value})}
               >
                  <option value="">Assign oversight agent...</option>
                  {conversionOptions.opsManagers.map(om => (
                     <option key={om.uid} value={om.uid}>{om.name} ({om.uid})</option>
                  ))}
               </select>
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
    </div>
  );
}
