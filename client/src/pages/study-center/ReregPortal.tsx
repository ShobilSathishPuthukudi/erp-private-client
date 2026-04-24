import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import { RefreshCw, Users, FileText, AlertCircle } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';

interface Student {
  uid: string;
  name: string;
  semester: number;
  program: { name: string };
}

export default function ReregPortal() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState<string>('');
  const [formData, setFormData] = useState({
    targetSemester: 0,
    amountPaid: 0,
    paymentProof: '',
    cycle: '2026-Semester2'
  });

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      const res = await api.get('/portals/partner-center/students'); // Use center-specific student list
      setStudents(res.data);
    } catch (error) {
      toast.error('Failed to load students for REREG');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/rereg/submit', { studentId: selectedStudent, ...formData });
      toast.success('REREG submitted for Finance verification');
      setSelectedStudent('');
    } catch (error) {
      toast.error('Failed to submit REREG');
    }
  };

  if (loading) return <div className="animate-pulse h-64 bg-slate-50 rounded-2xl" />;

  return (
    <div className="p-2 space-y-8">
      <PageHeader 
        title="Academic re-registration"
        description="Initiate the next academic cycle for your students. Ensure payment proofs are forensic and amounts match the program's fee schema for auto-approval."
        icon={RefreshCw}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
         <div className="lg:col-span-2 bg-white border border-slate-200 rounded-[32px] p-8 shadow-sm">
            <h3 className="text-xl font-black text-slate-900 tracking-tighter mb-6 flex items-center gap-2">
               <Users className="w-6 h-6 text-blue-600" />
               Select student
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               {students.map((student) => (
                 <button 
                   key={student.uid}
                   onClick={() => {
                     setSelectedStudent(student.uid);
                     setFormData({ ...formData, targetSemester: student.semester + 1 });
                   }}
                   className={`p-6 rounded-2xl border-2 transition-all text-left group ${selectedStudent === student.uid ? 'border-blue-600 bg-blue-50/50' : 'border-slate-100 hover:border-blue-200'}`}
                 >
                    <p className="font-black text-slate-900 tracking-tight">{student.name}</p>
                    <p className="text-[10px] font-bold text-slate-400 tracking-widest mt-1">
                      {student.program.name} | Sem {student.semester}
                    </p>
                 </button>
               ))}
            </div>
         </div>

         <div className="bg-white border border-slate-200 rounded-[32px] p-8 shadow-sm h-fit">
            <h3 className="text-xl font-black text-slate-900 tracking-tighter mb-6 flex items-center gap-2">
               <FileText className="w-6 h-6 text-blue-600" />
               Re-registration submission
            </h3>
            {selectedStudent ? (
              <form onSubmit={handleSubmit} className="space-y-6">
                 <div className="space-y-2">
                    <label className="text-[10px] font-black tracking-widest text-slate-400">Target semester</label>
                    <input 
                      type="number"
                      className="w-full bg-slate-50 border-transparent rounded-xl px-4 py-3 text-sm font-bold"
                      value={formData.targetSemester}
                      readOnly
                    />
                 </div>
                 <div className="space-y-2">
                    <label className="text-[10px] font-black tracking-widest text-slate-400">Amount paid (₹)</label>
                    <input 
                      type="number"
                      className="w-full bg-slate-50 border-transparent rounded-xl px-4 py-3 text-sm focus:bg-white focus:ring-2 ring-blue-500 transition-all font-bold"
                      placeholder="Enter verified amount"
                      value={formData.amountPaid}
                      onChange={(e) => setFormData({ ...formData, amountPaid: parseFloat(e.target.value) })}
                    />
                 </div>
                 <div className="space-y-2">
                    <label className="text-[10px] font-black tracking-widest text-slate-400">Payment proof URL</label>
                    <input 
                      type="text"
                      className="w-full bg-slate-50 border-transparent rounded-xl px-4 py-3 text-sm focus:bg-white focus:ring-2 ring-blue-500 transition-all font-mono"
                      placeholder="institutional-receipt-url"
                      value={formData.paymentProof}
                      onChange={(e) => setFormData({ ...formData, paymentProof: e.target.value })}
                    />
                 </div>
                 <button 
                   type="submit"
                   className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black tracking-widest hover:bg-blue-700 transition-all shadow-lg active:scale-95"
                 >
                   Verify & submit
                 </button>
              </form>
            ) : (
              <div className="text-center py-20 grayscale opacity-30">
                 <AlertCircle className="w-12 h-12 mx-auto mb-4" />
                 <p className="text-xs font-black tracking-widest">Select a student to initiate</p>
              </div>
            )}
         </div>
      </div>
    </div>
  );
}
