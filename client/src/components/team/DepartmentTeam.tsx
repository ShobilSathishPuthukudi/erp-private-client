import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { DataTable } from '@/components/shared/DataTable';
import { Modal } from '@/components/shared/Modal';
import type { ColumnDef } from '@tanstack/react-table';
import { ShieldCheck, Share2, Printer, Download, Clock, AlertTriangle, TrendingUp } from 'lucide-react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store/authStore';
import { getNormalizedRole } from '@/App';
import { downloadCSV } from '@/lib/exportUtils';

interface TeamMember {
  uid: string;
  name: string;
  email: string;
  role: string;
  status: string;
  createdAt: string;
  avatar?: string | null;
  performance?: {
    overdueTasks: number;
    agedPendingLeaves: number;
    leadsCaptured: number;
  };
}

const StatusToggle = ({ checked, onChange, disabled }: { checked: boolean, onChange: (val: boolean) => void, disabled?: boolean }) => (
  <button
    type="button"
    disabled={disabled}
    onClick={() => onChange(!checked)}
    className={`
      relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2
      ${checked ? 'bg-emerald-500' : 'bg-slate-200'}
      ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
    `}
  >
    <span
      className={`
        pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out
        ${checked ? 'translate-x-5' : 'translate-x-0'}
      `}
    />
  </button>
);

export default function Team() {
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { register, handleSubmit, reset, watch, setValue, formState: { isSubmitting, errors } } = useForm();
  
  const user = useAuthStore((state) => state.user);
  const userRole = getNormalizedRole(user?.role || '');
  const scopedDeptId = user?.deptId || (user as any)?.departmentId;
  const isDeptScopedRole = ['hr', 'finance', 'sales', 'operations'].includes(userRole);
  const isSubDeptRole = ['openschool', 'online', 'skill', 'bvoc'].includes(userRole);
  const isExecutive = userRole === 'ceo' || userRole === 'organization admin';
  const canManage = isDeptScopedRole || isSubDeptRole;
  const [deptName, setDeptName] = useState('');
  const [suggestedEmail, setSuggestedEmail] = useState('');
  const watchedName = watch('name');

  useEffect(() => {
    const fetchDept = async () => {
      if (user?.deptId || (user as any)?.departmentId) {
        try {
          const res = await api.get('/departments');
          const dept = res.data.find((d: any) => d.id === (user?.deptId || (user as any)?.departmentId));
          if (dept) setDeptName(dept.name);
        } catch (e) {
          console.error('[DEPT-RESOLVE-ERROR]:', e);
          // Silent failure - defaults to 'Institutional Unit'
        }
      }
    };
    fetchDept();
  }, [user]);

  useEffect(() => {
    if (watchedName && deptName) {
      const namePart = watchedName.trim().toLowerCase().replace(/\s+/g, '.');
      setSuggestedEmail(`${namePart}@erp.com`);
    } else {
      setSuggestedEmail('');
    }
  }, [watchedName, deptName]);

  const fetchTeam = async () => {
    if (isExecutive) {
      setTeam([]);
      setIsLoading(false);
      return;
    }

    if (!scopedDeptId) {
      setIsLoading(false);
      return;
    }
    
    try {
      setIsLoading(true);
      const res = await api.get('/dept-admin/team', {
        params: {
          deptId: scopedDeptId,
          subDepartment: user?.subDepartment,
          strictSubDepartment: isSubDeptRole
        }
      });
      setTeam(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error('[TEAM-FETCH-ERROR]:', error);
      setTeam([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTeam();
  }, [scopedDeptId, user?.subDepartment, userRole]);

  const handleAccept = async (uid: string) => {
    if (!canManage) return;
    try {
      await api.put(`/dept-admin/team/${uid}/accept`);
      toast.success('Personnel Sanctioned & Enrolled');
      fetchTeam();
    } catch (error) {
      toast.error('Failed to sanction enrollment');
    }
  };

  const handleToggleStatus = async (uid: string, currentStatus: string) => {
    if (!canManage) return;
    try {
      const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
      await api.put(`/dept-admin/team/${uid}/status`, { status: newStatus });
      toast.success(`Personnel status updated to ${newStatus}`);
      fetchTeam();
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const onSubmit = async (data: any) => {
    try {
      await api.post('/dept-admin/team/onboard', data);
      toast.success('Personnel Registered Successfully');
      setIsModalOpen(false);
      reset();
      fetchTeam();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Registration failed');
    }
  };

  const columns: ColumnDef<TeamMember>[] = [
    { accessorKey: 'uid', header: 'Emp ID' },
    { 
      accessorKey: 'name', 
      header: 'Staff Name',
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-slate-100 overflow-hidden flex items-center justify-center shrink-0">
            {row.original.avatar ? (
              <img
                src={row.original.avatar}
                alt=""
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-xs font-black text-slate-500">
                {row.original.name?.charAt(0)?.toUpperCase() || 'U'}
              </span>
            )}
          </div>
          <span className="font-semibold text-slate-800">{row.original.name}</span>
        </div>
      )
    },
    { accessorKey: 'email', header: 'Email Address' },
    {
      id: 'performance',
      header: 'Institutional Performance',
      cell: ({ row }) => {
        const p = row.original.performance;
        if (!p) return <span className="text-slate-300 font-bold text-[10px]">NO TELEMETRY</span>;

        const score = Math.max(0, 100 - (p.overdueTasks * 15) - (p.agedPendingLeaves * 10));
        const roleLower = row.original.role?.toLowerCase() || '';
        const isSales = roleLower.includes('sales') || roleLower.includes('crm') || roleLower.includes('bde');

        return (
          <div className="flex flex-col gap-1.5 py-1 min-w-[140px]">
             <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                   <div 
                    className={`h-full transition-all duration-500 ${score > 80 ? 'bg-emerald-500' : score > 50 ? 'bg-amber-500' : 'bg-rose-500'}`}
                    style={{ width: `${score}%` }}
                   />
                </div>
                <span className={`text-[10px] font-black min-w-[28px] ${score > 80 ? 'text-emerald-600' : score > 50 ? 'text-amber-600' : 'text-rose-600'}`}>
                  {score}%
                </span>
             </div>
             <div className="flex flex-wrap items-center gap-1">
                {p.overdueTasks > 0 && (
                  <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-rose-50 text-rose-600 text-[8px] font-black border border-rose-100 uppercase tracking-tighter">
                    <Clock className="w-2.5 h-2.5" />
                    {p.overdueTasks} Overdue
                  </span>
                )}
                {p.agedPendingLeaves > 0 && (
                  <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-600 text-[8px] font-black border border-amber-100 uppercase tracking-tighter">
                    <AlertTriangle className="w-2.5 h-2.5" />
                    {p.agedPendingLeaves} Aged
                  </span>
                )}
                {isSales && (
                  <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-600 text-[8px] font-black border border-blue-100 uppercase tracking-tighter">
                    <TrendingUp className="w-2.5 h-2.5" />
                    {p.leadsCaptured} Leads
                  </span>
                )}
                {p.overdueTasks === 0 && p.agedPendingLeaves === 0 && !isSales && (
                  <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest opacity-40">Compliant</span>
                )}
             </div>
          </div>
        );
      }
    },
    { 
      accessorKey: 'status', 
      header: 'Status',
      cell: ({ row }) => {
        const status = row.original.status;
        const isActive = status === 'active';
        const isPending = status === 'pending_dept';

        if (isPending) {
           return (
             <span className="px-2 py-1 text-[10px] rounded-full font-bold uppercase bg-amber-100 text-amber-700 animate-pulse">
               PENDING REVIEW
             </span>
           );
        }

        return (
          <div className="flex items-center gap-3">
            <StatusToggle 
              checked={isActive} 
              onChange={() => handleToggleStatus(row.original.uid, status)} 
              disabled={!canManage}
            />
            <span className={`text-[10px] font-bold uppercase tracking-widest ${isActive ? 'text-emerald-600' : 'text-slate-400'}`}>
              {status.toUpperCase()}
            </span>
          </div>
        );
      }
    },
    {
      id: 'actions',
      header: 'Jurisdiction',
      cell: ({ row }) => {
        if (row.original.status === 'pending_dept' && canManage) {
          return (
            <button 
              onClick={() => handleAccept(row.original.uid)}
              className="flex items-center gap-1.5 bg-slate-900 text-white px-3 py-1.5 rounded-lg text-xs font-black hover:bg-emerald-600 transition-all active:scale-95"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              SANCTION
            </button>
          );
        }
        return <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest ">{canManage && row.original.status === 'pending_dept' ? 'Pending Action' : 'Authorized'}</span>;
      }
    }
  ];

  if (!canManage) {
    columns.pop();
  }

  if (isExecutive) {
    return (
      <div className="space-y-6 flex flex-col h-[calc(100vh-8rem)]">
        <div className="bg-white shadow-xl shadow-slate-200/50 border border-slate-200 rounded-[2rem] p-10">
          <div className="flex items-center gap-2 mb-2">
            <ShieldCheck className="w-5 h-5 text-blue-600" />
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Team View Not Available</h1>
          </div>
          <p className="text-slate-500 text-sm font-medium">
            Use the institutional structure view for organization-wide personnel visibility.
          </p>
        </div>
      </div>
    );
  }

  const title = isSubDeptRole ? 'Sub-Department Team' : 'Department Team';
  const description = isSubDeptRole
    ? 'Employees assigned to your sub-department'
    : 'Employees assigned to your department';

  return (
    <div className="space-y-6 flex flex-col h-[calc(100vh-8rem)]">
      <div className="flex justify-between items-center shrink-0">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck className="w-5 h-5 text-blue-600" />
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">{title}</h1>
          </div>
          <p className="text-slate-500 text-sm font-medium">{description}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 mr-2 border-r border-slate-200 pr-4">
             <button 
               onClick={() => {
                 navigator.clipboard.writeText(window.location.href);
                 toast.success('Roster link copied to clipboard');
               }}
               className="p-2.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all active:scale-95"
               title="Share Roster"
             >
               <Share2 className="w-5 h-5" />
             </button>
             <button 
               onClick={() => window.print()}
               className="p-2.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all active:scale-95"
               title="Print Roster"
             >
               <Printer className="w-5 h-5" />
             </button>
             <button 
               onClick={() => {
                 downloadCSV(team, 'institutional_roster');
                 toast.success('Institutional structure exported successfully');
               }}
               className="p-2.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all active:scale-95"
               title="Export Data"
             >
               <Download className="w-5 h-5" />
             </button>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 bg-white shadow-xl shadow-slate-200/50 border border-slate-200 rounded-[2rem] flex flex-col overflow-hidden">
        <DataTable 
          columns={columns} 
          data={team} 
          isLoading={isLoading} 
          searchKey="name" 
          searchPlaceholder="Search personnel by name..." 
        />
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Institutional Enrollment"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
           <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
              <p className="text-[11px] text-blue-800 font-medium leading-relaxed">
                Direct enrollment by department admins bypasses intermediate sanctuary. The personnel will be immediately <span className="font-black ">Active</span> within your jurisdiction.
              </p>
           </div>

           <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1 col-span-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Name</label>
                <input {...register('name', { required: true })} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all" placeholder="John Doe" />
              </div>
              <div className="space-y-1 col-span-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email Address</label>
                <div className="relative group">
                  <input 
                    {...register('email', { 
                      required: 'Email is required',
                      validate: (v) => v.toLowerCase() !== 'admin@erp.com' || 'This institutional email (admin@erp.com) is already reserved'
                    })} 
                    type="email" 
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all" 
                    placeholder="name@erp.com" 
                  />
                  {suggestedEmail && (
                    <button
                      type="button"
                      onClick={() => setValue('email', suggestedEmail)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 bg-blue-50 text-blue-600 px-3 py-1 rounded-lg text-[10px] font-black uppercase hover:bg-blue-600 hover:text-white transition-all border border-blue-100 shadow-sm animate-in fade-in slide-in-from-right-2"
                    >
                      Suggest: {suggestedEmail}
                    </button>
                  )}
                </div>
                {errors.email && <p className="text-rose-500 text-[10px] font-bold mt-1 ml-1">{errors.email.message as string}</p>}
              </div>
              <div className="space-y-1 col-span-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Passcode</label>
                <input {...register('password', { required: true })} type="password"  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all" placeholder="••••••••" />
              </div>
              <div className="space-y-1 col-span-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Role</label>
                <select {...register('role')} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all appearance-none">
                  <option value="Employee">Employee</option>
                  <option value="Dept Admin">Dept Admin</option>
                </select>
              </div>
           </div>

           <div className="pt-4 flex gap-3">
              <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 border border-slate-200 text-slate-600 rounded-xl font-black text-xs hover:bg-slate-50 transition-all uppercase tracking-widest">Cancel</button>
              <button type="submit" disabled={isSubmitting} className="flex-1 py-3 bg-slate-900 text-white rounded-xl font-black text-xs hover:bg-blue-600 transition-all uppercase tracking-widest shadow-xl shadow-slate-900/10 disabled:opacity-50">
                {isSubmitting ? 'Finalizing...' : 'Enroll Staff'}
              </button>
           </div>
        </form>
      </Modal>
    </div>
  );
}
