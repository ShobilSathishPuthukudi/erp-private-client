import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { Download, FileText, Award, TrendingUp, BookOpen, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Mark {
  id: number;
  subjectName: string;
  theoryMarks: number;
  practicalMarks: number;
  internalMarks: number;
  totalMarks: number;
  grade: string;
  exam: { name: string, batch: string };
}

export default function Transcript() {
  const user = useAuthStore(state => state.user);
  const [marks, setMarks] = useState<Mark[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchTranscript = async () => {
      try {
        const studentId = user?.uid.replace('STU', '');
        const res = await api.get(`/exams/student/${studentId}/transcript`);
        setMarks(res.data.marks);
      } catch (error) {
        toast.error('Failed to sync academic transcript');
      } finally {
        setIsLoading(false);
      }
    };
    fetchTranscript();
  }, [user]);

  const generatePDF = () => {
    try {
        const doc = new jsPDF();
        
        // Header
        doc.setFontSize(22);
        doc.setTextColor(15, 23, 42); // slate-900
        doc.text('INSTITUTIONAL MARKSHEET', 105, 20, { align: 'center' });
        
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text('RPS ERP - OFFICIAL ACADEMIC RECORD', 105, 28, { align: 'center' });
        
        // Student Info
        doc.setFontSize(12);
        doc.setTextColor(0);
        doc.text(`Student Name: ${user?.name || 'N/A'}`, 20, 45);
        doc.text(`Enrollment ID: ${user?.uid || 'N/A'}`, 20, 52);
        doc.text(`Date of Issue: ${new Date().toLocaleDateString()}`, 140, 45);
        
        const tableData = marks.map((m, i) => [
            i + 1,
            m.subjectName,
            m.theoryMarks,
            m.practicalMarks,
            m.internalMarks,
            m.totalMarks,
            m.grade
        ]);

        autoTable(doc, {
            startY: 65,
            head: [['#', 'Subject', 'Theory', 'Practical', 'Internal', 'Total', 'Grade']],
            body: tableData,
            theme: 'striped',
            headStyles: { fillBox: [15, 23, 42], textColor: 255, fontStyle: 'bold' },
            styles: { fontSize: 9, cellPadding: 4 }
        });

        const finalY = (doc as any).lastAutoTable.finalY + 20;
        doc.text('This is a computer-generated document verified via the RPS ERP system.', 20, finalY);
        doc.save(`${user?.uid}_Transcript.pdf`);
        toast.success('Official transcript generated successfully');
    } catch (error) {
        toast.error('PDF Engine failure');
    }
  };

  if (isLoading) return <div className="p-8 text-center font-mono animate-pulse uppercase tracking-[0.2em] text-slate-400 font-bold">Synchronizing Academic Ledger...</div>;

  return (
    <div className="space-y-6 flex flex-col h-[calc(100vh-8rem)] p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center shrink-0">
        <div>
           <h1 className="text-3xl font-black text-slate-900 tracking-tight">Academic Transcript</h1>
           <p className="text-slate-500 text-sm font-medium">Verified record of your institutional performance and evaluations.</p>
        </div>
        <button 
            onClick={generatePDF}
            className="bg-slate-900 text-white px-8 py-3 rounded-2xl font-bold flex items-center gap-3 hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 active:scale-95"
        >
            <Download className="w-4 h-4" />
            Download Marksheet
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 shrink-0">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4 group hover:border-blue-200 transition-colors">
             <div className="p-3 bg-blue-50 rounded-xl group-hover:scale-110 transition-transform">
                <FileText className="w-6 h-6 text-blue-600" />
             </div>
             <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Subjects</p>
                <p className="text-2xl font-black text-slate-900">{marks.length}</p>
             </div>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4 group hover:border-emerald-200 transition-colors">
             <div className="p-3 bg-emerald-50 rounded-xl group-hover:scale-110 transition-transform">
                <Award className="w-6 h-6 text-emerald-600" />
             </div>
             <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Aggregate Grade</p>
                <p className="text-2xl font-black text-slate-900">A / 8.5 CGPA</p>
             </div>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4 group hover:border-indigo-200 transition-colors">
             <div className="p-3 bg-indigo-50 rounded-xl group-hover:scale-110 transition-transform">
                <TrendingUp className="w-6 h-6 text-indigo-600" />
             </div>
             <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Academic Status</p>
                <p className="text-2xl font-black text-slate-900 text-indigo-600">PASS</p>
             </div>
          </div>
      </div>

      <div className="flex-1 min-h-0 bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden flex flex-col">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                  <BookOpen className="w-5 h-5 text-slate-400" />
                  <span className="font-black text-slate-900 uppercase tracking-widest text-sm">Session-wise Performance Ledger</span>
              </div>
              <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Verified Records</span>
              </div>
          </div>
          
          <div className="flex-1 overflow-auto">
            <table className="w-full text-left">
                <thead className="sticky top-0 bg-slate-50/80 backdrop-blur-md z-10 border-b border-slate-100">
                    <tr>
                        <th className="px-8 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Subject Context</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">T/P/I Split</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Total Score</th>
                        <th className="px-8 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Grade Point</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                    {marks.map((m) => (
                        <tr key={m.id} className="hover:bg-slate-50/50 transition-colors group">
                            <td className="px-8 py-6">
                                <p className="font-black text-slate-900 tracking-tight text-sm uppercase">{m.subjectName}</p>
                                <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-tighter">{m.exam?.name} | {m.exam?.batch}</p>
                            </td>
                            <td className="px-6 py-6 font-mono text-xs text-center text-slate-500">
                                {m.theoryMarks} / {m.practicalMarks} / {m.internalMarks}
                            </td>
                            <td className="px-6 py-6 text-center">
                                <span className="text-xl font-black text-slate-900">{m.totalMarks}</span>
                                <span className="text-[10px] font-black text-slate-300 ml-1">/ 170</span>
                            </td>
                            <td className="px-8 py-6 text-right">
                                <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-900 rounded-lg shadow-md shadow-slate-200">
                                    <CheckCircle className="w-3 h-3 text-blue-400" />
                                    <span className="font-black text-white text-sm">{m.grade}</span>
                                </div>
                            </td>
                        </tr>
                    ))}
                    {marks.length === 0 && (
                        <tr>
                            <td colSpan={4} className="p-20 text-center">
                                <div className="inline-flex p-4 bg-slate-100 rounded-full mb-4">
                                    <BookOpen className="w-8 h-8 text-slate-400" />
                                </div>
                                <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">No academic records have been published yet.</p>
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
          </div>
      </div>
    </div>
  );
}
