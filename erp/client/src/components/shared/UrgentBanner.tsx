import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { AlertCircle, X } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

interface Announcement {
  id: number;
  title: string;
  message: string;
}

export default function UrgentBanner() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const user = useAuthStore(state => state.user);
  const [currentIdx] = useState(0);

  useEffect(() => {
    if (!user) return;
    const fetchUrgent = async () => {
      try {
        const res = await api.get('/announcements/feed');
        setAnnouncements(res.data.filter((a: any) => a.priority === 'urgent'));
      } catch (error) {
        console.error('Failed to sync urgent broadcasts');
      }
    };
    fetchUrgent();
    
    // Refresh every 5 minutes
    const interval = setInterval(fetchUrgent, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [user]);

  if (announcements.length === 0) return null;

  const current = announcements[currentIdx];

  return (
    <div className="bg-red-600 text-white px-4 py-2 flex items-center justify-between text-xs font-black uppercase tracking-widest animate-pulse shadow-lg z-50 sticky top-0">
        <div className="flex items-center gap-3 truncate">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="bg-white text-red-600 px-2 py-0.5 rounded-full text-[9px]">URGENT DIRECTIVE</span>
            <span className="truncate"><b>{current.title}:</b> {current.message}</span>
        </div>
        <div className="flex items-center gap-4 ml-4">
            {announcements.length > 1 && (
                <span className="text-[10px] opacity-70">
                    {currentIdx + 1} / {announcements.length}
                </span>
            )}
            <button 
                onClick={() => setAnnouncements(announcements.filter((_, i) => i !== currentIdx))}
                className="hover:bg-red-700 p-1 rounded-full transition-colors"
            >
                <X className="w-4 h-4" />
            </button>
        </div>
    </div>
  );
}
