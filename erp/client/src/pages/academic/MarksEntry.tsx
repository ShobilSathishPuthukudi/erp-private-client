import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { 
  ClipboardCheck, 
  ArrowLeft, 
  Save, 
  User, 
  BookOpen, 
  GraduationCap, 
  AlertCircle, 
  CheckCircle2,
  FileSpreadsheet,
  Zap
} from 'lucide-react';
import toast from 'react-hot-toast';

interface StudentMark {
  id: number;
  name: string;
  enrollId: string;
  theory: string | number;
  practical: string | number;
  internal: string | number;
  total: number;
  isSaved: boolean;
}

interface ExamData {
  id: number;
  name: string;
  batch: string;
  program?: { name: string };
}

export default function MarksEntry() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [exam, setExam] = useState<ExamData | null>(null);
  const [students, setStudents] = useState<StudentMark[]>([]);
  const [subjectName, setSubjectName] = useState('Core Subject 1');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const res = await api.get(`/academic/exams/${id}/students`);
      setExam(res.data.exam);
      
      const mappedStudents = res.data.students.map((s: any) => {
        const existingMark = s.examMarks?.[0] || {};
        return {
          id: s.id,
          name: s.name,
          enrollId: `ST-${s.id.toString().padStart(4, '0')}`,
          theory: existingMark.theoryMarks || '',
          practical: existingMark.practicalMarks || '',
          internal: existingMark.internalMarks || '',
          total: existingMark.totalMarks || 0,
          isSaved: !!existingMark.id
        };
      });
      setStudents(mappedStudents);
    } catch (error) {
      toast.error('Failed to synchronize assessment roster');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const handleMarkChange = (studentId: number, field: 'theory' | 'practical' | 'internal', value: string) => {
    setStudents(prev => prev.map(s => {
      if (s.id === studentId) {
        const updated = { ...s, [field]: value };
        const t = parseFloat(updated.theory as string) || 0;
        const p = parseFloat(updated.practical as string) || 0;
        const i = parseFloat(updated.internal as string) || 0;
        updated.total = t + p + i;
        updated.isSaved = false;
        return updated;
      }
      return s;
    }));
  };

  const handleSaveAll = async () => {
    try {
      setIsSaving(true);
      const payload = students.map(s => ({
        studentId: s.id,
        subjectName,
        theory: s.theory,
        practical: s.practical,
        internal: s.internal
      }));

      await api.post(`/academic/exams/${id}/marks`, { marks: payload });
      toast.success('Academic marks reconciled across cohort');
      fetchData(); // Refresh to show saved status
    } catch (error) {
      toast.error('Transactional marks entry failure');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <div className="p-8 animate-pulse text-slate-400 font-black uppercase tracking-widest text-center">Decrypting Roster...</div>;

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto p-4 lg:p-8">
      {/* Header HUD */}
      <div className="bg-slate-900 rounded-[2.5rem] p-8 md:p-12 text-white shadow-2xl shadow-slate-900/40 relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
            <div className="space-y-4">
                <button 
                  onClick={() => navigate('/dashboard/academic/exams')}
                  className="flex items-center gap-2 text-indigo-400 font-black uppercase tracking-widest text-[10px] hover:text-white transition-colors"
                >
                    <ArrowLeft className="w-3 h-3" />
                    Exit Terminal
                </button>
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/20">
                        <ClipboardCheck className="w-7 h-7" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black tracking-tight">{exam?.name}</h1>
                        <p className="text-slate-400 font-bold uppercase text-[11px] tracking-widest flex items-center gap-2">
                            <BookOpen className="w-3.5 h-3.5" />
                            {exam?.program?.name} • Batch {exam?.batch}
                        </p>
                    </div>
                </div>
            </div>

            <div className="flex flex-wrap gap-4 pt-4 md:pt-0">
                <div className="bg-white/5 border border-white/10 px-6 py-3 rounded-2xl">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Target Subject</p>
                    <input 
                      value={subjectName}
                      onChange={(e) => setSubjectName(e.target.value)}
                      className="bg-transparent text-sm font-bold border-none outline-none focus:ring-0 w-40 p-0 text-indigo-300"
                    />
                </div>
                <button 
                  onClick={handleSaveAll}
                  disabled={isSaving}
                  className="flex items-center gap-2 bg-indigo-500 hover:bg-indigo-400 text-white px-8 py-4 rounded-2xl transition-all shadow-xl shadow-indigo-500/30 active:scale-95 font-black uppercase tracking-widest text-xs"
                >
                    <Save className="w-4 h-4" />
                    {isSaving ? 'Reconciling...' : 'Sync to Result Engine'}
                </button>
            </div>
        </div>
        
        {/* Abstract shapes */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 blur-[80px] -translate-y-1/2 translate-x-1/2" />
      </div>

      {/* Main Roster Grid */}
      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden">
        <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-3">
                <Users className="w-4 h-4" />
                Enrollment Roster Analysis
            </h3>
            <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-3 py-1 rounded-lg uppercase tracking-tighter">
                {students.filter(s => s.isSaved).length} / {students.length} Synchronized
            </span>
        </div>
        
        <div className="overflow-x-auto">
            <table className="w-full text-left">
                <thead className="bg-slate-50/50 px-8">
                    <tr>
                        <th className="px-10 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Student Identity</th>
                        <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Theory (70)</th>
                        <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Practical (20)</th>
                        <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Internal (10)</th>
                        <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Aggregated</th>
                        <th className="px-10 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Status</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {students.map((s) => (
                        <tr key={s.id} className="hover:bg-slate-50/50 transition-all group">
                            <td className="px-10 py-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                        <User className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-black text-slate-900 group-hover:text-indigo-600 transition-colors uppercase tracking-tight">{s.name}</p>
                                        <p className="text-[10px] font-bold text-slate-400 font-mono tracking-tighter uppercase">{s.enrollId}</p>
                                    </div>
                                </div>
                            </td>
                            <td className="px-6 py-6">
                                <input 
                                    type="number" 
                                    value={s.theory}
                                    onChange={(e) => handleMarkChange(s.id, 'theory', e.target.value)}
                                    className="w-20 mx-auto block px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-center font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                                />
                            </td>
                            <td className="px-6 py-6">
                                <input 
                                    type="number" 
                                    value={s.practical}
                                    onChange={(e) => handleMarkChange(s.id, 'practical', e.target.value)}
                                    className="w-20 mx-auto block px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-center font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                                />
                            </td>
                            <td className="px-6 py-6">
                                <input 
                                    type="number" 
                                    value={s.internal}
                                    onChange={(e) => handleMarkChange(s.id, 'internal', e.target.value)}
                                    className="w-20 mx-auto block px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-center font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                                />
                            </td>
                            <td className="px-6 py-6">
                                <div className="w-20 mx-auto text-center font-black text-lg text-slate-900">
                                    {s.total}
                                </div>
                            </td>
                            <td className="px-10 py-6 text-right">
                                {s.isSaved ? (
                                    <div className="flex items-center justify-end gap-1.5 text-emerald-500">
                                        <CheckCircle2 className="w-4 h-4" />
                                        <span className="text-[10px] font-black uppercase tracking-widest">Synced</span>
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-end gap-1.5 text-amber-500 animate-pulse">
                                        <Zap className="w-4 h-4" />
                                        <span className="text-[10px] font-black uppercase tracking-widest">Pending Sync</span>
                                    </div>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
      </div>

      {/* Instructional Footer */}
      <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6 flex items-start gap-4">
          <AlertCircle className="w-6 h-6 text-indigo-500 shrink-0 mt-0.5" />
          <div className="space-y-1">
              <p className="text-xs font-black text-slate-900 uppercase tracking-widest">Assessment Reconciliation Protocol</p>
              <p className="text-sm text-slate-600 font-medium leading-relaxed">Ensure all parameters (Theory/Practical/Internal) are audited against physical transcripts before synchronization. Total marks are aggregated in real-time. Once synced to the result engine, scores are locked for transcript generation.</p>
          </div>
      </div>
    </div>
  );
}

// Minimal Users icon
function Users({ className }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
    )
}
