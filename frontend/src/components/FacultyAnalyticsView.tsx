import React, { useState, useEffect } from 'react';
import type { 
  ClassOverview, 
  TopicAnalyticsItem, 
  StudentAnalyticsSummary, 
  InterventionItem 
} from '../types';
import { facultyAnalyticsService } from '../services/api';
import { Card } from './Card';
import { Badge } from './Badge';
import { Button } from './Button';
import { InterventionModal } from './InterventionModal';
import { 
  Users, 
  Award, 
  AlertTriangle, 
  TrendingDown, 
  BookOpen, 
  CheckCircle2, 
  ChevronRight, 
  RotateCw
} from 'lucide-react';


export const FacultyAnalyticsView: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'topics' | 'students' | 'interventions'>('interventions');
  const [overview, setOverview] = useState<ClassOverview | null>(null);
  const [topics, setTopics] = useState<TopicAnalyticsItem[]>([]);
  const [students, setStudents] = useState<StudentAnalyticsSummary[]>([]);
  const [interventions, setInterventions] = useState<InterventionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIntervention, setSelectedIntervention] = useState<InterventionItem | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [ovData, topicsData, studentsData, interventionsData] = await Promise.all([
        facultyAnalyticsService.getClassOverview(),
        facultyAnalyticsService.getTopicAnalytics(),
        facultyAnalyticsService.getStudentAnalytics(),
        facultyAnalyticsService.getInterventions(),
      ]);
      setOverview(ovData);
      setTopics(topicsData);
      setStudents(studentsData);
      setInterventions(interventionsData);
    } catch (err) {
      console.error('Failed to load analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'RESOLVED':
        return <Badge variant="success" size="sm">RESOLVED</Badge>;
      case 'STUDENT_CONTACTED':
      case 'MATERIAL_PROVIDED':
        return <Badge variant="info" size="sm">{status.replace(/_/g, ' ')}</Badge>;
      case 'REVIEWED':
      case 'FOLLOW_UP_REQUIRED':
        return <Badge variant="warning" size="sm">{status.replace(/_/g, ' ')}</Badge>;
      default:
        return <Badge variant="warning" size="sm">PENDING</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Sub Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveSubTab('interventions')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-lg transition-colors ${
              activeSubTab === 'interventions'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            Intervention Center ({interventions.length})
          </button>
          <button
            onClick={() => setActiveSubTab('overview')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-lg transition-colors ${
              activeSubTab === 'overview'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            Class KPIs
          </button>
          <button
            onClick={() => setActiveSubTab('topics')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-lg transition-colors ${
              activeSubTab === 'topics'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            Topic Analytics ({topics.length})
          </button>
          <button
            onClick={() => setActiveSubTab('students')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-lg transition-colors ${
              activeSubTab === 'students'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            Student Cohort ({students.length})
          </button>
        </div>

        <Button variant="outline" size="sm" onClick={fetchData} className="text-xs">
          <RotateCw className="w-3.5 h-3.5 mr-1" /> Refresh Engine
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <RotateCw className="w-7 h-7 animate-spin text-indigo-600" />
        </div>
      ) : (
        <>
          {/* TAB 1: INTERVENTION CENTER */}
          {activeSubTab === 'interventions' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200/80 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-amber-900 space-y-1">
                  <p className="font-bold">Automated Early Intervention Engine Active</p>
                  <p className="leading-relaxed">
                    Flags students with low mastery (&lt; 50%), repeated attempts (&ge; 3), or persistent misconceptions. All alerts are grounded in actual stored telemetry data.
                  </p>
                </div>
              </div>

              {interventions.length === 0 ? (
                <div className="p-12 text-center bg-white rounded-xl border border-dashed border-slate-300 text-slate-500 text-xs">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                  No students currently require academic intervention. Cohort mastery is on track!
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {interventions.map((inv) => (
                    <div
                      key={inv.id}
                      className="bg-white p-5 rounded-xl border border-slate-200 hover:border-amber-300 shadow-xs transition-all space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-slate-900 text-sm">{inv.student_name}</h4>
                            <span className="text-xs text-slate-400">({inv.student_email})</span>
                          </div>
                          <span className="text-xs font-semibold text-indigo-600">
                            Struggling Topic: {inv.topic_name} ({inv.subject_name})
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(inv.status)}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedIntervention(inv)}
                            className="text-xs font-semibold text-slate-700"
                          >
                            Update Status <ChevronRight className="w-3.5 h-3.5 ml-1" />
                          </Button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                        <div className="p-3 rounded-lg bg-rose-50/60 border border-rose-100 text-rose-900">
                          <span className="font-bold block mb-1">Why Flagged (Data Rationale):</span>
                          <p className="leading-relaxed">{inv.reason}</p>
                        </div>
                        <div className="p-3 rounded-lg bg-indigo-50/60 border border-indigo-100 text-indigo-900">
                          <span className="font-bold block mb-1">Recommended Pedagogical Action:</span>
                          <p className="leading-relaxed">{inv.recommended_action}</p>
                        </div>
                      </div>

                      {inv.notes && (
                        <div className="text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                          <strong>Faculty Follow-up Log:</strong> {inv.notes}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: OVERVIEW */}
          {activeSubTab === 'overview' && overview && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="flex items-center gap-4 border-l-4 border-l-blue-600">
                  <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                    <Users className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase">Total Students</p>
                    <p className="text-2xl font-bold text-slate-800">{overview.total_students}</p>
                  </div>
                </Card>

                <Card className="flex items-center gap-4 border-l-4 border-l-indigo-600">
                  <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                    <Award className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase">Average Mastery</p>
                    <p className="text-2xl font-bold text-slate-800">{overview.average_mastery.toFixed(1)}%</p>
                  </div>
                </Card>

                <Card className="flex items-center gap-4 border-l-4 border-l-amber-500">
                  <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase">Struggling (&lt;50%)</p>
                    <p className="text-2xl font-bold text-slate-800">{overview.students_struggling}</p>
                  </div>
                </Card>

                <Card className="flex items-center gap-4 border-l-4 border-l-emerald-500">
                  <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase">Mastered (&ge;80%)</p>
                    <p className="text-2xl font-bold text-slate-800">{overview.students_mastered}</p>
                  </div>
                </Card>
              </div>

              {/* Topics Requiring Attention */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-3">
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <TrendingDown className="w-4 h-4 text-rose-500" /> Topics Requiring Attention
                </h3>
                {overview.topics_requiring_attention.length === 0 ? (
                  <p className="text-xs text-slate-500">All curriculum topics exhibit satisfactory comprehension.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {overview.topics_requiring_attention.map((t) => (
                      <div key={t.topic_id} className="p-3 rounded-lg border border-rose-100 bg-rose-50/40 text-xs space-y-1">
                        <span className="font-bold text-slate-900 block">{t.topic_name}</span>
                        <div className="flex justify-between text-slate-600">
                          <span>Avg Mastery: <strong className="text-rose-600">{t.average_mastery}%</strong></span>
                          <span>Struggles: <strong>{t.students_struggling}</strong></span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: TOPIC ANALYTICS */}
          {activeSubTab === 'topics' && (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50 text-slate-500 uppercase border-b border-slate-200 font-semibold">
                    <tr>
                      <th className="px-5 py-3">Topic & Module</th>
                      <th className="px-5 py-3">Difficulty</th>
                      <th className="px-5 py-3">Average Mastery</th>
                      <th className="px-5 py-3">Struggling</th>
                      <th className="px-5 py-3">Mastered</th>
                      <th className="px-5 py-3">Avg Attempts</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {topics.map((top) => (
                      <tr key={top.topic_id} className="hover:bg-slate-50/70">
                        <td className="px-5 py-3.5">
                          <span className="font-bold text-slate-900 block">{top.topic_name}</span>
                          <span className="text-[11px] text-slate-400">{top.module} • {top.subject_name}</span>
                        </td>
                        <td className="px-5 py-3.5">
                          <Badge size="sm">{top.difficulty}</Badge>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-800">{top.average_mastery.toFixed(1)}%</span>
                            <div className="w-16 bg-slate-200 h-1.5 rounded-full overflow-hidden">
                              <div
                                className="bg-blue-600 h-full rounded-full"
                                style={{ width: `${top.average_mastery}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={top.students_struggling > 0 ? 'text-rose-600 font-bold' : 'text-slate-500'}>
                            {top.students_struggling}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="text-emerald-600 font-bold">{top.students_mastered}</span>
                        </td>
                        <td className="px-5 py-3.5 font-medium">{top.average_attempts.toFixed(1)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: STUDENT COHORT */}
          {activeSubTab === 'students' && (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50 text-slate-500 uppercase border-b border-slate-200 font-semibold">
                    <tr>
                      <th className="px-5 py-3">Student Name</th>
                      <th className="px-5 py-3">Department</th>
                      <th className="px-5 py-3">Overall Mastery</th>
                      <th className="px-5 py-3">Attempts (Correct/Incorrect)</th>
                      <th className="px-5 py-3">Identified Misconceptions</th>
                      <th className="px-5 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {students.map((st) => (
                      <tr key={st.student_id} className="hover:bg-slate-50/70">
                        <td className="px-5 py-3.5">
                          <span className="font-bold text-slate-900 block">{st.student_name}</span>
                          <span className="text-[11px] text-slate-400">{st.student_email}</span>
                        </td>
                        <td className="px-5 py-3.5">{st.department}</td>
                        <td className="px-5 py-3.5 font-bold text-slate-800">{st.overall_mastery.toFixed(1)}%</td>
                        <td className="px-5 py-3.5">
                          {st.total_attempts} (<span className="text-emerald-600">{st.total_correct}</span> / <span className="text-rose-600">{st.total_incorrect}</span>)
                        </td>
                        <td className="px-5 py-3.5 max-w-xs">
                          {st.misconceptions.length === 0 ? (
                            <span className="text-slate-400">None detected</span>
                          ) : (
                            <div className="space-y-0.5">
                              {st.misconceptions.map((m, idx) => (
                                <span key={idx} className="block text-[11px] text-amber-700 bg-amber-50 p-1 rounded border border-amber-100 truncate">
                                  {m}
                                </span>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="px-5 py-3.5">
                          <Badge
                            variant={
                              st.requires_intervention
                                ? 'warning'
                                : st.status === 'MASTERED'
                                ? 'success'
                                : 'default'
                            }
                            size="sm"
                          >
                            {st.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Intervention Modal */}
      {selectedIntervention && (
        <InterventionModal
          intervention={selectedIntervention}
          isOpen={!!selectedIntervention}
          onClose={() => setSelectedIntervention(null)}
          onUpdated={() => fetchData()}
        />
      )}
    </div>
  );
};
