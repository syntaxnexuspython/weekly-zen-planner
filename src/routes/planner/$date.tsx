import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState, useEffect } from "react";
import { RequireAuth } from "@/components/require-auth";
import { useAuth } from "@/lib/auth";
import { api, ymd } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Plus, Trash2, Pencil, CheckCircle2, Circle, SkipForward, Clock, ArrowLeft, Sparkles, Repeat, Link as LinkIcon, CheckSquare
} from "lucide-react";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { TaskFormDialog, type TaskFormValues } from "@/components/task-form-dialog";
import { ZenFocusModal } from "@/components/zen-focus-modal";
import { toast } from "sonner";
import type { Task } from "@/types";

export const Route = createFileRoute("/planner/$date")({
  component: () => (
    <RequireAuth role="user">
      <DayPlanner />
    </RequireAuth>
  ),
});

function DayPlanner() {
  const { date } = Route.useParams();
  const qc = useQueryClient();

  const day = useMemo(() => {
    const [year, month, day] = date.split("-").map(Number);
    return new Date(year, month - 1, day);
  }, [date]);

  const { data: tasks = [] } = useQuery({
    queryKey: ["tasks", date, date],
    queryFn: () => api.listTasks(date, date),
  });

  const dayTasks = useMemo(() => {
    return tasks
      .filter((t) => t.date === date)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [tasks, date]);

  const stats = useMemo(() => {
    const total = dayTasks.length;
    const completed = dayTasks.filter((t) => t.status === "completed").length;
    const pct = total === 0 ? 0 : Math.round((completed / total) * 100);
    return { total, completed, pct };
  }, [dayTasks]);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [defaultDate, setDefaultDate] = useState<string | undefined>();
  const [confirmDelete, setConfirmDelete] = useState<Task | null>(null);
  const [completingTask, setCompletingTask] = useState<Task | null>(null);
  const [completionNotesVal, setCompletionNotesVal] = useState("");
  const [completedDateVal, setCompletedDateVal] = useState("");
  const [focusTask, setFocusTask] = useState<Task | null>(null);

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

  const priColor: Record<Task["priority"], string> = {
    high: "bg-red-500/10 text-red-600 border-red-500/20",
    medium: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    low: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <Link
          to="/planner"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Weekly View
        </Link>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-5">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">
            {day.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
          </h1>
          <p className="text-sm text-muted-foreground">
            Detailed schedule and completion notes
          </p>
        </div>
        <Button className="cursor-pointer" onClick={() => { setEditing(null); setDefaultDate(date); setOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" /> Add task
        </Button>
      </div>

      <Card className="bg-accent/30 border-none shadow-none">
        <CardContent className="p-4 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-primary/10 p-2 text-primary">
              <CheckCircle2 className="h-6 w-6 text-primary" />
            </div>
            <div>
              <div className="text-sm font-semibold">Day Progress</div>
              <div className="text-xs text-muted-foreground">
                {stats.completed} of {stats.total} tasks completed
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-2xl font-bold">{stats.pct}%</div>
            </div>
            <div className="w-24 bg-secondary rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full transition-all duration-500"
                style={{ width: `${stats.pct}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {dayTasks.length === 0 ? (
          <Card className="border-dashed py-12 text-center">
            <CardContent className="space-y-3">
              <p className="text-muted-foreground text-sm">No tasks scheduled for this day.</p>
              <Button variant="outline" size="sm" className="cursor-pointer" onClick={() => { setEditing(null); setDefaultDate(date); setOpen(true); }}>
                Create your first task
              </Button>
            </CardContent>
          </Card>
        ) : (
          dayTasks.map((t) => (
            <Card key={t.id} className={`hover:shadow-sm transition-shadow ${t.status === "completed" ? "border-emerald-500/30 bg-emerald-500/[0.01]" : ""}`}>
              <CardContent className="p-4 flex items-start gap-4 justify-between">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <button
                    onClick={() => {
                      if (t.status === "completed") {
                        update.mutate({ id: t.id, patch: { status: "pending", completionNotes: "" } });
                      } else {
                        setCompletingTask(t);
                        setCompletionNotesVal("");
                      }
                    }}
                    className="mt-1 cursor-pointer"
                    title="Toggle complete"
                  >
                    {t.status === "completed" ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                    ) : t.status === "skipped" ? (
                      <SkipForward className="h-5 w-5 text-muted-foreground" />
                    ) : (
                      <Circle className="h-5 w-5 text-muted-foreground" />
                    )}
                  </button>
                  
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className={`text-base font-semibold tracking-tight ${t.status === "completed" ? "line-through text-muted-foreground" : ""}`}>
                      {t.title}
                    </div>
                    
                    {t.description && (
                      <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                        {t.description}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1 bg-secondary px-2.5 py-0.5 rounded-full font-medium">
                        <Clock className="h-3 w-3" />
                        {t.startTime} – {t.endTime}
                      </span>
                      <Badge variant="outline" className={priColor[t.priority]}>
                        {t.priority} priority
                      </Badge>
                      {t.isOptional && <Badge variant="secondary">optional</Badge>}
                      {t.recurrence && t.recurrence !== "none" && (
                        <Badge variant="outline" className="gap-1 bg-primary/5 text-primary border-primary/20">
                          <Repeat className="h-3 w-3" /> {t.recurrence}
                        </Badge>
                      )}
                      {t.subtasks && t.subtasks.length > 0 && (
                        <Badge variant="secondary" className="gap-1">
                          <CheckSquare className="h-3 w-3" />
                          Subtasks {t.subtasks.filter((s) => s.completed).length}/{t.subtasks.length}
                        </Badge>
                      )}
                    </div>

                    {t.attachments && t.attachments.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {t.attachments.map((att) => (
                          <a
                            key={att.id}
                            href={att.url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-primary hover:underline bg-primary/5 px-2 py-1 rounded border border-primary/10"
                          >
                            <LinkIcon className="h-3 w-3" /> {att.name || att.url}
                          </a>
                        ))}
                      </div>
                    )}

                    {t.status === "completed" && (
                      <div className="mt-3 space-y-2">
                        {t.completedDate && (
                          <div className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                            Completed on: <span className="text-foreground">{t.completedDate}</span>
                          </div>
                        )}
                        {t.completionNotes && (
                          <div className="text-xs text-emerald-700 bg-emerald-500/10 rounded-md p-2.5 border border-emerald-500/20 italic">
                            Completion Note: {t.completionNotes}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {t.status === "pending" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setFocusTask(t)}
                      className="gap-1 text-xs border-primary/30 text-primary hover:bg-primary/10"
                    >
                      <Sparkles className="h-3.5 w-3.5" /> Focus
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 cursor-pointer"
                    onClick={() => { setEditing(t); setDefaultDate(undefined); setOpen(true); }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive cursor-pointer"
                    onClick={() => setConfirmDelete(t)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
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

      <ZenFocusModal
        open={!!focusTask}
        onOpenChange={(o) => !o && setFocusTask(null)}
        task={focusTask}
        onCompleteTask={(updatedTask) => {
          update.mutate({
            id: updatedTask.id,
            patch: {
              status: "completed",
              subtasks: updatedTask.subtasks,
              completedDate: ymd(new Date()),
            },
          });
        }}
      />
    </div>
  );
}
