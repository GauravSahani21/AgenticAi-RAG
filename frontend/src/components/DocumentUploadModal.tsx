import React, { useState, useEffect } from 'react';
import type { Subject, Topic, DocumentItem } from '../types';
import { documentService, curriculumService } from '../services/api';
import { Button } from './Button';
import { 
  Upload, 
  X, 
  FileText, 
  AlertCircle, 
  CheckCircle2,
  Plus,
  Layers
} from 'lucide-react';

interface DocumentUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  subjects: Subject[];
  initialSubjectId?: string;
  initialTopicId?: string;
  onUploadSuccess: (newDoc: DocumentItem) => void;
  onRefreshSubjects?: () => Promise<void>;
}

export const DocumentUploadModal: React.FC<DocumentUploadModalProps> = ({
  isOpen,
  onClose,
  subjects,
  initialSubjectId,
  initialTopicId,
  onUploadSuccess,
  onRefreshSubjects,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [selectedTopicId, setSelectedTopicId] = useState<string>('');
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Quick inline add-topic state
  const [showQuickAddTopic, setShowQuickAddTopic] = useState<boolean>(false);
  const [newTopicName, setNewTopicName] = useState<string>('');
  const [newTopicModule, setNewTopicModule] = useState<string>('Module 1');
  const [newTopicDifficulty, setNewTopicDifficulty] = useState<string>('INTERMEDIATE');
  const [creatingTopic, setCreatingTopic] = useState<boolean>(false);
  const [topicError, setTopicError] = useState<string | null>(null);

  // Synchronize selected subject and topic when modal opens or subjects change
  useEffect(() => {
    if (isOpen) {
      setError(null);
      setSuccessMsg(null);
      setShowQuickAddTopic(false);
      setTopicError(null);

      // Priority 1: initialSubjectId
      if (initialSubjectId && subjects.some((s) => s.id === initialSubjectId)) {
        setSelectedSubjectId(initialSubjectId);
      } else if (subjects.length > 0 && (!selectedSubjectId || !subjects.some((s) => s.id === selectedSubjectId))) {
        setSelectedSubjectId(subjects[0].id);
      }

      if (initialTopicId) {
        setSelectedTopicId(initialTopicId);
      }
    }
  }, [isOpen, subjects, initialSubjectId, initialTopicId]);

  // Clean topic selection if subject changes and topic does not belong to new subject
  useEffect(() => {
    if (!selectedSubjectId) return;
    const currentSubject = subjects.find((s) => s.id === selectedSubjectId);
    if (selectedTopicId && !currentSubject?.topics?.some((t) => t.id === selectedTopicId)) {
      setSelectedTopicId('');
    }
  }, [selectedSubjectId, subjects]);

  if (!isOpen) return null;

  const currentSubject = subjects.find((s) => s.id === selectedSubjectId);
  const availableTopics: Topic[] = currentSubject?.topics || [];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (!['pdf', 'docx', 'pptx', 'txt'].includes(ext || '')) {
        setError('Unsupported format. Allowed formats: PDF, DOCX, PPTX, TXT.');
        setSelectedFile(null);
        return;
      }
      if (file.size > 25 * 1024 * 1024) {
        setError('File exceeds maximum size limit of 25MB.');
        setSelectedFile(null);
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleQuickCreateTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubjectId) {
      setTopicError('Please select a subject first.');
      return;
    }
    if (!newTopicName.trim()) {
      setTopicError('Please enter a topic name.');
      return;
    }

    setCreatingTopic(true);
    setTopicError(null);
    try {
      const created = await curriculumService.createTopic({
        subject_id: selectedSubjectId,
        module: newTopicModule.trim() || 'Module 1',
        name: newTopicName.trim(),
        difficulty: newTopicDifficulty
      });

      // Refresh subjects list in parent if available
      if (onRefreshSubjects) {
        await onRefreshSubjects();
      }

      // Automatically select the newly created topic
      setSelectedTopicId(created.id);
      setNewTopicName('');
      setShowQuickAddTopic(false);
    } catch (err: any) {
      setTopicError(err.response?.data?.detail || 'Failed to create new topic.');
    } finally {
      setCreatingTopic(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setError('Please select a file to upload.');
      return;
    }
    if (!selectedSubjectId) {
      setError('Please select an academic subject.');
      return;
    }

    setError(null);
    setIsUploading(true);
    setSuccessMsg(null);

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('subject_id', selectedSubjectId);
    
    // Only append valid topic_id
    if (selectedTopicId && selectedTopicId.trim() !== '') {
      formData.append('topic_id', selectedTopicId.trim());
    }

    try {
      const doc = await documentService.uploadDocument(formData);
      setSuccessMsg(`"${doc.filename}" successfully parsed into ${doc.chunk_count} vector chunks!`);
      setTimeout(() => {
        onUploadSuccess(doc);
        onClose();
      }, 1000);
    } catch (err: any) {
      const detail = err.response?.data?.detail || 'Failed to upload and index document.';
      setError(detail);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 relative max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-teal-50 text-teal-700">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Upload Academic Material</h3>
              <p className="text-xs text-slate-500">Ingest documents into ChromaDB Vector Knowledge Base</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Academic Subject *
              </label>
              <select
                value={selectedSubjectId}
                onChange={(e) => {
                  setSelectedSubjectId(e.target.value);
                  setSelectedTopicId('');
                }}
                required
                className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                {subjects.length === 0 && <option value="">No subjects available</option>}
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.code} - {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Target Topic (Optional)
                </label>
                <button
                  type="button"
                  onClick={() => setShowQuickAddTopic(!showQuickAddTopic)}
                  className="text-[11px] font-semibold text-teal-700 hover:text-teal-900 flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  {showQuickAddTopic ? 'Hide New Topic' : '+ Add New Topic'}
                </button>
              </div>

              <select
                value={selectedTopicId}
                onChange={(e) => setSelectedTopicId(e.target.value)}
                className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="">General Course Material (All Topics)</option>
                {availableTopics.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.module}: {t.name} ({t.difficulty})
                  </option>
                ))}
              </select>
              {availableTopics.length === 0 && (
                <p className="text-[11px] text-amber-700 mt-1">
                  No topics in this course yet. Add a new topic below or upload as general material.
                </p>
              )}
            </div>

            {/* Inline Quick Add Topic Form */}
            {showQuickAddTopic && (
              <div className="p-3.5 rounded-xl bg-teal-50/60 border border-teal-200 space-y-2.5 transition-all">
                <div className="flex items-center gap-1.5 text-xs font-bold text-teal-900">
                  <Layers className="w-3.5 h-3.5 text-teal-700" />
                  <span>Quick Create New Topic</span>
                </div>
                {topicError && (
                  <p className="text-[11px] text-rose-700 bg-rose-50 p-1.5 rounded border border-rose-200">
                    {topicError}
                  </p>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Topic Name (e.g. Diffusion Models)"
                    value={newTopicName}
                    onChange={(e) => setNewTopicName(e.target.value)}
                    className="w-full text-xs rounded-lg border border-teal-300 px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                  <input
                    type="text"
                    placeholder="Module (e.g. Module 5)"
                    value={newTopicModule}
                    onChange={(e) => setNewTopicModule(e.target.value)}
                    className="w-full text-xs rounded-lg border border-teal-300 px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div className="flex items-center justify-between gap-2 pt-1">
                  <select
                    value={newTopicDifficulty}
                    onChange={(e) => setNewTopicDifficulty(e.target.value)}
                    className="text-xs rounded-lg border border-teal-300 px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="BEGINNER">BEGINNER</option>
                    <option value="INTERMEDIATE">INTERMEDIATE</option>
                    <option value="ADVANCED">ADVANCED</option>
                  </select>
                  <Button
                    type="button"
                    size="sm"
                    variant="primary"
                    isLoading={creatingTopic}
                    onClick={handleQuickCreateTopic}
                    className="text-xs py-1 px-3 bg-teal-700 hover:bg-teal-800"
                  >
                    Save & Select Topic
                  </Button>
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Select Document (PDF, DOCX, PPTX, TXT) *
            </label>
            <div className="border-2 border-dashed border-slate-300 rounded-xl p-5 text-center hover:border-teal-500 transition-colors bg-slate-50/50">
              <input
                type="file"
                id="file-upload"
                onChange={handleFileChange}
                accept=".pdf,.docx,.pptx,.txt"
                className="hidden"
              />
              <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center">
                <FileText className="w-9 h-9 text-teal-600 mb-2" />
                <span className="text-xs font-semibold text-slate-700">
                  {selectedFile ? selectedFile.name : 'Click to browse or drag file here'}
                </span>
                <span className="text-[11px] text-slate-400 mt-1">
                  Supported formats: PDF, DOCX, PPTX, TXT (Max 25MB)
                </span>
              </label>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-zinc-50 border border-zinc-200 flex items-center gap-2.5 text-xs text-zinc-600">
            <CheckCircle2 className="w-4 h-4 text-zinc-500 shrink-0" />
            <span>
              Document will be chunked, indexed with local dense embeddings, and stored in ChromaDB.
            </span>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isUploading}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isUploading}
              disabled={!selectedFile || !selectedSubjectId}
            >
              Upload & Vectorize
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
