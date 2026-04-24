import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Clock, ArrowRight } from 'lucide-react';

interface EMI {
    id: number;
    installmentNo: number;
    amount: string;
    dueDate: string;
    status: 'pending' | 'paid' | 'overdue';
}

export default function NextPaymentsPanel({ studentId }: { studentId: number | string }) {
    const [emis, setEmis] = useState<EMI[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchEmis = async () => {
            try {
                const res = await api.get(`/finance/students/${studentId}/emis`);
                setEmis(res.data.filter((e: EMI) => e.status === 'pending').slice(0, 3));
            } catch (err) {
                console.error('Failed to sync next payments');
            } finally {
                setLoading(false);
            }
        };
        fetchEmis();
    }, [studentId]);

    if (loading) return <div className="animate-pulse bg-slate-50 h-32 rounded-3xl border border-slate-100" />;
    
    return (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm h-full flex flex-col justify-between">
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-600 rounded-xl">
                        <Clock className="w-4 h-4 text-white" />
                    </div>
                    <div>
                       <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest leading-none">Next Payments</h3>
                       <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-tighter">Institutional Payment Pipeline</p>
                    </div>
                </div>
            </div>

            {emis.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {emis.map((emi, idx) => (
                        <div key={emi.id} className={`flex flex-col ${idx < emis.length - 1 ? 'md:border-r md:border-slate-100' : ''}`}>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">
                                Installment #{emi.installmentNo}
                            </p>
                            <p className="text-lg font-black text-slate-900 tracking-tighter">
                                ₹{parseFloat(emi.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </p>
                            <p className="text-[10px] font-bold text-blue-600 mt-1">
                                Due: {new Date(emi.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                            </p>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="flex-1 flex items-center justify-center py-4">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No upcoming installments scheduled</p>
                </div>
            )}
            
            <div className="mt-6 pt-4 border-t border-slate-50 flex items-center justify-between">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Auto-Billing Enabled</span>
            </div>
        </div>
    );
}
