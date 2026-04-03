import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { DataTable } from '@/components/shared/DataTable';
import { Modal } from '@/components/shared/Modal';
import { 
  BookOpen, 
  Layers, 
  Plus, 
  Trash2, 
  FileCheck,
  ChevronRight,
  GraduationCap,
  X
} from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import toast from 'react-hot-toast';

interface Program {
  id: number;
  name: string;
  shortName: string;
  type: string;
  status: string;
  totalCredits: number;
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
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to revoke subject');
    }
  };

  const columns: ColumnDef<Program>[] = [
    {
      accessorKey: 'shortName',
      header: 'Academic Program',
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 border border-indigo-100">
             <GraduationCap className="w-5 h-5" />
          </div>
          <p className="font-bold text-slate-900 uppercase tracking-tight">{row.original.shortName || row.original.name}</p>
        </div>
      )
    },
    {
      accessorKey: 'type',
      header: 'Sub-Department',
      cell: ({ row }) => (
        <span className="bg-slate-50 border border-slate-200 text-slate-600 text-[10px] px-2 py-1 rounded-lg font-black uppercase tracking-widest leading-none">
           {row.original.type}
        </span>
      )
    },
    {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => {
            const status = row.original.status?.toLowerCase();
            return (
                <span className={`px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-full border ${
                    status === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 
                    status === 'staged' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                    'bg-amber-50 text-amber-700 border-amber-200'
                }`}>
                    {row.original.status}
                </span>
            );
        }
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

      </div>

      <div className="w-full bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-sm">
         <DataTable columns={columns} data={programs} isLoading={isLoading} />
      </div>

    <Modal
        isOpen={!!selectedProgram}
        onClose={() => setSelectedProgram(null)}
        hideHeader={true}
        maxWidth="2xl"
    >
        <div className="bg-white overflow-hidden transition-all duration-300 flex flex-col max-h-[calc(100vh-160px)]">
            {/* Custom Institutional Header */}
            <div className="bg-slate-900 p-6 text-white flex justify-between items-center shrink-0 relative border-b border-slate-800">
                <div className="flex items-center gap-3">
                    <div className="bg-white/20 p-2 rounded-xl backdrop-blur-md">
                        <Layers className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest leading-none mb-1">
                            Academic Architect
                        </p>
                        <h2 className="text-xl font-bold tracking-tight uppercase">
                            {selectedProgram?.shortName || selectedProgram?.name}
                        </h2>
                    </div>
                </div>
                <button 
                    onClick={() => setSelectedProgram(null)}
                    className="p-2 hover:bg-white/10 rounded-lg transition-all hover:scale-110 active:scale-90 text-white/60 hover:text-white"
                >
                    <X className="w-5 h-5" />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-8 min-h-0 custom-scrollbar">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-bold text-slate-900 uppercase leading-tight tracking-tight">Architectural Mapping</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Configure and ratify course structures</p>
                    </div>
                    <button 
                        onClick={() => setIsSubjectModalOpen(true)}
                        className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center hover:bg-indigo-600 transition-all shadow-xl shadow-slate-200"
                    >
                        <Plus className="w-6 h-6" />
                    </button>
                </div>

                {/* Credit Scorecard */}
                {selectedProgram && (
                    <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-200 shadow-sm">
                        <div className="flex justify-between items-end mb-3">
                            <div className="flex flex-col">
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">Credit Scorecard</span>
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-tighter">Academic Threshold Tracking</span>
                            </div>
                            <span className="text-lg font-black text-slate-900 font-mono">
                                {selectedProgram.subjects?.reduce((sum, s) => sum + s.credits, 0) || 0} / {selectedProgram.totalCredits} <span className="text-[10px] text-slate-400">PTS</span>
                            </span>
                        </div>
                        <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden p-0.5">
                            <div 
                                className={`h-full rounded-full transition-all duration-1000 ease-out shadow-sm ${
                                    (selectedProgram.subjects?.reduce((sum, s) => sum + s.credits, 0) || 0) >= selectedProgram.totalCredits 
                                    ? 'bg-emerald-500' 
                                    : 'bg-slate-900 animate-pulse'
                                }`}
                                style={{ 
                                    width: `${Math.min(100, ((selectedProgram.subjects?.reduce((sum, s) => sum + s.credits, 0) || 0) / selectedProgram.totalCredits) * 100)}%` 
                                }}
                            />
                        </div>
                        {(selectedProgram.subjects?.reduce((sum, s) => sum + s.credits, 0) || 0) >= selectedProgram.totalCredits ? (
                            <div className="mt-4 p-2.5 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center gap-2">
                                <FileCheck className="w-4 h-4 text-emerald-600" />
                                <p className="text-[10px] text-emerald-700 font-black uppercase tracking-wider">
                                    Academic threshold met. Readiness: STAGED.
                                </p>
                            </div>
                        ) : (
                            <div className="mt-4 p-2.5 bg-amber-50 border border-amber-100 rounded-xl flex items-center gap-2">
                                <X className="w-4 h-4 text-amber-600" />
                                <p className="text-[10px] text-amber-700 font-black uppercase tracking-wider">
                                    Insufficient credits. Deploy {selectedProgram.totalCredits - (selectedProgram.subjects?.reduce((sum, s) => sum + s.credits, 0) || 0)} more points.
                                </p>
                            </div>
                        )}
                    </div>
                )}

                <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Formalized Subjects</label>
                    <div className="space-y-3">
                        {selectedProgram?.subjects?.length ? (
                            selectedProgram.subjects.map((sub, i) => (
                                <div key={i} className="p-4 bg-white rounded-2xl border border-slate-200 flex items-center justify-between group hover:border-slate-900 transition-all hover:shadow-lg hover:shadow-slate-100">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-xs font-black text-slate-800 border border-slate-100 group-hover:bg-slate-900 group-hover:text-white transition-all">
                                            {sub.credits}
                                        </div>
                                        <span className="font-bold text-slate-700 uppercase tracking-tight">{sub.name}</span>
                                    </div>
                                    <button 
                                        onClick={() => handleDeleteSubject(sub.id)}
                                        className="text-rose-500 p-2 hover:bg-rose-50 rounded-xl transition-all active:scale-95"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))
                        ) : (
                            <div className="py-16 text-center text-slate-400 border-2 border-dashed border-slate-100 rounded-[2rem] bg-slate-50/50">
                                <Layers className="w-10 h-10 mx-auto mb-3 opacity-20" />
                                <p className="text-[10px] font-black uppercase tracking-widest">No structural nodes defined</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="flex justify-end gap-3 p-8 bg-slate-50 border-t border-slate-200 shrink-0 uppercase">
                <button 
                    onClick={() => setSelectedProgram(null)}
                    className="px-8 py-4 bg-white text-slate-600 font-bold text-[10px] tracking-widest rounded-2xl border border-slate-200 hover:bg-slate-100 transition-all active:scale-95 shadow-sm"
                >
                    Cancel
                </button>
                <button 
                    onClick={() => {
                        toast.success('Course architecture ratified');
                        setSelectedProgram(null);
                    }}
                    className="px-8 py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black tracking-widest hover:bg-indigo-600 transition-all shadow-xl shadow-slate-200 active:scale-[0.98]"
                >
                    Save
                </button>
            </div>
        </div>
    </Modal>\n
    <Modal
        isOpen={isSubjectModalOpen}
        onClose={() => setIsSubjectModalOpen(false)}
        title="Formalize New Subject"
      >
        <div className="space-y-5 p-2">
            <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Subject Nomenclature</label>
                <div className="relative group">
                    <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-slate-900 transition-colors" />
                    <input 
                        type="text"
                        value={newSubject.name}
                        onChange={(e) => setNewSubject({ ...newSubject, name: e.target.value })}
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900 transition-all font-medium text-slate-900"
                        placeholder="Advanced Calculus v3"
                    />
                </div>
            </div>
            <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Credit Weightage</label>
                <div className="relative group">
                    <Layers className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-slate-900 transition-colors" />
                    <input 
                        type="number"
                        value={newSubject.credits}
                        onChange={(e) => setNewSubject({ ...newSubject, credits: parseInt(e.target.value) })}
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900 transition-all font-medium text-slate-900"
                        min="1"
                    />
                </div>
            </div>
            <div className="pt-6 border-t border-slate-100 flex justify-end gap-3\">
                <button 
                  onClick={() => setIsSubjectModalOpen(false)}
                  className="px-6 py-3 text-slate-600 font-bold hover:bg-slate-50 rounded-xl transition-colors"
                >
                  Abort
                </button>
                <button 
                    onClick={handleAddSubject}
                    className="px-8 py-3 bg-slate-900 text-white rounded-xl font-black hover:bg-slate-800 transition-all active:scale-95 shadow-lg shadow-slate-900/20"
                >
                    Ratify Subject
                </button>
            </div>
        </div>
      </Modal>
    </div>
  );
}
