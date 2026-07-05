import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState, useEffect } from "react";
import { RequireAuth } from "@/components/require-auth";
import { useAuth } from "@/lib/auth";
import { api, getWeekRange, ymd } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Plus, Trash2, Pencil, CheckCircle2, Circle, SkipForward, Clock,
  ChevronLeft, ChevronRight, Calendar as CalendarIcon
} from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { TaskFormDialog, type TaskFormValues } from "@/components/task-form-dialog";
import { toast } from "sonner";
import type { Task } from "@/types";

export const Route = createFileRoute("/planner/")({
  component: () => (
    <RequireAuth role="user">
      <Planner />
    </RequireAuth>
  ),
});

function Planner() {
  const { session } = useAuth();

  const qc = useQueryClient();

  const [currentDate, setCurrentDate] = useState(() => new Date());

  const { days, start, end } = useMemo(() => getWeekRange(currentDate), [currentDate]);

  const { data: tasks = [] } = useQuery({
    queryKey: ["tasks", ymd(start), ymd(end)],
    queryFn: () => api.listTasks(ymd(start), ymd(end)),
  });

  const isCurrentWeek = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today >= start && today <= end;
  }, [start, end]);

  const prevWeek = () => {
    setCurrentDate((d) => {
      const next = new Date(d);
      next.setDate(next.getDate() - 7);
      return next;
    });
  };

  const nextWeek = () => {
    setCurrentDate((d) => {
      const next = new Date(d);
      next.setDate(next.getDate() + 7);
      return next;
    });
  };

  const thisWeek = () => {
    setCurrentDate(new Date());
  };

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [defaultDate, setDefaultDate] = useState<string | undefined>();
  const [confirmDelete, setConfirmDelete] = useState<Task | null>(null);
  const [completingTask, setCompletingTask] = useState<Task | null>(null);
  const [completionNotesVal, setCompletionNotesVal] = useState("");
  const [completedDateVal, setCompletedDateVal] = useState("");

  useEffect(() => {
    if (completingTask) {
      setCompletedDateVal(completingTask.date);
      setCompletionNotesVal("");
    }
  }, [completingTask]);

  const create = useMutation({
    mutationFn: (v: TaskFormValues) =>
      api.createTask({ ...v, status: "pending" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("Task created");
    },
  });
  const update = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<Task> }) => api.updateTask(id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });
  const remove = useMutation({
    mutationFn: (id: string) => api.deleteTask(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("Task deleted");
    },
  });

  const weekTasks = tasks.filter((t) => {
    const d = new Date(t.date);
    return d >= start && d <= new Date(end.getTime() + 86400000);
  });

  const priColor: Record<Task["priority"], string> = {
    high: "bg-red-500/10 text-red-600 border-red-500/20",
    medium: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    low: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-5">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Weekly Planner</h1>
          <p className="text-sm text-muted-foreground">
            Organize and manage your weekly routine
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center rounded-md border bg-card p-1 shadow-sm">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 cursor-pointer"
              onClick={prevWeek}
              title="Previous week"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-3 font-medium text-xs md:text-sm flex gap-1.5 items-center hover:bg-accent cursor-pointer"
                >
                  <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>
                    {start.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                  </span>
                  <span className="text-muted-foreground">–</span>
                  <span>
                    {end.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                  </span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="center">
                <Calendar
                  mode="single"
                  selected={currentDate}
                  onSelect={(date) => date && setCurrentDate(date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>

            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 cursor-pointer"
              onClick={nextWeek}
              title="Next week"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {!isCurrentWeek && (
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-3 text-xs md:text-sm font-medium cursor-pointer"
              onClick={thisWeek}
            >
              This Week
            </Button>
          )}

          <Button 
            className="h-9 cursor-pointer"
            onClick={() => { setEditing(null); setDefaultDate(ymd(currentDate)); setOpen(true); }}
          >
            <Plus className="mr-2 h-4 w-4" /> New task
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {days.map((d) => {
          const dayStr = ymd(d);
          const list = weekTasks.filter((t) => t.date === dayStr).sort((a, b) => a.startTime.localeCompare(b.startTime));
          const isToday = dayStr === ymd(new Date());
          return (
            <Card key={dayStr} className={isToday ? "border-primary" : ""}>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div>
                  <CardTitle className="text-sm font-semibold">
                    {d.toLocaleDateString(undefined, { weekday: "long" })}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">
                    {d.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                  </p>
                </div>
                <Button size="icon" variant="ghost" onClick={() => { setEditing(null); setDefaultDate(dayStr); setOpen(true); }}>
                  <Plus className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-2">
                {list.length === 0 && <p className="text-xs text-muted-foreground">No tasks.</p>}
                {list.slice(0, 3).map((t) => (
                  <div key={t.id} className="group rounded-lg border p-2 text-sm">
                    <div className="flex items-start gap-2">
                      <button
                        onClick={() => {
                          if (t.status === "completed") {
                            update.mutate({ id: t.id, patch: { status: "pending", completionNotes: "" } });
                          } else {
                            setCompletingTask(t);
                            setCompletionNotesVal("");
                          }
                        }}
                        title="Toggle complete"
                      >
                        {t.status === "completed"
                          ? <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                          : t.status === "skipped"
                          ? <SkipForward className="h-4 w-4 text-muted-foreground" />
                          : <Circle className="h-4 w-4 text-muted-foreground" />}
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className={`font-medium ${t.status === "completed" ? "line-through text-muted-foreground" : ""}`}>
                          {t.title}
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {t.startTime}–{t.endTime}
                          <Badge variant="outline" className={priColor[t.priority]}>{t.priority}</Badge>
                          {t.isOptional && <Badge variant="secondary">optional</Badge>}
                        </div>
                        {t.status === "completed" && (
                          <div className="mt-1.5 space-y-1">
                            {t.completedDate && (
                              <div className="text-[10px] font-medium text-muted-foreground">
                                Completed on: {t.completedDate}
                              </div>
                            )}
                            {t.completionNotes && (
                              <div className="text-xs text-emerald-600 bg-emerald-500/10 rounded p-1.5 border border-emerald-500/20 italic">
                                Note: {t.completionNotes}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                        <button onClick={() => { setEditing(t); setDefaultDate(undefined); setOpen(true); }} title="Edit">
                          <Pencil className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                        </button>
                        <button onClick={() => setConfirmDelete(t)} title="Delete">
                          <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                        </button>
                      </div>
                    </div>
                    {t.status !== "skipped" && t.status !== "completed" && (
                      <button
                        className="mt-2 text-[10px] uppercase tracking-wide text-muted-foreground hover:text-foreground"
                        onClick={() => update.mutate({ id: t.id, patch: { status: "skipped" } })}
                      >
                        Skip
                      </button>
                    )}
                  </div>
                ))}
                {list.length > 3 && (
                  <Link
                    to="/planner/$date"
                    params={{ date: dayStr }}
                    className="block text-center text-xs font-semibold text-primary hover:underline pt-2 cursor-pointer border-t border-dashed mt-3"
                  >
                    View all {list.length} tasks →
                  </Link>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <TaskFormDialog
        open={open}
        onOpenChange={setOpen}
        initial={editing}
        defaultDate={defaultDate}
        onSubmit={async (v) => {
          if (editing) await update.mutateAsync({ id: editing.id, patch: v });
          else await create.mutateAsync(v);
        }}
      />

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete task?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove "{confirmDelete?.title}".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmDelete) remove.mutate(confirmDelete.id);
                setConfirmDelete(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!completingTask} onOpenChange={(o) => !o && setCompletingTask(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Mark Task Completed</DialogTitle>
            <DialogDescription>
              Would you like to add any notes or achievements for "{completingTask?.title}"? (Optional)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="completedDate" className="text-xs font-semibold text-muted-foreground">Completed Date</Label>
              <Input
                id="completedDate"
                type="date"
                value={completedDateVal}
                onChange={(e) => setCompletedDateVal(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="completionNotes" className="text-xs font-semibold text-muted-foreground">Completion Notes</Label>
              <Textarea
                id="completionNotes"
                placeholder="E.g., Finished successfully, ran 5km, wrote 10 pages..."
                value={completionNotesVal}
                onChange={(e) => setCompletionNotesVal(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter className="flex sm:justify-between gap-2">
            <Button
              variant="ghost"
              type="button"
              className="cursor-pointer"
              onClick={() => setCompletingTask(null)}
            >
              Cancel
            </Button>
            <div className="flex gap-2">
              <Button
                variant="outline"
                type="button"
                className="cursor-pointer"
                onClick={() => {
                  if (completingTask) {
                    update.mutate({
                      id: completingTask.id,
                      patch: {
                        status: "completed",
                        completionNotes: "",
                        completedDate: completedDateVal || completingTask.date,
                      },
                    });
                  }
                  setCompletingTask(null);
                }}
              >
                Skip Notes
              </Button>
              <Button
                type="button"
                className="cursor-pointer"
                onClick={() => {
                  if (completingTask) {
                    update.mutate({
                      id: completingTask.id,
                      patch: {
                        status: "completed",
                        completionNotes: completionNotesVal.trim(),
                        completedDate: completedDateVal || completingTask.date,
                      },
                    });
                  }
                  setCompletingTask(null);
                }}
              >
                Complete Task
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
