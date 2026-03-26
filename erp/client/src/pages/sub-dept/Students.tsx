import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '@/lib/api';
import { 
  Users, 
  Search, 
  MapPin, 
  GraduationCap, 
  Layers,
  ShieldCheck,
  Building2,
  Clock
} from 'lucide-react';
import toast from 'react-hot-toast';

interface Student {
  id: number;
  name: string;
  enrollStatus: string;
  subDeptReviewStatus: string;
  feeStatus: string;
  program?: { name: string, duration: number };
  center?: { name: string };
  reviewStage?: 'SUB_DEPT' | 'OPS' | 'FINANCE';
  attemptCount?: number;
}

export default function Students() {
  const { unit } = useParams();
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchStudents = async () => {
    try {
      setIsLoading(true);
      const subDeptMap: Record<string, number> = { 'openschool': 8, 'online': 9, 'skill': 10, 'bvoc': 11 };
      const subDeptId = unit ? subDeptMap[unit.toLowerCase()] : null;
      
      const res = await api.get('/academic/students', {
        params: { subDeptId }
      });
      setStudents(res.data);
    } catch (error) {
      toast.error('Failed to access student execution registry');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, [unit]);

  const filteredStudents = students.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.id.toString().includes(searchTerm)
  );

  return (
    <div className="p-8 space-y-8 max-w-[1600px] mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
           <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tighter flex items-center gap-3">
              <Users className="w-8 h-8 text-blue-600" />
              Student <span className="text-blue-600 font-outline-1">Execution</span> Roster
           </h1>
           <p className="text-slate-500 font-medium tracking-tight">Read-only institutional roster for departmental execution monitoring.</p>
        </div>
        
        <div className="relative w-full md:w-96 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
          <input 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name or identity ID..." 
            className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all font-medium text-sm"
          />
        </div>
      </div>

      <div className="bg-blue-50/50 border border-blue-100 rounded-3xl p-6 flex flex-wrap gap-6 items-center">
         <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-black uppercase text-slate-600 tracking-widest">Total Roster: {students.length}</span>
         </div>
         <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-bold text-slate-500 uppercase tracking-tight">Jurisdiction: {unit?.toUpperCase()}</span>
         </div>
         <div className="ml-auto flex items-center gap-2 bg-white px-4 py-1.5 rounded-xl border border-blue-200">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
            <span className="text-[10px] font-black uppercase text-blue-600 tracking-widest">Read-Only Mode Active</span>
         </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[1,2,3,4,5,6,7,8].map(i => (
            <div key={i} className="bg-white border border-slate-200 rounded-[2.5rem] p-8 space-y-4 animate-pulse">
                <div className="w-16 h-16 bg-slate-100 rounded-2xl" />
                <div className="h-4 bg-slate-100 rounded w-2/3" />
                <div className="h-3 bg-slate-50 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredStudents.map((student) => {
            const stage = student.reviewStage || 'SUB_DEPT';
            return (
              <div key={student.id} className="group bg-white border border-slate-200 rounded-[2.5rem] p-8 hover:border-blue-500 hover:shadow-2xl hover:shadow-blue-500/10 transition-all relative overflow-hidden">
                <div className="flex justify-between items-start mb-6">
                   <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all overflow-hidden border border-slate-100">
                      <Users className="w-8 h-8" />
                   </div>
                   <span className={`px-2 py-1 text-[9px] font-black uppercase tracking-widest rounded-lg ${
                      student.enrollStatus === 'active' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                   }`}>
                      {student.enrollStatus}
                   </span>
                </div>

                <div className="space-y-4">
                  <div>
                    <h3 className="font-black text-slate-900 text-lg leading-tight group-hover:text-blue-600 transition-colors uppercase tracking-tight">{student.name}</h3>
                    <p className="text-[10px] font-mono text-slate-400 mt-1 uppercase">ID: ARCH-{student.id}</p>
                  </div>

                  <div className="space-y-2.5">
                    <div className="flex items-center gap-3 text-xs text-slate-600 font-bold">
                        <GraduationCap className="w-4 h-4 text-slate-400" />
                        <span className="truncate">{student.program?.name || 'Unassigned Program'}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-500 font-medium">
                        <MapPin className="w-4 h-4 text-slate-400" />
                        <span className="truncate">{student.center?.name || 'Center Pending'}</span>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-50 flex flex-col gap-2">
                     <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Workflow Stage</span>
                        <div className="flex items-center gap-1.5">
                            {stage === 'FINANCE' ? <ShieldCheck className="w-3 h-3 text-emerald-500" /> : <Clock className="w-3 h-3 text-amber-500" />}
                            <span className={`text-[10px] font-bold uppercase ${
                                stage === 'FINANCE' ? 'text-emerald-600' : 'text-amber-600'
                            }`}>{stage}</span>
                        </div>
                     </div>
                     <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Finance State</span>
                        <span className={`text-[10px] font-black uppercase tracking-tighter ${
                            student.feeStatus === 'paid' ? 'text-indigo-600' : 'text-rose-500'
                        }`}>{student.feeStatus || 'UNPAID'}</span>
                     </div>
                     {student.attemptCount && student.attemptCount > 1 && (
                        <div className="px-3 py-1 bg-rose-50 rounded-lg text-rose-600 text-[9px] font-black uppercase tracking-tight text-center">
                            Re-submission Attempt #{student.attemptCount}
                        </div>
                     )}
                  </div>
                </div>

                {/* Aesthetic background accent */}
                <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50/30 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-blue-500/10 transition-colors" />
              </div>
            );
          })}
        </div>
      )}

      {filteredStudents.length === 0 && !isLoading && (
        <div className="bg-white border border-dashed border-slate-300 rounded-[3rem] p-20 text-center space-y-4">
            <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mx-auto text-slate-300">
                <Users className="w-10 h-10" />
            </div>
            <h3 className="text-xl font-black text-slate-900 uppercase">No roster records detected</h3>
            <p className="text-slate-500 max-w-sm mx-auto font-medium">Try adjusting your search filters or check another institutional unit.</p>
        </div>
      )}
    </div>
  );
}
