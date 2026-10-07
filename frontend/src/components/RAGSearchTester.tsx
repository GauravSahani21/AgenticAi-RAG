import React, { useState } from 'react';
import type { Subject, RAGSearchResult } from '../types';
import { ragService } from '../services/api';
import { Card } from './Card';
import { Button } from './Button';
import { Input } from './Input';
import { Search, FileText, Database } from 'lucide-react';

interface RAGSearchTesterProps {
  subjects: Subject[];
}

export const RAGSearchTester: React.FC<RAGSearchTesterProps> = ({ subjects }) => {
  const [query, setQuery] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [selectedTopicId, setSelectedTopicId] = useState('');
  const [results, setResults] = useState<RAGSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentSubject = subjects.find((s) => s.id === selectedSubjectId);
  const availableTopics = currentSubject?.topics || [];

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setError(null);
    setIsSearching(true);
    setHasSearched(true);

    try {
      const response = await ragService.search(
        query.trim(),
        selectedSubjectId || undefined,
        selectedTopicId || undefined,
        5
      );
      setResults(response.results);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'RAG search query failed.');
    } finally {
      setIsSearching(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 0.8) return 'text-emerald-700 bg-emerald-50 border-emerald-200';
    if (score >= 0.6) return 'text-blue-700 bg-blue-50 border-blue-200';
    return 'text-amber-700 bg-amber-50 border-amber-200';
  };

  return (
    <Card className="border-t-4 border-t-indigo-600">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Database className="w-5 h-5 text-indigo-600" />
            Live ChromaDB RAG Semantic Search
          </h3>
          <p className="text-xs text-slate-500">
            Query the vector database directly using cosine similarity retrieval
          </p>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
          ChromaDB Semantic Engine
        </span>
      </div>

      <form onSubmit={handleSearch} className="mt-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2">
            <Input
              placeholder="e.g. What are embeddings and cosine similarity?"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              required
            />
          </div>
          <Button type="submit" variant="primary" size="md" isLoading={isSearching} className="w-full">
            <Search className="w-4 h-4 mr-1.5" />
            Search Knowledge Base
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">
              Filter By Course
            </label>
            <select
              value={selectedSubjectId}
              onChange={(e) => {
                setSelectedSubjectId(e.target.value);
                setSelectedTopicId('');
              }}
              className="w-full text-xs rounded-lg border border-slate-300 px-3 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="">All Academic Subjects</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.code}: {s.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">
              Filter By Topic
            </label>
            <select
              value={selectedTopicId}
              onChange={(e) => setSelectedTopicId(e.target.value)}
              disabled={!selectedSubjectId}
              className="w-full text-xs rounded-lg border border-slate-300 px-3 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-slate-100 disabled:text-slate-400"
            >
              <option value="">All Topics</option>
              {availableTopics.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.module}: {t.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </form>

      {error && (
        <div className="mt-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs">
          {error}
        </div>
      )}

      {hasSearched && (
        <div className="mt-6 space-y-3">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-600 border-b border-slate-100 pb-2">
            <span>Retrieved Vector Chunks ({results.length})</span>
            <span className="text-slate-400 font-normal">Sorted by Cosine Similarity</span>
          </div>

          {results.length === 0 ? (
            <div className="p-6 text-center bg-slate-50 rounded-xl border border-dashed border-slate-300 text-slate-500 text-xs">
              No matching chunks found in ChromaDB. Try uploading documents for this course or widening your query.
            </div>
          ) : (
            <div className="space-y-3">
              {results.map((r, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-xl border border-slate-200 bg-white hover:border-indigo-300 transition-colors shadow-sm space-y-2"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-800 flex items-center gap-1">
                        <FileText className="w-3.5 h-3.5 text-indigo-600" />
                        {r.document_name}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[11px]">
                        Page {r.page_number}
                      </span>
                      {r.section && (
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[11px]">
                          {r.section}
                        </span>
                      )}
                    </div>
                    <span className={`px-2 py-0.5 rounded-full border text-[11px] font-bold ${getScoreColor(r.similarity_score)}`}>
                      {(r.similarity_score * 100).toFixed(1)}% Match
                    </span>
                  </div>
                  <p className="text-xs text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-100 font-mono leading-relaxed whitespace-pre-wrap">
                    {r.content}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Card>
  );
};
