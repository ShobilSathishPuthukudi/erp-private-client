import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { CalendarDays, Clock, MapPin, Search, ChevronRight } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Modal } from '@/components/shared/Modal';
import toast from 'react-hot-toast';
import { toSentenceCase } from '@/lib/utils';

interface Holiday {
  id: number;
  name: string;
  date: string;
  description: string;
}

export default function EmployeeHolidays() {
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedHoliday, setSelectedHoliday] = useState<Holiday | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchHolidays = async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/holidays');
      // Sort by date descending to show recent/upcoming first
      const sorted = res.data.sort((a: Holiday, b: Holiday) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      setHolidays(sorted);
    } catch (error) {
      toast.error('Failed to sync institutional schedule');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHolidays();
  }, []);

  const years = Array.from(new Set(holidays.map(h => new Date(h.date).getFullYear().toString()))).sort((a, b) => b.localeCompare(a));

  const filteredHolidays = holidays.filter(h => {
    const hDate = new Date(h.date);
    const matchesMonth = selectedMonth === 'all' || hDate.getMonth().toString() === selectedMonth;
    const matchesYear = selectedYear === 'all' || hDate.getFullYear().toString() === selectedYear;

    return matchesMonth && matchesYear;
  });

  const upcomingHolidays = filteredHolidays.filter(h => new Date(h.date) >= new Date(new Date().setHours(0,0,0,0)));
  const pastHolidays = filteredHolidays.filter(h => new Date(h.date) < new Date(new Date().setHours(0,0,0,0)));

  const HolidayCard = ({ holiday }: { holiday: Holiday }) => {
    const isUpcoming = new Date(holiday.date) >= new Date(new Date().setHours(0,0,0,0));
    
    return (
      <div 
        onClick={() => {
          setSelectedHoliday(holiday);
          setIsModalOpen(true);
        }}
        className="bg-white border border-slate-100 rounded-3xl p-6 hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer group"
      >
        <div className="flex items-center justify-between mb-4">
          <div className={`w-12 h-12 rounded-2xl flex flex-col items-center justify-center border ${
            isUpcoming 
              ? 'bg-slate-900 text-white border-slate-900' 
              : 'bg-slate-50 text-slate-400 border-slate-100'
          }`}>
            <span className="text-[10px] font-black tracking-tighter leading-none opacity-60 mb-0.5">
              {new Date(holiday.date).toLocaleDateString('en-IN', { month: 'short' })}
            </span>
            <span className="text-lg font-black leading-none">
              {new Date(holiday.date).getDate()}
            </span>
          </div>
          {isUpcoming && (
            <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[10px] font-black tracking-widest uppercase">
              Upcoming
            </span>
          )}
        </div>
        
        <h3 className="font-black text-slate-900 tracking-tighter text-lg mb-1 group-hover:text-blue-600 transition-colors">
          {toSentenceCase(holiday.name)}
        </h3>
        <p className="text-xs text-slate-400 font-medium line-clamp-2 mb-4 leading-relaxed">
          {holiday.description || 'Institutional holiday observed across all departments.'}
        </p>
        
        <div className="flex items-center justify-between pt-4 border-t border-slate-50">
          <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 tracking-widest">
            <Clock className="w-3 h-3" />
            {new Date(holiday.date).getFullYear()}
          </div>
          <ChevronRight className="w-4 h-4 text-slate-300 group-hover:translate-x-1 transition-transform" />
        </div>
      </div>
    );
  };

  return (
    <div className="p-2 space-y-8">
      <PageHeader 
        title="Institutional calendar"
        description="Unified institutional break registry."
        icon={CalendarDays}
        action={
          <div className="flex items-center gap-2">
            <div className="relative group">
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="appearance-none bg-white border border-slate-200 rounded-2xl pl-6 pr-12 py-2.5 text-sm font-bold outline-none focus:ring-2 focus:ring-slate-900 transition-all shadow-sm cursor-pointer hover:border-slate-300"
              >
                <option value="all">All Years</option>
                {years.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
              <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none rotate-90 group-hover:text-slate-900 transition-colors" />
            </div>

            <div className="relative group">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="appearance-none bg-white border border-slate-200 rounded-2xl pl-6 pr-12 py-2.5 text-sm font-bold outline-none focus:ring-2 focus:ring-slate-900 transition-all shadow-sm cursor-pointer hover:border-slate-300"
              >
                <option value="all">All Months</option>
                <option value="0">January</option>
                <option value="1">February</option>
                <option value="2">March</option>
                <option value="3">April</option>
                <option value="4">May</option>
                <option value="5">June</option>
                <option value="6">July</option>
                <option value="7">August</option>
                <option value="8">September</option>
                <option value="9">October</option>
                <option value="10">November</option>
                <option value="11">December</option>
              </select>
              <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none rotate-90 group-hover:text-slate-900 transition-colors" />
            </div>
          </div>
        }
      />

      {isLoading ? (
        <div className="py-20 text-center">
          <div className="animate-pulse font-black text-xs text-slate-300 tracking-[0.2em] uppercase">Synchronizing calendar nodes...</div>
        </div>
      ) : filteredHolidays.length === 0 ? (
        <div className="py-20 text-center bg-white rounded-[3rem] border border-slate-100">
           <CalendarDays className="w-12 h-12 text-slate-100 mx-auto mb-4" />
           <p className="text-slate-400 font-black text-xs tracking-widest uppercase">No matching holiday records found</p>
        </div>
      ) : (
        <div className="space-y-12">
          {upcomingHolidays.length > 0 && (
            <div className="space-y-6">
              <div className="flex items-center gap-4 px-2">
                <h2 className="text-xs font-black text-slate-400 tracking-[0.2em] uppercase">Upcoming breaks</h2>
                <div className="h-px flex-1 bg-slate-100"></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {upcomingHolidays.map(h => <HolidayCard key={h.id} holiday={h} />)}
              </div>
            </div>
          )}

          {pastHolidays.length > 0 && (
            <div className="space-y-6">
              <div className="flex items-center gap-4 px-2">
                <h2 className="text-xs font-black text-slate-400 tracking-[0.2em] uppercase">Holiday history</h2>
                <div className="h-px flex-1 bg-slate-100"></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {pastHolidays.map(h => <HolidayCard key={h.id} holiday={h} />)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Holiday Detail Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Institutional Holiday Detail">
        {selectedHoliday && (
          <div className="space-y-6">
            <div className="flex justify-between items-center bg-slate-50 -mx-6 -mt-6 p-8 border-b border-slate-200">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-slate-900 text-white flex flex-col items-center justify-center shadow-xl shadow-slate-900/20">
                  <span className="text-[10px] font-black tracking-tighter leading-none opacity-60 mb-0.5">
                    {new Date(selectedHoliday.date).toLocaleDateString('en-IN', { month: 'short' })}
                  </span>
                  <span className="text-xl font-black leading-none">
                    {new Date(selectedHoliday.date).getDate()}
                  </span>
                </div>
                <div>
                  <h4 className="text-xl font-black text-slate-900 tracking-tight">{toSentenceCase(selectedHoliday.name)}</h4>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-[10px] font-black tracking-widest uppercase">
                      Certified
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      Node #{selectedHoliday.id}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
                <div className="text-[10px] font-black text-slate-400 tracking-widest uppercase mb-4 flex items-center gap-2">
                   <div className="w-1 h-1 rounded-full bg-blue-500"></div>
                   Administrative Context
                </div>
                <p className="text-slate-700 text-sm font-medium leading-relaxed">
                  {selectedHoliday.description || "Institutional holiday observed across all departments. All core operations suspended for the duration of this certified break."}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-5 rounded-3xl border border-slate-100 bg-slate-50">
                  <div className="text-[10px] font-black text-slate-400 tracking-widest uppercase mb-3">Calendar Date</div>
                  <div className="flex items-center text-sm text-slate-900 font-black">
                    <Clock className="w-4 h-4 mr-2 text-blue-500" />
                    {new Date(selectedHoliday.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}
                  </div>
                </div>

                <div className="p-5 rounded-3xl border border-slate-100 bg-slate-50">
                  <div className="text-[10px] font-black text-slate-400 tracking-widest uppercase mb-3">Institutional Scope</div>
                  <div className="flex items-center text-sm text-slate-900 font-black">
                    <MapPin className="w-4 h-4 mr-2 text-emerald-500" />
                    All Departments
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-slate-100 flex justify-end">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="px-10 py-3 bg-slate-900 text-white rounded-2xl text-xs font-black tracking-[0.2em] uppercase hover:bg-slate-800 transition-all active:scale-95 shadow-xl shadow-slate-900/20"
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
