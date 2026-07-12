import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { RequireAuth } from "@/components/require-auth";
import { useAuth } from "@/lib/auth";
import { api, getWeekRange, ymd } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  CheckCircle2, Circle, Flame, Snowflake, ListChecks, Clock,
  Sparkles, Star, TrendingUp, Megaphone,
} from "lucide-react";
import { toast } from "sonner";
import type { Task, Reward, StreakDayStatus } from "@/types";

export const Route = createFileRoute("/dashboard")({
  component: () => (
    <RequireAuth role="user">
      <Dashboard />
    </RequireAuth>
  ),
});

function RewardSelector({
  rewards,
  onSelect,
  onCreate,
  onDelete,
}: {
  rewards: Reward[];
  onSelect: (id: string) => Promise<void>;
  onCreate: (title: string, description: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const genericRewards = rewards.filter((r) => r.is_generic);
  const customRewards = rewards.filter((r) => !r.is_generic);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setIsSubmitting(true);
    try {
      await onCreate(title, desc);
      setTitle("");
      setDesc("");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="w-full cursor-pointer">
          <Star className="mr-2 h-4 w-4 text-amber-500" />
          Choose Reward
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Set Your Weekly Reward</DialogTitle>
          <DialogDescription>
            Choose a target reward to motivate yourself this week! Maintain your tasks to unlock it.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 my-2">
          {/* Suggestions Section */}
          <div>
            <h4 className="text-sm font-semibold mb-2 text-muted-foreground">Suggested Rewards</h4>
            <div className="grid grid-cols-1 gap-2">
              {genericRewards.map((reward) => (
                <div
                  key={reward.id}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent/40 transition-colors"
                >
                  <div>
                    <div className="text-sm font-medium">{reward.title}</div>
                    {reward.description && (
                      <div className="text-xs text-muted-foreground">{reward.description}</div>
                    )}
                  </div>
                  <Button
                    size="sm"
                    className="cursor-pointer"
                    variant={reward.is_favorite ? "secondary" : "outline"}
                    onClick={async () => {
                      await onSelect(reward.id);
                      setOpen(false);
                    }}
                    disabled={reward.is_favorite}
                  >
                    {reward.is_favorite ? "Active" : "Select"}
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* Custom Section */}
          {customRewards.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold mb-2 text-muted-foreground">Your Custom Rewards</h4>
              <div className="grid grid-cols-1 gap-2">
                {customRewards.map((reward) => (
                  <div
                    key={reward.id}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent/40 transition-colors"
                  >
                    <div>
                      <div className="text-sm font-medium flex items-center gap-1.5">
                        {reward.title}
                        {reward.is_favorite && <Badge variant="secondary">Active Target</Badge>}
                      </div>
                      {reward.description && (
                        <div className="text-xs text-muted-foreground">{reward.description}</div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {!reward.is_favorite && (
                        <Button
                          size="sm"
                          className="cursor-pointer"
                          variant="outline"
                          onClick={async () => {
                            await onSelect(reward.id);
                            setOpen(false);
                          }}
                        >
                          Select
                        </Button>
                      )}
                      <Button
                        size="sm"
                        className="cursor-pointer text-red-500 hover:text-red-600 hover:bg-red-50"
                        variant="ghost"
                        onClick={() => onDelete(reward.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add Custom Form */}
          <div className="border-t pt-4">
            <h4 className="text-sm font-semibold mb-2">Create Custom Reward</h4>
            <form onSubmit={handleCreate} className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="reward-title">Reward Name</Label>
                <Input
                  id="reward-title"
                  placeholder="e.g., Dinner at favorite sushi place"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="reward-desc">Description (Optional)</Label>
                <Input
                  id="reward-desc"
                  placeholder="e.g., Get a 10-piece sashimi set"
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                />
              </div>
              <Button type="submit" size="sm" className="w-full cursor-pointer" disabled={isSubmitting}>
                {isSubmitting ? "Creating..." : "Add Custom Reward"}
              </Button>
            </form>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function Dashboard() {
  const { session } = useAuth();
  const qc = useQueryClient();

  const { start, end, days } = useMemo(() => getWeekRange(), []);
  const todayStr = ymd(new Date());

  const fourteenWeeksAgoStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 14 * 7);
    const day = d.getDay();
    d.setDate(d.getDate() - day); // Align to Sunday
    return ymd(d);
  }, []);

  const { data: tasks = [] } = useQuery({
    queryKey: ["tasks", ymd(start), ymd(end)],
    queryFn: () => api.listTasks(ymd(start), ymd(end)),
  });

  const { data: streak } = useQuery({
    queryKey: ["streak", todayStr],
    queryFn: () => api.getUserStreak(todayStr),
  });

  const { data: streakHistory = [] } = useQuery({
    queryKey: ["streakHistory", fourteenWeeksAgoStr, todayStr],
    queryFn: () => api.getStreakHistory(fourteenWeeksAgoStr, todayStr),
  });

  const { data: rewards = [], refetch: refetchRewards } = useQuery({
    queryKey: ["rewards"],
    queryFn: () => api.listRewards(),
  });

  const { data: announcements = [] } = useQuery({
    queryKey: ["active-announcements"],
    queryFn: api.listActiveAnnouncements,
  });

  const favoriteReward = useMemo(() => {
    return rewards.find((r) => r.is_favorite);
  }, [rewards]);

  const weekTasks = tasks.filter((t) => {
    const d = new Date(t.date);
    return d >= start && d <= new Date(end.getTime() + 86400000);
  });
  const stats = api.computeWeeklyStats(weekTasks);
  const todays = weekTasks.filter((t) => t.date === todayStr);
  const priority = weekTasks.filter((t) => t.priority === "high" && !t.isOptional);
  const optional = weekTasks.filter((t) => t.isOptional);

  const [motivation, setMotivation] = useState<string | null>(null);
  const [isLoadingMotivation, setIsLoadingMotivation] = useState(false);

  async function handleMotivate() {
    setIsLoadingMotivation(true);
    try {
      const resp = await api.getRandomMotivation();
      setMotivation(resp.data.content);
    } catch (error: any) {
      toast.error(error.message || "Failed to fetch motivation");
    } finally {
      setIsLoadingMotivation(false);
    }
  }

  async function toggle(t: Task) {
    const next = t.status === "completed" ? "pending" : "completed";
    await api.updateTask(t.id, { status: next });
    qc.invalidateQueries({ queryKey: ["tasks"] });
    qc.invalidateQueries({ queryKey: ["streak"] });
    qc.invalidateQueries({ queryKey: ["streakHistory"] });
    if (next === "completed") toast.success("Nice work — task completed");
  }

  async function handleSelectReward(id: string) {
    try {
      await api.selectFavoriteReward(id);
      refetchRewards();
      toast.success("Target reward updated!");
    } catch (e: any) {
      toast.error(e.message || "Failed to select reward");
    }
  }

  async function handleCreateReward(title: string, description: string) {
    try {
      const newReward = await api.createReward(title, description);
      await api.selectFavoriteReward(newReward.id);
      refetchRewards();
      toast.success("Custom reward created and set as active target!");
    } catch (e: any) {
      toast.error(e.message || "Failed to create reward");
    }
  }

  async function handleDeleteReward(id: string) {
    try {
      await api.deleteReward(id);
      refetchRewards();
      toast.success("Reward deleted");
    } catch (e: any) {
      toast.error(e.message || "Failed to delete reward");
    }
  }

  const weekRangeLabel = `${start.toLocaleDateString(undefined, { month: "short", day: "numeric" })} – ${end.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;

  return (
    <div className="space-y-6">
      {/* Announcements */}
      {announcements.length > 0 && (
        <div className="space-y-4">
          {announcements.map((ann) => (
            <Card key={ann.id} className="overflow-hidden border-amber-500/20 bg-amber-500/5 relative hover:shadow-md transition-shadow">
              {ann.bannerUrl && (
                <div className="h-32 w-full overflow-hidden relative">
                  <img src={ann.bannerUrl} alt="" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-background/90 to-transparent" />
                </div>
              )}
              <CardHeader className={ann.bannerUrl ? "pt-2" : ""}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-2 text-amber-600 font-bold text-sm">
                    <Megaphone className="h-4 w-4 animate-bounce" />
                    <span>Announcement Alert</span>
                  </div>
                </div>
                <CardTitle className="text-lg font-bold mt-1">{ann.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                  {ann.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <section className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {greeting()}, {session!.user.first_name.split(" ")[0]} 👋
          </h1>
          <p className="text-sm text-muted-foreground">
            {new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })} · Week of {weekRangeLabel}
          </p>
        </div>
        <Button onClick={handleMotivate} variant="outline" disabled={isLoadingMotivation}>
          <Sparkles className="mr-2 h-4 w-4" />
          {isLoadingMotivation ? "Loading..." : "Motivate me"}
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
        <StatCard label="Streak" value={`${streak?.current_streak ?? 0} days`} icon={<Flame className="h-4 w-4 text-orange-500" />} />
        <StatCard label="Freezes" value={`${streak?.available_freezes ?? 0}`} icon={<Snowflake className="h-4 w-4 text-sky-500" />} />
        <StatCard label="Completion" value={`${stats.completionPct}%`} icon={<TrendingUp className="h-4 w-4 text-primary" />} />
      </section>

      {/* Streak Activity Heatmap Grid */}
      <Card className="w-full">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Flame className="h-5 w-5 text-orange-500 animate-pulse" />
            Streak Activity Heatmap
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col space-y-4">
            <div className="overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-muted">
              <div className="min-w-[620px] flex gap-2 justify-center py-2">
                {/* Day Labels */}
                <div className="grid grid-rows-7 text-[10px] text-muted-foreground pr-2 justify-between py-1 font-medium select-none h-[116px]">
                  <span>Sun</span>
                  <span>Mon</span>
                  <span>Tue</span>
                  <span>Wed</span>
                  <span>Thu</span>
                  <span>Fri</span>
                  <span>Sat</span>
                </div>

                {/* Heatmap Grid */}
                <div className="grid grid-rows-7 grid-flow-col gap-1 h-[116px]">
                  {streakHistory.map((day) => {
                    const d = new Date(day.date);
                    const formattedDate = d.toLocaleDateString(undefined, {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    });

                    // Define colors
                    let colorClass = "bg-muted/15 border-muted-foreground/10 hover:border-muted-foreground/30";
                    let statusLabel = "No activity";
                    
                    if (day.status === "completed") {
                      colorClass = "bg-emerald-500 border-emerald-600 shadow-[0_0_8px_rgba(16,185,129,0.25)] hover:scale-110 hover:bg-emerald-400";
                      statusLabel = "Task Completed";
                    } else if (day.status === "freezed") {
                      colorClass = "bg-sky-400 border-sky-500 shadow-[0_0_8px_rgba(56,189,248,0.25)] hover:scale-110 hover:bg-sky-300";
                      statusLabel = "Streak Freezed";
                    } else if (day.status === "missed") {
                      colorClass = "bg-rose-500/30 border-rose-500/20 hover:scale-110 hover:bg-rose-500/40";
                      statusLabel = "Missed Day";
                    }

                    return (
                      <div
                        key={day.date}
                        className={`w-3.5 h-3.5 rounded-[3px] border transition-all duration-150 relative group cursor-help ${colorClass}`}
                      >
                        {/* Tooltip */}
                        <div className="pointer-events-none absolute bottom-full left-[50%] translate-x-[-50%] mb-1.5 hidden group-hover:block z-50 bg-black/90 text-white text-[10px] font-medium py-1 px-2 rounded shadow-lg whitespace-nowrap">
                          <span className="font-semibold">{formattedDate}</span>: {statusLabel}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Legend */}
            <div className="flex items-center justify-end gap-4 text-xs text-muted-foreground px-2">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 bg-muted/15 border rounded-[3px]" />
                <span>Empty</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 bg-rose-500/30 border border-rose-500/20 rounded-[3px]" />
                <span>Missed</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 bg-sky-400 border border-sky-500 rounded-[3px]" />
                <span>Freezed</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 bg-emerald-500 border border-emerald-600 rounded-[3px]" />
                <span>Completed</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

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
            <div className="flex items-start gap-3">
              <Star className="h-8 w-8 text-amber-500 shrink-0 mt-0.5" />
              <div className="min-w-0">
                {favoriteReward ? (
                  <>
                    <div className="font-medium truncate">{favoriteReward.title}</div>
                    {favoriteReward.description && (
                      <div className="text-xs text-muted-foreground mb-1 line-clamp-2">{favoriteReward.description}</div>
                    )}
                    <div className="text-xs text-muted-foreground">
                      {stats.completionPct >= 80 ? "Unlocked!" : `${stats.completionPct}% of weekly tasks completed`}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="font-medium">No reward set</div>
                    <div className="text-xs text-muted-foreground">Set a goal reward for motivation!</div>
                  </>
                )}
              </div>
            </div>
            <Progress value={Math.min(100, (stats.completionPct / 80) * 100)} />
            {stats.completionPct >= 80 && favoriteReward ? (
              <Badge className="bg-emerald-500 text-white w-full justify-center py-1">Reward unlocked 🎉</Badge>
            ) : (
              <div className="space-y-2">
                {favoriteReward && (
                  <p className="text-xs text-muted-foreground text-center">
                    {80 - stats.completionPct}% more completion to unlock this reward.
                  </p>
                )}
                <RewardSelector
                  rewards={rewards}
                  onSelect={handleSelectReward}
                  onCreate={handleCreateReward}
                  onDelete={handleDeleteReward}
                />
              </div>
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
