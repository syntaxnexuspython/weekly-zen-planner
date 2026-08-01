import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ymd } from "@/lib/api";
import type { Task, Subtask, RecurrencePattern, TaskAttachment } from "@/types";
import { Plus, Trash2, Link as LinkIcon, Calendar, Repeat } from "lucide-react";

export interface TaskFormValues {
  title: string;
  specializedTitle?: string;
  description?: string;
  date: string;
  startTime: string;
  endTime: string;
  priority: Task["priority"];
  isOptional: boolean;
  completionNotes?: string;
  completedDate?: string;
  subtasks?: Subtask[];
  recurrence?: RecurrencePattern;
  recurrenceEndDate?: string;
  weeklyDays?: number[];
  monthlyDay?: number;
  attachments?: TaskAttachment[];
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
    specializedTitle: "",
    description: "",
    date: defaultDate ?? ymd(new Date()),
    startTime: "09:00",
    endTime: "10:00",
    priority: "medium",
    isOptional: false,
    completionNotes: "",
    completedDate: "",
    subtasks: [],
    recurrence: "none",
    recurrenceEndDate: "",
    weeklyDays: [],
    monthlyDay: undefined,
    attachments: [],
  });

  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [linkName, setLinkName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (initial) {
      setValues({
        title: initial.title,
        specializedTitle: initial.specializedTitle ?? "",
        description: initial.description ?? "",
        date: initial.date,
        startTime: initial.startTime,
        endTime: initial.endTime,
        priority: initial.priority,
        isOptional: initial.isOptional,
        completionNotes: initial.completionNotes ?? "",
        completedDate: initial.completedDate ?? "",
        subtasks: initial.subtasks ? [...initial.subtasks] : [],
        recurrence: initial.recurrence ?? "none",
        recurrenceEndDate: initial.recurrenceEndDate ?? "",
        weeklyDays: initial.weeklyDays ? [...initial.weeklyDays] : [],
        monthlyDay: initial.monthlyDay,
        attachments: initial.attachments ? [...initial.attachments] : [],
      });
    } else {
      setValues((v) => ({
        ...v,
        date: defaultDate ?? v.date,
        title: "",
        specializedTitle: "",
        description: "",
        completionNotes: "",
        completedDate: "",
        subtasks: [],
        recurrence: "none",
        recurrenceEndDate: "",
        weeklyDays: [],
        monthlyDay: undefined,
        attachments: [],
      }));
    }
  }, [initial, defaultDate, open]);

  const handleAddSubtask = () => {
    if (!newSubtaskTitle.trim()) return;
    const newSubtask: Subtask = {
      id: Math.random().toString(36).substring(2, 9),
      title: newSubtaskTitle.trim(),
      completed: false,
    };
    setValues((prev) => ({
      ...prev,
      subtasks: [...(prev.subtasks || []), newSubtask],
    }));
    setNewSubtaskTitle("");
  };

  const handleRemoveSubtask = (id: string) => {
    setValues((prev) => ({
      ...prev,
      subtasks: (prev.subtasks || []).filter((s) => s.id !== id),
    }));
  };

  const handleAddAttachment = () => {
    if (!linkUrl.trim()) return;
    const newAttachment: TaskAttachment = {
      id: Math.random().toString(36).substring(2, 9),
      type: "link",
      url: linkUrl.trim(),
      name: linkName.trim() || linkUrl.trim(),
    };
    setValues((prev) => ({
      ...prev,
      attachments: [...(prev.attachments || []), newAttachment],
    }));
    setLinkUrl("");
    setLinkName("");
  };

  const handleRemoveAttachment = (id: string) => {
    setValues((prev) => ({
      ...prev,
      attachments: (prev.attachments || []).filter((a) => a.id !== id),
    }));
  };

  const handleExportICal = () => {
    const icsData = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Zen Planner//Task Event//EN",
      "BEGIN:VEVENT",
      `SUMMARY:${values.title}`,
      `DESCRIPTION:${values.description || ""}`,
      `DTSTART:${values.date.replace(/-/g, "")}T${values.startTime.replace(":", "")}00Z`,
      `DTEND:${values.date.replace(/-/g, "")}T${values.endTime.replace(":", "")}00Z`,
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\n");

    const blob = new Blob([icsData], { type: "text/calendar;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `${values.title.replace(/\s+/g, "_")}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{initial ? "Edit task" : "New task"}</span>
            {initial && (
              <Button type="button" variant="outline" size="sm" onClick={handleExportICal} className="gap-1 text-xs">
                <Calendar className="h-3.5 w-3.5" /> Export .ics
              </Button>
            )}
          </DialogTitle>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input id="title" value={values.title} required onChange={(e) => setValues({ ...values, title: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="specializedTitle" className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
              ✨ Specialized Topic / Focus Note (Optional)
            </Label>
            <Input
              id="specializedTitle"
              placeholder="e.g. Learn React Custom Hooks (customizes this specific instance)"
              value={values.specializedTitle || ""}
              onChange={(e) => setValues({ ...values, specializedTitle: e.target.value })}
              className="text-xs"
            />
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
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <Repeat className="h-3.5 w-3.5" /> Recurrence
              </Label>
              <Select value={values.recurrence} onValueChange={(v) => setValues({ ...values, recurrence: v as RecurrencePattern })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Recurrence</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="biweekly">Bi-Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {values.recurrence && values.recurrence !== "none" && (
            <div className="p-3.5 rounded-lg border bg-muted/20 space-y-3">
              <div className="text-xs font-semibold text-primary uppercase tracking-wide flex items-center gap-1.5">
                <Repeat className="h-3.5 w-3.5" /> Recurrence Schedule Details
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="recEndDate" className="text-xs font-medium">Recurrence End Date</Label>
                <Input
                  id="recEndDate"
                  type="date"
                  value={values.recurrenceEndDate || ""}
                  onChange={(e) => setValues({ ...values, recurrenceEndDate: e.target.value })}
                />
              </div>

              {(values.recurrence === "weekly" || values.recurrence === "biweekly") && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Select Days of Week</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { label: "Mon", val: 0 },
                      { label: "Tue", val: 1 },
                      { label: "Wed", val: 2 },
                      { label: "Thu", val: 3 },
                      { label: "Fri", val: 4 },
                      { label: "Sat", val: 5 },
                      { label: "Sun", val: 6 },
                    ].map((d) => {
                      const selected = values.weeklyDays?.includes(d.val);
                      return (
                        <button
                          key={d.val}
                          type="button"
                          onClick={() => {
                            const current = values.weeklyDays || [];
                            const updated = selected
                              ? current.filter((x) => x !== d.val)
                              : [...current, d.val];
                            setValues({ ...values, weeklyDays: updated });
                          }}
                          className={`px-2.5 py-1 text-xs rounded-md border font-medium transition-colors cursor-pointer ${
                            selected
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-background hover:bg-accent text-muted-foreground"
                          }`}
                        >
                          {d.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {values.recurrence === "monthly" && (
                <div className="space-y-1.5">
                  <Label htmlFor="monthlyDay" className="text-xs font-medium">Day of Month (1-31)</Label>
                  <Input
                    id="monthlyDay"
                    type="number"
                    min={1}
                    max={31}
                    placeholder="e.g. 15"
                    value={values.monthlyDay || ""}
                    onChange={(e) => setValues({ ...values, monthlyDay: parseInt(e.target.value) || undefined })}
                  />
                </div>
              )}
            </div>
          )}

          <div className="flex items-center gap-2 pt-1">
            <Switch checked={values.isOptional} onCheckedChange={(v) => setValues({ ...values, isOptional: v })} id="opt" />
            <Label htmlFor="opt">Optional Task</Label>
          </div>

          {/* Subtasks Section */}
          <div className="space-y-2 border-t pt-3 border-border/60">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Subtasks Checklist</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Add subtask title..."
                value={newSubtaskTitle}
                onChange={(e) => setNewSubtaskTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddSubtask();
                  }
                }}
              />
              <Button type="button" size="icon" variant="secondary" onClick={handleAddSubtask}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {values.subtasks && values.subtasks.length > 0 && (
              <div className="space-y-1.5 mt-2">
                {values.subtasks.map((st) => (
                  <div key={st.id} className="flex items-center justify-between p-2 rounded border bg-accent/20 text-xs">
                    <span>{st.title}</span>
                    <Button type="button" size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => handleRemoveSubtask(st.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Attachments Section */}
          <div className="space-y-2 border-t pt-3 border-border/60">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Attachments & Links</Label>
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="Link Name (Optional)" value={linkName} onChange={(e) => setLinkName(e.target.value)} />
              <Input placeholder="URL (e.g. https://...)" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} />
            </div>
            <Button type="button" variant="outline" size="sm" onClick={handleAddAttachment} className="w-full gap-1.5 text-xs">
              <LinkIcon className="h-3.5 w-3.5" /> Add Attachment Link
            </Button>
            {values.attachments && values.attachments.length > 0 && (
              <div className="space-y-1.5 mt-2">
                {values.attachments.map((att) => (
                  <div key={att.id} className="flex items-center justify-between p-2 rounded border bg-accent/20 text-xs">
                    <a href={att.url} target="_blank" rel="noreferrer" className="text-primary underline truncate max-w-[300px]">
                      {att.name || att.url}
                    </a>
                    <Button type="button" size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => handleRemoveAttachment(att.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {initial && (
            <div className="space-y-4 border-t pt-4 border-border/60">
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
