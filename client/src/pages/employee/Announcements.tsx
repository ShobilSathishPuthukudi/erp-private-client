import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '@/lib/api';
import AnnouncementBoard from '@/components/shared/AnnouncementBoard';
import { Calendar, Bell, Info } from 'lucide-react';
import toast from 'react-hot-toast';
import { PageHeader } from '@/components/shared/PageHeader';

interface Holiday {
  id: number;
  name: string;
  date: string;
  description: string;
}

export default function StaffAnnouncements() {
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [isLoadingHolidays, setIsLoadingHolidays] = useState(true);

  useEffect(() => {
    const fetchHolidays = async () => {
      try {
        const res = await api.get('/holidays');
        setHolidays(res.data.filter((h: any) => new Date(h.date) >= new Date()));
      } catch (error) {
        toast.error('Failed to sync institutional schedule');
      } finally {
        setIsLoadingHolidays(false);
      }
    };
    fetchHolidays();
  }, []);

  return (
    <div className="p-2 space-y-8">
      <PageHeader 
        title="Institutional board"
        description="Your unified feed for HR directives, Ops updates, and organizational milestones."
        icon={Bell}
        action={
          <div className="bg-white border border-slate-200 px-6 py-3 rounded-2xl shadow-sm flex items-center gap-6">
              <div className="text-center border-r border-slate-100 pr-6">
                  <p className="text-[10px] font-black text-slate-400 tracking-widest mb-1">Upcoming holidays</p>
                  <p className="text-xl font-black text-slate-900">{holidays.length}</p>
              </div>
              <div className="text-center">
                  <p className="text-[10px] font-black text-slate-400 tracking-widest mb-1">Today's date</p>
                  <p className="text-xl font-black text-slate-900">{new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</p>
              </div>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-xs font-black text-slate-400 tracking-[0.2em]">Live directives</h2>
                <div className="h-px flex-1 bg-slate-100 mx-6"></div>
            </div>
            <AnnouncementBoard />
        </div>

        <div className="space-y-6">
            <h2 className="text-xs font-black text-slate-400 tracking-[0.2em]">Holiday synchronization</h2>
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                    <Calendar className="w-5 h-5 text-slate-400" />
                    <h3 className="font-black text-slate-900 tracking-tighter">Scheduled breaks</h3>
                </div>
                
                {isLoadingHolidays ? (
                    <div className="py-12 text-center animate-pulse font-bold text-[10px] text-slate-300 tracking-widest">Syncing calendar...</div>
                ) : holidays.length === 0 ? (
                    <div className="py-12 text-center">
                         <Info className="w-8 h-8 text-slate-100 mx-auto mb-2" />
                         <p className="text-[10px] font-black text-slate-400 tracking-widest">No upcoming holidays</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {holidays.map(h => (
                            <div key={h.id} className="flex gap-4 group">
                                <div className="shrink-0 text-center">
                                    <div className="w-12 h-12 bg-slate-50 rounded-2xl flex flex-col items-center justify-center border border-slate-100 group-hover:bg-slate-900 group-hover:text-white transition-all">
                                        <span className="text-[10px] font-black tracking-tighter leading-none opacity-50 mb-0.5">{new Date(h.date).toLocaleDateString('en-IN', { month: 'short' })}</span>
                                        <span className="text-lg font-black leading-none">{new Date(h.date).getDate()}</span>
                                    </div>
                                </div>
                                <div className="pt-1">
                                    <h4 className="font-black text-slate-900 tracking-tighter text-sm mb-0.5">{h.name}</h4>
                                    <p className="text-xs text-slate-400 font-medium line-clamp-1">{h.description || 'Institutional holiday'}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            
            <div className="bg-indigo-600 rounded-3xl p-8 text-white relative overflow-hidden shadow-xl shadow-indigo-100">
                <div className="relative z-10">
                    <h3 className="font-black text-xl mb-2 leading-tight">Need to request a break?</h3>
                    <p className="text-indigo-100 text-xs font-medium mb-6 opacity-80">Submit your leave request through the HR portal for departmental approval.</p>
                    <Link to="../leaves">
                      <button className="bg-white text-indigo-600 px-6 py-2 rounded-xl text-[10px] font-black tracking-widest hover:scale-105 transition-transform">
                          Launch leave portal
                      </button>
                    </Link>
                </div>
                <Calendar className="absolute -bottom-4 -right-4 w-32 h-32 text-white opacity-5" />
            </div>
        </div>
      </div>
    </div>
  );
}
