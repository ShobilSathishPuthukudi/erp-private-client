import { useState, useEffect } from 'react';
import { 
  Mail, 
  CreditCard, 
  Eye, 
  EyeOff, 
  Send,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Lock,
  Link
} from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';

export default function SettingsIntegrations() {
  const [showMask, setShowMask] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [smtpConfig, setSmtpConfig] = useState({
    host: 'smtp.gmail.com',
    port: '587',
    sender: 'noreply@erp.com',
    password: ''
  });

  useEffect(() => {
    fetchIntegrations();
  }, []);

  const fetchIntegrations = async () => {
    try {
      const response = await fetch('/api/org-admin/config?group=Integrations');
      if (!response.ok) throw new Error('Failed to fetch');
      const data = await response.json();
      const mapped = { ...smtpConfig };
      data.forEach((item: any) => {
        if (item.key === 'SMTP_HOST') mapped.host = item.value;
        if (item.key === 'SMTP_PORT') mapped.port = item.value;
        if (item.key === 'SMTP_SENDER') mapped.sender = item.value;
        if (item.key === 'SMTP_PASSWORD') mapped.password = item.value;
      });
      setSmtpConfig(mapped);
      setLoading(false);
    } catch (error) {
      console.error("Failed to fetch integrations", error);
      setLoading(false);
    }
  };

  const handleSaveSmtp = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/org-admin/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify([
          { key: 'SMTP_HOST', value: smtpConfig.host, group: 'Integrations' },
          { key: 'SMTP_PORT', value: smtpConfig.port, group: 'Integrations' },
          { key: 'SMTP_SENDER', value: smtpConfig.sender, group: 'Integrations' },
          { key: 'SMTP_PASSWORD', value: smtpConfig.password, group: 'Integrations' }
        ])
      });
      if (response.ok) window.alert('SMTP Configuration Securely Persisted');
    } catch (error) {
      console.error("Failed to save SMTP", error);
    }
  };

  const toggleMask = (id: string) => {
    setShowMask(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="p-2 space-y-6">
      <PageHeader 
        title="Infrastructure gateway hub"
        description="Securely connect the ERP system to external messaging and payment services."
        icon={Link}
      />

      <div className="grid grid-cols-1 gap-8">
        {/* Email Gateway */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/40 overflow-hidden">
          <div className="bg-slate-900 p-6 text-white flex justify-between items-center group">
            <div className="flex items-center gap-4">
              <div className="p-2.5 bg-blue-600 rounded-xl shadow-lg group-hover:rotate-12 transition-transform">
                <Mail className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold font-display">Email SMTP Server</h2>
            </div>
            <span className="text-[10px] font-bold text-green-400 flex items-center">
              <CheckCircle2 className="w-3 h-3 mr-1" /> ACTIVE & TESTED
            </span>
          </div>

          <form className="p-8 space-y-6" onSubmit={handleSaveSmtp}>
            {loading ? (
               <div className="py-10 text-center text-slate-400 font-bold text-xs uppercase tracking-widest">Deciphering Gateway Credentials...</div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">SMTP Server Host</label>
                    <input 
                      type="text" 
                      placeholder="smtp.gmail.com" 
                      className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-900 outline-none" 
                      value={smtpConfig.host}
                      onChange={(e) => setSmtpConfig({ ...smtpConfig, host: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">SMTP Port</label>
                    <input 
                      type="text" 
                      placeholder="587" 
                      className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-900 outline-none" 
                      value={smtpConfig.port}
                      onChange={(e) => setSmtpConfig({ ...smtpConfig, port: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">Sender Email ID</label>
                    <input 
                      type="text" 
                      placeholder="noreply@erp.com" 
                      className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-900 outline-none" 
                      value={smtpConfig.sender}
                      onChange={(e) => setSmtpConfig({ ...smtpConfig, sender: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">SMTP Password (Masked)</label>
                    <div className="relative">
                      <input 
                        type={showMask['smtp'] ? 'text' : 'password'} 
                        className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-900 outline-none pr-12" 
                        value={smtpConfig.password}
                        onChange={(e) => setSmtpConfig({ ...smtpConfig, password: e.target.value })}
                      />
                      <button type="button" onClick={() => toggleMask('smtp')} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                        {showMask['smtp'] ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-50">
              <button type="button" className="px-6 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl flex items-center hover:bg-slate-200 transition-all text-xs">
                <Send className="w-3.5 h-3.5 mr-2" /> Send Test Email
              </button>
              <button 
                type="submit" 
                disabled={loading}
                className="px-8 py-3 bg-blue-600 text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 flex items-center hover:bg-blue-700 transition-all text-sm disabled:opacity-50"
              >
                Save & Secure
              </button>
            </div>
          </form>
        </div>

        {/* Payment Gateway */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/40 overflow-hidden">
          <div className="bg-white p-6 border-b border-slate-100 flex justify-between items-center group">
            <div className="flex items-center gap-4">
              <div className="p-2.5 bg-slate-100 border border-slate-200 rounded-xl group-hover:bg-emerald-500 group-hover:border-emerald-500 transition-all">
                <CreditCard className="w-6 h-6 text-slate-600 group-hover:text-white" />
              </div>
              <h2 className="text-xl font-bold font-display text-slate-900">Payment Gateway (Razorpay/Stripe)</h2>
            </div>
            <span className="text-[10px] font-bold text-rose-500 flex items-center bg-rose-50 px-3 py-1 rounded-full">
              <AlertCircle className="w-3 h-3 mr-1" /> CONFIG REQUIRED
            </span>
          </div>
          
          <div className="p-8 space-y-6">
            <div className="space-y-3">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center">
                <Lock className="w-3 h-3 mr-2" />
                Webhook Listener URL (Auto-generated)
              </label>
              <div className="flex items-center gap-2 p-4 bg-slate-900 border border-slate-800 rounded-2xl text-blue-300 font-mono text-xs shadow-inner">
                https://api.erp.com/webhooks/payments/razorpay
                <ExternalLink className="w-3 h-3 ml-auto opacity-50" />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">Public Key / Merchant ID</label>
                <input type="text" className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-900 outline-none" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">Secret Key / API Secret</label>
                <div className="relative">
                  <input type="password" placeholder="••••••••••••••••" className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-900 outline-none pr-12" />
                  <Lock className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                </div>
              </div>
            </div>
            
          </div>
        </div>
      </div>
    </div>
  );
}
