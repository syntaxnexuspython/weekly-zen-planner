import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
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
import { Plus, Trash2, Pencil, CheckCircle2, Circle, SkipForward, Clock } from "lucide-react";
import { TaskFormDialog, type TaskFormValues } from "@/components/task-form-dialog";
import { toast } from "sonner";
import type { Task } from "@/types";

export const Route = createFileRoute("/planner")({
  component: () => (
    <RequireAuth role="user">
      <Planner />
    </RequireAuth>
  ),
});

function Planner() {
  const { session } = useAuth();

  const qc = useQueryClient();

  const { days, start, end } = useMemo(() => getWeekRange(), []);

  const { data: tasks = [] } = useQuery({
    queryKey: ["tasks", ymd(start), ymd(end)],
    queryFn: () => api.listTasks(ymd(start), ymd(end)),
  });
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [defaultDate, setDefaultDate] = useState<string | undefined>();
  const [confirmDelete, setConfirmDelete] = useState<Task | null>(null);

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
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Weekly Planner</h1>
          <p className="text-sm text-muted-foreground">
            {start.toLocaleDateString(undefined, { month: "short", day: "numeric" })} – {end.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
          </p>
        </div>
        <Button onClick={() => { setEditing(null); setDefaultDate(ymd(new Date())); setOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" /> New task
        </Button>
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
                {list.map((t) => (
                  <div key={t.id} className="group rounded-lg border p-2 text-sm">
                    <div className="flex items-start gap-2">
                      <button
                        onClick={() => update.mutate({ id: t.id, patch: { status: t.status === "completed" ? "pending" : "completed" } })}
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
    </div>
  );
}
