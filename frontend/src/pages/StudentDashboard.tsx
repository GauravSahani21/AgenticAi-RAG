import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { dashboardService, curriculumService, assessmentService } from '../services/api';
import type { StudentOverview, Subject, Topic, LearningState } from '../types';
import { LearningSculpture } from '../components/LearningSculpture';
import { filterTopics, recommendTopic, type TopicFilter } from '../utils/studyPlan';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { TutorChat } from '../components/TutorChat';
import { AssessmentModal } from '../components/AssessmentModal';
import { 
  BookOpen, 
  Target,
  Layers, 
  Award, 
  MessageSquare, 
  ArrowRight
} from 'lucide-react';


export const StudentDashboard: React.FC = () => {
  const { user } = useAuth();
  const [overview, setOverview] = useState<StudentOverview | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [learningStates, setLearningStates] = useState<{ [topicId: string]: LearningState }>({});
  const [activeTab, setActiveTab] = useState<'curriculum' | 'tutor'>('curriculum');
  const [activeTopicForTutor, setActiveTopicForTutor] = useState<string | undefined>(undefined);
  const [assessmentTopic, setAssessmentTopic] = useState<Topic | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [statesError, setStatesError] = useState(false);
  const [retry, setRetry] = useState(0);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<TopicFilter>('all');
  const topics = selectedSubject?.topics ?? [];
  const visibleTopics = filterTopics(topics, learningStates, query, statesError ? 'all' : filter);
  const recommendation = statesError ? null : recommendTopic(topics, learningStates);
  const recordedStates = subjects.flatMap(subject => subject.topics ?? [])
    .map(topic => learningStates[topic.id]).filter((state): state is LearningState => !!state && state.attempts > 0);
  const averageMastery = recordedStates.length
    ? recordedStates.reduce((sum, state) => sum + state.mastery_score, 0) / recordedStates.length : null;

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


  const handleStartTutorOnTopic = (topic: Topic) => {
    setActiveTopicForTutor(topic.id);
    setActiveTab('tutor');
  };

  const getDifficultyBadge = (diff: string) => {
    switch (diff.toUpperCase()) {
      case 'BEGINNER':
        return <Badge variant="success" size="sm">BEGINNER</Badge>;
      case 'INTERMEDIATE':
        return <Badge variant="info" size="sm">INTERMEDIATE</Badge>;
      case 'ADVANCED':
        return <Badge variant="warning" size="sm">ADVANCED</Badge>;
      default:
        return <Badge size="sm">{diff}</Badge>;
    }
  };

  if (loading) {
    return (
      <div role="status" aria-label="Loading your learning workspace" className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) return <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-rose-800">
    Your workspace could not be loaded. <button className="font-semibold underline" onClick={() => setRetry(value => value + 1)}>Try again</button>
  </div>;

  return (
    <div className="space-y-6">
      {statesError && <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
        Learning progress is unavailable. <button className="font-semibold underline" onClick={fetchStates}>Retry progress</button>
      </div>}
      <section className="workspace-hero">
        <div className="relative z-10 max-w-xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-200">Your learning workspace</p>
          <h1 className="mt-4 text-3xl sm:text-4xl font-semibold tracking-tight">A little progress.<br />A deeper understanding.</h1>
          <p className="mt-4 text-sm leading-6 text-slate-300">Welcome back{user?.name ? `, ${user.name.split(' ')[0]}` : ''}. Explore your course, work through a concept, and make your next step count.</p>
          <div className="mt-6 flex items-center gap-2 text-xs text-teal-100"><BookOpen className="h-4 w-4" /> Built around your academic material</div>
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
          <p className="text-2xl font-bold text-zinc-900 mt-2">{overview?.available_topics ?? 0}</p>
          <p className="text-[11px] text-zinc-400 mt-0.5">Sequential learning modules</p>
        </Card>

        <Card className="metric-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500">Topics Practiced</span>
            <Target className="w-4 h-4 text-teal-600" />
          </div>
          <p className="text-2xl font-bold text-zinc-900 mt-2">{statesError ? '—' : recordedStates.length}</p>
          <p className="text-[11px] text-zinc-400 mt-0.5">Topics with recorded attempts</p>
        </Card>

        <Card className="metric-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500">Average Mastery</span>
            <Award className="w-4 h-4 text-zinc-400" />
          </div>
          <p className="text-2xl font-bold text-zinc-900 mt-2">{statesError || averageMastery === null ? '—' : `${averageMastery.toFixed(0)}%`}</p>
          <p className="text-[11px] text-zinc-400 mt-0.5">Practice indicator · assessed topics</p>
        </Card>
      </div>

      {recommendation && activeTab === 'curriculum' && <section className="next-step">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-widest text-teal-700">Suggested next step</p>
          <h2 className="mt-2 text-lg font-semibold text-slate-900">{recommendation.topic.name}</h2>
          <p className="mt-1 text-sm text-slate-600">{recommendation.reason}</p>
        </div>
        <button className="study-button shrink-0" onClick={() => handleStartTutorOnTopic(recommendation.topic)}>Start learning <ArrowRight className="h-4 w-4" /></button>
      </section>}
      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-zinc-200">
        <button
          aria-pressed={activeTab === 'curriculum'}
          onClick={() => { setActiveTab('curriculum'); void fetchStates(); }}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold border-b-2 transition-colors -mb-px ${
            activeTab === 'curriculum'
              ? 'border-zinc-900 text-zinc-900'
              : 'border-transparent text-zinc-500 hover:text-zinc-800'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          Course Curriculum
        </button>
        <button
          aria-pressed={activeTab === 'tutor'}
          onClick={() => setActiveTab('tutor')}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold border-b-2 transition-colors -mb-px ${
            activeTab === 'tutor'
              ? 'border-zinc-900 text-zinc-900'
              : 'border-transparent text-zinc-500 hover:text-zinc-800'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          Interactive Tutor
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'curriculum' ? (
        /* Course & Topics Explorer */
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
                  onClick={() => { setSelectedSubject(sub); setQuery(''); setFilter('all'); setActiveTopicForTutor(undefined); }}
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
            <div className="flex items-center justify-between pb-2 border-b border-zinc-100">
              <div>
                <h2 className="text-base font-semibold text-zinc-900">
                  {selectedSubject?.name || 'Course Topics'} Curriculum
                </h2>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Institutional topic sequence grounded in academic course syllabus
                </p>
              </div>
              <span className="text-xs font-medium px-2.5 py-1 rounded border border-zinc-200 bg-zinc-50 text-zinc-700">
                {selectedSubject?.topics?.length || 0} Topics Registered
              </span>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <label className="flex-1"><span className="sr-only">Search course topics</span><input type="search" className="field" placeholder="Search topics, modules, or concepts…" value={query} onChange={event => setQuery(event.target.value)} /></label>
              <label><span className="sr-only">Filter topics by progress</span><select className="field" value={filter} disabled={statesError} onChange={event => setFilter(event.target.value as TopicFilter)}>
                <option value="all">All progress</option><option value="review">Needs review</option><option value="new">Not started</option><option value="mastered">Mastered</option>
              </select></label>
            </div>
            <p role="status" className="text-xs text-slate-500">{visibleTopics.length} of {topics.length} topics</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {visibleTopics.length > 0 ? (
                visibleTopics.map((t, idx) => {
                  const state = statesError ? undefined : learningStates[t.id];
                  const mastery = state?.mastery_score || 0;
                  const status = state?.status || 'NOT_STARTED';

                  return (
                    <div
                      key={t.id || idx}
                      className="topic-card bg-white p-5 rounded-xl border border-slate-200 hover:shadow-md hover:border-blue-300 transition-all flex flex-col justify-between group"
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
                                    : status === 'STRUGGLING'
                                    ? 'warning'
                                    : 'default'
                                }
                                size="sm"
                              >
                                {status}
                              </Badge>

                            )}
                          </div>
                        </div>
                        <h4 className="font-semibold text-slate-900 text-sm mb-1">{t.name}</h4>
                        <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed mb-3">
                          {t.description || 'Core academic topic for adaptive mastery assessment.'}
                        </p>

                        {/* Mastery Progress Bar */}
                        <div className="space-y-1 mb-2 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-slate-500 font-medium">Topic Mastery:</span>
                            <span className="font-bold text-slate-800">{statesError ? 'Unavailable' : `${mastery.toFixed(1)}%`}</span>
                          </div>
                          <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                            <div
                              className="bg-blue-600 h-full rounded-full transition-all"
                              style={{ width: `${statesError ? 0 : Math.max(0, Math.min(100, mastery))}%` }}
                            />
                          </div>
                          {state && state.attempts > 0 && (
                            <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5">
                              <span>{state.attempts} attempts</span>
                              <span>{state.correct_answers} correct</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="mt-2 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                        <button
                          onClick={() => setAssessmentTopic(t)}
                          className="inline-flex items-center gap-1 text-slate-600 hover:text-blue-600 font-medium"
                        >
                          <Award className="w-3.5 h-3.5 text-blue-500" /> Mastery Check
                        </button>
                        <button
                          onClick={() => handleStartTutorOnTopic(t)}
                          className="inline-flex items-center gap-1 text-blue-600 font-semibold group-hover:text-blue-700 hover:underline"
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
      ) : (
        /* AI Tutor View */
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
          onClose={() => setAssessmentTopic(null)}
          onAssessmentCompleted={() => fetchStates()}
        />
      )}
    </div>
  );
};


