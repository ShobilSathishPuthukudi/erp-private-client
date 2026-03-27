import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { DataTable } from '@/components/shared/DataTable';
import type { ColumnDef } from '@tanstack/react-table';
import { Target, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import toast from 'react-hot-toast';

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
        api.get(`/hr/performance/${emp.uid}`).then(res => ({
          ...res.data,
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
    { accessorKey: 'uid', header: 'Emp ID' },
    { accessorKey: 'name', header: 'Employee' },
    { 
      id: 'completion',
      header: 'Task Completion Rate',
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
      header: 'Delay Count',
      cell: ({ row }) => (
        <span className={`px-2 py-1 rounded text-xs font-bold ${
          row.original.metrics.delayCount > 0 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
        }`}>
          {row.original.metrics.delayCount} Delays
        </span>
      )
    },
    {
      id: 'status',
      header: 'Accountability Rank',
      cell: ({ row }) => {
        const rate = parseFloat(row.original.metrics.taskCompletionRate);
        if (rate >= 90) return <span className="text-green-600 flex items-center gap-1 text-xs font-bold font-mono uppercase"><CheckCircle2 className="w-3 h-3"/> Elite</span>;
        if (rate >= 70) return <span className="text-blue-600 flex items-center gap-1 text-xs font-bold font-mono uppercase"><Target className="w-3 h-3"/> Efficient</span>;
        return <span className="text-orange-600 flex items-center gap-1 text-xs font-bold font-mono uppercase"><Clock className="w-3 h-3"/> Needs Review</span>;
      }
    }
  ];

  return (
    <div className="p-6 space-y-6 flex flex-col h-[calc(100vh-8rem)]">
      <div className="flex justify-between items-center shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Performance Metrics</h1>
          <p className="text-slate-500 font-medium">Real-time oversight of institutional productivity and task accountability</p>
        </div>
        <div className="flex items-center space-x-3 bg-red-50 border border-red-100 px-4 py-2 rounded-lg text-red-700">
           <AlertCircle className="w-5 h-5" />
           <div className="text-xs">
              <p className="font-bold">Institutional Goal: 85% Completion Minimum</p>
              <p className="font-medium opacity-80">Currently monitoring {data.length} staff members</p>
           </div>
        </div>
      </div>

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
