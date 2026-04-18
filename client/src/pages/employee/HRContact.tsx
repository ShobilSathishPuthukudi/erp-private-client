import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/shared/PageHeader';
import { Modal } from '@/components/shared/Modal';
import { LifeBuoy, MessageSquare, Send, CheckCircle, Clock3 } from 'lucide-react';
import toast from 'react-hot-toast';

interface HRRequest {
  id: number;
  subject: string;
  category: string;
  message: string;
  status: 'open' | 'in_review' | 'resolved';
  hrResponse?: string | null;
  respondedAt?: string | null;
  responder?: {
    uid: string;
    name: string;
  } | null;
  createdAt: string;
}

const emptyForm = {
  subject: '',
  category: 'general',
  message: ''
};

export default function HRContact() {
  const [requests, setRequests] = useState<HRRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState(emptyForm);
  const [selectedRequest, setSelectedRequest] = useState<HRRequest | null>(null);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const res = await api.get('/portals/employee/hr-requests');
      setRequests(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      toast.error('Failed to load HR communication history');
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      await api.post('/portals/employee/hr-requests', formData);
      toast.success('Your message has been sent to HR');
      setFormData(emptyForm);
      setIsModalOpen(false);
      fetchRequests();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to send message to HR');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusTone = (status: string) => {
    if (status === 'resolved') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (status === 'in_review') return 'bg-amber-50 text-amber-700 border-amber-200';
    return 'bg-blue-50 text-blue-700 border-blue-200';
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Contact HR"
        description="Send policy, payroll, leave, attendance, or document queries directly to Human Resources."
        icon={LifeBuoy}
        action={
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center shadow-sm whitespace-nowrap"
          >
            <Send className="w-4 h-4 mr-2" />
            New HR Request
          </button>
        }
      />

      {loading ? (
        <div className="flex justify-center items-center h-64 border border-dashed rounded-lg border-slate-200 bg-white">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-800"></div>
        </div>
      ) : requests.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed rounded-lg border-slate-200 bg-slate-50">
          <MessageSquare className="w-12 h-12 text-slate-300 mb-3" />
          <p className="text-slate-500 font-medium">No HR communication yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {requests.map((request) => (
            <button 
              key={request.id} 
              onClick={() => setSelectedRequest(request)}
              className="group text-left bg-white rounded-xl shadow-sm border border-slate-100 p-6 space-y-4 hover:shadow-md hover:border-blue-200 transition-all"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 group-hover:text-blue-400 transition-colors">{request.category}</p>
                  <h3 className="text-lg font-bold text-slate-900 mt-1">{request.subject}</h3>
                </div>
                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${getStatusTone(request.status)}`}>
                  {request.status.replace('_', ' ')}
                </span>
              </div>

              <p className="text-sm text-slate-600 line-clamp-2">{request.message}</p>

              {request.hrResponse && (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center gap-2 text-sm font-bold text-slate-900 mb-1">
                    {request.status === 'resolved' ? <CheckCircle className="w-4 h-4 text-emerald-600" /> : <Clock3 className="w-4 h-4 text-amber-600" />}
                    HR Response
                  </div>
                  <p className="text-xs text-slate-500 line-clamp-1 italic">Click to view full response</p>
                </div>
              )}

              <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Sent {new Date(request.createdAt).toLocaleDateString()}
                </p>
                <span className="text-[10px] font-black uppercase tracking-widest text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
                  View Details
                </span>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Details Modal */}
      <Modal 
        isOpen={!!selectedRequest} 
        onClose={() => setSelectedRequest(null)} 
        title="Request Details"
      >
        {selectedRequest && (
          <div className="space-y-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{selectedRequest.category}</p>
                <h2 className="text-xl font-black text-slate-900 mt-1">{selectedRequest.subject}</h2>
              </div>
              <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${getStatusTone(selectedRequest.status)}`}>
                {selectedRequest.status.replace('_', ' ')}
              </span>
            </div>

            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
              <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3">Your Message</p>
              <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{selectedRequest.message}</p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-4 border-t border-slate-200 pt-3">
                Applied on {new Date(selectedRequest.createdAt).toLocaleString()}
              </p>
            </div>

            {selectedRequest.hrResponse ? (
              <div className="bg-white p-6 rounded-2xl border-2 border-slate-100 shadow-xl shadow-slate-100/50">
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${selectedRequest.status === 'resolved' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                    {selectedRequest.status === 'resolved' ? <CheckCircle className="w-5 h-5" /> : <Clock3 className="w-5 h-5" />}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900">HR Resolution</h3>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Response provided by {selectedRequest.responder?.name || 'Authorized Personnel'}</p>
                  </div>
                </div>
                <div className="bg-slate-50/50 p-4 rounded-xl text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                  {selectedRequest.hrResponse}
                </div>
                {selectedRequest.respondedAt && (
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-4 text-right">
                    Last updated {new Date(selectedRequest.respondedAt).toLocaleString()}
                  </p>
                )}
              </div>
            ) : (
              <div className="bg-blue-50/30 p-6 rounded-2xl border border-blue-100 border-dashed flex items-center gap-4">
                <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center animate-pulse">
                  <Clock3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-blue-900">Awaiting HR Review</h3>
                  <p className="text-xs text-blue-600/70">Your request is in the queue. You'll be notified once HR provides a response.</p>
                </div>
              </div>
            )}

            <div className="flex justify-end pt-4 border-t border-slate-100">
              <button
                onClick={() => setSelectedRequest(null)}
                className="px-6 py-2 bg-slate-900 text-white rounded-xl text-sm font-black uppercase tracking-widest hover:bg-slate-800 transition-all active:scale-95"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="New HR Request">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Subject *</label>
            <input
              type="text"
              required
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Payroll clarification, leave issue, document request"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Category *</label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="general">General</option>
              <option value="leave">Leave</option>
              <option value="payroll">Payroll</option>
              <option value="documents">Documents</option>
              <option value="attendance">Attendance</option>
              <option value="policy">Policy</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Message *</label>
            <textarea
              required
              rows={5}
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Write the details HR should review..."
            />
          </div>
          <div className="pt-4 border-t border-slate-200 flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Sending...' : 'Send to HR'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
