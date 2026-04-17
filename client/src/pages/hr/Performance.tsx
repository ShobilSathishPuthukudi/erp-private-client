import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { DataTable } from '@/components/shared/DataTable';
import type { ColumnDef } from '@tanstack/react-table';
import { Target, AlertCircle, CheckCircle2, Clock, TrendingUp } from 'lucide-react';
import toast from 'react-hot-toast';
import { PageHeader } from '@/components/shared/PageHeader';
import { toSentenceCase } from '@/lib/utils';

interface PerformanceMetric {
  uid: string;
  name: string;
  role?: string;
  metrics: {
    taskCompletionRate: string;
    delayCount: number;
    totalTasks: number;
    agedPendingLeaves: number;
    productivityScore: number;
  };
}

export default function Performance() {
  const [data, setData] = useState<PerformanceMetric[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'employees' | 'admins'>('employees');

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const employeesRes = await api.get('/hr/employees');
      
      // Filter irrelevant core entity roles from structural HR assessment
      const validStaff = employeesRes.data.filter((e: any) => {
        const r = e.role?.toLowerCase() || '';
        return !['ceo', 'partner center', 'student'].includes(r);
      });

      const metricsPromises = validStaff.map((emp: any) => 
        api.get(`/hr/performance/employee/${emp.uid}`)
          .then(res => ({
            ...res.data,
            metrics: {
              ...res.data.metrics,
              delayCount: res.data.metrics.delayCount || 0,
              agedPendingLeaves: res.data.metrics.agedPendingLeaves || 0,
              productivityScore: res.data.metrics.productivityScore ?? 100
            },
            uid: emp.uid,
            name: emp.name,
            role: emp.role
          }))
          .catch(() => ({
            uid: emp.uid,
            name: emp.name,
            role: emp.role,
            metrics: { taskCompletionRate: '0', delayCount: 0, totalTasks: 0, agedPendingLeaves: 0, productivityScore: 0 }
          }))
      );

      const metrics = await Promise.all(metricsPromises);
      setData(metrics);
    } catch (error) {
      toast.error('Failed to fetch performance metrics');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const columns: ColumnDef<PerformanceMetric>[] = [
    { accessorKey: 'uid', header: 'Emp Id' },
    { 
      accessorKey: 'name', 
      header: 'Employee',
      cell: ({ row }) => toSentenceCase(row.original.name)
    },
    { 
      id: 'completion',
      header: 'Task completion rate',
      cell: ({ row }) => {
        const rate = parseFloat(row.original.metrics.taskCompletionRate);
        return (
          <div className="flex items-center space-x-2 w-48">
            <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-500 ${
                  rate >= 80 ? 'bg-green-500' : rate >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                }`}
                style={{ width: `${rate}%` }}
              />
            </div>
            <span className="text-xs font-bold text-slate-700">{rate}%</span>
          </div>
        );
      }
    },
    { 
      id: 'delays',
      header: 'Delays',
      cell: ({ row }) => (
        <span className={`px-2 py-1 rounded text-xs font-bold ${
          row.original.metrics.delayCount > 0 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
        }`}>
          {row.original.metrics.delayCount} delays
        </span>
      )
    },
    {
      id: 'leaveRisk',
      header: 'Leave Risk',
      cell: ({ row }) => (
        <span className={`px-2 py-1 rounded text-xs font-bold ${
          row.original.metrics.agedPendingLeaves > 0 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
        }`}>
          {row.original.metrics.agedPendingLeaves} aged leaves
        </span>
      )
    },
    {
      id: 'score',
      header: 'Productivity Score',
      cell: ({ row }) => {
        const score = row.original.metrics.productivityScore;
        return (
          <span className={`px-2 py-1 rounded text-xs font-bold ${
            score >= 85 ? 'bg-emerald-100 text-emerald-700' : score >= 60 ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'
          }`}>
            {score}
          </span>
        );
      }
    },
    {
      id: 'status',
      header: 'Accountability rank',
      cell: ({ row }) => {
        const score = row.original.metrics.productivityScore;
        if (score >= 90) return <span className="text-green-600 flex items-center gap-1 text-xs font-bold font-mono"><CheckCircle2 className="w-3 h-3"/> Elite</span>;
        if (score >= 70) return <span className="text-blue-600 flex items-center gap-1 text-xs font-bold font-mono"><Target className="w-3 h-3"/> Efficient</span>;
        return <span className="text-orange-600 flex items-center gap-1 text-xs font-bold font-mono"><Clock className="w-3 h-3"/> Needs review</span>;
      }
    }
  ];

  const displayData = data.filter(d => 
    activeTab === 'employees'
      ? !d.role?.toLowerCase().includes('admin')
      : d.role?.toLowerCase().includes('admin')
  );

  return (
    <div className="p-6 space-y-6 flex flex-col h-[calc(100vh-8rem)]">
      <PageHeader 
        title="Performance Metrics"
        description="Real-time oversight of institutional productivity and task accountability"
        icon={TrendingUp}
        action={
          <div className="flex items-center space-x-3 bg-red-50 border border-red-100 px-4 py-2 rounded-lg text-red-700">
             <AlertCircle className="w-5 h-5" />
             <div className="text-[10px] md:text-xs">
                <p className="font-bold whitespace-nowrap">Goal: 85% Completion min.</p>
                <p className="font-medium opacity-80">Monitoring {displayData.length} {activeTab}</p>
             </div>
          </div>
        }
      />

      <div className="flex-1 bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden flex flex-col min-h-0">
        <div className="p-4 border-b border-slate-100 shrink-0 bg-white flex justify-end">
           <div className="inline-flex bg-slate-50 p-1 rounded-xl shadow-inner border border-slate-200/50">
             <button 
               onClick={() => setActiveTab('employees')}
               className={`py-2 px-6 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all duration-200 hover:scale-105 active:scale-95 ${
                 activeTab === 'employees' 
                   ? 'bg-white text-slate-900 shadow-sm border border-slate-200' 
                   : 'text-slate-400 hover:text-slate-600'
               }`}
             >
               Employees
             </button>
             <button 
               onClick={() => setActiveTab('admins')}
               className={`py-2 px-6 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all duration-200 hover:scale-105 active:scale-95 ${
                 activeTab === 'admins' 
                   ? 'bg-white text-slate-900 shadow-sm border border-slate-200' 
                   : 'text-slate-400 hover:text-slate-600'
               }`}
             >
               Administrators
             </button>
           </div>
        </div>
        <div className="flex-1 overflow-auto">
          <DataTable 
            columns={columns} 
            data={displayData} 
            isLoading={isLoading} 
            searchKey="name"
            searchPlaceholder={`Audit ${activeTab} performance...`}
          />
        </div>
      </div>
    </div>
  );
}
