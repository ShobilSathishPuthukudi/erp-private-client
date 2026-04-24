import { useState, useEffect, useMemo } from 'react';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import { Megaphone, MessageSquare, Clock, UserCheck, ShieldAlert, X, User } from 'lucide-react';
import { format } from 'date-fns';
import { Modal } from '@/components/shared/Modal';
import { PageHeader } from '@/components/shared/PageHeader';
import { clsx } from 'clsx';

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
  const [activeTab, setActiveTab] = useState<'hr' | 'ceo'>('hr');
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

  const filteredAnnouncements = useMemo(() => {
    if (activeTab === 'ceo') {
      return announcements.filter(ann => ann.author?.role?.toLowerCase() === 'ceo');
    }
    return announcements.filter(ann => ann.author?.role?.toLowerCase() !== 'ceo');
  }, [announcements, activeTab]);

  const counts = useMemo(() => {
    const ceo = announcements.filter(ann => ann.author?.role?.toLowerCase() === 'ceo').length;
    return {
      ceo,
      hr: announcements.length - ceo
    };
  }, [announcements]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const payload = {
        ...formData,
        expiryDate: formData.expiryDate ? new Date(formData.expiryDate).toISOString() : ''
      };
      const res = await api.post('/announcements/hr', payload);
      setAnnouncements([res.data, ...announcements]);
      toast.success('Announcement broadcasted globally!');
      setIsModalOpen(false);
      setFormData({ title: '', message: '', priority: 'normal', expiryDate: '' });
      fetchAnnouncements();
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
    <div className="p-2 space-y-4 max-w-[1600px] mx-auto">
      <PageHeader 
        title="Global announcements"
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

      {/* Tab Switcher */}
      <div className="flex items-center space-x-1 bg-slate-100/50 p-1 rounded-xl border border-slate-200/60 w-fit">
        <button
          onClick={() => setActiveTab('hr')}
          className={clsx(
            "flex items-center px-4 py-2 rounded-lg text-xs font-bold transition-all tracking-widest",
            activeTab === 'hr' 
              ? "bg-white text-blue-600 shadow-sm ring-1 ring-slate-200" 
              : "text-slate-500 hover:text-slate-700 hover:bg-white/50"
          )}
        >
          <UserCheck className="w-3.5 h-3.5 mr-2" />
          Created by HR
          <span className={clsx(
            "ml-2 px-1.5 py-0.5 rounded-md text-[10px]",
            activeTab === 'hr' ? "bg-blue-50 text-blue-600" : "bg-slate-200 text-slate-600"
          )}>
            {counts.hr}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('ceo')}
          className={clsx(
            "flex items-center px-4 py-2 rounded-lg text-xs font-bold transition-all tracking-widest",
            activeTab === 'ceo' 
              ? "bg-white text-red-600 shadow-sm ring-1 ring-slate-200" 
              : "text-slate-500 hover:text-slate-700 hover:bg-white/50"
          )}
        >
          <ShieldAlert className="w-3.5 h-3.5 mr-2" />
          From CEO
          <span className={clsx(
            "ml-2 px-1.5 py-0.5 rounded-md text-[10px]",
            activeTab === 'ceo' ? "bg-red-50 text-red-600" : "bg-slate-200 text-slate-600"
          )}>
            {counts.ceo}
          </span>
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64 border border-dashed rounded-lg border-slate-200 bg-white">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-800"></div>
        </div>
      ) : filteredAnnouncements.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed rounded-lg border-slate-200 bg-slate-50">
           {activeTab === 'ceo' ? (
             <>
               <ShieldAlert className="w-12 h-12 text-slate-200 mb-3" />
               <p className="text-slate-500 font-medium italic">No executive directives received from CEO.</p>
             </>
           ) : (
             <>
               <MessageSquare className="w-12 h-12 text-slate-200 mb-3" />
               <p className="text-slate-500 font-medium italic">No HR broadcasts recorded yet.</p>
             </>
           )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAnnouncements.map(ann => (
            <div 
              key={ann.id} 
              onClick={() => { setSelectedAnn(ann); setIsDetailOpen(true); }}
              className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 flex flex-col h-full relative overflow-hidden group hover:shadow-md transition-all cursor-pointer hover:scale-[1.02] active:scale-95 text-left"
            >
              
              <div className={clsx(
                "absolute top-0 left-0 right-0 h-1.5",
                ann.priority === 'urgent' ? 'bg-red-500' : (activeTab === 'ceo' ? 'bg-red-400' : 'bg-blue-400')
              )}></div>

              <div className="flex justify-between items-start mb-4 mt-2">
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-black tracking-widest border ${priorityColors[ann.priority as keyof typeof priorityColors]}`}>
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
                <div className={clsx(
                  "w-8 h-8 rounded-full flex justify-center items-center text-white font-bold text-xs mr-3",
                  activeTab === 'ceo' ? "bg-red-600 shadow-lg shadow-red-200" : "bg-slate-900"
                )}>
                  {activeTab === 'ceo' ? 'CEO' : (ann.author?.name ? ann.author.name.charAt(0).toUpperCase() : 'H')}
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
            <label className="block text-sm font-bold text-slate-700 mb-2 tracking-tighter">Priority level *</label>
            <select
              className="w-full border border-slate-200 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" 
              value={formData.priority} onChange={e => setFormData({...formData, priority: e.target.value as any})}
            >
              <option value="normal">Standard Protocol (Normal)</option>
              <option value="urgent">Urgent Directive (High Alert)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2 tracking-tighter">Expiry timestamp *</label>
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
      <Modal isOpen={isDetailOpen} onClose={() => setIsDetailOpen(false)} hideHeader={true}>
        {selectedAnn && (
          <div className="bg-white overflow-hidden transition-all duration-300 flex flex-col max-h-[calc(100vh-160px)]">
            <div className={clsx(
              "p-8 text-white relative overflow-hidden",
              selectedAnn.author?.role?.toLowerCase() === 'ceo' ? "bg-red-600" : "bg-slate-900"
            )}>
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />
                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="bg-white/20 p-2 rounded-xl backdrop-blur-md">
                            {selectedAnn.priority === 'urgent' ? <ShieldAlert className="w-6 h-6 text-white" /> : <Megaphone className="w-6 h-6 text-white" />}
                        </div>
                        <span className="text-[10px] font-black tracking-[0.2em] text-white/60">
                          {selectedAnn.author?.role?.toLowerCase() === 'ceo' ? 'Executive Directive' : 'Global Broadcast'}
                        </span>
                    </div>
                    <h2 className="text-3xl font-black tracking-tight leading-none">{selectedAnn.title}</h2>
                </div>
                <button 
                  type="button"
                  onClick={() => setIsDetailOpen(false)}
                  className="absolute top-6 right-6 p-2.5 hover:bg-white/10 rounded-xl transition-all text-white/60 hover:text-white z-50 group/close"
                >
                  <X className="w-5 h-5 group-hover/close:scale-110 transition-transform" />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-10 space-y-10 min-h-0 custom-scrollbar">
                <div className="flex flex-wrap gap-4 pt-2">
                    <div className="flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-xl border border-slate-100">
                        <Clock className="w-4 h-4 text-slate-400" />
                        <div className="flex flex-col">
                            <span className="text-[8px] font-black text-slate-400 tracking-widest leading-none mb-1">Broadcast date</span>
                            <span className="text-[11px] font-black text-slate-900">{format(new Date(selectedAnn.createdAt), 'PPP')}</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-xl border border-slate-100">
                        <User className="w-4 h-4 text-slate-400" />
                        <div className="flex flex-col">
                            <span className="text-[8px] font-black text-slate-400 tracking-widest leading-none mb-1">Author identity</span>
                            <span className="text-[11px] font-black text-slate-900 tracking-tighter">{selectedAnn.author?.name || 'HR Admin'}</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-xl border border-slate-100">
                        <ShieldAlert className="w-4 h-4 text-slate-400" />
                        <div className="flex flex-col">
                            <span className="text-[8px] font-black text-slate-400 tracking-widest leading-none mb-1">Priority level</span>
                            <span className={clsx(
                              "text-[11px] font-black tracking-tighter",
                              selectedAnn.priority === 'urgent' ? "text-red-600" : "text-slate-900"
                            )}>{selectedAnn.priority}</span>
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    <h3 className="text-[10px] font-black text-indigo-500 tracking-[0.2em]">Broadcast context</h3>
                    <p className="text-lg font-medium text-slate-700 leading-relaxed max-w-2xl whitespace-pre-wrap">
                      {selectedAnn.message}
                    </p>
                </div>

                {selectedAnn.expiryDate && (
                  <div className="pt-6 border-t border-slate-100">
                    <div className="flex items-center gap-2 text-slate-400">
                      <Clock className="w-4 h-4" />
                      <span className="text-[10px] font-black tracking-widest">Notice expiry: {format(new Date(selectedAnn.expiryDate), 'PPP p')}</span>
                    </div>
                  </div>
                )}
            </div>

            <div className="p-8 bg-slate-50 border-t border-slate-100 shrink-0 flex justify-end">
              <button 
                onClick={() => setIsDetailOpen(false)}
                className="px-8 py-4 bg-slate-900 text-white rounded-2xl text-xs font-black tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-slate-900/10 flex items-center gap-2"
              >
                Close View
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
