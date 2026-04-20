import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { BookOpen, Users, ChevronRight, GraduationCap, Calendar, AlertCircle, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import axios from 'axios';

interface Program {
  id: number;
  name: string;
  type: string;
}

interface Session {
  id: number;
  name: string;
}

interface Subject {
  id: number;
  name: string;
}

interface StudentRoster {
  id: number;
  uid: string;
  name: string;
  examMarks?: { internalMarks: number }[];
}

interface InternalMarksManagerProps {
  title: string;
  subtitle: string;
  role: 'partner-center' | 'sub-dept' | 'academic' | 'operations';
  readOnly?: boolean;
}

export default function InternalMarksManager({ title, subtitle, role, readOnly = false }: InternalMarksManagerProps) {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [roster, setRoster] = useState<StudentRoster[]>([]);
  
  const [selectedProgram, setSelectedProgram] = useState<number | null>(null);
  const [selectedSession, setSelectedSession] = useState<number | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  
  const [marksData, setMarksData] = useState<Record<number, number>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Normalize API Endpoints based on role
  const getProgramsUrl = () => {
    if (role === 'partner-center') return '/portals/partner-center/programs';
    if (['academic', 'operations'].includes(role)) return '/academic/programs';
    return `/sub-dept/programs`; // Default to Sub-Dept
  };

  const getSessionsUrl = (progId: number) => {
    return `/portals/sessions?programId=${progId}`;
  };

  // Phase 1: Load Authorized Programs
  const fetchPrograms = async () => {
    try {
      setIsLoading(true);
      const url = getProgramsUrl();
      const res = await api.get(url);
      
      // Normalize different response structures
      let normalized = res.data;
      if (role === 'partner-center') normalized = res.data.map((p: any) => p.program);
      
      setPrograms(normalized);
    } catch (error) {
      toast.error('Institutional Error: Failed to synchronize authorized program frameworks.');
    } finally {
      setIsLoading(false);
    }
  };

  // Phase 2: Load Context (Sessions & Subjects) based on Program
  const fetchProgramContext = async (programId: number) => {
    try {
      setIsLoading(true);
      const sessionUrl = getSessionsUrl(programId);
      const [sessionsRes, subjectsRes] = await Promise.all([
        api.get(sessionUrl),
        api.get(`/portals/subjects/${programId}`)
      ]);
      setSessions(sessionsRes.data);
      setSubjects(subjectsRes.data);
      setRoster([]); // Clear roster when program changes
      setSelectedSession(null);
      setSelectedSubject('');
    } catch (error) {
      toast.error('Failed to synchronize batch/subject context');
    } finally {
      setIsLoading(false);
    }
  };

  // Phase 3: Load Student Roster for Grading
  const fetchRoster = async () => {
    if (!selectedProgram || !selectedSession || !selectedSubject) return;
    
    try {
      setIsLoading(true);
      const res = await api.get('/portals/marks/grading-roster', {
        params: {
          programId: selectedProgram,
          sessionId: selectedSession,
          subjectName: selectedSubject
        }
      });
      setRoster(res.data);
      
      // Initialize marks map from existing records
      const initialMarks: Record<number, number> = {};
      res.data.forEach((s: StudentRoster) => {
        if (s.examMarks && s.examMarks.length > 0) {
          initialMarks[s.id] = Number(s.examMarks[0].internalMarks);
        }
      });
      setMarksData(initialMarks);
    } catch (error) {
      toast.error('Failed to generate grading roster from institutional registry');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchPrograms(); }, [role]);
  
  useEffect(() => {
    if (selectedProgram) fetchProgramContext(selectedProgram);
  }, [selectedProgram]);

  useEffect(() => {
    fetchRoster();
  }, [selectedSession, selectedSubject]);

  const handleMarkChange = (studentId: number, value: string) => {
    if (readOnly) return;
    const numericValue = value === '' ? 0 : parseFloat(value);
    if (isNaN(numericValue) || numericValue < 0 || numericValue > 100) return;
    
    setMarksData(prev => ({ ...prev, [studentId]: numericValue }));
  };

  const submitMarks = async () => {
    if (!selectedProgram || !selectedSession || !selectedSubject || readOnly) return;
    
    try {
      setIsSaving(true);
      const payload = {
        programId: selectedProgram,
        sessionId: selectedSession,
        subjectName: selectedSubject,
        marks: Object.entries(marksData).map(([studentId, internalMarks]) => ({
          studentId: parseInt(studentId),
          internalMarks
        }))
      };
      
      await api.post('/portals/marks/bulk', payload);
      toast.success(`Published assessments for ${selectedSubject}`);
      fetchRoster(); // Refresh to confirm persistence
    } catch (error) {
      const message = axios.isAxiosError(error)
        ? error.response?.data?.error || 'Institutional ledger synchronization failure'
        : 'Institutional ledger synchronization failure';
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-2 space-y-4 min-h-screen">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white px-6 py-5 rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50 gap-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center text-white shadow-lg shadow-slate-900/20 shrink-0">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight leading-tight mb-0.5 flex items-center gap-2">
              {title}
            </h1>
            <p className="text-slate-500 font-medium text-sm">{subtitle}</p>
          </div>
        </div>
      </div>

      {/* Configuration Hub */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 shrink-0 bg-white p-6 rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50 relative">
        {isLoading && (
            <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] z-10 flex items-center justify-center rounded-3xl">
                <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
            </div>
        )}
        
        {/* Program Selection */}
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
            <GraduationCap className="w-3 h-3" /> Select Program framework
          </label>
          <select 
            className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm font-semibold focus:ring-2 focus:ring-slate-900/5 transition-all"
            value={selectedProgram || ''}
            onChange={(e) => {
                setSelectedProgram(parseInt(e.target.value));
                setSelectedSession(null);
                setRoster([]);
                setMarksData({});
            }}
          >
            <option value="">Choose Program...</option>
            {programs.map(p => (
              <option key={p.id} value={p.id}>{p.name} ({p.type})</option>
            ))}
          </select>
        </div>

        {/* Batch Selection */}
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
            <Calendar className="w-3 h-3" /> Admission batch
          </label>
          <select 
            className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm font-semibold focus:ring-2 focus:ring-slate-900/5 transition-all disabled:opacity-50"
            value={selectedSession || ''}
            disabled={!selectedProgram}
            onChange={(e) => setSelectedSession(parseInt(e.target.value))}
          >
            <option value="">Choose Batch...</option>
            {sessions.map(s => <option key={s.id} value={s.id}>{s.name || s.id}</option>)}
          </select>
        </div>

        {/* Subject Selection */}
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
            <BookOpen className="w-3 h-3" /> Subject context
          </label>
          <select 
            className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm font-semibold focus:ring-2 focus:ring-slate-900/5 transition-all disabled:opacity-50"
            value={selectedSubject}
            disabled={!selectedProgram}
            onChange={(e) => setSelectedSubject(e.target.value)}
          >
            <option value="">Choose Subject...</option>
            {subjects.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
          </select>
        </div>
      </div>

      {/* Grading Workbook */}
      <div className="flex-1 min-h-[500px] bg-white rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50 flex flex-col overflow-hidden">
        {roster.length > 0 ? (
          <>
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white rounded-2xl shadow-sm"><Users className="w-5 h-5 text-blue-600" /></div>
                <div>
                   <p className="text-xs font-black uppercase tracking-widest text-slate-400">Grading Roster</p>
                   <h3 className="text-lg font-bold text-slate-800">{selectedSubject}</h3>
                </div>
              </div>
              {!readOnly && (
                <button 
                  onClick={submitMarks}
                  disabled={isSaving}
                  className="flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-black transition-all active:scale-95 disabled:opacity-50"
                >
                  {isSaving ? "Publishing..." : <>Publish Marks <ChevronRight className="w-4 h-4" /></>}
                </button>
              )}
            </div>
            
            <div className="flex-1 overflow-y-auto">
              <table className="w-full border-collapse">
                <thead className="sticky top-0 bg-white z-10">
                  <tr className="border-b border-slate-100">
                    <th className="px-8 py-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">UID</th>
                    <th className="px-8 py-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Student Name</th>
                    <th className="px-8 py-4 text-right text-[10px] font-black uppercase tracking-widest text-slate-400">{readOnly ? "Score" : "Internal Score (Max 100)"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {roster.map(student => (
                    <tr key={student.id} className="hover:bg-slate-50 transition-colors group">
                      <td className="px-8 py-4">
                        <span className="text-[10px] font-mono font-black text-blue-600 bg-blue-50 px-2 py-1 rounded-md">
                          {student.uid || `ID-${student.id.toString().padStart(4, '0')}`}
                        </span>
                      </td>
                      <td className="px-8 py-4 font-bold text-slate-800">{student.name}</td>
                      <td className="px-8 py-4 text-right">
                        <div className="flex items-center justify-end gap-3">
                          {readOnly ? (
                             <span className="text-sm font-black text-slate-900 border-none px-4 py-2">
                                {marksData[student.id] !== undefined ? Number(marksData[student.id]).toFixed(2) : 'N/A'}
                             </span>
                          ) : (
                            <input 
                              type="number" 
                              min="0" 
                              max="100"
                              placeholder="0.00"
                              className="w-24 bg-slate-50 border-none rounded-xl px-4 py-2 text-right font-black text-slate-900 focus:ring-2 focus:ring-blue-600 transition-all"
                              value={marksData[student.id] !== undefined ? marksData[student.id] : ''}
                              onChange={(e) => handleMarkChange(student.id, e.target.value)}
                            />
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-12">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
              <AlertCircle className="w-10 h-10 text-slate-300" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">Grading Context Required</h3>
            <p className="text-slate-500 max-w-sm mt-2">Select a program, batch, and subject above to generate the student assessment roster.</p>
          </div>
        )}
      </div>
    </div>
  );
}
