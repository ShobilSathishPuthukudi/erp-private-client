import { useState, useEffect, useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '@/lib/api';
import { 
  Users, 
  MapPin, 
  GraduationCap, 
  Layers,
  ShieldCheck,
  Building2,
  Clock,
  Filter,
  ArrowRight,
  TrendingUp,
  Activity,
  AlertCircle,
  FileText,
  LayoutGrid,
  List
} from 'lucide-react';
import toast from 'react-hot-toast';
import { PageHeader } from '@/components/shared/PageHeader';

interface Student {
  id: number;
  name: string;
  enrollStatus: string;
  status: string;
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
  const [activeFilter, setActiveFilter] = useState<'all' | 'ENROLLED' | 'PENDING' | 'REJECTED'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const stats = useMemo(() => {
    return {
      total: students.length,
      enrolled: students.filter(s => s.status === 'ENROLLED').length,
      pending: students.filter(s => s.status !== 'ENROLLED' && s.status !== 'REJECTED').length,
      rejected: students.filter(s => s.status === 'REJECTED').length,
    };
  }, [students]);

  const fetchStudents = async () => {
    try {
      setIsLoading(true);
      const subDeptId = unit || null;
      
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

  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      if (activeFilter === 'all') return true;
      if (activeFilter === 'PENDING') return s.status !== 'ENROLLED' && s.status !== 'REJECTED';
      return s.status === activeFilter;
    });
  }, [students, activeFilter]);

  return (
    <div className="p-2 space-y-10 max-w-[1700px] mx-auto min-h-screen bg-slate-50/30">
      {/* Executive Page Header */}
      <PageHeader 
        title="Institutional structure"
        description={`Real-time execution monitoring for the ${unit} student roster.`}
        icon={Layers}
        action={
          <div className="flex items-center gap-3 bg-blue-50/50 p-1.5 rounded-2xl border border-blue-100">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-600/20">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-black text-blue-700 tracking-widest pr-3">Read-only mode</span>
          </div>
        }
      />


      {/* Roster Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-white/50 backdrop-blur-md p-3 rounded-[2rem] border border-slate-200/60 shadow-sm">
         <div className="flex items-center gap-2 overflow-x-auto w-full lg:w-auto overflow-y-hidden no-scrollbar p-1">
            {[
               { id: 'all', label: 'Complete roster', count: stats.total },
               { id: 'ENROLLED', label: 'Enrolled', count: stats.enrolled },
               { id: 'PENDING', label: 'Pending', count: stats.pending },
               { id: 'REJECTED', label: 'Rejected', count: stats.rejected },
            ].map((chip) => (
               <button
                  key={chip.id}
                  onClick={() => setActiveFilter(chip.id as any)}
                  className={`px-6 py-2 rounded-xl text-[10px] font-black tracking-widest transition-all flex items-center gap-3 whitespace-nowrap ${
                     activeFilter === chip.id 
                     ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/20' 
                     : 'hover:bg-white text-slate-500 border border-transparent hover:border-slate-100'
                  }`}
               >
                  {chip.label}
                  <span className={`px-2 py-0.5 rounded-lg text-[9px] ${
                     activeFilter === chip.id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                  }`}>
                     {chip.count}
                  </span>
               </button>
            ))}
         </div>

         <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-2xl self-end lg:self-auto shrink-0">
            <button 
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-xl transition-all ${viewMode === 'grid' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-xl transition-all ${viewMode === 'list' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <List className="w-4 h-4" />
            </button>
         </div>
      </div>

      {isLoading ? (
        <div className={viewMode === 'grid' ? "grid grid-cols-1 xl:grid-cols-2 gap-8" : "space-y-4"}>
          {[1,2,3,4,5,6].map(i => (
            viewMode === 'grid' ? (
              <div key={i} className="bg-white border border-slate-200 rounded-[2rem] p-6 flex gap-6 animate-pulse">
                  <div className="w-20 h-20 bg-slate-100 rounded-2xl shrink-0" />
                  <div className="flex-1 space-y-4">
                    <div className="flex justify-between">
                       <div className="h-6 bg-slate-100 rounded-full w-1/2" />
                       <div className="h-6 bg-slate-100 rounded-full w-20" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                       <div className="h-16 bg-slate-50 rounded-2xl" />
                       <div className="h-16 bg-slate-50 rounded-2xl" />
                    </div>
                  </div>
              </div>
            ) : (
              <div key={i} className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center justify-between animate-pulse">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-slate-100 rounded-xl" />
                  <div className="space-y-2">
                    <div className="w-48 h-4 bg-slate-100 rounded-full" />
                    <div className="w-32 h-3 bg-slate-50 rounded-full" />
                  </div>
                </div>
                <div className="w-24 h-6 bg-slate-100 rounded-full" />
              </div>
            )
          ))}
        </div>
      ) : (
        <>
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
              {filteredStudents.map((student) => {
                const stage = student.reviewStage || 'SUB_DEPT';
                return (
                  <Link 
                    to={`/dashboard/subdept/${unit}/students/${student.id}`} 
                    key={student.id} 
                    className="group relative bg-white border border-slate-200 rounded-[2rem] p-6 hover:border-blue-500 hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-300 overflow-hidden flex flex-col md:flex-row gap-8 items-start md:items-center"
                  >
                    {/* Status Pillar */}
                    <div className={`absolute left-0 top-0 bottom-0 w-2.5 transition-all duration-300 ${
                       student.status === 'ENROLLED' ? 'bg-emerald-500' : 
                       student.status === 'REJECTED' ? 'bg-rose-500' :
                       'bg-amber-500'
                    } group-hover:w-3`} />

                    {/* Left: Identity */}
                    <div className="relative shrink-0">
                      <div className="w-20 h-20 rounded-[1.5rem] bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-slate-900 group-hover:text-white transition-all duration-300 shadow-inner group-hover:scale-105">
                        <Users className="w-10 h-10" />
                      </div>
                      {student.feeStatus === 'paid' && (
                        <div className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full border-2 border-white bg-indigo-600 flex items-center justify-center shadow-lg">
                          <ShieldCheck className="w-4 h-4 text-white" />
                        </div>
                      )}
                    </div>

                    {/* Right: Content Grid */}
                    <div className="flex-1 min-w-0 space-y-5">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                          <h3 className="font-black text-slate-900 text-2xl leading-tight group-hover:text-blue-600 transition-colors tracking-tighter mb-1 truncate">{student.name}</h3>
                          <div className="flex items-center gap-1.5">
                            <span className="px-2 py-0.5 bg-slate-100 rounded text-[9px] font-black text-slate-500 tracking-widest">ARCH-{student.id}</span>
                            <span className="h-1 w-1 rounded-full bg-slate-300" />
                            <span className="text-[10px] font-bold text-slate-400 tracking-tight truncate">{unit} jurisdiction</span>
                          </div>
                        </div>
                        <span className={`shrink-0 px-4 py-1.5 text-[10px] font-black tracking-widest rounded-full border shadow-sm ${
                          student.status === 'ENROLLED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 
                          student.status === 'REJECTED' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                          'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                          {student.status || student.enrollStatus}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="flex items-center gap-4 bg-slate-50/50 p-4 rounded-2xl border border-transparent group-hover:bg-white group-hover:border-slate-100 transition-all">
                          <div className="p-2 bg-white rounded-xl shadow-sm text-slate-400">
                            <GraduationCap className="w-5 h-5" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[9px] font-black text-slate-400 tracking-widest leading-none mb-1">Program</p>
                            <p className="text-[12px] font-bold text-slate-700 truncate leading-tight">{student.program?.name || 'Unassigned'}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 bg-slate-50/50 p-4 rounded-2xl border border-transparent group-hover:bg-white group-hover:border-slate-100 transition-all">
                          <div className="p-2 bg-white rounded-xl shadow-sm text-slate-400">
                            <MapPin className="w-5 h-5" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[9px] font-black text-slate-400 tracking-widest leading-none mb-1">Center</p>
                            <p className="text-[12px] font-bold text-slate-700 truncate leading-tight">{student.center?.name || 'Pending'}</p>
                          </div>
                        </div>
                      </div>

                      <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                         <div className="flex items-center gap-6">
                            <div className="space-y-1">
                               <p className="text-[9px] font-black text-slate-400 tracking-widest">Stage</p>
                               <div className="flex items-center gap-2">
                                  <div className={`h-2 w-2 rounded-full ${
                                     stage === 'FINANCE' ? 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.3)]' : 'bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.3)]'
                                  } animate-pulse`} />
                                  <span className="text-[11px] font-black tracking-wider text-slate-700">{stage}</span>
                               </div>
                            </div>
                            <div className="space-y-1">
                               <p className="text-[9px] font-black text-slate-400 tracking-widest">Fee</p>
                               <div className="flex items-center gap-2">
                                  {student.feeStatus === 'paid' ? <ShieldCheck className="w-4 h-4 text-indigo-600" /> : <Clock className="w-4 h-4 text-amber-500" />}
                                  <span className={`text-[11px] font-black tracking-widest ${
                                      student.feeStatus === 'paid' ? 'text-indigo-600' : 'text-slate-500'
                                  }`}>{student.feeStatus || 'unpaid'}</span>
                               </div>
                            </div>
                         </div>
                         <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
                      </div>
                    </div>

                    {/* Aesthetic background accent */}
                    <div className="absolute -top-12 -right-12 w-48 h-48 bg-blue-500/5 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50 border-b border-slate-100">
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 tracking-widest">Identify</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 tracking-widest">Program & center</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 tracking-widest text-center">Status</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 tracking-widest text-center">Stage</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 tracking-widest text-right">Fee</th>
                      <th className="px-6 py-4"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredStudents.map((student) => {
                      const stage = student.reviewStage || 'SUB_DEPT';
                      return (
                        <tr key={student.id} className="hover:bg-slate-50/50 transition-colors group">
                          <td className="px-6 py-5">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-slate-900 group-hover:text-white transition-all">
                                <Users className="w-5 h-5" />
                              </div>
                              <div>
                                <p className="font-black text-slate-900 tracking-tighter text-sm leading-none mb-1">{student.name}</p>
                                <p className="text-[9px] font-black text-slate-400 tracking-widest">ARCH-{student.id}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-5">
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-1.5">
                                <GraduationCap className="w-3 h-3 text-slate-300" />
                                <span className="text-[11px] font-bold text-slate-600 truncate max-w-[200px]">{student.program?.name || 'Unassigned'}</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <MapPin className="w-3 h-3 text-slate-300" />
                                <span className="text-[10px] font-medium text-slate-400 truncate max-w-[200px]">{student.center?.name || 'Pending'}</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-5 text-center">
                            <span className={`px-3 py-1 text-[9px] font-black tracking-widest rounded-full border ${
                              student.status === 'ENROLLED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 
                              student.status === 'REJECTED' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                              'bg-amber-50 text-amber-700 border-amber-200'
                            }`}>
                              {student.status || student.enrollStatus}
                            </span>
                          </td>
                          <td className="px-6 py-5 text-center">
                            <div className="flex flex-col items-center gap-1">
                              <div className={`h-1.5 w-1.5 rounded-full ${
                                stage === 'FINANCE' ? 'bg-emerald-500' : 'bg-amber-500'
                              }`} />
                              <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">{stage}</span>
                            </div>
                          </td>
                          <td className="px-6 py-5 text-right">
                             <div className="flex items-center gap-1.5 justify-end">
                                {student.feeStatus === 'paid' ? <ShieldCheck className="w-3 h-3 text-indigo-600" /> : <Clock className="w-3 h-3 text-amber-500" />}
                                <span className={`text-[10px] font-black tracking-widest ${
                                    student.feeStatus === 'paid' ? 'text-indigo-600' : 'text-slate-500'
                                }`}>{student.feeStatus || 'unpaid'}</span>
                             </div>
                          </td>
                          <td className="px-6 py-5 text-right">
                            <Link 
                              to={`/dashboard/subdept/${unit}/students/${student.id}`}
                              className="p-2 hover:bg-white hover:shadow-sm rounded-lg transition-all text-slate-400 hover:text-blue-600 inline-block"
                            >
                              <ArrowRight className="w-4 h-4" />
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {filteredStudents.length === 0 && !isLoading && (
        <div className="bg-white border-2 border-dashed border-slate-200 rounded-[3rem] p-12 md:p-24 text-center space-y-8 shadow-inner shadow-slate-50">
            <div className="relative inline-flex">
               <div className="absolute inset-0 bg-blue-100 rounded-[2.5rem] blur-2xl opacity-50 animate-pulse" />
               <div className="relative w-28 h-28 bg-white border border-slate-100 rounded-[2.5rem] shadow-xl flex items-center justify-center text-slate-300">
                   <Users className="w-12 h-12" />
               </div>
               <div className="absolute -right-2 -bottom-2 w-10 h-10 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-xl">
                  <Filter className="w-5 h-5" />
               </div>
            </div>
            <div className="space-y-3">
               <h3 className="text-3xl font-black text-slate-900 tracking-tighter">Zero roster matches</h3>
               <p className="text-slate-400 max-w-md mx-auto font-medium text-lg leading-relaxed lowercase tracking-tight italic">the institutional structure seems disconnected for this specific query. <span className="font-bold text-blue-600 not-italic uppercase text-sm">Action required:</span> check another unit or refine identity filters.</p>
            </div>
            <button 
               onClick={() => { setActiveFilter('all'); }}
               className="px-10 py-4 bg-blue-600 text-white rounded-2xl font-black text-[11px] tracking-[0.2em] shadow-2xl shadow-blue-600/30 hover:bg-blue-700 hover:scale-105 active:scale-95 transition-all"
            >
               Reset architecture view
            </button>
        </div>
      )}
    </div>
  );
}
