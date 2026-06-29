export type Role = "admin" | "user";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  streakCount: number;
  streakFreezes: number;
}

export interface Task {
  id: string;
  userId?: string;
  title: string;
  description?: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  priority: "high" | "medium" | "low";
  isOptional: boolean;
  status: "pending" | "completed" | "skipped";
  completionNotes?: string;
  createdAt: string;
}

export interface WeeklyStats {
  totalTasks: number;
  completed: number;
  pending: number;
  skipped: number;
  completionPct: number;
}
export interface BaseUser{
  email: string;
  first_name: string;
  last_name: string;
  role: Role;
}
export interface AuthSession {
  role: string;
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: BaseUser;
}

export interface ApiResponse<T> {
  status: string;
  message: string;
  data: T;
}

export interface Motivation {
  id: string;
  title: string;
  content: string;
  is_active: boolean;
  created_at: string;
}

export interface UserStreak {
  id: string;
  user_id: string;
  current_streak: number;
  longest_streak: number;
  available_freezes: number;
  last_completed_date: string | null;
  last_rewarded_streak: number;
  updated_at: string;
}

export interface Reward {
  id: string;
  user_id: string | null;
  title: string;
  description: string | null;
  is_favorite: boolean;
  is_generic: boolean;
  created_at: string;
  updated_at: string;
}

export interface StreakDayStatus {
  date: string;
  status: "completed" | "freezed" | "missed" | "empty";
}

export interface StreakRule {
  id: string;
  name: string;
  required_consecutive_days: number;
  freezes_to_grant: number;
  max_freezes_allowed: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatQuery {
  message: string;
  chat_history?: ChatMessage[];
}

export interface ChatReply {
  reply: string;
}