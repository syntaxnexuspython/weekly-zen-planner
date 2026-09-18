import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  MessageSquare,
  AlertTriangle,
  Lightbulb,
  Heart,
  HelpCircle,
  Edit2,
  Trash2,
  Sparkles,
  RefreshCw,
  CheckCircle2,
  ShieldAlert,
  Bot,
  Copy,
  Zap,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import type { Feedback, FeedbackStatus, FeedbackType } from "@/types";

export const Route = createFileRoute("/admin/feedback")({
  component: AdminFeedbackManagement,
});

function AdminFeedbackManagement() {
  const qc = useQueryClient();

  const { data: feedbacks = [], isLoading } = useQuery({
    queryKey: ["admin-feedbacks"],
    queryFn: api.adminListFeedback,
  });

  const { data: stats } = useQuery({
    queryKey: ["admin-feedback-stats"],
    queryFn: api.adminGetFeedbackStats,
  });

  const { data: providerConfig } = useQuery({
    queryKey: ["admin-feedback-provider"],
    queryFn: api.adminGetFeedbackProvider,
  });

  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null);
  const [statusVal, setStatusVal] = useState<FeedbackStatus>("pending");
  const [notesVal, setNotesVal] = useState("");
  const [solutionVal, setSolutionVal] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [reanalyzingId, setReanalyzingId] = useState<string | null>(null);
  const [feedbackToDelete, setFeedbackToDelete] = useState<string | null>(null);
  const [copiedSolution, setCopiedSolution] = useState(false);

  const filteredFeedbacks = useMemo(() => {
    return feedbacks.filter((f) => {
      const matchStatus = statusFilter === "all" || f.status === statusFilter;
      const matchType = typeFilter === "all" || f.type === typeFilter;
      const matchSeverity =
        severityFilter === "all" ||
        (severityFilter === "critical" && (f.is_critical || f.severity === "critical")) ||
        f.severity === severityFilter;
      return matchStatus && matchType && matchSeverity;
    });
  }, [feedbacks, statusFilter, typeFilter, severityFilter]);

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      status,
      notes,
      solution,
    }: {
      id: string;
      status: FeedbackStatus;
      notes: string;
      solution: string;
    }) => api.adminUpdateFeedbackStatus(id, status, notes, solution),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-feedbacks"] });
      qc.invalidateQueries({ queryKey: ["admin-feedback-stats"] });
      toast.success("Feedback status & solution updated successfully");
    },
  });

  const reanalyzeMutation = useMutation({
    mutationFn: (id: string) => api.adminReanalyzeFeedback(id),
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: ["admin-feedbacks"] });
      qc.invalidateQueries({ queryKey: ["admin-feedback-stats"] });
      if (selectedFeedback && selectedFeedback.id === updated.id) {
        setSelectedFeedback(updated);
        if (updated.ai_suggested_solution && !solutionVal) {
          setSolutionVal(updated.ai_suggested_solution);
        }
      }
      toast.success("AI Agent re-analyzed feedback successfully!");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to re-analyze feedback");
    },
  });

  const providerMutation = useMutation({
    mutationFn: (provider: string) => api.adminSetFeedbackProvider(provider),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["admin-feedback-provider"] });
      toast.success(`AI Agent provider set to ${res.current_provider.toUpperCase()}`);
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update provider");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.adminDeleteFeedback(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-feedbacks"] });
      qc.invalidateQueries({ queryKey: ["admin-feedback-stats"] });
      toast.success("Feedback item deleted");
    },
  });

  function openManageDialog(feedback: Feedback) {
    setSelectedFeedback(feedback);
    setStatusVal(feedback.status);
    setNotesVal(feedback.admin_notes || "");
    setSolutionVal(feedback.admin_solution || "");
  }

  async function handleUpdateFeedback(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedFeedback) return;
    setIsUpdating(true);
    try {
      await updateMutation.mutateAsync({
        id: selectedFeedback.id,
        status: statusVal,
        notes: notesVal.trim(),
        solution: solutionVal.trim(),
      });
      setSelectedFeedback(null);
    } catch (err: any) {
      toast.error(err.message || "Failed to update feedback");
    } finally {
      setIsUpdating(false);
    }
  }

  async function handleReanalyze(id: string) {
    setReanalyzingId(id);
    try {
      await reanalyzeMutation.mutateAsync(id);
    } finally {
      setReanalyzingId(null);
    }
  }

  async function handleDeleteFeedback(id: string) {
    try {
      await deleteMutation.mutateAsync(id);
      if (selectedFeedback?.id === id) {
        setSelectedFeedback(null);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to delete feedback");
    }
  }

  const categoryIcons: Record<FeedbackType, React.ReactNode> = {
    feedback: <MessageSquare className="h-4 w-4 text-indigo-500" />,
    report: <AlertTriangle className="h-4 w-4 text-red-500" />,
    suggestion: <Lightbulb className="h-4 w-4 text-amber-500" />,
    appreciation: <Heart className="h-4 w-4 text-rose-500" />,
    contact: <HelpCircle className="h-4 w-4 text-sky-500" />,
  };

  const statusColors: Record<FeedbackStatus, string> = {
    pending: "bg-red-500/10 text-red-600 border-red-500/20",
    in_progress: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    resolved: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    acknowledged: "bg-rose-500/10 text-rose-600 border-rose-500/20",
  };

  const severityColors = {
    critical: "bg-rose-500/15 text-rose-600 border-rose-500/30",
    high: "bg-orange-500/10 text-orange-600 border-orange-500/20",
    medium: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    low: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  };

  return (
    <div className="space-y-6">
      {/* Header & Provider Selection */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Bot className="h-6 w-6 text-indigo-500" />
            AI Feedback & Quality Agent
          </h1>
          <p className="text-sm text-muted-foreground">
            Automatic triage, sentiment analysis, user responses, and admin solutions.
          </p>
        </div>

        {/* AI Provider Selector: GEMINI or GROQ */}
        <div className="flex items-center gap-2 p-1.5 rounded-lg border bg-card">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground px-2">
            <Sparkles className="h-3.5 w-3.5 text-purple-500 animate-pulse" />
            <span className="font-semibold text-foreground">AI Engine:</span>
          </div>
          <Select
            value={providerConfig?.current_provider || "groq"}
            onValueChange={(val) => providerMutation.mutate(val)}
          >
            <SelectTrigger className="h-7 text-xs w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="groq">Groq (Ultra-Fast)</SelectItem>
              <SelectItem value="gemini">Google Gemini</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Critical Alert Banner if any unresolved critical reports */}
      {stats && stats.critical_unresolved > 0 && (
        <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-500/10 flex flex-wrap items-center justify-between gap-3 text-rose-700 dark:text-rose-300">
          <div className="flex items-center gap-3">
            <ShieldAlert className="h-6 w-6 shrink-0 text-rose-600 animate-bounce" />
            <div className="text-xs">
              <span className="font-bold text-sm">
                Action Required: {stats.critical_unresolved} Critical Issue(s) Reported!
              </span>
              <p className="text-rose-600/80 dark:text-rose-400 mt-0.5">
                AI Feedback Agent flagged high-priority bugs or blockers that need urgent administrator review.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => {
              setSeverityFilter("critical");
              setStatusFilter("pending");
            }}
            className="bg-rose-600 hover:bg-rose-700 text-white text-xs cursor-pointer"
          >
            Review Critical Only
          </Button>
        </div>
      )}

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <Card className="p-3.5 space-y-1">
          <span className="text-xs text-muted-foreground font-medium">Total Feedback</span>
          <div className="text-2xl font-bold">{stats?.total ?? feedbacks.length}</div>
        </Card>
        <Card className="p-3.5 space-y-1 border-rose-500/20 bg-rose-500/5">
          <span className="text-xs text-rose-600 dark:text-rose-400 font-medium flex items-center gap-1">
            <ShieldAlert className="h-3.5 w-3.5" /> Critical Active
          </span>
          <div className="text-2xl font-bold text-rose-600">{stats?.critical_unresolved ?? 0}</div>
        </Card>
        <Card className="p-3.5 space-y-1">
          <span className="text-xs text-muted-foreground font-medium">Pending Review</span>
          <div className="text-2xl font-bold text-amber-600">{stats?.pending ?? 0}</div>
        </Card>
        <Card className="p-3.5 space-y-1">
          <span className="text-xs text-muted-foreground font-medium">Resolved</span>
          <div className="text-2xl font-bold text-emerald-600">{stats?.resolved ?? 0}</div>
        </Card>
        <Card className="p-3.5 space-y-1">
          <span className="text-xs text-muted-foreground font-medium flex items-center gap-1">
            <Heart className="h-3.5 w-3.5 text-rose-500" /> Positive Love
          </span>
          <div className="text-2xl font-bold text-indigo-600">{stats?.positive_count ?? 0}</div>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="py-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-1">
            <Label className="text-xs font-semibold text-muted-foreground">Status</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-semibold text-muted-foreground">AI Severity</Label>
            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severities</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-semibold text-muted-foreground">Category</Label>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="feedback">General Feedback</SelectItem>
                <SelectItem value="suggestion">Suggestions / Features</SelectItem>
                <SelectItem value="report">Bug Reports</SelectItem>
                <SelectItem value="appreciation">Appreciation</SelectItem>
                <SelectItem value="contact">Contact Support</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table Listing */}
      <Card>
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm font-bold flex items-center justify-between">
            <span>Feedback Queue ({filteredFeedbacks.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          {isLoading ? (
            <div className="text-center py-12 text-sm text-muted-foreground">
              <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-indigo-500" />
              Loading feedback entries...
            </div>
          ) : filteredFeedbacks.length === 0 ? (
            <div className="text-center py-12 text-sm text-muted-foreground">
              No feedback matches the selected filters.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[110px]">Category</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead className="max-w-[220px]">Subject & Message</TableHead>
                  <TableHead>AI Triage</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredFeedbacks.map((item) => (
                  <TableRow
                    key={item.id}
                    className={`hover:bg-accent/10 transition-colors ${
                      item.is_critical && item.status !== "resolved"
                        ? "bg-rose-500/[0.04] border-l-2 border-l-rose-500"
                        : ""
                    }`}
                  >
                    <TableCell>
                      <span className="flex items-center gap-1.5 capitalize font-medium text-xs">
                        {categoryIcons[item.type]}
                        {item.type}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="text-xs font-semibold text-foreground">{item.userName}</div>
                      <div className="text-[11px] text-muted-foreground">{item.userEmail}</div>
                    </TableCell>
                    <TableCell className="max-w-[220px]">
                      <div className="flex items-center gap-1.5">
                        {item.is_critical && (
                          <Badge variant="outline" className="bg-rose-500/10 text-rose-600 border-rose-500/30 text-[9px] font-bold shrink-0">
                            CRITICAL
                          </Badge>
                        )}
                        <span className="font-semibold text-xs text-foreground truncate block">
                          {item.title}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                        {item.content}
                      </p>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Badge
                          variant="outline"
                          className={`text-[9px] uppercase font-bold border ${
                            severityColors[item.severity || "medium"]
                          }`}
                        >
                          {item.severity || "medium"}
                        </Badge>
                        {item.sentiment && (
                          <span className="text-[10px] text-muted-foreground capitalize">
                            {item.sentiment}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(item.createdAt).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </TableCell>
                    <TableCell>
                      {item.type === "appreciation" ? (
                        <Badge
                          variant="outline"
                          className="text-[10px] font-bold border bg-rose-500/10 text-rose-600 border-rose-500/20 flex items-center gap-1 w-fit"
                        >
                          <Heart className="h-3 w-3 fill-rose-500 text-rose-500" /> Appreciated
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className={`capitalize text-[10px] font-bold border ${statusColors[item.status]}`}
                        >
                          {item.status.replace("_", " ")}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openManageDialog(item)}
                          className="h-7 text-xs cursor-pointer gap-1"
                        >
                          <Edit2 className="h-3 w-3" />
                          <span>Triage & Solve</span>
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleReanalyze(item.id)}
                          disabled={reanalyzingId === item.id}
                          className="h-7 w-7 text-indigo-500 hover:text-indigo-600 cursor-pointer"
                          title="Re-analyze with AI"
                        >
                          <Sparkles className={`h-3 w-3 ${reanalyzingId === item.id ? "animate-spin" : ""}`} />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setFeedbackToDelete(item.id)}
                          className="h-7 w-7 text-rose-500 hover:text-rose-600 hover:bg-rose-50/50 cursor-pointer"
                          title="Delete"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Moderation & Solution Dialog */}
      <Dialog open={!!selectedFeedback} onOpenChange={(open) => !open && setSelectedFeedback(null)}>
        <DialogContent className="max-w-xl max-h-[90vh] flex flex-col p-6">
          <DialogHeader className="pb-2 border-b">
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              {selectedFeedback && categoryIcons[selectedFeedback.type]}
              <span>Feedback Triage & Admin Solution</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Review AI diagnostics and provide an official resolution to the user.
            </DialogDescription>
          </DialogHeader>

          {selectedFeedback && (
            <form onSubmit={handleUpdateFeedback} className="flex-1 overflow-y-auto py-2 space-y-4">
              {/* User Metadata Header */}
              <div className="bg-muted/40 rounded-lg p-3 border space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">User:</span>
                  <span className="font-semibold">{selectedFeedback.userName} ({selectedFeedback.userEmail})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Category:</span>
                  <span className="font-semibold capitalize flex items-center gap-1">
                    {categoryIcons[selectedFeedback.type]}
                    {selectedFeedback.type}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Submitted:</span>
                  <span className="font-semibold">{new Date(selectedFeedback.createdAt).toLocaleString()}</span>
                </div>
              </div>

              {/* Feedback Message */}
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-muted-foreground">Subject Title</Label>
                <div className="text-xs font-bold border rounded-md p-2 bg-card">{selectedFeedback.title}</div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-muted-foreground">User Message Content</Label>
                <div className="text-xs leading-relaxed border rounded-md p-2.5 bg-card whitespace-pre-wrap max-h-[120px] overflow-y-auto">
                  {selectedFeedback.content}
                </div>
              </div>

              {/* AI Agent Triage Insights Card */}
              <div className="rounded-lg border border-indigo-500/30 bg-indigo-500/[0.04] p-3.5 space-y-2.5 text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold text-indigo-600 dark:text-indigo-400">
                    <Sparkles className="h-4 w-4" />
                    <span>AI Feedback Agent Triage</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={`text-[9px] uppercase font-bold border ${severityColors[selectedFeedback.severity || "medium"]}`}>
                      {selectedFeedback.severity || "medium"}
                    </Badge>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => handleReanalyze(selectedFeedback.id)}
                      disabled={reanalyzingId === selectedFeedback.id}
                      className="h-6 text-[10px] px-2 text-indigo-600 dark:text-indigo-400 cursor-pointer gap-1"
                    >
                      <RefreshCw className={`h-3 w-3 ${reanalyzingId === selectedFeedback.id ? "animate-spin" : ""}`} />
                      Re-Analyze
                    </Button>
                  </div>
                </div>

                {selectedFeedback.ai_analysis && (
                  <p className="text-muted-foreground leading-relaxed italic bg-background/50 p-2 rounded border border-border/40">
                    "{selectedFeedback.ai_analysis}"
                  </p>
                )}

                {selectedFeedback.ai_suggested_solution && (
                  <div className="space-y-1 pt-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-foreground flex items-center gap-1">
                        <Lightbulb className="h-3.5 w-3.5 text-amber-500" />
                        AI Suggested Solution / Root-Cause:
                      </span>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSolutionVal(selectedFeedback.ai_suggested_solution || "");
                          setCopiedSolution(true);
                          toast.success("AI solution copied to Admin Solution!");
                          setTimeout(() => setCopiedSolution(false), 2000);
                        }}
                        className="h-5 text-[10px] px-1.5 cursor-pointer gap-1"
                      >
                        {copiedSolution ? <Check className="h-2.5 w-2.5 text-emerald-500" /> : <Copy className="h-2.5 w-2.5" />}
                        Copy to Solution
                      </Button>
                    </div>
                    <p className="text-muted-foreground bg-muted/30 p-2 rounded border border-border/40 text-[11px] leading-relaxed">
                      {selectedFeedback.ai_suggested_solution}
                    </p>
                  </div>
                )}

                {selectedFeedback.ai_reply && (
                  <div className="space-y-0.5 text-[11px] text-muted-foreground">
                    <span className="font-medium text-foreground">Automated User Reply Sent:</span>
                    <p className="line-clamp-2 italic">{selectedFeedback.ai_reply}</p>
                  </div>
                )}
              </div>

              {/* Official Admin Solution to User */}
              <div className="space-y-1.5">
                <Label htmlFor="admin-solution" className="text-xs font-bold text-foreground flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  Official Admin Solution / Reply (Visible to User)
                </Label>
                <Textarea
                  id="admin-solution"
                  placeholder="Provide resolution steps, workaround, or official update to the user..."
                  value={solutionVal}
                  onChange={(e) => setSolutionVal(e.target.value)}
                  className="min-h-[80px] text-xs resize-none"
                />
              </div>

              {/* Status Update & Internal Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 border-t pt-3">
                {selectedFeedback.type === "appreciation" ? (
                  <div className="p-2.5 rounded-lg border border-rose-500/20 bg-rose-500/5 text-xs text-rose-600 dark:text-rose-400 flex items-center gap-2 font-medium">
                    <Heart className="h-4 w-4 fill-rose-500 text-rose-500 shrink-0" />
                    <span>User Appreciation — Auto-acknowledged. No ticket workflow needed.</span>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <Label htmlFor="moderation-status" className="text-xs font-semibold">Workflow Status</Label>
                    <Select value={statusVal} onValueChange={(val) => setStatusVal(val as FeedbackStatus)}>
                      <SelectTrigger id="moderation-status" className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="resolved">Resolved (Completed)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-1">
                  <Label htmlFor="admin-notes" className="text-xs font-semibold">Internal Admin Notes</Label>
                  <Textarea
                    id="admin-notes"
                    placeholder="Private notes for team only..."
                    value={notesVal}
                    onChange={(e) => setNotesVal(e.target.value)}
                    className="h-8 min-h-[32px] resize-none py-1.5 text-xs"
                  />
                </div>
              </div>

              <DialogFooter className="flex sm:justify-between items-center gap-2 pt-2 border-t mt-4">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setFeedbackToDelete(selectedFeedback.id)}
                  className="text-rose-500 hover:text-rose-600 hover:bg-rose-50 border-rose-200 cursor-pointer text-xs"
                >
                  <Trash2 className="mr-1 h-3.5 w-3.5" />
                  Delete
                </Button>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedFeedback(null)}
                    className="cursor-pointer text-xs"
                  >
                    Close
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={isUpdating}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer text-xs font-semibold shadow-xs"
                  >
                    {isUpdating ? "Saving..." : "Save Solution & Status"}
                  </Button>
                </div>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Alert */}
      <AlertDialog open={!!feedbackToDelete} onOpenChange={(o) => !o && setFeedbackToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete feedback item?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete this feedback? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (feedbackToDelete) {
                  handleDeleteFeedback(feedbackToDelete);
                }
                setFeedbackToDelete(null);
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
