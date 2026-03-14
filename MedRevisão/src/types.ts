export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  createdAt: string;
}

export interface Subject {
  id: string;
  name: string;
  color: string;
  icon: string;
  createdAt: string;
}

export interface Topic {
  id: string;
  name: string;
  subjectId: string;
  lastReviewDate?: string;
  nextReviewDate?: string;
  interval: number;
  easinessFactor: number;
  repetitions: number;
  createdAt: string;
}

export interface StudySession {
  id: string;
  topicId: string;
  subjectId: string;
  date: string;
  questionsCount: number;
  correctCount: number;
  studyTimeMinutes: number;
}

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  start: string;
  end: string;
  googleEventId?: string;
}
