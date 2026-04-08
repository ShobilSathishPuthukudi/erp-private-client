import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Target, TrendingUp, Users, DollarSign, Award, CheckCircle2 } from 'lucide-react';

interface AchievementData {
  target: {
    id: number;
    metric: string;
    value: number;
    startDate: string;
    endDate: string;
    rules?: {
      structure: { achievement: number, reward: number }[];
    }
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

  const calculateIncentive = (ach: AchievementData) => {
    const rules = ach.target.rules?.structure || [];
    if (rules.length === 0) return 0;
    
    // Sort rules by achievement required
    const sortedRules = [...rules].sort((a, b) => b.achievement - a.achievement);
    const applicableRule = sortedRules.find(r => ach.percentage >= r.achievement);
    
    return applicableRule ? applicableRule.reward : 0;
  };

  const getStatusColor = (percentage: number) => {
    if (percentage < 50) return 'bg-rose-50 text-rose-600 border-rose-100';
    if (percentage < 80) return 'bg-amber-50 text-amber-600 border-amber-100';
    if (percentage < 100) return 'bg-blue-50 text-blue-600 border-blue-100';
    return 'bg-emerald-50 text-emerald-600 border-emerald-100';
  };

  const getMetricIcon = (metric: string) => {
    switch (metric) {
      case 'revenue': return <DollarSign className="w-5 h-5" />;
      case 'enrollment': return <Users className="w-5 h-5" />;
      case 'conversion_rate': return <TrendingUp className="w-5 h-5" />;
      default: return <Target className="w-5 h-5" />;
    }
  };

  if (loading) return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
       {[1,2,3].map(i => <div key={i} className="animate-pulse h-64 bg-slate-50 rounded-[2rem] border-2 border-slate-100" />)}
    </div>
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {achievements.map((ach, idx) => {
        const reward = calculateIncentive(ach);
        return (
          <div key={idx} className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm hover:shadow-xl transition-all group">
            <div className="flex justify-between items-start mb-6">
              <div className={`p-4 rounded-2xl ${getStatusColor(ach.percentage).split(' ').slice(0, 2).join(' ')} group-hover:scale-110 transition-transform`}>
                {getMetricIcon(ach.target.metric)}
              </div>
              <div className="text-right">
                <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border ${getStatusColor(ach.percentage)}`}>
                  {ach.target.metric.replace('_', ' ')}
                </span>
                <p className="text-[10px] font-bold text-slate-400 mt-2 uppercase tracking-tight">Period: {new Date(ach.target.startDate).toLocaleDateString()}</p>
              </div>
            </div>
            
            <div className="space-y-1">
              <div className="flex items-baseline gap-2">
                <p className="text-4xl font-black text-slate-900 tracking-tighter italic">
                  {ach.target.metric === 'revenue' ? `₹${(ach.current || 0).toLocaleString()}` : (ach.current || 0)}
                </p>
                {ach.percentage >= 100 && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
              </div>
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">
                Quota: {ach.target.metric === 'revenue' ? `₹${(ach.target.value || 0).toLocaleString()}` : (ach.target.value || 0)}
              </p>
            </div>

            <div className="mt-8 space-y-4">
              <div className="h-3 bg-slate-100 rounded-full overflow-hidden p-0.5">
                <div 
                  className={`h-full rounded-full transition-all duration-1000 shadow-sm ${
                    ach.percentage < 50 ? 'bg-rose-500' : ach.percentage < 80 ? 'bg-amber-500' : ach.percentage < 100 ? 'bg-blue-500' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${Math.min(ach.percentage, 100)}%` }}
                />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Achieved {(ach.percentage || 0).toFixed(1)}%</span>
                {reward > 0 && (
                  <div className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-lg flex items-center gap-1.5">
                    <Award className="w-3 h-3" />
                    <span className="text-[10px] font-black uppercase tracking-widest">₹{(reward || 0).toLocaleString()} Est. Payout</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}

    </div>
  );
}
