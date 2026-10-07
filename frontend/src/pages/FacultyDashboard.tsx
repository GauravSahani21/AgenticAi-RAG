import React, { useState, useEffect } from 'react';
import { dashboardService, curriculumService, documentService } from '../services/api';
import type { FacultyOverview, Subject, DocumentItem } from '../types';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Badge } from '../components/Badge';
import { DocumentUploadModal } from '../components/DocumentUploadModal';
import { RAGSearchTester } from '../components/RAGSearchTester';
import { FacultyAnalyticsView } from '../components/FacultyAnalyticsView';

import { 
  BookOpen, 
  Layers, 
  FileText, 
  PlusCircle, 
  Upload, 
  Trash2, 
  CheckCircle2, 
  Database,
  BarChart2
} from 'lucide-react';


export const FacultyDashboard: React.FC = () => {
  const [overview, setOverview] = useState<FacultyOverview | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals & form state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showAddCourse, setShowAddCourse] = useState(false);
  const [newCourseName, setNewCourseName] = useState('');
  const [newCourseCode, setNewCourseCode] = useState('');
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [mainTab, setMainTab] = useState<'materials' | 'analytics'>('analytics');

  const fetchData = async () => {
    try {
      const [ovData, subData, docsData] = await Promise.all([
        dashboardService.getFacultyOverview(),
        curriculumService.getSubjects(),
        documentService.getDocuments(),
      ]);
      setOverview(ovData);
      setSubjects(subData);
      setDocuments(docsData);
    } catch (err) {
      console.error('Failed to load faculty dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setCreating(true);

    try {
      await curriculumService.createSubject(newCourseName, newCourseCode);
      setNewCourseName('');
      setNewCourseCode('');
      setShowAddCourse(false);
      await fetchData();
    } catch (err: any) {
      setFormError(err.response?.data?.detail || 'Failed to create subject.');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteDocument = async (docId: string, filename: string) => {
    if (!window.confirm(`Are you sure you want to delete "${filename}" and purge all its vector chunks from ChromaDB?`)) {
      return;
    }
    setDeletingId(docId);
    try {
      await documentService.deleteDocument(docId);
      setDocuments(documents.filter((d) => d.id !== docId));
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to delete document.');
    } finally {
      setDeletingId(null);
    }
  };

  const getFormatBadge = (ext: string) => {
    switch (ext.toUpperCase()) {
      case 'PDF':
        return <Badge variant="warning" size="sm">PDF</Badge>;
      case 'DOCX':
        return <Badge variant="info" size="sm">DOCX</Badge>;
      case 'PPTX':
        return <Badge variant="student" size="sm">PPTX</Badge>;
      case 'TXT':
        return <Badge variant="default" size="sm">TXT</Badge>;
      default:
        return <Badge size="sm">{ext}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  const totalChunks = documents.reduce((acc, d) => acc + (d.chunk_count || 0), 0);

  return (
    <div className="space-y-6">
      {/* Professional Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-zinc-900">
              Faculty Management Console
            </h1>
            <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-700 border border-zinc-200">
              Instructor Portal
            </span>
          </div>
          <p className="mt-1 text-xs text-zinc-500">
            Course curriculum, document indexing, student mastery analytics, and early interventions
          </p>
        </div>
        <Button
          variant="primary"
          size="md"
          onClick={() => setShowUploadModal(true)}
          className="flex items-center gap-2 self-start sm:self-auto"
        >
          <Upload className="w-4 h-4" />
          <span>Upload Course Material</span>
        </Button>
      </div>

      {/* Main Tab Navigation */}
      <div className="flex items-center gap-2 border-b border-zinc-200">
        <button
          onClick={() => setMainTab('analytics')}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold border-b-2 transition-colors -mb-px ${
            mainTab === 'analytics'
              ? 'border-zinc-900 text-zinc-900'
              : 'border-transparent text-zinc-500 hover:text-zinc-800'
          }`}
        >
          <BarChart2 className="w-3.5 h-3.5" />
          Analytics & Interventions
        </button>
        <button
          onClick={() => setMainTab('materials')}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold border-b-2 transition-colors -mb-px ${
            mainTab === 'materials'
              ? 'border-zinc-900 text-zinc-900'
              : 'border-transparent text-zinc-500 hover:text-zinc-800'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          Curriculum & Knowledge Base
        </button>
      </div>

      {mainTab === 'analytics' ? (
        <FacultyAnalyticsView />
      ) : (
        <>
          {/* Metrics Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="flex items-center gap-4 border-l-4 border-l-indigo-600">
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                <BookOpen className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase">Subjects Managed</p>
                <p className="text-2xl font-bold text-slate-800">{overview?.managed_subjects || subjects.length}</p>
              </div>
            </Card>

            <Card className="flex items-center gap-4 border-l-4 border-l-blue-600">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                <Layers className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase">Course Topics</p>
                <p className="text-2xl font-bold text-slate-800">{overview?.total_topics || 0}</p>
              </div>
            </Card>

            <Card className="flex items-center gap-4 border-l-4 border-l-amber-600">
              <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase">Knowledge Base Documents</p>
                <p className="text-2xl font-bold text-slate-800">{documents.length}</p>
              </div>
            </Card>

            <Card className="flex items-center gap-4 border-l-4 border-l-emerald-600">
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                <Database className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase">Indexed Vector Chunks</p>
                <p className="text-2xl font-bold text-slate-800">{totalChunks}</p>
              </div>
            </Card>
          </div>


      {/* Knowledge Base Documents Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-600" />
              Faculty-Approved Academic Documents (RAG)
            </h2>
            <p className="text-xs text-slate-500">
              Active documents parsed and vectorized into ChromaDB
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowUploadModal(true)}
            className="flex items-center gap-1.5 self-start sm:self-auto"
          >
            <PlusCircle className="w-4 h-4 text-indigo-600" />
            Upload New Document
          </Button>
        </div>

        {documents.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs space-y-3">
            <p>No academic documents uploaded yet.</p>
            <Button variant="primary" size="sm" onClick={() => setShowUploadModal(true)}>
              Upload First Course Document
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3.5">Document</th>
                  <th className="px-6 py-3.5">Type</th>
                  <th className="px-6 py-3.5">Associated Course</th>
                  <th className="px-6 py-3.5">Vector Chunks</th>
                  <th className="px-6 py-3.5">Uploaded</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {documents.map((doc) => {
                  const sub = subjects.find((s) => s.id === doc.subject_id);
                  return (
                    <tr key={doc.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-900 flex items-center gap-2">
                          <FileText className="w-4 h-4 text-slate-400" />
                          {doc.filename}
                        </div>
                        {doc.file_size && (
                          <div className="text-[11px] text-slate-400">
                            {(doc.file_size / 1024).toFixed(1)} KB
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">{getFormatBadge(doc.file_type)}</td>
                      <td className="px-6 py-4 text-xs font-medium text-slate-800">
                        {sub ? `${sub.code} - ${sub.name}` : 'General'}
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1 font-semibold text-xs px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3.5 h-3.5" /> {doc.chunk_count} Chunks
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500">
                        {new Date(doc.uploaded_at).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteDocument(doc.id, doc.filename)}
                          isLoading={deletingId === doc.id}
                          className="text-rose-600 hover:text-rose-700 hover:border-rose-300"
                          title="Delete document and purge from ChromaDB"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Live RAG Semantic Search Explorer */}
      <RAGSearchTester subjects={subjects} />

      {/* Academic Subjects Curriculum Management */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Academic Subjects & Curricula</h2>
            <p className="text-xs text-slate-500">
              Manage subject hierarchies and map uploaded knowledge to topics
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAddCourse(!showAddCourse)}
            className="flex items-center gap-1.5 self-start sm:self-auto"
          >
            <PlusCircle className="w-4 h-4" />
            {showAddCourse ? 'Cancel' : 'Add New Subject'}
          </Button>
        </div>

        {showAddCourse && (
          <form onSubmit={handleCreateSubject} className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-4">
            <h3 className="text-sm font-bold text-slate-800">Add New Academic Subject</h3>
            {formError && (
              <p className="text-xs text-rose-600 bg-rose-50 p-2 rounded border border-rose-200">{formError}</p>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Subject Name"
                placeholder="e.g. Advanced Deep Learning"
                value={newCourseName}
                onChange={(e) => setNewCourseName(e.target.value)}
                required
              />
              <Input
                label="Subject Code"
                placeholder="e.g. CS-DL-701"
                value={newCourseCode}
                onChange={(e) => setNewCourseCode(e.target.value)}
                required
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setShowAddCourse(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" isLoading={creating}>
                Save Subject
              </Button>
            </div>
          </form>
        )}

        <div className="mt-6 space-y-6">
          {subjects.map((sub) => (
            <div key={sub.id} className="p-5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-md bg-indigo-100 text-indigo-800">
                    {sub.code}
                  </span>
                  <h3 className="text-base font-bold text-slate-900">{sub.name}</h3>
                </div>
                <span className="text-xs text-slate-500">
                  {sub.topics?.length || 0} Topics configured
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 pt-2">
                {sub.topics && sub.topics.map((t, idx) => (
                  <div key={t.id || idx} className="bg-white p-3 rounded-lg border border-slate-200 text-xs">
                    <span className="text-[10px] font-semibold text-slate-400 block uppercase">
                      {t.module} • {t.difficulty}
                    </span>
                    <span className="font-semibold text-slate-800 block mt-0.5">{t.name}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      </>
      )}

      {/* Upload Modal */}
      <DocumentUploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        subjects={subjects}
        onUploadSuccess={() => {
          fetchData();
        }}
      />
    </div>
  );
};

