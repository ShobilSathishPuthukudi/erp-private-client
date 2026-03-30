import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { DataTable } from '@/components/shared/DataTable';
import { Modal } from '@/components/shared/Modal';
import type { ColumnDef } from '@tanstack/react-table';
import { UserPlus, ShieldCheck } from 'lucide-react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store/authStore';

interface TeamMember {
  uid: string;
  name: string;
  email: string;
  status: string;
  createdAt: string;
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
  const userRole = user?.role?.toLowerCase().trim();
  const isHR = userRole === 'hr';
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
          console.error('Failed to resolve dept name for suggestions');
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
    try {
      setIsLoading(true);
      const res = await api.get('/dept-admin/team');
      setTeam(res.data);
    } catch (error) {
      toast.error('Failed to fetch team members');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTeam();
  }, []);

  const handleAccept = async (uid: string) => {
    if (!isHR) return;
    try {
      await api.put(`/dept-admin/team/${uid}/accept`);
      toast.success('Personnel Sanctioned & Enrolled');
      fetchTeam();
    } catch (error) {
      toast.error('Failed to sanction enrollment');
    }
  };

  const handleToggleStatus = async (uid: string, currentStatus: string) => {
    if (!isHR) return;
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
      cell: ({ row }) => <span className="font-semibold text-slate-800">{row.original.name}</span>
    },
    { accessorKey: 'email', header: 'Email Address' },
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
              disabled={!isHR}
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
        if (row.original.status === 'pending_dept' && isHR) {
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
        return <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest italic">{isHR && row.original.status === 'pending_dept' ? 'Pending Action' : 'Authorized'}</span>;
      }
    }
  ];

  return (
    <div className="space-y-6 flex flex-col h-[calc(100vh-8rem)]">
      <div className="flex justify-between items-center shrink-0">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck className="w-5 h-5 text-blue-600" />
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Departmental Roster</h1>
          </div>
          <p className="text-slate-500 text-sm font-medium">Manage personnel sanctuary and institutional enrollment</p>
        </div>
        {isHR && (
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-black text-sm transition-all shadow-lg shadow-blue-600/20 active:scale-95 group"
          >
            <UserPlus className="w-4 h-4 group-hover:rotate-12 transition-transform" />
            Enroll Personnel
          </button>
        )}
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
                Direct enrollment by department admins bypasses intermediate sanctuary. The personnel will be immediately <span className="font-black italic">Active</span> within your jurisdiction.
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
                  <option value="employee">Employee</option>
                  <option value="dept-admin">Dept Admin</option>
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
