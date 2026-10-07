export type UserRole = 'STUDENT' | 'FACULTY' | 'ADMIN';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department?: string | null;
  created_at: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface Topic {
  id: string;
  subject_id: string;
  module: string;
  name: string;
  description?: string | null;
  difficulty: string;
}

export interface Subject {
  id: string;
  name: string;
  code: string;
  faculty_id?: string | null;
  created_at: string;
  topics: Topic[];
}

export interface StudentOverview {
  user: User;
  available_subjects: number;
  available_topics: number;
  active_learning_streak: number;
  status: string;
  message: string;
}

export interface FacultyOverview {
  user: User;
  managed_subjects: number;
  total_subjects: number;
  total_topics: number;
  total_students: number;
  message: string;
}

export interface AdminOverview {
  user: User;
  total_users: number;
  students: number;
  faculty: number;
  admins: number;
  subjects: number;
  topics: number;
  system_status: string;
}

export interface DocumentItem {
  id: string;
  subject_id: string;
  topic_id?: string | null;
  filename: string;
  file_type: string;
  file_size?: number | null;
  chunk_count: number;
  uploaded_by?: string | null;
  uploaded_at: string;
}

export interface RAGSearchResult {
  content: string;
  document_name: string;
  page_number: number;
  section: string;
  similarity_score: number;
}

export interface RAGSearchResponse {
  query: string;
  results: RAGSearchResult[];
}

export interface TutorSource {
  document: string;
  page: number;
  section: string;
  snippet: string;
  similarity_score: number;
}

export interface TutorChatResponse {
  response: string;
  action: string;
  strategy_label: string;
  grounded: boolean;
  grounding_status: string;
  sources: TutorSource[];
  session_id: string;
  subject_id: string;
  topic_id?: string | null;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  sender: 'student' | 'tutor';
  text: string;
  action?: string;
  strategyLabel?: string;
  grounded?: boolean;
  groundingStatus?: string;
  sources?: TutorSource[];
  timestamp: string;
}

export interface LearningState {
  id: string;
  student_id: string;
  topic_id: string;
  topic_name?: string | null;
  subject_id?: string | null;
  mastery_score: number;
  confidence_score: number;
  attempts: number;
  correct_answers: number;
  incorrect_answers: number;
  misconceptions: string[];
  difficulty_level: string;
  status: string;
  updated_at: string;
}


export interface GeneratedQuestion {
  question_id: string;
  topic_id: string;
  topic_name: string;
  question_text: string;
  question_type: string;
  difficulty: string;
  options?: string[] | null;
  hint?: string | null;
}

export interface AssessmentSubmitResponse {
  assessment_id: string;
  is_correct: boolean;
  score: number;
  feedback: string;
  identified_misconception?: string | null;
  previous_mastery: number;
  updated_mastery: number;
  status: string;
  attempts: number;
  correct_answers: number;
  incorrect_answers: number;
}

export interface ClassOverview {
  total_students: number;
  active_students: number;
  average_mastery: number;
  students_struggling: number;
  students_mastered: number;
  topics_requiring_attention: {
    topic_id: string;
    topic_name: string;
    module: string;
    average_mastery: number;
    students_struggling: number;
  }[];
}

export interface TopicAnalyticsItem {
  topic_id: string;
  topic_name: string;
  module: string;
  difficulty: string;
  subject_id: string;
  subject_name: string;
  average_mastery: number;
  students_struggling: number;
  students_mastered: number;
  total_attempts: number;
  average_attempts: number;
}

export interface StudentAnalyticsSummary {
  student_id: string;
  student_name: string;
  student_email: string;
  department: string;
  overall_mastery: number;
  total_attempts: number;
  total_correct: number;
  total_incorrect: number;
  misconceptions: string[];
  status: string;
  requires_intervention: boolean;
}

export interface InterventionItem {
  id: string;
  student_id: string;
  student_name: string;
  student_email: string;
  topic_id: string;
  topic_name: string;
  subject_id: string;
  subject_name: string;
  reason: string;
  recommended_action: string;
  status: 'PENDING' | 'REVIEWED' | 'STUDENT_CONTACTED' | 'MATERIAL_PROVIDED' | 'FOLLOW_UP_REQUIRED' | 'RESOLVED';
  notes?: string | null;
  created_at: string;
  updated_at: string;
}



