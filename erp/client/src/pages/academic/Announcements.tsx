import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Megaphone, Filter, Clock, Trash2 } from 'lucide-react';
import { Modal } from '@/components/shared/Modal';
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
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 text-white px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 flex items-center gap-2"
        >
          <Megaphone className="w-4 h-4" />
          Issue Directive
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Issue Center Directive">
         <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Directive Title</label>
                <input 
                    required
                    className="w-full border border-slate-200 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-600 font-bold"
                    value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})}
                />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div>
                   <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Priority</label>
                   <select 
                        className="w-full border border-slate-200 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-600 font-bold"
                        value={formData.priority} onChange={e => setFormData({...formData, priority: e.target.value})}
                   >
                       <option value="normal">Normal</option>
                       <option value="urgent">Urgent</option>
                   </select>
                </div>
                <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Expiry Date</label>
                    <input 
                        type="date"
                        className="w-full border border-slate-200 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-600 font-bold"
                        value={formData.expiryDate} onChange={e => setFormData({...formData, expiryDate: e.target.value})}
                    />
                </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Filter: University</label>
                    <select 
                        className="w-full border border-slate-200 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-600 font-bold"
                        value={formData.universityId} onChange={e => setFormData({...formData, universityId: e.target.value})}
                    >
                        <option value="">All Universities</option>
                        {universities.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Filter: Program</label>
                    <select 
                        className="w-full border border-slate-200 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-600 font-bold"
                        value={formData.programId} onChange={e => setFormData({...formData, programId: e.target.value})}
                    >
                        <option value="">All Programs</option>
                        {programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                </div>
            </div>
            <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Message Body</label>
                <textarea 
                    required
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-600 font-medium"
                    rows={4}
                    value={formData.message} onChange={e => setFormData({...formData, message: e.target.value})}
                />
            </div>
            <div className="flex justify-end pt-4">
                <button type="submit" className="bg-blue-600 text-white px-10 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-blue-100">
                    Broadcast to Centers
                </button>
            </div>
         </form>
      </Modal>
    </div>
  );
}
