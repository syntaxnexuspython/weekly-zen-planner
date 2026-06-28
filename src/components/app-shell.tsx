import { Link, useRouter, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { Calendar, LayoutDashboard, LogOut, Shield, ListTodo, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ReactNode } from "react";
import { ChatbotAssistant } from "./chatbot-assistant";

export function AppShell({ children }: { children: ReactNode }) {
  const { session, logout } = useAuth();
  const router = useRouter();

  if (!session) return <>{children}</>;

  const isAdmin = session.role === "admin";
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2 font-semibold cursor-pointer" onClick={() => {
            if (isAdmin) {
              navigate({ to: "/admin" })
            } else {
              navigate({ to: "/dashboard" })
            }
          }} >
            <img src="/logo.png" alt="Zen Planner" className="h-5 w-5" />
            {/* <Calendar className="h-5 w-5 text-primary" /> */}
            <span>Zen Planner</span>
          </div>
          <nav className="flex items-center gap-1">
            {isAdmin ? (
              <Link to="/admin" className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium hover:bg-accent" activeProps={{ className: "bg-accent" }}>
                <Shield className="h-4 w-4" /> Admin
              </Link>
            ) : (
              <>
                <Link to="/dashboard" className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium hover:bg-accent" activeProps={{ className: "bg-accent" }}>
                  <LayoutDashboard className="h-4 w-4" /> Dashboard
                </Link>
                <Link to="/planner" className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium hover:bg-accent" activeProps={{ className: "bg-accent" }}>
                  <ListTodo className="h-4 w-4" /> Planner
                </Link>
              </>
            )}
            <Link to="/profile" className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium hover:bg-accent" activeProps={{ className: "bg-accent" }}>
              <User className="h-4 w-4" /> Profile
            </Link>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                logout();
                router.navigate({ to: "/login" });
              }}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
      <ChatbotAssistant />
    </div>
  );
}
