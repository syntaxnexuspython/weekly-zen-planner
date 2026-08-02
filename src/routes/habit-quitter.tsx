import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { RequireAuth } from "@/components/require-auth";
import { api, ymd } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
  ShieldCheck,
  ShieldAlert,
  Lock,
  Unlock,
  KeyRound,
  Plus,
  Flame,
  RotateCcw,
  BookOpen,
  HeartPulse,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  History,
  Trash2,
  Wind,
} from "lucide-react";

export const Route = createFileRoute("/habit-quitter")({
  component: () => (
    <RequireAuth>
      <HabitQuitterPage />
    </RequireAuth>
  ),
});

function HabitQuitterPage() {
  const qc = useQueryClient();
  const [unlocked, setUnlocked] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [newPinInput, setNewPinInput] = useState("");
  const [forgotModalOpen, setForgotModalOpen] = useState(false);
  const [accountPassword, setAccountPassword] = useState("");
  const [resetNewPin, setResetNewPin] = useState("");

  const [addModalOpen, setAddModalOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [targetDays, setTargetDays] = useState(90);
  const [startDate, setStartDate] = useState(ymd(new Date()));

  const [journalModalOpen, setJournalModalOpen] = useState(false);
  const [activeHabitForLog, setActiveHabitForLog] = useState<any>(null);
  const [struggleLevel, setStruggleLevel] = useState<"easy" | "moderate" | "tough">("easy");
  const [journalNotes, setJournalNotes] = useState("");
  const [selectedTriggers, setSelectedTriggers] = useState<string[]>([]);

  const [relapseModalOpen, setRelapseModalOpen] = useState(false);
  const [activeHabitForRelapse, setActiveHabitForRelapse] = useState<any>(null);
  const [relapseReason, setRelapseReason] = useState("");

  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [activeHabitForHistory, setActiveHabitForHistory] = useState<any>(null);

  const [sosModalOpen, setSosModalOpen] = useState(false);
  const [breathPhase, setBreathPhase] = useState<"Inhale" | "Hold" | "Exhale">("Inhale");
  const [timerSeconds, setTimerSeconds] = useState(4);

  // Check PIN status
  const { data: pinStatus, isLoading: loadingPinStatus } = useQuery({
    queryKey: ["habitPinStatus"],
    queryFn: () => api.getHabitPinStatus(),
  });

  // Fetch Habits
  const { data: habitData, isLoading: loadingHabits } = useQuery({
    queryKey: ["habits"],
    queryFn: () => api.getHabits(),
    enabled: unlocked,
  });

  // Fetch Journal Logs for selected history habit
  const { data: historyLogs } = useQuery({
    queryKey: ["habitJournalLogs", activeHabitForHistory?.id],
    queryFn: () => api.listHabitJournalLogs(activeHabitForHistory.id),
    enabled: unlocked && !!activeHabitForHistory,
  });

  // Breathing timer effect for SOS modal
  useEffect(() => {
    let interval: any;
    if (sosModalOpen) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => {
          if (prev > 1) return prev - 1;
          // Switch phase
          if (breathPhase === "Inhale") {
            setBreathPhase("Hold");
            return 7;
          } else if (breathPhase === "Hold") {
            setBreathPhase("Exhale");
            return 8;
          } else {
            setBreathPhase("Inhale");
            return 4;
          }
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [sosModalOpen, breathPhase]);

  // Mutations
  const setPinMutation = useMutation({
    mutationFn: (pin: string) => api.setHabitPin(pin),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["habitPinStatus"] });
      setUnlocked(true);
      toast.success("Vault PIN set & unlocked!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const verifyPinMutation = useMutation({
    mutationFn: (pin: string) => api.verifyHabitPin(pin),
    onSuccess: (success) => {
      if (success) {
        setUnlocked(true);
        toast.success("Vault unlocked");
      }
    },
    onError: (err: any) => toast.error(err.message || "Incorrect PIN"),
  });

  const resetPinMutation = useMutation({
    mutationFn: ({ pass, pin }: { pass: string; pin: string }) =>
      api.resetHabitPinWithPassword(pass, pin),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["habitPinStatus"] });
      setForgotModalOpen(false);
      setUnlocked(true);
      toast.success("PIN reset using main password!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const createHabitMutation = useMutation({
    mutationFn: (data: any) => api.createHabit(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["habits"] });
      setAddModalOpen(false);
      setTitle("");
      setDescription("");
      toast.success("Habit tracker created!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteHabitMutation = useMutation({
    mutationFn: (id: string) => api.deleteHabit(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["habits"] });
      toast.success("Habit deleted");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const relapseMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      api.markRelapseHabit(id, reason),
    onSuccess: (data: any) => {
      qc.invalidateQueries({ queryKey: ["habits"] });
      setRelapseModalOpen(false);
      setRelapseReason("");
      toast.info(data.message || "Relapse logged. Restarting from Day 1!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const journalMutation = useMutation({
    mutationFn: ({ id, log }: { id: string; log: any }) =>
      api.addHabitJournalLog(id, log),
    onSuccess: (data: any) => {
      qc.invalidateQueries({ queryKey: ["habits"] });
      if (activeHabitForHistory) qc.invalidateQueries({ queryKey: ["habitJournalLogs", activeHabitForHistory.id] });
      setJournalModalOpen(false);
      setJournalNotes("");
      setSelectedTriggers([]);
      toast.success(data.message || "Day-wise journal log saved!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const handleUnlockSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinStatus?.has_pin) {
      verifyPinMutation.mutate(pinInput);
    } else {
      if (newPinInput.length !== 4) {
        toast.error("PIN must be 4 digits");
        return;
      }
      setPinMutation.mutate(newPinInput);
    }
  };

  const toggleTrigger = (trig: string) => {
    setSelectedTriggers((prev) =>
      prev.includes(trig) ? prev.filter((t) => t !== trig) : [...prev, trig]
    );
  };

  // Locked Screen Component
  if (!unlocked) {
    return (
      <div className="min-h-[75vh] flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-xl border-primary/20 bg-background/95">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-2">
              <Lock className="h-6 w-6" />
            </div>
            <CardTitle className="text-2xl font-bold">Confidential Habit Vault</CardTitle>
            <CardDescription>
              {pinStatus?.has_pin
                ? "Enter your 4-digit PIN to access your recovery vault"
                : "Set a 4-digit numeric PIN to protect your personal habit recovery logs"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUnlockSubmit} className="space-y-4">
              {pinStatus?.has_pin ? (
                <div className="space-y-2 text-center">
                  <Label htmlFor="pin" className="text-sm font-medium">4-Digit PIN</Label>
                  <Input
                    id="pin"
                    type="password"
                    maxLength={4}
                    inputMode="numeric"
                    placeholder="••••"
                    className="text-center text-2xl tracking-[0.5em] font-mono"
                    value={pinInput}
                    onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ""))}
                    autoFocus
                  />
                </div>
              ) : (
                <div className="space-y-2 text-center">
                  <Label htmlFor="newPin" className="text-sm font-medium">Create 4-Digit PIN</Label>
                  <Input
                    id="newPin"
                    type="password"
                    maxLength={4}
                    inputMode="numeric"
                    placeholder="••••"
                    className="text-center text-2xl tracking-[0.5em] font-mono"
                    value={newPinInput}
                    onChange={(e) => setNewPinInput(e.target.value.replace(/\D/g, ""))}
                    autoFocus
                  />
                </div>
              )}

              <Button
                type="submit"
                className="w-full font-semibold gap-2 cursor-pointer"
                disabled={setPinMutation.isPending || verifyPinMutation.isPending}
              >
                <KeyRound className="h-4 w-4" />
                {pinStatus?.has_pin ? "Unlock Vault" : "Set PIN & Enter"}
              </Button>

              {pinStatus?.has_pin && (
                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => setForgotModalOpen(true)}
                    className="text-xs text-muted-foreground underline hover:text-primary cursor-pointer"
                  >
                    Forgot PIN? Reset with account password
                  </button>
                </div>
              )}
            </form>
          </CardContent>
        </Card>

        {/* Reset PIN Modal */}
        <Dialog open={forgotModalOpen} onOpenChange={setForgotModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-primary" /> Reset Vault PIN
              </DialogTitle>
              <DialogDescription>
                Enter your account password to verify identity and set a new 4-digit PIN.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="accPass">Account Password</Label>
                <Input
                  id="accPass"
                  type="password"
                  value={accountPassword}
                  onChange={(e) => setAccountPassword(e.target.value)}
                  placeholder="Enter your account password"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="resetPin">New 4-Digit PIN</Label>
                <Input
                  id="resetPin"
                  type="password"
                  maxLength={4}
                  inputMode="numeric"
                  placeholder="••••"
                  className="text-center text-xl font-mono tracking-widest"
                  value={resetNewPin}
                  onChange={(e) => setResetNewPin(e.target.value.replace(/\D/g, ""))}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                onClick={() => resetPinMutation.mutate({ pass: accountPassword, pin: resetNewPin })}
                disabled={!accountPassword || resetNewPin.length !== 4 || resetPinMutation.isPending}
              >
                Reset PIN & Unlock
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  const habits = habitData?.habits || [];
  const maxLimit = habitData?.max_limit || 3;
  const canAdd = habitData?.can_add ?? true;

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-5 rounded-xl border shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-primary">
            <ShieldCheck className="h-6 w-6" />
            <h1 className="text-2xl font-bold tracking-tight">Bad Habit Quitter Vault</h1>
            <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20">
              Confidential
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Track clean streaks, log day-wise struggles, and re-wire your habits mindfully.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setSosModalOpen(true)} className="gap-1.5 text-rose-500 border-rose-200 hover:bg-rose-50 dark:hover:bg-rose-950/20 cursor-pointer">
            <HeartPulse className="h-4 w-4 animate-pulse" /> Urge SOS Helper
          </Button>
          <Button size="sm" onClick={() => setAddModalOpen(true)} disabled={!canAdd} className="gap-1.5 cursor-pointer">
            <Plus className="h-4 w-4" /> Add Habit ({habits.length}/{maxLimit})
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setUnlocked(false)} title="Lock Vault" className="cursor-pointer">
            <Lock className="h-4 w-4 text-muted-foreground" />
          </Button>
        </div>
      </div>

      {!canAdd && (
        <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 rounded-lg text-xs flex items-center justify-between">
          <span>⚠️ Active habit limit reached ({habits.length}/{maxLimit}). Delete or complete a habit to add more.</span>
          <span className="font-semibold">Admin Limit: {maxLimit}</span>
        </div>
      )}

      {/* Habit Cards Grid */}
      {loadingHabits ? (
        <div className="text-center py-12 text-muted-foreground">Loading habit recovery vault...</div>
      ) : habits.length === 0 ? (
        <Card className="text-center p-8 border-dashed">
          <CardContent className="space-y-3 pt-4">
            <Flame className="h-12 w-12 mx-auto text-muted-foreground/50" />
            <h3 className="text-lg font-semibold">No Bad Habits Added Yet</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Start your clean recovery journey. Choose a habit you want to quit (default goal: 90 days).
            </p>
            <Button onClick={() => setAddModalOpen(true)} className="mt-2 gap-1.5 cursor-pointer">
              <Plus className="h-4 w-4" /> Start First Clean Journey
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {habits.map((habit: any) => (
            <Card key={habit.id} className="shadow-sm border-primary/20 hover:border-primary/40 transition-all flex flex-col justify-between">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-xl font-bold flex items-center gap-2">
                      {habit.title}
                    </CardTitle>
                    {habit.description && (
                      <CardDescription className="mt-1">{habit.description}</CardDescription>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-destructive h-8 w-8 cursor-pointer"
                    onClick={() => {
                      if (confirm(`Delete habit tracker "${habit.title}"?`)) {
                        deleteHabitMutation.mutate(habit.id);
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Progress Ring / Streak Bar */}
                <div className="p-4 rounded-xl bg-primary/5 border border-primary/10 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Current Clean Streak</span>
                    <Badge variant="secondary" className="gap-1 text-primary font-bold">
                      <Flame className="h-3.5 w-3.5 text-orange-500 fill-orange-500" />
                      Day {habit.days_clean} of {habit.target_days}
                    </Badge>
                  </div>
                  <Progress value={habit.progress_pct} className="h-3" />
                  <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                    <span>Started: {habit.start_date}</span>
                    <span>{habit.progress_pct}% Goal Achieved</span>
                  </div>
                </div>

                {/* Attempts Summary */}
                <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
                  <span>Current Attempt: #{habit.current_attempt_number}</span>
                  <span>Past Relapses: {habit.attempts.length}</span>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-2 pt-2 border-t">
                  <Button
                    size="sm"
                    variant="default"
                    className="gap-1.5 flex-1 cursor-pointer text-xs"
                    onClick={() => {
                      setActiveHabitForLog(habit);
                      setJournalModalOpen(true);
                    }}
                  >
                    <BookOpen className="h-3.5 w-3.5" /> Log Day Journal
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 text-xs text-amber-600 border-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/20 cursor-pointer"
                    onClick={() => {
                      setActiveHabitForRelapse(habit);
                      setRelapseModalOpen(true);
                    }}
                  >
                    <RotateCcw className="h-3.5 w-3.5" /> Try Again (Day 1)
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="gap-1 text-xs cursor-pointer"
                    onClick={() => {
                      setActiveHabitForHistory(habit);
                      setHistoryModalOpen(true);
                    }}
                  >
                    <History className="h-3.5 w-3.5" /> History
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add Habit Modal */}
      <Dialog open={addModalOpen} onOpenChange={setAddModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Bad Habit Tracker</DialogTitle>
            <DialogDescription>
              Set up a clean streak goal for a habit you want to quit (Default goal: 90 days for full habit re-wiring).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="htitle">Habit Name</Label>
              <Input
                id="htitle"
                placeholder="e.g. Quit Smoking, Digital Detox, No Sugar"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hdesc">Description / Personal Why (Optional)</Label>
              <Textarea
                id="hdesc"
                placeholder="Why do you want to quit? e.g. To improve health, save money, regain focus"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="htarget">Target Goal (Days)</Label>
                <Input
                  id="htarget"
                  type="number"
                  min={1}
                  max={1000}
                  value={targetDays}
                  onChange={(e) => setTargetDays(parseInt(e.target.value) || 90)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="hstart">Clean Start Date</Label>
                <Input
                  id="hstart"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() =>
                createHabitMutation.mutate({
                  title,
                  description,
                  target_days: targetDays,
                  start_date: startDate,
                })
              }
              disabled={!title.trim() || createHabitMutation.isPending}
            >
              Start Recovery Goal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Day Journal Modal */}
      <Dialog open={journalModalOpen} onOpenChange={setJournalModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" /> Day Journal Log - {activeHabitForLog?.title}
            </DialogTitle>
            <DialogDescription>
              Record how your day went and reflect on urges or triumphs today (+50 XP earned per check-in).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Struggle Severity Level</Label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "easy", label: "🟢 Easy / Smooth", color: "border-green-500 bg-green-500/10 text-green-600" },
                  { id: "moderate", label: "🟡 Moderate Urges", color: "border-amber-500 bg-amber-500/10 text-amber-600" },
                  { id: "tough", label: "🔴 Tough Struggle", color: "border-rose-500 bg-rose-500/10 text-rose-600" },
                ].map((lvl) => (
                  <button
                    key={lvl.id}
                    type="button"
                    onClick={() => setStruggleLevel(lvl.id as any)}
                    className={`p-2.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                      struggleLevel === lvl.id ? `${lvl.color} ring-2 ring-primary` : "border-border hover:bg-accent"
                    }`}
                  >
                    {lvl.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Triggers Faced Today</Label>
              <div className="flex flex-wrap gap-1.5">
                {["Stress", "Boredom", "Late Night", "Social Pressure", "Fatigue", "Anxiety", "Habitual Cue"].map((trig) => {
                  const sel = selectedTriggers.includes(trig);
                  return (
                    <button
                      key={trig}
                      type="button"
                      onClick={() => toggleTrigger(trig)}
                      className={`px-2.5 py-1 text-xs rounded-full border transition-colors cursor-pointer ${
                        sel ? "bg-primary text-primary-foreground border-primary" : "bg-muted hover:bg-accent"
                      }`}
                    >
                      {trig}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="jnotes">Journal Notes / Reflections</Label>
              <Textarea
                id="jnotes"
                placeholder="How did you manage urges today? What helped you stay clean?"
                value={journalNotes}
                onChange={(e) => setJournalNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() =>
                journalMutation.mutate({
                  id: activeHabitForLog.id,
                  log: {
                    date: ymd(new Date()),
                    struggle_level: struggleLevel,
                    notes: journalNotes,
                    triggers: selectedTriggers,
                  },
                })
              }
              disabled={journalMutation.isPending}
            >
              Save Journal Entry (+50 XP)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Relapse Dialog */}
      <Dialog open={relapseModalOpen} onOpenChange={setRelapseModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <RotateCcw className="h-5 w-5" /> Mark Relapse & Try Again from Day 1
            </DialogTitle>
            <DialogDescription>
              Relapses are learning opportunities, not failures. Your clean attempt will be saved into history and your streak will restart cleanly from Day 1.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-2">
              <Label htmlFor="relReason">Optional Reflection: What triggered this relapse?</Label>
              <Textarea
                id="relReason"
                placeholder="e.g. High stress situation, social pressure..."
                value={relapseReason}
                onChange={(e) => setRelapseReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRelapseModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="default"
              className="bg-amber-600 hover:bg-amber-700 text-white"
              onClick={() =>
                relapseMutation.mutate({
                  id: activeHabitForRelapse.id,
                  reason: relapseReason,
                })
              }
              disabled={relapseMutation.isPending}
            >
              Restart Clean (Day 1)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* History Modal */}
      <Dialog open={historyModalOpen} onOpenChange={setHistoryModalOpen}>
        <DialogContent className="sm:max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5 text-primary" /> Attempt History & Journal Logs - {activeHabitForHistory?.title}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-2">
            {/* Past Attempts */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Past Attempts History</h4>
              {activeHabitForHistory?.attempts && activeHabitForHistory.attempts.length > 0 ? (
                <div className="space-y-2">
                  {activeHabitForHistory.attempts.map((att: any, idx: number) => (
                    <div key={idx} className="p-3 rounded-lg border bg-muted/30 text-xs flex items-center justify-between">
                      <div>
                        <span className="font-semibold text-foreground">Attempt #{att.attempt_number}</span>
                        <div className="text-muted-foreground">{att.start_date} → {att.end_date}</div>
                        {att.relapse_reason && <div className="text-amber-600 italic mt-0.5">"{att.relapse_reason}"</div>}
                      </div>
                      <Badge variant="outline" className="font-mono font-bold text-primary">
                        {att.days_achieved} Days Clean
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic">No past relapses recorded for this habit. Great job!</p>
              )}
            </div>

            {/* Daily Journal Logs */}
            <div className="space-y-2 pt-2 border-t">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Journal & Reflection Logs</h4>
              {historyLogs && historyLogs.length > 0 ? (
                <div className="space-y-2">
                  {historyLogs.map((log: any) => (
                    <div key={log.id} className="p-3 rounded-lg border bg-background text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold">{log.date}</span>
                        <Badge
                          variant="outline"
                          className={
                            log.struggle_level === "easy"
                              ? "text-green-600 border-green-300"
                              : log.struggle_level === "moderate"
                              ? "text-amber-600 border-amber-300"
                              : "text-rose-600 border-rose-300"
                          }
                        >
                          {log.struggle_level.toUpperCase()}
                        </Badge>
                      </div>
                      {log.notes && <p className="text-foreground mt-1">{log.notes}</p>}
                      {log.triggers && log.triggers.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-1">
                          {log.triggers.map((tr: string, tIdx: number) => (
                            <span key={tIdx} className="px-1.5 py-0.5 rounded bg-muted text-[10px] text-muted-foreground">
                              #{tr}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic">No journal entries logged yet.</p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* SOS Breathing & Urge Surfing Modal */}
      <Dialog open={sosModalOpen} onOpenChange={setSosModalOpen}>
        <DialogContent className="text-center sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-center gap-2 text-rose-500">
              <Wind className="h-5 w-5" /> Urge Surfing & Breathing Helper
            </DialogTitle>
            <DialogDescription>
              Cravings peak and pass like ocean waves. Follow the breathing circle to calm your nervous system.
            </DialogDescription>
          </DialogHeader>
          <div className="py-6 flex flex-col items-center justify-center space-y-6">
            {/* Animated Circle */}
            <div
              className={`w-36 h-36 rounded-full border-4 flex items-center justify-center transition-all duration-1000 ${
                breathPhase === "Inhale"
                  ? "scale-110 border-primary bg-primary/10 text-primary"
                  : breathPhase === "Hold"
                  ? "scale-100 border-amber-500 bg-amber-500/10 text-amber-600"
                  : "scale-90 border-blue-500 bg-blue-500/10 text-blue-600"
              }`}
            >
              <div className="text-center">
                <div className="text-xl font-bold tracking-wide uppercase">{breathPhase}</div>
                <div className="text-3xl font-mono font-black mt-1">{timerSeconds}s</div>
              </div>
            </div>

            <p className="text-xs text-muted-foreground italic max-w-xs mx-auto">
              "This urge is a temporary chemical signal in my brain. It will peak within 3-5 minutes and subside."
            </p>
          </div>
          <DialogFooter className="sm:justify-center">
            <Button variant="outline" onClick={() => setSosModalOpen(false)}>
              I Feel Calm Now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
