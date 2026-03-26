import { TrendingUp, TrendingDown, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { clsx } from 'clsx';

interface Props {
  id: string;
  label: string;
  value: string | number;
  trend: number[];
  status: 'red' | 'amber' | 'green';
  onClick: () => void;
}

export default function DashboardMetricCard({ label, value, trend, status, onClick }: Props) {
  const isUp = trend[trend.length - 1] > trend[0];

  const colors = {
    red: 'bg-rose-50 text-rose-600 border-rose-100',
    amber: 'bg-amber-50 text-amber-600 border-amber-100',
    green: 'bg-emerald-50 text-emerald-600 border-emerald-100'
  };

  return (
    <div 
      onClick={onClick}
      className={clsx(
        "bg-white p-8 border border-slate-200 rounded-[32px] shadow-sm hover:border-blue-400 cursor-pointer transition-all group relative overflow-hidden",
      )}
    >
       <div className="flex justify-between items-start mb-6">
          <div>
             <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">{label}</p>
             <h3 className="text-3xl font-black text-slate-900 tracking-tighter italic">{value}</h3>
          </div>
          <div className={clsx("px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest flex items-center gap-1", colors[status])}>
             {status === 'red' && <AlertCircle className="w-3 h-3" />}
             {status === 'amber' && <Clock className="w-3 h-3" />}
             {status === 'green' && <CheckCircle className="w-3 h-3" />}
             {status}
          </div>
       </div>

       <div className="flex items-end justify-between gap-4 mt-auto">
          <div className="flex-1 flex items-end gap-[2px] h-8">
             {trend.map((v, i) => (
               <div 
                  key={i} 
                  className={clsx(
                    "flex-1 rounded-t-[1px]",
                    isUp ? "bg-emerald-400/30" : "bg-rose-400/30",
                    i === trend.length - 1 && (isUp ? "bg-emerald-500" : "bg-rose-500")
                  )}
                  style={{ height: `${(v / Math.max(...trend)) * 100}%` }}
               />
             ))}
          </div>
          <div className={clsx("flex items-center gap-1 text-[10px] font-black italic", isUp ? "text-emerald-500" : "text-rose-500")}>
             {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
             {Math.abs(Math.round(((trend[trend.length-1] - trend[0]) / trend[0]) * 100))}%
          </div>
       </div>
    </div>
  );
}
