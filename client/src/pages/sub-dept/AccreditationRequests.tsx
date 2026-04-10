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
  Terminal
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
  const [activeTab, setActiveTab] = useState<'pending'|'finance_pending'|'approved'>('pending');
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

  useEffect(() => {
    fetchData();
  }, [unit, activeTab]);

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
    <div className="p-8 space-y-8 max-w-[1600px] mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center text-white shadow-lg shadow-slate-900/20">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Accreditation Audit Queue</h1>
            <p className="text-slate-500 font-medium text-sm">Review center interest requests, assign architectural routing, and transfer to Finance.</p>
          </div>
        </div>
        <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200">
            <button 
              onClick={() => setActiveTab('pending')} 
              className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'pending' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Request Pending
            </button>
            <button 
              onClick={() => setActiveTab('finance_pending')} 
              className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'finance_pending' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Finance Pending
            </button>
            <button 
              onClick={() => setActiveTab('approved')} 
              className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'approved' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Approved
            </button>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-sm">
        <DataTable columns={columns} data={requests} isLoading={isLoading} searchKey="courseName" />
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={`Institutional Accreditation Review: ${selectedRequest?.courseName}`}
      >
        <div className="flex flex-col h-[70vh] -mx-6 -my-5">
          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
            
            <div className="bg-indigo-50 p-6 rounded-2xl border border-indigo-100 space-y-4">
               <h4 className="text-xs font-black text-indigo-400 uppercase tracking-widest flex items-center gap-2 mb-2">
                  <ShieldCheck className="w-4 h-4" />
                  Request Telemetry
               </h4>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white px-4 py-3 rounded-xl border border-indigo-100">
                     <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Center Identity</p>
                     <p className="text-sm font-black text-slate-900">{selectedRequest?.center?.name}</p>
                  </div>
                  <div className="bg-white px-4 py-3 rounded-xl border border-indigo-100">
                     <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Requested Program</p>
                     <p className="text-sm font-black text-indigo-600">{selectedRequest?.courseName}</p>
                  </div>
               </div>
               <div className="bg-white px-4 py-3 rounded-xl border border-indigo-100">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Stated University Preference</p>
                  <p className="text-sm font-black text-slate-900">{selectedRequest?.universityName}</p>
               </div>
            </div>

            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
               <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-3">
                  <Info className="w-4 h-4 text-slate-400" />
                  Audit Guidance
               </h4>
               <p className="text-[11px] font-bold text-slate-500 leading-relaxed uppercase tracking-tighter">
                  Review the center's academic interest, assign the appropriate architectural routing (University and Sub-Department), and certify the request for Finance review.
               </p>
            </div>

            <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1 flex items-center gap-2">
                       <Terminal className="w-3.5 h-3.5" />
                       Target University
                    </label>
                    <select 
                        value={assignedUniversityId}
                        disabled={isReadOnly}
                        onChange={(e) => setAssignedUniversityId(e.target.value)}
                        className={`w-full bg-slate-100 border rounded-xl px-4 py-2.5 text-sm font-bold transition-all ${isReadOnly ? 'opacity-70 cursor-not-allowed border-slate-200' : 'border-slate-100 focus:border-slate-900 focus:bg-white'}`}
                    >
                        <option value="">Select University...</option>
                        {entities.universities.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1 flex items-center gap-2">
                       <LinkIcon className="w-3.5 h-3.5" />
                       Operating Unit
                    </label>
                    <select 
                        value={assignedSubDeptId}
                        disabled={isReadOnly}
                        onChange={(e) => setAssignedSubDeptId(e.target.value)}
                        className={`w-full bg-slate-100 border rounded-xl px-4 py-2.5 text-sm font-bold transition-all ${isReadOnly ? 'opacity-70 cursor-not-allowed border-slate-200' : 'border-slate-100 focus:border-slate-900 focus:bg-white'}`}
                    >
                        <option value="">Select Unit...</option>
                        {entities.subDepts.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1 flex items-center gap-2">
                        <FileText className="w-3.5 h-3.5" />
                        Institutional Audit Remarks
                        {!isReadOnly && <span className="text-[8px] bg-rose-100 text-rose-600 px-1.5 py-0.5 rounded-full">Mandatory</span>}
                    </label>
                    <textarea 
                        value={remarks}
                        readOnly={isReadOnly}
                        onChange={(e) => setRemarks(e.target.value)}
                        className={`w-full bg-slate-50 border rounded-xl p-4 text-sm font-bold outline-none transition-all min-h-[100px] text-slate-900 ${isReadOnly ? 'opacity-70 cursor-not-allowed border-slate-200' : 'border-slate-200 focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900 shadow-sm'}`}
                        placeholder={isReadOnly ? "No additional remarks recorded." : "Enter detailed audit notes for protocol clearance..."}
                    />
                </div>
            </div>
          </div>

          <div className="pt-6 px-6 pb-6 border-t border-slate-100 bg-white">
            {!isReadOnly ? (
                <div className="flex justify-end gap-3">
                    <button 
                        onClick={() => setIsModalOpen(false)}
                        className="px-6 py-3 text-slate-500 font-bold text-[10px] uppercase tracking-widest hover:bg-slate-50 rounded-xl transition-all"
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
                        className="px-8 py-3 bg-slate-100 text-slate-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all"
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
