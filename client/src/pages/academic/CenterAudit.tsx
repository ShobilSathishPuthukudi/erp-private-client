import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '@/lib/api';
import { DataTable } from '@/components/shared/DataTable';
import { Modal } from '@/components/shared/Modal';
import { useAuthStore } from '@/store/authStore';
import { 
  MapPin, 
  FileText, 
  ShieldCheck, 
  CheckCircle2, 
  XCircle,
  Clock,
  ExternalLink,
  Users,
  Building2,
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
  status: 'active' | 'inactive';
  auditStatus: 'pending' | 'approved' | 'rejected' | 'finance_pending';
  rejectionReason?: string;
  infrastructureDetails?: any;
  createdAt: string;
  websiteUrl?: string;
  shortName?: string;
  centerStatus?: string;
  description?: string;
  metadata?: {
    website?: string;
    primaryInterest?: {
      universityId: string;
      programIds: number[];
      programId?: string;
    };
  };
  referringBDE?: {
    name: string;
    uid: string;
  };
}

export default function CenterAudit() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = (searchParams.get('tab') as 'pending' | 'approved' | 'rejected' | 'finance_pending') || 'pending';
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'rejected' | 'finance_pending'>(initialTab);
  const [centers, setCenters] = useState<Center[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [triedSubmit, setTriedSubmit] = useState(false);
  const [selectedCenter, setSelectedCenter] = useState<Center | null>(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [provisioningPassword, setProvisioningPassword] = useState('');
  const [selectedPrograms, setSelectedPrograms] = useState<number[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);

  const user = useAuthStore(state => state.user);
  const isReadOnly = useMemo(() => {
    return user?.role?.toLowerCase()?.includes('organization admin') || activeTab !== 'pending';
  }, [user, activeTab]);

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
    if (isReadOnly) return;
    setTriedSubmit(true);
    
    if (!rejectionReason.trim()) {
      toast.error('Audit remarks are mandatory for protocol clearance');
      return;
    }
    if (status === 'approved' && !provisioningPassword.trim()) {
      toast.error('Official security credentials must be provisioned for activation');
      return;
    }
    if (status === 'approved' && !selectedPrograms.length) {
      toast.error('Select at least one academic program to authorize center');
      return;
    }

    setSubmitting(true);
    try {
      await api.put(`/operations/centers/${selectedCenter?.id}/audit`, {
        status,
        reason: rejectionReason,
        password: provisioningPassword,
        programIds: selectedPrograms
      });
      toast.success(status === 'approved' ? 'Verified by Operations. Moving to Finance for clearance.' : 'Center rejected successfully');
      setIsReviewModalOpen(false);
      setSelectedCenter(null);
      setRejectionReason('');
      setProvisioningPassword('');
      setTriedSubmit(false);
      setSelectedPrograms([]);
      fetchCenters();
    } catch (error) {
      toast.error('Audit action failed');
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
          {activeTab === 'pending' && !isReadOnly ? (
            <button 
              onClick={() => {
                setSelectedCenter(row.original);
                setIsReviewModalOpen(true);
                setRejectionReason('');
                setProvisioningPassword('');
                
                // Support both legacy single ID and new array-based selection
                const requestedIds = row.original.metadata?.primaryInterest?.programIds || [];
                const legacyId = row.original.metadata?.primaryInterest?.programId;
                if (legacyId && !requestedIds.includes(Number(legacyId))) {
                    requestedIds.push(Number(legacyId));
                }
                setSelectedPrograms(requestedIds);
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
                
                // Support both legacy single ID and new array-based selection
                const requestedIds = row.original.metadata?.primaryInterest?.programIds || [];
                const legacyId = row.original.metadata?.primaryInterest?.programId;
                if (legacyId && !requestedIds.includes(Number(legacyId))) {
                    requestedIds.push(Number(legacyId));
                }
                setSelectedPrograms(requestedIds);
              }}
              className="px-4 py-2 bg-white text-slate-600 border border-slate-200 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-50 transition-all active:scale-95 flex items-center gap-2"
            >
              <Eye className="w-3 h-3 text-blue-600" />
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
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center text-white shadow-lg shadow-slate-900/20">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Center Audit System</h1>
            <p className="text-slate-500 font-medium text-sm">Validate and ratify regional study centers for academic operations.</p>
          </div>
        </div>
        <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200">
           {(['pending', 'finance_pending', 'approved', 'rejected'] as const).map(tab => (
             <button
                key={tab}
                onClick={() => {
                  setActiveTab(tab);
                  setSearchParams({ tab });
                }}
                className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
             >
                {tab.replace('_', ' ')}
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
        <div className="flex flex-col h-[70vh] -mx-6 -my-5">
          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
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
                        <p className="text-xs font-black text-indigo-600 truncate">{selectedCenter?.centerStatus || 'REGISTERED'}</p>
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

            {selectedCenter?.description && (
                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-3">
                        <FileText className="w-4 h-4 text-slate-400" />
                        Institutional Bio & Onboarding Notes
                    </h4>
                    <p className="text-sm font-medium text-slate-600 leading-relaxed italic">
                        "{selectedCenter.description}"
                    </p>
                </div>
            )}

            {activeTab === 'pending' && (
              <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-4 shadow-sm">
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-2">
                      Program Authorization
                  </h4>
                  <div className="grid grid-cols-2 gap-3 max-h-[200px] overflow-y-auto pr-2">
                      {programs
                        .filter(prog => {
                            const requestedIds = selectedCenter?.metadata?.primaryInterest?.programIds || [];
                            const legacyId = Number(selectedCenter?.metadata?.primaryInterest?.programId);
                            return requestedIds.includes(prog.id) || (legacyId && prog.id === legacyId);
                        })
                        .map(prog => (
                          <div key={prog.id} className="flex items-start gap-3 p-3 border rounded-xl bg-slate-50 border-slate-200">
                              <div className="flex-1">
                                  <div className="flex items-center justify-between">
                                      <p className="text-xs font-bold text-slate-900">{prog.name}</p>
                                      <span className="text-[7px] font-black bg-indigo-600 text-white px-1.5 py-0.5 rounded-full uppercase tracking-tighter">Requested</span>
                                  </div>
                                  <p className="text-[10px] text-slate-500 uppercase">{prog.type}</p>
                              </div>
                          </div>
                      ))}
                  </div>
              </div>
            )}

            <div className="space-y-4">
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1 flex items-center gap-2">
                    {activeTab === 'pending' ? 'Audit Decision Remarks' : 'Protocol History Remarks'}
                    {!isReadOnly && <span className="text-[8px] bg-rose-100 text-rose-600 px-1.5 py-0.5 rounded-full">Mandatory</span>}
                </label>
                <textarea 
                    value={rejectionReason}
                    onChange={(e) => {
                        setRejectionReason(e.target.value);
                        if (e.target.value.trim()) setTriedSubmit(false);
                    }}
                    placeholder={activeTab === 'pending' ? "Enter detailed audit notes for protocol clearance..." : "No additional remarks recorded."}
                    readOnly={isReadOnly}
                    className={`w-full bg-slate-50 border rounded-xl p-4 text-sm font-bold outline-none transition-all min-h-[100px] text-slate-900 ${isReadOnly ? 'opacity-70 cursor-not-allowed border-slate-200' : (triedSubmit && !rejectionReason.trim() ? 'border-rose-400 bg-rose-50/30' : 'border-slate-200 focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900 shadow-sm')}`}
                />
            </div>

            {activeTab === 'pending' && !isReadOnly && (
              <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100 space-y-4 shadow-sm">
                <div className="flex items-center gap-3 mb-1">
                  <ShieldCheck className="w-5 h-5 text-blue-600" />
                  <h3 className="text-[10px] font-black text-blue-900 uppercase tracking-[0.2em]">Security Provisioning</h3>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block pl-1 flex items-center gap-2">
                    Official Admin Password
                    <span className="text-[8px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full lowercase">required for activation</span>
                  </label>
                  <div className="relative">
                    <input 
                      type="text" 
                      className={`w-full bg-white border-2 rounded-xl px-4 py-2.5 text-sm font-bold focus:ring-0 transition-all shadow-sm ${triedSubmit && !provisioningPassword.trim() ? 'border-rose-400 bg-rose-50/30' : 'border-white focus:border-blue-600'}`}
                      placeholder="Provision official password..."
                      value={provisioningPassword}
                      onChange={e => setProvisioningPassword(e.target.value)}
                    />
                  </div>
                  <p className="text-[8px] font-medium text-slate-400 pl-1 uppercase tracking-wider italic">This password will be required for the center's first login.</p>
                </div>
              </div>
            )}
          </div>

          {/* Fixed Footer Buttons */}
          <div className="pt-6 px-6 pb-6 border-t border-slate-100 bg-white">
            {!isReadOnly ? (
                <div className="flex justify-end gap-3">
                    <button 
                        onClick={() => handleAudit('rejected')}
                        disabled={submitting}
                        className="px-6 py-3 text-rose-600 font-black text-xs uppercase tracking-widest hover:bg-rose-50 rounded-xl transition-all flex items-center gap-2 disabled:opacity-50"
                    >
                        <XCircle className="w-4 h-4" />
                        Reject Certification
                    </button>
                    <button 
                        onClick={() => handleAudit('approved')}
                        disabled={submitting}
                        className="px-8 py-3 bg-slate-900 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/20 flex items-center gap-2 active:scale-95 disabled:opacity-50"
                    >
                        <CheckCircle2 className="w-4 h-4" />
                        Verify & Forward to Finance
                    </button>
                </div>
            ) : (
                <div className="flex justify-end">
                    <button 
                        onClick={() => setIsReviewModalOpen(false)}
                        className="px-8 py-3 bg-slate-100 text-slate-600 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all"
                    >
                        Close Registry
                    </button>
                </div>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}
