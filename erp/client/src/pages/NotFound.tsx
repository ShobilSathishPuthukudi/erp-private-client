import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);

  const handleReturn = () => {
    if (user && user.role) {
      navigate(`/dashboard/${user.role}`);
    } else {
      navigate('/login');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-8 bg-white p-10 rounded-2xl shadow-xl border border-slate-100">
        <div className="flex justify-center">
          <div className="w-24 h-24 bg-red-50 rounded-full flex items-center justify-center relative">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center animate-pulse">
              <ShieldAlert className="w-8 h-8 text-red-600" />
            </div>
          </div>
        </div>
        
        <div className="space-y-3">
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">404</h1>
          <h2 className="text-xl font-bold text-slate-800">Access Denied or Page Not Found</h2>
          <p className="text-slate-500 text-sm leading-relaxed">
            The portal endpoint you are trying to reach either does not exist, or your current role (<span className="font-semibold text-slate-700 capitalize">{user?.role?.replace('-', ' ') || 'Guest'}</span>) does not have sufficient clearance to view it.
          </p>
        </div>

        <div className="pt-6">
          <button
            onClick={handleReturn}
            className="w-full flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-xl text-white bg-slate-900 hover:bg-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-900 transition-all duration-200"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Return to Active Dashboard
          </button>
        </div>

        <div className="pt-4 border-t border-slate-100">
           <p className="text-xs text-slate-400">
             If you believe this is a routing error, please contact the System Administrator.
           </p>
        </div>
      </div>
    </div>
  );
}
