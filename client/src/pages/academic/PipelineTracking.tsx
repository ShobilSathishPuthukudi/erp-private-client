import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { 
  GitPullRequest, 
  Clock, 
  CreditCard,
  Search,
  ArrowRight,
  UserCircle2,
  Layers
} from 'lucide-react';

const unitMap: { [key: number]: string } = {
  1: 'OpenSchool',
  2: 'Online',
  3: 'Skill',
  4: 'BVoc'
};

const unitColors: { [key: string]: string } = {
  'OpenSchool': 'text-blue-600 bg-blue-50',
  'Online': 'text-purple-600 bg-purple-50',
  'Skill': 'text-emerald-600 bg-emerald-50',
  'BVoc': 'text-rose-600 bg-rose-50'
};

export default function PipelineTracking() {
  const [pipeline, setPipeline] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedUnit, setSelectedUnit] = useState<number | 'all'>('all');

  useEffect(() => {
    const fetchPipeline = async () => {
      try {
        const res = await api.get('/operations/pipeline');
        setPipeline(res.data);
      } catch (error) {
        console.error('Pipeline sync failure:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchPipeline();
  }, []);

  const stages = [
    { id: 'SUB_DEPT', label: 'Unit Pending', icon: Clock, color: 'bg-amber-500' },
    { id: 'OPS', label: 'Ops Pending', icon: Search, color: 'bg-blue-500' },
    { id: 'FINANCE', label: 'Finance Pending', icon: CreditCard, color: 'bg-indigo-500' },
    { id: 'ENROLLED', label: 'Institutional Activated', icon: GitPullRequest, color: 'bg-slate-900' },
  ];

  const getFilteredPipeline = (stageId: string) => {
    let filtered = pipeline.filter(p => p.reviewStage === stageId || p.enrollStatus === stageId);
    if (selectedUnit !== 'all') {
      filtered = filtered.filter(p => p.subDepartmentId === selectedUnit);
    }
    return filtered;
  };

  return (
    <div className="p-8 space-y-8 max-w-[2000px] mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Admission Pipeline</h1>
          <p className="text-slate-500 font-medium tracking-tight">Visualizing institutional student flow across regulatory gateways.</p>
        </div>
        <div className="flex items-center gap-3">
            <select 
                value={selectedUnit}
                onChange={(e) => setSelectedUnit(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
                className="bg-white border border-slate-200 px-4 py-2 rounded-xl text-xs font-black uppercase text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500"
            >
                <option value="all">Global Architecture</option>
                {Object.entries(unitMap).map(([id, name]) => (
                    <option key={id} value={id}>{name} Unit</option>
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
                 <span className="bg-slate-900 text-white px-3 py-1 rounded-lg text-[10px] font-black tracking-tighter shadow-lg shadow-slate-100">{count}</span>
              </div>
              
              <div className="bg-slate-50 rounded-[2.5rem] p-4 min-h-[600px] border border-slate-200/50 space-y-4">
                 {isLoading ? (
                    <div className="space-y-4">
                       {[1, 2, 3].map(i => (
                         <div key={i} className="h-24 w-full bg-white rounded-3xl animate-pulse" />
                       ))}
                    </div>
                 ) : stageItems.length > 0 ? (
                    <div className="space-y-3">
                       {stageItems.map((item, i) => {
                          const unitName = unitMap[item.subDepartmentId] || 'Cross-Dept';
                          const cardColor = unitColors[unitName] || 'text-slate-600 bg-slate-50';
                          return (
                            <div key={i} className="p-5 bg-white rounded-[2rem] border border-slate-200 shadow-sm hover:shadow-xl hover:shadow-indigo-500/10 transition-all group cursor-pointer border-l-4 border-l-slate-900">
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
    </div>
  );
}
