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
  university?: { name: string };
  center?: { name: string };
  program?: { name: string };
}

export default function CenterAnnouncements() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
  const [formData, setFormData] = useState({ 
    title: '', 
    message: '', 
    priority: 'normal', 
    expiryDate: '',
    programId: 'global',
    centerId: 'all'
  });

  const [centers, setCenters] = useState<any[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [annRes, centerRes, progRes] = await Promise.all([
        api.get('/announcements/ops'),
        api.get('/academic/centers?status=active'),
        api.get('/academic/programs')
      ]);
      setAnnouncements(annRes.data);
      setCenters(centerRes.data);
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
    formData.centerId !== '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/announcements/ops', {
        ...formData,
        programId: formData.programId === 'global' ? null : parseInt(formData.programId as string, 10),
        centerId: formData.centerId === 'all' ? null : parseInt(formData.centerId as string, 10)
      });
      toast.success('Center directive broadcasted');
      setIsModalOpen(false);
      setFormData({ title: '', message: '', priority: 'normal', expiryDate: '', programId: 'global', centerId: 'all' });
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
    <div className="p-2 space-y-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white px-6 py-5 rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50 gap-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center text-white shadow-lg shadow-slate-900/20 shrink-0">
            <Megaphone className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight leading-tight mb-0.5">Center broadcasting</h1>
            <p className="text-slate-500 font-medium text-sm">Issue targeted directives directly to Study Center dashboards.</p>
          </div>
        </div>
        {!isLoading && announcements.length > 0 && (
          <button 
             onClick={() => setIsModalOpen(true)}
             className="px-6 py-3 bg-slate-900 text-white rounded-2xl shadow-xl shadow-slate-900/10 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-slate-800 transition-all active:scale-95 whitespace-nowrap"
          >
             <Megaphone className="w-4 h-4" />
             New Broadcast Directive
          </button>
        )}
      </div>

      {!isLoading && announcements.length === 0 ? (
        <div className="max-w-xl mx-auto py-20">
          <DashCard 
            title="Issue Center Directive"
            description="Broadcast high-priority operational instructions to regional study center dashboards. Launch the HUD to define scope and delivery protocols."
            onClick={() => setIsModalOpen(true)}
            icon={Megaphone}
            actionLabel="Open Broadcast HUD"
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {announcements.map(ann => (
            <div 
              key={ann.id} 
              onClick={() => setSelectedAnnouncement(ann)}
              className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm hover:shadow-xl hover:shadow-indigo-500/5 transition-all relative group cursor-pointer"
            >
              <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteAnnouncement(ann.id);
                  }}
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
              <p className="text-slate-600 text-sm font-medium mb-4 line-clamp-3 ">{ann.message}</p>
              
              <div className="pt-4 border-t border-slate-100 flex flex-wrap gap-2">
                  <div className="flex items-center gap-1 text-[9px] font-black text-slate-400 uppercase bg-slate-50 px-2 py-0.5 rounded-md">
                      <Filter className="w-3 h-3" />
                      Scope: {ann.center?.name || ann.program?.name || 'All Centers'}
                  </div>
              </div>
            </div>
          ))}
        </div>
      )}

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
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Target: Study Center</label>
                        <select 
                            required
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900 transition-all font-bold text-slate-900 font-mono"
                            value={formData.centerId} onChange={e => setFormData({...formData, centerId: e.target.value})}
                        >
                            <option value="all">Global Broadcast (All Centers)</option>
                            {centers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Filter: Program</label>
                        <select 
                            required
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900 transition-all font-bold text-slate-900"
                            value={formData.programId} onChange={e => setFormData({...formData, programId: e.target.value})}
                        >
                            <option value="global">Global (All Programs)</option>
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

      {/* Announcement Detail View Modal */}
      <Modal isOpen={!!selectedAnnouncement} onClose={() => setSelectedAnnouncement(null)} hideHeader={true}>
        {selectedAnnouncement && (
          <div className="bg-white overflow-hidden transition-all duration-300 flex flex-col max-h-[calc(100vh-160px)]">
            <div className={`p-8 ${selectedAnnouncement.priority === 'urgent' ? 'bg-red-600' : 'bg-slate-900'} text-white relative overflow-hidden`}>
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />
                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="bg-white/20 p-2 rounded-xl backdrop-blur-md">
                            <Megaphone className="w-6 h-6 text-white" />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/60">Live Directive</span>
                    </div>
                    <h2 className="text-3xl font-black tracking-tight leading-none uppercase">{selectedAnnouncement.title}</h2>
                </div>
                <button 
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedAnnouncement(null);
                  }}
                  className="absolute top-6 right-6 p-2.5 hover:bg-white/10 rounded-xl transition-all text-white/60 hover:text-white z-50 group/close"
                >
                  <X className="w-5 h-5 group-hover/close:scale-110 transition-transform" />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-10 space-y-10 min-h-0 custom-scrollbar">
                <div className="flex flex-wrap gap-4 pt-2">
                    <div className="flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-xl border border-slate-100">
                        <Clock className="w-4 h-4 text-slate-400" />
                        <div className="flex flex-col">
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Issue Date</span>
                            <span className="text-[11px] font-black text-slate-900">{new Date(selectedAnnouncement.createdAt).toLocaleDateString()}</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-xl border border-slate-100">
                        <Filter className="w-4 h-4 text-slate-400" />
                        <div className="flex flex-col">
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Target Center</span>
                            <span className="text-[11px] font-black text-slate-900 uppercase tracking-tighter">
                                {selectedAnnouncement.center?.name || 'Global Broadcast (All Centers)'}
                            </span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-xl border border-slate-100">
                        <Megaphone className="w-4 h-4 text-slate-400" />
                        <div className="flex flex-col">
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Program Filter</span>
                            <span className="text-[11px] font-black text-slate-900 uppercase tracking-tighter">
                                {selectedAnnouncement.program?.name || 'All Programs'}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    <h3 className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em]">Message Content</h3>
                    <p className="text-lg font-medium text-slate-700 leading-relaxed max-w-2xl">
                        {selectedAnnouncement.message}
                    </p>
                </div>
            </div>

            <div className="p-8 bg-slate-50 border-t border-slate-200 shrink-0 flex justify-between items-center">
                <button 
                    onClick={() => {
                        deleteAnnouncement(selectedAnnouncement.id);
                        setSelectedAnnouncement(null);
                    }}
                    className="px-6 py-3 bg-white text-red-600 border border-red-100 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-50 hover:border-red-200 transition-all flex items-center gap-2"
                >
                    <Trash2 className="w-4 h-4" />
                    Revoke Directive
                </button>
                <button 
                    onClick={() => setSelectedAnnouncement(null)}
                    className="px-8 py-4 bg-slate-900 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-slate-900/10"
                >
                    Dismiss
                </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
