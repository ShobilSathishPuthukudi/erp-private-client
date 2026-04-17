import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import { Megaphone, MessageSquare, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { Modal } from '@/components/shared/Modal';
import { PageHeader } from '@/components/shared/PageHeader';

interface Announcement {
  id: number;
  title: string;
  message: string;
  priority: 'normal' | 'urgent';
  expiryDate?: string;
  createdAt: string;
  author: {
    name: string;
    role: string;
  };
}

export default function Announcements() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedAnn, setSelectedAnn] = useState<Announcement | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({ title: '', message: '', priority: 'normal', expiryDate: '' });

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    try {
      const res = await api.get('/announcements/hr');
      setAnnouncements(res.data);
    } catch (error) {
      toast.error('Failed to load announcements');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const res = await api.post('/announcements/hr', formData);
      // Simulate real-time fetch or manually push
      setAnnouncements([res.data, ...announcements]);
      toast.success('Announcement broadcasted globally!');
      setIsModalOpen(false);
      setFormData({ title: '', message: '', priority: 'normal', expiryDate: '' });
      fetchAnnouncements(); // Refresh properly to get the author rel bindings
    } catch (error) {
      toast.error('Failed to broadcast announcement');
    } finally {
      setIsSubmitting(false);
    }
  };

  const priorityColors = {
    normal: 'bg-slate-100 text-slate-700 border-slate-200',
    urgent: 'bg-red-50 text-red-700 border-red-200 animate-pulse'
  };

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Global Announcements"
        description="Push real-time company-wide broadcasts and urgent notices."
        icon={Megaphone}
        action={
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center shadow-sm whitespace-nowrap"
          >
            <Megaphone className="w-4 h-4 mr-2" />
            Broadcast Notice
          </button>
        }
      />

      {loading ? (
        <div className="flex justify-center items-center h-64 border border-dashed rounded-lg border-slate-200 bg-white">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-800"></div>
        </div>
      ) : announcements.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed rounded-lg border-slate-200 bg-slate-50">
           <MessageSquare className="w-12 h-12 text-slate-300 mb-3" />
           <p className="text-slate-500 font-medium">No active broadcasts found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {announcements.map(ann => (
            <div 
              key={ann.id} 
              onClick={() => { setSelectedAnn(ann); setIsDetailOpen(true); }}
              className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 flex flex-col h-full relative overflow-hidden group hover:shadow-md transition-all cursor-pointer hover:scale-[1.02] active:scale-95"
            >
              
              {/* Decorative top border based on priority */}
              <div className={`absolute top-0 left-0 right-0 h-1.5 ${ann.priority === 'urgent' ? 'bg-red-500' : 'bg-blue-400'}`}></div>

              <div className="flex justify-between items-start mb-4 mt-2">
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${priorityColors[ann.priority as keyof typeof priorityColors]}`}>
                  {ann.priority} Priority
                </span>
                <div className="flex items-center text-xs text-slate-400">
                  <Clock className="w-3 h-3 mr-1" />
                  {format(new Date(ann.createdAt), 'MMM dd')}
                </div>
              </div>
              
              <h3 className="font-bold text-slate-900 text-lg mb-2 group-hover:text-blue-600 transition-colors">{ann.title}</h3>
              <p className="text-slate-600 text-sm whitespace-pre-wrap flex-1 mb-6 line-clamp-4">
                 {ann.message}
              </p>
              
              <div className="pt-4 border-t border-slate-100 flex items-center mt-auto">
                <div className="w-8 h-8 rounded-full bg-slate-100 flex justify-center items-center text-slate-600 font-bold text-xs mr-3">
                  {ann.author?.name ? ann.author.name.charAt(0).toUpperCase() : 'H'}
                </div>
                <div>
                   <p className="text-xs font-semibold text-slate-900">{ann.author?.name || 'HR Admin'}</p>
                   <p className="text-[10px] text-slate-500 capitalize">{ann.author?.role?.replace('-', ' ') || 'Human Resources'}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Broadcast Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create New Broadcast">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Notice Title *</label>
            <input 
              type="text" 
              required
              placeholder="Office Closure, Benefit Enrollment"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" 
              value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} 
            />
          </div>
          
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-tighter">Priority Level *</label>
            <select
              className="w-full border border-slate-200 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" 
              value={formData.priority} onChange={e => setFormData({...formData, priority: e.target.value as any})}
            >
              <option value="normal">Standard Protocol (Normal)</option>
              <option value="urgent">Urgent Directive (High Alert)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-tighter">Expiry Timestamp *</label>
            <input 
              type="datetime-local" 
              required
              className="w-full border border-slate-200 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" 
              value={formData.expiryDate} onChange={e => setFormData({...formData, expiryDate: e.target.value})} 
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Broadcast Message *</label>
            <textarea 
              rows={4}
              required
              placeholder="Enter the full announcement text here..."
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" 
              value={formData.message} onChange={e => setFormData({...formData, message: e.target.value})} 
            />
            <p className="text-[10px] text-slate-400 mt-1">Note: This will trigger a live popup notification to ALL active users instantly.</p>
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
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 flex items-center"
            >
              <Megaphone className="w-4 h-4 mr-2" />
              {isSubmitting ? 'Broadcasting...' : 'Broadcast Now'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Detail Modal */}
      <Modal isOpen={isDetailOpen} onClose={() => setIsDetailOpen(false)} title="Broadcast Details">
        {selectedAnn && (
          <div className="space-y-6">
            <div className="flex justify-between items-center bg-slate-50 -mx-6 -mt-6 p-6 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${selectedAnn.priority === 'urgent' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                  <Megaphone className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900">{selectedAnn.title}</h4>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    ID: #{selectedAnn.id} · {format(new Date(selectedAnn.createdAt), 'PPP')}
                  </p>
                </div>
              </div>
              <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${priorityColors[selectedAnn.priority as keyof typeof priorityColors]}`}>
                {selectedAnn.priority}
              </span>
            </div>

            <div className="space-y-4">
              <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200/50">
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Notice Content</div>
                <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap">
                  {selectedAnn.message}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border border-slate-100 bg-white">
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Author identity</div>
                  <div className="flex items-center">
                    <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-xs mr-3">
                      {selectedAnn.author?.name ? selectedAnn.author.name.charAt(0).toUpperCase() : 'H'}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900">{selectedAnn.author?.name || 'HR Admin'}</p>
                      <p className="text-[10px] text-slate-500 uppercase tracking-tighter">{selectedAnn.author?.role?.replace('-', ' ') || 'Human Resources'}</p>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-slate-100 bg-white">
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Life Cycle</div>
                  <div className="flex items-center text-xs text-slate-600 font-medium">
                    <Clock className="w-4 h-4 mr-2 text-slate-400" />
                    Expires: {selectedAnn.expiryDate ? format(new Date(selectedAnn.expiryDate), 'PPP p') : 'No Expiry Set'}
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-slate-200 flex justify-end">
              <button 
                onClick={() => setIsDetailOpen(false)}
                className="px-6 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-all active:scale-95 shadow-lg shadow-slate-900/20"
              >
                Dismiss Notice
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
