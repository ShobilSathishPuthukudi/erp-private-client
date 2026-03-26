import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { DataTable } from '@/components/shared/DataTable';
import { Modal } from '@/components/shared/Modal';
import type { ColumnDef } from '@tanstack/react-table';
import { Calendar, Plus, CheckCircle2, Clock, AlertCircle, ClipboardCheck } from 'lucide-react';
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
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const navigate = useNavigate();

  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm();

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [examRes, progRes] = await Promise.all([
        api.get('/academic/exams'),
        api.get('/academic/programs')
      ]);
      setExams(examRes.data);
      setPrograms(progRes.data);
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
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="text-sm font-bold text-slate-700">{row.original.program?.name}</span>
          <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{row.original.batch}</span>
        </div>
      )
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
        <button 
          onClick={() => { reset(); setIsModalOpen(true); }}
          className="flex items-center space-x-2 bg-slate-900 hover:bg-slate-800 text-white px-6 py-3 rounded-2xl transition-all shadow-xl shadow-slate-900/20 active:scale-95 font-bold"
        >
          <Plus className="w-5 h-5" />
          <span>Schedule New Exam</span>
        </button>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden">
        <DataTable 
          columns={columns} 
          data={exams} 
          isLoading={isLoading} 
          searchKey="name" 
          searchPlaceholder="Locate assessment node..." 
        />
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Schedule Institutional Assessment"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 p-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="col-span-2">
              <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Assessment Name</label>
              <input
                {...register('name', { required: true })}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900 transition-all font-medium text-slate-900"
                placeholder="e.g. Summer Semester 2026 - Internal"
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

            <div>
              <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Academic Batch / Intake</label>
              <input
                {...register('batch', { required: true })}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900 transition-all font-medium text-slate-900"
                placeholder="e.g. 2024-2026"
              />
            </div>

            <div>
              <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Commencement Date</label>
              <input
                type="date"
                {...register('date', { required: true })}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900 transition-all font-medium text-slate-900"
              />
            </div>
          </div>

          <div className="pt-6 flex justify-end gap-3 mt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-6 py-3 text-slate-600 font-bold hover:bg-slate-50 rounded-xl transition-colors"
            >
              Abort Routine
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-8 py-3 bg-slate-900 text-white rounded-xl font-black hover:bg-slate-800 disabled:opacity-50 transition-all active:scale-95 shadow-lg shadow-slate-900/20"
            >
              {isSubmitting ? 'Scheduling...' : 'Execute Schedule'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
