import { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { Modal } from './Modal';
import { api } from '@/lib/api';
import { 
  Users, 
  Search, 
  X, 
  Building, 
  GraduationCap, 
  DollarSign, 
  ShieldCheck, 
  Clock, 
  AlertCircle,
  FileText,
  UserCheck,
  Layers,
  ArrowRight
} from 'lucide-react';
import { toSentenceCase } from '@/lib/utils';
import { format } from 'date-fns';

interface DrillDownModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: string;
  title: string;
  primaryAction?: {
    label: string;
    link: string;
  };
}

export function DrillDownModal({ isOpen, onClose, type, title, primaryAction }: DrillDownModalProps) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (isOpen && type) {
      fetchDetails();
    }
  }, [isOpen, type]);

  const fetchDetails = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/dashboard-drilldown/drill-down/${type}`);
      setData(res.data.details || []);
    } catch (error) {
      console.error('Forensic drill-down failure:', error);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredData = data.filter(item => {
    const searchStr = searchTerm.toLowerCase();
    // Generic deep search across common fields
    return (
      (item.name?.toLowerCase().includes(searchStr)) ||
      (item.student?.name?.toLowerCase().includes(searchStr)) ||
      (item.center?.name?.toLowerCase().includes(searchStr)) ||
      (item.uid?.toLowerCase().includes(searchStr)) ||
      (item.status?.toLowerCase().includes(searchStr))
    );
  });

  const getIcon = () => {
    if (type.includes('university')) return Building;
    if (type.includes('student')) return Users;
    if (type.includes('center')) return Building;
    if (type.includes('program')) return GraduationCap;
    if (type.includes('revenue') || type.includes('fee')) return DollarSign;
    if (type.includes('lead')) return ShieldCheck;
    if (type.includes('task')) return FileText;
    if (type.includes('staff')) return UserCheck;
    if (type.includes('leave')) return Clock;
    if (type.includes('batch')) return Layers;
    return AlertCircle;
  };

  const Icon = getIcon();

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={title} 
      maxWidth="2xl"
    >
      <div className="space-y-6">
        {/* Search & Stats Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder={`Search within ${title?.toLowerCase()}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl text-sm text-slate-900 font-bold focus:border-blue-600 focus:bg-white transition-all outline-none"
            />
          </div>
          <div className="flex items-center gap-3 px-6 py-3 bg-blue-50 border border-blue-100 rounded-xl">
            <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Total Identified</span>
            <span className="text-xl font-black text-blue-900 tracking-tighter">{filteredData.length}</span>
          </div>
        </div>

        {/* Forensic Data Grid/Table */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          {loading ? (
            <div className="p-20 flex flex-col items-center justify-center space-y-4">
              <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Synchronizing Forensic Stream...</p>
            </div>
          ) : filteredData.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-900 text-white text-[10px] font-black uppercase tracking-[0.2em]">
                    <th className="px-6 py-4">Entity Information</th>
                    <th className="px-6 py-4">Status & Context</th>
                    <th className="px-6 py-4">Temporal Stamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredData.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 transition-colors group">
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors">
                            <Icon className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="font-black text-slate-900 tracking-tight uppercase">
                              {toSentenceCase(item.name || item.student?.name || item.employee?.name || 'Institutional Entity')}
                            </div>
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                              {item.uid || item.student?.uid || `#${item.id}`}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex flex-col gap-1.5">
                          <div className={`w-fit px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${
                            item.status === 'active' || item.status === 'ENROLLED' || item.status === 'verified' || item.status === 'completed'
                               ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                               : 'bg-amber-50 text-amber-600 border-amber-100'
                           }`}>
                            {item.status || 'Active Protocol'}
                          </div>
                          {item.center?.name && (
                            <div className="text-[10px] font-bold text-slate-400 flex items-center gap-1.5">
                               <Building className="w-3 h-3" />
                               {item.center.name}
                            </div>
                          )}
                          {item.amount && (
                            <div className="text-sm font-black text-slate-900">
                              ₹{parseFloat(item.amount).toLocaleString()}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-tight">
                          <Clock className="w-3.5 h-3.5" />
                          {item.createdAt ? format(new Date(item.createdAt), 'MMM dd, yyyy') : 'Forensic Record'}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-20 text-center flex flex-col items-center">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                 <AlertCircle className="w-10 h-10 text-slate-200" />
              </div>
              <h3 className="text-lg font-black text-slate-900 tracking-tight uppercase">No Identifiable Records</h3>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-2">The requested forensic stream returned an empty set for the current scope.</p>
            </div>
          )}
        </div>

        {/* Action Footer */}
        <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
          <div>
            {primaryAction && (
              <NavLink 
                to={primaryAction.link}
                className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 active:scale-[0.98]"
              >
                {primaryAction.label} <ArrowRight className="w-3.5 h-3.5" />
              </NavLink>
            )}
          </div>
          <button 
            onClick={onClose}
            className="px-6 py-2.5 bg-slate-800 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-700 transition-all active:scale-[0.98]"
          >
            Close Insight
          </button>
        </div>
      </div>
    </Modal>
  );
}
