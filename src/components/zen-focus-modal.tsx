import { useState, useEffect, useRef } from "react";
import type { Task, Subtask } from "@/types";
import { addXP } from "@/lib/gamification";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Play, Pause, RotateCcw, CheckCircle, Volume2, VolumeX, Sparkles, Clock, CheckSquare, Square } from "lucide-react";
import { toast } from "sonner";

interface ZenFocusModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: Task | null;
  onCompleteTask?: (task: Task) => void;
}

export function ZenFocusModal({ open, onOpenChange, task, onCompleteTask }: ZenFocusModalProps) {
  const DEFAULT_FOCUS_TIME = 25 * 60; // 25 minutes in seconds
  const [timeLeft, setTimeLeft] = useState(DEFAULT_FOCUS_TIME);
  const [isRunning, setIsRunning] = useState(false);
  const [ambientSound, setAmbientSound] = useState(false);
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);

  // Web Audio ambient sound synthesizer ref
  const audioCtxRef = useRef<AudioContext | null>(null);
  const noiseNodeRef = useRef<AudioNode | null>(null);

  useEffect(() => {
    if (task) {
      setSubtasks(task.subtasks || []);
      setTimeLeft(DEFAULT_FOCUS_TIME);
      setIsRunning(false);
    }
  }, [task, open]);

  // Timer countdown
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isRunning && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && isRunning) {
      setIsRunning(false);
      handleFinishSession();
    }
    return () => clearInterval(timer);
  }, [isRunning, timeLeft]);

  // Web Audio ambient sound toggle
  useEffect(() => {
    if (ambientSound && isRunning) {
      try {
        if (!audioCtxRef.current) {
          const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
          audioCtxRef.current = new AudioContextClass();
        }
        const ctx = audioCtxRef.current;
        if (ctx.state === "suspended") {
          ctx.resume();
        }
        // Create soft pink/brown ambient noise
        const bufferSize = ctx.sampleRate * 2;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1;
          b0 = 0.99886 * b0 + white * 0.0555179;
          b1 = 0.99332 * b1 + white * 0.0750759;
          b2 = 0.96900 * b2 + white * 0.1538520;
          b3 = 0.86650 * b3 + white * 0.3104856;
          b4 = 0.55000 * b4 + white * 0.5329522;
          b5 = -0.7616 * b5 - white * 0.0168980;
          data[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
          data[i] *= 0.03; // Soft volume
          b6 = white * 0.115926;
        }
        const noise = ctx.createBufferSource();
        noise.buffer = buffer;
        noise.loop = true;
        const gain = ctx.createGain();
        gain.gain.value = 0.15;
        noise.connect(gain);
        gain.connect(ctx.destination);
        noise.start();
        noiseNodeRef.current = noise;
      } catch (e) {
        console.warn("Web Audio ambient failed:", e);
      }
    } else {
      if (noiseNodeRef.current) {
        try {
          (noiseNodeRef.current as any).stop();
          noiseNodeRef.current.disconnect();
        } catch {}
        noiseNodeRef.current = null;
      }
    }

    return () => {
      if (noiseNodeRef.current) {
        try {
          (noiseNodeRef.current as any).stop();
          noiseNodeRef.current.disconnect();
        } catch {}
        noiseNodeRef.current = null;
      }
    };
  }, [ambientSound, isRunning]);

  const handleFinishSession = () => {
    addXP(100, "Completed Zen Focus Session");
    toast.success("✨ Zen Focus Session Completed! +100 XP Earned! 🎉");
  };

  const handleToggleSubtask = (id: string) => {
    setSubtasks((prev) =>
      prev.map((sub) => (sub.id === id ? { ...sub, completed: !sub.completed } : sub))
    );
  };

  const handleCompleteTaskClick = () => {
    if (!task) return;
    addXP(50, "Task Completed");
    onCompleteTask?.({ ...task, subtasks });
    onOpenChange(false);
    toast.success(`🎉 Completed task "${task.title}" and earned +50 XP!`);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  const progressPct = ((DEFAULT_FOCUS_TIME - timeLeft) / DEFAULT_FOCUS_TIME) * 100;

  if (!task) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] bg-background/95 backdrop-blur-xl border border-primary/20 shadow-2xl">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <Badge variant="outline" className="gap-1 border-primary/40 text-primary bg-primary/10">
              <Sparkles className="h-3.5 w-3.5 animate-pulse" /> Zen Focus Mode
            </Badge>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full"
              onClick={() => setAmbientSound(!ambientSound)}
              title={ambientSound ? "Mute Ambient Noise" : "Play Ambient Noise"}
            >
              {ambientSound ? <Volume2 className="h-4 w-4 text-primary" /> : <VolumeX className="h-4 w-4 text-muted-foreground" />}
            </Button>
          </div>
          <DialogTitle className="text-xl font-bold mt-2">{task.title}</DialogTitle>
          <DialogDescription className="line-clamp-2">
            {task.description || "Stay focused and enter the flow state."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center justify-center my-6 space-y-6">
          {/* Timer Circle / Counter */}
          <div className="relative flex flex-col items-center justify-center w-52 h-52 rounded-full border-4 border-primary/20 bg-primary/5 shadow-inner">
            <div className="text-4xl font-extrabold tracking-widest font-mono text-primary">
              {formatTime(timeLeft)}
            </div>
            <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <Clock className="h-3 w-3" /> Focus Timer
            </div>
          </div>

          <Progress value={progressPct} className="w-full h-2" />

          {/* Controls */}
          <div className="flex items-center gap-3">
            <Button
              size="lg"
              variant={isRunning ? "secondary" : "default"}
              className="w-32 gap-2 font-semibold shadow-md"
              onClick={() => setIsRunning(!isRunning)}
            >
              {isRunning ? (
                <>
                  <Pause className="h-4 w-4" /> Pause
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 fill-current" /> Start Focus
                </>
              )}
            </Button>
            <Button
              size="icon"
              variant="outline"
              onClick={() => {
                setIsRunning(false);
                setTimeLeft(DEFAULT_FOCUS_TIME);
              }}
              title="Reset Timer"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Interactive Subtasks Section */}
        {subtasks.length > 0 && (
          <div className="space-y-2 border-t pt-4 border-border/60">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
              <span>Subtasks Progress</span>
              <span>
                {subtasks.filter((s) => s.completed).length} / {subtasks.length}
              </span>
            </h4>
            <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
              {subtasks.map((sub) => (
                <button
                  key={sub.id}
                  type="button"
                  onClick={() => handleToggleSubtask(sub.id)}
                  className="w-full flex items-center gap-2.5 p-2 rounded-lg text-xs hover:bg-accent/50 transition-colors text-left"
                >
                  {sub.completed ? (
                    <CheckSquare className="h-4 w-4 text-emerald-500 shrink-0" />
                  ) : (
                    <Square className="h-4 w-4 text-muted-foreground shrink-0" />
                  )}
                  <span className={sub.completed ? "line-through text-muted-foreground" : "text-foreground"}>
                    {sub.title}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="pt-2 flex justify-end gap-2 border-t border-border/40">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button onClick={handleCompleteTaskClick} className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white">
            <CheckCircle className="h-4 w-4" /> Mark Complete (+50 XP)
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
