import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Plus, Edit, Trash2, Megaphone, Check, X, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import type { Announcement } from "@/types";

export const Route = createFileRoute("/admin/announcements")({
  component: AdminAnnouncements,
});

function AdminAnnouncements() {
  const qc = useQueryClient();

  const { data: announcements = [], isLoading, refetch } = useQuery({
    queryKey: ["admin-announcements"],
    queryFn: api.adminListAnnouncements,
  });

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [bannerUrl, setBannerUrl] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [busy, setBusy] = useState(false);
  const [announcementToDelete, setAnnouncementToDelete] = useState<Announcement | null>(null);

  function openCreate() {
    setEditingAnnouncement(null);
    setTitle("");
    setDescription("");
    setBannerUrl("");
    setIsActive(true);
    setIsDialogOpen(true);
  }

  function openEdit(a: Announcement) {
    setEditingAnnouncement(a);
    setTitle(a.title);
    setDescription(a.description);
    setBannerUrl(a.bannerUrl || "");
    setIsActive(a.isActive);
    setIsDialogOpen(true);
  }

  const saveMutation = useMutation({
    mutationFn: (data: Omit<Announcement, "id" | "createdAt">) => {
      if (editingAnnouncement) {
        return api.adminUpdateAnnouncement(editingAnnouncement.id, data);
      } else {
        return api.adminCreateAnnouncement(data);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-announcements"] });
      qc.invalidateQueries({ queryKey: ["active-announcements"] });
      toast.success(editingAnnouncement ? "Announcement updated" : "Announcement created");
      setIsDialogOpen(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.adminDeleteAnnouncement(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-announcements"] });
      qc.invalidateQueries({ queryKey: ["active-announcements"] });
      toast.success("Announcement deleted");
    },
  });

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;

    setBusy(true);
    try {
      await saveMutation.mutateAsync({
        title: title.trim(),
        description: description.trim(),
        bannerUrl: bannerUrl.trim() || undefined,
        isActive,
      });
    } catch (err: any) {
      toast.error(err.message || "Failed to save announcement");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteMutation.mutateAsync(id);
    } catch (err: any) {
      toast.error(err.message || "Failed to delete announcement");
    }
  }

  async function handleToggleActive(a: Announcement) {
    try {
      await api.adminUpdateAnnouncement(a.id, { isActive: !a.isActive });
      refetch();
      qc.invalidateQueries({ queryKey: ["active-announcements"] });
      toast.success(`Announcement ${!a.isActive ? "activated" : "deactivated"}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to update status");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">System Announcements</h1>
          <p className="text-sm text-muted-foreground">Manage announcements and alerts broadcasted to the user dashboard.</p>
        </div>
        <Button onClick={openCreate} size="sm" className="cursor-pointer">
          <Plus className="mr-2 h-4 w-4" /> Create Announcement
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-amber-500" />
            <span>Announcements Broadcast History</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {isLoading ? (
            <div className="text-center py-12 text-sm text-muted-foreground">Loading announcements...</div>
          ) : announcements.length === 0 ? (
            <div className="text-center py-12 text-sm text-muted-foreground">
              No announcements created. Add one to show a notice on user dashboards.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">Banner</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead className="max-w-[320px]">Description</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {announcements.map((a) => (
                  <TableRow key={a.id} className="hover:bg-accent/10 transition-colors">
                    <TableCell>
                      {a.bannerUrl ? (
                        <div className="h-10 w-16 rounded overflow-hidden border bg-muted flex items-center justify-center">
                          <img src={a.bannerUrl} alt="" className="h-full w-full object-cover" onError={(e) => {
                            (e.target as HTMLElement).style.display = "none";
                          }} />
                        </div>
                      ) : (
                        <div className="h-10 w-16 rounded border bg-muted flex items-center justify-center text-muted-foreground" title="No Banner image">
                          <ImageIcon className="h-4 w-4" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-semibold">{a.title}</TableCell>
                    <TableCell className="text-muted-foreground truncate max-w-[320px]">{a.description}</TableCell>
                    <TableCell>
                      <Badge variant={a.isActive ? "default" : "secondary"}>
                        {a.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(a.createdAt).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleToggleActive(a)}
                          className="cursor-pointer text-xs"
                        >
                          {a.isActive ? "Deactivate" : "Activate"}
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => openEdit(a)}
                          className="h-8 w-8 cursor-pointer"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setAnnouncementToDelete(a)}
                          className="h-8 w-8 text-red-500 hover:text-red-600 cursor-pointer"
                        >
                          <Trash2 className="h-4 w-4" />
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

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingAnnouncement ? "Edit Announcement" : "Create Announcement"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Configure details for the announcement alert shown to users on their dashboards.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4 my-2">
            <div className="space-y-1">
              <Label htmlFor="ann-title">Announcement Title</Label>
              <Input
                id="ann-title"
                placeholder="e.g., Scheduled Maintenance"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                maxLength={200}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="ann-desc">Description / Content</Label>
              <Textarea
                id="ann-desc"
                placeholder="Write the full description of your update or alert here..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                className="min-h-[120px] resize-none"
                maxLength={4000}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="ann-banner">Banner Image URL (Optional)</Label>
              <Input
                id="ann-banner"
                placeholder="e.g., https://example.com/banner.png"
                value={bannerUrl}
                onChange={(e) => setBannerUrl(e.target.value)}
              />
              <p className="text-[10px] text-muted-foreground">
                Provide an image URL to show a banner layout at the top of the dashboard.
              </p>
            </div>

            <div className="flex items-center justify-between border-t pt-4">
              <Label htmlFor="ann-active-state">Make Broadcast Active</Label>
              <Button
                type="button"
                variant={isActive ? "default" : "outline"}
                size="sm"
                onClick={() => setIsActive(!isActive)}
                className="cursor-pointer"
              >
                {isActive ? <Check className="mr-1 h-4 w-4" /> : <X className="mr-1 h-4 w-4" />}
                {isActive ? "Active" : "Inactive"}
              </Button>
            </div>

            <Button type="submit" disabled={busy} className="w-full bg-primary hover:bg-primary/95 text-white font-semibold cursor-pointer">
              {busy ? "Saving..." : editingAnnouncement ? "Save Announcement" : "Create Announcement"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!announcementToDelete} onOpenChange={(o) => !o && setAnnouncementToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete announcement?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete announcement "{announcementToDelete?.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (announcementToDelete) {
                  handleDelete(announcementToDelete.id);
                }
                setAnnouncementToDelete(null);
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
