import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { DataTable } from '@/components/shared/DataTable';
import { Modal } from '@/components/shared/Modal';
import type { ColumnDef } from '@tanstack/react-table';
import { Calendar, BookOpen, Users, Plus, History, Timer, AlertCircle, Building2, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';

interface Session {
  id: number;
  name: string;
  programId: number;
  centerId: number;
  subDeptId: number;
  startDate: string;
  endDate: string;
  maxCapacity: number;
  enrolledCount: number;
  financeStatus: 'pending' | 'approved' | 'rejected';
  approvalStatus: 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED';
  isActive: boolean;
  program?: { name: string; type: string };
  center?: { name: string };
}

interface Program {
  id: number;
  name: string;
  type: string;
  intakeCapacity: number;
}

interface Center {
  id: number;
  name: string;
  auditStatus: string;
}

export default function SubDeptSessions() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [centers, setCenters] = useState<Center[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { register, handleSubmit, reset, setValue, watch, formState: { isSubmitting } } = useForm();
  const selectedProgramId = watch('programId');

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [sessRes, progRes, centRes] = await Promise.all([
        api.get('/academic/sessions'),
        api.get('/academic/programs'),
        api.get('/operations/performance/centers')
      ]);
      setSessions(sessRes.data);
      setPrograms(progRes.data);
      setCenters(centRes.data.filter((c: any) => c.auditStatus === 'approved'));
    } catch (error) {
      toast.error('Failed to access batch topology');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedProgramId) {
      const prog = programs.find(p => p.id === parseInt(selectedProgramId));
      if (prog) {
        setValue('maxCapacity', prog.intakeCapacity);
      }
    }
  }, [selectedProgramId, programs, setValue]);

  const onSubmit = async (data: any) => {
    try {
      await api.post('/academic/sessions', data);
      toast.success('Batch generated as DRAFT');
      setIsModalOpen(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Operational failure');
    }
  };

  const submitForApproval = async (id: number) => {
    try {
      await api.put(`/academic/sessions/${id}/submit`);
      toast.success('Batch submitted for review');
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Submission failed');
    }
  };

  const columns: ColumnDef<Session>[] = [
    { 
      accessorKey: 'name', 
      header: 'Batch Identity', 
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-bold text-slate-900">{row.original.name}</span>
          <span className="text-[10px] font-mono text-slate-400 uppercase tracking-tighter">ID: {row.original.id}</span>
        </div>
      ) 
    },
    { 
      id: 'program', 
      header: 'Program & Center',
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="text-sm font-bold text-slate-700">{row.original.program?.name}</span>
          <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{row.original.center?.name || 'Unknown Center'}</span>
        </div>
      )
    },
    { 
      id: 'status', 
      header: 'Workflow State',
      cell: ({ row }) => {
        const s = row.original.approvalStatus;
        const f = row.original.financeStatus;
        const isSkill = row.original.program?.type === 'Skill';

        return (
          <div className="flex flex-col gap-1.5">
            <span className={`px-2.5 py-1 text-[10px] rounded-full font-bold uppercase tracking-wider flex items-center gap-1.5 w-fit ${
              s === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' : 
              s === 'PENDING_APPROVAL' ? 'bg-blue-50 text-blue-600 border border-blue-100' :
              'bg-slate-100 text-slate-600 border border-slate-200'
            }`}>
              {s === 'APPROVED' ? <CheckCircle2 className="w-3 h-3" /> : (s === 'PENDING_APPROVAL' ? <Timer className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />)}
              {s === 'DRAFT' ? 'DRAFT - NOT SUBMITTED' : s.replace('_', ' ')}
            </span>
            {isSkill && (
              <span className={`px-2 py-0.5 text-[9px] rounded-md font-black uppercase tracking-tighter w-fit border ${
                f === 'approved' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 
                f === 'rejected' ? 'bg-rose-50 text-rose-600 border-rose-100' : 
                'bg-amber-50 text-amber-600 border-amber-100'
              }`}>
                Finance: {f.toUpperCase()}
              </span>
            )}
          </div>
        );
      }
    },
    { 
      id: 'capacity', 
      header: 'Seats',
      cell: ({ row }) => (
        <div className="text-xs font-bold text-slate-600">
          {row.original.enrolledCount} / {row.original.maxCapacity}
        </div>
      )
    },
    {
      id: 'actions',
      header: 'Controls',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
            {row.original.approvalStatus === 'DRAFT' && (
              <button 
                onClick={() => submitForApproval(row.original.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white text-[10px] font-bold uppercase tracking-widest rounded-lg hover:bg-slate-800 transition-all active:scale-95"
              >
                <Send className="w-3 h-3" />
                Submit for Review
              </button>
            )}
            {row.original.approvalStatus === 'APPROVED' && (
              <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Active</span>
            )}
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto p-4 lg:p-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-8 rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50 gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/20">
              <Calendar className="w-6 h-6" />
            </div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Enrollment Intakes</h1>
          </div>
          <p className="text-slate-500 font-medium ml-15">Initialize and manage academic intake generations for approved study centers.</p>
        </div>
        <button 
          onClick={() => { reset(); setIsModalOpen(true); }}
          className="flex items-center space-x-2 bg-slate-900 hover:bg-slate-800 text-white px-6 py-3 rounded-2xl transition-all shadow-xl shadow-slate-900/20 active:scale-95 font-bold"
        >
          <Plus className="w-5 h-5" />
          <span>Initialize new enrollment intake</span>
        </button>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden">
        <DataTable columns={columns} data={sessions} isLoading={isLoading} searchKey="name" searchPlaceholder="Locate batch identity..." />
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Initialize new enrollment intake">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 p-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="col-span-2">
              <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5 tracking-widest">Batch Designation Name</label>
              <div className="relative group">
                <History className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-slate-900 transition-colors" />
                <input {...register('name', { required: true })} className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900 transition-all font-medium text-slate-900" placeholder="e.g. July 2026 - Intake 1" />
              </div>
            </div>

            <div className="col-span-2">
              <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5 tracking-widest">Mapped Program</label>
              <div className="relative group">
                <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-slate-900 transition-colors" />
                <select {...register('programId', { required: true })} className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900 transition-all font-bold text-slate-900">
                  <option value="">-- Select Program --</option>
                  {programs.map(p => (
                    <option key={p.id} value={p.id}>{p.name} [{p.type}]</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="col-span-2">
              <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5 tracking-widest">Target Study Center (Approved Only)</label>
              <div className="relative group">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-slate-900 transition-colors" />
                <select {...register('centerId', { required: true })} className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900 transition-all font-bold text-slate-900">
                  <option value="">-- Select Center --</option>
                  {centers.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5 tracking-widest">Start Date</label>
              <input type="date" {...register('startDate', { required: true })} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900 transition-all font-medium text-slate-900" />
            </div>

            <div>
              <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5 tracking-widest">End Date</label>
              <input type="date" {...register('endDate', { required: true })} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900 transition-all font-medium text-slate-900" />
            </div>

            <div className="col-span-2">
              <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5 tracking-widest">Intake Capacity</label>
              <div className="relative group">
                <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-slate-900 transition-colors" />
                <input type="number" {...register('maxCapacity', { required: true, valueAsNumber: true })} className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900 transition-all font-medium text-slate-900" min="1" />
              </div>
            </div>
          </div>

          <div className="pt-6 flex justify-end gap-3 mt-4 border-t border-slate-100">
            <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-3 text-slate-600 font-bold hover:bg-slate-50 rounded-xl transition-colors">Abort</button>
            <button type="submit" disabled={isSubmitting} className="px-8 py-3 bg-slate-900 text-white rounded-xl font-black hover:bg-slate-800 disabled:opacity-50 transition-all active:scale-95 shadow-lg shadow-slate-900/20">{isSubmitting ? 'Processing...' : 'Initialize new enrollment intake (Draft)'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function CheckCircle2(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 11 3 3L22 4"/><path d="M21 12a9 9 0 1 1-9-9c1.64 0 3.17.47 4.47 1.28"/></svg>
  )
}
