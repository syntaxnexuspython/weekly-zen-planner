export type Role = "admin" | "user";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  streakCount: number;
  streakFreezes: number;
}

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

export type RecurrencePattern = "none" | "daily" | "weekly" | "biweekly" | "monthly";

export interface TaskAttachment {
  id: string;
  type: "image" | "link";
  url: string;
  name?: string;
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
  status: "pending" | "completed" | "skipped" | "cancelled";
  completionNotes?: string;
  completedDate?: string;
  createdAt: string;
  subtasks?: Subtask[];
  recurrence?: RecurrencePattern;
  specializedTitle?: string;
  recurrenceEndDate?: string;
  weeklyDays?: number[];
  monthlyDay?: number;
  attachments?: TaskAttachment[];
  calendarEventId?: string;
  isSyncedToCalendar?: boolean;
}

export interface WeeklyStats {
  totalTasks: number;
  completed: number;
  pending: number;
  skipped: number;
  cancelled: number;
  completionPct: number;
}
export interface BaseUser{
  email: string;
  first_name: string;
  last_name: string;
  role: Role;
  google_id?: string | null;
  allow_password_login?: boolean;
  has_password?: boolean;
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

export type FeedbackType = "contact" | "report" | "suggestion" | "appreciation" | "feedback";

export type FeedbackStatus = "pending" | "in_progress" | "resolved" | "acknowledged";

export interface Feedback {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  type: FeedbackType;
  title: string;
  content: string;
  status: FeedbackStatus;
  admin_notes: string | null;
  is_critical?: boolean;
  severity?: 'critical' | 'high' | 'medium' | 'low';
  sentiment?: 'positive' | 'neutral' | 'negative' | 'critical';
  ai_analysis?: string | null;
  ai_reply?: string | null;
  ai_suggested_solution?: string | null;
  admin_solution?: string | null;
  resolved_at?: string | null;
  createdAt: string;
  updatedAt?: string | null;
}

export interface FeedbackStats {
  total: number;
  pending: number;
  in_progress: number;
  resolved: number;
  critical_unresolved: number;
  positive_count: number;
  critical_count: number;
}

export interface FeedbackAIProviderStatus {
  current_provider: string;
  available_providers: Array<{ id: string; name: string; configured: boolean }>;
  groq_configured: boolean;
  gemini_configured: boolean;
}

export interface Announcement {
  id: string;
  title: string;
  description: string;
  bannerUrl?: string;
  isActive: boolean;
  createdAt: string;
}

export type NoteBlockType =
  | "paragraph"
  | "heading1"
  | "heading2"
  | "heading3"
  | "bullet"
  | "numbered"
  | "todo"
  | "callout"
  | "code"
  | "divider";

export interface NoteBlock {
  id: string;
  type: NoteBlockType;
  content: string;
  checked?: boolean; // For todo blocks
  language?: string; // For code blocks
}

export interface NoteCategory {
  id: string;
  name: string;
  color: string; // Tailwind color class or hex, e.g. "indigo", "emerald", "amber"
  icon: string; // Icon identifier e.g. "sparkles", "languages", "code", "briefcase", "brain", "lightbulb"
  description?: string;
  isDefault?: boolean;
}

export interface Note {
  id: string;
  user_id: string;
  title: string;
  blocks: NoteBlock[];
  entity_type?: string | null;
  entity_id?: string | null;
  category?: string | null;
  tags: string[];
  is_pinned: boolean;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface NoteCreatePayload {
  title?: string;
  blocks?: NoteBlock[];
  entity_type?: string | null;
  entity_id?: string | null;
  category?: string | null;
  tags?: string[];
  is_pinned?: boolean;
}

export interface NoteUpdatePayload {
  title?: string;
  blocks?: NoteBlock[];
  entity_type?: string | null;
  entity_id?: string | null;
  category?: string | null;
  tags?: string[];
  is_pinned?: boolean;
  is_archived?: boolean;
}

export interface GmailStatus {
  connected: boolean;
  email?: string | null;
  feature_enabled: boolean;
}

export interface ImportantEmailItem {
  id: string;
  sender: string;
  subject: string;
  snippet: string;
  body?: string;
  date: string;
  urgency: "high" | "medium" | "low";
  suggested_task_title: string;
  suggested_task_description: string;
  suggested_start_time: string;
  suggested_end_time: string;
}

export interface GmailMessageItem {
  id: string;
  sender: string;
  subject: string;
  snippet: string;
  body?: string;
  date: string;
  is_unread?: boolean;
  labels?: string[];
}

// ── Investigation Types ─────────────────────────────────────────────────────

export type InvestigationStatus =
  | "received"
  | "analysing"
  | "investigating"
  | "diagnosis_ready"
  | "awaiting_approval"
  | "resolved"
  | "failed"
  | "cancelled";

export interface ToolExecutionRecord {
  tool_name: string;
  input_summary: string;
  output_summary: string;
  executed_at: string;
  duration_ms: number;
  success: boolean;
  error?: string | null;
}

export interface InvestigationEvidence {
  source: string;
  finding: string;
  confidence: "low" | "medium" | "high";
  recorded_at: string;
}

export interface InvestigationDiagnosis {
  problem_summary: string;
  confirmed_facts: string[];
  hypotheses: string[];
  root_cause?: string | null;
  root_cause_confidence: string;
  root_cause_status: "confirmed" | "suspected" | "unknown";
}

export interface ResolutionProposal {
  recommended_solution: string;
  steps: string[];
  requires_human_review: boolean;
  proposed_at: string;
}

export interface Investigation {
  id: string;
  feedback_id: string;
  user_id: string;
  status: InvestigationStatus;
  provider: string;
  model: string;
  tool_executions: ToolExecutionRecord[];
  evidence: InvestigationEvidence[];
  diagnosis?: InvestigationDiagnosis | null;
  resolution_proposal?: ResolutionProposal | null;
  iteration_count: number;
  max_iterations: number;
  error_message?: string | null;
  started_at: string;
  completed_at?: string | null;
  updated_at: string;
}

export interface InvestigationSSEUpdate {
  status: InvestigationStatus;
  iteration_count: number;
  tool_executions_count: number;
  evidence_count: number;
  has_diagnosis: boolean;
  has_proposal: boolean;
  error_message?: string | null;
  last_tool?: {
    tool_name: string;
    success: boolean;
    output_summary: string;
  } | null;
}
