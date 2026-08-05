import axios from "axios";
import type { ApiResponse, AuthSession, Task, User, WeeklyStats, Motivation, Reward, UserStreak, StreakDayStatus, StreakRule, ChatMessage, ChatReply, Feedback, FeedbackType, FeedbackStatus, Announcement, GmailStatus, ImportantEmailItem } from "@/types";
import { mockDb } from "./mock-db";

const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "http://localhost:8000",
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

// Helper to get session from localStorage
const getStoredSession = (): AuthSession | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("weekly_planner_session_v1");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") {
      // Support both wrapped ApiResponse<AuthSession> and raw AuthSession
      if ("status" in parsed && parsed.status === "success" && "data" in parsed) {
        return parsed.data;
      }
      return parsed;
    }
  } catch (e) {
    console.error("Failed to parse stored session", e);
  }
  return null;
};

let authToken = getStoredSession()?.access_token || "";

client.interceptors.request.use((config: any) => {
  const token = getStoredSession()?.access_token || authToken;
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Flag to track token refresh state
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (err: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token!);
    }
  });
  failedQueue = [];
};

client.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Check if the error is 401 and not already retried
    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      // If the failed request was the refresh request itself, redirect to login
      if (originalRequest.url === "/api/v1/auth/refresh") {
        localStorage.removeItem("weekly_planner_session_v1");
        authToken = "";
        if (typeof window !== "undefined") {
          window.location.href = "/login";
        }
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise<string>((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers = originalRequest.headers ?? {};
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return client(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const session = getStoredSession();
      const refreshToken = session?.refresh_token;

      if (!refreshToken) {
        localStorage.removeItem("weekly_planner_session_v1");
        authToken = "";
        if (typeof window !== "undefined") {
          window.location.href = "/login";
        }
        return Promise.reject(error);
      }

      try {
        const response = await client.post("/api/v1/auth/refresh", {
          refresh_token: refreshToken,
        });

        // The response format from the server is TokenResponse (same as AuthSession)
        // Handle both wrapped and unwrapped response formats
        const responseData = response.data;
        let newSession: AuthSession | null = null;

        if (responseData && typeof responseData === "object") {
          if ("status" in responseData && responseData.status === "success" && "data" in responseData) {
            newSession = responseData.data;
          } else {
            newSession = responseData as AuthSession;
          }
        }

        if (!newSession || !newSession.access_token) {
          throw new Error("Invalid token refresh response");
        }

        // Save new session in localStorage
        localStorage.setItem("weekly_planner_session_v1", JSON.stringify(newSession));
        authToken = newSession.access_token;

        processQueue(null, newSession.access_token);

        originalRequest.headers = originalRequest.headers ?? {};
        originalRequest.headers.Authorization = `Bearer ${newSession.access_token}`;
        return client(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        localStorage.removeItem("weekly_planner_session_v1");
        authToken = "";
        if (typeof window !== "undefined") {
          window.location.href = "/login";
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

const delay = (ms = 250) => new Promise((r) => setTimeout(r, ms));

export const api = {
  async login(email: string, password: string): Promise<ApiResponse<AuthSession>> {
    let response;

    try {
      response = await client.post("/api/v1/auth/login", {
        email,
        password,
      });
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message = (error.response?.data as { message?: string } | undefined)?.message;
        throw new Error(message || error.message);
      }

      throw error;
    }

    const payload = response.data as ApiResponse<AuthSession>;

    if (payload.status !== 'success') {
      throw new Error(payload.message || "Invalid credentials");
    }

    authToken = payload.data.access_token;
    return payload
  },

  async loginWithGoogle(credential: string): Promise<ApiResponse<AuthSession>> {
    let response;

    try {
      response = await client.post("/api/v1/auth/google", {
        credential,
      });
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message = (error.response?.data as { message?: string } | undefined)?.message;
        throw new Error(message || error.message);
      }

      throw error;
    }

    const payload = response.data as ApiResponse<AuthSession>;

    if (payload.status !== 'success') {
      throw new Error(payload.message || "Google Sign-In failed");
    }

    authToken = payload.data.access_token;
    return payload;
  },

  async verifyEmail(email: string, first_name: string): Promise<void> {
    let response;
    try {
      response = await client.post("/api/v1/auth/verify-email", {
        email,
        first_name,
      });
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message = (error.response?.data as { message?: string } | undefined)?.message;
        throw new Error(message || error.message);
      }
      throw error;
    }

    const payload = response.data as { status: string; message: string };
    if (payload.status !== "success") {
      throw new Error(payload.message || "Failed to send OTP");
    }
  },

  async verifyEmailOtp(email: string, otp: string): Promise<void> {
    let response;
    try {
      response = await client.post("/api/v1/auth/verify-email-otp", {
        email,
        otp,
      });
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message = (error.response?.data as { message?: string } | undefined)?.message;
        throw new Error(message || error.message);
      }
      throw error;
    }

    const payload = response.data as { status: string; message: string };
    if (payload.status !== "success") {
      throw new Error(payload.message || "Invalid OTP");
    }
  },

  async register(params: {
    email: string;
    password: string;
    first_name: string;
    last_name: string;
    otp: string;
    referral_code?: string;
  }): Promise<AuthSession> {
    let response;
    try {
      response = await client.post("/api/v1/auth/register", {
        ...params,
        role: "user",
      });
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message = (error.response?.data as { message?: string } | undefined)?.message;
        throw new Error(message || error.message);
      }
      throw error;
    }

    const payload = response.data as {
      status: string;
      message: string;
      data: {
        access_token: string;
        refresh_token: string;
        token_type: string;
        role: string;
      };
    };

    if (payload.status !== "success") {
      throw new Error(payload.message || "Registration failed");
    }

    authToken = payload.data.access_token;
    return payload.data as unknown as AuthSession;
  },

  async forgotPassword(email: string): Promise<void> {
  let response;
  try {
    response = await client.post("/api/v1/auth/forgot-password", {
      email,
    });
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const message = (error.response?.data as { message?: string } | undefined)?.message;
      throw new Error(message || error.message);
    }
    throw error;
  }
 
  const payload = response.data as { status: string; message: string };
  if (payload.status !== "success") {
    throw new Error(payload.message || "Failed to send reset link");
  }
},

  async getUser(id: string): Promise<User> {
    await delay(100);
    const db = mockDb.load();
    const u = db.users.find((x) => x.id === id);
    if (!u) throw new Error("User not found");
    return u;
  },

  async listUsers(): Promise<User[]> {
    let response;
    try {
      response = await client.get("/api/v1/user/admin/users");
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message = (error.response?.data as { message?: string } | undefined)?.message;
        throw new Error(message || error.message);
      }
      throw error;
    }
    const payload = response.data as ApiResponse<User[]>;
    if (payload.status !== "success") {
      throw new Error(payload.message || "Failed to fetch users");
    }
    return payload.data;
  },

  async listTasks(fromDate?: string, endDate?: string): Promise<Task[]> {
    let response;
    try {
      const params: Record<string, string> = {};
      if (fromDate) params.from_date = fromDate;
      if (endDate) params.end_date = endDate;
      response = await client.get("/api/v1/tasks", { params });
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message = (error.response?.data as { message?: string } | undefined)?.message;
        throw new Error(message || error.message);
      }
      throw error;
    }
    const payload = response.data as ApiResponse<Task[]>;
    if (payload.status !== "success") {
      throw new Error(payload.message || "Failed to fetch tasks");
    }
    return payload.data;
  },

  async listAllTasks(): Promise<Task[]> {
    let response;
    try {
      response = await client.get("/api/v1/tasks/admin/all");
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message = (error.response?.data as { message?: string } | undefined)?.message;
        throw new Error(message || error.message);
      }
      throw error;
    }
    const payload = response.data as ApiResponse<Task[]>;
    if (payload.status !== "success") {
      throw new Error(payload.message || "Failed to fetch all tasks");
    }
    return payload.data;
  },

  async createTask(task: Omit<Task, "id" | "createdAt">): Promise<Task> {
    let response;
    try {
      response = await client.post("/api/v1/tasks", task);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message = (error.response?.data as { message?: string } | undefined)?.message;
        throw new Error(message || error.message);
      }
      throw error;
    }
    const payload = response.data as ApiResponse<Task>;
    if (payload.status !== "success") {
      throw new Error(payload.message || "Failed to create task");
    }
    return payload.data;
  },

  async updateTask(id: string, patch: Partial<Task>): Promise<Task> {
    let response;
    try {
      response = await client.patch(`/api/v1/tasks/${id}`, patch);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message = (error.response?.data as { message?: string } | undefined)?.message;
        throw new Error(message || error.message);
      }
      throw error;
    }
    const payload = response.data as ApiResponse<Task>;
    if (payload.status !== "success") {
      throw new Error(payload.message || "Failed to update task");
    }
    return payload.data;
  },

  async deleteTask(id: string): Promise<void> {
    let response;
    try {
      response = await client.delete(`/api/v1/tasks/${id}`);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message = (error.response?.data as { message?: string } | undefined)?.message;
        throw new Error(message || error.message);
      }
      throw error;
    }
    const payload = response.data as ApiResponse<null>;
    if (payload.status !== "success") {
      throw new Error(payload.message || "Failed to delete task");
    }
  },

  async getRandomMotivation(): Promise<ApiResponse<Motivation>> {
    let response;
    try {
      response = await client.get("/api/v1/motivations/random");
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message = (error.response?.data as { message?: string } | undefined)?.message;
        throw new Error(message || error.message);
      }
      throw error;
    }
    const payload = response.data as ApiResponse<Motivation>;
    if (payload.status !== "success") {
      throw new Error(payload.message || "Failed to fetch motivation");
    }
    return payload;
  },

  async getUserProfile(): Promise<any> {
    let response;
    try {
      response = await client.get("/api/v1/user/");
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message = (error.response?.data as { message?: string } | undefined)?.message;
        throw new Error(message || error.message);
      }
      throw error;
    }
    return response.data;
  },

  async getGamificationProfile(): Promise<{
    xp: number;
    level: number;
    active_theme: string;
    unlocked_themes: string[];
    active_border: string;
    unlocked_borders: string[];
    referral_code?: string;
    referred_by?: string;
    accountability_partners: string[];
  }> {
    let response;
    try {
      response = await client.get("/api/v1/user/profile");
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message = (error.response?.data as { message?: string } | undefined)?.message;
        throw new Error(message || error.message);
      }
      throw error;
    }
    const payload = response.data as ApiResponse<any>;
    if (payload.status !== "success") {
      throw new Error(payload.message || "Failed to fetch gamification profile");
    }
    return payload.data;
  },

  async updateGamificationProfile(data: {
    xp?: number;
    level?: number;
    active_theme?: string;
    unlocked_themes?: string[];
    active_border?: string;
    unlocked_borders?: string[];
  }): Promise<any> {
    let response;
    try {
      response = await client.patch("/api/v1/user/gamification", data);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message = (error.response?.data as { message?: string } | undefined)?.message;
        throw new Error(message || error.message);
      }
      throw error;
    }
    const payload = response.data as ApiResponse<any>;
    if (payload.status !== "success") {
      throw new Error(payload.message || "Failed to update gamification profile");
    }
    return payload.data;
  },

  async changePassword(oldPassword: string, newPassword: string): Promise<void> {
    let response;
    try {
      response = await client.post("/api/v1/user/change-password", {
        old_password: oldPassword,
        new_password: newPassword,
      });
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message = (error.response?.data as { message?: string } | undefined)?.message;
        throw new Error(message || error.message);
      }
      throw error;
    }
    const payload = response.data as ApiResponse<null>;
    if (payload.status !== "success") {
      throw new Error(payload.message || "Failed to change password");
    }
  },

  async updateNotificationPreferences(emailNotifications: boolean, reminders: boolean): Promise<void> {
    let response;
    try {
      response = await client.patch("/api/v1/user/notification-preference", {
        email_notifications: emailNotifications,
        reminders: reminders,
      });
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message = (error.response?.data as { message?: string } | undefined)?.message;
        throw new Error(message || error.message);
      }
      throw error;
    }
    const payload = response.data as ApiResponse<null>;
    if (payload.status !== "success") {
      throw new Error(payload.message || "Failed to update notification preferences");
    }
  },

  async updateAuthSettings(allowPasswordLogin: boolean): Promise<void> {
    let response;
    try {
      response = await client.patch("/api/v1/user/auth-settings", {
        allow_password_login: allowPasswordLogin,
      });
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message = (error.response?.data as { message?: string } | undefined)?.message;
        throw new Error(message || error.message);
      }
      throw error;
    }
    const payload = response.data as ApiResponse<null>;
    if (payload.status !== "success") {
      throw new Error(payload.message || "Failed to update auth settings");
    }
  },

  async getUserStreak(today: string): Promise<UserStreak> {
    let response;
    try {
      response = await client.get("/api/v1/user/streak", {
        params: { today }
      });
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message = (error.response?.data as { message?: string } | undefined)?.message;
        throw new Error(message || error.message);
      }
      throw error;
    }
    const payload = response.data as ApiResponse<UserStreak>;
    if (payload.status !== "success") {
      throw new Error(payload.message || "Failed to fetch streak");
    }
    return payload.data;
  },

  async getStreakHistory(startDate?: string, endDate?: string): Promise<StreakDayStatus[]> {
    let response;
    try {
      const params: Record<string, string> = {};
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;
      response = await client.get("/api/v1/user/streak/history", { params });
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message = (error.response?.data as { message?: string } | undefined)?.message;
        throw new Error(message || error.message);
      }
      throw error;
    }
    const payload = response.data as ApiResponse<StreakDayStatus[]>;
    if (payload.status !== "success") {
      throw new Error(payload.message || "Failed to fetch streak history");
    }
    return payload.data;
  },

  async listRewards(): Promise<Reward[]> {
    let response;
    try {
      response = await client.get("/api/v1/rewards");
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message = (error.response?.data as { message?: string } | undefined)?.message;
        throw new Error(message || error.message);
      }
      throw error;
    }
    const payload = response.data as ApiResponse<Reward[]>;
    if (payload.status !== "success") {
      throw new Error(payload.message || "Failed to fetch rewards");
    }
    return payload.data;
  },

  async createReward(title: string, description?: string): Promise<Reward> {
    let response;
    try {
      response = await client.post("/api/v1/rewards", { title, description });
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message = (error.response?.data as { message?: string } | undefined)?.message;
        throw new Error(message || error.message);
      }
      throw error;
    }
    const payload = response.data as ApiResponse<Reward>;
    if (payload.status !== "success") {
      throw new Error(payload.message || "Failed to create reward");
    }
    return payload.data;
  },

  async selectFavoriteReward(id: string): Promise<Reward> {
    let response;
    try {
      response = await client.post(`/api/v1/rewards/${id}/select`);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message = (error.response?.data as { message?: string } | undefined)?.message;
        throw new Error(message || error.message);
      }
      throw error;
    }
    const payload = response.data as ApiResponse<Reward>;
    if (payload.status !== "success") {
      throw new Error(payload.message || "Failed to select favorite reward");
    }
    return payload.data;
  },

  async deleteReward(id: string): Promise<void> {
    let response;
    try {
      response = await client.delete(`/api/v1/rewards/${id}`);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message = (error.response?.data as { message?: string } | undefined)?.message;
        throw new Error(message || error.message);
      }
      throw error;
    }
    const payload = response.data as ApiResponse<null>;
    if (payload.status !== "success") {
      throw new Error(payload.message || "Failed to delete reward");
    }
  },

  async adminListMotivations(): Promise<Motivation[]> {
    let response;
    try {
      response = await client.get("/api/v1/admin/motivations");
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message = (error.response?.data as { message?: string } | undefined)?.message;
        throw new Error(message || error.message);
      }
      throw error;
    }
    const payload = response.data as ApiResponse<Motivation[]>;
    if (payload.status !== "success") {
      throw new Error(payload.message || "Failed to fetch motivations");
    }
    return payload.data;
  },

  async adminCreateMotivation(title: string, content: string, isActive: boolean = true): Promise<Motivation> {
    let response;
    try {
      response = await client.post("/api/v1/admin/motivations", { title, content, is_active: isActive });
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message = (error.response?.data as { message?: string } | undefined)?.message;
        throw new Error(message || error.message);
      }
      throw error;
    }
    const payload = response.data as ApiResponse<Motivation>;
    if (payload.status !== "success") {
      throw new Error(payload.message || "Failed to create motivation");
    }
    return payload.data;
  },

  async adminUpdateMotivation(id: string, patch: Partial<Motivation>): Promise<Motivation> {
    let response;
    try {
      const data: Record<string, any> = {};
      if (patch.title !== undefined) data.title = patch.title;
      if (patch.content !== undefined) data.content = patch.content;
      if (patch.is_active !== undefined) data.is_active = patch.is_active;

      response = await client.patch(`/api/v1/admin/motivations/${id}`, data);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message = (error.response?.data as { message?: string } | undefined)?.message;
        throw new Error(message || error.message);
      }
      throw error;
    }
    const payload = response.data as ApiResponse<Motivation>;
    if (payload.status !== "success") {
      throw new Error(payload.message || "Failed to update motivation");
    }
    return payload.data;
  },

  async adminDeleteMotivation(id: string): Promise<void> {
    let response;
    try {
      response = await client.delete(`/api/v1/admin/motivations/${id}`);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message = (error.response?.data as { message?: string } | undefined)?.message;
        throw new Error(message || error.message);
      }
      throw error;
    }
    const payload = response.data as ApiResponse<null>;
    if (payload.status !== "success") {
      throw new Error(payload.message || "Failed to delete motivation");
    }
  },

  async adminListStreakRules(): Promise<StreakRule[]> {
    let response;
    try {
      response = await client.get("/api/v1/admin/streak-rules");
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message = (error.response?.data as { message?: string } | undefined)?.message;
        throw new Error(message || error.message);
      }
      throw error;
    }
    const payload = response.data as ApiResponse<StreakRule[]>;
    if (payload.status !== "success") {
      throw new Error(payload.message || "Failed to fetch streak rules");
    }
    return payload.data;
  },

  async adminCreateStreakRule(rule: Omit<StreakRule, "id" | "created_at" | "updated_at">): Promise<StreakRule> {
    let response;
    try {
      response = await client.post("/api/v1/admin/streak-rules", rule);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message = (error.response?.data as { message?: string } | undefined)?.message;
        throw new Error(message || error.message);
      }
      throw error;
    }
    const payload = response.data as ApiResponse<StreakRule>;
    if (payload.status !== "success") {
      throw new Error(payload.message || "Failed to create streak rule");
    }
    return payload.data;
  },

  async adminUpdateStreakRule(id: string, patch: Partial<StreakRule>): Promise<StreakRule> {
    let response;
    try {
      response = await client.patch(`/api/v1/admin/streak-rules/${id}`, patch);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message = (error.response?.data as { message?: string } | undefined)?.message;
        throw new Error(message || error.message);
      }
      throw error;
    }
    const payload = response.data as ApiResponse<StreakRule>;
    if (payload.status !== "success") {
      throw new Error(payload.message || "Failed to update streak rule");
    }
    return payload.data;
  },

  async adminDeleteStreakRule(id: string): Promise<void> {
    let response;
    try {
      response = await client.delete(`/api/v1/admin/streak-rules/${id}`);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message = (error.response?.data as { message?: string } | undefined)?.message;
        throw new Error(message || error.message);
      }
      throw error;
    }
    const payload = response.data as ApiResponse<null>;
    if (payload.status !== "success") {
      throw new Error(payload.message || "Failed to delete streak rule");
    }
  },

  async chatWithBot(message: string, chatHistory?: ChatMessage[]): Promise<ChatReply> {
    let response;
    try {
      const localDate = new Date();
      const year = localDate.getFullYear();
      const month = String(localDate.getMonth() + 1).padStart(2, '0');
      const day = String(localDate.getDate()).padStart(2, '0');
      const todayStr = `${year}-${month}-${day}`;

      response = await client.post("/api/v1/chatbot/chat", {
        message,
        chat_history: chatHistory,
        current_date: todayStr,
      });
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message = (error.response?.data as { message?: string } | undefined)?.message;
        throw new Error(message || error.message);
      }
      throw error;
    }
    const payload = response.data as ApiResponse<ChatReply>;
    if (payload.status !== "success") {
      throw new Error(payload.message || "Failed to get chatbot reply");
    }
    return payload.data;
  },

  async submitFeedback(type: FeedbackType, title: string, content: string): Promise<Feedback> {
    let response;
    try {
      response = await client.post("/api/v1/feedback", { type, title, content });
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message = (error.response?.data as { message?: string } | undefined)?.message;
        throw new Error(message || error.message);
      }
      throw error;
    }
    const payload = response.data as ApiResponse<Feedback>;
    if (payload.status !== "success") {
      throw new Error(payload.message || "Failed to submit feedback");
    }
    return payload.data;
  },

  async adminListFeedback(): Promise<Feedback[]> {
    let response;
    try {
      response = await client.get("/api/v1/feedback/admin");
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message = (error.response?.data as { message?: string } | undefined)?.message;
        throw new Error(message || error.message);
      }
      throw error;
    }
    const payload = response.data as ApiResponse<Feedback[]>;
    if (payload.status !== "success") {
      throw new Error(payload.message || "Failed to fetch feedback list");
    }
    return payload.data;
  },

  async adminUpdateFeedbackStatus(id: string, status: FeedbackStatus, adminNotes?: string): Promise<Feedback> {
    let response;
    try {
      response = await client.patch(`/api/v1/feedback/admin/${id}/status`, { status, admin_notes: adminNotes });
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message = (error.response?.data as { message?: string } | undefined)?.message;
        throw new Error(message || error.message);
      }
      throw error;
    }
    const payload = response.data as ApiResponse<Feedback>;
    if (payload.status !== "success") {
      throw new Error(payload.message || "Failed to update feedback status");
    }
    return payload.data;
  },

  async adminDeleteFeedback(id: string): Promise<void> {
    let response;
    try {
      response = await client.delete(`/api/v1/feedback/admin/${id}`);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message = (error.response?.data as { message?: string } | undefined)?.message;
        throw new Error(message || error.message);
      }
      throw error;
    }
    const payload = response.data as ApiResponse<null>;
    if (payload.status !== "success") {
      throw new Error(payload.message || "Failed to delete feedback item");
    }
  },

  async listActiveAnnouncements(): Promise<Announcement[]> {
    let response;
    try {
      response = await client.get("/api/v1/announcements");
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message = (error.response?.data as { message?: string } | undefined)?.message;
        throw new Error(message || error.message);
      }
      throw error;
    }
    const payload = response.data as ApiResponse<Announcement[]>;
    if (payload.status !== "success") {
      throw new Error(payload.message || "Failed to fetch active announcements");
    }
    return payload.data;
  },

  async adminListAnnouncements(): Promise<Announcement[]> {
    let response;
    try {
      response = await client.get("/api/v1/announcements/admin");
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message = (error.response?.data as { message?: string } | undefined)?.message;
        throw new Error(message || error.message);
      }
      throw error;
    }
    const payload = response.data as ApiResponse<Announcement[]>;
    if (payload.status !== "success") {
      throw new Error(payload.message || "Failed to fetch all announcements");
    }
    return payload.data;
  },

  async adminCreateAnnouncement(announcement: Omit<Announcement, "id" | "createdAt">): Promise<Announcement> {
    let response;
    try {
      response = await client.post("/api/v1/announcements/admin", {
        title: announcement.title,
        description: announcement.description,
        banner_url: announcement.bannerUrl,
        is_active: announcement.isActive,
      });
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message = (error.response?.data as { message?: string } | undefined)?.message;
        throw new Error(message || error.message);
      }
      throw error;
    }
    const payload = response.data as ApiResponse<Announcement>;
    if (payload.status !== "success") {
      throw new Error(payload.message || "Failed to create announcement");
    }
    return payload.data;
  },

  async adminUpdateAnnouncement(id: string, patch: Partial<Announcement>): Promise<Announcement> {
    let response;
    try {
      const updateData: Record<string, any> = {};
      if (patch.title !== undefined) updateData.title = patch.title;
      if (patch.description !== undefined) updateData.description = patch.description;
      if (patch.bannerUrl !== undefined) updateData.banner_url = patch.bannerUrl;
      if (patch.isActive !== undefined) updateData.is_active = patch.isActive;

      response = await client.patch(`/api/v1/announcements/admin/${id}`, updateData);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message = (error.response?.data as { message?: string } | undefined)?.message;
        throw new Error(message || error.message);
      }
      throw error;
    }
    const payload = response.data as ApiResponse<Announcement>;
    if (payload.status !== "success") {
      throw new Error(payload.message || "Failed to update announcement");
    }
    return payload.data;
  },

  async adminDeleteAnnouncement(id: string): Promise<void> {
    let response;
    try {
      response = await client.delete(`/api/v1/announcements/admin/${id}`);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message = (error.response?.data as { message?: string } | undefined)?.message;
        throw new Error(message || error.message);
      }
      throw error;
    }
    const payload = response.data as ApiResponse<null>;
    if (payload.status !== "success") {
      throw new Error(payload.message || "Failed to delete announcement");
    }
  },

  async getHabitPinStatus(): Promise<{ has_pin: boolean }> {
    try {
      const response = await client.get("/api/v1/habits/pin/status");
      return response.data.data;
    } catch (e: any) {
      throw new Error(e.response?.data?.message || e.message);
    }
  },

  async setHabitPin(pin: string): Promise<void> {
    try {
      await client.post("/api/v1/habits/pin/set", { pin });
    } catch (e: any) {
      throw new Error(e.response?.data?.message || e.message);
    }
  },

  async verifyHabitPin(pin: string): Promise<boolean> {
    try {
      const response = await client.post("/api/v1/habits/pin/verify", { pin });
      return response.data.status === "success";
    } catch (e: any) {
      throw new Error(e.response?.data?.message || e.message);
    }
  },

  async resetHabitPinWithPassword(account_password: string, new_pin: string): Promise<void> {
    try {
      await client.post("/api/v1/habits/pin/reset-with-password", { account_password, new_pin });
    } catch (e: any) {
      throw new Error(e.response?.data?.message || e.message);
    }
  },

  async getHabits(): Promise<{ habits: any[]; max_limit: number; can_add: boolean }> {
    try {
      const response = await client.get("/api/v1/habits");
      return response.data.data;
    } catch (e: any) {
      throw new Error(e.response?.data?.message || e.message);
    }
  },

  async createHabit(habit: { title: string; description?: string; target_days: number; start_date: string }): Promise<any> {
    try {
      const response = await client.post("/api/v1/habits", habit);
      return response.data.data;
    } catch (e: any) {
      throw new Error(e.response?.data?.message || e.message);
    }
  },

  async deleteHabit(id: string): Promise<void> {
    try {
      await client.delete(`/api/v1/habits/${id}`);
    } catch (e: any) {
      throw new Error(e.response?.data?.message || e.message);
    }
  },

  async markHabitRelapse(id: string, relapse_reason?: string): Promise<any> {
    try {
      const response = await client.post(`/api/v1/habits/${id}/relapse`, { relapse_reason });
      return response.data;
    } catch (e: any) {
      throw new Error(e.response?.data?.message || e.message);
    }
  },

  async markRelapseHabit(id: string, relapse_reason?: string): Promise<any> {
    return this.markHabitRelapse(id, relapse_reason);
  },

  async addHabitJournalLog(id: string, log: { date: string; struggle_level: string; notes?: string; triggers: string[] }): Promise<any> {
    try {
      const response = await client.post(`/api/v1/habits/${id}/journal`, log);
      return response.data;
    } catch (e: any) {
      throw new Error(e.response?.data?.message || e.message);
    }
  },

  async listHabitJournalLogs(id: string): Promise<any[]> {
    try {
      const response = await client.get(`/api/v1/habits/${id}/journal`);
      return response.data.data;
    } catch (e: any) {
      throw new Error(e.response?.data?.message || e.message);
    }
  },

  async getAdminHabitLimit(): Promise<number> {
    try {
      const response = await client.get("/api/v1/habits/admin/limit");
      return response.data.data.max_bad_habits_limit;
    } catch (e: any) {
      throw new Error(e.response?.data?.message || e.message);
    }
  },

  async updateAdminHabitLimit(limit: number): Promise<number> {
    try {
      const response = await client.patch("/api/v1/habits/admin/limit", { max_bad_habits_limit: limit });
      return response.data.data.max_bad_habits_limit;
    } catch (e: any) {
      throw new Error(e.response?.data?.message || e.message);
    }
  },

  computeWeeklyStats(tasks: Task[]): WeeklyStats {
    const total = tasks.length;
    const completed = tasks.filter((t) => t.status === "completed").length;
    const pending = tasks.filter((t) => t.status === "pending").length;
    const skipped = tasks.filter((t) => t.status === "skipped").length;
    const cancelled = tasks.filter((t) => t.status === "cancelled").length;
    return {
      totalTasks: total,
      completed,
      pending,
      skipped,
      cancelled,
      completionPct: total === 0 ? 0 : Math.round((completed / total) * 100),
    };
  },

  async getGmailStatus(): Promise<GmailStatus> {
    try {
      const response = await client.get("/api/v1/gmail/status");
      return response.data.data;
    } catch (e: any) {
      throw new Error(e.response?.data?.message || e.message);
    }
  },

  async getGmailAuthUrl(): Promise<string> {
    try {
      const response = await client.get("/api/v1/gmail/auth-url");
      return response.data.data;
    } catch (e: any) {
      throw new Error(e.response?.data?.message || e.message);
    }
  },

  async callbackGmail(code: string): Promise<GmailStatus> {
    try {
      const response = await client.post("/api/v1/gmail/callback", { code });
      return response.data.data;
    } catch (e: any) {
      throw new Error(e.response?.data?.message || e.message);
    }
  },

  async disconnectGmail(): Promise<void> {
    try {
      await client.post("/api/v1/gmail/disconnect");
    } catch (e: any) {
      throw new Error(e.response?.data?.message || e.message);
    }
  },

  async getImportantGmailToday(): Promise<ImportantEmailItem[]> {
    try {
      const response = await client.get("/api/v1/gmail/important-today");
      return response.data.data;
    } catch (e: any) {
      throw new Error(e.response?.data?.message || e.message);
    }
  },

  async convertGmailToTask(item: {
    title: string;
    description?: string;
    date: string;
    startTime: string;
    endTime: string;
    priority?: string;
  }): Promise<Task> {
    try {
      const response = await client.post("/api/v1/gmail/convert-to-task", item);
      return response.data.data;
    } catch (e: any) {
      throw new Error(e.response?.data?.message || e.message);
    }
  },
};

const MOTIVATIONS = [
  "Small steps every day add up to big results.",
  "Discipline beats motivation. Show up.",
  "Done is better than perfect.",
  "Future-you is counting on present-you.",
  "Consistency compounds.",
  "One task at a time. Breathe.",
  "Energy follows action. Start.",
];

export function randomMotivation() {
  return MOTIVATIONS[Math.floor(Math.random() * MOTIVATIONS.length)];
}

export function getWeekRange(d = new Date()): { start: Date; end: Date; days: Date[] } {
  const day = d.getDay(); // 0..6 Sun..Sat
  const diffToMon = (day + 6) % 7;
  const start = new Date(d);
  start.setDate(d.getDate() - diffToMon);
  start.setHours(0, 0, 0, 0);
  const days = Array.from({ length: 7 }, (_, i) => {
    const x = new Date(start);
    x.setDate(start.getDate() + i);
    return x;
  });
  const end = days[6];
  return { start, end, days };
}

export function ymd(d: Date) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
