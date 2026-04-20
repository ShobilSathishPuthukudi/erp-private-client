import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Link } from 'react-router-dom';
import { 
  GitPullRequest, 
  Clock, 
  CreditCard,
  Search,
  ArrowRight,
  UserCircle2,
  Layers,
  ShieldCheck,
  Activity,
  X,
  FileText,
  Building2,
  Compass
} from 'lucide-react';
import { Modal } from '@/components/shared/Modal';

const colorByCanonical: { [key: string]: string } = {
  'Open School': 'text-blue-600 bg-blue-50',
  'Online': 'text-purple-600 bg-purple-50',
  'Skill': 'text-emerald-600 bg-emerald-50',
  'BVoc': 'text-rose-600 bg-rose-50'
};

interface SubDepartmentUnit {
  id: number;
  name: string;
  matchingIds: number[];
}

export default function PipelineTracking() {
  const [pipeline, setPipeline] = useState<any[]>([]);
  const [units, setUnits] = useState<SubDepartmentUnit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedUnit, setSelectedUnit] = useState<number | 'all'>('all');

  // Drill-down state
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [selectedDetails, setSelectedDetails] = useState<any[]>([]);
  const [activeStageLabel, setActiveStageLabel] = useState('');

  useEffect(() => {
    const fetchPipeline = async () => {
      try {
        const res = await api.get('/operations/pipeline');
        const payload = Array.isArray(res.data) ? { stats: res.data, subDepartments: [] } : res.data;
        setPipeline(payload.stats || []);
        setUnits(payload.subDepartments || []);
      } catch (error) {
        console.error('Pipeline sync failure:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchPipeline();
  }, []);

  const resolveUnitName = (subDepartmentId: number | null | undefined) => {
    if (subDepartmentId == null) return 'Cross-Dept';
    const match = units.find(u => u.matchingIds.includes(Number(subDepartmentId)));
    return match?.name || 'Cross-Dept';
  };

  const handleDrillDown = async (item: any, stageLabel: string) => {
    setActiveStageLabel(stageLabel);
    setIsDetailsOpen(true);
    setDetailsLoading(true);
    try {
      const params = new URLSearchParams();
      if (item.reviewStage) params.append('reviewStage', item.reviewStage);
      if (item.enrollStatus) params.append('enrollStatus', item.enrollStatus);
      if (item.subDepartmentId) params.append('subDepartmentId', item.subDepartmentId.toString());
      
      const res = await api.get(`/operations/pipeline/details?${params.toString()}`);
      setSelectedDetails(res.data);
    } catch (error) {
      console.error('Drill-down telemetry failure:', error);
    } finally {
      setDetailsLoading(false);
    }
  };

  const stages = [
    { id: 'SUB_DEPT', label: 'Unit Pending', icon: Clock, color: 'bg-amber-500' },
    { id: 'OPS', label: 'Ops Pending', icon: Search, color: 'bg-blue-500' },
    { id: 'FINANCE', label: 'Finance Pending', icon: CreditCard, color: 'bg-indigo-500' },
    { id: 'ENROLLED', label: 'Institutional Activated', icon: GitPullRequest, color: 'bg-slate-900' },
  ];

  const getFilteredPipeline = (stageId: string) => {
    let filtered = pipeline.filter(p => {
      const isEnrolled = p.enrollStatus === 'enrolled' || p.enrollStatus === 'active';
      if (stageId === 'ENROLLED') return isEnrolled;
      return p.reviewStage === stageId && !isEnrolled;
    });
    if (selectedUnit !== 'all') {
      const selected = units.find(u => u.id === selectedUnit);
      const allowed = new Set(selected?.matchingIds || [selectedUnit]);
      filtered = filtered.filter(p => allowed.has(Number(p.subDepartmentId)));
    }
    return filtered;
  };

  return (
    <div className="p-2 space-y-6 flex flex-col h-[calc(100vh-8rem)]">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white px-6 py-5 rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50 gap-6 shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center text-white shadow-lg shadow-slate-900/20 shrink-0">
            <Compass className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight leading-tight mb-0.5">Admission pipeline</h1>
            <p className="text-slate-500 font-medium text-sm">Visualizing institutional student flow across regulatory gateways.</p>
          </div>
        </div>
        <div className="flex items-center gap-3 bg-white p-2 rounded-2xl border border-slate-200">
            <select 
                value={selectedUnit}
                onChange={(e) => setSelectedUnit(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
                className="bg-slate-50 border-none px-4 py-2 rounded-xl text-xs font-black uppercase text-slate-700 outline-none focus:ring-2 focus:ring-slate-900/5 transition-all"
            >
                <option value="all">Global Architecture</option>
                {units.map(u => (
                    <option key={u.id} value={u.id}>{u.name} Unit</option>
                ))}
            </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stages.map((stage) => {
          const stageItems = getFilteredPipeline(stage.id);
          const count = stageItems.reduce((acc, curr) => acc + parseInt(curr.count), 0);
          
          return (
            <div key={stage.id} className="flex flex-col gap-6">
              <div className="flex items-center justify-between px-2">
                 <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${stage.color}`} />
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{stage.label}</span>
                 </div>
                 <span className="bg-slate-800 border border-slate-700 text-white px-3 py-1 rounded-lg text-[10px] font-black tracking-tighter shadow-lg shadow-slate-900/20">{count}</span>
              </div>
              
              <div className="bg-slate-50 rounded-3xl p-4 min-h-[600px] border border-slate-200/50 space-y-4">
                 {isLoading ? (
                    <div className="space-y-4">
                       {[1, 2, 3].map(i => (
                         <div key={i} className="h-24 w-full bg-white rounded-2xl animate-pulse" />
                       ))}
                    </div>
                 ) : stageItems.length > 0 ? (
                    <div className="space-y-3">
                       {stageItems.map((item, i) => {
                          const unitName = resolveUnitName(item.subDepartmentId);
                          const cardColor = colorByCanonical[unitName] || 'text-slate-600 bg-slate-50';
                          return (
                            <div 
                                key={i} 
                                onClick={() => handleDrillDown(item, stage.label)}
                                className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl hover:shadow-indigo-500/10 transition-all group cursor-pointer border-l-4 border-l-slate-900"
                            >
                                <div className="flex items-center justify-between mb-4">
                                    <div className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest ${cardColor}`}>
                                        {unitName}
                                    </div>
                                    <Layers className="w-3 h-3 text-slate-300 group-hover:text-indigo-500 transition-colors" />
                                </div>
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center border border-slate-100">
                                        <UserCircle2 className="w-6 h-6 text-slate-300" />
                                    </div>
                                    <div>
                                        <p className="text-xl font-black text-slate-900 tracking-tighter leading-none">{item.count}</p>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Active Nodes</p>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                                   <span className="text-[9px] font-black uppercase text-indigo-500 tracking-widest">In Pipeline</span>
                                   <ArrowRight className="w-4 h-4 text-slate-900 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                                </div>
                            </div>
                          );
                       })}
                    </div>
                 ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-300 opacity-20 py-20">
                       <stage.icon className="w-16 h-16 mb-4" />
                       <p className="text-[10px] font-black uppercase tracking-[0.3em]">Queue Vacuum</p>
                    </div>
                 )}
              </div>
            </div>
          );
        })}
      </div>

      <Modal
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        title={`Institutional Node Details — ${activeStageLabel}`}
        maxWidth="xl"
      >
        <div className="space-y-6">
            <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="bg-slate-900 p-3 rounded-2xl text-white shadow-lg shadow-slate-900/20">
                        <Activity className="w-6 h-6" />
                    </div>
                    <div>
                        <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest leading-none mb-1">Pipeline Telemetry</h3>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">Active Student Manifest for current gateway stage.</p>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-2xl font-black text-slate-900 leading-none">{selectedDetails.length}</p>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Nodes Analyzed</p>
                </div>
            </div>

            <div className="max-h-[500px] overflow-y-auto pr-2 space-y-3 custom-scrollbar">
                {detailsLoading ? (
                    [1, 2, 3].map(i => (
                        <div key={i} className="h-20 w-full bg-slate-50 rounded-2xl animate-pulse" />
                    ))
                ) : selectedDetails.length > 0 ? (
                    selectedDetails.map((student, idx) => (
                        <div key={idx} className="p-4 bg-white border border-slate-100 rounded-2xl hover:border-indigo-200 hover:shadow-lg hover:shadow-indigo-500/5 transition-all group flex items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center border border-slate-100 group-hover:bg-indigo-50 transition-colors">
                                    <UserCircle2 className="w-7 h-7 text-slate-300 group-hover:text-indigo-400" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <Link to={`/dashboard/academic/students/${student.id}`} className="font-black text-slate-900 tracking-tight leading-none hover:text-indigo-600 transition-colors">{student.name}</Link>
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">ID: {student.id}</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-tight">
                                            <Compass className="w-3 h-3 text-slate-400" />
                                            {student.program?.shortName || student.program?.name}
                                        </div>
                                        <div className="w-1 h-1 rounded-full bg-slate-200" />
                                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-tight">
                                            <Building2 className="w-3 h-3 text-slate-400" />
                                            {student.program?.university?.shortName || student.program?.university?.name}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-[10px] font-black uppercase tracking-widest border border-emerald-100">
                                    {student.status.replace(/_/g, ' ')}
                                </div>
                                <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-500 transition-all group-hover:translate-x-1" />
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="py-20 flex flex-col items-center justify-center opacity-30 grayscale">
                        <FileText className="w-12 h-12 text-slate-300 mb-4" />
                        <p className="text-[10px] font-black uppercase tracking-[0.3em]">No node metadata salvaged</p>
                    </div>
                )}
            </div>

            <div className="pt-6 border-t border-slate-100 flex justify-end">
                <button
                  onClick={() => setIsDetailsOpen(false)}
                  className="px-8 py-3 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-slate-800 transition-all active:scale-95 shadow-lg shadow-slate-900/10"
                >
                  Close Insight
                </button>
            </div>
        </div>
      </Modal>
    </div>
  );
}
