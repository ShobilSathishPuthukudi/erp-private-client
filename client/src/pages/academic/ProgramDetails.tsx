import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '@/lib/api';
import { 
  BookOpen, 
  Building2, 
  Users, 
  ShieldCheck, 
  ArrowLeft,
  FileText,
  CreditCard,
  Clock,
  Layers,
  Printer,
  Share2
} from 'lucide-react';
import toast from 'react-hot-toast';

interface Program {
  id: number;
  name: string;
  shortName?: string;
  universityId: number;
  duration: number;
  subDeptId: number;
  intakeCapacity: number;
  type: string;
  status: string;
  totalFee?: number;
  totalCredits?: number;
  university?: {
    name: string;
    shortName?: string;
  };
}

export default function ProgramDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [program, setProgram] = useState<Program | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('syllabus');

  const fetchProgram = async () => {
    try {
      setIsLoading(true);
      const res = await api.get(`/academic/programs/${id}`);
      setProgram(res.data);
    } catch (error) {
      toast.error('Failed to load program architecture');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProgram();
  }, [id]);

  if (isLoading) return <div className="p-8 text-slate-400 font-bold animate-pulse">Synchronizing program matrix...</div>;
  if (!program) return <div className="p-8 text-rose-500 font-black uppercase tracking-widest">Syllabus Node Not Found</div>;

  const tabs = [
    { id: 'syllabus', label: 'Syllabus Architecture', icon: Layers },
    { id: 'intake', label: 'Intake Velocity', icon: Users },
    { id: 'fees', label: 'Financial Modeling', icon: CreditCard },
    { id: 'registry', label: 'Institutional Registry', icon: FileText },
  ];

  return (
    <div className="space-y-8 max-w-[1600px] mx-auto p-4 lg:p-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
             <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-white shadow-lg">
                <BookOpen className="w-6 h-6" />
             </div>
             Program Architecture
          </h1>
          <p className="text-slate-500 font-medium text-sm ml-13">Curriculum Framework & Enrollment Lifecycle Tracking</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 transition-all border border-slate-200">
            <Printer className="w-5 h-5" />
          </button>
          <button className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 transition-all border border-slate-200">
            <Share2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Navigation */}
      <div>
        <button 
          onClick={() => navigate('/dashboard/academic/programs')}
          className="flex items-center gap-2 px-6 py-2.5 bg-white text-slate-600 rounded-xl border border-slate-200 font-bold text-sm hover:bg-slate-50 transition-all group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Back to Programs
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Main Content Area */}
        <div className="lg:col-span-8 space-y-8">
          {/* Main Info Card */}
          <div className="bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-xl shadow-slate-200/50 relative overflow-hidden">
            <div className="relative z-10">
                <div className="flex flex-wrap items-center gap-3 mb-6">
                    <span className="px-4 py-1 bg-slate-900 text-white rounded-lg font-black text-[10px] uppercase tracking-widest">{program.type || 'DEGREE'}</span>
                    <span className={`px-4 py-1 rounded-lg font-black text-[10px] uppercase tracking-widest border ${
                        program.status === 'active' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'
                    }`}>
                        {program.status || 'STAGED'}
                    </span>
                </div>

                <h2 className="text-5xl font-black text-slate-900 tracking-tighter mb-4 leading-none">{program.name}</h2>
                <div className="flex items-center gap-4 mb-10">
                    <Building2 className="w-5 h-5 text-slate-400 shrink-0" />
                    <Link to={`/dashboard/academic/universities/${program.universityId}`} className="text-lg font-bold text-blue-600 hover:underline decoration-2">
                        {program.university?.name || 'Partner University'}
                    </Link>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100/50">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5 text-blue-600">
                           <Clock className="w-3 h-3" /> Duration
                        </p>
                        <p className="text-xl font-black text-slate-900">{program.duration} Years</p>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100/50">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5 text-indigo-600">
                           <Layers className="w-3 h-3" /> Credits
                        </p>
                        <p className="text-xl font-black text-slate-900">{program.totalCredits || 'TBD'}</p>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100/50">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5 text-rose-600">
                           <Users className="w-3 h-3" /> Intake
                        </p>
                        <p className="text-xl font-black text-slate-900">{program.intakeCapacity || 0}</p>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100/50">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5 text-emerald-600">
                           <CreditCard className="w-3 h-3" /> Structure
                        </p>
                        <p className="text-xl font-black text-slate-900 uppercase">Regular</p>
                    </div>
                </div>
            </div>
            
            {/* Background design */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-slate-100/30 rounded-full translate-x-1/2 -translate-y-1/2 blur-3xl pointer-events-none" />
          </div>

          {/* Tabbed Navigation */}
          <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden">
            <div className="flex border-b border-slate-100 px-4 whitespace-nowrap overflow-x-auto no-scrollbar">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-8 py-6 text-[10px] font-black uppercase tracking-widest transition-all relative shrink-0 ${
                    activeTab === tab.id ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                  {activeTab === tab.id && (
                    <div className="absolute bottom-0 left-8 right-8 h-1 bg-blue-600 rounded-t-full shadow-lg shadow-blue-200" />
                  )}
                </button>
              ))}
            </div>

            <div className="p-10">
              <div className="text-center py-24 grayscale opacity-40">
                <Layers className="w-20 h-20 mx-auto mb-6 text-slate-300" />
                <h3 className="text-lg font-black text-slate-400 uppercase tracking-widest">Syllabus Segment Pending</h3>
                <p className="text-sm text-slate-300 font-medium mt-2">Deep-dive structural mapping currently in staging.</p>
                <div className="flex justify-center gap-4 mt-10">
                    <div className="w-2 h-2 rounded-full bg-slate-200" />
                    <div className="w-2 h-2 rounded-full bg-slate-200" />
                    <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar Info */}
        <div className="lg:col-span-4 space-y-8">
          {/* Institutional Context */}
          <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white shadow-2xl shadow-slate-900/40 relative overflow-hidden">
            <div className="relative z-10 space-y-8">
                <div>
                   <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4">Institutional Origin</h3>
                   <div className="flex items-center gap-4 bg-white/5 p-5 rounded-2xl border border-white/10 backdrop-blur-md">
                      <Building2 className="w-10 h-10 text-indigo-400 shrink-0" />
                      <div>
                         <p className="text-xs font-bold text-white line-clamp-1">{program.university?.name}</p>
                         <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Accredited Partner</p>
                      </div>
                   </div>
                </div>

                <div className="pt-6 border-t border-white/10 grid grid-cols-2 gap-4">
                    <div>
                       <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Sub-Department</p>
                       <p className="text-sm font-bold text-indigo-300">BVOC / SKILL</p>
                    </div>
                    <div>
                       <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Architecture</p>
                       <p className="text-sm font-bold text-indigo-300">Modular v2</p>
                    </div>
                </div>

                <Link 
                    to={`/dashboard/academic/universities/${program.universityId}`}
                    className="block w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-center font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-indigo-900/40 border border-indigo-500/50"
                >
                    View University Profile
                </Link>
            </div>
            
            {/* Visual flare */}
            <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-indigo-500/20 rounded-full blur-[100px] pointer-events-none" />
          </div>

          {/* Governance Info */}
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-xl shadow-slate-200/50">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-8">Governance HUD</h3>
            <div className="space-y-6">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center shrink-0 border border-amber-100">
                        <ShieldCheck className="w-5 h-5 text-amber-600" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-slate-500 uppercase mb-0.5 tracking-tight">Compliance Status</p>
                        <p className="text-sm font-bold text-slate-900">Framework Validated</p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0 border border-blue-100">
                        <FileText className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-slate-500 uppercase mb-0.5 tracking-tight">Deployment Revision</p>
                        <p className="text-sm font-bold text-slate-900">Institutional v4.2</p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center shrink-0 border border-slate-100 text-slate-400">
                        <Users className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-slate-500 uppercase mb-0.5 tracking-tight">Global Alignment</p>
                        <p className="text-sm font-bold text-slate-900">NEP-2020 Compliant</p>
                    </div>
                </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
