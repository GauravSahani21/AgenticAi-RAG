import React, { useState, useEffect } from 'react';
import type { DocumentItem, DocumentContentResponse } from '../types';
import { documentService } from '../services/api';
import { Button } from './Button';
import { 
  FileText, 
  Download, 
  MessageSquare, 
  X, 
  BookOpen, 
  Search, 
  User, 
  Calendar,
  Layers,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

interface DocumentViewerModalProps {
  document: DocumentItem | null;
  isOpen: boolean;
  onClose: () => void;
  onStudyWithTutor?: (doc: DocumentItem) => void;
}

export const DocumentViewerModal: React.FC<DocumentViewerModalProps> = ({
  document,
  isOpen,
  onClose,
  onStudyWithTutor,
}) => {
  const [contentData, setContentData] = useState<DocumentContentResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!isOpen || !document) {
      setContentData(null);
      setError(null);
      setSearchTerm('');
      return;
    }

    const fetchContent = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await documentService.getDocumentContent(document.id);
        setContentData(data);
      } catch (err: any) {
        setError(err.response?.data?.detail || 'Failed to load document content.');
      } finally {
        setLoading(false);
      }
    };

    fetchContent();
  }, [isOpen, document]);

  if (!isOpen || !document) return null;

  const handleDownload = async () => {
    setDownloading(true);
    try {
      await documentService.downloadDocument(document.id, document.filename);
    } catch (err) {
      console.error('Download error:', err);
    } finally {
      setDownloading(false);
    }
  };

  const filteredContent = contentData?.content || '';
  const searchMatches = searchTerm.trim() 
    ? (filteredContent.match(new RegExp(searchTerm.trim(), 'gi')) || []).length 
    : 0;

  return (
    <div 
      role="dialog"
      aria-modal="true"
      aria-labelledby="doc-viewer-title"
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5"
    >
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-fade-in">
        
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50 flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5">
              <FileText className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 id="doc-viewer-title" className="text-base sm:text-lg font-bold text-slate-900 truncate">
                {document.filename}
              </h2>
              <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-slate-500">
                {document.topic_name && (
                  <span className="inline-flex items-center gap-1 font-medium text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                    <BookOpen className="w-3 h-3" /> {document.topic_name}
                  </span>
                )}
                {document.uploader_name && (
                  <span className="inline-flex items-center gap-1 text-slate-600">
                    <User className="w-3 h-3" /> {document.uploader_name}
                  </span>
                )}
                <span className="inline-flex items-center gap-1 text-slate-500">
                  <Calendar className="w-3 h-3" /> {new Date(document.uploaded_at).toLocaleDateString()}
                </span>
                <span className="inline-flex items-center gap-1 font-mono text-[11px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                  <Layers className="w-3 h-3" /> {document.chunk_count} passages indexed
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/70 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action / Search Toolbar */}
        <div className="px-4 sm:px-6 py-2.5 bg-slate-100/70 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              placeholder="Search in this document..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600"
            />
            {searchTerm.trim() && (
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-teal-700 font-semibold">
                {searchMatches} match{searchMatches !== 1 ? 'es' : ''}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
              isLoading={downloading}
              className="text-xs"
            >
              <Download className="w-3.5 h-3.5 mr-1" /> Download File
            </Button>
            {onStudyWithTutor && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  onStudyWithTutor(document);
                  onClose();
                }}
                className="text-xs bg-teal-700 hover:bg-teal-800"
              >
                <MessageSquare className="w-3.5 h-3.5 mr-1" /> Study with AI Tutor
              </Button>
            )}
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-white font-sans">
          {loading ? (
            <div className="flex flex-col items-center justify-center min-h-[300px] text-slate-500 space-y-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600" />
              <p className="text-sm font-medium">Loading academic material excerpts...</p>
            </div>
          ) : error ? (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-sm">Unable to load material content</p>
                <p className="text-xs mt-0.5">{error}</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 text-xs text-slate-400">
                <span className="flex items-center gap-1 font-medium text-slate-600">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Verified Faculty Course Material
                </span>
                <span>Grounding Source for AI Tutor RAG</span>
              </div>
              <div className="prose prose-sm max-w-none text-slate-700 leading-relaxed font-normal whitespace-pre-wrap selection:bg-teal-100 selection:text-teal-900 bg-slate-50/50 p-4 sm:p-6 rounded-xl border border-slate-100 font-mono text-xs">
                {filteredContent}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>Format: {document.file_type} {document.file_size ? `· ${(document.file_size / 1024).toFixed(1)} KB` : ''}</span>
          <Button variant="secondary" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>

      </div>
    </div>
  );
};
