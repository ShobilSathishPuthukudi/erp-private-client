import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { DataTable } from '@/components/shared/DataTable';
import type { ColumnDef } from '@tanstack/react-table';
import { Download, Clock, CalendarDays, CheckCircle2, XCircle, AlertCircle, MinusCircle, UserCheck } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { format } from 'date-fns';
import { toSentenceCase } from '@/lib/utils';

interface AttendanceRecord {
  uid: string;
  name: string;
  department: string;
  role: string;
  vacancyId: number | null;
  attendance?: {
    status: 'present' | 'absent' | 'late' | 'half-day' | 'on-leave';
    remarks?: string;
  };
  onLeave?: boolean;
}

export default function Attendance() {
  const [data, setData] = useState<{
    users: any[];
    attendance: Record<string, any>;
    leaves: Record<string, boolean>;
  }>({ users: [], attendance: {}, leaves: {} });
  
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [activeTab, setActiveTab] = useState<'employees' | 'admins'>('employees');

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/hr/attendance/registry?date=${selectedDate}`);
      setData(res.data);
    } catch (error) {
      toast.error('Failed to fetch attendance records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedDate]);

  const handleMarkAttendance = async (userId: string, status: string) => {
    try {
      await api.post('/hr/attendance/mark', {
        userId,
        date: selectedDate,
        status
      });
      
      // Local update for optimistic UI or just refetch
      setData(prev => ({
        ...prev,
        attendance: {
          ...prev.attendance,
          [userId]: { status }
        }
      }));
      
      toast.success('Attendance updated');
    } catch (error) {
      toast.error('Failed to update attendance');
    }
  };

  const filteredUsers = data.users.filter(u => {
    // Structural discriminator: vacancyId presence for HR personnel
    // role keyword for administrators
    const hasVacancyId = u.vacancyId !== null && u.vacancyId !== undefined;
    const isAdmin = u.role?.toLowerCase().includes('admin');
    
    // Core exclusion (Mirroring Registry/Performance logic)
    const normalizedRole = u.role?.toLowerCase() || '';
    if (['student', 'partner center', 'ceo'].includes(normalizedRole)) return false;

    if (activeTab === 'employees') {
      return hasVacancyId && !isAdmin;
    } else {
      return isAdmin;
    }
  });

  const displayData: AttendanceRecord[] = filteredUsers.map(u => ({
    uid: u.uid,
    name: u.name,
    department: u.department?.name || 'Unassigned',
    role: u.role,
    vacancyId: u.vacancyId,
    attendance: data.attendance[u.uid],
    onLeave: data.leaves[u.uid]
  }));

  const columns: ColumnDef<AttendanceRecord>[] = [
    { 
      accessorKey: 'uid', 
      header: 'ID',
      cell: ({ row }) => <code className="text-[10px] font-bold text-slate-400">{row.original.uid}</code>
    },
    { 
      accessorKey: 'name', 
      header: 'Staff Name',
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-bold text-slate-900">{toSentenceCase(row.original.name)}</span>
          <span className="text-[10px] text-slate-400 font-medium">{toSentenceCase(row.original.role)}</span>
        </div>
      )
    },
    { 
      accessorKey: 'department', 
      header: 'Unit',
      cell: ({ row }) => <span className="text-xs font-semibold text-slate-600">{row.original.department}</span>
    },
    { 
      header: 'Prescence Registry',
      cell: ({ row }) => {
        const userId = row.original.uid;
        const currentStatus = row.original.attendance?.status;
        const isOnLeave = row.original.onLeave;

        if (isOnLeave) {
          return (
            <div className="flex items-center space-x-2 bg-rose-50 border border-rose-100 px-3 py-1.5 rounded-lg w-fit">
              <MinusCircle className="w-4 h-4 text-rose-500" />
              <span className="text-xs font-black uppercase tracking-wider text-rose-700">On Leave</span>
            </div>
          );
        }

        const options = [
          { id: 'present', label: 'Present', color: 'emerald', icon: CheckCircle2 },
          { id: 'absent', label: 'Absent', color: 'red', icon: XCircle },
          { id: 'late', label: 'Late', color: 'amber', icon: AlertCircle },
          { id: 'half-day', label: 'Half-Day', color: 'blue', icon: Clock }
        ];

        return (
          <div className="flex items-center space-x-1">
            {options.map((opt) => {
              const Icon = opt.icon;
              const isActive = currentStatus === opt.id;
              
              return (
                <button
                  key={opt.id}
                  onClick={() => handleMarkAttendance(userId, opt.id)}
                  title={opt.label}
                  className={`p-2 rounded-lg transition-all duration-200 border ${
                    isActive 
                      ? `bg-${opt.color}-50 border-${opt.color}-200 text-${opt.color}-600 shadow-sm scale-105` 
                      : 'bg-white border-transparent text-slate-300 hover:text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </button>
              );
            })}
          </div>
        );
      }
    }
  ];

  const stats = {
    present: displayData.filter(d => d.attendance?.status === 'present' || d.onLeave).length,
    late: displayData.filter(d => d.attendance?.status === 'late').length,
    total: displayData.length
  };

  return (
    <div className="p-6 space-y-6 flex flex-col h-[calc(100vh-8rem)]">
      <PageHeader 
        title="Institutional presence"
        description="Daily registry and historical attendance audit for staff and administrators."
        icon={CalendarDays}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex items-center group hover:border-emerald-200 transition-colors">
           <div className="w-12 h-12 bg-emerald-50 rounded-lg text-emerald-500 flex items-center justify-center mr-4 group-hover:scale-110 transition-transform">
             <UserCheck className="w-6 h-6" />
           </div>
           <div>
             <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Today's Presence</p>
             <h3 className="text-2xl font-black text-slate-900">
               {stats.total > 0 ? Math.round((stats.present / stats.total) * 100) : 0}%
             </h3>
           </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex items-center group hover:border-amber-200 transition-colors">
           <div className="w-12 h-12 bg-amber-50 rounded-lg text-amber-500 flex items-center justify-center mr-4 group-hover:scale-110 transition-transform">
             <Clock className="w-6 h-6" />
           </div>
           <div>
             <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Tardiness Rate</p>
             <h3 className="text-2xl font-black text-slate-900">
               {stats.late} <span className="text-sm text-slate-400 font-bold ml-1 uppercase">Staff</span>
             </h3>
           </div>
        </div>
      </div>

      <div className="flex-1 bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden flex flex-col min-h-0">
        <div className="p-4 border-b border-slate-100 shrink-0 bg-white flex items-center justify-between">
           <div className="flex items-center space-x-3 bg-slate-50 p-2 rounded-xl border border-slate-200 shadow-inner">
             <CalendarDays className="w-4 h-4 text-slate-400 ml-2" />
             <input 
               type="date"
               value={selectedDate}
               max={format(new Date(), 'yyyy-MM-dd')}
               onChange={(e) => setSelectedDate(e.target.value)}
               className="bg-transparent border-none text-xs font-black text-slate-900 focus:ring-0 cursor-pointer p-0 pr-2"
             />
           </div>

           <div className="inline-flex bg-slate-50 p-1 rounded-xl shadow-inner border border-slate-200/50">
             <button 
               onClick={() => setActiveTab('employees')}
               className={`py-2 px-6 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all duration-200 ${
                 activeTab === 'employees' 
                   ? 'bg-white text-slate-900 shadow-sm border border-slate-200' 
                   : 'text-slate-400 hover:text-slate-600'
               }`}
             >
               Personnel
             </button>
             <button 
               onClick={() => setActiveTab('admins')}
               className={`py-2 px-6 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all duration-200 ${
                 activeTab === 'admins' 
                   ? 'bg-white text-slate-900 shadow-sm border border-slate-200' 
                   : 'text-slate-400 hover:text-slate-600'
               }`}
             >
               Administrators
             </button>
           </div>
        </div>

        <div className="px-4 py-2 bg-slate-50/50 border-b border-slate-100 flex items-center space-x-6 shrink-0 overflow-x-auto">
          <span className="text-[10px] font-black uppercase tracking-tighter text-slate-400 mr-2">Registry Legend:</span>
          {[
            { label: 'Present', color: 'text-emerald-500', icon: CheckCircle2 },
            { label: 'Absent', color: 'text-red-500', icon: XCircle },
            { label: 'Late', color: 'text-amber-500', icon: AlertCircle },
            { label: 'Half-Day', color: 'text-blue-500', icon: Clock },
            { label: 'On Leave', color: 'text-rose-500', icon: MinusCircle }
          ].map((item) => (
            <div key={item.label} className="flex items-center space-x-1.5 whitespace-nowrap">
              <item.icon className={`w-3.5 h-3.5 ${item.color}`} />
              <span className="text-[10px] font-bold text-slate-500">{item.label}</span>
            </div>
          ))}
        </div>
        
        <div className="flex-1 overflow-auto">
          <DataTable 
            columns={columns} 
            data={displayData} 
            isLoading={loading} 
            searchKey="name" 
            searchPlaceholder={`Audit ${activeTab} attendance...`} 
          />
        </div>
      </div>
    </div>
  );
}
