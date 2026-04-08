import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import { Plus, Trash2, Send, Layout, ChevronRight, BarChart2, MessageSquare, Clock, X } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Modal } from '@/components/shared/Modal';

interface Question {
  id: string;
  type: 'text' | 'rating' | 'choice';
  label: string;
  options?: string[];
}

export default function SurveyCreator() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [targetRole, setTargetRole] = useState('student');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(false);
  const [surveys, setSurveys] = useState<any[]>([]);
  const [isFetching, setIsFetching] = useState(true);
  const [selectedSurvey, setSelectedSurvey] = useState<any>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const fetchSurveys = async () => {
    try {
      setIsFetching(true);
      const res = await api.get('/feedback/all');
      setSurveys(res.data);
    } catch (error) {
      console.error('Fetch surveys results error:', error);
    } finally {
      setIsFetching(false);
    }
  };

  useEffect(() => {
    fetchSurveys();
  }, []);

  const addQuestion = () => {
    setQuestions([...questions, { 
      id: Math.random().toString(36).substr(2, 9), 
      type: 'rating', 
      label: '' 
    }]);
  };

  const removeQuestion = (id: string) => {
    setQuestions(questions.filter(q => q.id !== id));
  };

  const updateQuestion = (id: string, updates: Partial<Question>) => {
    setQuestions(questions.map(q => q.id === id ? { ...q, ...updates } : q));
  };

  const handleSubmit = async () => {
    if (!title || questions.length === 0) {
      toast.error('Please provide a title and at least one question');
      return;
    }

    try {
      setLoading(true);
      await api.post('/feedback/surveys', {
        title,
        targetRole,
        questions
      });
      toast.success('Institutional survey published successfully!');
      setIsModalOpen(false);
      fetchSurveys();
      // Reset
      setTitle('');
      setQuestions([]);
    } catch (error) {
      toast.error('Failed to publish survey');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Institutional Feedback"
        description="Design and deploy quality assurance surveys across the organization."
        icon={MessageSquare}
        action={
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition-all whitespace-nowrap"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Survey
          </button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <div className="md:col-span-2 space-y-4">
            {isFetching ? (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-20 flex flex-col items-center justify-center">
                 <div className="w-10 h-10 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin"></div>
                 <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-4">Retrieving Surveys...</p>
              </div>
            ) : surveys.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 flex flex-col items-center justify-center text-center py-20">
                 <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                    <Layout className="w-8 h-8 text-slate-300" />
                 </div>
                 <h3 className="text-lg font-bold text-slate-800">No active survey selected</h3>
                 <p className="text-slate-500 text-sm max-w-xs mt-2">Use the creator to launch a new feedback cycle for students or employees.</p>
              </div>
            ) : (
              <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 scrollbar-hide">
                 {surveys.map((s) => (
                    <div 
                      key={s.id} 
                      onClick={() => { setSelectedSurvey(s); setIsDetailModalOpen(true); }}
                      className="bg-white p-6 rounded-2xl border border-slate-200 hover:border-slate-900 transition-all group flex justify-between items-center shadow-sm cursor-pointer"
                    >
                       <div className="flex gap-4 items-center">
                          <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-slate-900 group-hover:text-white transition-all">
                             <MessageSquare className="w-6 h-6" />
                          </div>
                          <div>
                             <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-bold text-slate-900">{s.title}</h4>
                                <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-black uppercase rounded-full">
                                   {s.targetRole}
                                </span>
                             </div>
                             <p className="text-xs text-slate-500 flex items-center gap-2 font-medium">
                                <Clock className="w-3 h-3" />
                                Deployed on {new Date(s.createdAt).toLocaleDateString()}
                             </p>
                          </div>
                       </div>
                       <div className="text-right">
                          <div className="text-lg font-black text-slate-900">
                             {s.survey_responses?.length || 0}
                          </div>
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                             Responses
                          </div>
                       </div>
                    </div>
                 ))}
              </div>
            )}
         </div>

         <div className="space-y-4">
            <div className="bg-indigo-600 rounded-2xl p-6 text-white shadow-lg shadow-indigo-200">
               <BarChart2 className="w-8 h-8 mb-4 opacity-50" />
               <h3 className="font-bold text-lg">Survey Insights</h3>
               <p className="text-indigo-100 text-xs mt-1 leading-relaxed">Aggregated data from institutional responses will appear here once valid submissions are captured.</p>
               <button className="mt-4 text-xs font-bold underline">View Historical Archives</button>
            </div>
            
            <div className="bg-white rounded-2xl p-6 border border-slate-200">
               <h4 className="font-bold text-slate-900 text-sm mb-3">Targeting Tips</h4>
               <ul className="space-y-2">
                  <li className="text-[11px] text-slate-500 flex items-start">
                    <ChevronRight className="w-3 h-3 text-indigo-500 mr-2 flex-shrink-0 mt-0.5" />
                    Target <b>Students</b> for course quality feedback.
                  </li>
                  <li className="text-[11px] text-slate-500 flex items-start">
                    <ChevronRight className="w-3 h-3 text-indigo-500 mr-2 flex-shrink-0 mt-0.5" />
                    Target <b>Employees</b> for HR sentiment audits.
                  </li>
               </ul>
            </div>
         </div>
      </div>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title="Launch Institutional Survey"
      >
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 uppercase">Survey Title</label>
              <input 
                type="text" 
                placeholder="e.g., Q1 Student Satisfaction"
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 outline-none transition-all"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 uppercase">Target Audience</label>
              <select 
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 outline-none transition-all"
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
              >
                <option value="student">All Students</option>
                <option value="employee">All Employees</option>
                <option value="hr">HR Department</option>
                <option value="academic">Academic Staff</option>
                <option value="finance">Finance Department</option>
                <option value="dept-admin">Departmental Admins (Sub-Dept)</option>
                <option value="ceo">CEO / Executive Panel</option>
                <option value="all">Everyone</option>
              </select>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-widest">Questionnaire Designer</h4>
              <button 
                onClick={addQuestion}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center"
              >
                <Plus className="w-3 h-3 mr-1" /> Add Question
              </button>
            </div>

            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 scrollbar-hide">
              {questions.map((q, idx) => (
                <div key={q.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 relative group">
                  <button 
                    onClick={() => removeQuestion(q.id)}
                    className="absolute top-4 right-4 text-slate-300 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="col-span-2 space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Question {idx + 1}</label>
                      <input 
                        type="text" 
                        placeholder="Type your question here..."
                        className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm"
                        value={q.label}
                        onChange={(e) => updateQuestion(q.id, { label: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Response Type</label>
                      <select 
                        className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm"
                        value={q.type}
                        onChange={(e) => updateQuestion(q.id, { type: e.target.value as any })}
                      >
                        <option value="rating">Rating (1-5)</option>
                        <option value="choice">Multiple Choice</option>
                        <option value="text">Open Text</option>
                      </select>
                    </div>
                  </div>

                  {q.type === 'choice' && (
                    <div className="space-y-2">
                       <label className="text-[10px] font-bold text-slate-400 uppercase">Options (comma separated)</label>
                       <input 
                        type="text" 
                        placeholder="Agree, Neutral, Disagree"
                        className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm"
                        value={q.options?.join(', ') || ''}
                        onChange={(e) => updateQuestion(q.id, { options: e.target.value.split(',').map(s => s.trim()) })}
                      />
                    </div>
                  )}
                </div>
              ))}

              {questions.length === 0 && (
                <div className="py-10 text-center border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 text-xs">
                  Empty questionnaire. Click "Add Question" to begin.
                </div>
              )}
            </div>
          </div>

          <button 
            onClick={handleSubmit}
            disabled={loading}
            className="w-full flex justify-center items-center py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 shadow-lg shadow-slate-200 transition-all disabled:opacity-50"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Broadcast Institutional Survey
              </>
            )}
          </button>
        </div>
      </Modal>

      {/* Survey Results & Analytics Modal */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        hideHeader
        maxWidth="4xl"
      >
        {selectedSurvey && (
          <div className="flex flex-col h-full max-h-[90vh]">
            <div className="bg-slate-900 p-8 text-white relative">
              <div className="flex items-center gap-4 mb-4">
                <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-xl">
                  <BarChart2 className="w-8 h-8 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="text-2xl font-black tracking-tight">{selectedSurvey.title}</h2>
                    <span className="px-2 py-0.5 bg-white/10 text-white text-[10px] font-black uppercase rounded-full border border-white/20">
                      Targeted: {selectedSurvey.targetRole}
                    </span>
                  </div>
                  <p className="text-slate-400 text-xs font-bold uppercase tracking-widest leading-none">
                    Institutional Audit Results • {selectedSurvey.survey_responses?.length || 0} Total Participants
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsDetailModalOpen(false)}
                className="absolute top-8 right-8 p-2 hover:bg-white/10 rounded-xl transition-all"
              >
                <X className="w-6 h-6 text-white/60 hover:text-white" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-slate-50/50">
              {selectedSurvey.questions.map((q: any, idx: number) => {
                const responses = selectedSurvey.survey_responses || [];
                const answers = responses.map((r: any) => r.answers[q.id]).filter((a: any) => a !== undefined);

                return (
                  <div key={q.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="flex justify-between items-start mb-6">
                      <div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-1">Question {idx + 1} • {q.type.toUpperCase()}</span>
                        <h4 className="text-lg font-bold text-slate-900 leading-tight">{q.label}</h4>
                      </div>
                      {q.type === 'rating' && answers.length > 0 && (
                        <div className="bg-indigo-50 px-4 py-2 rounded-xl text-center">
                          <div className="text-xl font-black text-indigo-600">
                            {(answers.reduce((a: number, b: any) => a + (parseFloat(b) || 0), 0) / answers.length).toFixed(1)}
                          </div>
                          <div className="text-[10px] font-black text-indigo-400 uppercase tracking-widest leading-none">Avg Score</div>
                        </div>
                      )}
                    </div>

                    {/* Analytics Rendering */}
                    {answers.length === 0 ? (
                      <div className="py-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-400 text-xs font-medium ">
                        Awaiting first respondent data for this metrics node.
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {q.type === 'choice' && q.options && (
                          <div className="space-y-3">
                            {q.options.map((opt: string) => {
                              const count = answers.filter((a: any) => a === opt).length;
                              const pct = Math.round((count / answers.length) * 100);
                              return (
                                <div key={opt} className="space-y-1.5">
                                  <div className="flex justify-between text-xs font-bold uppercase tracking-tight text-slate-600">
                                    <span>{opt}</span>
                                    <span>{pct}% ({count})</span>
                                  </div>
                                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                    <div 
                                      className="h-full bg-indigo-500 transition-all duration-1000 ease-out" 
                                      style={{ width: `${pct}%` }} 
                                    />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {q.type === 'rating' && (
                          <div className="grid grid-cols-5 gap-2">
                            {[1, 2, 3, 4, 5].map(score => {
                              const count = answers.filter((a: any) => parseInt(a) === score).length;
                              const pct = Math.round((count / answers.length) * 100);
                              return (
                                <div key={score} className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-center flex flex-col justify-between">
                                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{score} STARS</div>
                                  <div className="text-lg font-black text-slate-900">{pct}%</div>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {q.type === 'text' && (
                          <div className="space-y-2">
                             {answers.slice(-5).map((ans: string, i: number) => (
                               <div key={i} className="p-4 bg-slate-50 rounded-xl border border-slate-200/50 text-sm text-slate-600 leading-relaxed font-medium">
                                 "{ans}"
                               </div>
                             ))}
                             {answers.length > 5 && (
                               <p className="text-[10px] font-bold text-slate-400 text-center uppercase tracking-widest pt-2">Showing latest 5 of {answers.length} submissions</p>
                             )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            
            <div className="p-8 bg-white border-t border-slate-200 flex justify-end">
              <button 
                onClick={() => setIsDetailModalOpen(false)}
                className="px-8 py-3.5 bg-slate-900 text-white font-bold text-xs uppercase tracking-widest rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-xl shadow-slate-900/10"
              >
                Close Report
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
