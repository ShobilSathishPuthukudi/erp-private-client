import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Megaphone, Clock, CheckCircle, ShieldAlert } from 'lucide-react';
import toast from 'react-hot-toast';

interface Announcement {
  id: number;
  title: string;
  message: string;
  priority: string;
  isRead: boolean;
  createdAt: string;
  targetChannel: string;
}

import { Modal } from '@/components/shared/Modal';
import { X, Mail } from 'lucide-react';

export default function AnnouncementBoard() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);

  const fetchFeed = async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/announcements/feed');
      setAnnouncements(res.data);
    } catch (error) {
      toast.error('Failed to sync institutional board');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFeed();
  }, []);

  const markAsRead = async (id: number) => {
    try {
      await api.post(`/announcements/${id}/read`);
      setAnnouncements(announcements.map(a => a.id === id ? { ...a, isRead: true } : a));
    } catch (error) {
      console.error('Failed to acknowledge directive');
    }
  };

  if (isLoading) return <div className="p-8 text-center font-black animate-pulse text-slate-400 uppercase tracking-widest">Hydrating Institutional Board...</div>;

  return (
    <div className="space-y-4">
      {announcements.length === 0 ? (
        <div className="p-12 text-center rounded-3xl border border-dashed border-slate-200">
          <Megaphone className="w-8 h-8 text-slate-200 mx-auto mb-3" />
          <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">No active directives in board</p>
        </div>
      ) : (
        announcements.map(a => (
          <div 
            key={a.id} 
            onClick={() => setSelectedAnnouncement(a)}
            className={`group p-6 bg-white border rounded-[2rem] transition-all relative overflow-hidden cursor-pointer ${
              a.isRead ? 'border-slate-100 opacity-70' : 'border-slate-200 shadow-sm hover:shadow-xl hover:shadow-indigo-500/5 hover:-translate-y-1'
            }`}
          >
            {!a.isRead && <div className="absolute top-4 right-4 w-2 h-2 bg-blue-600 rounded-full animate-ping" />}
            
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl ${a.priority === 'urgent' ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-600'}`}>
                  {a.priority === 'urgent' ? <ShieldAlert className="w-5 h-5" /> : <Megaphone className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="font-black text-slate-900 tracking-tight leading-tight uppercase text-sm">{a.title}</h3>
                  <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                    <Clock className="w-3 h-3" />
                    <span>{new Date(a.createdAt).toLocaleDateString()}</span>
                    <span className="opacity-30">•</span>
                    <span>{a.targetChannel.replace('_', ' ')}</span>
                  </div>
                </div>
              </div>
              {!a.isRead && (
                  <button 
                    onClick={() => markAsRead(a.id)}
                    className="p-2 text-slate-300 hover:text-blue-600 transition-colors"
                    title="Mark as Read"
                  >
                    <CheckCircle className="w-5 h-5" />
                  </button>
              )}
            </div>
            
            <p className="text-slate-600 text-sm font-medium leading-relaxed border-l-2 border-slate-100 pl-4 py-1">
               {a.message}
            </p>
            
            {a.priority === 'urgent' && (
                <div className="mt-4 flex gap-2">
                    <span className="px-3 py-1 bg-red-50 text-red-600 text-[9px] font-black uppercase tracking-widest rounded-lg border border-red-100">
                        Critical Priority
                    </span>
                </div>
            )}
          </div>
        ))
      )}

      {/* Announcement Detail Modal */}
      <Modal isOpen={!!selectedAnnouncement} onClose={() => setSelectedAnnouncement(null)} hideHeader={true}>
        {selectedAnnouncement && (
          <div className="bg-white overflow-hidden transition-all duration-300 flex flex-col max-h-[calc(100vh-160px)]">
            <div className={`p-8 ${selectedAnnouncement.priority === 'urgent' ? 'bg-red-600' : 'bg-slate-900'} text-white relative overflow-hidden`}>
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />
                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="bg-white/20 p-2 rounded-xl backdrop-blur-md">
                            {selectedAnnouncement.priority === 'urgent' ? <ShieldAlert className="w-6 h-6 text-white" /> : <Megaphone className="w-6 h-6 text-white" />}
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/60">Institutional Directive</span>
                    </div>
                    <h2 className="text-3xl font-black tracking-tight leading-none uppercase">{selectedAnnouncement.title}</h2>
                </div>
                <button 
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedAnnouncement(null);
                  }}
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
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Issue Date</span>
                            <span className="text-[11px] font-black text-slate-900">{new Date(selectedAnnouncement.createdAt).toLocaleDateString()}</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-xl border border-slate-100">
                        <Mail className="w-4 h-4 text-slate-400" />
                        <div className="flex flex-col">
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Target Channel</span>
                            <span className="text-[11px] font-black text-slate-900 uppercase tracking-tighter">{selectedAnnouncement.targetChannel.replace('_', ' ')}</span>
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    <h3 className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em]">Operational Context</h3>
                    <p className="text-lg font-medium text-slate-700 leading-relaxed max-w-2xl">
                        {selectedAnnouncement.message}
                    </p>
                </div>
            </div>

            {!selectedAnnouncement.isRead && (
                <div className="p-8 bg-slate-50 border-t border-slate-100 shrink-0 flex justify-end">
                    <button 
                        onClick={() => {
                            markAsRead(selectedAnnouncement.id);
                            setSelectedAnnouncement(null);
                        }}
                        className="px-8 py-4 bg-slate-900 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-slate-900/10 flex items-center gap-2"
                    >
                        <CheckCircle className="w-4 h-4" />
                        Acknowledge Directive
                    </button>
                </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
