import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { DataTable } from '@/components/shared/DataTable';
import { Modal } from '@/components/shared/Modal';
import { 
  BookOpen, 
  Layers, 
  Plus, 
  Trash2, 
  FilePlus,
  FileCheck,
  ChevronRight,
  GraduationCap
} from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import toast from 'react-hot-toast';

interface Program {
  id: number;
  name: string;
  type: string;
  status: string;
  syllabusDoc?: string;
  subjects?: Subject[];
}

interface Subject {
  id: number;
  name: string;
  credits: number;
  modules?: Module[];
}

interface Module {
  id: number;
  description: string;
}

export default function SyllabusManager() {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedProgram, setSelectedProgram] = useState<Program | null>(null);
  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);
  
  // Form states
  const [newSubject, setNewSubject] = useState({ name: '', credits: 4 });

  const fetchPrograms = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/academic/programs');
      setPrograms(res.data);
    } catch (error) {
      toast.error('Failed to load academic architecture');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPrograms();
  }, []);

  const handleAddSubject = async () => {
    if (!newSubject.name) return;
    try {
      await api.post('/operations/subjects', {
        ...newSubject,
        programId: selectedProgram?.id
      });
      toast.success('Academic subject formalized');
      setIsSubjectModalOpen(false);
      setNewSubject({ name: '', credits: 4 });
      
      // Refresh list
      const res = await api.get('/academic/programs');
      const updatedPrograms = res.data;
      setPrograms(updatedPrograms);
      
      // Refresh selected program reference
      if (selectedProgram) {
        const fresh = updatedPrograms.find((p: any) => p.id === selectedProgram.id);
        if (fresh) setSelectedProgram(fresh);
      }
    } catch (error) {
      toast.error('Syllabus update failed');
    }
  };

  const handleDeleteSubject = async (subjectId: number) => {
    if (!confirm('Are you sure you want to revoke this academic subject?')) return;
    try {
      await api.delete(`/operations/subjects/${subjectId}`);
      toast.success('Subject removed from architecture');
      
      // Refresh
      const res = await api.get('/academic/programs');
      const updatedPrograms = res.data;
      setPrograms(updatedPrograms);
      if (selectedProgram) {
        const fresh = updatedPrograms.find((p: any) => p.id === selectedProgram.id);
        if (fresh) setSelectedProgram(fresh);
      }
    } catch (error) {
      toast.error('Failed to revoke subject');
    }
  };

  const columns: ColumnDef<Program>[] = [
    {
      accessorKey: 'name',
      header: 'Academic Program',
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 border border-indigo-100">
             <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <p className="font-bold text-slate-900">{row.original.name}</p>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{row.original.type}</p>
          </div>
        </div>
      )
    },
    {
      accessorKey: 'subjectsCount',
      header: 'Subjects',
      cell: ({ row }) => (
        <div className="flex items-center gap-2 font-bold text-slate-600">
          <Layers className="w-4 h-4 text-slate-400" />
          {row.original.subjects?.length || 0} Formalized
        </div>
      )
    },
    {
      accessorKey: 'syllabusStatus',
      header: 'Syllabus PDF',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
            {row.original.syllabusDoc ? (
                <span className="flex items-center gap-1.5 text-xs font-black text-emerald-600 uppercase bg-emerald-50 px-3 py-1 rounded-lg">
                    <FileCheck className="w-3.5 h-3.5" />
                    Uploaded
                </span>
            ) : (
                <span className="text-xs font-black text-slate-400 uppercase">Pending Manifest</span>
            )}
        </div>
      )
    },
    {
      id: 'actions',
      header: 'Architecture HUD',
      cell: ({ row }) => (
        <button 
          onClick={() => setSelectedProgram(row.original)}
          className="flex items-center gap-2 group text-indigo-600 font-bold"
        >
          Modify Structure
          <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </button>
      )
    }
  ];

  return (
    <div className="p-8 space-y-8 max-w-[1600px] mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Syllabus Management</h1>
          <p className="text-slate-500 font-medium">Engineer and ratify academic course structures and modules.</p>
        </div>
        <button 
            disabled
            className="px-6 py-3 bg-slate-900/10 text-slate-400 rounded-2xl font-black text-xs uppercase tracking-widest cursor-not-allowed"
        >
            Bulk Export Manifests
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-sm">
           <DataTable columns={columns} data={programs} isLoading={isLoading} />
        </div>

        <div className="space-y-6">
           {selectedProgram ? (
             <div className="bg-white rounded-[2.5rem] border border-indigo-500 p-8 shadow-2xl shadow-indigo-500/10 space-y-8 sticky top-8">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-xl font-black text-slate-900 uppercase leading-tight">Module Architect</h3>
                        <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">{selectedProgram.name}</p>
                    </div>
                    <button 
                        onClick={() => setIsSubjectModalOpen(true)}
                        className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center hover:bg-slate-900 transition-all shadow-lg shadow-indigo-200"
                    >
                        <Plus className="w-6 h-6" />
                    </button>
                </div>

                <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                    {selectedProgram.subjects?.length ? (
                        selectedProgram.subjects.map((sub, i) => (
                            <div key={i} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between group">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-xs font-black text-slate-400 border border-slate-200 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                                        {sub.credits}
                                    </div>
                                    <span className="font-bold text-slate-700">{sub.name}</span>
                                </div>
                                <button 
                                    onClick={() => handleDeleteSubject(sub.id)}
                                    className="opacity-0 group-hover:opacity-100 text-rose-500 p-1 hover:bg-rose-50 rounded-lg transition-all"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        ))
                    ) : (
                        <div className="py-12 text-center text-slate-400 border-2 border-dashed border-slate-100 rounded-3xl">
                            <Layers className="w-8 h-8 mx-auto mb-2 opacity-20" />
                            <p className="text-xs font-bold uppercase">No subjects Formalized</p>
                        </div>
                    )}
                </div>

                <div className="pt-8 border-t border-slate-100">
                    <button className="w-full py-4 bg-slate-50 text-slate-400 rounded-2xl border border-slate-200 flex items-center justify-center gap-3 text-xs font-black uppercase tracking-widest hover:border-indigo-500 hover:text-indigo-600 transition-all">
                        <FilePlus className="w-5 h-5" />
                        Link Syllabus PDF
                    </button>
                </div>
             </div>
           ) : (
             <div className="bg-slate-50 rounded-[2.5rem] p-12 text-center border-2 border-dashed border-slate-200">
                <BookOpen className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                <p className="font-black text-slate-400 uppercase text-sm">Select a program to engineer architecture</p>
             </div>
           )}
        </div>
      </div>

      <Modal
        isOpen={isSubjectModalOpen}
        onClose={() => setIsSubjectModalOpen(false)}
        title="Formalize New Subject"
      >
        <div className="space-y-6">
            <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Subject Nomenclature</label>
                <input 
                    type="text"
                    value={newSubject.name}
                    onChange={(e) => setNewSubject({ ...newSubject, name: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="e.g. Advanced Calculus v3"
                />
            </div>
            <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Credit Weightage</label>
                <input 
                    type="number"
                    value={newSubject.credits}
                    onChange={(e) => setNewSubject({ ...newSubject, credits: parseInt(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                />
            </div>
            <div className="pt-6 border-t border-slate-100 flex justify-end">
                <button 
                    onClick={handleAddSubject}
                    className="px-10 py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-600 transition-all"
                >
                    Ratify Subject
                </button>
            </div>
        </div>
      </Modal>
    </div>
  );
}
