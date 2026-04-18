import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import { Bell, Clock, Megaphone } from 'lucide-react';
import { Modal } from '@/components/shared/Modal';

interface Announcement {
  id: number;
  title: string;
  message: string;
  priority: 'normal' | 'urgent';
  expiryDate?: string;
  createdAt: string;
  author?: {
    name?: string;
    role?: string;
  };
}

export default function HRBroadcasts() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);

  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        setLoading(true);
        const res = await api.get('/announcements/hr');
        setAnnouncements(Array.isArray(res.data) ? res.data : []);
      } catch (error) {
        toast.error('Failed to load HR broadcasts');
        setAnnouncements([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAnnouncements();
  }, []);

  const hrBroadcasts = useMemo(
    () => announcements.filter((announcement) => announcement.author?.role?.toLowerCase() !== 'ceo'),
    [announcements]
  );

  const priorityTone = (priority: Announcement['priority']) =>
    priority === 'urgent'
      ? 'bg-red-50 text-red-700 border-red-200'
      : 'bg-blue-50 text-blue-700 border-blue-200';

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto p-4 lg:p-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-8 rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50 gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-600/20">
              <Bell className="w-6 h-6" />
            </div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">HR Broadcasts</h1>
          </div>
          <p className="text-slate-500 font-medium">Review institutional HR notices relevant to Operations governance.</p>
        </div>
      </div>

      {loading ? (
        <div className="p-20 text-center animate-pulse text-slate-400 font-black uppercase tracking-[0.3em]">
          Loading HR Broadcasts...
        </div>
      ) : hrBroadcasts.length === 0 ? (
        <div className="bg-white rounded-3xl border border-dashed border-slate-200 p-16 text-center">
          <Megaphone className="w-10 h-10 text-slate-200 mx-auto mb-4" />
          <p className="text-slate-400 font-black uppercase tracking-widest text-xs">No HR Broadcasts Available</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {hrBroadcasts.map((announcement) => (
            <button
              key={announcement.id}
              onClick={() => setSelectedAnnouncement(announcement)}
              className="text-left bg-white rounded-3xl border border-slate-200 p-6 shadow-sm hover:shadow-xl hover:shadow-blue-500/5 transition-all"
            >
              <div className="flex items-center justify-between gap-3 mb-4">
                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${priorityTone(announcement.priority)}`}>
                  {announcement.priority}
                </span>
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {new Date(announcement.createdAt).toLocaleDateString()}
                </span>
              </div>
              <h3 className="text-lg font-black text-slate-900 tracking-tight mb-2">{announcement.title}</h3>
              <p className="text-sm text-slate-600 line-clamp-4">{announcement.message}</p>
              <div className="mt-4 pt-4 border-t border-slate-100 text-[10px] font-black uppercase tracking-widest text-slate-400">
                Issued By {announcement.author?.name || 'HR'}
              </div>
            </button>
          ))}
        </div>
      )}

      <Modal isOpen={!!selectedAnnouncement} onClose={() => setSelectedAnnouncement(null)} title={selectedAnnouncement?.title || 'HR Broadcast'}>
        {selectedAnnouncement && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${priorityTone(selectedAnnouncement.priority)}`}>
                {selectedAnnouncement.priority}
              </span>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                {new Date(selectedAnnouncement.createdAt).toLocaleString()}
              </span>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{selectedAnnouncement.message}</p>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
