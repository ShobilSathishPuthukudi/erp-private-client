import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Megaphone, Filter, Clock, Trash2, X } from 'lucide-react';
import { Modal } from '@/components/shared/Modal';
import { DashCard } from '@/components/shared/DashCard';
import toast from 'react-hot-toast';

interface Announcement {
  id: number;
  title: string;
  message: string;
  priority: string;
  expiryDate?: string;
  createdAt: string;
  program?: { name: string };
  university?: { name: string };
}

export default function CenterAnnouncements() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ 
    title: '', 
    message: '', 
    priority: 'normal', 
    expiryDate: '',
    programId: '',
    universityId: ''
  });

  const [universities, setUniversities] = useState<any[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [annRes, uniRes, progRes] = await Promise.all([
        api.get('/announcements/ops'),
        api.get('/academic/universities'),
        api.get('/academic/programs')
      ]);
      setAnnouncements(annRes.data);
      setUniversities(uniRes.data);
      setPrograms(progRes.data);
    } catch (error) {
      toast.error('Failed to sync Operations board');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const isFormValid = 
    formData.title.trim() !== '' &&
    formData.message.trim() !== '' &&
    formData.priority !== '' &&
    formData.expiryDate !== '' &&
    formData.programId !== '' &&
    formData.universityId !== '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/announcements/ops', {
        ...formData,
        programId: formData.programId || null,
        universityId: formData.universityId || null
      });
      toast.success('Center directive broadcasted');
      setIsModalOpen(false);
      setFormData({ title: '', message: '', priority: 'normal', expiryDate: '', programId: '', universityId: '' });
      fetchData();
    } catch (error) {
      toast.error('Broadcasting failure');
    }
  };

  const deleteAnnouncement = async (id: number) => {
    try {
      await api.delete(`/announcements/${id}`);
      toast.success('Directive revoked');
      fetchData();
    } catch (error) {
      toast.error('Revocation failure');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
           <h1 className="text-2xl font-black text-slate-900 tracking-tight">Center Broadcasting</h1>
           <p className="text-slate-500 text-sm font-medium">Issue targeted directives directly to Study Center dashboards.</p>
        </div>
        <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200 shadow-sm">
           <div className="px-4 py-2 bg-white rounded-xl shadow-sm text-[10px] font-black uppercase tracking-widest text-slate-900 flex items-center gap-2 border border-slate-200">
              <Megaphone className="w-3.5 h-3.5 text-indigo-500" />
              Live Broadcast Engine
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <DashCard 
          title="Issue Center Directive"
          description="Broadcast high-priority operational instructions to regional study center dashboards."
          onClick={() => setIsModalOpen(true)}
          icon={Megaphone}
          actionLabel="Open Broadcast HUD"
          className="min-h-[280px]"
        />
        {announcements.map(ann => (
          <div key={ann.id} className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all relative group">
            <button 
                onClick={() => deleteAnnouncement(ann.id)}
                className="absolute top-4 right-4 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
            >
                <Trash2 className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2 mb-4">
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${ann.priority === 'urgent' ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-500'}`}>
                    {ann.priority}
                </span>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(ann.createdAt).toLocaleDateString()}
                </span>
            </div>
            <h3 className="font-black text-slate-900 uppercase tracking-tighter mb-2">{ann.title}</h3>
            <p className="text-slate-600 text-sm font-medium mb-4 line-clamp-3 italic">{ann.message}</p>
            
            <div className="pt-4 border-t border-slate-100 flex flex-wrap gap-2">
                <div className="flex items-center gap-1 text-[9px] font-black text-slate-400 uppercase bg-slate-50 px-2 py-0.5 rounded-md">
                    <Filter className="w-3 h-3" />
                    Scope: {ann.university?.name || ann.program?.name || 'All Centers'}
                </div>
            </div>
          </div>
        ))}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} hideHeader={true}>
        <div className="bg-white overflow-hidden transition-all duration-300 flex flex-col max-h-[calc(100vh-160px)]">
          <div className="bg-slate-900 p-6 text-white flex justify-between items-center shrink-0 relative border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2 rounded-xl backdrop-blur-md">
                <Megaphone className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest leading-none mb-1">
                  Operations
                </p>
                <h2 className="text-xl font-bold tracking-tight">
                  Issue Center Directive
                </h2>
              </div>
            </div>
            <button 
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-lg transition-all hover:scale-110 active:scale-90 text-white/60 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

         <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
            <div className="flex-1 overflow-y-auto p-8 space-y-6 min-h-0 custom-scrollbar">
                <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Directive Title</label>
                    <input 
                        required
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900 transition-all font-bold text-slate-900"
                        value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})}
                    />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Priority</label>
                    <select 
                            required
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900 transition-all font-bold text-slate-900"
                            value={formData.priority} onChange={e => setFormData({...formData, priority: e.target.value})}
                    >
                        <option value="">Select Priority</option>
                        <option value="normal">Normal</option>
                        <option value="urgent">Urgent</option>
                    </select>
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Expiry Date</label>
                        <input 
                            required
                            type="date"
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900 transition-all font-bold text-slate-900"
                            value={formData.expiryDate} onChange={e => setFormData({...formData, expiryDate: e.target.value})}
                        />
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Filter: University</label>
                        <select 
                            required
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900 transition-all font-bold text-slate-900"
                            value={formData.universityId} onChange={e => setFormData({...formData, universityId: e.target.value})}
                        >
                            <option value="">Select University</option>
                            {universities.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Filter: Program</label>
                        <select 
                            required
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900 transition-all font-bold text-slate-900"
                            value={formData.programId} onChange={e => setFormData({...formData, programId: e.target.value})}
                        >
                            <option value="">Select Program</option>
                            {programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                    </div>
                </div>
                <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Message Body</label>
                    <textarea 
                        required
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900 transition-all font-bold text-slate-900 min-h-[120px]"
                        rows={4}
                        value={formData.message} onChange={e => setFormData({...formData, message: e.target.value})}
                    />
                </div>
            </div>
            
            <div className="flex justify-end gap-3 p-8 bg-slate-50 border-t border-slate-200 shrink-0">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-8 py-3.5 bg-white text-slate-600 font-bold text-xs uppercase tracking-widest rounded-2xl border border-slate-200 hover:bg-slate-50 hover:scale-105 active:scale-95 transition-all shadow-sm"
                >
                  Discard
                </button>
                <button 
                  type="submit"
                  disabled={!isFormValid}
                  className="px-8 py-3.5 bg-slate-900 text-white font-bold text-xs uppercase tracking-widest rounded-2xl shadow-xl shadow-slate-900/10 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:active:scale-100"
                >
                  Broadcast to Centers
                </button>
            </div>
         </form>
        </div>
      </Modal>
    </div>
  );
}
