import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Edit, Trash2, Check, X } from "lucide-react";
import { toast } from "sonner";
import type { Motivation } from "@/types";

export const Route = createFileRoute("/admin/motivations")({
  component: AdminMotivations,
});

function AdminMotivations() {
  const { data: motivations = [], refetch: refetchMotivations } = useQuery({
    queryKey: ["motivations"],
    queryFn: api.adminListMotivations,
  });

  const [isMotivDialogOpen, setIsMotivDialogOpen] = useState(false);
  const [motivToEdit, setMotivToEdit] = useState<Motivation | null>(null);
  const [motivTitle, setMotivTitle] = useState("");
  const [motivContent, setMotivContent] = useState("");
  const [motivActive, setMotivActive] = useState(true);

  function openCreateMotiv() {
    setMotivToEdit(null);
    setMotivTitle("");
    setMotivContent("");
    setMotivActive(true);
    setIsMotivDialogOpen(true);
  }

  function openEditMotiv(m: Motivation) {
    setMotivToEdit(m);
    setMotivTitle(m.title);
    setMotivContent(m.content);
    setMotivActive(m.is_active);
    setIsMotivDialogOpen(true);
  }

  async function handleSaveMotiv(e: React.FormEvent) {
    e.preventDefault();
    if (!motivTitle.trim() || !motivContent.trim()) return;

    try {
      if (motivToEdit) {
        await api.adminUpdateMotivation(motivToEdit.id, {
          title: motivTitle,
          content: motivContent,
          is_active: motivActive,
        });
        toast.success("Motivation quote updated");
      } else {
        await api.adminCreateMotivation(motivTitle, motivContent, motivActive);
        toast.success("Motivation quote created");
      }
      refetchMotivations();
      setIsMotivDialogOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to save motivation quote");
    }
  }

  async function handleToggleMotivActive(m: Motivation) {
    try {
      await api.adminUpdateMotivation(m.id, { is_active: !m.is_active });
      toast.success(`Motivation ${!m.is_active ? "activated" : "deactivated"}`);
      refetchMotivations();
    } catch (err: any) {
      toast.error(err.message || "Failed to update quote status");
    }
  }

  async function handleDeleteMotiv(id: string) {
    if (!confirm("Are you sure you want to delete this motivation quote?")) return;
    try {
      await api.adminDeleteMotivation(id);
      toast.success("Motivation quote deleted");
      refetchMotivations();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete motivation");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Motivation Quotes</h1>
          <p className="text-sm text-muted-foreground">Manage motivations shown on user dashboards.</p>
        </div>
        <Button onClick={openCreateMotiv} size="sm" className="cursor-pointer">
          <Plus className="mr-2 h-4 w-4" /> Create Quote
        </Button>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Motivation Quotes List</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Quote Content</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {motivations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-6 text-muted-foreground text-sm">
                    No motivation quotes. Create one to get started.
                  </TableCell>
                </TableRow>
              ) : (
                motivations.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium max-w-[120px] truncate">{m.title}</TableCell>
                    <TableCell className="text-muted-foreground max-w-[320px] truncate">{m.content}</TableCell>
                    <TableCell>
                      <Badge variant={m.is_active ? "default" : "secondary"}>
                        {m.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="cursor-pointer"
                          onClick={() => handleToggleMotivActive(m)}
                        >
                          {m.is_active ? "Deactivate" : "Activate"}
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 cursor-pointer"
                          onClick={() => openEditMotiv(m)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-red-500 hover:text-red-650 cursor-pointer"
                          onClick={() => handleDeleteMotiv(m.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isMotivDialogOpen} onOpenChange={setIsMotivDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{motivToEdit ? "Edit Motivation Quote" : "Create Motivation Quote"}</DialogTitle>
            <DialogDescription>
              Write a motivational quote to inspire users when they complete tasks.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveMotiv} className="space-y-4 my-2">
            <div className="space-y-1">
              <Label htmlFor="motiv-title">Quote Title</Label>
              <Input
                id="motiv-title"
                placeholder="e.g., Consistency"
                value={motivTitle}
                onChange={(e) => setMotivTitle(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="motiv-content">Quote Content</Label>
              <textarea
                id="motiv-content"
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="e.g., Small steps every day add up to big results."
                value={motivContent}
                onChange={(e) => setMotivContent(e.target.value)}
                required
              />
            </div>

            <div className="flex items-center justify-between border-t pt-4">
              <Label htmlFor="motiv-active-state">Make Quote Active</Label>
              <Button
                type="button"
                variant={motivActive ? "default" : "outline"}
                size="sm"
                onClick={() => setMotivActive(!motivActive)}
                className="cursor-pointer"
              >
                {motivActive ? <Check className="mr-1 h-4 w-4" /> : <X className="mr-1 h-4 w-4" />}
                {motivActive ? "Active" : "Inactive"}
              </Button>
            </div>

            <Button type="submit" size="sm" className="w-full cursor-pointer">
              {motivToEdit ? "Save Quote" : "Create Quote"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
