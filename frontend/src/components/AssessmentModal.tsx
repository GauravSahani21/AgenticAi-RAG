import React, { useState, useEffect } from 'react';
import type { Topic, GeneratedQuestion, AssessmentSubmitResponse } from '../types';
import { assessmentService } from '../services/api';
import { Button } from './Button';
import { Badge } from './Badge';
import { 
  Award, 
  HelpCircle, 
  CheckCircle2, 
  XCircle, 
  X, 
  Send, 
  RotateCw, 
  AlertTriangle 
} from 'lucide-react';


interface AssessmentModalProps {
  topic: Topic;
  isOpen: boolean;
  onClose: () => void;
  onAssessmentCompleted?: () => void;
}

export const AssessmentModal: React.FC<AssessmentModalProps> = ({
  topic,
  isOpen,
  onClose,
  onAssessmentCompleted
}) => {
  const [selectedType, setSelectedType] = useState<string>('CONCEPTUAL');
  const [question, setQuestion] = useState<GeneratedQuestion | null>(null);
  const [answer, setAnswer] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [evaluating, setEvaluating] = useState<boolean>(false);
  const [result, setResult] = useState<AssessmentSubmitResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchQuestion = async (type = selectedType) => {
    setLoading(true);
    setError(null);
    setResult(null);
    setAnswer('');
    try {
      const q = await assessmentService.generateQuestion({
        topic_id: topic.id,
        difficulty: topic.difficulty,
        question_type: type
      });
      setQuestion(q);
    } catch (err: any) {
      setError('Failed to generate diagnostic question.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchQuestion();
    }
  }, [isOpen, topic.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question || !answer.trim()) return;

    setEvaluating(true);
    setError(null);
    try {
      const res = await assessmentService.submitAssessment({
        topic_id: topic.id,
        question_text: question.question_text,
        question_type: question.question_type,
        difficulty: question.difficulty,
        student_answer: answer.trim()
      });
      setResult(res);
      if (onAssessmentCompleted) {
        onAssessmentCompleted();
      }
    } catch (err: any) {
      setError('Evaluation service encountered an error.');
    } finally {
      setEvaluating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50 rounded-t-2xl">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                Knowledge Mastery Check
                <Badge variant="info" size="sm">{topic.difficulty}</Badge>
              </h3>
              <p className="text-xs text-slate-500">
                {topic.name} ({topic.module})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Question Type Selector */}
          <div className="flex flex-wrap gap-1.5 p-1 bg-slate-100 rounded-xl">
            {['CONCEPTUAL', 'SHORT_ANSWER', 'MCQ', 'APPLICATION', 'SCENARIO'].map((t) => (
              <button
                key={t}
                onClick={() => {
                  setSelectedType(t);
                  fetchQuestion(t);
                }}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  selectedType === t
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {t.replace('_', ' ')}
              </button>
            ))}
          </div>

          {error && (
            <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400 space-y-3">
              <RotateCw className="w-7 h-7 animate-spin text-blue-600" />
              <p className="text-xs font-medium">Generating topic assessment grounded in course curriculum...</p>
            </div>
          ) : question ? (
            <div className="space-y-4">
              {/* Question Card */}
              <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-100 space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-blue-800">
                  <span className="flex items-center gap-1.5">
                    <HelpCircle className="w-4 h-4 text-blue-600" />
                    {question.question_type.replace('_', ' ')} Question
                  </span>
                  <span className="text-[11px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                    Grounded Assessment
                  </span>
                </div>
                <p className="text-sm text-slate-800 font-medium leading-relaxed whitespace-pre-wrap">
                  {question.question_text}
                </p>
                {question.hint && (
                  <p className="text-[11px] text-slate-500 italic flex items-center gap-1.5">
                    <HelpCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span>{question.hint}</span>
                  </p>
                )}
              </div>

              {/* Assessment Form or Result */}
              {!result ? (
                <form onSubmit={handleSubmit} className="space-y-4">
                  {question.options && question.options.length > 0 ? (
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-700">Select Choice:</label>
                      <div className="space-y-2">
                        {question.options.map((opt, idx) => (
                          <label
                            key={idx}
                            className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer text-xs transition-colors ${
                              answer === opt
                                ? 'border-blue-600 bg-blue-50/40 text-blue-900 font-medium'
                                : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                            }`}
                          >
                            <input
                              type="radio"
                              name="mcq_answer"
                              value={opt}
                              checked={answer === opt}
                              onChange={(e) => setAnswer(e.target.value)}
                              className="mt-0.5 text-blue-600"
                            />
                            <span>{opt}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        Your Answer:
                      </label>
                      <textarea
                        rows={4}
                        value={answer}
                        onChange={(e) => setAnswer(e.target.value)}
                        placeholder="Write your explanation or solution here..."
                        className="w-full text-xs p-3 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-transparent leading-relaxed"
                      />
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fetchQuestion()}
                    >
                      <RotateCw className="w-3.5 h-3.5 mr-1" />
                      Try Another Question
                    </Button>
                    <Button
                      type="submit"
                      variant="primary"
                      size="sm"
                      disabled={evaluating || !answer.trim()}
                    >
                      {evaluating ? (
                        <>
                          <RotateCw className="w-3.5 h-3.5 mr-1 animate-spin" />
                          Evaluating...
                        </>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5 mr-1" />
                          Submit for Evaluation
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              ) : (
                /* Result Panel */
                <div className="space-y-4 pt-2">
                  <div
                    className={`p-4 rounded-xl border ${
                      result.is_correct
                        ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                        : 'bg-amber-50/70 border-amber-200 text-amber-900'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2 font-bold text-sm">
                      {result.is_correct ? (
                        <>
                          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                          Evaluation: Concept Understood!
                        </>
                      ) : (
                        <>
                          <XCircle className="w-5 h-5 text-amber-600" />
                          Evaluation: Area for Revision
                        </>
                      )}
                    </div>
                    <p className="text-xs leading-relaxed">{result.feedback}</p>
                    {result.identified_misconception && (
                      <div className="mt-3 p-2.5 rounded-lg bg-amber-100/70 text-amber-950 text-xs flex items-start gap-2 border border-amber-300/50">
                        <AlertTriangle className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" />
                        <div>
                          <strong>Identified Misconception:</strong>
                          <p className="mt-0.5 text-[11px] leading-relaxed">{result.identified_misconception}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Mastery Score Progress */}
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-700">Updated Mastery Score</span>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400 line-through">{result.previous_mastery.toFixed(1)}%</span>
                        <span className="text-sm font-extrabold text-blue-700">{result.updated_mastery.toFixed(1)}%</span>
                        <Badge variant={result.is_correct ? 'success' : 'warning'} size="sm">
                          {result.status}
                        </Badge>
                      </div>
                    </div>
                    <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                      <div
                        className="bg-blue-600 h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, result.updated_mastery)}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span>Total Attempts: <strong>{result.attempts}</strong></span>
                      <span>Correct: <strong className="text-emerald-600">{result.correct_answers}</strong> | Incorrect: <strong className="text-rose-600">{result.incorrect_answers}</strong></span>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fetchQuestion()}
                    >
                      Practice Next Question
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={onClose}
                    >
                      Done
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};
