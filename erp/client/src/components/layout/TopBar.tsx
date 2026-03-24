import { useState } from 'react';
import { Menu, Bell, User as UserIcon, LogOut } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { api } from '@/lib/api';
import { useNavigate } from 'react-router-dom';
import { Modal } from '@/components/shared/Modal';

export default function TopBar({ toggleSidebar }: { toggleSidebar: () => void }) {
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const user = useAuthStore(state => state.user);
  const logout = useAuthStore(state => state.logout);
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (e) {
      console.error(e);
    } finally {
      logout();
      navigate('/login');
    }
  };

  return (
    <header className="bg-white border-b border-slate-200 h-16 flex items-center justify-between px-4 md:px-8 z-10 sticky top-0">
      <div className="flex items-center">
        <button onClick={toggleSidebar} className="p-2 mr-4 md:hidden text-slate-500 hover:bg-slate-100 rounded-md">
          <Menu className="w-5 h-5" />
        </button>
        <h2 className="text-lg font-semibold text-slate-800 capitalize hidden md:block">
          {user?.role ? user.role.replace('-', ' ') : 'Dashboard'}
        </h2>
      </div>
      
      <div className="flex items-center space-x-4">
        <button className="p-2 text-slate-400 hover:text-slate-600 relative">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full"></span>
        </button>
        
        <div className="flex items-center space-x-3 border-l pl-4 border-slate-200">
          <button 
            onClick={() => navigate('/dashboard/profile')}
            className="w-9 h-9 flex-shrink-0 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 font-bold hover:ring-2 hover:ring-slate-500 hover:ring-offset-2 transition-all cursor-pointer overflow-hidden border border-slate-200"
            title="Profile Details"
          >
            {user?.avatar ? (
              <img src={user.avatar} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              user?.name ? user.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() : <UserIcon className="w-4 h-4" />
            )}
          </button>
          <button onClick={() => setIsLogoutModalOpen(true)} className="p-2 flex-shrink-0 text-slate-400 hover:text-red-500 transition-colors" title="Logout">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>

      <Modal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        title="Confirm Logout"
        maxWidth="sm"
      >
        <div className="mt-2 mb-6">
          <p className="text-sm text-slate-500">Are you sure you want to log out of your account?</p>
        </div>
        <div className="mt-4 flex justify-end space-x-3">
          <button
            onClick={() => setIsLogoutModalOpen(false)}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              setIsLogoutModalOpen(false);
              handleLogout();
            }}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            Log Out
          </button>
        </div>
      </Modal>
    </header>
  );
}
