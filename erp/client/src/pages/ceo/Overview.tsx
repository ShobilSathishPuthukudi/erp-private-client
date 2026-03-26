import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import { Users, IndianRupee, Building2, BookOpen, MapPin, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

interface Metrics {
  totalStudents: number;
  totalUniversities: number;
  totalPrograms: number;
  totalFundAcquired: number;
  revenueMTD: number;
  revenueYTD: number;
  activeCenters: number;
  enrollmentTrend: any[];
  revenueTrend: any[];
}

export default function Overview({ view }: { view: 'kpis' | 'trends' }) {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMetrics();
  }, []);

  const fetchMetrics = async () => {
    try {
      const res = await api.get('/ceo/metrics');
      setMetrics(res.data);
    } catch (error) {
      toast.error('Failed to load global metrics');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (current: number, target: number) => {
    const ratio = current / target;
    if (ratio >= 1) return 'emerald';
    if (ratio >= 0.8) return 'amber';
    return 'red';
  };

  const KPIStore = [
    { title: 'Total Universities', value: metrics?.totalUniversities || 0, icon: Building2, target: 5, suffix: '', color: 'slate' },
    { title: 'Total Programs', value: metrics?.totalPrograms || 0, icon: BookOpen, target: 50, suffix: '', color: 'slate' },
    { title: 'Enrolled Students', value: metrics?.totalStudents || 0, icon: Users, target: 1000, suffix: '', color: getStatusColor(metrics?.totalStudents || 0, 1000) },
    { title: 'Fees Collected (MTD)', value: metrics?.revenueMTD || 0, icon: IndianRupee, target: 500000, suffix: '₹', color: getStatusColor(metrics?.revenueMTD || 0, 500000) },
    { title: 'Fees Collected (YTD)', value: metrics?.revenueYTD || 0, icon: IndianRupee, target: 5000000, suffix: '₹', color: getStatusColor(metrics?.revenueYTD || 0, 5000000) },
    { title: 'Total Fund Acquired', value: metrics?.totalFundAcquired || 0, icon: IndianRupee, target: 10000000, suffix: '₹', color: 'indigo' },
    { title: 'Active Study Centers', value: metrics?.activeCenters || 0, icon: MapPin, target: 20, suffix: '', color: getStatusColor(metrics?.activeCenters || 0, 20) },
  ];

  if (loading || !metrics) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  if (view === 'kpis') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {KPIStore.map((kpi, idx) => (
          <div key={idx} className={`bg-white p-7 rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/40 relative overflow-hidden group hover:-translate-y-1 transition-all duration-300`}>
            <div className={`absolute top-0 right-0 w-24 h-24 bg-${kpi.color}-50 rounded-bl-[80px] -z-0 transition-transform group-hover:scale-110`}></div>
            
            <div className="relative z-10">
              <div className={`w-12 h-12 rounded-2xl bg-white border border-slate-100 shadow-sm flex items-center justify-center mb-6 text-${kpi.color}-600`}>
                <kpi.icon className="w-6 h-6" />
              </div>
              
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.15em] mb-1">{kpi.title}</p>
              <h3 className="text-3xl font-black text-slate-900 tracking-tight">
                {kpi.suffix}{kpi.value.toLocaleString()}
              </h3>
              
              <div className="mt-6 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  {kpi.color === 'emerald' && <TrendingUp className="w-4 h-4 text-emerald-500" />}
                  {kpi.color === 'amber' && <Minus className="w-4 h-4 text-amber-500" />}
                  {kpi.color === 'red' && <TrendingDown className="w-4 h-4 text-red-500" />}
                  <span className={`text-[10px] font-black uppercase tracking-wider text-${kpi.color}-600`}>
                    {kpi.color === 'slate' ? 'Global Stat' : (kpi.color === 'emerald' ? 'On Track' : kpi.color === 'amber' ? 'Off Target' : 'Critical')}
                  </span>
                </div>
                <div className="text-[10px] font-bold text-slate-300">Goal: {kpi.suffix}{kpi.target.toLocaleString()}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Trends Controls */}
      <div className="flex items-center justify-between bg-white px-6 py-4 rounded-2xl border border-slate-100 shadow-sm">
        <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Growth Analytics</h3>
        <div className="flex items-center gap-3">
          {['3 Months', '6 Months', '12 Months'].map(range => (
            <button key={range} className="px-4 py-1.5 rounded-full bg-slate-50 text-[10px] font-bold text-slate-500 hover:bg-slate-900 hover:text-white transition-all capitalize">
              {range}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Enrollment Trend */}
        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/40">
          <div className="mb-8">
             <h4 className="text-lg font-black text-slate-900">Enrollment Trajectory</h4>
             <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Direct Student Acquisition • 12 Months</p>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={metrics.enrollmentTrend}>
                <defs>
                  <linearGradient id="colorEnrolls" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0f172a" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#0f172a" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }} />
                <Area type="monotone" dataKey="students" stroke="#0f172a" strokeWidth={4} fillOpacity={1} fill="url(#colorEnrolls)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Revenue Trend */}
        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/40">
           <div className="mb-8">
             <h4 className="text-lg font-black text-slate-900">Revenue Performance</h4>
             <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Verified Fee Collections • INR (₹)</p>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metrics.revenueTrend}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }} />
                <Bar dataKey="revenue" fill="#0f172a" radius={[6, 6, 0, 0]} barSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
