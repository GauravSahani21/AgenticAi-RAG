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
  Sparkles, 
  Layers, 
  BrainCircuit, 
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
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white rounded-2xl p-6 md:p-8 shadow-lg relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/20 text-blue-200 border border-blue-400/30 text-xs font-medium mb-3">
            <Sparkles className="w-3.5 h-3.5 text-blue-300" /> Adaptive Learning Portal Active
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
            Welcome back, {user?.name}!
          </h1>
          <p className="mt-2 text-sm text-slate-300 leading-relaxed">
            {overview?.message || 'Explore your registered course materials, learn with AI assistance, and track mastery progression.'}
          </p>
        </div>
        <div className="absolute right-6 -bottom-6 opacity-10 pointer-events-none hidden md:block">
          <BrainCircuit className="w-64 h-64 text-white" />
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="flex items-center gap-4 border-l-4 border-l-blue-500">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase">Available Courses</p>
            <p className="text-2xl font-bold text-slate-800">{overview?.available_subjects || subjects.length}</p>
          </div>
        </Card>

        <Card className="flex items-center gap-4 border-l-4 border-l-indigo-500">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase">Curriculum Topics</p>
            <p className="text-2xl font-bold text-slate-800">{overview?.available_topics || 0}</p>
          </div>
        </Card>

        <Card className="flex items-center gap-4 border-l-4 border-l-amber-500">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <Flame className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase">Study Streak</p>
            <p className="text-2xl font-bold text-slate-800">{overview?.active_learning_streak || 1} Days</p>
          </div>
        </Card>

        <Card className="flex items-center gap-4 border-l-4 border-l-emerald-500">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase">Target Mastery</p>
            <p className="text-2xl font-bold text-slate-800">80%</p>
          </div>
        </Card>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-1">
        <button
          onClick={() => setActiveTab('curriculum')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-lg transition-colors ${
            activeTab === 'curriculum'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          Course Curriculum
        </button>
        <button
          onClick={() => setActiveTab('tutor')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-lg transition-colors ${
            activeTab === 'tutor'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          Interactive AI Tutor
          <span className="bg-indigo-100 text-indigo-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full uppercase">
            RAG Grounded
          </span>
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'curriculum' ? (
        /* Course & Topics Explorer */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 space-y-4">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-blue-600" /> Academic Courses
            </h2>
            <div className="space-y-2">
              {subjects.map((sub) => (
                <div
                  key={sub.id}
                  onClick={() => setSelectedSubject(sub)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    selectedSubject?.id === sub.id
                      ? 'border-blue-600 bg-blue-50/50 shadow-sm'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                      {sub.code}
                    </span>
                    <span className="text-xs text-slate-500">{sub.topics?.length || 0} topics</span>
                  </div>
                  <h3 className="mt-2 font-bold text-slate-800 text-sm">{sub.name}</h3>
                </div>
              ))}
            </div>

            <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-100 text-xs text-indigo-900 space-y-2">
              <div className="font-bold flex items-center gap-1.5 text-indigo-950">
                <BrainCircuit className="w-4 h-4 text-indigo-600" />
                Adaptive Learning Architecture
              </div>
              <p className="text-indigo-700 leading-relaxed">
                Click any topic card to immediately engage the <strong>RAG-grounded AI Tutor</strong>, citing lecture slides, textbooks, and faculty notes.
              </p>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  {selectedSubject?.name || 'Course Topics'} Curriculum
                </h2>
                <p className="text-xs text-slate-500">
                  Institutional topic sequence grounded in academic course syllabus
                </p>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
                {selectedSubject?.topics?.length || 0} Topics Registered
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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


