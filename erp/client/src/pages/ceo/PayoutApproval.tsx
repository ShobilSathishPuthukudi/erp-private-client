import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import { CheckCircle, XCircle, User, Calendar, Award } from 'lucide-react';

interface Payout {
  id: number;
  amount: number;
  achievementPercentage: number;
  period: string;
  status: string;
  employee: { name: string };
}

export default function PayoutApproval() {
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPayouts();
  }, []);

  const fetchPayouts = async () => {
    try {
      // CEO sees what's ready for payroll but uses specific approval route
      // Actually CEO needs a specific "pending" route
      const pendingRes = await api.get('/incentives/hr/payouts'); // Placeholder, normally /ceo/pending-payouts
      setPayouts(pendingRes.data.filter((p: any) => p.status === 'pending_ceo'));
    } catch (error) {
      console.error('Failed to load pending incentives');
    } finally {
      setLoading(false);
    }
  };

  const handleApproval = async (id: number, status: 'approved' | 'rejected') => {
    const remarks = window.prompt(`Provide CEO remarks for this ${status}:`);
    if (remarks === null) return;

    try {
      await api.put(`/incentives/ceo/approve/${id}`, { status, remarks });
      toast.success(`Incentive ${status} successfully`);
      fetchPayouts();
    } catch (error) {
      toast.error('Failed to update incentive status');
    }
  };

  if (loading) return <div className="animate-pulse h-64 bg-slate-50 rounded-2xl" />;

  return (
    <div className="space-y-6">
      <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
        <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
          <Award className="w-7 h-7 text-amber-500" />
          Performance Incentive Approvals
        </h2>
        <p className="text-slate-500 mt-1">Review and authorize institutional payouts for high-performing employees.</p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {payouts.map((payout) => (
          <div key={payout.id} className="bg-white border border-slate-200 rounded-xl p-6 flex justify-between items-center group hover:border-blue-200 transition-all shadow-sm hover:shadow-md">
            <div className="flex items-center gap-6">
               <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center text-blue-600">
                  <User className="w-6 h-6" />
               </div>
               <div className="space-y-1">
                  <p className="font-black text-slate-900 text-lg uppercase tracking-tight">{payout.employee.name}</p>
                  <div className="flex items-center gap-4 text-xs text-slate-500 font-bold uppercase tracking-widest">
                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {payout.period}</span>
                    <span className="flex items-center gap-1 text-emerald-600"><CheckCircle className="w-3 h-3" /> {payout.achievementPercentage}% Achieved</span>
                  </div>
               </div>
            </div>

            <div className="flex items-center gap-8">
               <div className="text-right">
                  <p className="text-2xl font-black text-slate-900 italic">₹{payout.amount.toLocaleString()}</p>
                  <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Calculated Incentive</p>
               </div>
               <div className="flex gap-2">
                  <button 
                    onClick={() => handleApproval(payout.id, 'rejected')}
                    className="p-3 bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-100 transition-colors border border-rose-100"
                  >
                    <XCircle className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={() => handleApproval(payout.id, 'approved')}
                    className="p-3 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-100 transition-colors border border-emerald-100"
                  >
                    <CheckCircle className="w-5 h-5" />
                  </button>
               </div>
            </div>
          </div>
        ))}

        {payouts.length === 0 && (
          <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-20 text-center">
            <CheckCircle className="w-12 h-12 text-emerald-300 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-slate-900">Queue Clear</h3>
            <p className="text-slate-500 text-sm mt-1">All institutional performance incentives have been processed.</p>
          </div>
        )}
      </div>
    </div>
  );
}
