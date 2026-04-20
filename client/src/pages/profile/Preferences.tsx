import { useState } from 'react';
import { Settings, Bell, Shield, Eye, Save, Mail, Smartphone, Globe } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Preferences() {
  const [prefs, setPrefs] = useState({
    emailNotifications: true,
    pushNotifications: true,
    browserAlerts: true,
    marketingUpdates: false,
    darkMode: false,
    publicProfile: true
  });
  const [loading, setLoading] = useState(false);

  const handleSave = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      toast.success('Your institutional preferences have been updated.');
    }, 800);
  };

  const toggle = (key: keyof typeof prefs) => {
    setPrefs(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Account preferences</h1>
        <p className="text-slate-500 text-sm">Manage how you receive communications and how your profile appears.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          {/* Notifications Section */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center">
              <Bell className="w-5 h-5 text-blue-600 mr-2" />
              <h3 className="font-bold text-slate-900 text-sm">Communication Settings</h3>
            </div>
            <div className="p-6 space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="flex items-center space-x-2">
                    <Mail className="w-4 h-4 text-slate-400" />
                    <p className="text-sm font-bold text-slate-800">Email Notifications</p>
                  </div>
                  <p className="text-[11px] text-slate-500">Receive institutional updates and task assignments via email.</p>
                </div>
                <button 
                  onClick={() => toggle('emailNotifications')}
                  className={`w-11 h-6 rounded-full transition-colors relative ${prefs.emailNotifications ? 'bg-blue-600' : 'bg-slate-200'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${prefs.emailNotifications ? 'left-6' : 'left-1'}`} />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="flex items-center space-x-2">
                    <Smartphone className="w-4 h-4 text-slate-400" />
                    <p className="text-sm font-bold text-slate-800">Push Notifications</p>
                  </div>
                  <p className="text-[11px] text-slate-500">Receive real-time alerts on your mobile device (RPS App).</p>
                </div>
                <button 
                  onClick={() => toggle('pushNotifications')}
                  className={`w-11 h-6 rounded-full transition-colors relative ${prefs.pushNotifications ? 'bg-blue-600' : 'bg-slate-200'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${prefs.pushNotifications ? 'left-6' : 'left-1'}`} />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="flex items-center space-x-2">
                    <Globe className="w-4 h-4 text-slate-400" />
                    <p className="text-sm font-bold text-slate-800">System Activity Logs</p>
                  </div>
                  <p className="text-[11px] text-slate-500">Log every login and profile update in your security activity history.</p>
                </div>
                <button 
                  onClick={() => toggle('browserAlerts')}
                  className={`w-11 h-6 rounded-full transition-colors relative ${prefs.browserAlerts ? 'bg-blue-600' : 'bg-slate-200'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${prefs.browserAlerts ? 'left-6' : 'left-1'}`} />
                </button>
              </div>
            </div>
          </div>

          {/* Privacy Section */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center">
              <Shield className="w-5 h-5 text-indigo-600 mr-2" />
              <h3 className="font-bold text-slate-900 text-sm">Privacy & Security</h3>
            </div>
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="flex items-center space-x-2">
                    <Eye className="w-4 h-4 text-slate-400" />
                    <p className="text-sm font-bold text-slate-800">Visibility</p>
                  </div>
                  <p className="text-[11px] text-slate-500">Show your profile in the institutional search palette (Employees/Admins only).</p>
                </div>
                <button 
                  onClick={() => toggle('publicProfile')}
                  className={`w-11 h-6 rounded-full transition-colors relative ${prefs.publicProfile ? 'bg-blue-600' : 'bg-slate-200'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${prefs.publicProfile ? 'left-6' : 'left-1'}`} />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
           <div className="bg-slate-900 rounded-2xl p-6 text-white shadow-xl shadow-slate-200">
              <Settings className="w-8 h-8 mb-4 opacity-50" />
              <h3 className="font-bold text-lg">Identity Guard</h3>
              <p className="text-slate-400 text-xs mt-1 leading-relaxed">
                Your institutional digital identity is managed by the Institutional Security Layer. Multi-Factor Authentication (MFA) is enabled by default for all Admin and Faculty roles.
              </p>
              <div className="mt-4 pt-4 border-t border-white/10 flex justify-between items-center">
                <span className="text-[10px] uppercase font-bold text-green-500">Secure Link</span>
                <span className="text-[10px] text-white/50">Last check: 2h ago</span>
              </div>
           </div>

           <button 
            onClick={handleSave}
            disabled={loading}
            className="w-full flex items-center justify-center py-3 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all disabled:opacity-50"
           >
             {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : (
               <>
                <Save className="w-4 h-4 mr-2" />
                Persistent Save
               </>
             )}
           </button>
        </div>
      </div>
    </div>
  );
}
