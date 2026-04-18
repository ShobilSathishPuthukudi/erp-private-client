import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '@/lib/api';
import { DataTable } from '@/components/shared/DataTable';
import { Modal } from '@/components/shared/Modal';
import { useAuthStore } from '@/store/authStore';
import type { ColumnDef } from '@tanstack/react-table';
import { 
  Building2, 
  MapPin, 
  Clock, 
  Users, 
  ShieldCheck, 
  Eye, 
  Info, 
  Link as LinkIcon, 
  CheckCircle2, 
  XCircle,
  ExternalLink,
  FileText,
  Terminal,
  Activity,
  Landmark,
  History
} from 'lucide-react';
import toast from 'react-hot-toast';

interface AccreditationRequest {
  id: number;
  centerId: number;
  courseName: string;
  universityName: string;
  type: string;
  status: string;
  center?: { name: string };
  assignedUniversityId?: number;
  assignedSubDeptId?: number;
  remarks?: string;
}

interface Program {
  id: number;
  name: string;
}

export default function AccreditationRequests() {
  const { unit } = useParams();
  const [activeTab, setActiveTab] = useState<'pending'|'finance_pending'|'approved'|'rejected'>('pending');
  const [counts, setCounts] = useState({ pending: 0, finance_pending: 0, approved: 0, rejected: 0 });
  const [requests, setRequests] = useState<AccreditationRequest[]>([]);
  const [entities, setEntities] = useState<{universities: {id:number, name:string}[], subDepts: {id:number, name:string}[]}>({ universities: [], subDepts: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<AccreditationRequest | null>(null);
  
  const [assignedUniversityId, setAssignedUniversityId] = useState<string>('');
  const [assignedSubDeptId, setAssignedSubDeptId] = useState<string>('');
  const [remarks, setRemarks] = useState('');

  const user = useAuthStore(state => state.user);
  const isReadOnly = useMemo(() => {
    return user?.role?.toLowerCase()?.includes('organization admin') || activeTab !== 'pending';
  }, [user, activeTab]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [reqRes, entRes] = await Promise.all([
        api.get('/sub-dept/accreditation-requests', { params: { unit, status: activeTab } }),
        api.get('/sub-dept/accreditation-ops/entities')
      ]);
      setRequests(reqRes.data);
      setEntities(entRes.data);
    } catch (error) {
      toast.error('Failed to load accreditation data');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCounts = async () => {
    try {
      const [p, f, a, r] = await Promise.all([
        api.get('/sub-dept/accreditation-requests', { params: { unit, status: 'pending' } }),
        api.get('/sub-dept/accreditation-requests', { params: { unit, status: 'finance_pending' } }),
        api.get('/sub-dept/accreditation-requests', { params: { unit, status: 'approved' } }),
        api.get('/sub-dept/accreditation-requests', { params: { unit, status: 'rejected' } })
      ]);
      setCounts({
        pending: p.data.length,
        finance_pending: f.data.length,
        approved: a.data.length,
        rejected: r.data.length
      });
    } catch (error) {
      console.error('Accreditation telemetry sync failure', error);
    }
  };

  useEffect(() => {
    fetchData();
    fetchCounts();
  }, [unit, activeTab]);

  useEffect(() => {
    fetchCounts();
  }, []);

  const openApproveModal = (request: AccreditationRequest) => {
    setSelectedRequest(request);
    setRemarks(request.remarks || '');
    setAssignedUniversityId(request.assignedUniversityId?.toString() || '');
    setAssignedSubDeptId(request.assignedSubDeptId?.toString() || '');
    setIsModalOpen(true);
  };

  const handleApprove = async () => {
    if (isReadOnly) return;
    if (!assignedUniversityId) return toast.error('Please assign a Target University');
    if (!assignedSubDeptId) return toast.error('Please assign a Type (Sub-Department)');
    try {
      await api.put(`/sub-dept/accreditation-requests/${selectedRequest?.id}/approve`, {
        assignedUniversityId: parseInt(assignedUniversityId),
        assignedSubDeptId: parseInt(assignedSubDeptId),
        remarks
      });
      toast.success('Course officially authorized and transferred to Finance review pipeline');
      setIsModalOpen(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Approval protocol failure');
    }
  };

  const columns: ColumnDef<AccreditationRequest>[] = [
    { 
      accessorKey: 'id', 
      header: 'REQ-ID', 
      cell: ({ row }) => <span className="font-mono text-[10px] bg-slate-100 px-2 py-0.5 rounded-full text-slate-500 font-bold">#ACC-{row.original.id}</span> 
    },
    { 
      accessorKey: 'center.name', 
      header: 'Study Center', 
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 font-bold border border-slate-200 uppercase">
             {row.original.center?.name.charAt(0)}
          </div>
          <div>
            <p className="font-bold text-slate-900">{row.original.center?.name}</p>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mt-0.5">Partner Affiliate</p>
          </div>
        </div>
      ) 
    },
    { 
      accessorKey: 'courseName', 
      header: 'Requested Program', 
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="text-slate-900 font-bold text-sm tracking-tight">{row.original.courseName}</span>
          <span className="text-[10px] font-black text-indigo-500 uppercase tracking-tighter">{row.original.type || 'Standard'}</span>
        </div>
      ) 
    },
    { 
      accessorKey: 'universityName', 
      header: 'Target University', 
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
          <span className="text-slate-600 font-bold text-xs">{row.original.universityName}</span>
        </div>
      ) 
    },
    {
      id: 'actions',
      header: 'Institutional Review',
      cell: ({ row }) => (
        <button 
          onClick={() => openApproveModal(row.original)}
          className={`flex items-center gap-2 transition-all active:scale-95 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm ${
            isReadOnly 
              ? 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50' 
              : 'bg-slate-900 text-white hover:bg-indigo-600 shadow-xl shadow-slate-900/10'
          }`}
        >
          {isReadOnly ? <Eye className="w-3.5 h-3.5 text-blue-600" /> : <ShieldCheck className="w-3.5 h-3.5" />}
          <span>{isReadOnly ? 'Audit Details' : 'Conduct Audit'}</span>
        </button>
      )
    }
  ];

  return (
    <div className="p-2 space-y-6 flex flex-col h-[calc(100vh-8rem)]">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white px-6 py-5 rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50 gap-6 shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center text-white shadow-lg shadow-slate-900/20 shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight leading-tight mb-0.5">Accreditation audit queue</h1>
            <p className="text-slate-500 font-medium text-sm">Review center interest requests, assign architectural routing, and transfer to Finance.</p>
          </div>
        </div>
      </div>

      <div className="flex bg-slate-100/50 p-1 rounded-2xl border border-slate-200 w-fit gap-1">
           {[
             { id: 'pending', name: 'Pending', icon: Clock, color: 'text-indigo-600' },
             { id: 'finance_pending', name: 'Finance Pending', icon: Landmark, color: 'text-blue-600' },
             { id: 'approved', name: 'Approved', icon: CheckCircle2, color: 'text-emerald-600' },
             { id: 'rejected', name: 'Rejected', icon: XCircle, color: 'text-rose-600' }
           ].map(tab => (
             <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
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
      
      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
        <DataTable columns={columns} data={requests} isLoading={isLoading} searchKey="courseName" />
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={`Accreditation Review: ${selectedRequest?.courseName}`}
      >
        <div className="flex flex-col h-[75vh] -mx-6 -my-5">
          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
            
            {/* Dark telemetry HUD */}
            <div className="bg-slate-900 p-6 rounded-3xl shadow-xl shadow-slate-900/20">
              <div className="flex items-center gap-3 mb-4">
                <Activity className="text-amber-400 w-5 h-5" />
                <h3 className="text-white font-black text-sm uppercase tracking-widest leading-none">Request Telemetry</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white/10 p-4 rounded-2xl border border-white/5 flex flex-col justify-center min-h-[80px]">
                  <p className="text-[10px] font-bold text-white/40 uppercase mb-1 tracking-widest">Center Identity</p>
                  <p className="text-sm font-black text-white truncate">{selectedRequest?.center?.name}</p>
                </div>
                <div className="bg-white/10 p-4 rounded-2xl border border-white/5 flex flex-col justify-center min-h-[80px]">
                  <p className="text-[10px] font-bold text-white/40 uppercase mb-1 tracking-widest">Requested Program</p>
                  <p className="text-sm font-black text-indigo-400">{selectedRequest?.courseName}</p>
                  <p className="text-[9px] text-white/40 uppercase tracking-tighter mt-1">{selectedRequest?.type || 'Standard'}</p>
                </div>
                <div className="bg-white/10 p-4 rounded-2xl border border-white/5 flex flex-col justify-center min-h-[80px]">
                  <p className="text-[10px] font-bold text-white/40 uppercase mb-1 tracking-widest">Target University</p>
                  <p className="text-sm font-black text-white italic">{selectedRequest?.universityName}</p>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200 flex items-center justify-between">
               <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600 shadow-sm shadow-blue-100">
                    <Info className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest">Audit Guidance</h4>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter mt-1">
                      Determine architectural routing and certify for Finance ratification.
                    </p>
                  </div>
               </div>
            </div>

            <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                       <Terminal className="w-3.5 h-3.5" />
                       Routing: Target University
                    </label>
                    <select 
                        value={assignedUniversityId}
                        disabled={isReadOnly}
                        onChange={(e) => setAssignedUniversityId(e.target.value)}
                        className={`w-full bg-slate-50 border-2 rounded-xl px-4 py-3 text-sm font-bold transition-all ${isReadOnly ? 'opacity-70 cursor-not-allowed border-slate-200' : 'border-slate-100 focus:border-slate-900 focus:bg-white'}`}
                    >
                        <option value="">Select University...</option>
                        {entities.universities.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                    </select>
                  </div>

                  <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                       <LinkIcon className="w-3.5 h-3.5" />
                       Routing: Operating Unit
                    </label>
                    <select 
                        value={assignedSubDeptId}
                        disabled={isReadOnly}
                        onChange={(e) => setAssignedSubDeptId(e.target.value)}
                        className={`w-full bg-slate-50 border-2 rounded-xl px-4 py-3 text-sm font-bold transition-all ${isReadOnly ? 'opacity-70 cursor-not-allowed border-slate-200' : 'border-slate-100 focus:border-slate-900 focus:bg-white'}`}
                    >
                        <option value="">Select Unit...</option>
                        {entities.subDepts.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                    </select>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-slate-200 space-y-4 shadow-sm transition-all duration-300">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                      <History className="w-4 h-4 text-indigo-600" />
                      Institutional Audit Remarks
                    </h4>
                  </div>
                  
                  {isReadOnly ? (
                    <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 shadow-inner">
                      <p className="text-sm text-slate-600 font-bold leading-relaxed italic">
                        "{remarks || 'No detailed audit notes recorded for this request.'}"
                      </p>
                      <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-200">
                        <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-[10px] font-black">
                           AD
                        </div>
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Permanent Protocol Record</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <textarea 
                          value={remarks}
                          onChange={(e) => setRemarks(e.target.value)}
                          className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-sm font-bold outline-none focus:border-slate-900 focus:bg-white transition-all min-h-[120px] text-slate-900 shadow-sm"
                          placeholder="Enter detailed audit notes for protocol clearance..."
                      />
                      <div className="flex items-center gap-2 pl-1">
                        <span className="text-[7px] font-black bg-rose-100 text-rose-600 px-1.5 py-0.5 rounded-full uppercase">Mandatory</span>
                        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">Remarks are required to transition request to Finance.</p>
                      </div>
                    </div>
                  )}
                </div>
            </div>
          </div>

          <div className="pt-6 px-6 pb-6 border-t border-slate-100 bg-white">
            {!isReadOnly ? (
                <div className="flex justify-end gap-3">
                    <button 
                        onClick={() => setIsModalOpen(false)}
                        className="px-6 py-3 text-slate-500 font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 rounded-xl transition-all"
                    >
                        Abort Review
                    </button>
                    <button 
                        onClick={handleApprove}
                        className="px-8 py-3 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/20 flex items-center gap-2 active:scale-95"
                    >
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        Authorize & Transfer
                    </button>
                </div>
            ) : (
                <div className="flex justify-end">
                    <button 
                        onClick={() => setIsModalOpen(false)}
                        className="px-8 py-3 bg-slate-100 text-slate-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all active:scale-95 shadow-sm"
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
