import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '@/lib/api';
import { DataTable } from '@/components/shared/DataTable';
import type { ColumnDef } from '@tanstack/react-table';
import { ArrowLeft, BookOpen, DollarSign, Layout, Users, ShieldCheck, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';

interface Student {
    id: number;
    name: string;
    enrollStatus: string;
}

interface Fee {
    id: number;
    name: string;
    isActive: boolean;
    schema: any;
}

interface OfferingCenter {
    id: number;
    center: { id: number, name: string };
}

interface Program {
  id: number;
  name: string;
  type: string;
  status: string;
  duration: number;
  description?: string;
  eligibility?: any;
  university: { id: number, name: string };
  fees: Fee[];
  students: Student[];
  offeringCenters: OfferingCenter[];
}

export default function ProgramDetails() {
  const { id } = useParams();
  const [program, setProgram] = useState<Program | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchProgram = async () => {
      try {
        const res = await api.get(`/academic/programs/${id}`);
        setProgram(res.data);
      } catch (error) {
        toast.error('Failed to fetch program parameters');
      } finally {
        setIsLoading(false);
      }
    };
    fetchProgram();
  }, [id]);

  if (isLoading) return <div className="p-8 text-center font-mono">Loading program manifest...</div>;
  if (!program) return <div className="p-8 text-center text-red-500">Program core inaccessible</div>;

  const studentColumns: ColumnDef<Student>[] = [
    { accessorKey: 'id', header: 'UID', cell: ({ row }) => <span className="font-mono text-xs">STU-{row.original.id}</span> },
    { accessorKey: 'name', header: 'Student Identity', cell: ({ row }) => <span className="font-medium text-slate-900">{row.original.name}</span> },
    { 
        accessorKey: 'enrollStatus', 
        header: 'Enrollment Path',
        cell: ({ row }) => (
            <span className={`px-2 py-0.5 text-[9px] rounded-full font-bold uppercase ${
                row.original.enrollStatus === 'active' ? 'bg-green-50 text-green-600' : 'bg-slate-100 text-slate-500'
            }`}>
                {row.original.enrollStatus}
            </span>
        )
    }
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-6">
      <Link to="/dashboard/academic/programs" className="flex items-center space-x-2 text-slate-500 hover:text-slate-900 transition-colors mb-4">
        <ArrowLeft className="w-4 h-4" />
        <span className="text-sm font-medium">Back to Programs</span>
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
             <div className="flex items-start justify-between">
                <div>
                   <h1 className="text-3xl font-bold text-slate-900">{program.name}</h1>
                   <div className="flex items-center gap-3 mt-3">
                      <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">{program.type}</span>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                        program.status === 'open' ? 'bg-green-50 text-green-700' : 
                        program.status === 'active' ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-100 text-slate-600'
                      }`}>
                          {program.status}
                      </span>
                   </div>
                </div>
                <div className="text-right">
                    <p className="text-xs font-bold text-slate-400 uppercase">Duration</p>
                    <p className="text-xl font-bold text-slate-900">{program.duration} Months</p>
                </div>
             </div>

             <div className="mt-8 pt-8 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                   <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-4 uppercase tracking-wider">
                      <ShieldCheck className="w-4 h-4 text-blue-600" />
                      Eligibility Matrix
                   </h3>
                   <div className="bg-slate-50 p-4 rounded-xl text-sm text-slate-600 min-h-[100px]">
                      {program.eligibility ? (
                          <pre className="whitespace-pre-wrap font-sans">{JSON.stringify(program.eligibility, null, 2)}</pre>
                      ) : "System eligibility rules not yet configured for this node."}
                   </div>
                </div>
                <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-4 uppercase tracking-wider">
                        <BookOpen className="w-4 h-4 text-blue-600" />
                        Infrastructure Context
                    </h3>
                    <p className="text-sm text-slate-600 leading-relaxed">
                        {program.description || "No technical description available for this institutional offering."}
                    </p>
                </div>
             </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden text-sm">
            <div className="p-6 border-b border-slate-100">
                <h2 className="text-lg font-bold text-slate-900">Enrollment Matrix</h2>
            </div>
            <DataTable columns={studentColumns} data={program.students} searchKey="name" />
          </div>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-6">
           <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-xl shadow-slate-200">
              <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-6">Partner University</h3>
              <Link to={`/dashboard/academic/universities/${program.university.id}`} className="group block">
                <div className="flex items-center justify-between border border-slate-700 p-4 rounded-xl hover:bg-slate-800 transition-colors">
                    <div className="flex items-center gap-3">
                        <Layout className="w-6 h-6 text-blue-400" />
                        <span className="font-bold">{program.university.name}</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-500 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
           </div>

           <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <h3 className="text-sm font-bold text-slate-900 mb-6 uppercase tracking-wider flex items-center gap-2">
                 <DollarSign className="w-4 h-4 text-slate-400" />
                 Active Fee Structures
              </h3>
              <div className="space-y-4">
                 {program.fees && program.fees.length > 0 ? program.fees.map(fee => (
                     <div key={fee.id} className="p-4 border border-slate-100 rounded-xl bg-slate-50">
                        <p className="font-bold text-slate-900">{fee.name}</p>
                        <p className="text-xs text-slate-500 mt-1 uppercase">Schema: {fee.schema?.type || 'Standard'}</p>
                     </div>
                 )) : (
                     <p className="text-xs text-slate-400 italic">No fee schemas have been activated by Finance.</p>
                 )}
              </div>
           </div>

           <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-blue-50 rounded-lg">
                        <Users className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-slate-900">{program.students.length}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Global Enrollees</p>
                    </div>
                </div>
           </div>

           <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <h3 className="text-sm font-bold text-slate-900 mb-6 uppercase tracking-wider flex items-center gap-2">
                 <Layout className="w-4 h-4 text-slate-400" />
                 Offering Centers
              </h3>
              <div className="space-y-3">
                 {program.offeringCenters && program.offeringCenters.length > 0 ? program.offeringCenters.map(oc => (
                     <div key={oc.id} className="flex items-center justify-between text-xs p-2 border-b border-slate-50 last:border-0">
                         <span className="font-medium text-slate-700">{oc.center.name}</span>
                         <span className="text-[9px] font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded uppercase">Active</span>
                     </div>
                 )) : (
                     <p className="text-xs text-slate-400 italic">No centers currently offering this program.</p>
                 )}
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
