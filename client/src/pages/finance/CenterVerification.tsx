import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '@/lib/api';
import { DataTable } from '@/components/shared/DataTable';
import { Modal } from '@/components/shared/Modal';
import { 
  ShieldCheck, 
  CheckCircle2, 
  XCircle,
  Clock,
  ExternalLink,
  Building2,
  FileText,
  AlertCircle,
  Users,
  Eye
} from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import toast from 'react-hot-toast';

interface Center {
  id: number;
  name: string;
  type: string;
  loginId?: string;
  password?: string;
  status: string;
  auditStatus: string;
  rejectionReason?: string;
  infrastructureDetails?: any;
  createdAt: string;
  websiteUrl?: string;
  shortName?: string;
  centerStatus?: string;
  description?: string;
  financeRemarks?: string;
  referringBDE?: {
    name: string;
    uid: string;
  };
  metadata?: {
    website?: string;
    primaryInterest?: {
      universityId: string;
      programIds: number[];
      programId?: string;
    };
  };
}

export default function CenterVerification() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = (searchParams.get('tab') as 'pending' | 'approved' | 'rejected') || 'pending';
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'rejected'>(initialTab);
  const [centers, setCenters] = useState<Center[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCenter, setSelectedCenter] = useState<Center | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [remarks, setRemarks] = useState('');
  const [programs, setPrograms] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [triedSubmit, setTriedSubmit] = useState(false);
  const [selectedPrograms, setSelectedPrograms] = useState<number[]>([]);

  const isReadOnly = useMemo(() => activeTab !== 'pending', [activeTab]);

  const fetchCenters = async () => {
    setIsLoading(true);
    try {
      const res = await api.get(`/finance/approvals/centers?status=${activeTab}`);
      setCenters(res.data);
    } catch (error) {
      toast.error('Failed to fetch center verification queue');
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

  const handleVerify = async (status: 'approved' | 'rejected') => {
    setTriedSubmit(true);
    if (!remarks || remarks.trim().length < 12) {
      toast.error('Audit remarks (min 12 chars) mandatory for ratification');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.put(`/finance/centers/${selectedCenter?.id}/verify-audit`, {
        status,
        remarks
      });
      
      if (status === 'approved' && res.data.credentials) {
        toast.success(
          (t) => (
            <div className="flex flex-col gap-1">
              <p className="font-bold">Center Activated Successfully!</p>
              <div className="bg-slate-900 border border-white/10 p-3 rounded-lg mt-1 space-y-1">
                <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">Credentials Provisioned:</p>
                <p className="text-xs font-mono text-emerald-400">ID: {res.data.credentials.loginId}</p>
                <p className="text-xs font-mono text-amber-400">PWD: {res.data.credentials.password}</p>
              </div>
              <button 
                onClick={() => toast.dismiss(t.id)}
                className="mt-2 text-[10px] uppercase font-black text-slate-500 hover:text-slate-900"
              >
                Close & Proceed
              </button>
            </div>
          ),
          { duration: 10000, position: 'top-center' }
        );
      } else {
        toast.success(status === 'approved' ? 'Center activated successfully' : 'Ratification denied');
      }

      setIsModalOpen(false);
      setSelectedCenter(null);
      setRemarks('');
      setTriedSubmit(false);
      fetchCenters();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Verification protocol failure');
    } finally {
      setSubmitting(false);
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
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{row.original.shortName || 'CTR'}</p>
          </div>
        </div>
      )
    },
    {
      accessorKey: 'referringBDE.name',
      header: 'Attribution',
      cell: ({ row }) => (
        <div className="flex flex-col">
            <span className="text-[10px] font-black text-slate-900 uppercase tracking-tight">{row.original.referringBDE?.name || 'Organic'}</span>
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">BDE ID: {row.original.referringBDE?.uid || 'N/A'}</span>
        </div>
      )
    },
    {
        accessorKey: 'createdAt',
        header: 'Ops Validation',
        cell: ({ row }) => (
            <div className="flex items-center gap-2 font-medium text-slate-500">
                <Clock className="w-3 h-3" />
                {new Date(row.original.createdAt).toLocaleDateString()}
            </div>
        )
    },
    {
      id: 'actions',
      header: 'Ratification',
      cell: ({ row }) => (
            <button 
                onClick={() => {
                    setSelectedCenter(row.original);
                    setIsModalOpen(true);
                    setRemarks(row.original.financeRemarks || '');
                    setTriedSubmit(false);
                    
                    // Support multi-program registration architecture with legacy fallback
                    let requestedIds = row.original.metadata?.primaryInterest?.programIds || [];
                    const legacyId = row.original.metadata?.primaryInterest?.programId;
                    
                    if (legacyId && !requestedIds.includes(Number(legacyId))) {
                        requestedIds = [...requestedIds, Number(legacyId)];
                    }
                    
                    setSelectedPrograms(requestedIds);
                }}
                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all active:scale-95 flex items-center gap-2 ${
                  isReadOnly 
                  ? 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50' 
                  : 'bg-slate-900 text-white hover:bg-emerald-600'
                }`}
            >
                {isReadOnly ? <Eye className="w-3 h-3 text-blue-600" /> : <ShieldCheck className="w-3 h-3" />}
                {isReadOnly ? 'Audit Details' : 'Final Review'}
            </button>
      )
    }
  ];

  return (
    <div className="p-8 space-y-8 max-w-[1600px] mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center text-white shadow-lg shadow-slate-900/20">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Center Verification Queue</h1>
            <p className="text-slate-500 font-medium text-sm">Perform secondary financial audit and provision institutional credentials.</p>
          </div>
        </div>
        <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200">
           {(['pending', 'approved', 'rejected'] as const).map(tab => (
             <button
                key={tab}
                onClick={() => {
                  setActiveTab(tab);
                  setSearchParams({ tab });
                }}
                className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
             >
                {tab}
             </button>
           ))}
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-sm min-h-[400px]">
        <DataTable 
          columns={columns} 
          data={centers} 
          isLoading={isLoading}
        />
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={`Institutional Verification: ${selectedCenter?.name}`}
      >
        <div className="flex flex-col h-[70vh] -mx-6 -my-5">
            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
            <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-2xl flex gap-4">
                <AlertCircle className="w-6 h-6 text-emerald-600 shrink-0" />
                <div>
                    <h3 className="text-sm font-black text-emerald-900 uppercase">Operations Clearance Confirmed</h3>
                    <p className="text-xs text-emerald-700 font-medium">This center has passed infrastructure auditing. Provisioning credentials will activate the institutional portal access.</p>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Center Type</p>
                    <p className="font-black text-slate-900 ml-1 text-sm uppercase">{selectedCenter?.type || 'Standard'}</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100/50">
                    <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Institutional Website</p>
                    <a 
                      href={selectedCenter?.metadata?.website?.startsWith('http') ? selectedCenter.metadata.website : `https://${selectedCenter?.metadata?.website}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="font-black text-blue-600 flex items-center gap-1.5 ml-1 text-sm hover:underline"
                    >
                        <span className="truncate max-w-[180px]">
                          {selectedCenter?.metadata?.website?.replace(/^https?:\/\//, '') || 'Visit Portal'}
                        </span>
                        <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                    </a>
                </div>
            </div>

            <div className="bg-indigo-50 p-6 rounded-2xl border border-indigo-100 space-y-4">
                <h4 className="text-xs font-black text-indigo-400 uppercase tracking-widest flex items-center gap-2 mb-2">
                    <ShieldCheck className="w-4 h-4" />
                    Strategic Telemetry
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white px-4 py-3 rounded-xl border border-indigo-100">
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Short Name</p>
                        <p className="text-xs font-black text-slate-900">{selectedCenter?.shortName || 'N/A'}</p>
                    </div>
                    <div className="bg-white px-4 py-3 rounded-xl border border-indigo-100">
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Lifecycle Status</p>
                        <p className="text-xs font-black text-indigo-600 truncate">{selectedCenter?.centerStatus || 'VALIDATED'}</p>
                    </div>
                    <div className="bg-white px-4 py-3 rounded-xl border border-indigo-100">
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Captured By</p>
                        <div className="flex items-center gap-3">
                           <Users className="w-3 h-3 text-indigo-400" />
                           <div>
                              <p className="text-xs font-black text-slate-900">{selectedCenter?.referringBDE?.name || 'Institutional Organic'}</p>
                              {selectedCenter?.referringBDE?.uid && (
                                <p className="text-[9px] font-bold text-indigo-500 uppercase tracking-tighter leading-none mt-0.5">
                                   ID: {selectedCenter.referringBDE.uid}
                                </p>
                              )}
                           </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-4 shadow-sm">
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-2">
                    Program Authorization
                </h4>
                <div className="grid grid-cols-2 gap-3 max-h-[200px] overflow-y-auto pr-2">
                    {programs
                      .filter(prog => selectedPrograms.includes(prog.id))
                      .map(prog => (
                        <div key={prog.id} className="flex items-start gap-3 p-3 border rounded-xl bg-slate-50 border-slate-200">
                            <div className="flex-1">
                                <div className="flex items-center justify-between">
                                    <p className="text-xs font-bold text-slate-900">{prog.name}</p>
                                    <span className="text-[7px] font-black bg-emerald-600 text-white px-1.5 py-0.5 rounded-full uppercase tracking-tighter">Approved</span>
                                </div>
                                <p className="text-[10px] text-slate-500 uppercase">{prog.type}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {selectedCenter?.description && (
                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-3">
                        <FileText className="w-4 h-4 text-slate-400" />
                        Ops Audit Findings
                    </h4>
                    <p className="text-sm font-medium text-slate-600 leading-relaxed italic">
                        "{selectedCenter.description}"
                    </p>
                </div>
            )}

            <div className="space-y-4 pb-6">
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1 flex items-center gap-2">
                    {isReadOnly ? 'Historical Audit Findings (Finance)' : 'Finance Verification Remarks (Forensic Audit Ledger)'}
                    {!isReadOnly && <span className="text-[8px] bg-rose-100 text-rose-600 px-1.5 py-0.5 rounded-full">Mandatory</span>}
                </label>
                <textarea 
                    value={remarks}
                    onChange={(e) => {
                        if (isReadOnly) return;
                        setRemarks(e.target.value);
                        if (e.target.value.trim().length >= 12) setTriedSubmit(false);
                    }}
                    readOnly={isReadOnly}
                    placeholder={isReadOnly ? "No historical remarks recorded." : "Provide a detailed justification for institutional activation (min 12 chars)..."}
                    className={`w-full bg-slate-50 border rounded-xl p-4 text-sm font-bold outline-none transition-all min-h-[100px] text-slate-900 ${isReadOnly ? 'opacity-70 cursor-not-allowed' : (triedSubmit && (!remarks || remarks.trim().length < 12)) ? 'border-rose-400 bg-rose-50/30' : 'border-slate-200 focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900 shadow-sm'}`}
                />
                {!isReadOnly && triedSubmit && (!remarks || remarks.trim().length < 12) && (
                    <div className="flex items-center gap-2 px-1">
                        <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
                        <p className="text-[10px] font-black text-rose-600 uppercase tracking-widest">
                            Audit remarks (min 12 chars) mandatory for ratification
                        </p>
                    </div>
                )}
            </div>
          </div>

          <div className="pt-6 px-6 pb-6 border-t border-slate-100 bg-white flex justify-end gap-3 shrink-0">
                {!isReadOnly ? (
                  <>
                    <button 
                        onClick={() => handleVerify('rejected')}
                        disabled={submitting}
                        className="px-6 py-3 text-rose-600 font-black text-xs uppercase tracking-widest hover:bg-rose-50 rounded-xl transition-all flex items-center gap-2 disabled:opacity-50"
                    >
                        <XCircle className="w-4 h-4" />
                        Deny Ratification
                    </button>
                    <button 
                        onClick={() => handleVerify('approved')}
                        disabled={submitting}
                        className="px-8 py-3 bg-emerald-600 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-600/20 flex items-center gap-2 active:scale-95 disabled:opacity-50"
                    >
                        <CheckCircle2 className="w-4 h-4" />
                        Activate & Enroll Center
                    </button>
                  </>
                ) : (
                  <button 
                      onClick={() => setIsModalOpen(false)}
                      className="px-8 py-3 bg-slate-100 text-slate-600 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all"
                  >
                      Close Registry
                  </button>
                )}
          </div>
        </div>
      </Modal>
    </div>
  );
}
