import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { dashboardService, curriculumService, assessmentService, documentService } from '../services/api';
import type { StudentOverview, Subject, Topic, LearningState, DocumentItem } from '../types';
import { LearningSculpture } from '../components/LearningSculpture';
import { filterTopics, recommendTopic, type TopicFilter } from '../utils/studyPlan';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { TutorChat } from '../components/TutorChat';
import { AssessmentModal } from '../components/AssessmentModal';
import { DocumentViewerModal } from '../components/DocumentViewerModal';
import { Button } from '../components/Button';
import { 
  BookOpen, 
  Layers, 
  Award, 
  MessageSquare, 
  ArrowRight,
  FileText,
  Download,
  Eye,
  Calendar,
  User,
  Search,
  CheckCircle2,
  HelpCircle,
  TrendingUp,
  Info
} from 'lucide-react';

export const StudentDashboard: React.FC = () => {
  const { user } = useAuth();
  const [overview, setOverview] = useState<StudentOverview | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [learningStates, setLearningStates] = useState<{ [topicId: string]: LearningState }>({});
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [docsLoading, setDocsLoading] = useState<boolean>(false);
  const [viewingDocument, setViewingDocument] = useState<DocumentItem | null>(null);
  const [activeTab, setActiveTab] = useState<'curriculum' | 'materials' | 'tutor'>('curriculum');
  const [activeTopicForTutor, setActiveTopicForTutor] = useState<string | undefined>(undefined);
  const [assessmentTopic, setAssessmentTopic] = useState<Topic | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [statesError, setStatesError] = useState(false);
  const [retry, setRetry] = useState(0);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<TopicFilter>('all');
  const [docFilterTopic, setDocFilterTopic] = useState<string>('all');
  const [docSearchQuery, setDocSearchQuery] = useState('');

  const topics = selectedSubject?.topics ?? [];
  const visibleTopics = filterTopics(topics, learningStates, query, statesError ? 'all' : filter);
  const recommendation = statesError ? null : recommendTopic(topics, learningStates);

  // Overall statistics across subjects
  const recordedStates = subjects.flatMap(subject => subject.topics ?? [])
    .map(topic => learningStates[topic.id]).filter((state): state is LearningState => !!state && state.attempts > 0);
  const averageMastery = recordedStates.length
    ? recordedStates.reduce((sum, state) => sum + state.mastery_score, 0) / recordedStates.length : null;

  // Selected subject specific progress calculations
  const currentSubjectTopics = selectedSubject?.topics ?? [];
  const currentSubjectRecordedStates = currentSubjectTopics
    .map(t => learningStates[t.id])
    .filter((s): s is LearningState => !!s && s.attempts > 0);

  // Overall course curriculum progress: sum of all topic masteries / total topics in the course
  // When a student completes and masters all topics, overallCourseProgress reaches 100%!
  const totalCourseTopics = currentSubjectTopics.length || 1;
  const totalMasterySum = currentSubjectTopics
    .map(t => learningStates[t.id]?.mastery_score || 0)
    .reduce((sum, score) => sum + score, 0);
  const overallCourseProgress = Math.min(100, Math.round(totalMasterySum / totalCourseTopics));

  const masteredTopicsCount = currentSubjectRecordedStates.filter(s => s.mastery_score >= 80).length;
  const improvingTopicsCount = currentSubjectRecordedStates.filter(s => s.mastery_score >= 50 && s.mastery_score < 80).length;
  const strugglingTopicsCount = currentSubjectRecordedStates.filter(s => s.mastery_score < 50).length;
  const notAssessedTopicsCount = Math.max(0, currentSubjectTopics.length - currentSubjectRecordedStates.length);
  const courseCoveragePercent = currentSubjectTopics.length
    ? (currentSubjectRecordedStates.length / currentSubjectTopics.length) * 100
    : 0;

  const fetchStates = async () => {
    try {
      const states = await assessmentService.getAllStates();
      const map: { [topicId: string]: LearningState } = {};
      states.forEach((s) => {
        map[s.topic_id] = s;
      });
      setLearningStates(map);
      setStatesError(false);
    } catch (err) {
      setStatesError(true);
      console.error('Failed to load learning states:', err);
    }
  };

  const fetchDocuments = async (subjectId?: string) => {
    if (!subjectId) return;
    setDocsLoading(true);
    try {
      const docs = await documentService.getDocuments(subjectId);
      setDocuments(docs);
    } catch (err) {
      console.error('Failed to load course materials:', err);
    } finally {
      setDocsLoading(false);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(false);
      try {
        const [ovData, subData] = await Promise.all([
          dashboardService.getStudentOverview(),
          curriculumService.getSubjects(),
        ]);
        setOverview(ovData);
        setSubjects(subData);
        if (subData.length > 0) {
          setSelectedSubject(subData[0]);
          await fetchDocuments(subData[0].id);
        }
        await fetchStates();
      } catch (err) {
        setError(true);
        console.error('Failed to load student dashboard:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [retry]);

  // When selected subject changes, refresh materials
  useEffect(() => {
    if (selectedSubject?.id) {
      fetchDocuments(selectedSubject.id);
    }
  }, [selectedSubject?.id]);

  const handleStartTutorOnTopic = (topic: Topic) => {
    setActiveTopicForTutor(topic.id);
    setActiveTab('tutor');
  };

  const handleStudyDocumentWithTutor = (doc: DocumentItem) => {
    if (doc.topic_id) {
      setActiveTopicForTutor(doc.topic_id);
    }
    setActiveTab('tutor');
  };

  const getDifficultyBadge = (diff: string) => {
    switch (diff?.toUpperCase()) {
      case 'BEGINNER':
        return <Badge variant="success" size="sm">BEGINNER</Badge>;
      case 'INTERMEDIATE':
        return <Badge variant="info" size="sm">INTERMEDIATE</Badge>;
      case 'ADVANCED':
        return <Badge variant="warning" size="sm">ADVANCED</Badge>;
      default:
        return <Badge size="sm">{diff || 'STANDARD'}</Badge>;
    }
  };

  // Filtered documents
  const filteredDocuments = documents.filter((doc) => {
    const matchesTopic = docFilterTopic === 'all' || doc.topic_id === docFilterTopic;
    const matchesSearch = !docSearchQuery.trim() || 
      doc.filename.toLowerCase().includes(docSearchQuery.toLowerCase()) ||
      (doc.topic_name && doc.topic_name.toLowerCase().includes(docSearchQuery.toLowerCase())) ||
      (doc.uploader_name && doc.uploader_name.toLowerCase().includes(docSearchQuery.toLowerCase()));
    return matchesTopic && matchesSearch;
  });

  if (loading) {
    return (
      <div role="status" aria-label="Loading your learning workspace" className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-rose-800">
        Your workspace could not be loaded. <button className="font-semibold underline" onClick={() => setRetry(value => value + 1)}>Try again</button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {statesError && (
        <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900 flex items-center justify-between">
          <span>Learning progress is temporarily unavailable.</span>
          <button className="font-semibold underline text-amber-950" onClick={fetchStates}>Retry progress</button>
        </div>
      )}

      {/* Hero Header */}
      <section className="workspace-hero">
        <div className="relative z-10 max-w-xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-200">Your learning workspace</p>
          <h1 className="mt-4 text-3xl sm:text-4xl font-semibold tracking-tight">A little progress.<br />A deeper understanding.</h1>
          <p className="mt-4 text-sm leading-6 text-slate-300">Welcome back{user?.name ? `, ${user.name.split(' ')[0]}` : ''}. Explore your course, study verified academic materials, and build conceptual mastery.</p>
          <div className="mt-6 flex flex-wrap items-center gap-4 text-xs text-teal-100">
            <span className="flex items-center gap-1.5"><BookOpen className="h-4 w-4" /> {subjects.length} Course{subjects.length !== 1 ? 's' : ''} Enrolled</span>
            <span className="flex items-center gap-1.5"><FileText className="h-4 w-4" /> {documents.length} Academic Reading{documents.length !== 1 ? 's' : ''}</span>
            <span className="flex items-center gap-1.5"><TrendingUp className="h-4 w-4" /> Real-time Mastery Tracking</span>
          </div>
        </div>
        <LearningSculpture />
      </section>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="metric-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500">Enrolled Courses</span>
            <BookOpen className="w-4 h-4 text-zinc-400" />
          </div>
          <p className="text-2xl font-bold text-zinc-900 mt-2">{overview?.available_subjects ?? subjects.length}</p>
          <p className="text-[11px] text-zinc-400 mt-0.5">Faculty-approved syllabi</p>
        </Card>

        <Card className="metric-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500">Curriculum Topics</span>
            <Layers className="w-4 h-4 text-zinc-400" />
          </div>
          <p className="text-2xl font-bold text-zinc-900 mt-2">{overview?.available_topics ?? currentSubjectTopics.length}</p>
          <p className="text-[11px] text-zinc-400 mt-0.5">Sequential learning modules</p>
        </Card>

        <Card className="metric-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500">Course Materials</span>
            <FileText className="w-4 h-4 text-teal-600" />
          </div>
          <p className="text-2xl font-bold text-zinc-900 mt-2">{documents.length}</p>
          <p className="text-[11px] text-zinc-400 mt-0.5">Faculty-uploaded documents</p>
        </Card>

        <Card className="metric-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500">Average Mastery</span>
            <Award className="w-4 h-4 text-teal-600" />
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <p className="text-2xl font-bold text-zinc-900">
              {statesError || averageMastery === null ? '0%' : `${averageMastery.toFixed(0)}%`}
            </p>
            <span className="text-xs font-medium text-slate-500">
              ({recordedStates.length}/{currentSubjectTopics.length} topics)
            </span>
          </div>
          {/* Progress Bar inside Average Mastery Metric */}
          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mt-2 border border-slate-200">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                (averageMastery || 0) >= 80 
                  ? 'bg-emerald-500' 
                  : (averageMastery || 0) >= 50 
                  ? 'bg-blue-600' 
                  : 'bg-teal-600'
              }`}
              style={{ width: `${statesError || averageMastery === null ? 0 : Math.max(3, Math.min(100, averageMastery))}%` }}
            />
          </div>
          <p className="text-[11px] text-zinc-400 mt-1">Practice indicator across topics</p>
        </Card>
      </div>

      {/* Suggested Next Step Banner */}
      {recommendation && activeTab === 'curriculum' && (
        <section className="next-step">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-widest text-teal-700">Suggested next step</p>
            <h2 className="mt-2 text-lg font-semibold text-slate-900">{recommendation.topic.name}</h2>
            <p className="mt-1 text-sm text-slate-600">{recommendation.reason}</p>
          </div>
          <button className="study-button shrink-0" onClick={() => handleStartTutorOnTopic(recommendation.topic)}>
            Start learning <ArrowRight className="h-4 w-4" />
          </button>
        </section>
      )}

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-zinc-200">
        <button
          aria-pressed={activeTab === 'curriculum'}
          onClick={() => { setActiveTab('curriculum'); void fetchStates(); }}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors -mb-px ${
            activeTab === 'curriculum'
              ? 'border-zinc-900 text-zinc-900'
              : 'border-transparent text-zinc-500 hover:text-zinc-800'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          Course Curriculum ({currentSubjectTopics.length})
        </button>
        <button
          aria-pressed={activeTab === 'materials'}
          onClick={() => { setActiveTab('materials'); if (selectedSubject) fetchDocuments(selectedSubject.id); }}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors -mb-px ${
            activeTab === 'materials'
              ? 'border-zinc-900 text-zinc-900'
              : 'border-transparent text-zinc-500 hover:text-zinc-800'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          Course Materials & Readings ({documents.length})
        </button>
        <button
          aria-pressed={activeTab === 'tutor'}
          onClick={() => setActiveTab('tutor')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors -mb-px ${
            activeTab === 'tutor'
              ? 'border-zinc-900 text-zinc-900'
              : 'border-transparent text-zinc-500 hover:text-zinc-800'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          Interactive Tutor
        </button>
      </div>

      {/* Tab 1: Course Curriculum */}
      {activeTab === 'curriculum' && (
        <div className="flex flex-col lg:flex-row gap-6 items-start">
          {/* Compact Course Sidebar */}
          <div className="w-full lg:w-64 shrink-0 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-zinc-600" /> Academic Courses
              </h2>
              <span className="text-[11px] font-medium text-zinc-400">{subjects.length} total</span>
            </div>
            <div className="space-y-1.5">
              {subjects.map((sub) => (
                <button
                  type="button"
                  aria-pressed={selectedSubject?.id === sub.id}
                  key={sub.id}
                  onClick={() => { 
                    setSelectedSubject(sub); 
                    setQuery(''); 
                    setFilter('all'); 
                    setActiveTopicForTutor(undefined); 
                  }}
                  className={`w-full text-left p-4 rounded-lg border cursor-pointer transition-colors ${
                    selectedSubject?.id === sub.id
                      ? 'border-zinc-900 bg-zinc-100/70 shadow-sm'
                      : 'border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-white border border-zinc-200 text-zinc-800">
                      {sub.code}
                    </span>
                    <span className="text-[11px] text-zinc-500">{sub.topics?.length || 0} topics</span>
                  </div>
                  <span className="block mt-2 font-medium text-zinc-900 text-sm">{sub.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Curriculum Topics Area */}
          <div className="flex-1 min-w-0 w-full space-y-4">
            
            {/* Prominent Course Overall Progress Bar Banner */}
            <div className="p-4 sm:p-5 rounded-xl bg-white border border-slate-200 shadow-xs space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-teal-700 bg-teal-50 px-2.5 py-0.5 rounded border border-teal-200">
                    {selectedSubject?.name || 'Course'} · Mastery Progress
                  </span>
                  <h3 className="text-base font-bold text-slate-900 mt-1">
                    Overall Curriculum Progress
                  </h3>
                  <p className="text-xs text-slate-500">
                    {currentSubjectRecordedStates.length} of {currentSubjectTopics.length} topics assessed ({courseCoveragePercent.toFixed(0)}% course coverage)
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <span className="text-xs text-slate-400 block">Course Progress</span>
                    <span className="text-xl font-extrabold text-slate-900">
                      {overallCourseProgress > 0 ? `${overallCourseProgress}%` : '0%'}
                    </span>
                  </div>
                  <Badge 
                    variant={
                      overallCourseProgress >= 80 ? 'success' : overallCourseProgress >= 50 ? 'info' : 'warning'
                    }
                    size="sm"
                  >
                    {overallCourseProgress >= 80 ? 'EXCELLENT' : overallCourseProgress >= 50 ? 'PROGRESSING' : 'NEEDS PRACTICE'}
                  </Badge>
                </div>
              </div>

              {/* Course Progress Bar */}
              <div className="space-y-1.5">
                <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden p-0.5 border border-slate-200">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${
                      overallCourseProgress >= 80 
                        ? 'bg-emerald-500' 
                        : overallCourseProgress >= 50 
                        ? 'bg-blue-600' 
                        : overallCourseProgress > 0
                        ? 'bg-amber-500'
                        : 'bg-slate-300'
                    }`}
                    style={{ width: `${Math.max(overallCourseProgress > 0 ? 3 : 0, Math.min(100, overallCourseProgress))}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
                  <span className="flex items-center gap-1 font-medium text-emerald-700">
                    <CheckCircle2 className="w-3 h-3" /> {masteredTopicsCount} Mastered (80%+)
                  </span>
                  <span className="flex items-center gap-1 font-medium text-blue-700">
                    <TrendingUp className="w-3 h-3" /> {improvingTopicsCount} In Progress (50-79%)
                  </span>
                  <span className="flex items-center gap-1 text-slate-500">
                    <HelpCircle className="w-3 h-3" /> {notAssessedTopicsCount + strugglingTopicsCount} To Practice
                  </span>
                </div>
              </div>

              {/* Real-time Instructions on how to complete the progress */}
              <div className="p-3 bg-teal-50/70 rounded-lg border border-teal-100 flex items-start gap-2.5 text-xs text-teal-900">
                <Info className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <span className="font-semibold text-teal-950">How to reach 100% course progress:</span> Take the <span className="font-medium">Mastery Check</span> on all {currentSubjectTopics.length} syllabus topics and achieve 80%+ mastery on each module. Each correct answer increases your topic mastery in real time.
                </div>
              </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="flex flex-col sm:flex-row gap-3">
              <label className="flex-1">
                <span className="sr-only">Search course topics</span>
                <input 
                  type="search" 
                  className="field" 
                  placeholder="Search topics, modules, or concepts…" 
                  value={query} 
                  onChange={event => setQuery(event.target.value)} 
                />
              </label>
              <label>
                <span className="sr-only">Filter topics by progress</span>
                <select 
                  className="field" 
                  value={filter} 
                  disabled={statesError} 
                  onChange={event => setFilter(event.target.value as TopicFilter)}
                >
                  <option value="all">All progress</option>
                  <option value="review">Needs review</option>
                  <option value="new">Not started</option>
                  <option value="mastered">Mastered</option>
                </select>
              </label>
            </div>
            
            <p role="status" className="text-xs text-slate-500">
              Showing {visibleTopics.length} of {topics.length} topics
            </p>

            {/* Topics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {visibleTopics.length > 0 ? (
                visibleTopics.map((t, idx) => {
                  const state = statesError ? undefined : learningStates[t.id];
                  const mastery = state?.mastery_score || 0;
                  const status = state?.status || 'NOT_STARTED';
                  const topicDocs = documents.filter(d => d.topic_id === t.id);

                  // Progress bar styling
                  const progressBarColor = mastery >= 80
                    ? 'bg-emerald-500'
                    : mastery >= 50
                    ? 'bg-blue-600'
                    : mastery > 0
                    ? 'bg-amber-500'
                    : 'bg-slate-300';

                  return (
                    <div
                      key={t.id || idx}
                      className="topic-card bg-white p-5 rounded-xl border border-slate-200 hover:shadow-md hover:border-teal-300 transition-all flex flex-col justify-between group"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                            {t.module}
                          </span>
                          <div className="flex items-center gap-1.5">
                            {getDifficultyBadge(t.difficulty)}
                            {state && (
                              <Badge
                                variant={
                                  status === 'MASTERED'
                                    ? 'success'
                                    : status === 'IMPROVING'
                                    ? 'info'
                                    : status === 'STRUGGLING' || status === 'INTERVENTION_REQUIRED'
                                    ? 'warning'
                                    : 'default'
                                }
                                size="sm"
                              >
                                {status.replace('_', ' ')}
                              </Badge>
                            )}
                          </div>
                        </div>

                        <h4 className="font-semibold text-slate-900 text-sm mb-1">{t.name}</h4>
                        <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed mb-3">
                          {t.description || 'Core academic topic for adaptive mastery assessment.'}
                        </p>

                        {/* Associated Reading Material Badge */}
                        <div className="mb-3">
                          {topicDocs.length > 0 ? (
                            <button
                              onClick={() => {
                                setDocFilterTopic(t.id);
                                setActiveTab('materials');
                              }}
                              className="inline-flex items-center gap-1 text-[11px] font-medium text-teal-800 bg-teal-50 hover:bg-teal-100 px-2 py-0.5 rounded border border-teal-200 transition-colors"
                            >
                              <FileText className="w-3 h-3 text-teal-600" />
                              {topicDocs.length} Course Material{topicDocs.length !== 1 ? 's' : ''} Uploaded
                            </button>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">
                              General Syllabus Material
                            </span>
                          )}
                        </div>

                        {/* Topic Mastery Progress Bar */}
                        <div className="space-y-1.5 mb-2 bg-slate-50 p-3 rounded-lg border border-slate-100">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-slate-600 font-semibold flex items-center gap-1">
                              Topic Mastery:
                            </span>
                            <span className="font-extrabold text-slate-900 text-xs">
                              {statesError ? 'Unavailable' : `${mastery.toFixed(1)}%`}
                            </span>
                          </div>
                          
                          <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden border border-slate-200/50">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${progressBarColor}`}
                              style={{ width: `${statesError ? 0 : Math.max(mastery > 0 ? 4 : 0, Math.min(100, mastery))}%` }}
                            />
                          </div>
                          
                          <div className="flex items-center justify-between text-[10px] text-slate-500 pt-0.5">
                            <span>
                              {state && state.attempts > 0 ? `${state.attempts} practice attempt${state.attempts !== 1 ? 's' : ''}` : 'No assessments taken yet'}
                            </span>
                            {state && state.attempts > 0 && (
                              <span className="text-emerald-700 font-semibold">
                                {state.correct_answers} correct
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="mt-2 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                        <button
                          onClick={() => setAssessmentTopic(t)}
                          className="inline-flex items-center gap-1 text-slate-700 hover:text-teal-700 font-semibold transition-colors"
                        >
                          <Award className="w-3.5 h-3.5 text-teal-600" /> Mastery Check
                        </button>
                        <button
                          onClick={() => handleStartTutorOnTopic(t)}
                          className="inline-flex items-center gap-1 text-teal-700 font-semibold group-hover:text-teal-800 hover:underline"
                        >
                          Study with AI <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="col-span-2 p-8 text-center bg-white rounded-xl border border-dashed border-slate-300 text-slate-500 text-sm">
                  {topics.length ? 'No topics match your filters. Try a different search or progress filter.' : 'No topics configured for this course yet.'}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Course Materials & Readings (Teacher Uploaded Content) */}
      {activeTab === 'materials' && (
        <div className="space-y-4">
          <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-teal-600" />
                <h2 className="text-base font-bold text-slate-900">
                  {selectedSubject?.name} · Course Materials & Readings
                </h2>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Faculty-approved textbooks, lecture slides, and notes uploaded for this course. Grounded directly in your AI tutor knowledge base.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold px-2.5 py-1 rounded bg-teal-50 border border-teal-200 text-teal-800">
                {documents.length} Document{documents.length !== 1 ? 's' : ''} Available
              </span>
            </div>
          </div>

          {/* Search & Topic Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="search"
                className="field pl-9"
                placeholder="Search materials by title, instructor, or concept..."
                value={docSearchQuery}
                onChange={(e) => setDocSearchQuery(e.target.value)}
              />
            </div>
            <div className="w-full sm:w-64">
              <select
                className="field"
                value={docFilterTopic}
                onChange={(e) => setDocFilterTopic(e.target.value)}
              >
                <option value="all">All Topics ({documents.length})</option>
                {topics.map((t) => {
                  const count = documents.filter(d => d.topic_id === t.id).length;
                  return (
                    <option key={t.id} value={t.id}>
                      {t.name} ({count})
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          {/* Document Cards List */}
          {docsLoading ? (
            <div className="flex items-center justify-center min-h-[250px]">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600" />
            </div>
          ) : filteredDocuments.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredDocuments.map((doc) => (
                <div
                  key={doc.id}
                  className="bg-white p-5 rounded-xl border border-slate-200 hover:border-teal-300 hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider bg-slate-100 border border-slate-200 text-slate-700">
                          {doc.file_type}
                        </span>
                        {doc.topic_name ? (
                          <span className="text-[11px] font-semibold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                            {doc.topic_name}
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400">General Reading</span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-400 font-mono">
                        {doc.chunk_count} passages
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-slate-900 mt-1 mb-2 line-clamp-1">
                      {doc.filename}
                    </h3>

                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 mb-4">
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3 text-slate-400" /> {doc.uploader_name || 'Faculty'}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-400" /> {new Date(doc.uploaded_at).toLocaleDateString()}
                      </span>
                      {doc.file_size && (
                        <span>{(doc.file_size / 1024).toFixed(0)} KB</span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setViewingDocument(doc)}
                      className="text-xs"
                    >
                      <Eye className="w-3.5 h-3.5 mr-1 text-teal-600" /> Read Material
                    </Button>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => documentService.downloadDocument(doc.id, doc.filename)}
                        className="text-xs"
                        title="Download file"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleStudyDocumentWithTutor(doc)}
                        className="text-xs bg-teal-700 hover:bg-teal-800"
                      >
                        <MessageSquare className="w-3.5 h-3.5 mr-1" /> Ask Tutor
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-10 text-center bg-white rounded-xl border border-dashed border-slate-300 text-slate-500 text-sm">
              <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="font-semibold text-slate-700">No course materials match your selection</p>
              <p className="text-xs text-slate-400 mt-1">
                {documents.length === 0 
                  ? 'Your instructor has not uploaded supplementary materials for this course yet.' 
                  : 'Try adjusting your topic filter or search keyword.'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Interactive AI Tutor */}
      {activeTab === 'tutor' && (
        <div className="space-y-4">
          <TutorChat
            subjects={subjects}
            initialSubjectId={selectedSubject?.id}
            initialTopicId={activeTopicForTutor}
          />
        </div>
      )}

      {/* Assessment Modal */}
      {assessmentTopic && (
        <AssessmentModal
          topic={assessmentTopic}
          isOpen={!!assessmentTopic}
          onClose={() => {
            setAssessmentTopic(null);
            void fetchStates();
            void dashboardService.getStudentOverview().then(ov => { if (ov) setOverview(ov); });
          }}
          onAssessmentCompleted={async () => {
            try {
              const [_, ov] = await Promise.all([
                fetchStates(),
                dashboardService.getStudentOverview()
              ]);
              if (ov) setOverview(ov);
            } catch (err) {
              console.error('Failed to refresh real-time overview:', err);
            }
          }}
        />
      )}

      {/* Document Reader / Viewer Modal */}
      {viewingDocument && (
        <DocumentViewerModal
          document={viewingDocument}
          isOpen={!!viewingDocument}
          onClose={() => setViewingDocument(null)}
          onStudyWithTutor={(doc) => handleStudyDocumentWithTutor(doc)}
        />
      )}
    </div>
  );
};
