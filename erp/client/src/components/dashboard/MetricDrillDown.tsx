import { X, Download, Search } from 'lucide-react';
import { createPortal } from 'react-dom';
import { clsx } from 'clsx';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  metricLabel: string;
  data: any[];
}

export default function MetricDrillDown({ isOpen, onClose, metricLabel, data }: Props) {
  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] overflow-hidden">
       <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={onClose} />
       
       <div className={clsx(
          "absolute inset-y-0 right-0 max-w-2xl w-full bg-white shadow-2xl transition-transform duration-500 transform ease-in-out",
          isOpen ? "translate-x-0" : "translate-x-full"
       )}>
          <div className="h-full flex flex-col">
             <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div>
                   <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Forensic Deep-Dive</p>
                   <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">{metricLabel}</h2>
                </div>
                <button 
                  onClick={onClose}
                  className="p-3 bg-white border border-slate-200 rounded-2xl hover:bg-slate-50 transition-all shadow-sm"
                >
                   <X className="w-6 h-6 text-slate-600" />
                </button>
             </div>

             <div className="p-8 border-b border-slate-100 flex gap-4">
                <div className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 flex items-center gap-3">
                   <Search className="w-4 h-4 text-slate-400" />
                   <input type="text" placeholder="Search entries..." className="bg-transparent border-none focus:ring-0 text-xs font-bold" />
                </div>
                <button className="bg-slate-900 text-white px-6 py-3 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-800 transition-all flex items-center gap-2">
                   <Download className="w-4 h-4" /> Export CSV
                </button>
             </div>

             <div className="flex-1 overflow-y-auto p-0">
                <table className="w-full text-left border-collapse">
                   <thead className="sticky top-0 bg-white shadow-sm z-10">
                      <tr>
                         <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">Subject Engine</th>
                         <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">Forensic Value</th>
                         <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">Status</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-50">
                      {data.map((item, i) => (
                        <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                           <td className="p-6">
                              <p className="font-black text-slate-900 uppercase text-xs tracking-tight">{item.subject}</p>
                              <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">{item.category}</p>
                           </td>
                           <td className="p-6 font-mono text-xs font-bold text-slate-600">{item.value}</td>
                           <td className="p-6">
                              <span className={clsx(
                                "text-[9px] font-black uppercase px-2 py-1 rounded",
                                item.status === 'success' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                              )}>
                                {item.status}
                              </span>
                           </td>
                        </tr>
                      ))}
                   </tbody>
                </table>
             </div>
          </div>
       </div>
    </div>,
    document.body
  );
}
