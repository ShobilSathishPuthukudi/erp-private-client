import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import { Plus, Phone, Mail, LayoutGrid, List as ListIcon, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { Modal } from '@/components/shared/Modal';

type LeadStatus = 'lead' | 'contacted' | 'site_visit' | 'agreement' | 'converted' | 'lost';

interface Lead {
  id: number;
  name: string;
  email: string;
  phone: string;
  status: LeadStatus;
  source: string;
  notes: string;
  createdAt: string;
  assignee?: { name: string };
  referrer?: { name: string };
}

export default function CRM() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', source: '', notes: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchLeads();
  }, []);

  const fetchLeads = async () => {
    try {
      const res = await api.get('/leads');
      setLeads(res.data);
    } catch (error) {
      toast.error('Failed to load CRM leads');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (leadId: number, newStatus: LeadStatus) => {
    try {
      if (newStatus === 'converted') {
        const confirm = window.confirm('This will create a pending Study Center record for Operations. Proceed?');
        if (!confirm) return;
        await api.post(`/leads/${leadId}/convert`);
        toast.success('Lead converted to Center. Sent for Ops audit.');
      } else {
        await api.put(`/leads/${leadId}/stage`, { status: newStatus, remarks: 'Stage updated via CRM' });
        toast.success(`Lead status updated to ${newStatus}`);
      }
      fetchLeads();
    } catch (error) {
      toast.error('Failed to update lead status');
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
    { id: 'lead', title: 'New Leads', color: 'bg-blue-100 text-blue-800 border-blue-200' },
    { id: 'contacted', title: 'Contacted', color: 'bg-amber-100 text-amber-800 border-amber-200' },
    { id: 'site_visit', title: 'Site Visit', color: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
    { id: 'agreement', title: 'Agreement', color: 'bg-purple-100 text-purple-800 border-purple-200' },
    { id: 'converted', title: 'Converted', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
    { id: 'lost', title: 'Lost/Dropped', color: 'bg-slate-100 text-slate-800 border-slate-200' }
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center shrink-0">
        <div>
           <h1 className="text-2xl font-bold text-slate-900">Sales CRM</h1>
           <p className="text-slate-500">Track prospective admissions through the entire lifecycle funnel.</p>
        </div>
        <div className="flex space-x-3">
          <div className="bg-white border border-slate-200 rounded-lg p-1 flex shadow-sm">
            <button 
              onClick={() => setViewMode('kanban')}
              className={`p-1.5 rounded transition-colors ${viewMode === 'kanban' ? 'bg-slate-100 text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded transition-colors ${viewMode === 'list' ? 'bg-slate-100 text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <ListIcon className="w-4 h-4" />
            </button>
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center shadow-sm"
          >
            <Plus className="w-4 h-4 mr-2" />
            Capture Lead
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64 border border-dashed rounded-lg border-slate-200 bg-white">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-800"></div>
        </div>
      ) : viewMode === 'kanban' ? (
        <div className="flex space-x-4 overflow-x-auto pb-4 h-[calc(100vh-200px)] min-h-[500px] snap-x">
          {STATUS_COLUMNS.map(col => {
            const columnLeads = leads.filter(l => l.status === col.id);
            return (
              <div key={col.id} className="min-w-[320px] w-80 flex flex-col snap-start">
                <div className={`px-4 py-3 rounded-t-lg border-t border-x border-b-4 bg-white shadow-sm flex justify-between items-center ${col.color}`}>
                  <h3 className="font-semibold">{col.title}</h3>
                  <span className="bg-white/50 px-2 py-0.5 rounded-full text-xs font-bold">{columnLeads.length}</span>
                </div>
                <div className="bg-slate-100/50 border-x border-b border-slate-200 rounded-b-lg p-3 flex-1 overflow-y-auto space-y-3">
                  {columnLeads.map(lead => (
                    <div key={lead.id} className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow group relative">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-bold text-slate-900">{lead.name}</h4>
                        {/* Status Dropdown */}
                        <div className="relative opacity-0 group-hover:opacity-100 transition-opacity">
                          <select 
                            value={lead.status}
                            onChange={(e) => handleStatusChange(lead.id, e.target.value as LeadStatus)}
                            className="text-xs border border-slate-200 rounded px-1 py-0.5 bg-slate-50 text-slate-600 cursor-pointer outline-none"
                          >
                            <option value="new">New</option>
                            <option value="contacted">Contacted</option>
                            <option value="qualified">Qualified</option>
                            <option value="enrolled">Enrolled</option>
                            <option value="lost">Lost</option>
                          </select>
                        </div>
                      </div>
                      <div className="space-y-1.5 mb-3">
                        <div className="flex items-center text-xs text-slate-600">
                          <Phone className="w-3 h-3 mr-2" />
                          {lead.phone}
                        </div>
                        {lead.email && (
                          <div className="flex items-center text-xs text-slate-600">
                            <Mail className="w-3 h-3 mr-2 truncate" />
                            {lead.email}
                          </div>
                        )}
                        <div className="flex items-center text-xs text-slate-400 mt-2">
                           <Clock className="w-3 h-3 mr-2" />
                           {format(new Date(lead.createdAt), 'MMM dd, yyyy')}
                        </div>
                      </div>
                    </div>
                  ))}
                  {columnLeads.length === 0 && (
                    <div className="h-24 border-2 border-dashed border-slate-200 rounded-lg flex items-center justify-center">
                      <p className="text-xs text-slate-400 font-medium tracking-wider uppercase">Empty pipeline</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* List View */
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4">Lead Info</th>
                  <th className="px-6 py-4">Contact</th>
                  <th className="px-6 py-4">Source</th>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {leads.map(lead => (
                  <tr key={lead.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900">{lead.name}</div>
                      {lead.assignee && <div className="text-xs text-slate-500">Rep: {lead.assignee.name}</div>}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-slate-700">{lead.phone}</div>
                      <div className="text-xs text-slate-500">{lead.email || 'No email provided'}</div>
                    </td>
                    <td className="px-6 py-4 text-slate-600 font-medium">
                      {lead.source}
                    </td>
                    <td className="px-6 py-4 text-slate-500 text-xs">
                      {format(new Date(lead.createdAt), 'MMM dd, yyyy')}
                    </td>
                    <td className="px-6 py-4">
                      <select 
                        value={lead.status}
                        onChange={(e) => handleStatusChange(lead.id, e.target.value as LeadStatus)}
                        className={`text-xs font-semibold px-2.5 py-1 rounded-full border outline-none cursor-pointer ${
                          STATUS_COLUMNS.find(c => c.id === lead.status)?.color.replace('border-', 'border-').split(' ')[0]
                        } ${STATUS_COLUMNS.find(c => c.id === lead.status)?.color.split(' ')[1]}`}
                      >
                        <option value="new">New Lead</option>
                        <option value="contacted">Contacted</option>
                        <option value="qualified">Qualified</option>
                        <option value="enrolled">Enrolled</option>
                        <option value="lost">Lost</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Capture New Lead">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Full Name *</label>
            <input 
              type="text" 
              required
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
              value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} 
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Phone *</label>
              <input 
                type="tel" 
                required
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
              <input 
                type="email" 
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} 
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Lead Source</label>
            <select
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
              value={formData.source} onChange={e => setFormData({...formData, source: e.target.value})}
            >
              <option value="">Select source...</option>
              <option value="Website">Website Form</option>
              <option value="Referral">Referral</option>
              <option value="Walk-in">Walk-in Center</option>
              <option value="Campaign">Marketing Campaign</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Initial Notes</label>
            <textarea 
              rows={3}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
              value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} 
            />
          </div>

          <div className="pt-4 border-t border-slate-200 flex justify-end space-x-3">
            <button 
              type="button" 
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Capturing...' : 'Capture Lead'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
