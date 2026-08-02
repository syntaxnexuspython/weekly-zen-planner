import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { MessageSquare, AlertTriangle, Lightbulb, Heart, HelpCircle, Edit2, Trash2 } from "lucide-react";
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

  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null);
  const [statusVal, setStatusVal] = useState<FeedbackStatus>("pending");
  const [notesVal, setNotesVal] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [feedbackToDelete, setFeedbackToDelete] = useState<string | null>(null);

  const filteredFeedbacks = useMemo(() => {
    return feedbacks.filter((f) => {
      const matchStatus = statusFilter === "all" || f.status === statusFilter;
      const matchType = typeFilter === "all" || f.type === typeFilter;
      return matchStatus && matchType;
    });
  }, [feedbacks, statusFilter, typeFilter]);

  const updateMutation = useMutation({
    mutationFn: ({ id, status, notes }: { id: string; status: FeedbackStatus; notes: string }) =>
      api.adminUpdateFeedbackStatus(id, status, notes),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-feedbacks"] });
      qc.invalidateQueries({ queryKey: ["admin-feedbacks-count"] });
      toast.success("Feedback status updated");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.adminDeleteFeedback(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-feedbacks"] });
      qc.invalidateQueries({ queryKey: ["admin-feedbacks-count"] });
      toast.success("Feedback item deleted");
    },
  });

  function openManageDialog(feedback: Feedback) {
    setSelectedFeedback(feedback);
    setStatusVal(feedback.status);
    setNotesVal(feedback.admin_notes || "");
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
      });
      setSelectedFeedback(null);
    } catch (err: any) {
      toast.error(err.message || "Failed to update feedback");
    } finally {
      setIsUpdating(false);
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
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">User Feedback & Requests</h1>
          <p className="text-sm text-muted-foreground">Review suggestions, support tickets, and bug reports sent by users.</p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="py-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label className="text-xs font-semibold text-muted-foreground">Status Filter</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
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
            <Label className="text-xs font-semibold text-muted-foreground">Category Filter</Label>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger>
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
        <CardHeader>
          <CardTitle className="text-base flex items-center justify-between">
            <span>Feedback Items ({filteredFeedbacks.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {isLoading ? (
            <div className="text-center py-12 text-sm text-muted-foreground">Loading feedback list...</div>
          ) : filteredFeedbacks.length === 0 ? (
            <div className="text-center py-12 text-sm text-muted-foreground">No feedback matches the selected filters.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[120px]">Category</TableHead>
                  <TableHead>User Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead className="max-w-[200px]">Title</TableHead>
                  <TableHead>Submitted Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredFeedbacks.map((item) => (
                  <TableRow key={item.id} className="hover:bg-accent/10 transition-colors">
                    <TableCell>
                      <span className="flex items-center gap-1.5 capitalize font-medium text-xs">
                        {categoryIcons[item.type]}
                        {item.type}
                      </span>
                    </TableCell>
                    <TableCell className="font-medium">{item.userName}</TableCell>
                    <TableCell className="text-muted-foreground">{item.userEmail}</TableCell>
                    <TableCell className="max-w-[200px] truncate font-medium">{item.title}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(item.createdAt).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`capitalize text-[10px] font-semibold border ${statusColors[item.status]}`}>
                        {item.status.replace("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openManageDialog(item)}
                          className="h-8 cursor-pointer flex gap-1 items-center"
                          title="Manage"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                          <span>Manage</span>
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setFeedbackToDelete(item.id)}
                          className="h-8 w-8 text-rose-500 hover:text-rose-600 hover:bg-rose-50/50 cursor-pointer"
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
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

      {/* Moderation / Details Dialog */}
      <Dialog open={!!selectedFeedback} onOpenChange={(open) => !open && setSelectedFeedback(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-semibold">
              {selectedFeedback && categoryIcons[selectedFeedback.type]}
              <span>Feedback Details & Actions</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Review and act on this user submission.
            </DialogDescription>
          </DialogHeader>

          {selectedFeedback && (
            <form onSubmit={handleUpdateFeedback} className="space-y-4 my-2">
              {/* User Metadata */}
              <div className="bg-muted/40 rounded-lg p-3 border space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">User:</span>
                  <span className="font-semibold">{selectedFeedback.userName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Email:</span>
                  <span className="font-semibold">{selectedFeedback.userEmail}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Category:</span>
                  <span className="font-semibold capitalize flex items-center gap-1">
                    {categoryIcons[selectedFeedback.type]}
                    {selectedFeedback.type}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Date:</span>
                  <span className="font-semibold">
                    {new Date(selectedFeedback.createdAt).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Feedback Content */}
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-muted-foreground">Subject Title</Label>
                <div className="text-sm font-bold border rounded-md p-2.5 bg-card">{selectedFeedback.title}</div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-muted-foreground">User Message</Label>
                <div className="text-sm leading-relaxed border rounded-md p-3 bg-card whitespace-pre-wrap max-h-[160px] overflow-y-auto">
                  {selectedFeedback.content}
                </div>
              </div>

              {/* Status Update & Admin Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t pt-4">
                <div className="space-y-1.5">
                  <Label htmlFor="moderation-status">Workflow Status</Label>
                  <Select
                    value={statusVal}
                    onValueChange={(val) => setStatusVal(val as FeedbackStatus)}
                  >
                    <SelectTrigger id="moderation-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="admin-notes">Admin Notes / Remarks</Label>
                  <Textarea
                    id="admin-notes"
                    placeholder="Write action items, resolution notes, or internal remarks..."
                    value={notesVal}
                    onChange={(e) => setNotesVal(e.target.value)}
                    className="h-10 min-h-10 resize-none py-2 text-xs"
                  />
                </div>
              </div>

              <DialogFooter className="flex sm:justify-between items-center gap-2 pt-2 border-t mt-4">
                <Button
                  type="button"
                  variant="outline"
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
                    onClick={() => setSelectedFeedback(null)}
                    className="cursor-pointer text-xs"
                  >
                    Close
                  </Button>
                  <Button
                    type="submit"
                    disabled={isUpdating}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer text-xs"
                  >
                    {isUpdating ? "Updating..." : "Save Actions"}
                  </Button>
                </div>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

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
