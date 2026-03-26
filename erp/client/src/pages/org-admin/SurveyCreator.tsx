import { useState } from 'react';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import { Plus, Trash2, Send, Layout, ChevronRight, BarChart2 } from 'lucide-react';
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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Institutional Feedback</h1>
          <p className="text-slate-500 text-sm">Design and deploy quality assurance surveys across the organization.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition-all"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Survey
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <div className="md:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 p-8 flex flex-col items-center justify-center text-center py-20">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
               <Layout className="w-8 h-8 text-slate-300" />
            </div>
            <h3 className="text-lg font-bold text-slate-800">No active survey selected</h3>
            <p className="text-slate-500 text-sm max-w-xs mt-2">Use the creator to launch a new feedback cycle for students or employees.</p>
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
        maxWidth="2xl"
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
    </div>
  );
}
