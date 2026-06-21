import { Link, useRouter } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { Calendar, LayoutDashboard, LogOut, Shield, ListTodo } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ReactNode } from "react";

export function AppShell({ children }: { children: ReactNode }) {
  const { session, logout } = useAuth();
  const router = useRouter();

  if (!session) return <>{children}</>;

  const isAdmin = session.user.role === "admin";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2 font-semibold">
            <Calendar className="h-5 w-5 text-primary" />
            <span>Weekly Planner</span>
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
            <div className="ml-2 hidden text-sm text-muted-foreground sm:block">
              {session.user.name}
            </div>
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
    </div>
  );
}
