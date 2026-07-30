import { Link, useRouter, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { Calendar, LayoutDashboard, LogOut, Shield, ListTodo, User, Inbox, MessageSquare } from "lucide-react";
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
                  <LayoutDashboard className="h-4 w-4" /> <span className="hidden md:inline">Dashboard</span>
                </Link>
                <Link to="/planner" className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium hover:bg-accent" activeProps={{ className: "bg-accent" }}>
                  <ListTodo className="h-4 w-4" /> <span className="hidden md:inline">Planner</span>
                </Link>
                <button
                  onClick={() => setPendingOpen(true)}
                  className="relative inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium hover:bg-accent cursor-pointer focus:outline-none"
                >
                  <Inbox className="h-4 w-4" />
                  <span className="hidden md:inline">Pending</span>
                  {pendingCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow-sm animate-pulse">
                      {pendingCount}
                    </span>
                  )}
                </button>
              </>
            )}
            {!isAdmin && (
              <button
                onClick={() => setFeedbackOpen(true)}
                className="relative inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium hover:bg-accent cursor-pointer focus:outline-none"
              >
                <MessageSquare className="h-4 w-4" />
                <span className="hidden md:inline">Feedback</span>
              </button>
            )}
            <Link to="/profile" className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium hover:bg-accent" activeProps={{ className: "bg-accent" }}>
              <User className="h-4 w-4" /> <span className="hidden md:inline">Profile</span>
            </Link>
            <ThemeToggle />
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
      <PendingTasksSheet open={pendingOpen} onOpenChange={setPendingOpen} />
      <FeedbackDialog open={feedbackOpen} onOpenChange={setFeedbackOpen} />
    </div>
  );
}
