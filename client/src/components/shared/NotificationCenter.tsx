import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { Bell, CheckCircle, Info, AlertTriangle, XCircle, Clock, Check, ShieldAlert } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { clsx } from 'clsx';
import { useAuthStore } from '@/store/authStore';

export default function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [clearTimestamp, setClearTimestamp] = useState<number>(0);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const user = useAuthStore(state => state.user);
  const navigate = useNavigate();

  const fetchNotifications = async () => {
    try {
      const [notifRes, announceRes] = await Promise.all([
        api.get('/notifications'),
        api.get('/announcements/feed')
      ]);

      const standardNotifs = notifRes.data.notifications || [];
      const urgentAnnouncements = (announceRes.data || [])
        .filter((a: any) => a.priority === 'urgent')
        .map((a: any) => ({
          id: `ann-${a.id}`,
          realId: a.id,
          message: `${a.title}: ${a.message}`,
          type: 'urgent',
          timestamp: a.createdAt,
          isRead: a.isRead,
          link: '/dashboard/announcements',
          isAnnouncement: true
        }));

      const merged = [...urgentAnnouncements, ...standardNotifs].sort((a, b) => {
        if (a.isRead !== b.isRead) return a.isRead ? 1 : -1;
        return new Date(b.timestamp || b.createdAt).getTime() - new Date(a.timestamp || a.createdAt).getTime();
      });

      setNotifications(merged);
      
      const storedTimestamp = parseInt(localStorage.getItem(`notifs_cleared_${user?.uid || 'guest'}`) || '0');
      const visuallyUnreadCount = merged.filter((n: any) => !n.isRead && new Date(n.timestamp || n.createdAt).getTime() >= storedTimestamp).length;
      
      setUnreadCount(visuallyUnreadCount);
    } catch (error) {
      console.error('Fetch notification center error:', error);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000); // 60s poll for REST-based alerts
    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (user?.uid) {
      setClearTimestamp(parseInt(localStorage.getItem(`notifs_cleared_${user.uid}`) || '0'));
    }
  }, [user]);

  const handleNotificationClick = async (n: any) => {
    // 1. Mark as read if it's currently unread
    if (!n.isRead) {
      try {
        if (n.isAnnouncement) {
          await api.post(`/announcements/${n.realId}/read`);
        } else {
          await api.patch(`/notifications/${n.id}/read`);
        }
        setNotifications(notifications.map(item => item.id === n.id ? { ...item, isRead: true } : item));
        setUnreadCount(prev => Math.max(0, prev - 1));
      } catch (error) {
        console.error('Mark read error:', error);
      }
    }

    // 2. Navigate if link exist
    if (n.link) {
      navigate(n.link);
    }

    // 3. Close the dropdown
    setIsOpen(false);
  };

  const markAllRead = async () => {
    try {
      await api.patch('/notifications/read-all');
      
      const unreadAnns = notifications.filter(n => n.isAnnouncement && !n.isRead);
      if (unreadAnns.length > 0) {
        await Promise.all(unreadAnns.map(n => api.post(`/announcements/${n.realId}/read`)));
      }

      setNotifications(notifications.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Mark all read error:', error);
    }
  };

  const handleClearAll = async () => {
    try {
      await api.patch('/notifications/read-all');
      
      const unreadAnns = notifications.filter(n => n.isAnnouncement && !n.isRead);
      if (unreadAnns.length > 0) {
        await Promise.all(unreadAnns.map(n => api.post(`/announcements/${n.realId}/read`)));
      }

      const now = Date.now();
      localStorage.setItem(`notifs_cleared_${user?.uid || 'guest'}`, now.toString());
      setClearTimestamp(now);
      setNotifications(notifications.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Clear all error:', error);
    }
  };

  const visibleNotifications = notifications.filter(n => 
    new Date(n.timestamp || n.createdAt).getTime() >= clearTimestamp
  );

  const getIcon = (type: string) => {
    switch (type) {
      case 'urgent': return <ShieldAlert className="w-4 h-4 text-red-600" />;
      case 'success': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'warning': return <AlertTriangle className="w-4 h-4 text-orange-500" />;
      case 'error': return <XCircle className="w-4 h-4 text-red-500" />;
      default: return <Info className="w-4 h-4 text-blue-500" />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-slate-400 hover:text-blue-600 transition-all group notification-bell-btn font-medium"
      >
        <Bell className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center ring-2 ring-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden z-50 animate-in fade-in zoom-in duration-200 origin-top-right">
          <div className="p-4 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
            <h3 className="font-bold text-slate-900 text-sm">Notifications</h3>
            <div className="flex gap-3">
              {unreadCount > 0 && (
                <button 
                  onClick={markAllRead}
                  className="text-[10px] font-bold text-blue-600 hover:underline flex items-center"
                >
                  <Check className="w-3 h-3 mr-1" /> Mark all read
                </button>
              )}
              {visibleNotifications.length > 0 && (
                <button 
                  onClick={handleClearAll}
                  className="text-[10px] font-bold text-slate-500 hover:text-slate-800 hover:underline flex items-center"
                >
                  <XCircle className="w-3 h-3 mr-1" /> Clear
                </button>
              )}
            </div>
          </div>

          <div className="max-h-[400px] overflow-y-auto divide-y divide-slate-50 scrollbar-hide">
            {visibleNotifications.length > 0 ? visibleNotifications.map((n) => (
              <div 
                key={n.id} 
                className={clsx(
                  "p-4 hover:bg-slate-50 transition-all flex space-x-3 relative group cursor-pointer",
                  !n.isRead && (n.type === 'urgent' ? "bg-red-50/50" : "bg-blue-50/30")
                )}
                onClick={() => handleNotificationClick(n)}
              >
                <div className="flex-shrink-0 mt-1">
                  {getIcon(n.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={clsx("text-xs text-slate-800 leading-relaxed", !n.isRead && "font-bold")}>
                    {n.message}
                  </p>
                  <div className="flex items-center mt-1 text-[10px] text-slate-400">
                    <Clock className="w-3 h-3 mr-1" />
                    {formatDistanceToNow(new Date(n.timestamp || Date.now()), { addSuffix: true })}
                  </div>
                </div>
                {!n.isRead && (
                  <div className="w-2 h-2 bg-blue-600 rounded-full absolute top-4 right-4" />
                )}
              </div>
            )) : (
              <div className="py-12 text-center">
                 <Bell className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                 <p className="text-slate-400 text-xs">No notifications yet</p>
              </div>
            )}
          </div>
          
          <div className="p-3 bg-slate-50/50 text-center border-t border-slate-50">
             <button 
               onClick={() => { navigate('/dashboard/notifications'); setIsOpen(false); }}
               className="text-[10px] font-bold text-slate-500 hover:text-slate-700 uppercase tracking-widest"
             >
                View Full History
             </button>
          </div>
        </div>
      )}
    </div>
  );
}
