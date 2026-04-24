import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import { 
  Megaphone, 
  Clock, 
  ShieldCheck, 
  AlertCircle,
  History,
  Users
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
  targetChannel: string;
  author: {
    name: string;
  };
}

export default function HRBroadcasts() {
  const [broadcasts, setBroadcasts] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBroadcast, setSelectedBroadcast] = useState<Announcement | null>(null);

  useEffect(() => {
    fetchBroadcasts();
  }, []);

  const fetchBroadcasts = async () => {
    try {
      const res = await api.get('/announcements/ceo');
      // Filter the existing payload solely for actual HR broadcasts
      setBroadcasts(res.data.filter((a: Announcement) => a.targetChannel === 'all_employees'));
    } catch (error) {
      toast.error('Failed to load HR broadcasts');
    } finally {
      setLoading(false);
    }
  };

  const priorityStyles = {
    normal: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    urgent: 'bg-rose-50 text-rose-700 border-rose-100 animate-pulse'
  };

  return (
    <div className="p-2 space-y-6 flex flex-col">
      <PageHeader 
        title="HR broadcasts"
        description="Review all universal broadcasts distributed by Human Resources to the entire institutional workforce."
        icon={Users}
      />

      <div className="grid grid-cols-1 gap-8">
        <div className="flex items-center gap-4 mb-2">
           <History className="w-5 h-5 text-slate-400" />
           <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Broadcast history</h3>
           <div className="h-[1px] flex-1 bg-slate-100"></div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64 bg-white border border-slate-100 rounded-[2rem]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
          </div>
        ) : broadcasts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-80 bg-slate-50 border-2 border-dashed border-slate-200 rounded-[3rem]">
              <div className="w-20 h-20 rounded-3xl bg-white shadow-sm flex items-center justify-center mb-6">
                 <AlertCircle className="w-10 h-10 text-slate-300" />
              </div>
              <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">No HR broadcasts found</p>
              <p className="text-[10px] text-slate-400 mt-2">No broad-scale communications have been released yet.</p>
           </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
            {broadcasts.map(ann => (
              <div 
                key={ann.id} 
                onClick={() => setSelectedBroadcast(ann)}
                className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-xl shadow-slate-200/40 relative overflow-hidden group hover:-translate-y-2 transition-all duration-500 cursor-pointer"
              >
                <div className="flex justify-between items-start mb-6">
                  <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${priorityStyles[ann.priority as keyof typeof priorityStyles]}`}>
                    {ann.priority} mode
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
                        {ann.author?.name?.charAt(0) || 'H'}
                      </div>
                      <div>
                        <p className="text-xs font-black text-slate-900 uppercase">{ann.author?.name || 'Human Resources'}</p>
                        <p className="text-[10px] font-bold text-slate-400 capitalize">HR Department</p>
                      </div>
                   </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal
        isOpen={!!selectedBroadcast}
        onClose={() => setSelectedBroadcast(null)}
        title="Broadcast details"
        maxWidth="2xl"
      >
        {selectedBroadcast && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
               <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${priorityStyles[selectedBroadcast.priority as keyof typeof priorityStyles]}`}>
                 {selectedBroadcast.priority} mode
               </div>
               <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                 <Clock className="w-4 h-4" />
                 {format(new Date(selectedBroadcast.createdAt), 'PPpp')}
               </div>
            </div>
            
            <div>
              <h2 className="text-2xl font-black text-slate-900 mb-4">{selectedBroadcast.title}</h2>
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                <p className="text-slate-600 leading-relaxed whitespace-pre-wrap">{selectedBroadcast.message}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-6 border-t border-slate-100">
               <div className="w-12 h-12 rounded-xl bg-slate-900 flex items-center justify-center text-white font-black text-sm">
                 {selectedBroadcast.author?.name?.charAt(0) || 'H'}
               </div>
               <div>
                 <p className="text-sm font-black text-slate-900 uppercase">{selectedBroadcast.author?.name || 'Human Resources'}</p>
                 <p className="text-xs font-bold text-slate-400 capitalize">HR Department • Issuer</p>
               </div>
               <button 
                 onClick={() => setSelectedBroadcast(null)}
                 className="ml-auto flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-600 px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all"
               >
                 Close View
               </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
