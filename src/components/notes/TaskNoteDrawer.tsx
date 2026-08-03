import React, { useEffect, useState, useCallback } from "react";
import type { Note, NoteBlock } from "@/types";
import { notesApi } from "@/lib/notes-api";
import { NotionBlockEditor } from "./NotionBlockEditor";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { AlertCircle, FileText, Loader2, Save, WifiOff } from "lucide-react";
import { addXP } from "@/lib/gamification";
import { toast } from "sonner";


interface TaskNoteDrawerProps {
  taskId: string | null;
  taskTitle?: string;
  isOpen: boolean;
  onClose: () => void;
}

export const TaskNoteDrawer: React.FC<TaskNoteDrawerProps> = ({
  taskId,
  taskTitle = "Task Note",
  isOpen,
  onClose,
}) => {
  const [note, setNote] = useState<Note | null>(null);
  const [title, setTitle] = useState<string>("");
  const [blocks, setBlocks] = useState<NoteBlock[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [isOffline, setIsOffline] = useState<boolean>(false);

  const fetchOrCreateTaskNote = useCallback(async () => {
    if (!taskId) return;
    setLoading(true);
    setIsOffline(false);

    const res = await notesApi.getNotes({
      entity_type: "task",
      entity_id: taskId,
    });

    if (res.isOffline) {
      setIsOffline(true);
      setLoading(false);
      return;
    }

    if (res.data && res.data.length > 0) {
      const existing = res.data[0];
      setNote(existing);
      setTitle(existing.title || `Notes: ${taskTitle}`);
      setBlocks(existing.blocks || []);
    } else {
      // Create fresh note state for this task
      setNote(null);
      setTitle(`Notes: ${taskTitle}`);
      setBlocks([{ id: "b_init", type: "paragraph", content: "" }]);
    }

    setLoading(false);
  }, [taskId, taskTitle]);

  useEffect(() => {
    if (isOpen && taskId) {
      fetchOrCreateTaskNote();
    }
  }, [isOpen, taskId, fetchOrCreateTaskNote]);

  const handleSave = async () => {
    if (!taskId) return;
    setSaving(true);

    if (note) {
      // Update
      const res = await notesApi.updateNote(note.id, {
        title,
        blocks,
      });

      if (res.isOffline) {
        setIsOffline(true);
        toast.error("Note service is currently offline. Changes could not be saved.");
      } else if (res.data) {
        setNote(res.data);
        addXP(25, "Task Note Saved");
        toast.success("Note saved! (+25 XP 🎉)");
      }
    } else {
      // Create
      const res = await notesApi.createNote({
        title,
        blocks,
        entity_type: "task",
        entity_id: taskId,
      });

      if (res.isOffline) {
        setIsOffline(true);
        toast.error("Note service is currently offline. Unable to save note.");
      } else if (res.data) {
        setNote(res.data);
        addXP(25, "Task Note Created");
        toast.success("Note created! (+25 XP 🎉)");
      }
    }


    setSaving(false);
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-xl p-0 flex flex-col h-full">
        {/* Header */}
        <SheetHeader className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-indigo-500" />
            <div>
              <SheetTitle className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Task Note
              </SheetTitle>
              <SheetDescription className="text-xs text-slate-500">
                Linked to: <span className="font-medium text-slate-700 dark:text-slate-300">{taskTitle}</span>
              </SheetDescription>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={handleSave}
              disabled={saving || isOffline || loading}
              className="gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              <span>Save</span>
            </Button>
          </div>
        </SheetHeader>

        {/* Offline Warning Banner if API server fails */}
        {isOffline && (
          <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2.5 flex items-center gap-2 text-xs font-medium text-amber-600 dark:text-amber-400">
            <WifiOff className="h-4 w-4 shrink-0" />
            <span>Note-taking microservice is currently unreachable (Port 8001). Task notes are read-only until service restores.</span>
          </div>
        )}

        {/* Editor Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-48 text-slate-400 gap-2">
              <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
              <span className="text-xs">Loading task note...</span>
            </div>
          ) : (
            <>
              {/* Title input */}
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Note title..."
                className="w-full text-xl font-bold bg-transparent text-slate-900 dark:text-slate-100 outline-none border-b border-slate-200 dark:border-slate-800 pb-2 placeholder:text-slate-300 dark:placeholder:text-slate-700"
              />

              {/* Block Editor */}
              <NotionBlockEditor
                blocks={blocks}
                onChange={(updatedBlocks) => setBlocks(updatedBlocks)}
                readOnly={isOffline}
              />
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};
