import React, { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, ChevronDown, ChevronUp, Clock3, History, Loader2, RotateCcw, XCircle } from 'lucide-react';
import { assessmentService } from '../services/api';
import type { AssessmentHistoryItem, AssessmentHistoryPage, GeneratedQuestion, Subject } from '../types';

type Outcome = 'all' | 'correct' | 'incorrect';

type Props = {
  subjects: Subject[];
  refreshVersion: number;
  onRetry: (question: GeneratedQuestion) => void;
};

const statusLabel = (correct: boolean) => correct ? 'Correct' : 'Needs revision';
const displayDate = (value: string) => {
  const d = new Date(value);
  return Number.isNaN(d.valueOf()) ? value : d.toLocaleString();
};

export const QuestionHistory: React.FC<Props> = ({ subjects, refreshVersion, onRetry }) => {
  const [history, setHistory] = useState<AssessmentHistoryPage | null>(null);
  const [outcome, setOutcome] = useState<Outcome>('all');
  const [subjectId, setSubjectId] = useState('');
  const [topicId, setTopicId] = useState('');
  const [questionType, setQuestionType] = useState('');
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const availableTopics = subjects.filter(s => !subjectId || s.id === subjectId).flatMap(s => s.topics ?? []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    assessmentService.getHistory({
      result: outcome, subject_id: subjectId || undefined,
      topic_id: topicId || undefined, question_type: questionType || undefined,
      page, page_size: 10,
    }).then(data => {
      if (active) setHistory(data);
    }).catch((err) => {
      if (active) setError(err.response?.data?.detail || 'Question history could not be loaded.');
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [outcome, subjectId, topicId, questionType, page, refreshVersion, reload]);

  const retry = async (item: AssessmentHistoryItem) => {
    setRetryingId(item.id);
    setError('');
    try {
      const question = await assessmentService.retryHistoryQuestion(item.id);
      onRetry(question);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Could not prepare this question for retry.');
    } finally {
      setRetryingId(null);
    }
  };

  const resetPage = () => { setPage(1); setExpandedId(null); };
  const selectStyle = 'w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-800 focus:border-blue-400 focus:outline-none';

  return (
    <section className="space-y-4" aria-label="My Question History">
      <div className="rounded-2xl border border-zinc-200 bg-white p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold text-zinc-900">
              <History className="h-5 w-5 text-blue-600" /> My Question History
            </h2>
            <p className="mt-1 text-xs leading-5 text-zinc-500">Review the questions you answered, learn from feedback, and practise mistakes.</p>
          </div>
          <button onClick={() => setReload(r => r + 1)} className="rounded-lg border border-zinc-200 px-3 py-2 text-xs text-zinc-700 hover:bg-zinc-50" aria-label="Refresh history">
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-2 sm:gap-3">
          {[
            { label: 'Attempted', count: history?.total ?? 0, className: 'text-zinc-900' },
            { label: 'Correct', count: history?.correct ?? 0, className: 'text-emerald-700' },
            { label: 'Incorrect', count: history?.incorrect ?? 0, className: 'text-amber-700' },
          ].map(stat => (
            <div className="rounded-xl border border-zinc-100 bg-zinc-50 p-3" key={stat.label}>
              <p className="text-[11px] text-zinc-500">{stat.label}</p>
              <p className={`mt-1 text-xl font-bold ${stat.className}`}>{stat.count}</p>
            </div>
          ))}
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <label className="space-y-1 text-xs font-medium text-zinc-600">Subject
            <select className={selectStyle} value={subjectId} onChange={e => { setSubjectId(e.target.value); setTopicId(''); resetPage(); }}>
              <option value="">All subjects</option>
              {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </label>
          <label className="space-y-1 text-xs font-medium text-zinc-600">Topic
            <select className={selectStyle} value={topicId} onChange={e => { setTopicId(e.target.value); resetPage(); }}>
              <option value="">All topics</option>
              {availableTopics.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </label>
          <label className="space-y-1 text-xs font-medium text-zinc-600">Question type
            <select className={selectStyle} value={questionType} onChange={e => { setQuestionType(e.target.value); resetPage(); }}>
              <option value="">All types</option>
              {['MCQ', 'CONCEPTUAL', 'SHORT_ANSWER', 'APPLICATION', 'SCENARIO'].map(t => (
                <option key={t} value={t}>{t.replace('_', ' ')}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Filter by result">
          {(['all', 'correct', 'incorrect'] as Outcome[]).map(value => (
            <button key={value} aria-pressed={outcome === value}
              onClick={() => { setOutcome(value); resetPage(); }}
              className={`rounded-lg px-3 py-2 text-xs font-semibold ${outcome === value ? 'bg-zinc-900 text-white' : 'border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50'}`}>
              {value === 'all' ? 'All attempts' : value === 'correct' ? 'Correct' : 'Incorrect'}
            </button>
          ))}
        </div>
      </div>

      {error && <div role="alert" className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
        <AlertCircle className="h-4 w-4 shrink-0" /> {error}
        <button className="ml-auto underline" onClick={() => setReload(r => r + 1)}>Try again</button>
      </div>}
      {loading ? (
        <div role="status" className="flex items-center justify-center gap-2 py-14 text-sm text-zinc-500"><Loader2 className="h-5 w-5 animate-spin" /> Loading attempts...</div>
      ) : !history?.items.length ? (
        <div className="rounded-xl border border-zinc-200 bg-white py-12 px-6 text-center text-sm text-zinc-500">
          No answered questions match these filters yet.
        </div>
      ) : (
        <div className="space-y-3">
          {history.items.map(item => {
            const open = expandedId === item.id;
            const optionLetter = item.correct_option?.toUpperCase();
            const correctIndex = optionLetter && /^[A-D]$/.test(optionLetter) ? optionLetter.charCodeAt(0) - 65 : -1;
            const correctChoice = correctIndex >= 0 ? item.options?.[correctIndex] : null;
            return <article key={item.id} className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
              <button onClick={() => setExpandedId(open ? null : item.id)} aria-expanded={open}
                className="flex w-full items-start justify-between gap-3 p-4 text-left hover:bg-zinc-50 sm:p-5">
                <span className="min-w-0 space-y-2">
                  <span className="flex flex-wrap items-center gap-2 text-[11px] text-zinc-500">
                    <span>{item.subject_name} · {item.topic_name}</span>
                    <span>· {item.question_type.replace('_', ' ')}</span>
                    <span className="flex items-center gap-1"><Clock3 className="h-3 w-3" />{displayDate(item.created_at)}</span>
                  </span>
                  <span className="block text-sm font-medium leading-relaxed text-zinc-900">{item.question_text}</span>
                </span>
                <span className="shrink-0 flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold ${item.is_correct ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-800'}`}>
                    {item.is_correct ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                    <span className="hidden sm:inline">{statusLabel(item.is_correct)}</span>
                  </span>
                  {open ? <ChevronUp className="h-4 w-4 text-zinc-400" /> : <ChevronDown className="h-4 w-4 text-zinc-400" />}
                </span>
              </button>
              {open && <div className="space-y-4 border-t border-zinc-100 px-4 pb-5 pt-4 sm:px-5 text-sm">
                {item.options?.length ? (
                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold text-zinc-600">Options shown in this attempt</p>
                    {item.options.map((option, i) => <div key={i} className={`rounded-lg border p-2.5 text-xs ${i === correctIndex ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-zinc-100 text-zinc-700'}`}>{option}</div>)}
                  </div>
                ) : null}
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-lg bg-zinc-50 p-3"><p className="text-xs font-semibold text-zinc-500">Your answer</p><p className="mt-1 whitespace-pre-wrap break-words text-zinc-900">{item.student_answer}</p></div>
                  <div className="rounded-lg bg-blue-50/60 p-3"><p className="text-xs font-semibold text-blue-700">Correct answer / expected concepts</p>
                    <p className="mt-1 whitespace-pre-wrap break-words text-zinc-800">{correctChoice || item.reference_answer || 'Reference answer not stored for this earlier attempt.'}</p>
                  </div>
                </div>
                {correctChoice && item.reference_answer && <div><p className="text-xs font-semibold text-zinc-600">Reference explanation</p><p className="mt-1 whitespace-pre-wrap break-words text-zinc-700">{item.reference_answer}</p></div>}
                {item.feedback && <div><p className="text-xs font-semibold text-zinc-600">Evaluation feedback</p><p className="mt-1 whitespace-pre-wrap break-words text-zinc-700">{item.feedback}</p></div>}
                {item.identified_misconception && <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-900"><strong>Review:</strong> {item.identified_misconception}</p>}
                {item.source_quote && <details className="rounded-lg border border-zinc-100 p-3"><summary className="cursor-pointer text-xs font-semibold text-zinc-600">Supporting course excerpt</summary><p className="mt-2 whitespace-pre-wrap break-words text-xs text-zinc-600">{item.source_quote}</p></details>}
                {!item.is_correct && <div className="flex justify-end">
                  <button type="button" disabled={!item.retry_available || !!retryingId}
                    onClick={() => void retry(item)}
                    title={!item.retry_available ? 'This older attempt has no verified answer key for a safe retry.' : undefined}
                    className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:bg-zinc-300">
                    {retryingId === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                    Retry incorrect question
                  </button>
                </div>}
              </div>}
            </article>;
          })}
          <div className="flex items-center justify-between gap-3 pt-2 text-xs text-zinc-500">
            <span>Page {history.page} of {Math.max(1, Math.ceil((outcome === 'all' ? history.total : outcome === 'correct' ? history.correct : history.incorrect) / history.page_size))}</span>
            <div className="flex gap-2">
              <button disabled={page <= 1} className="rounded-lg border border-zinc-200 px-3 py-2 disabled:opacity-40" onClick={() => { setPage(p => p - 1); setExpandedId(null); }}>Previous</button>
              <button disabled={page * history.page_size >= (outcome === 'all' ? history.total : outcome === 'correct' ? history.correct : history.incorrect)} className="rounded-lg border border-zinc-200 px-3 py-2 disabled:opacity-40" onClick={() => { setPage(p => p + 1); setExpandedId(null); }}>Next</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
