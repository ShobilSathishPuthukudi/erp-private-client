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

export default function AnnouncementBoard() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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
            className={`group p-6 bg-white border rounded-3xl transition-all relative overflow-hidden ${
              a.isRead ? 'border-slate-100 opacity-70' : 'border-slate-200 shadow-sm hover:shadow-md'
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
            
            <p className="text-slate-600 text-sm font-medium leading-relaxed italic border-l-2 border-slate-100 pl-4 py-1">
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
    </div>
  );
}
