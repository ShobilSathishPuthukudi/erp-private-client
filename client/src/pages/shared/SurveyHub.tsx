import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import { MessageSquare, CheckCircle2, ChevronRight, HelpCircle } from 'lucide-react';

interface Survey {
  id: number;
  title: string;
  description: string;
  questions: any[];
  expiryDate?: string;
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

  const isExpired = (date?: string) => {
    if (!date) return false;
    return new Date(date) < new Date();
  };

  const handleSubmit = async () => {
    if (!activeSurvey) return;

    if (isExpired(activeSurvey.expiryDate)) {
      toast.error('This survey has expired and can no longer be submitted.');
      setActiveSurvey(null);
      fetchSurveys();
      return;
    }

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
      toast.error(error.response?.data?.error || 'Failed to submit feedback');
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
            <div className="w-16 h-16 bg-[var(--theme-soft)] text-[var(--theme-accent)] rounded-full flex items-center justify-center mx-auto mb-4">
               <MessageSquare className="w-8 h-8" />
            </div>
            <h1 className="text-3xl font-extrabold text-[var(--page-text)]">Institutional feedback hub</h1>
            <p className="text-[var(--page-text)] opacity-80 max-w-lg mx-auto">Your feedback directly shapes our institutional progress. Please complete any active surveys assigned to your profile.</p>
          </div>

          <div className="grid gap-4">
            {surveys.length > 0 ? surveys.map(s => {
              const expired = isExpired(s.expiryDate);
              return (
                <div 
                  key={s.id}
                  onClick={() => !expired && setActiveSurvey(s)}
                  className={`group bg-[var(--card-bg)] p-6 rounded-2xl border transition-all flex items-center justify-between ${expired ? 'opacity-60 grayscale cursor-not-allowed border-[var(--card-border)]' : 'cursor-pointer hover:shadow-md hover:border-[var(--card-accent)] border-[var(--card-border)] shadow-[var(--card-shadow)]'}`}
                >
                  <div className="flex items-center space-x-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${expired ? 'bg-[var(--theme-soft)]' : 'bg-[var(--theme-soft)] group-hover:bg-[var(--theme-soft)]'}`}>
                       <HelpCircle className={`w-6 h-6 ${expired ? 'text-[var(--page-text)] opacity-50' : 'text-[var(--theme-accent)]'}`} />
                    </div>
                    <div>
                      <h3 className="font-bold text-[var(--page-text)]">{s.title}</h3>
                      <div className="flex items-center gap-3">
                         <p className="text-xs text-[var(--page-text)] opacity-70">{s.questions.length} Questions • Mandatory</p>
                         {s.expiryDate && (
                           <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${expired ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-700'}`}>
                             {expired ? 'Expired' : `Expires: ${new Date(s.expiryDate).toLocaleDateString()}`}
                           </span>
                         )}
                      </div>
                    </div>
                  </div>
                  {!expired && <ChevronRight className="w-5 h-5 text-[var(--page-text)] opacity-40 group-hover:text-[var(--page-accent)] transition-all group-hover:translate-x-1" />}
                </div>
              );
            }) : (
              <div className="bg-[var(--card-bg)] p-12 rounded-3xl border-2 border-dashed border-[var(--card-border)] text-center">
                 <div className="w-12 h-12 bg-[var(--theme-soft)] text-[var(--theme-accent)] rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="w-6 h-6" />
                 </div>
                 <h3 className="font-bold text-[var(--page-text)] text-lg">You're all caught up!</h3>
                 <p className="text-[var(--page-text)] opacity-70 text-sm mt-1">There are no active surveys requiring your attention right now.</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-[var(--page-surface)] rounded-3xl shadow-[var(--card-shadow)] border border-[var(--shell-border)] overflow-hidden animate-in slide-in-from-bottom-8 duration-500">
          <div className="bg-[var(--card-bg)] p-8 text-[var(--page-text)] border-b border-[var(--card-border)] relative">
            <button 
              onClick={() => setActiveSurvey(null)}
              className="absolute top-6 right-6 text-[var(--page-text)] opacity-50 hover:opacity-100 transition-colors"
            >
              Exit
            </button>
            <h2 className="text-2xl font-bold">{activeSurvey.title}</h2>
            <div className="flex items-center gap-3 mt-1">
               <p className="text-[var(--page-text)] opacity-80 text-sm">Please provide honest feedback to help us improve.</p>
               {activeSurvey.expiryDate && (
                 <span className="text-[10px] font-black uppercase text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">
                   Closing: {new Date(activeSurvey.expiryDate).toLocaleString()}
                 </span>
               )}
            </div>
          </div>

          <div className="p-8 space-y-10">
            {activeSurvey.questions.map((q: any, idx: number) => (
              <div key={q.id} className="space-y-4">
                <div className="flex items-start space-x-3">
                   <span className="w-6 h-6 rounded-full bg-[var(--theme-soft)] text-[var(--theme-accent)] flex items-center justify-center text-[10px] font-bold mt-0.5">{idx + 1}</span>
                   <h4 className="text-lg font-bold text-[var(--page-text)]">{q.label}</h4>
                </div>

                <div className="pl-9">
                  {q.type === 'rating' && (
                    <div className="flex space-x-4">
                      {[1, 2, 3, 4, 5].map(val => (
                        <button
                          key={val}
                          onClick={() => setAnswers({ ...answers, [q.id]: val })}
                          className={`w-12 h-12 rounded-2xl font-bold transition-all ${answers[q.id] === val ? 'bg-[var(--theme-accent)] text-[var(--theme-accent-fg)] border-none' : 'bg-[var(--card-bg)] text-[var(--page-text)] border border-[var(--card-border)] hover:bg-[var(--theme-soft)]'}`}
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
                          className={`px-4 py-3 rounded-xl text-sm font-medium text-left transition-all border ${answers[q.id] === opt ? 'bg-[var(--theme-soft)] border-[var(--theme-accent)] text-[var(--theme-accent)]' : 'bg-[var(--card-bg)] border-[var(--card-border)] hover:bg-[var(--theme-soft)] text-[var(--page-text)]'}`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  )}

                  {q.type === 'text' && (
                    <textarea 
                      className="w-full h-32 px-4 py-3 bg-[var(--theme-soft)] border border-[var(--card-border)] rounded-2xl focus:ring-2 focus:ring-[var(--theme-accent)] outline-none transition-all text-sm text-[var(--page-text)]"
                      placeholder="Share your thoughts..."
                      value={answers[q.id] || ''}
                      onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                    />
                  )}
                </div>
              </div>
            ))}

            <div className="pt-6 border-t border-[var(--card-border)] flex justify-between items-center">
              <p className="text-[10px] text-[var(--page-text)] opacity-50 uppercase font-black tracking-tighter">Your responses are confidential</p>
              <button 
                onClick={handleSubmit}
                disabled={submitting}
                className="flex items-center px-8 py-3 bg-[var(--theme-accent)] text-[var(--theme-accent-fg)] rounded-2xl font-bold opacity-90 hover:opacity-100 shadow-[var(--card-shadow)] transition-all disabled:opacity-50"
              >
                {submitting ? (
                  <div className="w-5 h-5 border-2 border-[var(--theme-soft)] border-t-[var(--theme-accent-fg)] rounded-full animate-spin"></div>
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
