export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}

export interface AuthResponse {
  token: string;
  refreshToken?: string;
  user: User;
}

export interface Mode {
  id: string;
  name: string;
  description: string;
  icon: string;
  slug: string;
}

export interface Session {
  id: string;
  modeId: string;
  modeName?: string;
  status: 'active' | 'completed' | 'cancelled';
  startedAt: string;
  endedAt?: string;
  duration?: number;
  transcript?: TranscriptSegment[];
  summary?: string;
}

export interface TranscriptSegment {
  id: string;
  text: string;
  speaker?: string;
  timestamp: number;
  isFinal: boolean;
}

export interface WhisperCardData {
  id: string;
  type: 'suggestion' | 'insight' | 'action' | 'warning' | 'info';
  content: string;
  detail?: string;
  timestamp: number;
}

export interface Memory {
  id: string;
  type: 'person' | 'project' | 'commitment' | 'concept' | 'company';
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, unknown>;
}

export interface MemoryStats {
  total: number;
  byType: Record<string, number>;
}

export interface DashboardStats {
  totalSessions: number;
  totalMemories: number;
  totalSaves: number;
  streak: number;
  weeklyGrowth?: number;
}

export interface EngagementStreak {
  current: number;
  longest: number;
  lastActiveDate: string;
}

export interface Digest {
  id: string;
  date: string;
  content: string;
  sections?: DigestSection[];
  createdAt: string;
}

export interface DigestSection {
  title: string;
  content: string;
  type: string;
}

export interface Preferences {
  notifications: boolean;
  defaultMode?: string;
  audioQuality: 'low' | 'medium' | 'high';
}

export interface Debrief {
  sessionId: string;
  summary: string;
  highlights: string[];
  actionItems: string[];
  duration: number;
  memoriesCreated: number;
}
