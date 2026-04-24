import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Calendar, CheckCircle2, Circle, Clock } from 'lucide-react';

interface EMI {
    id: number;
    installmentNo: number;
    amount: string;
    dueDate: string;
    status: 'pending' | 'paid' | 'overdue';
    remarks: string;
}

export default function EMISchedule({ studentId }: { studentId: number | string }) {
    const [emis, setEmis] = useState<EMI[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchEmis = async () => {
            try {
                const res = await api.get(`/finance/students/${studentId}/emis`);
                setEmis(res.data);
            } catch (err) {
                console.error('Failed to sync payment schedule');
            } finally {
                setLoading(false);
            }
        };
        fetchEmis();
    }, [studentId]);

    if (loading) return <div className="animate-pulse bg-slate-50 h-64 rounded-3xl border border-slate-100" />;
    if (emis.length === 0) return null;

    return (
        <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm flex flex-col">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-slate-400" />
                    <span className="font-black text-slate-900 uppercase tracking-widest text-sm">Institutional Payment Schedule</span>
                </div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">12-Month Structure</span>
            </div>
            
            <div className="p-0 overflow-auto max-h-[400px]">
                <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 bg-white z-10">
                        <tr className="border-b border-slate-100">
                            <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Inst. #</th>
                            <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Due Date</th>
                            <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Amount</th>
                            <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {emis.map((emi) => (
                            <tr key={emi.id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="px-6 py-4 font-mono font-bold text-slate-900 text-xs">
                                    {emi.installmentNo.toString().padStart(2, '0')}
                                </td>
                                <td className="px-6 py-4 text-xs font-medium text-slate-600">
                                    {new Date(emi.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                </td>
                                <td className="px-6 py-4 text-xs font-black text-slate-900 tracking-tighter">
                                    ₹{parseFloat(emi.amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex items-center justify-end gap-4">
                                        <div className="flex flex-col items-end">
                                            <span className={`text-[9px] font-black uppercase tracking-widest ${
                                                emi.status === 'paid' ? 'text-emerald-600' : 
                                                emi.status === 'overdue' ? 'text-rose-600' : 'text-slate-400'
                                            }`}>
                                                {emi.status}
                                            </span>
                                            <p className="text-[8px] text-slate-400 uppercase font-bold tracking-tighter">
                                                {emi.status === 'paid' ? 'Institutional Verified' : 'Awaiting Collection'}
                                            </p>
                                        </div>
                                        
                                        {emi.status !== 'paid' ? (
                                            <button 
                                                onClick={async () => {
                                                    try {
                                                        await api.post(`/emis/${emi.id}/pay`);
                                                        window.location.reload(); // Refresh to sync all telemetry
                                                    } catch (err) {
                                                        console.error('Payment collection failure');
                                                    }
                                                }}
                                                className="p-2 hover:bg-emerald-50 text-slate-400 hover:text-emerald-600 rounded-xl transition-all border border-transparent hover:border-emerald-100 group"
                                                title="Collect Payment"
                                            >
                                                <CheckCircle2 className="w-4 h-4 group-hover:scale-110 transition-transform" />
                                            </button>
                                        ) : (
                                            <div className="p-2 bg-emerald-50 rounded-xl border border-emerald-100">
                                                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                            </div>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            
            <div className="p-4 bg-slate-50 border-t border-slate-100">
                <p className="text-[9px] text-slate-400 font-medium leading-relaxed text-center">
                    Note: Subsequent installments are automatically invoiced 7 days prior to their forensic due date.
                </p>
            </div>
        </div>
    );
}
