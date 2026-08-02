import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Note, NoteBlock, Task } from "@/types";
import { notesApi } from "@/lib/notes-api";
import { api } from "@/lib/api";
import { NotionBlockEditor } from "@/components/notes/NotionBlockEditor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  FileText,
  Plus,
  Search,
  Pin,
  Trash2,
  Save,
  Loader2,
  WifiOff,
  Filter,
  CheckCircle2,
  Sparkles,
  Link as LinkIcon,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/notes")({
  component: NotesPage,
});


function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [activeNote, setActiveNote] = useState<Note | null>(null);
  const [activeTitle, setActiveTitle] = useState<string>("");
  const [activeBlocks, setActiveBlocks] = useState<NoteBlock[]>([]);
  const [activeEntityType, setActiveEntityType] = useState<string | null>(null);
  const [activeEntityId, setActiveEntityId] = useState<string | null>(null);
  const [search, setSearch] = useState<string>("");
  const [filterType, setFilterType] = useState<"all" | "standalone" | "task">("all");
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [isOffline, setIsOffline] = useState<boolean>(false);

  const { data: userTasks = [] } = useQuery({
    queryKey: ["all-tasks"],
    queryFn: () => api.listTasks(),
  });

  const fetchNotes = useCallback(async () => {
    setLoading(true);
    setIsOffline(false);

    const res = await notesApi.getNotes({
      standalone_only: filterType === "standalone",
      entity_type: filterType === "task" ? "task" : undefined,
      search: search || undefined,
    });

    if (res.isOffline) {
      setIsOffline(true);
      setNotes([]);
    } else {
      setNotes(res.data || []);
      if (res.data && res.data.length > 0) {
        setNotes((prev) => {
          if (!activeNote && res.data[0]) {
            selectNote(res.data[0]);
          }
          return res.data;
        });
      }
    }

    setLoading(false);
  }, [filterType, search]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  const selectNote = (note: Note) => {
    setActiveNote(note);
    setActiveTitle(note.title);
    setActiveBlocks(note.blocks || []);
    setActiveEntityType(note.entity_type || null);
    setActiveEntityId(note.entity_id || null);
  };

  const handleCreateNewNote = async () => {
    setIsOffline(false);

    const newPayload = {
      title: "Untitled Note",
      blocks: [{ id: "b_init_" + Date.now(), type: "paragraph" as const, content: "" }],
      entity_type: null,
      entity_id: null,
    };

    const res = await notesApi.createNote(newPayload);

    if (res.isOffline) {
      setIsOffline(true);
      toast.error("Notes service is unreachable. Cannot create note right now.");
    } else if (res.data) {
      toast.success("New note created!");
      setNotes((prev) => [res.data!, ...prev]);
      selectNote(res.data);
    }
  };

  const handleSaveActiveNote = async () => {
    if (!activeNote) return;
    setSaving(true);

    const res = await notesApi.updateNote(activeNote.id, {
      title: activeTitle,
      blocks: activeBlocks,
      entity_type: activeEntityType,
      entity_id: activeEntityId,
    });

    if (res.isOffline) {
      setIsOffline(true);
      toast.error("Notes service is offline. Unable to save note.");
    } else if (res.data) {
      toast.success("Note saved");
      const updated = res.data;
      setNotes((prev) => prev.map((n) => (n.id === updated.id ? updated : n)));
      setActiveNote(updated);
    }

    setSaving(false);
  };

  const handleTogglePin = async (note: Note, e: React.MouseEvent) => {

    e.stopPropagation();
    const res = await notesApi.updateNote(note.id, {
      is_pinned: !note.is_pinned,
    });

    if (!res.isOffline && res.data) {
      const updated = res.data;
      setNotes((prev) => prev.map((n) => (n.id === updated.id ? updated : n)));
      if (activeNote?.id === updated.id) {
        setActiveNote(updated);
      }
    }
  };

  const handleDeleteNote = async (noteId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const res = await notesApi.deleteNote(noteId);

    if (!res.isOffline && res.data) {
      toast.success("Note deleted");
      const filtered = notes.filter((n) => n.id !== noteId);
      setNotes(filtered);
      if (activeNote?.id === noteId) {
        if (filtered.length > 0) {
          selectNote(filtered[0]);
        } else {
          setActiveNote(null);
          setActiveTitle("");
          setActiveBlocks([]);
        }
      }
    }
  };

  return (
    <div className="container mx-auto max-w-7xl px-4 py-6">
      {/* Offline Alert Banner */}
      {isOffline && (
        <div className="mb-4 bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <WifiOff className="h-5 w-5 text-amber-500 shrink-0" />
            <div>
              <h4 className="text-sm font-semibold text-amber-600 dark:text-amber-400">
                Note Microservice Offline
              </h4>
              <p className="text-xs text-amber-600/80 dark:text-amber-400/80">
                The note backend service on port 8001 is currently unreachable. Make sure the backend server is running. Your planner tasks remain unaffected.
              </p>
            </div>
          </div>
          <Button size="sm" variant="outline" onClick={fetchNotes} className="shrink-0 text-xs">
            Retry Connection
          </Button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-indigo-500" />
            <span>Zen Notes</span>
          </h1>
          <p className="text-sm text-muted-foreground">
            Standalone markdown & block notes, linked directly to your Zen tasks.
          </p>
        </div>

        <Button
          onClick={handleCreateNewNote}
          disabled={isOffline}
          className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
        >
          <Plus className="h-4 w-4" />
          <span>New Note</span>
        </Button>
      </div>

      {/* Main Split Grid Workspace */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 min-h-[680px]">
        {/* Left Sidebar - Notes List & Search */}
        <div className="md:col-span-4 bg-card border rounded-2xl p-4 flex flex-col gap-4 shadow-sm">
          {/* Search Bar & Filter Tabs */}
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search notes..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-background"
              />
            </div>

            {/* Filter Buttons */}
            <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-lg text-xs">
              <button
                onClick={() => setFilterType("all")}
                className={cn(
                  "flex-1 py-1.5 rounded-md font-medium transition-all text-center",
                  filterType === "all"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                All
              </button>
              <button
                onClick={() => setFilterType("standalone")}
                className={cn(
                  "flex-1 py-1.5 rounded-md font-medium transition-all text-center",
                  filterType === "standalone"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Standalone
              </button>
              <button
                onClick={() => setFilterType("task")}
                className={cn(
                  "flex-1 py-1.5 rounded-md font-medium transition-all text-center",
                  filterType === "task"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Task Linked
              </button>
            </div>
          </div>

          {/* Notes List Container */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {loading ? (
              <div className="flex items-center justify-center h-32 text-xs text-muted-foreground gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />
                <span>Fetching notes...</span>
              </div>
            ) : notes.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-center p-4 border border-dashed rounded-xl">
                <FileText className="h-8 w-8 text-muted-foreground/40 mb-2" />
                <p className="text-sm font-medium text-muted-foreground">No notes found</p>
                <p className="text-xs text-muted-foreground/70 mt-1">
                  Create a new note or link one from your tasks!
                </p>
              </div>
            ) : (
              notes.map((n) => {
                const isSelected = activeNote?.id === n.id;
                return (
                  <div
                    key={n.id}
                    onClick={() => selectNote(n)}
                    className={cn(
                      "group relative p-3 rounded-xl border transition-all cursor-pointer flex flex-col gap-1.5",
                      isSelected
                        ? "bg-indigo-500/10 border-indigo-500/40 shadow-sm"
                        : "bg-background hover:bg-accent/60 border-border"
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-sm font-semibold text-foreground line-clamp-1">
                        {n.title || "Untitled Note"}
                      </h3>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => handleTogglePin(n, e)}
                          className={cn(
                            "p-1 rounded hover:bg-accent transition-colors",
                            n.is_pinned ? "text-amber-500" : "text-muted-foreground opacity-0 group-hover:opacity-100"
                          )}
                          title={n.is_pinned ? "Unpin note" : "Pin note"}
                        >
                          <Pin className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={(e) => handleDeleteNote(n.id, e)}
                          className="p-1 rounded text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-red-500 hover:bg-accent transition-colors"
                          title="Delete note"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Metadata Badges */}
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                      {n.entity_type === "task" ? (
                        <span className="px-1.5 py-0.5 rounded bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 font-medium">
                          Task Linked
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded bg-slate-500/15 text-slate-600 dark:text-slate-400 font-medium">
                          Standalone
                        </span>
                      )}
                      <span>
                        {new Date(n.updated_at || n.created_at).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Pane - Notion Block Editor */}
        <div className="md:col-span-8 bg-card border rounded-2xl p-6 flex flex-col gap-4 shadow-sm">
          {activeNote ? (
            <>
              {/* Note Header Toolbar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4">
                <input
                  type="text"
                  value={activeTitle}
                  disabled={isOffline}
                  onChange={(e) => setActiveTitle(e.target.value)}
                  placeholder="Note title..."
                  className="text-2xl font-bold bg-transparent text-foreground outline-none border-none placeholder:text-muted-foreground/40 w-full"
                />

                <div className="flex items-center gap-2 shrink-0">
                  {/* Task Linker Selector */}
                  <div className="flex items-center gap-1.5 bg-muted/60 border rounded-lg px-2.5 py-1 text-xs">
                    <LinkIcon className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                    <select
                      value={activeEntityId || ""}
                      disabled={isOffline}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val) {
                          setActiveEntityType("task");
                          setActiveEntityId(val);
                        } else {
                          setActiveEntityType(null);
                          setActiveEntityId(null);
                        }
                      }}
                      className="bg-transparent text-foreground outline-none cursor-pointer max-w-[170px] truncate"
                    >
                      <option value="" className="bg-background text-foreground">
                        Standalone (No Task)
                      </option>
                      {userTasks.map((t) => (
                        <option key={t.id} value={t.id} className="bg-background text-foreground">
                          Task: {t.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  <Button
                    onClick={handleSaveActiveNote}
                    disabled={saving || isOffline}
                    className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white"
                  >
                    {saving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    <span>Save Note</span>
                  </Button>
                </div>
              </div>


              {/* Editor Workspace */}
              <div className="flex-1 overflow-y-auto min-h-[480px]">
                <NotionBlockEditor
                  blocks={activeBlocks}
                  onChange={(updated) => setActiveBlocks(updated)}
                  readOnly={isOffline}
                />
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center flex-1 h-96 text-center text-muted-foreground gap-3">
              <FileText className="h-12 w-12 text-muted-foreground/30" />
              <div>
                <h3 className="text-base font-semibold text-foreground">No Note Selected</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Select a note from the left sidebar or create a new one to start writing.
                </p>
              </div>
              <Button
                onClick={handleCreateNewNote}
                disabled={isOffline}
                className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white mt-2"
              >
                <Plus className="h-4 w-4" />
                <span>Create First Note</span>
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
