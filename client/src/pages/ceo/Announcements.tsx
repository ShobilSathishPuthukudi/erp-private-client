import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import { 
  Megaphone, 
  Clock, 
  Sparkles, 
  ShieldCheck, 
  X, 
  CheckCircle2, 
  AlertCircle,
  History,
  Send
} from 'lucide-react';
import { format } from 'date-fns';
import { Modal } from '@/components/shared/Modal';

interface Announcement {
  id: number;
  title: string;
  message: string;
  priority: 'normal' | 'urgent';
  expiryDate?: string;
  createdAt: string;
  author: {
    name: string;
  };
}

export default function CEOAnnouncements() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDirective, setSelectedDirective] = useState<Announcement | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({ 
    title: '', 
    message: '', 
    priority: 'normal', 
    expiryDate: '' 
  });

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    try {
      const res = await api.get('/announcements/ceo');
      // Filter out HR broadcasts so only CEO-issued directives reside here
      setAnnouncements(res.data.filter((a: any) => a.targetChannel !== 'all_employees'));
    } catch (error) {
      toast.error('Failed to load institutional directives');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const payload = {
        ...formData,
        expiryDate: formData.expiryDate ? new Date(formData.expiryDate).toISOString() : ''
      };
      const res = await api.post('/announcements/ceo/hr', payload);
      setAnnouncements([res.data, ...announcements]);
      toast.success('Institutional Directive issued to HR');
      setIsModalOpen(false);
      setFormData({ title: '', message: '', priority: 'normal', expiryDate: '' });
      fetchAnnouncements();
    } catch (error) {
      toast.error('Failed to issue directive');
    } finally {
      setIsSubmitting(false);
    }
  };

  const priorityStyles = {
    normal: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    urgent: 'bg-rose-50 text-rose-700 border-rose-100 animate-pulse'
  };

  return (
    <div className="p-2 space-y-6 flex flex-col">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white px-6 py-5 rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50 gap-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center text-white shadow-lg shadow-slate-900/20 shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight leading-tight mb-0.5">Institutional directives</h1>
            <p className="text-slate-500 font-medium text-sm">Issue high-level mandates and operational instructions directly to the HR Administration team.</p>
          </div>
        </div>

        <button 
          onClick={() => setIsModalOpen(true)}
          className="group flex items-center gap-3 bg-slate-900 hover:bg-slate-800 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all hover:-translate-y-1 active:scale-95 shadow-xl shadow-slate-900/20"
        >
          <Sparkles className="w-4 h-4 text-amber-500 group-hover:animate-spin-slow" />
          Issue New Directive
        </button>
      </div>

      <div className="grid grid-cols-1 gap-8">
        <div className="flex items-center gap-4 mb-2">
           <History className="w-5 h-5 text-slate-400" />
           <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Directive History</h3>
           <div className="h-[1px] flex-1 bg-slate-100"></div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64 bg-white border border-slate-100 rounded-[2rem]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
          </div>
        ) : announcements.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-80 bg-slate-50 border-2 border-dashed border-slate-200 rounded-[3rem]">
             <div className="w-20 h-20 rounded-3xl bg-white shadow-sm flex items-center justify-center mb-6">
                <AlertCircle className="w-10 h-10 text-slate-300" />
             </div>
             <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">No active directives found</p>
             <p className="text-[10px] text-slate-400 mt-2">Initialize your first command to get started.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
            {announcements.map(ann => (
              <div 
                key={ann.id} 
                onClick={() => setSelectedDirective(ann)}
                className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-xl shadow-slate-200/40 relative overflow-hidden group hover:-translate-y-2 transition-all duration-500 cursor-pointer"
              >
                <div className="flex justify-between items-start mb-6">
                  <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${priorityStyles[ann.priority as keyof typeof priorityStyles]}`}>
                    {ann.priority} Mode
                  </div>
                  <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                    <Clock className="w-3.5 h-3.5" />
                    {format(new Date(ann.createdAt), 'MMM dd, yyyy')}
                  </div>
                </div>
                
                <h3 className="text-xl font-black text-slate-900 mb-4 tracking-tight group-hover:text-blue-600 transition-colors">{ann.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed mb-8 line-clamp-4 italic">
                   "{ann.message}"
                </p>
                
                <div className="pt-6 border-t border-slate-50 flex items-center justify-between">
                   <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-white font-black text-xs">
                        {ann.author?.name?.charAt(0) || 'C'}
                      </div>
                      <div>
                        <p className="text-xs font-black text-slate-900 uppercase">Authorizer</p>
                        <p className="text-[10px] font-bold text-slate-400 capitalize">Executive Office</p>
                      </div>
                   </div>
                   <div className="flex items-center gap-2 text-emerald-500">
                      <CheckCircle2 className="w-4 h-4" />
                      <span className="text-[10px] font-black uppercase tracking-widest">Broadcasted</span>
                   </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Issue Executive Directive">
        <form onSubmit={handleSubmit} className="p-2 space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Directive Header</label>
            <input 
              type="text" 
              required
              placeholder="e.g., Q3 COMPENSATION ADJUSTMENT POLICY"
              className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-slate-900 outline-none transition-all placeholder:text-slate-300" 
              value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} 
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Enforcement Priority</label>
              <select
                className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-slate-900 outline-none transition-all cursor-pointer" 
                value={formData.priority} onChange={e => setFormData({...formData, priority: e.target.value as any})}
              >
                <option value="normal">Standard Protocol</option>
                <option value="urgent">Urgent Mandate</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Lapse Timestamp</label>
              <input 
                type="datetime-local" 
                required
                className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-slate-900 outline-none transition-all" 
                value={formData.expiryDate} onChange={e => setFormData({...formData, expiryDate: e.target.value})} 
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Mandate Content</label>
            <textarea 
              rows={6}
              required
              placeholder="Detail the institutional directive here..."
              className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-slate-900 outline-none transition-all placeholder:text-slate-300 resize-none" 
              value={formData.message} onChange={e => setFormData({...formData, message: e.target.value})} 
            />
          </div>

          <div className="pt-4 flex items-center gap-4">
            <button 
              type="button" 
              onClick={() => setIsModalOpen(false)}
              className="flex-1 px-8 py-4 text-xs font-black text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors"
            >
              Withdraw
            </button>
            <button 
              type="submit" 
              disabled={isSubmitting}
              className="flex-[2] flex items-center justify-center gap-3 bg-slate-900 hover:bg-slate-800 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-slate-900/10 disabled:opacity-50"
            >
              {isSubmitting ? (
                 <div className="w-4 h-4 border-2 border-white/20 border-b-white rounded-full animate-spin"></div>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Execute Broadcast
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={!!selectedDirective}
        onClose={() => setSelectedDirective(null)}
        title="Directive details"
        maxWidth="2xl"
      >
        {selectedDirective && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
               <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${priorityStyles[selectedDirective.priority as keyof typeof priorityStyles]}`}>
                 {selectedDirective.priority} Mode
               </div>
               <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                 <Clock className="w-4 h-4" />
                 {format(new Date(selectedDirective.createdAt), 'PPpp')}
               </div>
            </div>
            
            <div>
              <h2 className="text-2xl font-black text-slate-900 mb-4">{selectedDirective.title}</h2>
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                <p className="text-slate-600 leading-relaxed whitespace-pre-wrap">{selectedDirective.message}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-6 border-t border-slate-100">
               <div className="w-12 h-12 rounded-xl bg-slate-900 flex items-center justify-center text-white font-black text-sm">
                 {selectedDirective.author?.name?.charAt(0) || 'C'}
               </div>
               <div>
                 <p className="text-sm font-black text-slate-900 uppercase">Authorizer</p>
                 <p className="text-xs font-bold text-slate-400 capitalize">Executive Office</p>
               </div>
               <div className="flex items-center gap-4 ml-auto">
                 <div className="flex items-center gap-2 text-emerald-500">
                    <CheckCircle2 className="w-4 h-4" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Broadcasted</span>
                 </div>
                 <button 
                   onClick={() => setSelectedDirective(null)}
                   className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-600 px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all"
                 >
                   Close View
                 </button>
               </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
