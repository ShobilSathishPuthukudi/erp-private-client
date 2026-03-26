import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import UrgentBanner from '../shared/UrgentBanner';
import CommandPalette from '../shared/CommandPalette';
import { useAuthStore } from '@/store/authStore';
import io from 'socket.io-client';
import toast from 'react-hot-toast';

export default function DashboardLayout() {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const user = useAuthStore(state => state.user);

  useEffect(() => {
    if (!user) return;
    
    const socketUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:3000';
    const socket = io(socketUrl, { withCredentials: true });
    
    socket.on('notification', (data) => {
      // Filter payload exclusively to the target user
      if (data.targetUid === user.uid) {
        if (data.type === 'success') toast.success(data.message, { duration: 5000 });
        else if (data.type === 'error') toast.error(data.message, { duration: 5000 });
        else toast(data.message, { icon: '🔔', duration: 5000 });
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [user]);

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar isOpen={isSidebarOpen} />
      
      <div className="flex-1 flex flex-col md:ml-64 min-w-0 transition-all duration-300">
        <UrgentBanner />
        <TopBar toggleSidebar={() => setSidebarOpen(!isSidebarOpen)} />
        
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-slate-50 p-6">
          <Outlet />
        </main>
      </div>
      
      {/* Mobile overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 z-10 md:hidden" 
          onClick={() => setSidebarOpen(false)} 
        />
      )}

      {/* Global Command Palette */}
      <CommandPalette />
    </div>
  );
}

