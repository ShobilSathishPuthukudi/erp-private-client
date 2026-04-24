import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '@/lib/api';
import { DataTable } from '@/components/shared/DataTable';
import { Modal } from '@/components/shared/Modal';
import { 
  Clock,
  CheckCircle2,
  ExternalLink,
  Building2,
  FileText,
  AlertCircle,
  Users,
  Eye,
  Landmark,
  Activity,
  ShieldCheck,
  XCircle
} from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import toast from 'react-hot-toast';
import { PageHeader } from '@/components/shared/PageHeader';

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
  const [counts, setCounts] = useState({ pending: 0, approved: 0, rejected: 0 });
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

  const fetchCounts = async () => {
    try {
      const [p, a, r] = await Promise.all([
        api.get('/finance/approvals/centers?status=pending'),
        api.get('/finance/approvals/centers?status=approved'),
        api.get('/finance/approvals/centers?status=rejected')
      ]);
      setCounts({
        pending: p.data.length,
        approved: a.data.length,
        rejected: r.data.length
      });
    } catch (error) {
      console.error('Finance telemetry sync failure', error);
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
    fetchCounts();
  }, [activeTab]);

  useEffect(() => {
    fetchCounts();
    fetchPrograms();
  }, []);

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
                  : 'bg-slate-900 text-white hover:bg-emerald-600 shadow-lg shadow-slate-900/10'
                }`}
            >
                {isReadOnly ? <Eye className="w-3.5 h-3.5 text-blue-600" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                {isReadOnly ? 'Audit Details' : 'Final Review'}
            </button>
      )
    }
  ];

  return (
    <div className="p-2 space-y-8 max-w-[1600px] mx-auto">
      <div className="space-y-6">
      <PageHeader 
        title="Center verification queue"
        description="Perform secondary financial audit and provision institutional credentials."
        icon={Building2}
      />

        <div className="flex bg-slate-100/50 p-1 rounded-2xl border border-slate-200 w-fit gap-1">
           {[
             { id: 'pending', name: 'Verification Pending', icon: Clock, color: 'text-indigo-600' },
             { id: 'approved', name: 'Activated', icon: CheckCircle2, color: 'text-emerald-600' },
             { id: 'rejected', name: 'Denied', icon: XCircle, color: 'text-rose-600' }
           ].map(tab => (
             <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as any);
                  setSearchParams({ tab: tab.id });
                }}
                className={`
                  flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-200
                  ${activeTab === tab.id 
                    ? `bg-white ${tab.color} shadow-lg shadow-slate-200 ring-1 ring-slate-200` 
                    : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'}
                `}
             >
                <tab.icon className={`w-3.5 h-3.5 ${activeTab === tab.id ? tab.color : 'text-slate-400'}`} />
                {tab.name}
                <span className={`static ml-2 px-2 py-0.5 rounded-md text-[9px] ${activeTab === tab.id ? 'bg-slate-100' : 'bg-slate-200/50 text-slate-500'}`}>
                  {counts[tab.id as keyof typeof counts] || 0}
                </span>
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
        <div className="flex flex-col h-[75vh] -mx-6 -my-5">
            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
            
            {/* Dark telemetry HUD */}
            <div className="bg-slate-900 p-6 rounded-3xl shadow-xl shadow-slate-900/20">
              <div className="flex items-center gap-3 mb-4">
                <Activity className="text-emerald-400 w-5 h-5" />
                <h3 className="text-white font-black text-sm uppercase tracking-widest leading-none">Institutional Telemetry</h3>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white/10 p-4 rounded-2xl border border-white/5 flex flex-col justify-center min-h-[80px]">
                  <p className="text-[10px] font-bold text-white/40 uppercase mb-1 tracking-widest">Center Type</p>
                  <p className="text-sm font-black text-white uppercase truncate">{selectedCenter?.type || 'Standard'}</p>
                </div>
                <div className="bg-white/10 p-4 rounded-2xl border border-white/5 flex flex-col justify-center min-h-[80px]">
                  <p className="text-[10px] font-bold text-white/40 uppercase mb-1 tracking-widest">Short Code</p>
                  <p className="text-base font-black text-white">{selectedCenter?.shortName || 'N/A'}</p>
                </div>
                <div className="bg-white/10 p-4 rounded-2xl border border-white/5 flex flex-col justify-center min-h-[80px]">
                  <p className="text-[10px] font-bold text-white/40 uppercase mb-1 tracking-widest">Lifecycle Stage</p>
                  <p className="text-[11px] font-bold text-emerald-400 uppercase leading-tight">{selectedCenter?.centerStatus || 'OPS_CLEARED'}</p>
                </div>
                <div className="bg-white/10 p-4 rounded-2xl border border-white/5 flex flex-col justify-center min-h-[80px]">
                  <p className="text-[10px] font-bold text-white/40 uppercase mb-1 tracking-widest">Attribution</p>
                  <p className="text-xs font-black text-white leading-tight truncate">{selectedCenter?.referringBDE?.name || 'Organic'}</p>
                </div>
              </div>
            </div>

            <div className="bg-emerald-50 border border-emerald-100 p-6 rounded-3xl flex items-center justify-between shadow-sm shadow-emerald-50">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-emerald-900 uppercase tracking-widest leading-none">Operations Clearance Active</h4>
                  <p className="text-[10px] text-emerald-700 font-bold uppercase tracking-tighter mt-1">Infrastructure audit passed. provision credentials for activation.</p>
                </div>
              </div>
              {selectedCenter?.metadata?.website && (
                <a
                  href={selectedCenter.metadata.website.startsWith('http') ? selectedCenter.metadata.website : `https://${selectedCenter.metadata.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-white border border-emerald-200 text-emerald-700 px-4 py-2 rounded-xl text-[10px] font-black hover:bg-emerald-50 transition-all active:scale-95 shadow-sm flex items-center gap-2 whitespace-nowrap"
                >
                  <ExternalLink className="w-3 h-3" />
                  VISIT PORTAL
                </a>
              )}
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-200 space-y-4 shadow-sm">
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-2">
                    Authorized Academic Domain
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                    {programs
                      .filter(prog => selectedPrograms.includes(prog.id))
                      .map(prog => (
                        <div key={prog.id} className="flex items-start gap-3 p-3 border rounded-xl bg-slate-50 border-slate-100">
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

            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm transition-all duration-300">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                    <FileText className="w-4 h-4 text-indigo-600" />
                    {activeTab === 'pending' ? 'Audit Decision Remarks' : 'Institutional Audit Remarks'}
                  </h4>
                </div>

                <div className="space-y-4">
                  {/* Financial Remarks Textarea (Only if pending) */}
                  {!isReadOnly ? (
                    <div className="space-y-3 pb-4">
                      <textarea 
                        value={remarks}
                        onChange={(e) => {
                            setRemarks(e.target.value);
                            if (e.target.value.trim().length >= 12) setTriedSubmit(false);
                        }}
                        placeholder="Provide a detailed justification for institutional activation (min 12 chars)..."
                        className={`w-full bg-slate-50 border-2 rounded-2xl p-4 text-sm font-bold outline-none transition-all min-h-[120px] text-slate-900 ${triedSubmit && (!remarks || remarks.trim().length < 12) ? 'border-rose-400 bg-rose-50/30' : 'border-slate-100 focus:border-slate-900 focus:bg-white shadow-sm'}`}
                      />
                      <div className="flex items-center gap-2 pl-1">
                        <span className="text-[7px] font-black bg-rose-100 text-rose-600 px-1.5 py-0.5 rounded-full uppercase">Finance Audit</span>
                        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">Remarks are forensic evidence and required for ratification.</p>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 border-dashed">
                        <p className="text-sm text-slate-600 font-medium leading-relaxed italic">
                          "{remarks || 'Operational protocol cleared without additional commentary.'}"
                        </p>
                        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-200/50">
                          <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center text-[8px] font-black text-emerald-600">
                            FI
                          </div>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Authenticated by Finance Audit Department</p>
                        </div>
                    </div>
                  )}
                </div>
            </div>
          </div>

          <div className="pt-6 px-6 pb-6 border-t border-slate-100 bg-white flex justify-end gap-3 shrink-0">
                {!isReadOnly ? (
                  <>
                    <button 
                        onClick={() => handleVerify('rejected')}
                        disabled={submitting}
                        className="px-6 py-3 text-rose-600 font-black text-[10px] uppercase tracking-widest hover:bg-rose-50 rounded-xl transition-all flex items-center gap-2 disabled:opacity-50"
                    >
                        <XCircle className="w-4 h-4" />
                        Deny Ratification
                    </button>
                    <button 
                        onClick={() => handleVerify('approved')}
                        disabled={submitting}
                        className="px-8 py-3 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/20 flex items-center gap-2 active:scale-95 disabled:opacity-50"
                    >
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        Activate & Enroll Center
                    </button>
                  </>
                ) : (
                  <button 
                      onClick={() => setIsModalOpen(false)}
                      className="px-8 py-3 bg-slate-100 text-slate-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all active:scale-95 shadow-sm"
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
