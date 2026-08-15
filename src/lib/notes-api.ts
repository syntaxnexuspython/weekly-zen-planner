import axios from "axios";
import type { Note, NoteCreatePayload, NoteUpdatePayload } from "@/types";

const NOTES_API_BASE_URL =
  import.meta.env.VITE_NOTE_TAKER_API_URL ?? "http://localhost:8001/api/v1";

const notesClient = axios.create({
  baseURL: NOTES_API_BASE_URL,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
  timeout: 5000, // 5s timeout to catch unreachable service quickly
});

// Retrieve Auth token from session storage
const getAuthToken = (): string => {
  if (typeof window === "undefined") return "";
  try {
    const raw = localStorage.getItem("weekly_planner_session_v1");
    if (!raw) return "";
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") {
      if ("status" in parsed && parsed.status === "success" && "data" in parsed) {
        return parsed.data?.access_token || "";
      }
      return parsed.access_token || "";
    }
  } catch (e) {
    console.error("Failed to parse stored session for notes API", e);
  }
  return "";
};

notesClient.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export interface NotesFetchResult<T> {
  data: T;
  isOffline: boolean;
  error?: string;
}

export const notesApi = {
  async getNotes(params?: {
    entity_type?: string;
    entity_id?: string;
    category?: string;
    standalone_only?: boolean;
    search?: string;
    include_archived?: boolean;
  }): Promise<NotesFetchResult<Note[]>> {
    try {
      const response = await notesClient.get<Note[]>("/notes", { params });
      return { data: response.data, isOffline: false };
    } catch (err: any) {
      console.warn("Note Taker Backend API unreachable or failed:", err.message);
      return {
        data: [],
        isOffline: true,
        error: err.response?.data?.detail || "Notes service unreachable",
      };
    }
  },

  async getNote(noteId: string): Promise<NotesFetchResult<Note | null>> {
    try {
      const response = await notesClient.get<Note>(`/notes/${noteId}`);
      return { data: response.data, isOffline: false };
    } catch (err: any) {
      console.warn(`Note Taker API failed to get note ${noteId}:`, err.message);
      return {
        data: null,
        isOffline: true,
        error: err.response?.data?.detail || "Notes service unreachable",
      };
    }
  },

  async createNote(payload: NoteCreatePayload): Promise<NotesFetchResult<Note | null>> {
    try {
      const response = await notesClient.post<Note>("/notes", payload);
      return { data: response.data, isOffline: false };
    } catch (err: any) {
      console.warn("Note Taker API failed to create note:", err.message);
      return {
        data: null,
        isOffline: true,
        error: err.response?.data?.detail || "Notes service unreachable",
      };
    }
  },

  async updateNote(
    noteId: string,
    payload: NoteUpdatePayload
  ): Promise<NotesFetchResult<Note | null>> {
    try {
      const response = await notesClient.put<Note>(`/notes/${noteId}`, payload);
      return { data: response.data, isOffline: false };
    } catch (err: any) {
      console.warn(`Note Taker API failed to update note ${noteId}:`, err.message);
      return {
        data: null,
        isOffline: true,
        error: err.response?.data?.detail || "Notes service unreachable",
      };
    }
  },

  async deleteNote(noteId: string): Promise<NotesFetchResult<boolean>> {
    try {
      await notesClient.delete(`/notes/${noteId}`);
      return { data: true, isOffline: false };
    } catch (err: any) {
      console.warn(`Note Taker API failed to delete note ${noteId}:`, err.message);
      return {
        data: false,
        isOffline: true,
        error: err.response?.data?.detail || "Notes service unreachable",
      };
    }
  },

  // CATEGORY ENDPOINTS (Dedicated NoteCategory Document in MongoDB)
  async getCategories(): Promise<NotesFetchResult<any[]>> {
    try {
      const response = await notesClient.get<any[]>("/categories");
      return { data: response.data, isOffline: false };
    } catch (err: any) {
      console.warn("Note Taker API failed to fetch categories:", err.message);
      return {
        data: [],
        isOffline: true,
        error: err.response?.data?.detail || "Notes service unreachable",
      };
    }
  },

  async createCategory(payload: {
    name: string;
    color?: string;
    icon?: string;
    description?: string;
  }): Promise<NotesFetchResult<any | null>> {
    try {
      const response = await notesClient.post<any>("/categories", payload);
      return { data: response.data, isOffline: false };
    } catch (err: any) {
      console.warn("Note Taker API failed to create category:", err.message);
      return {
        data: null,
        isOffline: true,
        error: err.response?.data?.detail || "Notes service unreachable",
      };
    }
  },

  async updateCategory(
    categoryId: string,
    payload: {
      name?: string;
      color?: string;
      icon?: string;
      description?: string;
    }
  ): Promise<NotesFetchResult<any | null>> {
    try {
      const response = await notesClient.put<any>(`/categories/${categoryId}`, payload);
      return { data: response.data, isOffline: false };
    } catch (err: any) {
      console.warn(`Note Taker API failed to update category ${categoryId}:`, err.message);
      return {
        data: null,
        isOffline: true,
        error: err.response?.data?.detail || "Notes service unreachable",
      };
    }
  },

  async deleteCategory(categoryId: string): Promise<NotesFetchResult<boolean>> {
    try {
      await notesClient.delete(`/categories/${categoryId}`);
      return { data: true, isOffline: false };
    } catch (err: any) {
      console.warn(`Note Taker API failed to delete category ${categoryId}:`, err.message);
      return {
        data: false,
        isOffline: true,
        error: err.response?.data?.detail || "Notes service unreachable",
      };
    }
  },
};
