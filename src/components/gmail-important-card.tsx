import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, ymd } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Mail,
  Sparkles,
  RefreshCw,
  Plus,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import type { ImportantEmailItem } from "@/types";

export function GmailImportantCard() {
  const qc = useQueryClient();
  const [analyzing, setAnalyzing] = useState(false);

  // Fetch Gmail status
  const { data: status, refetch: refetchStatus } = useQuery({
    queryKey: ["gmailStatus"],
    queryFn: api.getGmailStatus,
  });

  // Fetch / analyze important emails
  const {
    data: importantItems = [],
    isLoading: isLoadingEmails,
    refetch: refetchEmails,
  } = useQuery({
    queryKey: ["importantGmailToday"],
    queryFn: api.getImportantGmailToday,
    enabled: !!status?.connected,
  });

  // Connect Gmail handler
  const handleConnect = async () => {
    try {
      const authUrl = await api.getGmailAuthUrl();
      if (authUrl) {
        window.location.href = authUrl;
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to initiate Gmail connection");
    }
  };

  // Disconnect handler
  const handleDisconnect = async () => {
    try {
      await api.disconnectGmail();
      refetchStatus();
      qc.invalidateQueries({ queryKey: ["importantGmailToday"] });
      toast.success("Gmail account disconnected");
    } catch (e: any) {
      toast.error(e.message || "Failed to disconnect Gmail");
    }
  };

  // Manual trigger to re-analyze with Groq AI
  const handleAnalyze = async () => {
    setAnalyzing(true);
    try {
      await refetchEmails();
      toast.success("Groq AI analysis refreshed!");
    } catch (e: any) {
      toast.error(e.message || "Failed to analyze messages");
    } finally {
      setAnalyzing(false);
    }
  };

  // Convert email item to task
  const convertMutation = useMutation({
    mutationFn: (item: ImportantEmailItem) =>
      api.convertGmailToTask({
        title: item.suggested_task_title,
        description: `[From Email: ${item.sender}]\nSubject: ${item.subject}\n\n${item.suggested_task_description}`,
        date: item.date || ymd(new Date()),
        startTime: item.suggested_start_time || "10:00",
        endTime: item.suggested_end_time || "11:00",
        priority: item.urgency,
      }),
    onSuccess: (newTask) => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      toast.success(`Task "${newTask.title}" added to your planner! 🎉`);
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to add task");
    },
  });

  const urgencyColor = {
    high: "bg-rose-500/10 text-rose-600 border-rose-500/20 dark:bg-rose-500/20 dark:text-rose-400",
    medium: "bg-amber-500/10 text-amber-600 border-amber-500/20 dark:bg-amber-500/20 dark:text-amber-400",
    low: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:bg-emerald-500/20 dark:text-emerald-400",
  };

  return (
    <Card className="w-full overflow-hidden border-indigo-500/20 bg-gradient-to-br from-indigo-500/[0.03] via-background to-purple-500/[0.03]">
      <CardHeader className="pb-3 flex flex-row items-center justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <Mail className="h-5 w-5" />
            </div>
            <CardTitle className="text-lg font-bold tracking-tight">
              Today's Important Messages
            </CardTitle>
            <Badge variant="outline" className="gap-1 bg-purple-500/10 text-purple-600 border-purple-500/20 text-[10px] font-semibold">
              <Sparkles className="h-3 w-3 animate-pulse" /> Groq AI Filter
            </Badge>
          </div>
          <CardDescription className="text-xs mt-1">
            Automated intelligence that parses incoming emails and highlights actionable items for today.
          </CardDescription>
        </div>

        <div className="flex items-center gap-2">
          {status?.connected ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleAnalyze}
                disabled={analyzing || isLoadingEmails}
                className="h-8 text-xs cursor-pointer gap-1.5"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${analyzing || isLoadingEmails ? "animate-spin" : ""}`} />
                Analyze Messages
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDisconnect}
                className="h-8 text-xs text-muted-foreground hover:text-destructive cursor-pointer"
              >
                Disconnect
              </Button>
            </>
          ) : (
            <Button
              size="sm"
              onClick={handleConnect}
              className="h-8 text-xs cursor-pointer gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
            >
              <Zap className="h-3.5 w-3.5 fill-current" />
              Connect Gmail
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Feature disabled by Admin notice */}
        {status?.feature_enabled === false && (
          <div className="p-4 rounded-lg border border-amber-500/30 bg-amber-500/10 flex items-center gap-3 text-xs text-amber-700 dark:text-amber-400">
            <AlertCircle className="h-5 w-5 shrink-0 text-amber-600" />
            <div>
              <span className="font-bold">Feature Disabled by Administrator</span>
              <p className="text-muted-foreground mt-0.5">
                The Gmail + Groq AI integration is currently turned off system-wide by your administrator.
              </p>
            </div>
          </div>
        )}

        {/* Connection status banner */}
        {status?.feature_enabled !== false && !status?.connected && (
          <div className="p-4 rounded-lg border border-indigo-500/20 bg-indigo-500/5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-5 w-5 text-indigo-500 shrink-0" />
              <div className="text-xs">
                <span className="font-semibold text-foreground">Gmail Not Connected</span>
                <p className="text-muted-foreground">
                  Connect your Gmail account to let Groq AI automatically extract urgent emails into tasks.
                </p>
              </div>
            </div>
            <Button
              size="sm"
              onClick={handleConnect}
              className="text-xs cursor-pointer bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              Connect Gmail
            </Button>
          </div>
        )}

        {status?.connected && (
          <div className="flex items-center justify-between text-xs text-muted-foreground px-1 pb-1 border-b border-border/50">
            <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Connected as <strong className="text-foreground">{status.email}</strong></span>
            </div>
            <span>{importantItems.length} important item(s) found</span>
          </div>
        )}

        {/* List of important messages */}
        {isLoadingEmails || analyzing ? (
          <div className="py-8 text-center space-y-2">
            <RefreshCw className="h-6 w-6 animate-spin mx-auto text-indigo-500" />
            <p className="text-xs text-muted-foreground">Groq AI is analyzing today's emails...</p>
          </div>
        ) : importantItems.length === 0 ? (
          <div className="py-6 text-center text-xs text-muted-foreground space-y-1">
            <p>No urgent tasks or important messages detected for today.</p>
            <p className="text-[11px] text-muted-foreground/70">Enjoy your clear inbox! 🧘</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-1 md:grid-cols-2">
            {importantItems.map((item) => (
              <div
                key={item.id}
                className="group p-3.5 rounded-lg border bg-card hover:border-indigo-500/30 transition-all shadow-sm space-y-2.5 flex flex-col justify-between"
              >
                <div className="space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[11px] font-semibold text-muted-foreground truncate max-w-[200px]">
                      {item.sender}
                    </span>
                    <Badge variant="outline" className={`text-[10px] uppercase font-bold tracking-wider shrink-0 ${urgencyColor[item.urgency]}`}>
                      {item.urgency} priority
                    </Badge>
                  </div>

                  <h5 className="text-sm font-semibold tracking-tight text-foreground line-clamp-1">
                    {item.subject}
                  </h5>

                  <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed bg-muted/30 p-2 rounded border border-muted/50 italic">
                    "{item.snippet}"
                  </p>
                </div>

                <div className="pt-2 border-t border-border/40 flex items-center justify-between gap-2">
                  <span className="text-[10px] text-muted-foreground font-medium">
                    Suggested: {item.suggested_start_time}–{item.suggested_end_time}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={convertMutation.isPending}
                    onClick={() => convertMutation.mutate(item)}
                    className="h-7 text-xs gap-1 border-indigo-500/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/10 cursor-pointer font-medium"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add as Task
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
