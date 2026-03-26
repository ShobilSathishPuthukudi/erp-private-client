import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Target, TrendingUp, Users, DollarSign, Award } from 'lucide-react';

interface AchievementData {
  target: {
    metric: string;
    value: number;
    startDate: string;
    endDate: string;
  };
  current: number;
  percentage: number;
}

export default function SalesAchievement() {
  const [achievements, setAchievements] = useState<AchievementData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAchievement();
  }, []);

  const fetchAchievement = async () => {
    try {
      const res = await api.get('/targets/my-targets');
      // For each target, fetch actual achievement
      const detailed = await Promise.all(res.data.map(async (t: any) => {
        const ach = await api.get(`/targets/achievement/${t.id}`);
        return ach.data;
      }));
      setAchievements(detailed);
    } catch (error) {
      console.error('Failed to load achievement telemetry');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (percentage: number) => {
    if (percentage < 50) return 'bg-rose-100 text-rose-700 border-rose-200';
    if (percentage < 80) return 'bg-amber-100 text-amber-700 border-amber-200';
    return 'bg-emerald-100 text-emerald-700 border-emerald-200';
  };

  const getMetricIcon = (metric: string) => {
    switch (metric) {
      case 'revenue': return <DollarSign className="w-5 h-5" />;
      case 'enrollment': return <Users className="w-5 h-5" />;
      case 'conversion_rate': return <TrendingUp className="w-5 h-5" />;
      default: return <Target className="w-5 h-5" />;
    }
  };

  if (loading) return <div className="animate-pulse h-64 bg-slate-50 rounded-2xl" />;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {achievements.map((ach, idx) => (
        <div key={idx} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <div className={`p-2 rounded-xl ${getStatusColor(ach.percentage).split(' ').slice(0, 2).join(' ')}`}>
              {getMetricIcon(ach.target.metric)}
            </div>
            <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-full border ${getStatusColor(ach.percentage)}`}>
              {ach.target.metric.replace('_', ' ')}
            </span>
          </div>
          
          <div className="space-y-1">
            <p className="text-3xl font-black text-slate-900">
              {ach.target.metric === 'revenue' ? `₹${ach.current.toLocaleString()}` : ach.current}
            </p>
            <p className="text-xs text-slate-500 font-medium tracking-tight">
              Target: {ach.target.metric === 'revenue' ? `₹${ach.target.value.toLocaleString()}` : ach.target.value}
            </p>
          </div>

          <div className="mt-6 space-y-2">
            <div className="flex justify-between text-xs font-bold text-slate-700">
              <span>Progress</span>
              <span>{ach.percentage.toFixed(1)}%</span>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-1000 ${
                  ach.percentage < 50 ? 'bg-rose-500' : ach.percentage < 80 ? 'bg-amber-500' : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.min(ach.percentage, 100)}%` }}
              />
            </div>
          </div>
        </div>
      ))}

      {achievements.length === 0 && (
        <div className="col-span-full bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-12 text-center">
          <Award className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-900">No Active Targets</h3>
          <p className="text-slate-500 max-w-xs mx-auto text-sm mt-1">
            Finance has not assigned any institutional goals for your profile yet.
          </p>
        </div>
      )}
    </div>
  );
}
