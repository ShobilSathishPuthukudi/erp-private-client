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
  ExternalLink
} from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import toast from 'react-hot-toast';

interface Center {
  id: number;
  name: string;
  type: string;
  status: 'active' | 'inactive';
  auditStatus: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
  infrastructureDetails?: any;
  createdAt: string;
  websiteUrl?: string;
}

export default function CenterAudit() {
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [centers, setCenters] = useState<Center[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCenter, setSelectedCenter] = useState<Center | null>(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [selectedUnits, setSelectedUnits] = useState<string[]>([]);

  const fetchCenters = async () => {
    setIsLoading(true);
    try {
      const endpoint = activeTab === 'pending' ? '/operations/centers/pending' : '/operations/centers/approved'; // Rejected handled locally or via param
      const res = await api.get(endpoint);
      setCenters(res.data);
    } catch (error) {
      toast.error('Failed to fetch centers for audit');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCenters();
  }, [activeTab]);

  const handleAudit = async (status: 'approved' | 'rejected') => {
    if (status === 'rejected' && !rejectionReason) {
      toast.error('Rejection reason is mandatory');
      return;
    }

    try {
      await api.put(`/operations/centers/${selectedCenter?.id}/audit`, {
        status,
        reason: rejectionReason,
        subDepartments: selectedUnits
      });
      toast.success(`Center ${status} successfully`);
      setIsReviewModalOpen(false);
      setSelectedCenter(null);
      setRejectionReason('');
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
      id: 'actions',
      header: 'Institutional Review',
      cell: ({ row }) => (
        <button 
          onClick={() => {
            setSelectedCenter(row.original);
            setIsReviewModalOpen(true);
          }}
          className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-indigo-600 transition-all active:scale-95 flex items-center gap-2"
        >
          <ShieldCheck className="w-3 h-3" />
          Conduct Audit
        </button>
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
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Center Type</p>
                    <p className="font-bold text-slate-900">{selectedCenter?.type || 'Standard'}</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Website</p>
                    <a href={selectedCenter?.websiteUrl} target="_blank" className="font-bold text-blue-600 flex items-center gap-1">
                        Visit Portal <ExternalLink className="w-3 h-3" />
                    </a>
                </div>
            </div>

            <div className="bg-indigo-50 p-6 rounded-2xl border border-indigo-100 space-y-4">
                <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest flex items-center gap-2">
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

            <div className="space-y-4 bg-slate-50 p-6 rounded-2xl border border-slate-100">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Assign Operational Units</label>
                <div className="grid grid-cols-2 gap-3">
                    {['OpenSchool', 'Online', 'Skill', 'BVoc'].map(unit => (
                        <label key={unit} className="flex items-center gap-3 bg-white p-3 rounded-xl border border-slate-200 cursor-pointer hover:border-indigo-300 transition-colors">
                            <input 
                                type="checkbox"
                                checked={selectedUnits.includes(unit)}
                                onChange={(e) => {
                                    if (e.target.checked) setSelectedUnits([...selectedUnits, unit]);
                                    else setSelectedUnits(selectedUnits.filter((u: string) => u !== unit));
                                }}
                                className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                            />
                            <span className="text-sm font-bold text-slate-700">{unit}</span>
                        </label>
                    ))}
                </div>
            </div>

            <div className="space-y-4">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Audit Decision Remarks</label>
                <textarea 
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Enter rejection reason if applicable..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500 min-h-[100px]"
                />
            </div>

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
                    className="px-8 py-3 bg-slate-900 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-xl shadow-slate-200 flex items-center gap-2"
                >
                    <CheckCircle2 className="w-4 h-4" />
                    Ratify Center
                </button>
            </div>
        </div>
      </Modal>
    </div>
  );
}
