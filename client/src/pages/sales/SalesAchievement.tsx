import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { CheckCircle2, Clock3, Target, Users } from 'lucide-react';
import { DrillDownModal } from '@/components/shared/DrillDownModal';

type WorkflowTarget = {
  id: number;
  title: string;
  workflowStatus: string;
  assignments?: { id: number; status: string }[];
};

export default function SalesAchievement() {
  const [targets, setTargets] = useState<WorkflowTarget[]>([]);
  const [loading, setLoading] = useState(true);
  const [drillDown, setDrillDown] = useState<{ isOpen: boolean; type: string; title: string; data: any[] }>({
    isOpen: false,
    type: '',
    title: '',
    data: []
  });

  const openDrillDown = (type: string, title: string, filteredData: any[]) => {
    setDrillDown({
      isOpen: true,
      type,
      title,
      data: filteredData.map(t => ({
        id: t.id,
        name: t.title,
        status: t.workflowStatus,
        createdAt: new Date().toISOString() // Fallback if not provided
      }))
    });
  };

  useEffect(() => {
    const fetchTargets = async () => {
      try {
        const res = await api.get('/targets/sales-admin/targets');
        setTargets(res.data || []);
      } catch {
        console.error('Failed to load sales target workflow summary');
      } finally {
        setLoading(false);
      }
    };

    fetchTargets();
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((item) => (
          <div key={item} className="h-64 animate-pulse rounded-[2rem] border-2 border-slate-100 bg-slate-50" />
        ))}
      </div>
    );
  }

  const cards = [
    {
      title: 'Awaiting approval',
      value: targets.filter((target) => target.workflowStatus === 'pending_sales_admin').length,
      subtitle: 'Targets waiting for Sales Admin verification',
      icon: Clock3,
      tone: 'amber',
      type: 'pending_approval',
      data: targets.filter((target) => target.workflowStatus === 'pending_sales_admin')
    },
    {
      title: 'Assigned targets',
      value: targets.filter((target) => target.workflowStatus === 'assigned').length,
      subtitle: 'Targets already assigned to sales employees',
      icon: Users,
      tone: 'blue',
      type: 'assigned',
      data: targets.filter((target) => target.workflowStatus === 'assigned')
    },
    {
      title: 'Completed targets',
      value: targets.filter((target) => target.workflowStatus === 'completed').length,
      subtitle: 'Targets fully completed and ready for oversight',
      icon: CheckCircle2,
      tone: 'emerald',
      type: 'completed',
      data: targets.filter((target) => target.workflowStatus === 'completed')
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div 
            key={card.title} 
            onClick={() => openDrillDown(card.type, card.title, card.data)}
            className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm cursor-pointer hover:shadow-md transition-all hover:-translate-y-1"
          >
            <div className="mb-6 flex items-start justify-between">
              <div className={`rounded-2xl p-4 ${card.tone === 'amber' ? 'bg-amber-50 text-amber-600' : card.tone === 'blue' ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'}`}>
                <Icon className="h-5 w-5" />
              </div>
              <Target className="h-5 w-5 text-slate-300" />
            </div>

            <p className="text-4xl font-black tracking-tighter text-slate-900">{card.value}</p>
            <p className="mt-3 text-sm font-bold tracking-[0.2em] text-slate-500">{card.title}</p>
            <p className="mt-2 text-sm leading-6 text-slate-500">{card.subtitle}</p>
          </div>
        );
      })}

      <DrillDownModal
        isOpen={drillDown.isOpen}
        onClose={() => setDrillDown({ ...drillDown, isOpen: false })}
        type={drillDown.type}
        title={drillDown.title}
        dataOverride={drillDown.data}
      />
    </div>
  );
}
