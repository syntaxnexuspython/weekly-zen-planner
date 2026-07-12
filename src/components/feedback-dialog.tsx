import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api } from "@/lib/api";
import type { FeedbackType } from "@/types";
import { toast } from "sonner";
import { MessageSquare, AlertTriangle, Lightbulb, Heart, HelpCircle } from "lucide-react";

export function FeedbackDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [type, setType] = useState<FeedbackType>("feedback");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const icons: Record<FeedbackType, React.ReactNode> = {
    feedback: <MessageSquare className="h-5 w-5 text-indigo-500" />,
    report: <AlertTriangle className="h-5 w-5 text-red-500" />,
    suggestion: <Lightbulb className="h-5 w-5 text-amber-500" />,
    appreciation: <Heart className="h-5 w-5 text-rose-500 animate-pulse" />,
    contact: <HelpCircle className="h-5 w-5 text-sky-500" />,
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    setIsSubmitting(true);
    try {
      await api.submitFeedback(type, title, content);
      toast.success("Feedback submitted! Thank you for helping us improve Zen Planner. 🧘");
      setTitle("");
      setContent("");
      setType("feedback");
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to submit feedback. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-semibold">
            {icons[type]}
            <span>Send Feedback / Request</span>
          </DialogTitle>
          <DialogDescription className="text-xs">
            Submit a question, report a bug, make a suggestion, or let us know what you appreciate!
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="feedback-type">Feedback Category</Label>
            <Select
              value={type}
              onValueChange={(val) => setType(val as FeedbackType)}
            >
              <SelectTrigger id="feedback-type" className="w-full">
                <SelectValue placeholder="Select feedback type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="feedback">General Feedback</SelectItem>
                <SelectItem value="suggestion">Suggestion / Feature Request</SelectItem>
                <SelectItem value="report">Report a Bug / Issue</SelectItem>
                <SelectItem value="appreciation">Appreciation / Love</SelectItem>
                <SelectItem value="contact">Contact Support / Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="feedback-title">Subject</Label>
            <Input
              id="feedback-title"
              placeholder="E.g., Bug with streak freezes, Suggestion for dark mode..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              maxLength={200}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="feedback-content">Details</Label>
            <Textarea
              id="feedback-content"
              placeholder="Describe your request, issue, or feedback in detail..."
              className="min-h-[100px] resize-none"
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
              onClick={() => onOpenChange(false)}
              className="cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-primary hover:bg-primary/95 text-white font-semibold cursor-pointer shadow-sm"
            >
              {isSubmitting ? "Submitting..." : "Send Feedback"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
