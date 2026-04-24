import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '@/lib/api';
import { DataTable } from '@/components/shared/DataTable';
import type { ColumnDef } from '@tanstack/react-table';
import { MapPin, Building2, GraduationCap, Zap, Mail, Phone, ArrowUpRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { toSentenceCase } from '@/lib/utils';
import { Modal } from '@/components/shared/Modal';
import { PageHeader } from '@/components/shared/PageHeader';

interface Center {
  id: number;
  name: string;
  status: string;
  auditStatus?: string;
  studentCount?: number;
  activePrograms?: number;
}

const formatCenterLocation = (center: { address?: string | null; city?: string | null; state?: string | null }) => {
  const parts = [center.address, center.city, center.state].filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : 'N/A';
};

export default function Centers() {
  const { unit } = useParams();
  const [centers, setCenters] = useState<Center[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCenter, setSelectedCenter] = useState<Center | null>(null);
  const [details, setDetails] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailsLoading, setIsDetailsLoading] = useState(false);

  const handleRowClick = async (row: any) => {
    const center = row.original;
    try {
      setSelectedCenter(center);
      setIsModalOpen(true);
      setIsDetailsLoading(true);
      const subDeptId = unit || null;

      const res = await api.get(`/operations/performance/centers/${center.id}/details`, {
        params: { subDeptId }
      });
      setDetails(res.data);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to fetch center intelligence data');
    } finally {
      setIsDetailsLoading(false);
    }
  };

  const fetchCenters = async () => {
    try {
      setIsLoading(true);
      const subDeptId = unit || null;
      
      const res = await api.get('/operations/performance/centers', {
        params: { subDeptId }
      });
      setCenters(res.data);
    } catch (error) {
      toast.error('Failed to fetch jurisdictional centers');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCenters();
  }, [unit]);

  const columns: ColumnDef<Center>[] = [
    { 
      accessorKey: 'name', 
      header: 'Center identity',
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400">
            <MapPin className="w-4 h-4" />
          </div>
          <span className="font-bold text-slate-900 uppercase tracking-tighter">{row.original.name}</span>
        </div>
      )
    },
    { 
      accessorKey: 'status', 
      header: 'Status',
      cell: ({ row }) => (
        <span className={`px-2 py-1 text-[10px] rounded-full font-bold uppercase ${row.original.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {row.original.status}
        </span>
      )
    },
    { 
      accessorKey: 'studentCount', 
      header: 'Active Students',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <span className="font-black text-lg text-slate-900">{row.original.studentCount || 0}</span>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Enrolled</span>
        </div>
      )
    },
    { 
      accessorKey: 'activePrograms', 
      header: 'Unit Programs',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <span className="font-black text-lg text-blue-600">{row.original.activePrograms || 0}</span>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Offered</span>
        </div>
      )
    },
    {
      id: 'performance',
      header: 'Performance Pulse',
      cell: ({ row }) => (
        <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
          <div 
            className="h-full bg-blue-600 rounded-full" 
            style={{ width: `${Math.min(100, ((row.original.studentCount || 0) / 50) * 100)}%` }}
          />
        </div>
      )
    }
  ];

  return (
    <div className="p-2 space-y-6 flex flex-col h-[calc(100vh-8rem)]">
      <PageHeader 
        title={`Mapped centers (${unit ? unit.toUpperCase() : 'UNIT'})`}
        description="Monitor and manage the performance of centers mapped to your operational unit."
        icon={MapPin}
      />

      <div className="flex-1 min-h-0 bg-white shadow-xl shadow-slate-200/50 border border-slate-100 rounded-[2rem] flex flex-col overflow-hidden">
        <DataTable 
          columns={columns} 
          data={centers} 
          isLoading={isLoading} 
          onRowClick={handleRowClick}
        />
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setDetails(null);
        }}
        maxWidth="4xl"
        title="Center Intelligence Audit"
      >
        {isDetailsLoading ? (
          <div className="p-20 flex flex-col items-center justify-center space-y-4">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Compiling Forensic Data...</p>
          </div>
        ) : details ? (
          <div className="p-2 space-y-8">
            {/* Header Identity */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 pb-6 border-b border-slate-100">
              <div className="flex items-center gap-5">
                <div className="w-20 h-20 rounded-3xl bg-slate-900 flex items-center justify-center text-white shadow-2xl shadow-slate-900/20">
                  <Building2 className="w-10 h-10" />
                </div>
                <div>
                  <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter leading-none mb-2">{details.center.name}</h2>
                  <div className="flex items-center gap-3">
                    <span className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-[10px] font-black uppercase tracking-widest border border-emerald-100">
                      {details.center.status}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 font-mono tracking-tighter uppercase">CID: NETWORK-{details.center.id}</span>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 p-4 rounded-2xl flex flex-col items-center justify-center text-center min-w-[120px]">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Students</span>
                  <span className="text-xl font-black text-slate-900">{selectedCenter?.studentCount || 0}</span>
                </div>
                <div className="bg-blue-50 p-4 rounded-2xl flex flex-col items-center justify-center text-center min-w-[120px]">
                  <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest mb-1">Programs</span>
                  <span className="text-xl font-black text-blue-600">{selectedCenter?.activePrograms || 0}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              {/* Institutional Mappings */}
              <div className="space-y-6">
                <div>
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                    <GraduationCap className="w-4 h-4 text-blue-600" />
                    Strategic Mappings
                  </h3>
                  <div className="space-y-3">
                    {details.mappings && details.mappings.length > 0 ? (
                      details.mappings.map((m: any, idx: number) => (
                        <div key={idx} className="group p-4 bg-white border border-slate-100 rounded-2xl hover:border-blue-200 hover:shadow-lg hover:shadow-blue-500/5 transition-all">
                          <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1">{m.program?.university?.name}</p>
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-bold text-slate-800 tracking-tight">{m.program?.name}</span>
                            <ArrowUpRight className="w-4 h-4 text-slate-300 group-hover:text-blue-600 transition-colors" />
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-8 border-2 border-dashed border-slate-100 rounded-3xl text-center">
                        <p className="text-xs font-bold text-slate-300 uppercase">No Active Jurisdictional Mappings</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Identity & Physical Contact */}
              <div className="space-y-6">
                <div>
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-500" />
                    Forensic Identity
                  </h3>
                  <div className="bg-slate-50 rounded-3xl p-6 space-y-5">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400">
                        <Mail className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Primary Correspondence</p>
                        <p className="text-sm font-bold text-slate-700">{details.center.email || 'N/A'}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400">
                        <Phone className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Institutional Line</p>
                        <p className="text-sm font-bold text-slate-700">{details.center.phone || 'N/A'}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400">
                        <MapPin className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Physical Jurisdiction</p>
                        <p className="text-sm font-bold text-slate-700 leading-tight">
                          {formatCenterLocation(details.center)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-600 rounded-[2rem] p-6 text-white flex items-center justify-between shadow-xl shadow-blue-500/20">
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-widest mb-1 italic">Network Health</h4>
                    <p className="text-lg font-black tracking-tight">Vetted Partner</p>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
                    <ArrowUpRight className="w-6 h-6" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
