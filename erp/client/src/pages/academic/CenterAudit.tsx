import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { DataTable } from '@/components/shared/DataTable';
import { Modal } from '@/components/shared/Modal';
import { 
  MapPin, 
  FileText, 
  ShieldCheck, 
  CheckCircle2, 
  XCircle,
  Clock,
  ExternalLink,
  Users
} from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import toast from 'react-hot-toast';

interface Center {
  id: number;
  name: string;
  type: string;
  loginId?: string;
  password?: string;
  status: 'active' | 'inactive';
  auditStatus: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
  infrastructureDetails?: any;
  createdAt: string;
  websiteUrl?: string;
  referringBDE?: {
    name: string;
  };
}

export default function CenterAudit() {
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [centers, setCenters] = useState<Center[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCenter, setSelectedCenter] = useState<Center | null>(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [manualLoginId, setManualLoginId] = useState('');
  const [manualPassword, setManualPassword] = useState('');
  const [selectedPrograms, setSelectedPrograms] = useState<number[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);

  const fetchCenters = async () => {
    setIsLoading(true);
    try {
      const res = await api.get(`/operations/centers/audit-list?status=${activeTab}`);
      setCenters(res.data);
    } catch (error) {
      toast.error('Failed to fetch centers for audit');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPrograms = async () => {
    try {
      const res = await api.get('/academic/programs');
      setPrograms(res.data);
    } catch (error) {
      console.error('Failed to fetch programs', error);
    }
  };

  useEffect(() => {
    fetchCenters();
    fetchPrograms();
  }, [activeTab]);

  const handleAudit = async (status: 'approved' | 'rejected') => {
    if (status === 'rejected' && !rejectionReason) {
      toast.error('Rejection reason is mandatory');
      return;
    }
    if (status === 'approved' && (!manualLoginId || !manualPassword)) {
      toast.error('Login ID and Password must be provisioned to ratify center');
      return;
    }

    try {
      await api.put(`/operations/centers/${selectedCenter?.id}/audit`, {
        status,
        reason: rejectionReason,
        loginId: manualLoginId,
        password: manualPassword,
        programIds: selectedPrograms
      });
      toast.success(`Center ${status} successfully`);
      setIsReviewModalOpen(false);
      setSelectedCenter(null);
      setRejectionReason('');
      setManualLoginId('');
      setManualPassword('');
      setSelectedPrograms([]);
      fetchCenters();
    } catch (error) {
      toast.error('Audit action failed');
    }
  };

  const columns: ColumnDef<Center>[] = [
    {
      accessorKey: 'name',
      header: 'Study Center',
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 font-bold border border-slate-200">
             {row.original.name.charAt(0)}
          </div>
          <div>
            <p className="font-bold text-slate-900">{row.original.name}</p>
            <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">{row.original.type}</p>
          </div>
        </div>
      )
    },
    {
      accessorKey: 'location',
      header: 'Location',
      cell: () => (
        <div className="flex items-center gap-2 text-slate-500 font-medium">
          <MapPin className="w-3 h-3" />
          <span>Regional Hub</span>
        </div>
      )
    },
    {
        accessorKey: 'createdAt',
        header: 'Submitted Date',
        cell: ({ row }) => (
            <div className="flex items-center gap-2 font-medium text-slate-500">
                <Clock className="w-3 h-3" />
                {new Date(row.original.createdAt).toLocaleDateString()}
            </div>
        )
    },
    {
        accessorKey: 'referringBDE.name',
        header: 'Referred By',
        cell: ({ row }) => (
            <div className="flex items-center gap-2 font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-lg w-fit">
                <Users className="w-3 h-3" />
                <span className="text-[10px] uppercase tracking-tight">{row.original.referringBDE?.name || 'Organic'}</span>
            </div>
        )
    },
    {
      id: 'actions',
      header: 'Institutional Review',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          {activeTab === 'pending' ? (
            <button 
              onClick={() => {
                setSelectedCenter(row.original);
                setIsReviewModalOpen(true);
                setRejectionReason('');
                setManualLoginId('');
                setManualPassword('');
                setSelectedPrograms([]);
              }}
              className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-indigo-600 transition-all active:scale-95 flex items-center gap-2"
            >
              <ShieldCheck className="w-3 h-3" />
              Conduct Audit
            </button>
          ) : (
            <button 
              onClick={() => {
                setSelectedCenter(row.original);
                setIsReviewModalOpen(true);
                setRejectionReason(row.original.rejectionReason || '');
                setManualLoginId(row.original.loginId || '');
                setManualPassword(row.original.password || '');
              }}
              className="px-4 py-2 bg-white text-slate-600 border border-slate-200 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-50 transition-all active:scale-95 flex items-center gap-2"
            >
              <FileText className="w-3 h-3" />
              Audit Details
            </button>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="p-8 space-y-8 max-w-[1600px] mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Center Audit System</h1>
          <p className="text-slate-500 font-medium text-sm">Validate and ratify regional study centers for academic operations.</p>
        </div>
        <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200">
           {(['pending', 'approved', 'rejected'] as const).map(tab => (
             <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
             >
                {tab}
             </button>
           ))}
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-sm">
        <DataTable 
          columns={columns} 
          data={centers} 
          isLoading={isLoading}
        />
      </div>

      <Modal
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        title={`Institutional Audit: ${selectedCenter?.name}`}
      >
        <div className="space-y-8">
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Center Type</p>
                    <p className="font-black text-slate-900 ml-1 text-sm uppercase">{selectedCenter?.type || 'Standard'}</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Website</p>
                    <a href={selectedCenter?.websiteUrl} target="_blank" className="font-bold text-blue-600 flex items-center gap-1 ml-1 text-sm">
                        Visit Portal <ExternalLink className="w-3 h-3" />
                    </a>
                </div>
            </div>

            <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 space-y-4 shadow-xl shadow-slate-900/10">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-2">
                    <ShieldCheck className="w-4 h-4 text-blue-400" />
                    Authentication Credentials
                </h4>
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-black/40 px-4 py-3 rounded-xl border border-white/5">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Center Login ID</p>
                        <input 
                          type="text"
                          value={manualLoginId}
                          onChange={(e) => setManualLoginId(e.target.value)}
                          readOnly={activeTab !== 'pending'}
                          placeholder="e.g. CTR-001"
                          className="w-full bg-transparent border-none text-blue-400 font-mono text-sm tracking-widest placeholder:text-slate-600 focus:outline-none focus:ring-0 p-0"
                        />
                    </div>
                    <div className="bg-black/40 px-4 py-3 rounded-xl border border-white/5">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Access Password</p>
                        <input 
                          type="text"
                          value={manualPassword}
                          onChange={(e) => setManualPassword(e.target.value)}
                          readOnly={activeTab !== 'pending'}
                          placeholder="••••••••"
                          className="w-full bg-transparent border-none text-amber-400 font-mono text-sm tracking-widest placeholder:text-slate-600 focus:outline-none focus:ring-0 p-0"
                        />
                    </div>
                </div>
            </div>

            <div className="bg-indigo-50 p-6 rounded-2xl border border-indigo-100 space-y-4">
                <h4 className="text-xs font-black text-indigo-400 uppercase tracking-widest flex items-center gap-2 mb-2">
                    <FileText className="w-4 h-4" />
                    Infrastructure & Compliance
                </h4>
                <div className="grid grid-cols-3 gap-4">
                    {['Premises Doc', 'Firesafety Cer.', 'Local Auth.'].map((doc, i) => (
                        <div key={i} className="bg-white px-3 py-2 rounded-xl border border-indigo-100 flex items-center gap-2">
                             <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                             <span className="text-[10px] font-bold text-slate-600">{doc}</span>
                        </div>
                    ))}
                </div>
            </div>

            {activeTab === 'pending' && (
              <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-4 shadow-sm">
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-2">
                      Program Authorization
                  </h4>
                  <div className="grid grid-cols-2 gap-3 max-h-[200px] overflow-y-auto pr-2">
                      {programs.map(prog => (
                          <label key={prog.id} className={`flex items-start gap-3 p-3 border rounded-xl cursor-pointer transition-all ${selectedPrograms.includes(prog.id) ? 'bg-indigo-50 border-indigo-200' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'}`}>
                              <input 
                                  type="checkbox" 
                                  className="mt-1"
                                  checked={selectedPrograms.includes(prog.id)}
                                  onChange={(e) => {
                                      if (e.target.checked) setSelectedPrograms(prev => [...prev, prog.id]);
                                      else setSelectedPrograms(prev => prev.filter(id => id !== prog.id));
                                  }}
                              />
                              <div>
                                  <p className="text-xs font-bold text-slate-900">{prog.name}</p>
                                  <p className="text-[10px] text-slate-500 uppercase">{prog.type}</p>
                              </div>
                          </label>
                      ))}
                  </div>
              </div>
            )}

            <div className="space-y-4">
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">
                    {activeTab === 'pending' ? 'Audit Decision Remarks' : 'Audit Remarks / Protocol History'}
                </label>
                <textarea 
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder={activeTab === 'pending' ? "Enter rejection reason if applicable..." : "No additional remarks recorded."}
                    readOnly={activeTab !== 'pending'}
                    className={`w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm font-bold outline-none transition-all min-h-[100px] text-slate-900 ${activeTab !== 'pending' ? 'opacity-70 cursor-not-allowed' : 'focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900'}`}
                />
            </div>

            {activeTab === 'pending' && (
                <div className="pt-6 border-t border-slate-100 flex justify-end gap-3">
                    <button 
                        onClick={() => handleAudit('rejected')}
                        className="px-6 py-3 text-rose-600 font-black text-xs uppercase tracking-widest hover:bg-rose-50 rounded-xl transition-all flex items-center gap-2"
                    >
                        <XCircle className="w-4 h-4" />
                        Reject Certification
                    </button>
                    <button 
                        onClick={() => handleAudit('approved')}
                        className="px-8 py-3 bg-slate-900 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/20 flex items-center gap-2 active:scale-95"
                    >
                        <CheckCircle2 className="w-4 h-4" />
                        Ratify Center
                    </button>
                </div>
            )}
            
            {activeTab !== 'pending' && (
                <div className="pt-6 border-t border-slate-100 flex justify-end">
                    <button 
                        onClick={() => setIsReviewModalOpen(false)}
                        className="px-8 py-3 bg-slate-100 text-slate-600 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all"
                    >
                        Close Registry
                    </button>
                </div>
            )}
        </div>
      </Modal>
    </div>
  );
}
