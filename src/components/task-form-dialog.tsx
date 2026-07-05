import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ymd } from "@/lib/api";
import type { Task } from "@/types";

export interface TaskFormValues {
  title: string;
  description?: string;
  date: string;
  startTime: string;
  endTime: string;
  priority: Task["priority"];
  isOptional: boolean;
  completionNotes?: string;
  completedDate?: string;
}

export function TaskFormDialog({
  open,
  onOpenChange,
  initial,
  defaultDate,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initial?: Task | null;
  defaultDate?: string;
  onSubmit: (values: TaskFormValues) => Promise<void> | void;
}) {
  const [values, setValues] = useState<TaskFormValues>({
    title: "",
    description: "",
    date: defaultDate ?? ymd(new Date()),
    startTime: "09:00",
    endTime: "10:00",
    priority: "medium",
    isOptional: false,
    completionNotes: "",
    completedDate: "",
  });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (initial) {
      setValues({
        title: initial.title,
        description: initial.description ?? "",
        date: initial.date,
        startTime: initial.startTime,
        endTime: initial.endTime,
        priority: initial.priority,
        isOptional: initial.isOptional,
        completionNotes: initial.completionNotes ?? "",
        completedDate: initial.completedDate ?? "",
      });
    } else {
      setValues((v) => ({ ...v, date: defaultDate ?? v.date, title: "", description: "", completionNotes: "", completedDate: "" }));
    }
  }, [initial, defaultDate, open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await onSubmit(values);
      onOpenChange(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{initial ? "Edit task" : "New task"}</DialogTitle>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input id="title" value={values.title} required onChange={(e) => setValues({ ...values, title: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="desc">Description</Label>
            <Textarea id="desc" value={values.description} onChange={(e) => setValues({ ...values, description: e.target.value })} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label>Date</Label>
              <Input type="date" value={values.date} onChange={(e) => setValues({ ...values, date: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Start</Label>
              <Input type="time" value={values.startTime} onChange={(e) => setValues({ ...values, startTime: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>End</Label>
              <Input type="time" value={values.endTime} onChange={(e) => setValues({ ...values, endTime: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={values.priority} onValueChange={(v) => setValues({ ...values, priority: v as Task["priority"] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end gap-2">
              <Switch checked={values.isOptional} onCheckedChange={(v) => setValues({ ...values, isOptional: v })} id="opt" />
              <Label htmlFor="opt">Optional</Label>
            </div>
          </div>
          {initial && (
            <div className="space-y-4 border-t pt-4">
              <div className="space-y-2">
                <Label htmlFor="completionNotes">Completion Notes (Optional)</Label>
                <Textarea
                  id="completionNotes"
                  placeholder="Write any thoughts, notes or achievements upon completing this task..."
                  value={values.completionNotes || ""}
                  onChange={(e) => setValues({ ...values, completionNotes: e.target.value })}
                />
              </div>
              
              {initial.status === "completed" && (
                <div className="space-y-2">
                  <Label htmlFor="completedDate">Completed Date</Label>
                  <Input
                    id="completedDate"
                    type="date"
                    value={values.completedDate || ""}
                    onChange={(e) => setValues({ ...values, completedDate: e.target.value })}
                  />
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={busy}>{busy ? "Saving…" : "Save"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
