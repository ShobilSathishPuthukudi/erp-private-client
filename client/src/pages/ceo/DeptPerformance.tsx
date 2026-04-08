import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import { TrendingUp, TrendingDown, Target, Clock, Zap, Building2 } from 'lucide-react';

interface DeptPerformanceData {
  id: number;
  name: string;
  type: string;
  kpiScore: number;
  slaCompliance: number;
  leaveUtil: number;
  revAchievement: number;
  trend: 'up' | 'down';
}

export default function DeptPerformance() {
  const [data, setData] = useState<DeptPerformanceData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPerformance();
  }, []);

  const fetchPerformance = async () => {
    try {
      const res = await api.get('/ceo/performance');
      setData(res.data);
    } catch (error) {
      toast.error('Failed to load performance metrics');
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-600 bg-emerald-50 border-emerald-100';
    if (score >= 60) return 'text-amber-600 bg-amber-50 border-amber-100';
    return 'text-red-600 bg-red-50 border-red-100';
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-[32px] border border-slate-100 shadow-xl shadow-slate-200/40 overflow-hidden">
      <div className="px-10 py-8 border-b border-slate-50 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">Departmental Benchmarking</h2>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">SLA Compliance • Revenue Targets • Resource Efficiency</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-xl border border-slate-100">
          <Target className="w-4 h-4 text-slate-400" />
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Global Target: 85%</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/50">
              <th className="px-10 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Division</th>
              <th className="px-10 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">KPI Score</th>
              <th className="px-10 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">SLA Compliance</th>
              <th className="px-10 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Efficiency</th>
              <th className="px-10 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Revenue</th>
              <th className="px-10 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Trend</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {data.map((dept) => (
              <tr key={dept.id} className="group hover:bg-slate-50/50 transition-colors cursor-pointer">
                <td className="px-10 py-6">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 group-hover:bg-white group-hover:shadow-sm border border-transparent group-hover:border-slate-100 transition-all">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-sm font-black text-slate-900">{dept.name}</div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{dept.type}</div>
                    </div>
                  </div>
                </td>
                <td className="px-10 py-6 text-center">
                  <span className={`inline-flex items-center justify-center w-12 h-12 rounded-2xl border font-black text-sm ${getScoreColor(dept.kpiScore)}`}>
                    {dept.kpiScore}
                  </span>
                </td>
                <td className="px-10 py-6">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${dept.slaCompliance >= 85 ? 'bg-emerald-500' : 'bg-amber-500'}`} 
                        style={{ width: `${dept.slaCompliance}%` }} 
                      />
                    </div>
                    <span className="text-xs font-black text-slate-700 w-8">{dept.slaCompliance}%</span>
                  </div>
                </td>
                <td className="px-10 py-6">
                  <div className="flex items-center gap-2 text-slate-600">
                    <Clock className="w-3.5 h-3.5" />
                    <span className="text-xs font-bold">{dept.leaveUtil}% Util</span>
                  </div>
                </td>
                <td className="px-10 py-6">
                   <div className="flex items-center gap-2 text-slate-600">
                    <Zap className="w-3.5 h-3.5" />
                    <span className="text-xs font-bold">{dept.revAchievement}% Achv</span>
                  </div>
                </td>
                <td className="px-10 py-6 text-right">
                  <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-slate-100 shadow-sm">
                    {dept.trend === 'up' ? (
                      <>
                        <TrendingUp className="w-3 h-3 text-emerald-500" />
                        <span className="text-[10px] font-black text-emerald-600">+4%</span>
                      </>
                    ) : (
                      <>
                        <TrendingDown className="w-3 h-3 text-red-500" />
                        <span className="text-[10px] font-black text-red-600">-2%</span>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
