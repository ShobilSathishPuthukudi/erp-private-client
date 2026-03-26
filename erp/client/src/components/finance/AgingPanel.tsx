import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { AlertCircle, Clock } from 'lucide-react';

interface AgingData {
  current: number;
  days30: number;
  days60: number;
  days90Plus: number;
  totalPending: number;
}

export default function AgingPanel({ type, id }: { type: 'student' | 'center', id: number | string }) {
  const [data, setData] = useState<AgingData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAging = async () => {
      try {
        const res = await api.get(`/finance/aging/${type}/${id}`);
        setData(res.data);
      } catch (error) {
        console.error('Aging data sync failure');
      } finally {
        setLoading(false);
      }
    };
    fetchAging();
  }, [type, id]);

  if (loading) return <div className="animate-pulse bg-slate-50 h-32 rounded-3xl border border-slate-100" />;
  if (!data) return null;

  const getPercent = (val: number) => (data.totalPending > 0 ? (val / data.totalPending) * 100 : 0);

  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
        <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-900 rounded-xl">
                    <Clock className="w-4 h-4 text-white" />
                </div>
                <div>
                   <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest leading-none">Receivables Aging</h3>
                   <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-tighter">Verified Audit Telemetry</p>
                </div>
            </div>
            <div className="text-right">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Grand Total Pending</p>
                <p className="text-xl font-black text-slate-900 tracking-tighter">₹{data.totalPending.toLocaleString('en-IN')}</p>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <AgingBucket label="Current" amount={data.current} color="bg-emerald-500" percent={getPercent(data.current)} />
            <AgingBucket label="30 Days" amount={data.days30} color="bg-amber-500" percent={getPercent(data.days30)} />
            <AgingBucket label="60 Days" amount={data.days60} color="bg-orange-600" percent={getPercent(data.days60)} />
            <AgingBucket label="90+ Days" amount={data.days90Plus} color="bg-red-600" percent={getPercent(data.days90Plus)} />
        </div>

        {data.days90Plus > 0 && (
            <div className="mt-6 p-3 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3">
                <AlertCircle className="w-4 h-4 text-red-600" />
                <p className="text-[10px] font-black text-red-900 uppercase tracking-tight">
                    Critical arrears detected in the 90+ bucket. Institutional intervention recommended.
                </p>
            </div>
        )}
    </div>
  );
}

function AgingBucket({ label, amount, color, percent }: { label: string, amount: number, color: string, percent: number }) {
    return (
        <div className="space-y-2">
            <div className="flex justify-between items-end">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{label}</span>
                <span className="text-xs font-black text-slate-900 uppercase tracking-tighter">₹{amount.toLocaleString('en-IN')}</span>
            </div>
            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div className={`h-full ${color} rounded-full transition-all duration-1000`} style={{ width: `${percent}%` }} />
            </div>
        </div>
    );
}
