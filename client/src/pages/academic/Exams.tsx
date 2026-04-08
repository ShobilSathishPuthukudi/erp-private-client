import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { DataTable } from '@/components/shared/DataTable';
import { Modal } from '@/components/shared/Modal';
import { DashCard } from '@/components/shared/DashCard';
import type { ColumnDef } from '@tanstack/react-table';
import { Calendar, CheckCircle2, Clock, AlertCircle, ClipboardCheck, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';

interface Exam {
  id: number;
  name: string;
  programId: number;
  batch: string;
  date: string;
  status: 'scheduled' | 'completed' | 'published';
  program?: { name: string; type: string };
}

interface Program {
  id: number;
  name: string;
  type: string;
}

export default function Exams() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const navigate = useNavigate();

  const { register, handleSubmit, reset, watch, formState: { isSubmitting } } = useForm();
  const watchAllFields = watch();

  const isFormValid = 
    !!watchAllFields.name?.trim() &&
    !!watchAllFields.programId &&
    !!watchAllFields.sessionId &&
    !!watchAllFields.date;

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [examRes, progRes, sessRes] = await Promise.all([
        api.get('/academic/exams'),
        api.get('/academic/programs'),
        api.get('/academic/sessions')
      ]);
      setExams(examRes.data);
      setPrograms(progRes.data);
      setSessions(sessRes.data.filter((s: any) => s.approvalStatus === 'APPROVED'));
    } catch (error) {
      toast.error('Failed to access examination registry');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onSubmit = async (data: any) => {
    try {
      await api.post('/academic/exams', data);
      toast.success('Institutional exam scheduled successfully');
      setIsModalOpen(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Scheduling protocol failure');
    }
  };

  const columns: ColumnDef<Exam>[] = [
    { 
      accessorKey: 'name', 
      header: 'Assessment Identity', 
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-bold text-slate-900">{row.original.name}</span>
          <span className="text-[10px] font-mono text-slate-400 uppercase tracking-tighter">ARCH-EXAM-{row.original.id}</span>
        </div>
      ) 
    },
    { 
      id: 'program', 
      header: 'Academic Context',
      cell: ({ row }) => {
        const session = sessions.find(s => s.id === (row.original as any).sessionId);
        return (
          <div className="flex flex-col">
            <span className="text-sm font-bold text-slate-700">{row.original.program?.name}</span>
            <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">
              {session?.name || row.original.batch || 'General Batch'}
            </span>
          </div>
        );
      }
    },
    { 
      accessorKey: 'date', 
      header: 'Temporal Window',
      cell: ({ row }) => (
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
          <Calendar className="w-3.5 h-3.5" />
          {new Date(row.original.date).toLocaleDateString()}
        </div>
      )
    },
    { 
      accessorKey: 'status', 
      header: 'Lifecycle Status',
      cell: ({ row }) => {
        const s = row.original.status;
        return (
          <span className={`px-2.5 py-1 text-[10px] rounded-full font-black uppercase tracking-widest flex items-center gap-1.5 w-fit ${
            s === 'published' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 
            s === 'scheduled' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
            'bg-slate-100 text-slate-600 border border-slate-200'
          }`}>
            {s === 'published' ? <CheckCircle2 className="w-3 h-3" /> : (s === 'scheduled' ? <Clock className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />)}
            {s}
          </span>
        );
      }
    },
    {
      id: 'actions',
      header: () => <div className="text-right pr-4 min-w-[220px]">Operations</div>,
      cell: ({ row }) => (
        <div className="flex justify-end pr-2 min-w-[220px]">
          <button 
            onClick={() => navigate(`/dashboard/academic/exams/${row.original.id}/marks`)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-black hover:bg-slate-800 transition-all active:scale-95 shadow-lg shadow-slate-900/20 whitespace-nowrap"
          >
            <ClipboardCheck className="w-3.5 h-3.5" />
            Record academic performance
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto p-4 lg:p-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-8 rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50 gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-2xl bg-rose-600 flex items-center justify-center text-white shadow-lg shadow-rose-600/20">
              <ClipboardCheck className="w-6 h-6" />
            </div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Examination Engine</h1>
          </div>
          <p className="text-slate-500 font-medium ml-15">Schedule institutional assessments and manage academic transcript entry protocols.</p>
        </div>
        {exams.length > 0 && (
           <button 
              onClick={() => { reset(); setIsModalOpen(true); }}
              className="px-6 py-3.5 bg-slate-900 text-white rounded-2xl shadow-xl shadow-slate-900/10 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-slate-800 transition-all active:scale-[0.98] hover:scale-[1.02]"
           >
              <ClipboardCheck className="w-4 h-4" />
              Schedule New Exam
           </button>
        )}
      </div>

      {exams.length === 0 && !isLoading && (
        <div className="max-w-md">
          <DashCard 
            title="Schedule Institutional Assessment"
            description="Initiate new exam schedules across configured cohorts."
            onClick={() => { reset(); setIsModalOpen(true); }}
            icon={ClipboardCheck}
            actionLabel="Schedule New Exam"
          />
        </div>
      )}

      <div className="bg-white rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden">
        <DataTable 
          columns={columns} 
          data={exams} 
          isLoading={isLoading} 
          searchKey="name" 
          searchPlaceholder="Locate assessment node..." 
        />
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} hideHeader={true}>
        <div className="bg-white overflow-hidden transition-all duration-300 flex flex-col max-h-[calc(100vh-160px)]">
          <div className="bg-slate-900 p-6 text-white flex justify-between items-center shrink-0 relative border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2 rounded-xl backdrop-blur-md">
                <ClipboardCheck className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest leading-none mb-1">
                  Examination Engine
                </p>
                <h2 className="text-xl font-bold tracking-tight">
                  Schedule Assessment
                </h2>
              </div>
            </div>
            <button 
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-lg transition-all hover:scale-110 active:scale-90 text-white/60 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-8 space-y-8 min-h-0 custom-scrollbar">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="col-span-2">
                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Assessment Name</label>
                <input
                    {...register('name', { required: true })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900 transition-all font-medium text-slate-900"
                    placeholder="Summer Semester 2026 - Internal"
                />
                </div>

                <div className="col-span-2">
                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Target Program Architecture</label>
                <select
                    {...register('programId', { required: true })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900 transition-all font-bold text-slate-900"
                >
                    <option value="">-- Select Academic Program --</option>
                    {programs.map(p => (
                    <option key={p.id} value={p.id}>{p.name} [{p.type}]</option>
                    ))}
                </select>
                </div>

                <div className="col-span-2">
                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Active Admission Intake</label>
                <select
                    {...register('sessionId', { required: true })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900 transition-all font-bold text-slate-900"
                >
                    <option value="">-- Select Approved Batch --</option>
                    {sessions.map(s => (
                    <option key={s.id} value={s.id}>{s.name} [{s.program?.name}]</option>
                    ))}
                </select>
                </div>

                <div className="col-span-2">
                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Commencement Date</label>
                <input
                    type="date"
                    {...register('date', { required: true })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900 transition-all font-medium text-slate-900"
                />
                </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 p-8 bg-slate-50 border-t border-slate-200 shrink-0">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-8 py-3.5 bg-white text-slate-600 font-bold text-xs uppercase tracking-widest rounded-2xl border border-slate-200 hover:bg-slate-50 hover:scale-105 active:scale-95 transition-all shadow-sm"
            >
              Abort Routine
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !isFormValid}
              className="px-8 py-3.5 bg-slate-900 text-white font-bold text-xs uppercase tracking-widest rounded-2xl shadow-xl shadow-slate-900/10 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:active:scale-100"
            >
              {isSubmitting ? 'Scheduling...' : 'Execute Schedule'}
            </button>
          </div>
        </form>
       </div>
      </Modal>
    </div>
  );
}
