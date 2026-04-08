import { useState, useRef, useEffect } from 'react';
import { Menu, User as UserIcon, LogOut, Search, ChevronDown, Lock } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { api } from '@/lib/api';
import { useNavigate } from 'react-router-dom';
import { Modal } from '@/components/shared/Modal';
import NotificationCenter from '@/components/shared/NotificationCenter';
import './Topbar.css';

export default function TopBar({ toggleSidebar }: { toggleSidebar: () => void }) {
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const user = useAuthStore(state => state.user);
  const logout = useAuthStore(state => state.logout);
  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
    <header className="header-modern-glass">
      <div className="header-left">
        <button onClick={toggleSidebar} className="menu-toggle-glow mobile-only">
          <Menu className="w-5 h-5" />
        </button>

        <div className="search-box-pill">
          <Search size={16} className="search-icon-dim" />
          <input
            type="text"
            placeholder="Search Dashboard..."
            className="search-input-glass"
          />
        </div>
      </div>
      
      <div className="header-right">
        <div className="header-actions-group">
          <div className="header-dropdown-wrapper">
            <NotificationCenter />
          </div>
          
          <div className="header-dropdown-wrapper" ref={userMenuRef}>
            <div
                className={`user-profile-capsule ${showUserMenu ? 'active' : ''}`}
                onClick={() => setShowUserMenu(!showUserMenu)}
            >
                <div className="avatar-luminous">
                    {user?.avatar ? (
                      <img 
                        src={user.avatar} 
                        alt="" 
                        className="w-full h-full object-cover rounded-full" 
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    ) : null}
                    <span className="avatar-initials">
                      {user?.name?.charAt(0).toUpperCase() || 'U'}
                    </span>
                </div>
                <div className="profile-labels active-labels hidden sm:flex text-left">
                    <span className="user-title leading-tight">{user?.name || 'User'}</span>
                    <span className="user-rank leading-tight truncate max-w-[120px]" title={user?.role === 'Organization Admin' ? 'Organization Admin' : (user?.departmentName || user?.role)}>
                      {user?.role === 'Organization Admin' ? 'Organization Admin' : (user?.departmentName || (user?.role ? user.role.replace('-', ' ') : 'Dashboard'))}
                    </span>
                </div>
                <ChevronDown size={14} className={`dropdown-arrow ${showUserMenu ? 'flip' : ''}`} />
            </div>

            {showUserMenu && (
                <div className="antigravity-dropdown profile-box">
                    <div className="profile-popover-head">
                        <div className="big-avatar">
                            {user?.avatar ? (
                              <img 
                                src={user.avatar} 
                                alt="" 
                                className="w-full h-full object-cover rounded-2xl" 
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = 'none';
                                }}
                              />
                            ) : null}
                            <span className="avatar-initials">
                              {user?.name?.charAt(0).toUpperCase() || 'U'}
                            </span>
                        </div>
                        <h5>{user?.name || 'User'}</h5>
                        <p>{user?.email || 'user@example.com'}</p>
                        {(user?.role || user?.departmentName) && (
                          <div className="mt-1 px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-[10px] font-bold uppercase inline-block">
                            {user?.role === 'Organization Admin' ? 'Organization Admin' : (user?.departmentName || user?.role?.replace('-', ' '))}
                          </div>
                        )}
                    </div>
                    <div className="popover-actions">
                        <button onClick={() => { navigate('/dashboard/profile'); setShowUserMenu(false); }}><UserIcon size={16} /> My Profile</button>
                        <button onClick={() => { navigate('/dashboard/change-password'); setShowUserMenu(false); }}><Lock size={16} /> Change Password</button>
                        <div className="popover-divider"></div>
                        <button className="logout-btn-red" onClick={() => { setShowUserMenu(false); setIsLogoutModalOpen(true); }}><LogOut size={16} /> Logout</button>
                    </div>
                </div>
            )}
          </div>
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
