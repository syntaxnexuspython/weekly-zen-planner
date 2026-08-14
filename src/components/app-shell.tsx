import { Link, useRouter, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import {
  LayoutDashboard,
  LogOut,
  Shield,
  ListTodo,
  User,
  Inbox,
  MessageSquare,
  ShieldCheck,
  FileText,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { type ReactNode, useEffect, useState, useMemo } from "react";
import { ChatbotAssistant } from "./chatbot-assistant";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import type { Task } from "@/types";
import { api } from "@/lib/api";
import { PendingTasksSheet } from "./pending-tasks-sheet";
import { FeedbackDialog } from "./feedback-dialog";
import { ThemeToggle } from "./theme-toggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { syncGamificationFromDB } from "@/lib/gamification";

export function AppShell({ children }: { children: ReactNode }) {
  const { session, logout } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [pendingOpen, setPendingOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  const { data: tasks = [] } = useQuery({
    queryKey: ["tasks", "all-pending"],
    queryFn: () => api.listTasks(),
    enabled: !!session?.access_token,
  });

  const pendingCount = useMemo(() => {
    return tasks.filter((t) => t.status === "pending").length;
  }, [tasks]);

  useEffect(() => {
    if (!session?.access_token) return;
    syncGamificationFromDB();
  }, [session?.access_token]);

  useEffect(() => {
    if (!session?.access_token) return;

    const baseUrl = import.meta.env.VITE_API_URL ?? "http://localhost:8000";
    const url = `${baseUrl}/api/v1/tasks/events?token=${encodeURIComponent(session.access_token)}`;
    const eventSource = new EventSource(url);

    eventSource.onmessage = (event) => {
      console.log("SSE general message:", event.data);
    };

    const handleTaskCreated = (event: MessageEvent) => {
      try {
        const task: Task = JSON.parse(event.data);
        console.log("Task created via SSE:", task);

        // Optimistically update active task lists in cache to make UI update instantly
        queryClient.setQueriesData<Task[]>({ queryKey: ["tasks"] }, (oldTasks) => {
          if (!oldTasks) return oldTasks;
          if (oldTasks.some((t) => t.id === task.id)) return oldTasks;
          return [...oldTasks, task].sort((a, b) => a.startTime.localeCompare(b.startTime));
        });

        // Trigger refetch of tasks and streaks to keep everything perfectly in sync
        queryClient.invalidateQueries({ queryKey: ["tasks"] });
        queryClient.invalidateQueries({ queryKey: ["streak"] });
        queryClient.invalidateQueries({ queryKey: ["streakHistory"] });
        queryClient.invalidateQueries({ queryKey: ["all-tasks"] });

        toast.success(`Task "${task.title}" created via AI Assistant!`);
      } catch (err) {
        console.error("Error processing task_created event:", err);
      }
    };

    const handleTaskUpdated = (event: MessageEvent) => {
      try {
        const task: Task = JSON.parse(event.data);
        console.log("Task updated via SSE:", task);

        queryClient.setQueriesData<Task[]>({ queryKey: ["tasks"] }, (oldTasks) => {
          if (!oldTasks) return oldTasks;
          return oldTasks.map((t) => (t.id === task.id ? task : t));
        });

        queryClient.invalidateQueries({ queryKey: ["tasks"] });
        queryClient.invalidateQueries({ queryKey: ["streak"] });
        queryClient.invalidateQueries({ queryKey: ["streakHistory"] });
        queryClient.invalidateQueries({ queryKey: ["all-tasks"] });

        toast.success(`Task "${task.title}" updated!`);
      } catch (err) {
        console.error("Error processing task_updated event:", err);
      }
    };

    const handleTaskDeleted = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        console.log("Task deleted via SSE:", data.id);

        queryClient.setQueriesData<Task[]>({ queryKey: ["tasks"] }, (oldTasks) => {
          if (!oldTasks) return oldTasks;
          return oldTasks.filter((t) => t.id !== data.id);
        });

        queryClient.invalidateQueries({ queryKey: ["tasks"] });
        queryClient.invalidateQueries({ queryKey: ["streak"] });
        queryClient.invalidateQueries({ queryKey: ["streakHistory"] });
        queryClient.invalidateQueries({ queryKey: ["all-tasks"] });

        toast.success("Task deleted!");
      } catch (err) {
        console.error("Error processing task_deleted event:", err);
      }
    };

    eventSource.addEventListener("task_created", handleTaskCreated);
    eventSource.addEventListener("task_updated", handleTaskUpdated);
    eventSource.addEventListener("task_deleted", handleTaskDeleted);

    eventSource.onerror = (err) => {
      console.error("SSE connection error, will reconnect:", err);
    };

    return () => {
      eventSource.removeEventListener("task_created", handleTaskCreated);
      eventSource.removeEventListener("task_updated", handleTaskUpdated);
      eventSource.removeEventListener("task_deleted", handleTaskDeleted);
      eventSource.close();
    };
  }, [session?.access_token, queryClient]);

  if (!session) return <>{children}</>;

  const isAdmin = session.role === "admin";
  const userInitials = session.user?.first_name
    ? session.user.first_name[0].toUpperCase()
    : "Z";

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top Header */}
      <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          {/* Logo & Brand */}
          <div
            className="flex items-center gap-2 font-semibold cursor-pointer select-none"
            onClick={() => {
              if (isAdmin) {
                navigate({ to: "/admin" });
              } else {
                navigate({ to: "/dashboard" });
              }
            }}
          >
            <img src="/logo.png" alt="Zen Planner" className="h-5 w-5" />
            <span className="tracking-tight">Zen Planner</span>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {isAdmin ? (
              <Link
                to="/admin"
                className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium hover:bg-accent transition-colors"
                activeProps={{ className: "bg-accent text-primary" }}
              >
                <Shield className="h-4 w-4" /> Admin
              </Link>
            ) : (
              <>
                <Link
                  to="/dashboard"
                  className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium hover:bg-accent transition-colors"
                  activeProps={{ className: "bg-accent text-primary" }}
                >
                  <LayoutDashboard className="h-4 w-4" /> <span>Dashboard</span>
                </Link>
                <Link
                  to="/planner"
                  className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium hover:bg-accent transition-colors"
                  activeProps={{ className: "bg-accent text-primary" }}
                >
                  <ListTodo className="h-4 w-4" /> <span>Planner</span>
                </Link>
                <Link
                  to="/habit-quitter"
                  className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium hover:bg-accent transition-colors"
                  activeProps={{ className: "bg-accent text-primary" }}
                >
                  <ShieldCheck className="h-4 w-4" /> <span>Habit Vault</span>
                </Link>
                <Link
                  to="/notes"
                  className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium hover:bg-accent transition-colors"
                  activeProps={{ className: "bg-accent text-primary" }}
                >
                  <FileText className="h-4 w-4 text-indigo-500" /> <span>Notes</span>
                </Link>

                <button
                  type="button"
                  onClick={() => setPendingOpen(true)}
                  className="relative inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium hover:bg-accent cursor-pointer focus:outline-none transition-colors"
                >
                  <Inbox className="h-4 w-4" />
                  <span>Pending</span>
                  {pendingCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow-sm animate-pulse">
                      {pendingCount > 99 ? "99+" : pendingCount}
                    </span>
                  )}
                </button>
              </>
            )}
            {!isAdmin && (
              <button
                type="button"
                onClick={() => setFeedbackOpen(true)}
                className="relative inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium hover:bg-accent cursor-pointer focus:outline-none transition-colors"
              >
                <MessageSquare className="h-4 w-4" />
                <span>Feedback</span>
              </button>
            )}
            <Link
              to="/profile"
              className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium hover:bg-accent transition-colors"
              activeProps={{ className: "bg-accent text-primary" }}
            >
              <User className="h-4 w-4" /> <span>Profile</span>
            </Link>
            <ThemeToggle />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                logout();
                router.navigate({ to: "/login" });
              }}
              className="cursor-pointer"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </nav>

          {/* Mobile Clean Top Header Actions */}
          <div className="flex md:hidden items-center gap-1.5">
            {/* Pending Inbox Button */}
            <button
              type="button"
              onClick={() => setPendingOpen(true)}
              className="relative p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent/60 transition-colors focus:outline-none"
              title="Pending Tasks"
            >
              <Inbox className="h-5 w-5" />
              {pendingCount > 0 && (
                <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow-sm ring-2 ring-background animate-pulse">
                  {pendingCount > 99 ? "99+" : pendingCount}
                </span>
              )}
            </button>

            {/* Dark/Light Theme Toggle */}
            <ThemeToggle />

            {/* Profile & More Actions Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex items-center justify-center h-8 w-8 rounded-full bg-primary/10 border border-primary/20 text-primary font-bold text-xs hover:bg-primary/20 transition-all focus:outline-none"
                  title="User menu"
                >
                  {userInitials}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 p-1.5 shadow-xl border-border/80">
                <DropdownMenuLabel className="font-normal px-2 py-1.5">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-semibold leading-none truncate text-foreground">
                      {session.user?.first_name
                        ? `${session.user.first_name} ${session.user.last_name || ""}`
                        : "My Account"}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground truncate">
                      {session.user?.email || (isAdmin ? "Administrator" : "User")}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />

                <DropdownMenuItem asChild>
                  <Link
                    to="/profile"
                    className="flex items-center gap-2.5 px-2.5 py-2 cursor-pointer rounded-md"
                  >
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Profile & Settings</span>
                  </Link>
                </DropdownMenuItem>

                {!isAdmin && (
                  <DropdownMenuItem
                    onClick={() => setFeedbackOpen(true)}
                    className="flex items-center gap-2.5 px-2.5 py-2 cursor-pointer rounded-md"
                  >
                    <MessageSquare className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Send Feedback</span>
                  </DropdownMenuItem>
                )}

                {isAdmin && (
                  <DropdownMenuItem asChild>
                    <Link
                      to="/admin"
                      className="flex items-center gap-2.5 px-2.5 py-2 cursor-pointer rounded-md text-amber-500 font-medium"
                    >
                      <Shield className="h-4 w-4" />
                      <span>Admin Console</span>
                    </Link>
                  </DropdownMenuItem>
                )}

                <DropdownMenuSeparator />

                <DropdownMenuItem
                  onClick={() => {
                    logout();
                    router.navigate({ to: "/login" });
                  }}
                  className="flex items-center gap-2.5 px-2.5 py-2 cursor-pointer rounded-md text-destructive focus:text-destructive focus:bg-destructive/10"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="text-sm font-medium">Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="mx-auto max-w-7xl px-4 py-6 pb-24 md:pb-6">{children}</main>

      {/* Floating AI Chatbot Assistant */}
      <ChatbotAssistant />

      {/* Mobile Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 flex md:hidden items-center justify-around bg-background/95 backdrop-blur-xl border-t border-border/60 px-2 py-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-2xl">
        {isAdmin ? (
          <>
            <Link
              to="/admin"
              className="flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-xl text-muted-foreground transition-all duration-150 hover:text-foreground active:scale-95"
              activeProps={{
                className:
                  "text-primary font-semibold [&>div]:bg-primary/15 [&>div]:text-primary",
              }}
            >
              <div className="flex items-center justify-center w-10 h-7 rounded-full transition-colors">
                <Shield className="h-4 w-4" />
              </div>
              <span className="text-[10px] font-medium tracking-tight mt-0.5">Admin</span>
            </Link>
            <Link
              to="/dashboard"
              className="flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-xl text-muted-foreground transition-all duration-150 hover:text-foreground active:scale-95"
              activeProps={{
                className:
                  "text-primary font-semibold [&>div]:bg-primary/15 [&>div]:text-primary",
              }}
            >
              <div className="flex items-center justify-center w-10 h-7 rounded-full transition-colors">
                <LayoutDashboard className="h-4 w-4" />
              </div>
              <span className="text-[10px] font-medium tracking-tight mt-0.5">Dashboard</span>
            </Link>
            <Link
              to="/planner"
              className="flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-xl text-muted-foreground transition-all duration-150 hover:text-foreground active:scale-95"
              activeProps={{
                className:
                  "text-primary font-semibold [&>div]:bg-primary/15 [&>div]:text-primary",
              }}
            >
              <div className="flex items-center justify-center w-10 h-7 rounded-full transition-colors">
                <ListTodo className="h-4 w-4" />
              </div>
              <span className="text-[10px] font-medium tracking-tight mt-0.5">Planner</span>
            </Link>
            <Link
              to="/notes"
              className="flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-xl text-muted-foreground transition-all duration-150 hover:text-foreground active:scale-95"
              activeProps={{
                className:
                  "text-indigo-400 font-semibold [&>div]:bg-indigo-500/15 [&>div]:text-indigo-400",
              }}
            >
              <div className="flex items-center justify-center w-10 h-7 rounded-full transition-colors">
                <FileText className="h-4 w-4" />
              </div>
              <span className="text-[10px] font-medium tracking-tight mt-0.5">Notes</span>
            </Link>
          </>
        ) : (
          <>
            <Link
              to="/planner"
              className="flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-xl text-muted-foreground transition-all duration-150 hover:text-foreground active:scale-95"
              activeProps={{
                className:
                  "text-primary font-semibold [&>div]:bg-primary/15 [&>div]:text-primary",
              }}
            >
              <div className="flex items-center justify-center w-10 h-7 rounded-full transition-colors">
                <ListTodo className="h-4 w-4" />
              </div>
              <span className="text-[10px] font-medium tracking-tight mt-0.5">Planner</span>
            </Link>

            <Link
              to="/dashboard"
              className="flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-xl text-muted-foreground transition-all duration-150 hover:text-foreground active:scale-95"
              activeProps={{
                className:
                  "text-primary font-semibold [&>div]:bg-primary/15 [&>div]:text-primary",
              }}
            >
              <div className="flex items-center justify-center w-10 h-7 rounded-full transition-colors">
                <LayoutDashboard className="h-4 w-4" />
              </div>
              <span className="text-[10px] font-medium tracking-tight mt-0.5">Dashboard</span>
            </Link>

            <Link
              to="/habit-quitter"
              className="flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-xl text-muted-foreground transition-all duration-150 hover:text-foreground active:scale-95"
              activeProps={{
                className:
                  "text-primary font-semibold [&>div]:bg-primary/15 [&>div]:text-primary",
              }}
            >
              <div className="flex items-center justify-center w-10 h-7 rounded-full transition-colors">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <span className="text-[10px] font-medium tracking-tight mt-0.5">Habits</span>
            </Link>

            <Link
              to="/notes"
              className="flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-xl text-muted-foreground transition-all duration-150 hover:text-foreground active:scale-95"
              activeProps={{
                className:
                  "text-indigo-400 font-semibold [&>div]:bg-indigo-500/15 [&>div]:text-indigo-400",
              }}
            >
              <div className="flex items-center justify-center w-10 h-7 rounded-full transition-colors">
                <FileText className="h-4 w-4" />
              </div>
              <span className="text-[10px] font-medium tracking-tight mt-0.5">Notes</span>
            </Link>
          </>
        )}
      </nav>

      {/* Sheets & Dialogs */}
      <PendingTasksSheet open={pendingOpen} onOpenChange={setPendingOpen} />
      <FeedbackDialog open={feedbackOpen} onOpenChange={setFeedbackOpen} />
    </div>
  );
}
