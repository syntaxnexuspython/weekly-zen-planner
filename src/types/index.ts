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
  userId: string;
  title: string;
  description?: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  priority: "high" | "medium" | "low";
  isOptional: boolean;
  status: "pending" | "completed" | "skipped";
  createdAt: string;
}

export interface WeeklyStats {
  totalTasks: number;
  completed: number;
  pending: number;
  skipped: number;
  completionPct: number;
}

export interface AuthSession {
  role: string;
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface ApiResponse<T> {
  status: string;
  message: string;
  data: T;

}