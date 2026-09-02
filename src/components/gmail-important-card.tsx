import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, ymd } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Mail,
  Sparkles,
  RefreshCw,
  Plus,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Zap,
  Inbox,
  Search,
  Clock,
  User,
  Filter,
  BookOpen,
  ExternalLink,
  Copy,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import type { ImportantEmailItem, GmailMessageItem } from "@/types";

export function GmailImportantCard() {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<"ai" | "all">("ai");
  const [searchQuery, setSearchQuery] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState<{
    id: string;
    sender: string;
    subject: string;
    date: string;
    snippet: string;
    body?: string;
    urgency?: "high" | "medium" | "low";
    suggested_task_title?: string;
    suggested_task_description?: string;
    suggested_start_time?: string;
    suggested_end_time?: string;
    is_unread?: boolean;
    labels?: string[];
    aiItem?: ImportantEmailItem;
    rawItem?: GmailMessageItem;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Fetch Gmail status
  const { data: status, refetch: refetchStatus } = useQuery({
    queryKey: ["gmailStatus"],
    queryFn: api.getGmailStatus,
  });

  // Fetch AI-analyzed important emails
  const {
    data: importantItems = [],
    isLoading: isLoadingAiEmails,
    refetch: refetchAiEmails,
  } = useQuery({
    queryKey: ["importantGmailToday"],
    queryFn: api.getImportantGmailToday,
    enabled: !!status?.connected,
  });

  // Fetch all recent inbox emails
  const {
    data: allMessages = [],
    isLoading: isLoadingAllMessages,
    refetch: refetchAllMessages,
  } = useQuery({
    queryKey: ["allGmailMessages"],
    queryFn: () => api.getAllGmailMessages(),
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
      qc.invalidateQueries({ queryKey: ["allGmailMessages"] });
      toast.success("Gmail account disconnected");
    } catch (e: any) {
      toast.error(e.message || "Failed to disconnect Gmail");
    }
  };

  // Trigger refresh based on active tab
  const handleRefresh = async () => {
    if (activeTab === "ai") {
      setAnalyzing(true);
      try {
        await refetchAiEmails();
        toast.success("Groq AI analysis refreshed!");
      } catch (e: any) {
        toast.error(e.message || "Failed to analyze messages");
      } finally {
        setAnalyzing(false);
      }
    } else {
      try {
        await refetchAllMessages();
        toast.success("Inbox emails updated!");
      } catch (e: any) {
        toast.error(e.message || "Failed to refresh emails");
      }
    }
  };

  // Convert AI email item to task
  const convertAiMutation = useMutation({
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

  // Convert raw inbox email to task
  const convertRawMutation = useMutation({
    mutationFn: (item: GmailMessageItem) =>
      api.convertGmailToTask({
        title: `Follow up: ${item.subject}`,
        description: `[From: ${item.sender}]\nDate: ${item.date}\n\n${item.snippet}`,
        date: ymd(new Date()),
        startTime: "14:00",
        endTime: "15:00",
        priority: "medium",
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

  const handleOpenEmail = async (params: {
    id: string;
    sender: string;
    subject: string;
    date: string;
    snippet: string;
    body?: string;
    urgency?: "high" | "medium" | "low";
    suggested_task_title?: string;
    suggested_task_description?: string;
    suggested_start_time?: string;
    suggested_end_time?: string;
    is_unread?: boolean;
    labels?: string[];
    aiItem?: ImportantEmailItem;
    rawItem?: GmailMessageItem;
  }) => {
    setSelectedEmail(params);
    if (!params.body || params.body === params.snippet) {
      setLoadingDetail(true);
      try {
        const detail = await api.getGmailMessageDetail(params.id);
        if (detail && detail.body) {
          setSelectedEmail((prev) => (prev && prev.id === params.id ? { ...prev, body: detail.body } : prev));
        }
      } catch {
        // Fall back gracefully to snippet
      } finally {
        setLoadingDetail(false);
      }
    }
  };

  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Email text copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  // Filtered all messages
  const filteredAllMessages = allMessages.filter((msg) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      msg.subject.toLowerCase().includes(q) ||
      msg.sender.toLowerCase().includes(q) ||
      msg.snippet.toLowerCase().includes(q)
    );
  });

  return (
    <Card className="w-full overflow-hidden border-indigo-500/20 bg-gradient-to-br from-indigo-500/[0.03] via-background to-purple-500/[0.03]">
      <CardHeader className="pb-3 flex flex-row items-center justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="p-1.5 rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <Mail className="h-5 w-5" />
            </div>
            <CardTitle className="text-lg font-bold tracking-tight">
              Email & AI Assistant
            </CardTitle>
            <Badge variant="outline" className="gap-1 bg-purple-500/10 text-purple-600 border-purple-500/20 text-[10px] font-semibold">
              <Sparkles className="h-3 w-3 animate-pulse" /> Groq AI Enabled
            </Badge>
          </div>
          <CardDescription className="text-xs mt-1">
            Browse all incoming inbox messages or view high-priority emails analyzed with AI.
          </CardDescription>
        </div>

        <div className="flex items-center gap-2">
          {status?.connected ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={analyzing || isLoadingAiEmails || isLoadingAllMessages}
                className="h-8 text-xs cursor-pointer gap-1.5"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${analyzing || isLoadingAiEmails || isLoadingAllMessages ? "animate-spin" : ""}`} />
                {activeTab === "ai" ? "Re-Analyze AI" : "Refresh Inbox"}
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
                  Connect your Gmail account to let Groq AI extract urgent emails into tasks or view all messages.
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
          <div className="space-y-3">
            {/* Account bar & View Switcher */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 pb-2 border-b border-border/50">
              {/* Tabs */}
              <div className="flex items-center gap-1.5 p-1 bg-muted/60 rounded-lg border border-border/40">
                <button
                  type="button"
                  onClick={() => setActiveTab("ai")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
                    activeTab === "ai"
                      ? "bg-background text-indigo-600 dark:text-indigo-400 shadow-xs font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Important with AI</span>
                  {importantItems.length > 0 && (
                    <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 font-bold">
                      {importantItems.length}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("all")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
                    activeTab === "all"
                      ? "bg-background text-indigo-600 dark:text-indigo-400 shadow-xs font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Inbox className="h-3.5 w-3.5" />
                  <span>All Emails</span>
                  {allMessages.length > 0 && (
                    <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-muted text-muted-foreground font-bold">
                      {allMessages.length}
                    </span>
                  )}
                </button>
              </div>

              {/* Status info */}
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                <span>Connected as <strong className="text-foreground font-medium">{status.email}</strong></span>
              </div>
            </div>

            {/* TAB 1: AI Important Emails */}
            {activeTab === "ai" && (
              <div className="space-y-3">
                {isLoadingAiEmails || analyzing ? (
                  <div className="py-8 text-center space-y-2">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto text-indigo-500" />
                    <p className="text-xs text-muted-foreground">Groq AI is analyzing today's emails for urgent tasks...</p>
                  </div>
                ) : importantItems.length === 0 ? (
                  <div className="py-8 text-center text-xs text-muted-foreground space-y-2 bg-muted/20 rounded-lg border border-dashed border-border/60">
                    <Sparkles className="h-5 w-5 mx-auto text-muted-foreground/60" />
                    <p className="font-medium text-foreground">No urgent action items detected for today.</p>
                    <p className="text-[11px] text-muted-foreground/70">
                      Switch to the <strong>All Emails</strong> tab to browse all incoming messages.
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-1 md:grid-cols-2">
                    {importantItems.map((item) => (
                      <div
                        key={item.id}
                        className="group p-3.5 rounded-lg border bg-card hover:border-indigo-500/30 transition-all shadow-xs space-y-2.5 flex flex-col justify-between"
                      >
                        <div
                          className="space-y-1.5 cursor-pointer"
                          onClick={() => handleOpenEmail({ ...item, aiItem: item })}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-[11px] font-semibold text-muted-foreground truncate max-w-[200px]">
                              {item.sender}
                            </span>
                            <Badge variant="outline" className={`text-[10px] uppercase font-bold tracking-wider shrink-0 ${urgencyColor[item.urgency]}`}>
                              {item.urgency} priority
                            </Badge>
                          </div>

                          <h5 className="text-sm font-semibold tracking-tight text-foreground line-clamp-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                            {item.subject}
                          </h5>

                          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed bg-muted/30 p-2 rounded border border-muted/50 italic">
                            "{item.snippet}"
                          </p>
                        </div>

                        <div className="pt-2 border-t border-border/40 flex items-center justify-between gap-2">
                          <span className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {item.suggested_start_time}–{item.suggested_end_time}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleOpenEmail({ ...item, aiItem: item })}
                              className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground cursor-pointer px-2"
                            >
                              <BookOpen className="h-3.5 w-3.5" /> Read
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={convertAiMutation.isPending}
                              onClick={() => convertAiMutation.mutate(item)}
                              className="h-7 text-xs gap-1 border-indigo-500/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/10 cursor-pointer font-medium"
                            >
                              <Plus className="h-3.5 w-3.5" /> Add as Task
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: All Emails */}
            {activeTab === "all" && (
              <div className="space-y-3">
                {/* Search / Filter Bar */}
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      placeholder="Search emails by sender, subject, or keywords..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-8 h-8 text-xs bg-background/50"
                    />
                  </div>
                  {searchQuery && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSearchQuery("")}
                      className="h-8 text-xs text-muted-foreground px-2"
                    >
                      Clear
                    </Button>
                  )}
                </div>

                {isLoadingAllMessages ? (
                  <div className="py-8 text-center space-y-2">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto text-indigo-500" />
                    <p className="text-xs text-muted-foreground">Loading inbox emails...</p>
                  </div>
                ) : filteredAllMessages.length === 0 ? (
                  <div className="py-8 text-center text-xs text-muted-foreground space-y-1 bg-muted/20 rounded-lg border border-dashed border-border/60">
                    <Mail className="h-5 w-5 mx-auto text-muted-foreground/60" />
                    <p className="font-medium text-foreground">
                      {searchQuery ? "No emails match your search." : "No emails found in inbox."}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                    {filteredAllMessages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`p-3 rounded-lg border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                          msg.is_unread
                            ? "bg-card border-indigo-500/30 shadow-xs"
                            : "bg-card/60 border-border/50 hover:border-border"
                        }`}
                      >
                        <div
                          className="space-y-1 min-w-0 flex-1 cursor-pointer"
                          onClick={() => handleOpenEmail({ ...msg, rawItem: msg })}
                        >
                          <div className="flex items-center gap-2 flex-wrap">
                            <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground truncate max-w-[240px]">
                              <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                              <span className="truncate">{msg.sender}</span>
                            </div>
                            {msg.is_unread && (
                              <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-indigo-500/10 text-indigo-600 border-indigo-500/20 font-bold uppercase">
                                New
                              </Badge>
                            )}
                            <span className="text-[10px] text-muted-foreground ml-auto sm:ml-0">
                              {msg.date}
                            </span>
                          </div>

                          <h6 className="text-xs font-semibold text-foreground line-clamp-1 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                            {msg.subject}
                          </h6>

                          <p className="text-[11px] text-muted-foreground line-clamp-1">
                            {msg.snippet}
                          </p>
                        </div>

                        <div className="shrink-0 flex items-center gap-1.5 self-end sm:self-center">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleOpenEmail({ ...msg, rawItem: msg })}
                            className="h-7 text-[11px] gap-1 text-muted-foreground hover:text-foreground cursor-pointer px-2"
                          >
                            <BookOpen className="h-3 w-3" /> Read
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={convertRawMutation.isPending}
                            onClick={() => convertRawMutation.mutate(msg)}
                            className="h-7 text-[11px] gap-1 border-border/80 hover:border-indigo-500/30 hover:bg-indigo-500/5 text-foreground cursor-pointer"
                          >
                            <Plus className="h-3 w-3" /> Add Task
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>

      {/* Full Read Email Dialog */}
      <Dialog open={!!selectedEmail} onOpenChange={(open) => !open && setSelectedEmail(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0 overflow-hidden border-indigo-500/20 bg-background sm:rounded-xl">
          {selectedEmail && (
            <>
              {/* Modal Header */}
              <DialogHeader className="px-6 pt-6 pb-3 border-b border-border/50 text-left space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  {selectedEmail.urgency && (
                    <Badge variant="outline" className={`text-[10px] uppercase font-bold tracking-wider ${urgencyColor[selectedEmail.urgency]}`}>
                      {selectedEmail.urgency} priority
                    </Badge>
                  )}
                  {selectedEmail.is_unread && (
                    <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-indigo-500/10 text-indigo-600 border-indigo-500/20 font-bold uppercase">
                      Unread
                    </Badge>
                  )}
                  {selectedEmail.labels?.map((label) => (
                    <Badge key={label} variant="secondary" className="text-[9px] px-1.5 py-0 font-medium">
                      {label}
                    </Badge>
                  ))}
                  <span className="text-[11px] text-muted-foreground ml-auto flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {selectedEmail.date}
                  </span>
                </div>

                <DialogTitle className="text-base sm:text-lg font-bold text-foreground leading-snug break-words">
                  {selectedEmail.subject}
                </DialogTitle>

                <div className="flex items-center justify-between text-xs text-muted-foreground flex-wrap gap-2 pt-1">
                  <div className="flex items-center gap-1.5 font-medium text-foreground">
                    <div className="h-6 w-6 rounded-full bg-indigo-500/10 text-indigo-600 flex items-center justify-center font-bold text-[10px]">
                      {selectedEmail.sender.charAt(0).toUpperCase()}
                    </div>
                    <span>{selectedEmail.sender}</span>
                  </div>

                  <a
                    href={`https://mail.google.com/mail/u/0/#inbox/${selectedEmail.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    Open in Gmail <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </DialogHeader>

              {/* Modal Body / Scrollable Content */}
              <div className="px-6 py-4 overflow-y-auto flex-1 space-y-4 max-h-[50vh]">
                {/* AI Extracted Task Highlights (if applicable) */}
                {selectedEmail.suggested_task_title && (
                  <div className="p-3.5 rounded-lg border border-purple-500/30 bg-purple-500/5 dark:bg-purple-500/10 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-purple-600 dark:text-purple-400">
                        <Sparkles className="h-4 w-4 animate-pulse" />
                        <span>AI Extracted Action Item</span>
                      </div>
                      {selectedEmail.suggested_start_time && (
                        <span className="text-[11px] text-muted-foreground font-medium">
                          Suggested: {selectedEmail.suggested_start_time}–{selectedEmail.suggested_end_time}
                        </span>
                      )}
                    </div>
                    <div className="text-xs font-semibold text-foreground">
                      {selectedEmail.suggested_task_title}
                    </div>
                    {selectedEmail.suggested_task_description && (
                      <div className="text-xs text-muted-foreground leading-relaxed">
                        {selectedEmail.suggested_task_description}
                      </div>
                    )}
                  </div>
                )}

                {/* Email Body */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    <span>Email Content</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopyText(selectedEmail.body || selectedEmail.snippet)}
                      className="h-6 text-[11px] gap-1 px-2 text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                      {copied ? "Copied" : "Copy Content"}
                    </Button>
                  </div>

                  {loadingDetail ? (
                    <div className="py-6 text-center text-xs text-muted-foreground space-y-2">
                      <RefreshCw className="h-5 w-5 animate-spin mx-auto text-indigo-500" />
                      <p>Loading full email...</p>
                    </div>
                  ) : (
                    <div className="p-4 rounded-lg border border-border/60 bg-muted/20 text-xs text-foreground leading-relaxed whitespace-pre-wrap font-sans select-text">
                      {selectedEmail.body || selectedEmail.snippet}
                    </div>
                  )}
                </div>
              </div>

              {/* Modal Footer */}
              <DialogFooter className="px-6 py-3 border-t border-border/50 bg-muted/20 flex flex-row items-center justify-between gap-2 sm:justify-between">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedEmail(null)}
                  className="text-xs cursor-pointer"
                >
                  Close
                </Button>

                <div className="flex items-center gap-2">
                  {selectedEmail.aiItem && (
                    <Button
                      size="sm"
                      disabled={convertAiMutation.isPending}
                      onClick={() => {
                        convertAiMutation.mutate(selectedEmail.aiItem!);
                        setSelectedEmail(null);
                      }}
                      className="text-xs gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5" /> Add as Task
                    </Button>
                  )}

                  {selectedEmail.rawItem && (
                    <Button
                      size="sm"
                      disabled={convertRawMutation.isPending}
                      onClick={() => {
                        convertRawMutation.mutate(selectedEmail.rawItem!);
                        setSelectedEmail(null);
                      }}
                      className="text-xs gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5" /> Add Task to Planner
                    </Button>
                  )}
                </div>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
