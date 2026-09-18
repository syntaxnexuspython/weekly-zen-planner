import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/api";
import type { Feedback, FeedbackType } from "@/types";
import { toast } from "sonner";
import {
  MessageSquare,
  AlertTriangle,
  Lightbulb,
  Heart,
  HelpCircle,
  Sparkles,
  CheckCircle2,
  Clock,
  Send,
  History,
  ShieldAlert,
} from "lucide-react";

export function FeedbackDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<"submit" | "history">("submit");
  const [type, setType] = useState<FeedbackType>("feedback");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [latestAiReply, setLatestAiReply] = useState<{
    reply: string;
    is_critical?: boolean;
    title: string;
  } | null>(null);

  const { data: myFeedbacks = [], isLoading: isLoadingHistory } = useQuery({
    queryKey: ["my-feedback"],
    queryFn: api.getMyFeedback,
    enabled: open,
  });

  const icons: Record<FeedbackType, React.ReactNode> = {
    feedback: <MessageSquare className="h-4 w-4 text-indigo-500" />,
    report: <AlertTriangle className="h-4 w-4 text-red-500" />,
    suggestion: <Lightbulb className="h-4 w-4 text-amber-500" />,
    appreciation: <Heart className="h-4 w-4 text-rose-500 animate-pulse" />,
    contact: <HelpCircle className="h-4 w-4 text-sky-500" />,
  };

  const statusColors = {
    pending: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    in_progress: "bg-blue-500/10 text-blue-600 border-blue-500/20",
    resolved: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    acknowledged: "bg-rose-500/10 text-rose-600 border-rose-500/20",
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await api.submitFeedback(type, title, content);
      qc.invalidateQueries({ queryKey: ["my-feedback"] });
      
      if (res.ai_reply) {
        setLatestAiReply({
          reply: res.ai_reply,
          is_critical: res.is_critical,
          title: res.title,
        });
      }

      toast.success(
        res.is_critical
          ? "Critical issue submitted. Alerted admin team with high priority! 🚨"
          : "Feedback submitted! AI Assistant has acknowledged your message. 🧘"
      );

      setTitle("");
      setContent("");
      setType("feedback");
    } catch (err: any) {
      toast.error(err.message || "Failed to submit feedback. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col p-6">
        <DialogHeader className="pb-2 border-b border-border/40">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                <MessageSquare className="h-5 w-5" />
              </div>
              <DialogTitle className="text-lg font-bold">Feedback & Support</DialogTitle>
            </div>
          </div>
          <DialogDescription className="text-xs">
            Send thoughts, report issues, or track AI & Admin replies to your requests.
          </DialogDescription>

          {/* Navigation Tabs */}
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={() => {
                setActiveTab("submit");
                setLatestAiReply(null);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium cursor-pointer transition-all ${
                activeTab === "submit"
                  ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                  : "bg-muted/50 text-muted-foreground hover:text-foreground"
              }`}
            >
              <Send className="h-3.5 w-3.5" />
              <span>Send New</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("history")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium cursor-pointer transition-all ${
                activeTab === "history"
                  ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                  : "bg-muted/50 text-muted-foreground hover:text-foreground"
              }`}
            >
              <History className="h-3.5 w-3.5" />
              <span>My Requests & Responses</span>
              {myFeedbacks.length > 0 && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-background/20 font-bold">
                  {myFeedbacks.length}
                </span>
              )}
            </button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-3 space-y-4">
          {activeTab === "submit" ? (
            <>
              {latestAiReply && (
                <div
                  className={`p-3.5 rounded-lg border text-xs space-y-2 animate-in fade-in slide-in-from-top-2 ${
                    latestAiReply.is_critical
                      ? "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300"
                      : "border-indigo-500/30 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300"
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold">
                    <Sparkles className="h-4 w-4 shrink-0 text-indigo-500" />
                    <span>AI Assistant Automated Response:</span>
                  </div>
                  <p className="leading-relaxed pl-5 whitespace-pre-wrap">{latestAiReply.reply}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-3.5">
                <div className="space-y-1.5">
                  <Label htmlFor="feedback-type">Feedback Category</Label>
                  <Select value={type} onValueChange={(val) => setType(val as FeedbackType)}>
                    <SelectTrigger id="feedback-type" className="w-full text-xs">
                      <SelectValue placeholder="Select feedback type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="feedback">General Feedback</SelectItem>
                      <SelectItem value="suggestion">Suggestion / Feature Request</SelectItem>
                      <SelectItem value="report">Report a Bug / Issue (Critical Triage)</SelectItem>
                      <SelectItem value="appreciation">Appreciation / Love</SelectItem>
                      <SelectItem value="contact">Contact Support / Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="feedback-title">Subject</Label>
                  <Input
                    id="feedback-title"
                    placeholder="E.g., Dark mode suggestion, streak freeze bug..."
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                    maxLength={200}
                    className="text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="feedback-content">Details</Label>
                  <Textarea
                    id="feedback-content"
                    placeholder="Describe your thoughts, problem details, or ideas clearly..."
                    className="min-h-[110px] resize-none text-xs leading-relaxed"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    required
                    maxLength={2000}
                  />
                </div>

                <DialogFooter className="flex sm:justify-between items-center gap-2 pt-2 border-t mt-4">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => onOpenChange(false)}
                    className="cursor-pointer text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={isSubmitting}
                    className="bg-primary hover:bg-primary/95 text-black font-bold cursor-pointer shadow-sm text-xs gap-1.5"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    {isSubmitting ? "Processing AI..." : "Submit with AI"}
                  </Button>
                </DialogFooter>
              </form>
            </>
          ) : (
            <div className="space-y-3">
              {isLoadingHistory ? (
                <div className="py-12 text-center text-xs text-muted-foreground">
                  Loading your feedback history...
                </div>
              ) : myFeedbacks.length === 0 ? (
                <div className="py-12 text-center text-xs text-muted-foreground space-y-2 bg-muted/20 rounded-lg border border-dashed">
                  <MessageSquare className="h-8 w-8 mx-auto text-muted-foreground/50" />
                  <p className="font-semibold text-foreground">No submissions yet</p>
                  <p>Send a suggestion or bug report to receive AI and Admin responses.</p>
                </div>
              ) : (
                myFeedbacks.map((item) => (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-lg border bg-card hover:border-primary/20 transition-all space-y-2.5 shadow-xs"
                  >
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5 text-xs font-semibold capitalize">
                        {icons[item.type]}
                        <span>{item.type}</span>
                        {item.is_critical && (
                          <Badge variant="outline" className="bg-rose-500/10 text-rose-600 border-rose-500/20 text-[10px] gap-1 font-bold">
                            <ShieldAlert className="h-3 w-3" /> Critical
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {item.type === "appreciation" ? (
                          <Badge
                            variant="outline"
                            className="text-[10px] font-bold border bg-rose-500/10 text-rose-600 border-rose-500/20 flex items-center gap-1"
                          >
                            <Heart className="h-3 w-3 fill-rose-500 text-rose-500" /> Appreciated
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className={`text-[10px] uppercase font-bold border ${
                              statusColors[item.status] || ""
                            }`}
                          >
                            {item.status.replace("_", " ")}
                          </Badge>
                        )}
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(item.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    <div>
                      <h5 className="text-xs font-bold text-foreground">{item.title}</h5>
                      <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap leading-relaxed">
                        {item.content}
                      </p>
                    </div>

                    {/* AI Reply Card */}
                    {item.ai_reply && (
                      <div className="p-2.5 rounded-md bg-indigo-500/5 border border-indigo-500/20 text-xs space-y-1">
                        <span className="font-semibold text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                          <Sparkles className="h-3.5 w-3.5" /> AI Assistant Response:
                        </span>
                        <p className="text-muted-foreground leading-relaxed pl-4 whitespace-pre-wrap">
                          {item.ai_reply}
                        </p>
                      </div>
                    )}

                    {/* Admin Solution Card */}
                    {item.admin_solution && (
                      <div className="p-2.5 rounded-md bg-emerald-500/10 border border-emerald-500/25 text-xs space-y-1">
                        <span className="font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Official Admin Solution:
                        </span>
                        <p className="text-foreground leading-relaxed pl-4 font-medium">
                          {item.admin_solution}
                        </p>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
