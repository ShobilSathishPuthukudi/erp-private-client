import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useOrgStore } from '@/store/orgStore';
import { useAuthStore } from '@/store/authStore';
import { api } from '@/lib/api';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import CommandPalette from '../shared/CommandPalette';
import { useApplyTheme } from '@/hooks/useApplyTheme';

export default function DashboardLayout() {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const fetchOrgConfig = useOrgStore(state => state.fetchConfig);
  const token = useAuthStore(state => state.token);
  const updateUser = useAuthStore(state => state.updateUser);
  const location = useLocation();
  useApplyTheme();

  useEffect(() => {
    fetchOrgConfig();
  }, [fetchOrgConfig]);

  useEffect(() => {
    if (!token) return;

    let isCancelled = false;

    const syncSessionUser = async () => {
      try {
        const res = await api.get('/auth/me');
        if (isCancelled || !res.data?.user) return;
        updateUser(res.data.user);
      } catch (error) {
        console.error('Failed to synchronize session user', error);
      }
    };

    syncSessionUser();

    const handleFocus = () => {
      syncSessionUser();
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);

    return () => {
      isCancelled = true;
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
    };
  }, [location.pathname, token, updateUser]);

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--layout-chrome-bg)' }}>
      <Sidebar isOpen={isSidebarOpen} />
      
      <div className="flex-1 flex flex-col ml-[290px] max-[1200px]:ml-0 min-w-0 transition-all duration-300" style={{ background: 'var(--layout-chrome-bg)' }}>
        <TopBar toggleSidebar={() => setSidebarOpen(!isSidebarOpen)} />
        
        <main 
          className="flex-1 overflow-x-hidden overflow-y-auto p-6 rounded-tl-[32px] max-[1200px]:rounded-tl-none shadow-sm relative z-10 transition-colors duration-300"
          style={{ 
            background: 'var(--page-bg)', 
            color: 'var(--page-text)'
          }}
        >
          <Outlet />
        </main>
      </div>
      
      {/* Mobile overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 z-10 hidden max-[1200px]:block" 
          onClick={() => setSidebarOpen(false)} 
        />
      )}

      {/* Global Command Palette */}
      <CommandPalette />
    </div>
  );
}
