import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/shared/PageHeader';
import { Modal } from '@/components/shared/Modal';
import { MessagesSquare, Reply, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

interface HRCommunication {
  id: number;
  subject: string;
  category: string;
  message: string;
  status: 'open' | 'in_review' | 'resolved';
  hrResponse?: string | null;
  respondedAt?: string | null;
  createdAt: string;
  employee: {
    uid: string;
    name: string;
    email?: string;
    department?: {
      name: string;
    } | null;
  };
}

export default function EmployeeCommunications() {
  const [items, setItems] = useState<HRCommunication[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<HRCommunication | null>(null);
  const [activeTab, setActiveTab] = useState<'open' | 'in_review' | 'resolved'>('open');
  const [updateStatus, setUpdateStatus] = useState<'open' | 'in_review' | 'resolved'>('open');
  const [response, setResponse] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const counts = {
    open: items.filter(i => i.status === 'open').length,
    in_review: items.filter(i => i.status === 'in_review').length,
    resolved: items.filter(i => i.status === 'resolved').length
  };

  const filteredItems = items.filter(i => i.status === activeTab);

  const fetchItems = async () => {
    try {
      setLoading(true);
      const res = await api.get('/hr/employee-communications');
      setItems(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      toast.error('Failed to load employee communications');
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
    const interval = setInterval(fetchItems, 15000); // 15s background telemetry
    return () => clearInterval(interval);
  }, []);

  const openModal = (item: HRCommunication) => {
    setSelected(item);
    setUpdateStatus(item.status);
    setResponse(item.hrResponse || '');
    setError(null);
  };

  const saveResponse = async () => {
    if (!selected) return;
    
    // Institutional Validation Guard
    const msg = response.trim();
    if (msg.length < 6 || msg.length > 200) {
      setError('HR Response Content must be between 6 to 200 characters');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      await api.put(`/hr/employee-communications/${selected.id}`, {
        status: updateStatus,
        hrResponse: response
      });
      toast.success('Employee communication updated');
      setSelected(null);
      fetchItems();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to update communication');
    } finally {
      setSaving(false);
    }
  };

  const getStatusTone = (value: string) => {
    if (value === 'resolved') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (value === 'in_review') return 'bg-amber-50 text-amber-700 border-amber-200';
    return 'bg-blue-50 text-blue-700 border-blue-200';
  };

  return (
    <div className="p-2 space-y-6">
      <PageHeader
        title="Employee communications"
        description="Review employee questions, respond from HR, and track request resolution."
        icon={MessagesSquare}
      />

      <div className="flex flex-wrap gap-2 p-1 bg-slate-100 rounded-2xl w-fit">
        {[
          { id: 'open', label: 'Pending', count: counts.open },
          { id: 'in_review', label: 'In-Review', count: counts.in_review },
          { id: 'resolved', label: 'Resolved', count: counts.resolved },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2.5 px-6 py-2.5 rounded-xl text-xs font-black tracking-widest transition-all ${
              activeTab === tab.id
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
            }`}
          >
            {tab.label}
            <span className={`px-2 py-0.5 rounded-lg text-[10px] ${
              activeTab === tab.id ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-600'
            }`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64 border border-dashed rounded-lg border-slate-200 bg-white">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-800"></div>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed rounded-lg border-slate-200 bg-slate-50">
          <MessagesSquare className="w-12 h-12 text-slate-300 mb-3" />
          <p className="text-slate-500 font-medium italic tracking-widest text-[10px]">No {activeTab.replace('_', ' ')} communications found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {filteredItems.map((item) => (
            <button
              key={item.id}
              onClick={() => openModal(item)}
              className="text-left bg-white rounded-xl shadow-sm border border-slate-100 p-6 space-y-4 hover:shadow-md transition-all group"
            >
              <div className="flex justify-between items-start gap-4">
                <div>
                  <p className="text-[10px] font-black tracking-[0.2em] text-slate-400 group-hover:text-indigo-500 transition-colors">{item.category}</p>
                  <h3 className="text-lg font-bold text-slate-900 mt-1">{item.subject}</h3>
                  <p className="text-xs text-slate-500 mt-1">{item.employee.name} · {item.employee.department?.name || 'Department unavailable'}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-[10px] font-black tracking-widest border ${getStatusTone(item.status)}`}>
                  {item.status === 'open' ? 'Pending' : item.status.replace('_', ' ')}
                </span>
              </div>
              <p className="text-sm text-slate-600 line-clamp-4">{item.message}</p>
              {item.hrResponse && (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 border-l-4 border-l-indigo-400">
                  <p className="text-[10px] font-black tracking-widest text-slate-400 mb-1">HR resolution</p>
                  {item.hrResponse}
                </div>
              )}
              <p className="text-[10px] font-bold tracking-widest text-slate-400">
                Received {new Date(item.createdAt).toLocaleString()}
              </p>
            </button>
          ))}
        </div>
      )}

      <Modal isOpen={!!selected} onClose={() => setSelected(null)} title="Communication Details" maxWidth="4xl">
        {selected && (
          <div className="space-y-4">
            {/* Header & Status */}
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[10px] font-black tracking-widest text-slate-400">{selected.category}</p>
                <h2 className="text-lg font-black text-slate-900 mt-1">{selected.subject}</h2>
              </div>
              <span className={`px-3 py-1 rounded-full text-[10px] font-black tracking-widest border ${getStatusTone(selected.status)}`}>
                {selected.status === 'open' ? 'Pending' : selected.status.replace('_', ' ')}
              </span>
            </div>

            {/* Inquiry Details Card */}
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 bg-white rounded-xl flex items-center justify-center shadow-sm text-slate-400 border border-slate-100">
                  <MessagesSquare className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">{selected.employee.name}</h3>
                  <p className="text-[9px] font-black tracking-widest text-slate-400">{selected.employee.department?.name || 'Institutional personnel'}</p>
                </div>
              </div>
              <div className="bg-white p-4 rounded-xl text-xs text-slate-700 leading-relaxed whitespace-pre-wrap border border-slate-100 shadow-sm">
                {selected.message}
              </div>
              <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mt-3 text-right">
                Inquiry received {new Date(selected.createdAt).toLocaleString()}
              </p>
            </div>

            {/* Resolution Actions */}
            <div className="bg-white p-5 rounded-2xl border-2 border-slate-100 shadow-xl shadow-slate-100/50 space-y-4">
              <div className="flex items-center gap-3 mb-1">
                <div className="w-9 h-9 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                  <Reply className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Administrative Response</h3>
                  <p className="text-[10px] text-slate-500 font-medium">Update status and provide guidance to the employee.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[9px] font-black tracking-widest text-slate-400 mb-1.5 ml-1">Current status</label>
                  <select
                    value={updateStatus}
                    onChange={(e) => setUpdateStatus(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-inner"
                  >
                    <option value="open">Open Inquiry (Pending)</option>
                    <option value="in_review">In Administrative Review</option>
                    <option value="resolved">Mark as Resolved</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[9px] font-black tracking-widest text-slate-400 mb-1.5 ml-1">HR response content</label>
                <textarea
                  rows={3}
                  value={response}
                  onChange={(e) => {
                    setResponse(e.target.value);
                    if (error) setError(null);
                  }}
                  className={`w-full bg-slate-50 border ${error ? 'border-red-300 ring-4 ring-red-50' : 'border-slate-200'} rounded-xl px-4 py-3 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-400 shadow-inner transition-all`}
                  placeholder="Draft resolution or request further information..."
                />
                {error && (
                  <p className="mt-2 text-[9px] font-bold uppercase tracking-widest text-red-500 ml-1 animate-in fade-in slide-in-from-top-1">
                    {error}
                  </p>
                )}
              </div>

              <div className="pt-3 flex justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  className="px-6 py-2.5 text-[10px] font-black tracking-widest text-slate-500 hover:text-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={saveResponse}
                  disabled={saving}
                  className="px-8 py-2.5 bg-slate-900 text-white rounded-xl text-[10px] font-black tracking-widest hover:bg-slate-800 transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-slate-200"
                >
                  {updateStatus === 'resolved' ? <CheckCircle className="w-3.5 h-3.5" /> : <Reply className="w-3.5 h-3.5" />}
                  {saving ? 'Processing...' : 'Deploy Update'}
                </button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
