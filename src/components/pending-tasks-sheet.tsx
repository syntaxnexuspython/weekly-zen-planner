import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, ymd } from "@/lib/api";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  CheckCircle2,
  Circle,
  SkipForward,
  Calendar,
  Clock,
  AlertCircle,
  MoreVertical,
  CalendarDays,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import type { Task } from "@/types";

interface PendingTasksSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PendingTasksSheet({ open, onOpenChange }: PendingTasksSheetProps) {
  const qc = useQueryClient();
  const todayStr = ymd(new Date());

  // Fetch all tasks for the user
  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["tasks", "all-pending"],
    queryFn: () => api.listTasks(),
    enabled: open, // Only run the query when the sheet is opened
  });

  // Filter tasks to only include pending ones
  const pendingTasks = useMemo(() => {
    return tasks.filter((t) => t.status === "pending");
  }, [tasks]);

  // Group pending tasks: Overdue, Today, Upcoming
  const groupedTasks = useMemo(() => {
    const overdue: Task[] = [];
    const today: Task[] = [];
    const upcoming: Task[] = [];

    pendingTasks.forEach((task) => {
      if (task.date < todayStr) {
        overdue.push(task);
      } else if (task.date === todayStr) {
        today.push(task);
      } else {
        upcoming.push(task);
      }
    });

    // Sort each group chronologically by date and startTime
    const sortByTime = (a: Task, b: Task) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return a.startTime.localeCompare(b.startTime);
    };

    return {
      overdue: overdue.sort(sortByTime),
      today: today.sort(sortByTime),
      upcoming: upcoming.sort(sortByTime),
    };
  }, [pendingTasks, todayStr]);

  // Mutations for updating task status or date
  const updateTaskMutation = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<Task> }) =>
      api.updateTask(id, patch),
    onSuccess: (updatedTask) => {
      // Invalidate queries to trigger UI refresh across the app
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: ["streak"] });
      qc.invalidateQueries({ queryKey: ["streakHistory"] });
      qc.invalidateQueries({ queryKey: ["all-tasks"] });
    },
  });

  const handleComplete = async (task: Task) => {
    try {
      await updateTaskMutation.mutateAsync({
        id: task.id,
        patch: { status: "completed", completedDate: todayStr },
      });
      toast.success(`Task "${task.title}" completed!`);
    } catch (error: any) {
      toast.error(error.message || "Failed to complete task");
    }
  };

  const handleSkip = async (task: Task) => {
    try {
      await updateTaskMutation.mutateAsync({
        id: task.id,
        patch: { status: "skipped" },
      });
      toast.success(`Task "${task.title}" skipped`);
    } catch (error: any) {
      toast.error(error.message || "Failed to skip task");
    }
  };

  const handleReschedule = async (task: Task, targetDate: "today" | "tomorrow") => {
    const newDate = new Date();
    if (targetDate === "tomorrow") {
      newDate.setDate(newDate.getDate() + 1);
    }
    const newDateStr = ymd(newDate);

    try {
      await updateTaskMutation.mutateAsync({
        id: task.id,
        patch: { date: newDateStr },
      });
      toast.success(
        `Rescheduled "${task.title}" to ${targetDate === "today" ? "Today" : "Tomorrow"}`
      );
    } catch (error: any) {
      toast.error(error.message || "Failed to reschedule task");
    }
  };

  const priColor: Record<Task["priority"], string> = {
    high: "bg-red-500/10 text-red-600 border-red-500/20 dark:bg-red-500/20 dark:text-red-400 dark:border-red-500/30",
    medium:
      "bg-amber-500/10 text-amber-600 border-amber-500/20 dark:bg-amber-500/20 dark:text-amber-400 dark:border-amber-500/30",
    low: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/30",
  };

  const formatTaskDate = (dateStr: string) => {
    if (dateStr === todayStr) return "Today";
    const d = new Date(dateStr);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (dateStr === ymd(tomorrow)) return "Tomorrow";

    return d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      weekday: "short",
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[90%] sm:max-w-md flex flex-col h-full p-6">
        <SheetHeader className="pb-4 border-b">
          <SheetTitle className="text-xl flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Pending Tasks
          </SheetTitle>
          <SheetDescription>
            Manage and schedule your outstanding activities to stay on track.
          </SheetDescription>
        </SheetHeader>

        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="space-y-2 text-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto"></div>
              <p className="text-sm text-muted-foreground">Loading pending tasks...</p>
            </div>
          </div>
        ) : pendingTasks.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-4">
            <div className="h-16 w-16 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500">
              <Sparkles className="h-8 w-8 animate-pulse" />
            </div>
            <div className="space-y-1">
              <h3 className="font-semibold text-lg">All Caught Up!</h3>
              <p className="text-sm text-muted-foreground">
                No pending tasks found. Enjoy your zen state! 🧘
              </p>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto pr-1 my-4 space-y-6 scrollbar-thin">
            {/* OVERDUE SECTION */}
            {groupedTasks.overdue.length > 0 && (
              <div className="space-y-2.5">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-rose-500 flex items-center gap-1.5 px-1">
                  <AlertCircle className="h-3.5 w-3.5" />
                  Overdue ({groupedTasks.overdue.length})
                </h4>
                <div className="space-y-2">
                  {groupedTasks.overdue.map((task) => (
                    <TaskItem
                      key={task.id}
                      task={task}
                      priColor={priColor}
                      formatDate={formatTaskDate}
                      onComplete={handleComplete}
                      onSkip={handleSkip}
                      onReschedule={handleReschedule}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* TODAY SECTION */}
            {groupedTasks.today.length > 0 && (
              <div className="space-y-2.5">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-amber-500 flex items-center gap-1.5 px-1">
                  <Clock className="h-3.5 w-3.5" />
                  Due Today ({groupedTasks.today.length})
                </h4>
                <div className="space-y-2">
                  {groupedTasks.today.map((task) => (
                    <TaskItem
                      key={task.id}
                      task={task}
                      priColor={priColor}
                      formatDate={formatTaskDate}
                      onComplete={handleComplete}
                      onSkip={handleSkip}
                      onReschedule={handleReschedule}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* UPCOMING SECTION */}
            {groupedTasks.upcoming.length > 0 && (
              <div className="space-y-2.5">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-primary flex items-center gap-1.5 px-1">
                  <CalendarDays className="h-3.5 w-3.5" />
                  Upcoming ({groupedTasks.upcoming.length})
                </h4>
                <div className="space-y-2">
                  {groupedTasks.upcoming.map((task) => (
                    <TaskItem
                      key={task.id}
                      task={task}
                      priColor={priColor}
                      formatDate={formatTaskDate}
                      onComplete={handleComplete}
                      onSkip={handleSkip}
                      onReschedule={handleReschedule}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="pt-4 border-t text-center text-xs text-muted-foreground">
          Total pending tasks: {pendingTasks.length}
        </div>
      </SheetContent>
    </Sheet>
  );
}

interface TaskItemProps {
  task: Task;
  priColor: Record<Task["priority"], string>;
  formatDate: (d: string) => string;
  onComplete: (t: Task) => void;
  onSkip: (t: Task) => void;
  onReschedule: (t: Task, target: "today" | "tomorrow") => void;
}

function TaskItem({
  task,
  priColor,
  formatDate,
  onComplete,
  onSkip,
  onReschedule,
}: TaskItemProps) {
  return (
    <div className="group flex items-start gap-3 rounded-lg border p-3 hover:bg-accent/40 transition-colors bg-card shadow-sm">
      <button
        onClick={() => onComplete(task)}
        className="mt-0.5 shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-full cursor-pointer"
        title="Mark Complete"
      >
        <Circle className="h-5 w-5 text-muted-foreground group-hover:text-emerald-500 transition-colors" />
      </button>

      <div className="flex-1 min-w-0 space-y-1">
        <h5 className="text-sm font-medium text-foreground leading-snug break-words">
          {task.title}
        </h5>
        {task.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">{task.description}</p>
        )}
        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
          <span className="flex items-center gap-1 text-[10px] text-muted-foreground font-medium bg-muted px-1.5 py-0.5 rounded">
            <Calendar className="h-3 w-3" />
            {formatDate(task.date)}
          </span>
          <span className="flex items-center gap-1 text-[10px] text-muted-foreground font-medium bg-muted px-1.5 py-0.5 rounded">
            <Clock className="h-3 w-3" />
            {task.startTime}–{task.endTime}
          </span>
          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 border ${priColor[task.priority]}`}>
            {task.priority}
          </Badge>
          {task.isOptional && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
              optional
            </Badge>
          )}
        </div>
      </div>

      <div className="shrink-0 self-start">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 p-0 cursor-pointer text-muted-foreground hover:text-foreground"
            >
              <MoreVertical className="h-4 w-4" />
              <span className="sr-only">Open menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-36">
            <DropdownMenuItem
              onClick={() => onComplete(task)}
              className="cursor-pointer text-emerald-600 dark:text-emerald-400 focus:bg-emerald-50 dark:focus:bg-emerald-950/20"
            >
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Complete
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onReschedule(task, "today")} className="cursor-pointer">
              <Calendar className="mr-2 h-4 w-4" />
              Do Today
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onReschedule(task, "tomorrow")} className="cursor-pointer">
              <Clock className="mr-2 h-4 w-4" />
              Do Tomorrow
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onSkip(task)}
              className="cursor-pointer text-muted-foreground"
            >
              <SkipForward className="mr-2 h-4 w-4" />
              Skip Task
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
