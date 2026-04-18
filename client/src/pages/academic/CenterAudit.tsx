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
  Landmark,
  Users,
  Building2,
  Eye,
  Activity
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
  financeRemarks?: string;
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
  const [counts, setCounts] = useState({ pending: 0, finance_pending: 0, approved: 0, rejected: 0 });
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
    const isSales = user?.role?.toLowerCase()?.trim().includes('sales');
    return user?.role?.toLowerCase()?.includes('organization admin') || activeTab !== 'pending' || isSales;
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

  const fetchCounts = async () => {
    try {
      const [p, f, a, r] = await Promise.all([
        api.get('/operations/centers/audit-list?status=pending'),
        api.get('/operations/centers/audit-list?status=finance_pending'),
        api.get('/operations/centers/audit-list?status=approved'),
        api.get('/operations/centers/audit-list?status=rejected')
      ]);
      setCounts({
        pending: p.data.length,
        finance_pending: f.data.length,
        approved: a.data.length,
        rejected: r.data.length
      });
    } catch (error) {
      console.error('Audit telemetry sync failure', error);
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
  }, [activeTab]);

  useEffect(() => {
    fetchCounts();
    fetchPrograms();
  }, []);

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
      fetchCounts();
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
          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 border border-slate-200 uppercase font-black text-[10px]">
            {row.original.name?.charAt(0) || '?'}
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-slate-900">{row.original.name}</span>
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-tighter">CTR-REF-{row.original.id}</span>
          </div>
        </div>
      )
    },
    {
      accessorKey: 'shortName',
      header: 'Short Name',
      cell: ({ row }) => (
        <div className="flex items-center gap-2 text-slate-500 font-medium">
          <MapPin className="w-3 h-3" />
          <span className="font-mono uppercase text-xs">{row.original.shortName || '—'}</span>
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
          <button
            onClick={() => {
              setSelectedCenter(row.original);
              setIsReviewModalOpen(true);
              setSelectedCenter(row.original);
              setIsReviewModalOpen(true);
              // Logic: Approved/Rejected tabs show Finance remarks. Finance Pending shows Ops remarks.
              const targetRemarks = (activeTab === 'approved' || activeTab === 'rejected') 
                ? (row.original.financeRemarks || '') 
                : (row.original.rejectionReason || '');
              
              setRejectionReason(activeTab !== 'pending' ? targetRemarks : '');
              setProvisioningPassword('');
              const requestedIds = row.original.metadata?.primaryInterest?.programIds || [];
              const legacyId = row.original.metadata?.primaryInterest?.programId;
              if (legacyId && !requestedIds.includes(Number(legacyId))) requestedIds.push(Number(legacyId));
              setSelectedPrograms(requestedIds);
            }}
            className={`flex items-center gap-2 ${isReadOnly || activeTab !== 'pending' ? 'bg-white border border-slate-200 text-slate-600' : 'bg-slate-900 text-white'} px-4 py-2 rounded-xl text-xs font-black hover:bg-slate-800 hover:text-white transition-all active:scale-95 shadow-lg shadow-slate-900/10`}
          >
            {isReadOnly || activeTab !== 'pending'
              ? <Eye className="w-3.5 h-3.5 text-blue-600" />
              : <ShieldCheck className="w-3.5 h-3.5" />}
            <span>{isReadOnly || activeTab !== 'pending' ? 'View Details' : 'Conduct Audit'}</span>
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="p-8 space-y-8 max-w-[1600px] mx-auto">
      <div className="space-y-6">
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
        </div>

        <div className="flex bg-slate-100/50 p-1 rounded-2xl border border-slate-200 w-fit">
           {[
             { id: 'pending', name: 'Pending', icon: Clock },
             { id: 'finance_pending', name: 'Finance Pending', icon: Landmark },
             { id: 'approved', name: 'Approved', icon: CheckCircle2 },
             { id: 'rejected', name: 'Rejected', icon: XCircle }
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
                    ? 'bg-white text-indigo-600 shadow-lg shadow-indigo-100 ring-1 ring-slate-200' 
                    : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'}
                `}
             >
                <tab.icon className={`w-3.5 h-3.5 ${activeTab === tab.id ? 'text-indigo-600' : 'text-slate-400'}`} />
                {tab.name}
                <span className={`static ml-1 px-1.5 py-0.5 rounded-md text-[9px] ${activeTab === tab.id ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-200 text-slate-600'}`}>
                  {counts[tab.id as keyof typeof counts] || 0}
                </span>
             </button>
           ))}
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-sm">
        <DataTable
          columns={columns}
          data={centers}
          pageSize={10} 
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
            {/* Dark telemetry HUD — matches PendingReviews Candidacy Telemetry style */}
            <div className="bg-slate-900 p-6 rounded-3xl shadow-xl shadow-slate-900/20">
              <div className="flex items-center gap-3 mb-4">
                <Activity className="text-amber-400 w-5 h-5" />
                <h3 className="text-white font-black text-sm uppercase tracking-widest">Center Telemetry</h3>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white/10 p-4 rounded-2xl border border-white/5 flex flex-col justify-center min-h-[80px]">
                  <p className="text-[10px] font-bold text-white/40 uppercase mb-1">Center Type</p>
                  <p className="text-lg font-black text-white uppercase">{selectedCenter?.type?.split(' ').map(w => w[0]).join('') || 'CTR'}</p>
                  <p className="text-[9px] text-white/40 uppercase tracking-tight mt-0.5">{selectedCenter?.type || 'Standard'}</p>
                </div>
                <div className="bg-white/10 p-4 rounded-2xl border border-white/5 flex flex-col justify-center min-h-[80px]">
                  <p className="text-[10px] font-bold text-white/40 uppercase mb-1">Short Code</p>
                  <p className="text-lg font-black text-white">{selectedCenter?.shortName || 'N/A'}</p>
                </div>
                <div className="bg-white/10 p-4 rounded-2xl border border-white/5 flex flex-col justify-center min-h-[80px]">
                  <p className="text-[10px] font-bold text-white/40 uppercase mb-1">Lifecycle Stage</p>
                  <p className="text-[11px] font-bold text-amber-400 uppercase leading-tight">{selectedCenter?.centerStatus || 'REGISTERED'}</p>
                </div>
                <div className="bg-white/10 p-4 rounded-2xl border border-white/5 flex flex-col justify-center min-h-[80px]">
                  <p className="text-[10px] font-bold text-white/40 uppercase mb-1">Referred By</p>
                  <p className="text-xs font-black text-white leading-tight">{selectedCenter?.referringBDE?.name || 'Organic'}</p>
                  {selectedCenter?.referringBDE?.uid && (
                    <p className="text-[9px] text-white/40 uppercase tracking-tighter mt-0.5">{selectedCenter.referringBDE.uid}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Website / Dossier — matches PendingReviews Institutional Dossier style */}
            <div className="border border-slate-200 rounded-3xl p-6 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900 uppercase tracking-tight">Institutional Portal</p>
                  <p className="text-[10px] text-slate-500 font-medium tracking-tighter">
                    {selectedCenter?.description ? 'Description available' : 'No description on record'}
                  </p>
                </div>
              </div>
              {selectedCenter?.metadata?.website ? (
                <a
                  href={selectedCenter.metadata.website.startsWith('http') ? selectedCenter.metadata.website : `https://${selectedCenter.metadata.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-2 rounded-xl text-[10px] font-black hover:bg-blue-100 transition-all active:scale-95 shadow-sm flex items-center gap-2 whitespace-nowrap"
                >
                  <ExternalLink className="w-3 h-3" />
                  VISIT WEBSITE
                </a>
              ) : (
                <button disabled className="bg-slate-200 text-slate-400 px-4 py-2 rounded-xl text-xs font-bold cursor-not-allowed">
                  No Website
                </button>
              )}
            </div>

            {selectedCenter?.description && (
              <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-3">
                  <FileText className="w-4 h-4 text-slate-400" />
                  Institutional Bio & Onboarding Notes
                </h4>
                <p className="text-sm font-medium text-slate-600 leading-relaxed italic">
                  "{selectedCenter.description}"
                </p>
              </div>
            )}

            {(activeTab === 'pending' || (selectedCenter as any)?.mappedPrograms?.length > 0) && (
              <div className="bg-white p-6 rounded-3xl border border-slate-200 space-y-4 shadow-sm">
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-2">
                  {activeTab === 'pending' ? 'Program Authorization' : 'Ratified Academic Domains'}
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                  {activeTab === 'pending' ? (
                    programs
                      .filter(prog => {
                        const requestedIds = selectedCenter?.metadata?.primaryInterest?.programIds || [];
                        const legacyId = Number(selectedCenter?.metadata?.primaryInterest?.programId);
                        return requestedIds.includes(prog.id) || (legacyId && prog.id === legacyId);
                      })
                      .map(prog => (
                        <div key={prog.id} className="flex items-start gap-3 p-3 border rounded-xl bg-slate-50 border-slate-100">
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <p className="text-xs font-bold text-slate-900">{prog.name}</p>
                              <span className="text-[7px] font-black bg-indigo-600 text-white px-1.5 py-0.5 rounded-full uppercase tracking-tighter">Requested</span>
                            </div>
                            <p className="text-[10px] text-slate-500 uppercase">{prog.type}</p>
                          </div>
                        </div>
                      ))
                  ) : (
                    (selectedCenter as any)?.mappedPrograms?.map((mp: any) => (
                      <div key={mp.program?.id} className="flex items-start gap-3 p-3 border rounded-xl bg-indigo-50/50 border-indigo-100">
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-bold text-indigo-900">{mp.program?.name}</p>
                            <span className="text-[7px] font-black bg-green-600 text-white px-1.5 py-0.5 rounded-full uppercase tracking-tighter">Authorized</span>
                          </div>
                          <p className="text-[10px] text-indigo-600 uppercase">{mp.program?.type}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm transition-all duration-300">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                    <FileText className="w-4 h-4 text-indigo-600" />
                    {activeTab === 'pending' 
                      ? 'Audit Decision Remarks' 
                      : (activeTab === 'approved' || activeTab === 'rejected')
                        ? 'Finance Department Remarks'
                        : 'Academic Operations Remarks'
                    }
                  </h4>
                </div>

                {activeTab === 'pending' ? (
                  <div className="space-y-2">
                    <textarea 
                      value={rejectionReason}
                      onChange={(e) => {
                          setRejectionReason(e.target.value);
                          if (e.target.value.trim()) setTriedSubmit(false);
                      }}
                      placeholder="Enter detailed audit notes for protocol clearance..."
                      className={`w-full bg-slate-50 border rounded-xl p-4 text-sm font-bold outline-none transition-all min-h-[120px] text-slate-900 ${triedSubmit && !rejectionReason.trim() ? 'border-rose-400 bg-rose-50/30' : 'border-slate-200 focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900 shadow-sm'}`}
                    />
                    <div className="flex items-center gap-2 pl-1">
                      <span className="text-[7px] font-black bg-rose-100 text-rose-600 px-1.5 py-0.5 rounded-full uppercase">Mandatory</span>
                      <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">These remarks will be permanently recorded in the institutional ledger.</p>
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 border-dashed">
                      <p className="text-sm text-slate-600 font-medium leading-relaxed italic">
                        "{rejectionReason || 'No additional departmental commentary recorded.'}"
                      </p>
                      <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-200/50">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-black uppercase ${activeTab === 'finance_pending' ? 'bg-indigo-100 text-indigo-600' : 'bg-emerald-100 text-emerald-600'}`}>
                          {activeTab === 'finance_pending' ? 'OP' : 'FI'}
                        </div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                          {activeTab === 'finance_pending' ? 'Recorded by Operations Audit Board' : 'Ratified by Finance Audit Department'}
                        </p>
                      </div>
                  </div>
                )}
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
              <div className="flex flex-col md:flex-row gap-3">
                <button
                  onClick={() => handleAudit('rejected')}
                  disabled={submitting}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 text-red-600 font-black hover:bg-red-50 rounded-xl transition-all active:scale-95 disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed text-xs uppercase tracking-widest border border-red-100"
                >
                  <XCircle className="w-4 h-4" />
                  Reject Certification
                </button>
                <button
                  onClick={() => handleAudit('approved')}
                  disabled={submitting}
                  className="flex-[2] flex items-center justify-center gap-2 px-8 py-3 bg-slate-900 text-white rounded-xl font-black hover:bg-slate-800 transition-all active:scale-95 disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed shadow-xl shadow-slate-900/20 text-xs uppercase tracking-widest"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Verify & Forward to Finance
                </button>
              </div>
            ) : (
              <div className="flex justify-end">
                <button
                  onClick={() => setIsReviewModalOpen(false)}
                  className="px-8 py-3 bg-slate-100 text-slate-600 rounded-xl font-black hover:bg-slate-200 transition-all active:scale-95 text-xs uppercase tracking-widest"
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
