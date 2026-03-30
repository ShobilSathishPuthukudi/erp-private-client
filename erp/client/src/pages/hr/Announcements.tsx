import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import { Megaphone, MessageSquare, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { Modal } from '@/components/shared/Modal';

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
      <div className="flex justify-between items-center shrink-0">
        <div>
           <h1 className="text-2xl font-bold text-slate-900">Global Announcements</h1>
           <p className="text-slate-500">Push real-time company-wide broadcasts and urgent notices.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center shadow-sm"
        >
          <Megaphone className="w-4 h-4 mr-2" />
          Broadcast Notice
        </button>
      </div>

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
            <div key={ann.id} className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 flex flex-col h-full relative overflow-hidden group hover:shadow-md transition-shadow">
              
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
              
              <h3 className="font-bold text-slate-900 text-lg mb-2">{ann.title}</h3>
              <p className="text-slate-600 text-sm whitespace-pre-wrap flex-1 mb-6">
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
            <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-tighter">Priority Level</label>
            <select
              className="w-full border border-slate-200 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" 
              value={formData.priority} onChange={e => setFormData({...formData, priority: e.target.value as any})}
            >
              <option value="normal">Standard Protocol (Normal)</option>
              <option value="urgent">Urgent Directive (High Alert)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-tighter">Expiry Timestamp (Optional)</label>
            <input 
              type="datetime-local" 
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
    </div>
  );
}
