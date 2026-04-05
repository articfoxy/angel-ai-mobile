export interface User {
  id: string;
  email: string;
  name: string | null;
  preferences?: Record<string, unknown> | null;
  createdAt: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface Mode {
  modeId: string;
  name: string;
  icon: string;
  description?: string;
  systemPrompt?: string;
  whisperTypes?: string[];
  postSessionOutputs?: string[];
  maxWhispersPerMinute?: number;
  isDefault?: boolean;
  userSettings?: Record<string, unknown>;
}

export interface Session {
  id: string;
  userId?: string;
  title?: string | null;
  mode: string;
  modeId: string;
  isLive?: boolean;
  status: string;
  startedAt: string;
  endedAt?: string | null;
  transcript?: unknown;
  summary?: unknown;
  participants?: unknown;
  keyFacts?: unknown;
  promises?: unknown;
  actionItems?: unknown;
  risks?: unknown;
  createdAt: string;
  updatedAt?: string;
  whisperCards?: WhisperCardData[];
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
  sessionId?: string;
  userId?: string;
  type: string;
  content: string;
  detail?: string | null;
  confidence?: number;
  priority?: string;
  sourceMemoryId?: string | null;
  sourceSessionId?: string | null;
  ttl?: number | null;
  requiresAck?: boolean;
  status?: string;
  deliveredAt?: string;
  acknowledgedAt?: string | null;
  createdAt?: string;
}

export interface Memory {
  id: string;
  userId?: string;
  type: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, unknown> | null;
  importance?: number;
  accessCount?: number;
  lastAccessed?: string | null;
  sessionId?: string | null;
}

export interface MemoryStats {
  total: number;
  totalPeople: number;
  totalProjects: number;
  totalCommitments: number;
  totalConcepts: number;
  totalCompanies: number;
}

export interface DashboardStatsResponse {
  streak: StreakResponse;
  memoryStats: MemoryStats;
  totalSessions: number;
  modeUsage: Record<string, number>;
}

export interface StreakResponse {
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string | null;
  totalSessions: number;
  totalSaves: number;
}

export interface SessionsListResponse {
  sessions: Session[];
  total: number;
}

export interface Digest {
  id: string;
  userId?: string;
  date: string;
  content: unknown;
  opened?: boolean;
  createdAt: string;
}

export interface Preferences {
  whisperFrequency: string;
  digestTime: string;
  digestEnabled: boolean;
  defaultMode: string;
  timezone: string;
}

export interface Debrief {
  sessionId: string;
  summary: unknown;
  memoriesExtracted?: number;
  savesDetected?: number;
}
