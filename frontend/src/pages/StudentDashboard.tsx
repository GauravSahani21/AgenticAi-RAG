import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { dashboardService, curriculumService, assessmentService } from '../services/api';
import type { StudentOverview, Subject, Topic, LearningState } from '../types';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { TutorChat } from '../components/TutorChat';
import { AssessmentModal } from '../components/AssessmentModal';
import { 
  BookOpen, 
  Flame, 
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

  const fetchStates = async () => {
    try {
      const states = await assessmentService.getAllStates();
      const map: { [topicId: string]: LearningState } = {};
      states.forEach((s) => {
        map[s.topic_id] = s;
      });
      setLearningStates(map);
    } catch (err) {
      console.error('Failed to load learning states:', err);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
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
        console.error('Failed to load student dashboard:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);


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
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Professional Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-zinc-900">
              Student Workspace
            </h1>
            <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-700 border border-zinc-200">
              Active Cohort
            </span>
          </div>
          <p className="mt-1 text-xs text-zinc-500">
            {overview?.message || `Enrolled as ${user?.name} (${user?.department || 'Computer Science'})`}
          </p>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="p-4 border border-zinc-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500">Enrolled Courses</span>
            <BookOpen className="w-4 h-4 text-zinc-400" />
          </div>
          <p className="text-2xl font-bold text-zinc-900 mt-2">{overview?.available_subjects || subjects.length}</p>
          <p className="text-[11px] text-zinc-400 mt-0.5">Faculty-approved syllabi</p>
        </Card>

        <Card className="p-4 border border-zinc-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500">Curriculum Topics</span>
            <Layers className="w-4 h-4 text-zinc-400" />
          </div>
          <p className="text-2xl font-bold text-zinc-900 mt-2">{overview?.available_topics || 0}</p>
          <p className="text-[11px] text-zinc-400 mt-0.5">Sequential learning modules</p>
        </Card>

        <Card className="p-4 border border-zinc-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500">Study Streak</span>
            <Flame className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-bold text-zinc-900 mt-2">{overview?.active_learning_streak || 1} Days</p>
          <p className="text-[11px] text-zinc-400 mt-0.5">Consecutive active sessions</p>
        </Card>

        <Card className="p-4 border border-zinc-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500">Target Mastery</span>
            <Award className="w-4 h-4 text-zinc-400" />
          </div>
          <p className="text-2xl font-bold text-zinc-900 mt-2">80%</p>
          <p className="text-[11px] text-zinc-400 mt-0.5">Class benchmark threshold</p>
        </Card>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-zinc-200">
        <button
          onClick={() => setActiveTab('curriculum')}
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
                <div
                  key={sub.id}
                  onClick={() => setSelectedSubject(sub)}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
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
                  <h3 className="mt-1.5 font-medium text-zinc-900 text-xs truncate">{sub.name}</h3>
                </div>
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

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {selectedSubject?.topics && selectedSubject.topics.length > 0 ? (
                selectedSubject.topics.map((t, idx) => {
                  const state = learningStates[t.id];
                  const mastery = state?.mastery_score || 0;
                  const status = state?.status || 'NOT_STARTED';

                  return (
                    <div
                      key={t.id || idx}
                      className="bg-white p-4 rounded-xl border border-slate-200 hover:shadow-md hover:border-blue-300 transition-all flex flex-col justify-between group"
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
                            <span className="font-bold text-slate-800">{mastery.toFixed(1)}%</span>
                          </div>
                          <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                            <div
                              className="bg-blue-600 h-full rounded-full transition-all"
                              style={{ width: `${Math.min(100, mastery)}%` }}
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
                  No topics configured for this course yet.
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


