import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { RequireAuth } from "@/components/require-auth";
import { useAuth } from "@/lib/auth";
import { api, getWeekRange, randomMotivation, ymd } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2, Circle, Flame, Snowflake, ListChecks, Clock,
  Sparkles, Star, TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import type { Task } from "@/types";

export const Route = createFileRoute("/dashboard")({
  component: () => (
    <RequireAuth role="user">
      <Dashboard />
    </RequireAuth>
  ),
});

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function Dashboard() {
  const { session } = useAuth();
  const qc = useQueryClient();
  const userId = session!.user.id;

  const { data: tasks = [] } = useQuery({
    queryKey: ["tasks", userId],
    queryFn: () => api.listTasks(userId),
  });

  const { start, end, days } = useMemo(() => getWeekRange(), []);
  const todayStr = ymd(new Date());

  const weekTasks = tasks.filter((t) => {
    const d = new Date(t.date);
    return d >= start && d <= new Date(end.getTime() + 86400000);
  });
  const stats = api.computeWeeklyStats(weekTasks);
  const todays = weekTasks.filter((t) => t.date === todayStr);
  const priority = weekTasks.filter((t) => t.priority === "high" && !t.isOptional);
  const optional = weekTasks.filter((t) => t.isOptional);

  const [motivation, setMotivation] = useState<string | null>(null);

  async function toggle(t: Task) {
    const next = t.status === "completed" ? "pending" : "completed";
    await api.updateTask(t.id, { status: next });
    qc.invalidateQueries({ queryKey: ["tasks", userId] });
    if (next === "completed") toast.success("Nice work — task completed");
  }

  const weekRangeLabel = `${start.toLocaleDateString(undefined, { month: "short", day: "numeric" })} – ${end.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;

  return (
    <div className="space-y-6">
      <section className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {greeting()}, {session!.user.name.split(" ")[0]} 👋
          </h1>
          <p className="text-sm text-muted-foreground">
            {new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })} · Week of {weekRangeLabel}
          </p>
        </div>
        <Button onClick={() => setMotivation(randomMotivation())} variant="outline">
          <Sparkles className="mr-2 h-4 w-4" /> Motivate me
        </Button>
      </section>

      {motivation && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="py-4 text-sm font-medium">{motivation}</CardContent>
        </Card>
      )}

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard label="This week" value={stats.totalTasks} icon={<ListChecks className="h-4 w-4" />} />
        <StatCard label="Completed" value={stats.completed} icon={<CheckCircle2 className="h-4 w-4 text-emerald-500" />} />
        <StatCard label="Pending" value={stats.pending} icon={<Clock className="h-4 w-4 text-amber-500" />} />
        <StatCard label="Streak" value={session!.user.streakCount} icon={<Flame className="h-4 w-4 text-orange-500" />} />
        <StatCard label="Freezes" value={session!.user.streakFreezes} icon={<Snowflake className="h-4 w-4 text-sky-500" />} />
        <StatCard label="Completion" value={`${stats.completionPct}%`} icon={<TrendingUp className="h-4 w-4 text-primary" />} />
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Weekly progress</CardTitle>
            <span className="text-sm text-muted-foreground">{stats.completed}/{stats.totalTasks} done</span>
          </CardHeader>
          <CardContent className="space-y-4">
            <Progress value={stats.completionPct} />
            <div className="grid grid-cols-7 gap-2">
              {days.map((d) => {
                const dayTasks = weekTasks.filter((t) => t.date === ymd(d));
                const done = dayTasks.filter((t) => t.status === "completed").length;
                const pct = dayTasks.length ? (done / dayTasks.length) * 100 : 0;
                return (
                  <div key={d.toISOString()} className="rounded-lg border p-2 text-center">
                    <div className="text-xs font-medium text-muted-foreground">
                      {d.toLocaleDateString(undefined, { weekday: "short" })}
                    </div>
                    <div className="text-sm font-semibold">{d.getDate()}</div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                      <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
                    </div>
                    <div className="mt-1 text-[10px] text-muted-foreground">{done}/{dayTasks.length}</div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Weekly reward</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3">
              <Star className="h-8 w-8 text-amber-500" />
              <div>
                <div className="font-medium">Reach 80% to unlock</div>
                <div className="text-xs text-muted-foreground">{stats.completionPct}% of weekly tasks completed</div>
              </div>
            </div>
            <Progress value={Math.min(100, (stats.completionPct / 80) * 100)} />
            {stats.completionPct >= 80 ? (
              <Badge className="bg-emerald-500 text-white">Reward unlocked 🎉</Badge>
            ) : (
              <p className="text-xs text-muted-foreground">
                {80 - stats.completionPct}% more to go.
              </p>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <TaskList title="Today's tasks" tasks={todays} onToggle={toggle} empty="Nothing scheduled today." />
        <TaskList title="Priority" tasks={priority} onToggle={toggle} empty="No high-priority tasks." />
        <TaskList title="Optional" tasks={optional} onToggle={toggle} empty="No optional tasks." />
      </section>
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: React.ReactNode; icon: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between py-4">
        <div>
          <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
          <div className="text-xl font-semibold">{value}</div>
        </div>
        {icon}
      </CardContent>
    </Card>
  );
}

function TaskList({
  title, tasks, onToggle, empty,
}: { title: string; tasks: Task[]; onToggle: (t: Task) => void; empty: string }) {
  const priColor: Record<Task["priority"], string> = {
    high: "bg-red-500/10 text-red-600 border-red-500/20",
    medium: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    low: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  };
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">{title}</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        {tasks.length === 0 ? (
          <p className="text-sm text-muted-foreground">{empty}</p>
        ) : tasks.map((t) => (
          <div key={t.id} className="flex items-start gap-3 rounded-lg border p-3 hover:bg-accent/40">
            <button onClick={() => onToggle(t)} className="mt-0.5">
              {t.status === "completed"
                ? <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                : <Circle className="h-5 w-5 text-muted-foreground" />}
            </button>
            <div className="flex-1 min-w-0">
              <div className={`text-sm font-medium ${t.status === "completed" ? "line-through text-muted-foreground" : ""}`}>
                {t.title}
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                {t.startTime}–{t.endTime}
                <Badge variant="outline" className={priColor[t.priority]}>{t.priority}</Badge>
                {t.isOptional && <Badge variant="secondary">optional</Badge>}
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
