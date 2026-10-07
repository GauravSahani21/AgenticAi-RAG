import axios from 'axios';
import type { AuthResponse, User, Subject, Topic, StudentOverview, FacultyOverview, AdminOverview } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      const isAuthRequest = error.config.url?.includes('/api/auth/login') || error.config.url?.includes('/api/auth/register');
      if (!isAuthRequest) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export const authService = {
  login: async (email: string, password: string): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/api/auth/login', { email, password });
    return response.data;
  },

  register: async (data: {
    name: string;
    email: string;
    password: string;
    role: string;
    department?: string;
  }): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/api/auth/register', data);
    return response.data;
  },

  getMe: async (): Promise<User> => {
    const response = await api.get<User>('/api/auth/me');
    return response.data;
  },
};

export const dashboardService = {
  getStudentOverview: async (): Promise<StudentOverview> => {
    const response = await api.get<StudentOverview>('/api/student/overview');
    return response.data;
  },

  getFacultyOverview: async (): Promise<FacultyOverview> => {
    const response = await api.get<FacultyOverview>('/api/faculty/overview');
    return response.data;
  },

  getAdminOverview: async (): Promise<AdminOverview> => {
    const response = await api.get<AdminOverview>('/api/admin/overview');
    return response.data;
  },

  getAdminUsers: async (): Promise<User[]> => {
    const response = await api.get<User[]>('/api/admin/users');
    return response.data;
  },
};

export const curriculumService = {
  getSubjects: async (): Promise<Subject[]> => {
    const response = await api.get<Subject[]>('/api/subjects');
    return response.data;
  },

  getTopics: async (subjectId?: string): Promise<Topic[]> => {
    const response = await api.get<Topic[]>('/api/topics', {
      params: subjectId ? { subject_id: subjectId } : undefined,
    });
    return response.data;
  },

  createSubject: async (name: string, code: string): Promise<Subject> => {
    const response = await api.post<Subject>('/api/subjects', { name, code });
    return response.data;
  },

  createTopic: async (data: {
    subject_id: string;
    module: string;
    name: string;
    description?: string;
    difficulty: string;
  }): Promise<Topic> => {
    const response = await api.post<Topic>('/api/topics', data);
    return response.data;
  },
};

import type { DocumentItem, RAGSearchResponse } from '../types';

export const documentService = {
  uploadDocument: async (formData: FormData): Promise<DocumentItem> => {
    const response = await api.post<DocumentItem>('/api/documents/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  getDocuments: async (subjectId?: string, topicId?: string): Promise<DocumentItem[]> => {
    const response = await api.get<DocumentItem[]>('/api/documents', {
      params: {
        ...(subjectId ? { subject_id: subjectId } : {}),
        ...(topicId ? { topic_id: topicId } : {}),
      },
    });
    return response.data;
  },

  deleteDocument: async (id: string): Promise<{ message: string }> => {
    const response = await api.delete<{ message: string }>(`/api/documents/${id}`);
    return response.data;
  },
};

export const ragService = {
  search: async (
    query: string,
    subjectId?: string,
    topicId?: string,
    topK: number = 4
  ): Promise<RAGSearchResponse> => {
    const response = await api.post<RAGSearchResponse>('/api/rag/search', {
      query,
      subject_id: subjectId || null,
      topic_id: topicId || null,
      top_k: topK,
    });
    return response.data;
  },
};

import type { TutorChatResponse } from '../types';

export const tutorService = {
  chat: async (data: {
    subject_id: string;
    topic_id?: string;
    session_id?: string;
    message: string;
    student_proficiency?: string;
  }): Promise<TutorChatResponse> => {
    const response = await api.post<TutorChatResponse>('/api/tutor/chat', data);
    return response.data;
  },


  getSessionHistory: async (sessionId: string) => {
    const response = await api.get(`/api/tutor/sessions/${sessionId}`);
    return response.data;
  },
};

import type { LearningState, GeneratedQuestion, AssessmentSubmitResponse } from '../types';

export const assessmentService = {
  getState: async (topicId: string): Promise<LearningState> => {
    const response = await api.get<LearningState>(`/api/assessment/state/${topicId}`);
    return response.data;
  },

  getAllStates: async (): Promise<LearningState[]> => {
    const response = await api.get<LearningState[]>('/api/assessment/states');
    return response.data;
  },

  generateQuestion: async (data: {
    topic_id: string;
    difficulty?: string;
    question_type?: string;
  }): Promise<GeneratedQuestion> => {
    const response = await api.post<GeneratedQuestion>('/api/assessment/generate', data);
    return response.data;
  },

  submitAssessment: async (data: {
    topic_id: string;
    question_text: string;
    question_type: string;
    difficulty: string;
    student_answer: string;
    session_id?: string;
  }): Promise<AssessmentSubmitResponse> => {
    const response = await api.post<AssessmentSubmitResponse>('/api/assessment/submit', data);
    return response.data;
  },
};

import type { 
  ClassOverview, 
  TopicAnalyticsItem, 
  StudentAnalyticsSummary, 
  InterventionItem 
} from '../types';

export const facultyAnalyticsService = {
  getClassOverview: async (): Promise<ClassOverview> => {
    const response = await api.get<ClassOverview>('/api/faculty/analytics/overview');
    return response.data;
  },

  getTopicAnalytics: async (): Promise<TopicAnalyticsItem[]> => {
    const response = await api.get<TopicAnalyticsItem[]>('/api/faculty/analytics/topics');
    return response.data;
  },

  getStudentAnalytics: async (): Promise<StudentAnalyticsSummary[]> => {
    const response = await api.get<StudentAnalyticsSummary[]>('/api/faculty/analytics/students');
    return response.data;
  },

  getInterventions: async (): Promise<InterventionItem[]> => {
    const response = await api.get<InterventionItem[]>('/api/faculty/interventions');
    return response.data;
  },

  updateInterventionStatus: async (
    interventionId: string,
    status: string,
    notes?: string
  ): Promise<InterventionItem> => {
    const response = await api.patch<InterventionItem>(
      `/api/faculty/interventions/${interventionId}/status`,
      { status, notes }
    );
    return response.data;
  },
};


