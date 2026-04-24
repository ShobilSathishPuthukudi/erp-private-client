import { useState, useEffect, useMemo } from 'react';
import { api } from '@/lib/api';
import { 
  Building2, 
  Search, 
  Loader2,
  Filter,
  ExternalLink,
  Clock,
  Landmark,
  CheckCircle2,
  XCircle,
  ArrowRight
} from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { useApplyTheme } from '@/hooks/useApplyTheme';

type TabType = 'pending' | 'finance_pending' | 'approved' | 'rejected' | 'all';

export default function MyCenters() {
  useApplyTheme();
  const [centers, setCenters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('all');

  useEffect(() => {
    fetchMyCenters();
  }, []);

  const fetchMyCenters = async () => {
    try {
      const res = await api.get('/portals/employee/my-centers');
      setCenters(res.data);
    } catch (error) {
      console.error('Failed to fetch your referred centers');
    } finally {
      setLoading(false);
    }
  };

  const counts = useMemo(() => {
    return {
      all: centers.length,
      pending: centers.filter(c => (c.auditStatus || '').toLowerCase() === 'pending').length,
      finance_pending: centers.filter(c => (c.auditStatus || '').toLowerCase() === 'pending_finance').length,
      approved: centers.filter(c => (c.status || '').toLowerCase() === 'active').length,
      rejected: centers.filter(c => (c.auditStatus || '').toLowerCase() === 'rejected').length,
    };
  }, [centers]);

  const filteredCenters = useMemo(() => {
    let result = [...centers];
    
    if (activeTab !== 'all') {
      if (activeTab === 'pending') {
        result = result.filter(c => (c.auditStatus || '').toLowerCase() === 'pending');
      } else if (activeTab === 'finance_pending') {
        result = result.filter(c => (c.auditStatus || '').toLowerCase() === 'pending_finance');
      } else if (activeTab === 'approved') {
        result = result.filter(c => (c.status || '').toLowerCase() === 'active');
      } else if (activeTab === 'rejected') {
        result = result.filter(c => (c.auditStatus || '').toLowerCase() === 'rejected');
      }
    }

    if (searchTerm) {
      result = result.filter((c: any) => 
        c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.shortName?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return result;
  }, [centers, activeTab, searchTerm]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-10 h-10 border-4 border-[var(--theme-accent)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-2 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <PageHeader 
        title="Partnership ledger"
        description="Direct track of institutional nodes registered via your referral identity."
        icon={Building2}
        action={
          <div className="relative max-w-md w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text"
              placeholder="Search your centers..."
              className="w-full pl-12 pr-6 py-3 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-[var(--theme-accent)] focus:border-transparent transition-all shadow-sm font-medium"
              style={{ background: 'var(--card-bg)', color: 'var(--page-text)', borderColor: 'var(--card-border)' }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        }
      />

      <div className="flex bg-slate-100/50 p-1 rounded-2xl border border-slate-200 w-fit" style={{ background: 'var(--theme-soft)', borderColor: 'var(--card-border)' }}>
        {[
          { id: 'all', name: 'All', icon: Building2 },
          { id: 'pending', name: 'Pending', icon: Clock },
          { id: 'finance_pending', name: 'Finance Pending', icon: Landmark },
          { id: 'approved', name: 'Approved', icon: CheckCircle2 },
          { id: 'rejected', name: 'Rejected', icon: XCircle }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as TabType)}
            className={`
              flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black tracking-widest transition-all duration-200
              ${activeTab === tab.id 
                ? 'bg-white shadow-lg ring-1 ring-slate-200' 
                : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'}
            `}
            style={activeTab === tab.id ? { color: 'var(--theme-accent)', boxShadow: 'var(--card-shadow)' } : {}}
          >
            <tab.icon className={`w-3.5 h-3.5`} style={activeTab === tab.id ? { color: 'var(--theme-accent)' } : { color: '#94a3b8' }} />
            {tab.name}
            <span className={`static ml-1 px-1.5 py-0.5 rounded-md text-[9px]`} style={activeTab === tab.id ? { background: 'var(--theme-soft)', color: 'var(--theme-accent)' } : { background: '#e2e8f0', color: '#475569' }}>
              {counts[tab.id as keyof typeof counts] || 0}
            </span>
          </button>
        ))}
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-sm" style={{ background: 'var(--card-bg)', borderColor: 'var(--card-border)' }}>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/50 border-b border-slate-100" style={{ background: 'var(--theme-soft)', borderBottomColor: 'var(--card-border)' }}>
              <th className="px-8 py-5 text-[10px] font-black text-slate-400 tracking-widest">Institutional node</th>
              <th className="px-8 py-5 text-[10px] font-black text-slate-400 tracking-widest">Referral track</th>
              <th className="px-8 py-5 text-[10px] font-black text-slate-400 tracking-widest">Audit status</th>
              <th className="px-8 py-5 text-[10px] font-black text-slate-400 tracking-widest">Lifecycle</th>
              <th className="px-8 py-5"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50" style={{ borderTopColor: 'var(--card-border)' }}>
            {filteredCenters.map((center: any) => (
              <tr key={center.id} className="hover:bg-slate-50/50 transition-colors group">
                <td className="px-8 py-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all" style={{ background: 'var(--theme-soft)', color: 'var(--theme-accent)' }}>
                      <Building2 className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="font-black text-slate-900 leading-none mb-1" style={{ color: 'var(--page-text)' }}>{center.name}</p>
                      <p className="text-[10px] font-bold text-slate-400 tracking-widest">{center.shortName || 'CTR'}</p>
                    </div>
                  </div>
                </td>
                <td className="px-8 py-6">
                    <div className="flex flex-col gap-1">
                       <p className="text-xs font-bold text-slate-600" style={{ color: 'var(--page-text)', opacity: 0.8 }}>{center.metadata?.referralCode || 'DIRECT'}</p>
                       <p className="text-[10px] font-medium text-slate-400 italic">Onboarded: {new Date(center.createdAt).toLocaleDateString()}</p>
                    </div>
                </td>
                <td className="px-8 py-6">
                   <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border ${
                    (center.auditStatus || '').toLowerCase() === 'approved' ? 'bg-emerald-50 border-emerald-100 text-emerald-600' :
                    (center.auditStatus || '').toLowerCase() === 'rejected' ? 'bg-red-50 border-red-100 text-red-600' :
                    (center.auditStatus || '').toLowerCase() === 'pending_finance' ? 'bg-blue-50 border-blue-100 text-blue-600' :
                    'bg-amber-50 border-amber-100 text-amber-600'
                  }`}>
                    <span className="text-[10px] font-black tracking-widest">
                      {(center.auditStatus || '').toLowerCase() === 'pending_finance' ? 'Finance pending' : (center.auditStatus || 'Pending')}
                    </span>
                  </div>
                </td>
                <td className="px-8 py-6">
                  <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border ${
                    center.status === 'active' ? 'bg-emerald-50 border-emerald-100 text-emerald-600' :
                    center.status === 'staged' || center.status === 'draft' ? 'bg-blue-50 border-blue-100 text-blue-600' :
                    'bg-amber-50 border-amber-100 text-amber-600'
                  }`}>
                    <span className="text-[10px] font-black tracking-widest">{center.status}</span>
                  </div>
                </td>
                <td className="px-8 py-6 text-right">
                   <button className="p-2 text-slate-300 hover:text-blue-600 transition-colors" style={{ color: 'var(--theme-accent)' }}>
                      <ExternalLink className="w-4 h-4" />
                   </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredCenters.length === 0 && (
          <div className="py-24 text-center">
            <Filter className="w-16 h-16 text-slate-100 mx-auto mb-6" />
            <h3 className="text-2xl font-black text-slate-900 italic" style={{ color: 'var(--page-text)' }}>No centers found</h3>
            <p className="text-slate-400 font-bold text-sm tracking-widest mt-2 max-w-sm mx-auto">Try adjusting your filter or search term.</p>
          </div>
        )}
      </div>
    </div>
  );
}

