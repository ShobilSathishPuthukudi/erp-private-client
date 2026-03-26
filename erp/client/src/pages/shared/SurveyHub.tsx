import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import { MessageSquare, CheckCircle2, ChevronRight, HelpCircle } from 'lucide-react';

interface Survey {
  id: number;
  title: string;
  description: string;
  questions: any[];
}

export default function SurveyHub() {
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [activeSurvey, setActiveSurvey] = useState<Survey | null>(null);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchSurveys();
  }, []);

  const fetchSurveys = async () => {
    try {
      const res = await api.get('/feedback/active');
      setSurveys(res.data);
    } catch (error) {
      console.error('Fetch surveys error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!activeSurvey) return;

    // Validate all questions answered
    const unanswered = activeSurvey.questions.filter(q => !answers[q.id]);
    if (unanswered.length > 0) {
      toast.error('Please answer all questions before submitting.');
      return;
    }

    try {
      setSubmitting(true);
      await api.post('/feedback/respond', {
        surveyId: activeSurvey.id,
        answers
      });
      toast.success('Feedback submitted! Thank you for your contribution.');
      setActiveSurvey(null);
      setAnswers({});
      fetchSurveys();
    } catch (error) {
      toast.error('Failed to submit feedback');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="p-12 text-center animate-pulse text-slate-400">Syncing institutional surveys...</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {!activeSurvey ? (
        <div className="space-y-6">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
               <MessageSquare className="w-8 h-8" />
            </div>
            <h1 className="text-3xl font-extrabold text-slate-900">Institutional Feedback Hub</h1>
            <p className="text-slate-500 max-w-lg mx-auto">Your feedback directly shapes our institutional progress. Please complete any active surveys assigned to your profile.</p>
          </div>

          <div className="grid gap-4">
            {surveys.length > 0 ? surveys.map(s => (
              <div 
                key={s.id}
                onClick={() => setActiveSurvey(s)}
                className="group bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-400 transition-all cursor-pointer flex items-center justify-between"
              >
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center group-hover:bg-blue-50 transition-colors">
                     <HelpCircle className="w-6 h-6 text-slate-400 group-hover:text-blue-500" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900">{s.title}</h3>
                    <p className="text-sm text-slate-500">{s.questions.length} Questions • Mandatory</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-blue-500 transition-all group-hover:translate-x-1" />
              </div>
            )) : (
              <div className="bg-white p-12 rounded-3xl border-2 border-dashed border-slate-200 text-center">
                 <div className="w-12 h-12 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="w-6 h-6" />
                 </div>
                 <h3 className="font-bold text-slate-900 text-lg">You're all caught up!</h3>
                 <p className="text-slate-400 text-sm mt-1">There are no active surveys requiring your attention right now.</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden animate-in slide-in-from-bottom-8 duration-500">
          <div className="bg-slate-900 p-8 text-white relative">
            <button 
              onClick={() => setActiveSurvey(null)}
              className="absolute top-6 right-6 text-white/40 hover:text-white transition-colors"
            >
              Exit
            </button>
            <h2 className="text-2xl font-bold">{activeSurvey.title}</h2>
            <p className="text-slate-400 text-sm mt-1">Please provide honest feedback to help us improve.</p>
          </div>

          <div className="p-8 space-y-10">
            {activeSurvey.questions.map((q: any, idx: number) => (
              <div key={q.id} className="space-y-4">
                <div className="flex items-start space-x-3">
                   <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center text-[10px] font-bold mt-0.5">{idx + 1}</span>
                   <h4 className="text-lg font-bold text-slate-800">{q.label}</h4>
                </div>

                <div className="pl-9">
                  {q.type === 'rating' && (
                    <div className="flex space-x-4">
                      {[1, 2, 3, 4, 5].map(val => (
                        <button
                          key={val}
                          onClick={() => setAnswers({ ...answers, [q.id]: val })}
                          className={`w-12 h-12 rounded-2xl font-bold transition-all ${answers[q.id] === val ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
                        >
                          {val}
                        </button>
                      ))}
                    </div>
                  )}

                  {q.type === 'choice' && (
                    <div className="grid grid-cols-2 gap-3">
                      {q.options?.map((opt: string) => (
                        <button
                          key={opt}
                          onClick={() => setAnswers({ ...answers, [q.id]: opt })}
                          className={`px-4 py-3 rounded-xl text-sm font-medium text-left transition-all border ${answers[q.id] === opt ? 'bg-blue-50 border-blue-600 text-blue-700 shadow-sm' : 'bg-white border-slate-200 hove:bg-slate-50 text-slate-600'}`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  )}

                  {q.type === 'text' && (
                    <textarea 
                      className="w-full h-32 px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-600 outline-none transition-all text-sm"
                      placeholder="Share your thoughts..."
                      value={answers[q.id] || ''}
                      onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                    />
                  )}
                </div>
              </div>
            ))}

            <div className="pt-6 border-t border-slate-100 flex justify-between items-center">
              <p className="text-[10px] text-slate-400 uppercase font-black tracking-tighter">Your responses are confidential</p>
              <button 
                onClick={handleSubmit}
                disabled={submitting}
                className="flex items-center px-8 py-3 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all disabled:opacity-50"
              >
                {submitting ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <>
                    Submit Feedback
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
