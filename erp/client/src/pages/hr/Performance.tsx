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
  metrics: {
    taskCompletionRate: string;
    delayCount: number;
    totalTasks: number;
  };
}

export default function Performance() {
  const [data, setData] = useState<PerformanceMetric[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const employeesRes = await api.get('/hr/employees');
      const employees = employeesRes.data;

      const metricsPromises = employees.map((emp: any) => 
        api.get(`/hr/performance/employee/${emp.uid}`).then(res => ({
          ...res.data,
          uid: emp.uid, // Map uid for DataTable consistency
          name: emp.name
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
      id: 'status',
      header: 'Accountability rank',
      cell: ({ row }) => {
        const rate = parseFloat(row.original.metrics.taskCompletionRate);
        if (rate >= 90) return <span className="text-green-600 flex items-center gap-1 text-xs font-bold font-mono"><CheckCircle2 className="w-3 h-3"/> Elite</span>;
        if (rate >= 70) return <span className="text-blue-600 flex items-center gap-1 text-xs font-bold font-mono"><Target className="w-3 h-3"/> Efficient</span>;
        return <span className="text-orange-600 flex items-center gap-1 text-xs font-bold font-mono"><Clock className="w-3 h-3"/> Needs review</span>;
      }
    }
  ];

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
                <p className="font-medium opacity-80">Monitoring {data.length} staff</p>
             </div>
          </div>
        }
      />

      <div className="flex-1 bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden flex flex-col">
        <DataTable 
          columns={columns} 
          data={data} 
          isLoading={isLoading} 
          searchKey="name"
          searchPlaceholder="Audit staff performance..."
        />
      </div>
    </div>
  );
}
