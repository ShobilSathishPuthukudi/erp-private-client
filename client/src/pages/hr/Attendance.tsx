import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { DataTable } from '@/components/shared/DataTable';
import type { ColumnDef } from '@tanstack/react-table';
import { Download, Clock, CalendarDays } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { format, subDays } from 'date-fns';
import { toSentenceCase } from '@/lib/utils';

interface ShiftLog {
  id: string;
  name: string;
  department: string;
  date: string;
  checkIn: string;
  checkOut: string;
  status: 'present' | 'absent' | 'late' | 'half-day';
  hoursLogged: number;
}

export default function Attendance() {
  const [logs, setLogs] = useState<ShiftLog[]>([]);
  const [loading, setLoading] = useState(true);

  // Generate hyper-realistic synthetic data for the MVP presentation
  useEffect(() => {
    // In a production environment, this would call /api/hr/attendance
    // For MVP phase 14, we render the timesheet structure using mock generators targeting realistic UI data types
    setTimeout(() => {
      const generateMockLogs = (): ShiftLog[] => {
        const statuses: ('present' | 'absent' | 'late' | 'half-day')[] = ['present', 'present', 'present', 'late', 'absent', 'half-day'];
        const depts = ['Academics', 'Sales', 'IT Support', 'Finance', 'Human Resources'];
        const names = ['John Smith', 'Sarah Jenkins', 'Michael Chang', 'Emily Rodriguez', 'David Kim', 'Jessica Taylor', 'Robert Vance'];
        
        let mockData: ShiftLog[] = [];
        let idCounter = 1000;
        
        // Generate logs for the past 3 days
        for(let d = 0; d < 3; d++) {
          const logDate = format(subDays(new Date(), d), 'yyyy-MM-dd');
          
          for(let i = 0; i < 15; i++) {
            const status = statuses[Math.floor(Math.random() * statuses.length)];
            
            // Calc randomized times based on status
            const inHour = status === 'late' ? 9 + Math.floor(Math.random() * 2) : 8;
            const inMin = Math.floor(Math.random() * 59).toString().padStart(2, '0');
            const checkIn = status === 'absent' ? '--:--' : `${inHour.toString().padStart(2, '0')}:${inMin}`;
            
            const outHour = status === 'half-day' ? 12 + Math.floor(Math.random() * 2) : 17;
            const outMin = Math.floor(Math.random() * 59).toString().padStart(2, '0');
            const checkOut = status === 'absent' ? '--:--' : `${outHour.toString().padStart(2, '0')}:${outMin}`;
            
            let hours = 0;
            if (status !== 'absent') {
               hours = outHour - inHour + ((Number(outMin) - Number(inMin)) / 60);
               hours = Math.round(hours * 10) / 10;
            }

            mockData.push({
              id: `ATT-${idCounter++}`,
              name: names[Math.floor(Math.random() * names.length)],
              department: depts[Math.floor(Math.random() * depts.length)],
              date: logDate,
              checkIn,
              checkOut,
              status,
              hoursLogged: hours
            });
          }
        }
        return mockData;
      };

      setLogs(generateMockLogs());
      setLoading(false);
    }, 600);
  }, []);

  const handleExport = () => {
    toast.success('Timesheet exported to CSV (Simulated)');
  };

  const columns: ColumnDef<ShiftLog>[] = [
    { 
      accessorKey: 'name', 
      header: 'Employee name',
      cell: ({ row }) => <span className="font-semibold text-slate-900">{toSentenceCase(row.original.name)}</span>
    },
    { 
      accessorKey: 'department', 
      header: 'Department',
      cell: ({ row }) => toSentenceCase(row.original.department)
    },
    { 
      accessorKey: 'date', 
      header: 'Date',
      cell: ({ row }) => <span className="text-slate-600">{format(new Date(row.original.date), 'MMM dd, yyyy')}</span>
    },
    { 
      accessorKey: 'checkIn', 
      header: 'Check in',
      cell: ({ row }) => (
        <span className={`font-mono text-xs ${row.original.checkIn === '--:--' ? 'text-slate-300' : 'text-slate-600'}`}>
          {row.original.checkIn}
        </span>
      )
    },
    { 
      accessorKey: 'checkOut', 
      header: 'Check out',
      cell: ({ row }) => (
        <span className={`font-mono text-xs ${row.original.checkOut === '--:--' ? 'text-slate-300' : 'text-slate-600'}`}>
          {row.original.checkOut}
        </span>
      )
    },
    { 
      accessorKey: 'hoursLogged', 
      header: 'Hours',
      cell: ({ row }) => (
        <span className="font-semibold text-slate-700">
          {row.original.hoursLogged > 0 ? `${row.original.hoursLogged}h` : '-'}
        </span>
      )
    },
    { 
      accessorKey: 'status', 
      header: 'Status',
      cell: ({ row }) => {
        const s = row.original.status;
        const colors = {
          present: 'bg-emerald-100 text-emerald-700',
          absent: 'bg-red-100 text-red-700',
          late: 'bg-amber-100 text-amber-700',
          'half-day': 'bg-blue-100 text-blue-700'
        };
        return (
          <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${colors[s]}`}>
            {toSentenceCase(s)}
          </span>
        );
      }
    }
  ];

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Attendance & Shifts"
        description="Monitor employee biometric clock inputs and timesheet logs across the organization."
        icon={Clock}
        action={
          <button 
            onClick={handleExport}
            className="bg-white border text-slate-700 border-slate-300 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors flex items-center shadow-sm whitespace-nowrap"
          >
            <Download className="w-4 h-4 mr-2" />
            Export Timesheets
          </button>
        }
      />

      {/* KPI Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-emerald-100 p-5 flex items-center">
           <div className="w-12 h-12 bg-emerald-50 rounded-lg text-emerald-500 flex items-center justify-center mr-4">
             <CalendarDays className="w-6 h-6" />
           </div>
           <div>
             <p className="text-sm font-medium text-slate-500 mb-0.5">Today's Attendance</p>
             <h3 className="text-2xl font-bold text-slate-900">94.2%</h3>
           </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-amber-100 p-5 flex items-center">
           <div className="w-12 h-12 bg-amber-50 rounded-lg text-amber-500 flex items-center justify-center mr-4">
             <Clock className="w-6 h-6" />
           </div>
           <div>
             <p className="text-sm font-medium text-slate-500 mb-0.5">Currently Late</p>
             <h3 className="text-2xl font-bold text-slate-900">12</h3>
           </div>
        </div>
      </div>

      {/* Main Data Table */}
      <div className="bg-white border rounded-xl shadow-sm border-slate-200">
         <DataTable 
           columns={columns} 
           data={logs} 
           isLoading={loading} 
           searchKey="name" 
           searchPlaceholder="Search timesheets by employee name..." 
         />
      </div>
      <p className="text-xs text-center text-slate-400 mt-2">Data is simulated natively for structural integration demonstration.</p>
    </div>
  );
}
