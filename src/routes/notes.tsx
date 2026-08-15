import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Note, NoteBlock, Task } from "@/types";
import { notesApi } from "@/lib/notes-api";
import { api } from "@/lib/api";
import { NotionBlockEditor } from "@/components/notes/NotionBlockEditor";
import { CategorySelector } from "@/components/notes/CategorySelector";
import { CategoryExplorer } from "@/components/notes/CategoryExplorer";
import {
  loadCategories,
  fetchCategoriesFromBackend,
  getCategoryStyle,
  findCategoryByName,
} from "@/lib/note-categories";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { addXP } from "@/lib/gamification";
import {
  FileText,
  Plus,
  Search,
  Pin,
  Trash2,
  Save,
  Loader2,
  WifiOff,
  Sparkles,
  Link as LinkIcon,
  Layers,
  Edit3,
  Tag,
  Grid,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/notes")({
  component: NotesPage,
});

function NotesPage() {
  const [viewMode, setViewMode] = useState<"workspace" | "categories">("workspace");
  const [notes, setNotes] = useState<Note[]>([]);
  const [activeNote, setActiveNote] = useState<Note | null>(null);
  const [activeTitle, setActiveTitle] = useState<string>("");
  const [activeBlocks, setActiveBlocks] = useState<NoteBlock[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [activeEntityType, setActiveEntityType] = useState<string | null>(null);
  const [activeEntityId, setActiveEntityId] = useState<string | null>(null);
  const [search, setSearch] = useState<string>("");
  const [filterType, setFilterType] = useState<"all" | "standalone" | "task">("all");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>("all");
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [isOffline, setIsOffline] = useState<boolean>(false);
  const [showAllTasks, setShowAllTasks] = useState<boolean>(false);

  const [categoriesList, setCategoriesList] = useState<NoteCategory[]>(loadCategories());

  useEffect(() => {
    fetchCategoriesFromBackend().then((cats) => {
      if (cats && cats.length > 0) {
        setCategoriesList(cats);
      }
    });
  }, []);

  const availableCategories = useMemo(() => categoriesList, [categoriesList]);

  const { data: userTasks = [] } = useQuery({
    queryKey: ["all-tasks"],
    queryFn: () => api.listTasks(),
  });

  const filteredTasks = useMemo(() => {
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

    const filtered = userTasks.filter((t) => {
      if (showAllTasks) return true;
      if (t.id === activeEntityId) return true;
      if (t.status === "pending") return true;
      const taskDateOnly = t.date ? t.date.split("T")[0] : "";
      if (taskDateOnly === todayStr) return true;
      return false;
    });

    return [...filtered].sort((a, b) => {
      const dateA = a.date || a.createdAt || "";
      const dateB = b.date || b.createdAt || "";
      return dateB.localeCompare(dateA);
    });
  }, [userTasks, showAllTasks, activeEntityId]);

  const fetchNotes = useCallback(async () => {
    setLoading(true);
    setIsOffline(false);

    const res = await notesApi.getNotes({
      standalone_only: filterType === "standalone",
      entity_type: filterType === "task" ? "task" : undefined,
      category: selectedCategoryFilter !== "all" && selectedCategoryFilter !== "__uncategorized__" ? selectedCategoryFilter : undefined,
      search: search || undefined,
    });

    if (res.isOffline) {
      setIsOffline(true);
      setNotes([]);
    } else {
      let data = res.data || [];
      // If uncategorized filter is active, filter out notes that have category
      if (selectedCategoryFilter === "__uncategorized__") {
        data = data.filter((n) => !n.category);
      }
      setNotes(data);
      if (data.length > 0) {
        setNotes((prev) => {
          if (!activeNote && data[0]) {
            selectNote(data[0]);
          }
          return data;
        });
      }
    }

    setLoading(false);
  }, [filterType, selectedCategoryFilter, search]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  const selectNote = (note: Note) => {
    setActiveNote(note);
    setActiveTitle(note.title);
    setActiveBlocks(note.blocks || []);
    setActiveCategory(note.category || null);
    setActiveEntityType(note.entity_type || null);
    setActiveEntityId(note.entity_id || null);
  };

  const handleCreateNewNote = async (categoryName?: string) => {
    setIsOffline(false);

    const targetCategory =
      categoryName !== undefined
        ? categoryName || null
        : selectedCategoryFilter !== "all" && selectedCategoryFilter !== "__uncategorized__"
        ? selectedCategoryFilter
        : null;

    const newPayload = {
      title: "Untitled Note",
      blocks: [{ id: "b_init_" + Date.now(), type: "paragraph" as const, content: "" }],
      category: targetCategory,
      entity_type: null,
      entity_id: null,
    };

    const res = await notesApi.createNote(newPayload);

    if (res.isOffline) {
      setIsOffline(true);
      toast.error("Notes service is unreachable. Cannot create note right now.");
    } else if (res.data) {
      addXP(25, "New Note Created");
      toast.success("New note created! (+25 XP 🎉)");
      setNotes((prev) => [res.data!, ...prev]);
      selectNote(res.data);
      setViewMode("workspace");
    }
  };

  const handleSaveActiveNote = async () => {
    if (!activeNote) return;
    setSaving(true);

    const res = await notesApi.updateNote(activeNote.id, {
      title: activeTitle,
      blocks: activeBlocks,
      category: activeCategory,
      entity_type: activeEntityType,
      entity_id: activeEntityId,
    });

    if (res.isOffline) {
      setIsOffline(true);
      toast.error("Notes service is offline. Unable to save note.");
    } else if (res.data) {
      addXP(25, "Note Saved");
      toast.success("Note saved! (+25 XP 🎉)");
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
          setActiveCategory(null);
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
            Category-wise notes with block editor, linked directly to your Zen tasks.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* View Mode Switcher */}
          <div className="flex items-center bg-muted/60 p-1 rounded-xl border text-xs">
            <button
              onClick={() => setViewMode("workspace")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all",
                viewMode === "workspace"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Edit3 className="h-3.5 w-3.5" />
              <span>Workspace</span>
            </button>
            <button
              onClick={() => setViewMode("categories")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all",
                viewMode === "categories"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Layers className="h-3.5 w-3.5 text-indigo-500" />
              <span>Category Explorer</span>
            </button>
          </div>

          <Button
            onClick={() => handleCreateNewNote()}
            disabled={isOffline}
            className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
          >
            <Plus className="h-4 w-4" />
            <span>New Note</span>
          </Button>
        </div>
      </div>

      {/* VIEW: CATEGORY EXPLORER */}
      {viewMode === "categories" ? (
        <CategoryExplorer
          notes={notes}
          tasks={userTasks}
          onSelectNote={(note) => {
            selectNote(note);
            setViewMode("workspace");
          }}
          onCreateNoteInCategory={(catName) => {
            handleCreateNewNote(catName);
          }}
          isOffline={isOffline}
        />
      ) : (
        /* VIEW: MAIN SPLIT GRID WORKSPACE */
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 min-h-[680px]">
          {/* Left Sidebar - Notes List, Categories & Search */}
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

              {/* Category Filter Chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] scrollbar-none">
                <button
                  onClick={() => setSelectedCategoryFilter("all")}
                  className={cn(
                    "px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition-all border shrink-0",
                    selectedCategoryFilter === "all"
                      ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                      : "bg-muted/40 hover:bg-muted/70 text-muted-foreground border-transparent"
                  )}
                >
                  All Topics
                </button>

                {availableCategories.map((cat) => {
                  const isSelected = selectedCategoryFilter.toLowerCase() === cat.name.toLowerCase();
                  const style = getCategoryStyle(cat.color);
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategoryFilter(cat.name)}
                      className={cn(
                        "px-2 py-1 rounded-lg font-medium whitespace-nowrap transition-all border shrink-0 flex items-center gap-1.5",
                        isSelected
                          ? cn(style.badge, "border-current shadow-xs font-semibold")
                          : "bg-muted/40 hover:bg-muted/70 text-muted-foreground border-transparent"
                      )}
                    >
                      <div className={cn("w-1.5 h-1.5 rounded-full", style.dot)} />
                      <span>{cat.name}</span>
                    </button>
                  );
                })}

                <button
                  onClick={() => setSelectedCategoryFilter("__uncategorized__")}
                  className={cn(
                    "px-2 py-1 rounded-lg font-medium whitespace-nowrap transition-all border shrink-0 text-muted-foreground",
                    selectedCategoryFilter === "__uncategorized__"
                      ? "bg-slate-700 text-white border-slate-700 shadow-xs"
                      : "bg-muted/40 hover:bg-muted/70 border-transparent"
                  )}
                >
                  Uncategorized
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
                    {selectedCategoryFilter !== "all"
                      ? `No notes in "${selectedCategoryFilter}". Create one!`
                      : "Create a new note or link one from your tasks!"}
                  </p>
                </div>
              ) : (
                notes.map((n) => {
                  const isSelected = activeNote?.id === n.id;
                  const noteCat = findCategoryByName(availableCategories, n.category);
                  const catStyle = getCategoryStyle(noteCat?.color);

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
                      <div className="flex items-center flex-wrap gap-1.5 text-[10px] text-muted-foreground">
                        {/* Category Badge */}
                        {n.category && (
                          <span
                            className={cn(
                              "px-1.5 py-0.5 rounded font-medium border flex items-center gap-1",
                              catStyle.badge
                            )}
                          >
                            <span className={cn("w-1.5 h-1.5 rounded-full", catStyle.dot)} />
                            <span className="truncate max-w-[90px]">{n.category}</span>
                          </span>
                        )}

                        {n.entity_type === "task" ? (
                          <span className="px-1.5 py-0.5 rounded bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 font-medium">
                            Task Linked
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded bg-slate-500/15 text-slate-600 dark:text-slate-400 font-medium">
                            Standalone
                          </span>
                        )}

                        <span className="ml-auto">
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

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {/* Category Selector */}
                    <CategorySelector
                      value={activeCategory}
                      onChange={(newCat) => setActiveCategory(newCat)}
                      disabled={isOffline}
                    />

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
                        className="bg-transparent text-foreground outline-none cursor-pointer max-w-[160px] truncate"
                      >
                        <option value="" className="bg-background text-foreground">
                          Standalone (No Task)
                        </option>
                        {filteredTasks.map((t) => {
                          const dateStr = t.date || t.createdAt;
                          let formattedDate = "";
                          if (dateStr) {
                            const d = new Date(dateStr.includes("T") ? dateStr : `${dateStr}T00:00:00`);
                            if (!isNaN(d.getTime())) {
                              formattedDate = d.toLocaleDateString(undefined, {
                                month: "short",
                                day: "numeric",
                              });
                            }
                          }
                          return (
                            <option key={t.id} value={t.id} className="bg-background text-foreground">
                              Task: {t.title}{formattedDate ? ` (${formattedDate})` : ""}
                            </option>
                          );
                        })}
                      </select>
                    </div>

                    {/* Toggle to include all tasks (including past completed tasks) */}
                    <label
                      className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer select-none border rounded-lg px-2 py-1 bg-muted/40 hover:bg-muted/70 transition-colors"
                      title="Include all tasks (including completed past tasks) ordered datewise"
                    >
                      <input
                        type="checkbox"
                        checked={showAllTasks}
                        onChange={(e) => setShowAllTasks(e.target.checked)}
                        className="h-3.5 w-3.5 rounded border-muted-foreground text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      />
                      <span className="whitespace-nowrap font-medium text-[11px] text-foreground/80">
                        All Tasks
                      </span>
                    </label>

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
                  onClick={() => handleCreateNewNote()}
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
      )}
    </div>
  );
}
