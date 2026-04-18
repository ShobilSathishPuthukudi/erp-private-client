import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { 
  Bell, 
  CheckCircle, 
  Info, 
  AlertTriangle, 
  XCircle, 
  Clock, 
  Check, 
  Filter,
  Search
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { clsx } from 'clsx';
import { useAuthStore } from '@/store/authStore';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { getNormalizedRole } from '@/lib/roles';

export default function Notifications() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const LIMIT = 20;
  
  const user = useAuthStore(state => state.user);
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  const hasDedicatedNotification = (announcement: any) =>
    ['all_employees', 'centers_only', 'hr_directives'].includes(announcement?.targetChannel);

  const resolveNotificationLink = (link?: string, notification?: any) => {
    if (!link) return '/dashboard/notifications';

    const normalizedRole = getNormalizedRole(user?.role || '');

    if (link === '/dashboard/announcements') {
      if (normalizedRole === 'employee') return '/dashboard/employee/announcements';
      if (normalizedRole === 'partner-center') return '/dashboard/partner-center/announcements';
      if (normalizedRole === 'operations') {
        if (notification?.message?.startsWith('HR Broadcast:')) {
          return '/dashboard/operations/hr-broadcasts';
        }
        return '/dashboard/operations/announcements';
      }
      if (normalizedRole === 'hr') return '/dashboard/hr/announcements';
      if (normalizedRole === 'ceo') return '/dashboard/ceo/announcements';
      return '/dashboard/announcements';
    }

    if (normalizedRole === 'operations') {
      if (link === '/dashboard/academic/credentials') {
        return '/dashboard/operations/credential-requests';
      }
      if (link === '/dashboard/hr/leaves' || link === '/dashboard/hr/dept-leaves' || link === '/dashboard/academic/leaves') {
        return '/dashboard/operations/leaves';
      }
      if (link === '/dashboard/academic/team' || link === '/dashboard/operations/team') {
        return '/dashboard/operations/team';
      }
    }

    if (normalizedRole === 'employee') {
      if (
        link === '/dashboard/hr/leaves' ||
        link === '/dashboard/hr/dept-leaves' ||
        link === '/dashboard/academic/leaves' ||
        link === '/dashboard/operations/leaves' ||
        link === '/dashboard/finance/leaves' ||
        link === '/dashboard/sales/leaves' ||
        link === '/dashboard/subdept/openschool/leaves' ||
        link === '/dashboard/subdept/online/leaves' ||
        link === '/dashboard/subdept/skill/leaves' ||
        link === '/dashboard/subdept/bvoc/leaves'
      ) {
        return '/dashboard/employee/leaves';
      }
    }

    return link;
  };

  const fetchNotifications = async (currentOffset = 0, isLoadMore = false) => {
    try {
      if (isLoadMore) setLoadingMore(true);
      else setLoading(true);

      const [notifRes, announceRes] = await Promise.all([
        api.get(`/notifications?limit=${LIMIT}&offset=${currentOffset}`),
        currentOffset === 0 ? api.get('/announcements/feed') : Promise.resolve({ data: [] })
      ]);

      const standardNotifs = notifRes.data.notifications || [];
      const pagination = notifRes.data.pagination;
      setHasMore(pagination?.hasMore || false);

      const announcements = (announceRes.data || [])
        .filter((a: any) => !hasDedicatedNotification(a))
        .map((a: any) => ({
        id: `ann-${a.id}`,
        realId: a.id,
        message: `${a.title}: ${a.message}`,
        type: a.priority === 'urgent' ? 'error' : 'info',
        timestamp: a.createdAt,
        isRead: a.isRead,
        link: a.link || '/dashboard/announcements',
        isAnnouncement: true
      }));

      const merged = [...announcements, ...standardNotifs].sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      if (isLoadMore) {
        setNotifications(prev => [...prev, ...standardNotifs]); // Only append new standard notifications if loading more
      } else {
        setNotifications(merged);
      }
    } catch (error) {
      console.error('Fetch notifications error:', error);
      toast.error('Failed to retrieve institutional history');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const loadMore = () => {
    const nextOffset = offset + LIMIT;
    setOffset(nextOffset);
    fetchNotifications(nextOffset, true);
  };

  useEffect(() => {
    fetchNotifications();
  }, [user]);

  const handleMarkRead = async (n: any) => {
    try {
      if (n.isAnnouncement) {
        await api.post(`/announcements/${n.realId}/read`);
      } else {
        await api.patch(`/notifications/${n.id}/read`);
      }
      setNotifications(notifications.map(item => item.id === n.id ? { ...item, isRead: true } : item));
    } catch (error) {
      toast.error('Failed to update registry');
    }
  };

  const markAllRead = async () => {
    try {
      const unreadNotifs = notifications.filter(n => !n.isRead && !n.isAnnouncement);
      const unreadAnnounces = notifications.filter(n => !n.isRead && n.isAnnouncement);

      const promises: any[] = [];
      if (unreadNotifs.length > 0) promises.push(api.patch('/notifications/read-all'));
      
      // Currently no bulk mark-read for announcements in backend, so we do them individually if few or just skip for now
      // For UX parity we'll at least update the local state
      for (const a of unreadAnnounces) {
        promises.push(api.post(`/announcements/${a.realId}/read`));
      }

      await Promise.all(promises);
      setNotifications(notifications.map(n => ({ ...n, isRead: true })));
      toast.success('Communication Registry synchronized');
    } catch (error) {
      toast.error('Failed to synchronize registry');
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'warning': return <AlertTriangle className="w-5 h-5 text-orange-500" />;
      case 'error': return <XCircle className="w-5 h-5 text-red-500" />;
      default: return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  const filteredNotifications = notifications.filter(n => 
    n.message.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Premium Header */}
      <div className="bg-slate-900 rounded-[2.5rem] p-10 text-white relative overflow-hidden shadow-2xl shadow-slate-900/20">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center border border-blue-500/20">
                <Bell className="w-5 h-5 text-blue-400" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-300">Communication Hub</span>
            </div>
            <h1 className="text-4xl font-black tracking-tight mb-2">Notification <span className="text-blue-400">Archive</span></h1>
            <p className="text-slate-400 font-medium text-sm max-w-md">
              Full audit trail of institutional alerts, jurisdictional actions, and system-wide communications directed to your identity.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={markAllRead}
              disabled={!notifications.some(n => !n.isRead)}
              className="px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/10 rounded-2xl text-xs font-bold uppercase tracking-widest transition-all backdrop-blur-md disabled:opacity-50"
            >
              Mark all as read
            </button>
          </div>
        </div>
        
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 rounded-full blur-[80px] -mr-32 -mt-32" />
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden">
        {/* Toolbar */}
        <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row gap-4 items-center justify-between bg-slate-50/50">
          <div className="relative w-full md:w-96 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
            <input 
              type="text" 
              placeholder="Search archive..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium text-sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase text-slate-500 tracking-widest">
              <Filter className="w-3 h-3" />
              Showing {filteredNotifications.length} Record(s)
            </div>
          </div>
        </div>

        {/* Notifications List */}
        <div className="min-h-[400px]">
          {loading ? (
            <div className="py-20 text-center">
              <div className="w-12 h-12 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
              <p className="text-slate-400 text-sm font-medium">Retrieving history...</p>
            </div>
          ) : filteredNotifications.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {filteredNotifications.map((n) => (
                <div 
                  key={n.id} 
                  className={clsx(
                    "p-6 flex gap-5 transition-all hover:bg-slate-50 relative group",
                    !n.isRead && "bg-blue-50/30"
                  )}
                >
                  <div className="shrink-0 mt-1">
                    <div className="w-10 h-10 rounded-xl bg-white border border-slate-100 shadow-sm flex items-center justify-center group-hover:scale-110 transition-transform">
                      {getIcon(n.type)}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className={clsx(
                          "text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full",
                          n.isAnnouncement ? 'bg-indigo-100 text-indigo-700' :
                          n.type === 'success' ? 'bg-green-100 text-green-700' :
                          n.type === 'warning' ? 'bg-orange-100 text-orange-700' :
                          n.type === 'error' ? 'bg-red-100 text-red-700' :
                          'bg-blue-100 text-blue-700'
                        )}>
                          {n.isAnnouncement ? 'Institutional Directive' : (n.type || 'info')}
                        </span>
                        {!n.isRead && (
                          <span className="flex h-2 w-2 rounded-full bg-blue-600 animate-pulse" />
                        )}
                      </div>
                      <div className="flex items-center text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                        <Clock className="w-3 h-3 mr-1.5" />
                        {formatDistanceToNow(new Date(n.timestamp || Date.now()), { addSuffix: true })}
                      </div>
                    </div>
                    <p className={clsx(
                      "text-sm leading-relaxed mb-3",
                      !n.isRead ? "text-slate-900 font-bold" : "text-slate-600 font-medium"
                    )}>
                      {n.message}
                    </p>
                    <div className="flex items-center gap-3">
                      {!n.isRead && (
                          <button 
                            onClick={() => handleMarkRead(n)}
                            className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600 hover:text-blue-800 flex items-center gap-1.5 transition-colors"
                          >
                            <Check className="w-3 h-3" /> Mark as read
                          </button>
                      )}
                      {n.link && (
                        <button 
                          onClick={() => navigate(resolveNotificationLink(n.link, n))}
                          className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 hover:text-slate-900 flex items-center gap-1.5 transition-colors"
                        >
                          View Link
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-24 text-center">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <Bell className="w-6 h-6 text-slate-300" />
              </div>
              <h3 className="text-slate-900 font-bold mb-1">Archive Synchronized</h3>
              <p className="text-slate-400 text-sm max-w-xs mx-auto">No notifications found in the institutional record for your identity.</p>
            </div>
          )}
          
          {hasMore && (
            <div className="p-8 text-center bg-slate-50/30 border-t border-slate-100">
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="px-8 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-bold uppercase tracking-widest text-slate-600 hover:text-blue-600 hover:border-blue-200 hover:shadow-lg hover:shadow-blue-500/5 transition-all disabled:opacity-50 flex items-center gap-2 mx-auto"
              >
                {loadingMore ? (
                  <>
                    <div className="w-4 h-4 border-2 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
                    Synchronizing...
                  </>
                ) : (
                  <>
                    <Clock className="w-3 h-3" />
                    Load More History
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
