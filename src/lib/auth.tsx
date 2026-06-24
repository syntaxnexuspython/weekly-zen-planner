import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { ApiResponse, AuthSession } from "@/types";
import { api } from "./api";

const SESSION_KEY = "weekly_planner_session_v1";

interface AuthCtx {
  session: AuthSession | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<ApiResponse<AuthSession>>;
  logout: () => void;
  register: (params: {
    email: string;
    password: string;
    first_name: string;
    last_name: string;
    otp: string;
  }) => Promise<AuthSession>;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") {
          // If stored data is a wrapped ApiResponse structure, extract the data
          if ("status" in parsed && parsed.status === "success" && "data" in parsed) {
            setSession(parsed.data);
          } else {
            setSession(parsed);
          }
        }
      }
    } catch { }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    const s = await api.login(email, password);
    localStorage.setItem(SESSION_KEY, JSON.stringify(s.data));
    setSession(s.data);
    return s;
  };

  const register = async (params: {
    email: string;
    password: string;
    first_name: string;
    last_name: string;
    otp: string;
  }) => {
    const s = await api.register(params);
    localStorage.setItem(SESSION_KEY, JSON.stringify(s));
    setSession(s);
    return s;
  };

  const logout = () => {
    localStorage.removeItem(SESSION_KEY);
    setSession(null);
  };

  return <Ctx.Provider value={{ session, loading, login, logout, register }}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth must be used within AuthProvider");
  return c;
}
