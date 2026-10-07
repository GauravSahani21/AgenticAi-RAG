import React, { useState, useRef, useEffect } from 'react';
import type { Subject, ChatMessage } from '../types';
import { tutorService } from '../services/api';
import { Button } from './Button';
import { 
  Send, 
  Bot, 
  User, 
  BookOpen, 
  FileText, 
  CheckCircle2, 
  AlertTriangle, 
  ChevronDown, 
  ChevronUp
} from 'lucide-react';

interface TutorChatProps {
  subjects: Subject[];
  initialSubjectId?: string;
  initialTopicId?: string;
}

export const TutorChat: React.FC<TutorChatProps> = ({
  subjects,
  initialSubjectId,
  initialTopicId,
}) => {
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(
    initialSubjectId || (subjects.length > 0 ? subjects[0].id : '')
  );
  const [selectedTopicId, setSelectedTopicId] = useState<string>(initialTopicId || '');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [inputMessage, setInputMessage] = useState<string>('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedSources, setExpandedSources] = useState<{ [key: string]: boolean }>({});

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const currentSubject = subjects.find((s) => s.id === selectedSubjectId);
  const availableTopics = currentSubject?.topics || [];
  const currentTopic = availableTopics.find((t) => t.id === selectedTopicId);

  // Sync props if parent changes selected subject/topic
  useEffect(() => {
    if (initialSubjectId) setSelectedSubjectId(initialSubjectId);
    if (initialTopicId) setSelectedTopicId(initialTopicId);
  }, [initialSubjectId, initialTopicId]);

  // Initial welcome message
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          id: 'welcome',
          sender: 'tutor',
          text: `Hello! I am your AI Academic Tutor for ${currentSubject?.name || 'your course'}. Ask me any question, and I will explain it using your faculty-approved course materials and cite exact source slides or readings.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    }
  }, [selectedSubjectId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const toggleSourceExpand = (msgId: string) => {
    setExpandedSources((prev) => ({
      ...prev,
      [msgId]: !prev[msgId],
    }));
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || inputMessage;
    if (!text.trim() || isLoading) return;

    if (!selectedSubjectId) {
      setError('Please select an academic course first.');
      return;
    }

    setError(null);
    const userMsgId = `msg_${Date.now()}`;
    const userMsg: ChatMessage = {
      id: userMsgId,
      sender: 'student',
      text: text.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const resp = await tutorService.chat({
        subject_id: selectedSubjectId,
        topic_id: selectedTopicId || undefined,
        session_id: sessionId || undefined,
        message: text.trim(),
      });

      if (!sessionId) {
        setSessionId(resp.session_id);
      }

      const botMsgId = `bot_${Date.now()}`;
      const botMsg: ChatMessage = {
        id: botMsgId,
        sender: 'tutor',
        text: resp.response,
        action: resp.action,
        strategyLabel: resp.strategy_label,
        grounded: resp.grounded,
        groundingStatus: resp.grounding_status,
        sources: resp.sources,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, botMsg]);
      // Auto-expand sources if grounded
      if (resp.sources && resp.sources.length > 0) {
        setExpandedSources((prev) => ({ ...prev, [botMsgId]: true }));
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.detail || 'Failed to receive response from AI Tutor.';
      setError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const quickPrompts = [
    'What is an embedding?',
    'How does cosine similarity measure semantic distance?',
    'What graph algorithm does ChromaDB use for indexing?',
    'Explain how document chunking works in RAG',
  ];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col h-[700px] overflow-hidden">
      {/* Tutor Header & Scope Controls */}
      <div className="p-4 bg-zinc-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-zinc-800 flex items-center justify-center text-white border border-zinc-700">
            <Bot className="w-5 h-5 text-zinc-300" />
          </div>
          <div>
            <h3 className="text-sm font-semibold flex items-center gap-2">
              Course Tutor
              <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                Syllabus Grounded
              </span>
            </h3>
            <p className="text-[11px] text-zinc-400">
              Answers verified against faculty-uploaded curriculum materials
            </p>
          </div>
        </div>

        {/* Course & Topic Selectors */}
        <div className="flex items-center gap-2">
          <select
            value={selectedSubjectId}
            onChange={(e) => {
              setSelectedSubjectId(e.target.value);
              setSelectedTopicId('');
              setSessionId(null);
            }}
            className="text-xs rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-200 px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-zinc-400"
          >
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.code}: {s.name}
              </option>
            ))}
          </select>

          <select
            value={selectedTopicId}
            onChange={(e) => {
              setSelectedTopicId(e.target.value);
              setSessionId(null);
            }}
            className="text-xs rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-200 px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-zinc-400"
          >
            <option value="">General Subject</option>
            {availableTopics.map((t) => (
              <option key={t.id} value={t.id}>
                {t.module}: {t.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Scope Banner */}
      <div className="px-4 py-2 bg-zinc-50 border-b border-zinc-200 flex items-center justify-between text-xs text-zinc-700">
        <span className="flex items-center gap-1.5">
          <BookOpen className="w-3.5 h-3.5 text-zinc-500" />
          Focus: <span className="font-medium text-zinc-900">{currentSubject?.name || 'Selected Course'}</span>
          {currentTopic && <span className="text-zinc-500"> / {currentTopic.name}</span>}
        </span>
        <span className="text-[11px] text-zinc-500 font-mono">ChromaDB Indexed</span>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-slate-50/50">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-3 max-w-3xl ${
              msg.sender === 'student' ? 'ml-auto flex-row-reverse' : 'mr-auto'
            }`}
          >
            {/* Avatar */}
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-white shadow-sm ${
                msg.sender === 'student' ? 'bg-blue-600' : 'bg-slate-800'
              }`}
            >
              {msg.sender === 'student' ? (
                <User className="w-4 h-4" />
              ) : (
                <Bot className="w-4 h-4 text-blue-400" />
              )}
            </div>

            {/* Bubble */}
            <div className={`space-y-2 max-w-[85%] sm:max-w-[78%]`}>
              <div
                className={`p-4 rounded-2xl text-sm leading-relaxed ${
                  msg.sender === 'student'
                    ? 'bg-blue-600 text-white rounded-tr-none shadow-sm'
                    : 'bg-white text-slate-800 rounded-tl-none border border-slate-200 shadow-sm'
                }`}
              >
                {/* Grounding & Teaching Strategy Header for Tutor */}
                {msg.sender === 'tutor' && (
                  <div className="mb-2.5 pb-2 border-b border-zinc-100 flex flex-wrap items-center justify-between gap-1.5">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {msg.strategyLabel && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-700 border border-zinc-200">
                          <BookOpen className="w-3 h-3 text-zinc-500" />
                          Strategy: {msg.strategyLabel}
                        </span>
                      )}
                      {msg.groundingStatus && (
                        <span
                          className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md border ${
                            msg.grounded
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}
                        >
                          {msg.grounded ? (
                            <>
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              Course Verified
                            </>
                          ) : (
                            <>
                              <AlertTriangle className="w-3 h-3 text-amber-600" />
                              General Background
                            </>
                          )}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400">{msg.timestamp}</span>
                  </div>
                )}

                <div className="whitespace-pre-wrap">{msg.text}</div>

              </div>

              {/* Source Documents Accordion */}
              {msg.sender === 'tutor' && msg.sources && msg.sources.length > 0 && (
                <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-xs">
                  <button
                    onClick={() => toggleSourceExpand(msg.id)}
                    className="w-full flex items-center justify-between text-xs font-semibold text-slate-700 hover:text-blue-600 transition-colors"
                  >
                    <span className="flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-blue-600" />
                      Academic Sources ({msg.sources.length})
                    </span>
                    {expandedSources[msg.id] ? (
                      <ChevronUp className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    )}
                  </button>

                  {expandedSources[msg.id] && (
                    <div className="mt-2.5 space-y-2 pt-2 border-t border-slate-100">
                      {msg.sources.map((s, idx) => (
                        <div
                          key={idx}
                          className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-1"
                        >
                          <div className="flex items-center justify-between text-[11px] font-bold text-slate-800">
                            <span>
                              {s.document} • Page {s.page}
                            </span>
                            <span className="text-emerald-600">
                              {(s.similarity_score * 100).toFixed(0)}% match
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-600 font-mono line-clamp-3 bg-white p-1.5 rounded border border-slate-100">
                            {s.snippet}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-3 max-w-xl">
            <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-white shadow-sm flex-shrink-0">
              <Bot className="w-4 h-4 text-blue-400" />
            </div>
            <div className="bg-white p-4 rounded-2xl rounded-tl-none border border-slate-200 shadow-sm flex items-center gap-3 text-xs text-slate-500">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
              </div>
              <span>Retrieving course materials & synthesizing explanation...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Prompts Bar */}
      {messages.length <= 2 && (
        <div className="px-4 py-2 bg-zinc-50 border-t border-zinc-200 flex items-center gap-2 overflow-x-auto text-xs">
          <span className="text-[11px] font-medium text-zinc-500 shrink-0">
            Suggested questions:
          </span>
          {quickPrompts.map((qp, i) => (
            <button
              key={i}
              onClick={() => handleSendMessage(qp)}
              className="px-2.5 py-1 rounded-md bg-white hover:bg-zinc-100 text-zinc-700 border border-zinc-200 text-xs transition-colors whitespace-nowrap shrink-0"
            >
              {qp}
            </button>
          ))}
        </div>
      )}

      {/* Error alert */}
      {error && (
        <div className="px-4 py-2 bg-rose-50 border-t border-rose-200 text-rose-700 text-xs flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="font-bold underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Input Box */}
      <div className="p-4 bg-white border-t border-slate-200">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Ask a question about your academic course material..."
            disabled={isLoading}
            className="flex-1 rounded-xl border border-slate-300 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-slate-50 transition-all"
          />
          <Button
            type="submit"
            variant="primary"
            size="md"
            isLoading={isLoading}
            disabled={!inputMessage.trim()}
            className="px-5 py-2.5 rounded-xl shadow-sm"
          >
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </div>
  );
};
