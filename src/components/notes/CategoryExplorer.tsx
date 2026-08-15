import React, { useState, useMemo } from "react";
import type { Note, NoteCategory, Task } from "@/types";
import {
  loadCategories,
  fetchCategoriesFromBackend,
  saveCustomCategoryAsync,
  getCategoryStyle,
  calculateCategoryStats,
  type CategoryStats,
} from "@/lib/note-categories";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sparkles,
  Languages,
  Code,
  Briefcase,
  Heart,
  Lightbulb,
  Tag,
  Plus,
  ArrowLeft,
  Search,
  CheckCircle2,
  FileText,
  Link as LinkIcon,
  Layers,
  Edit3,
  Calendar,
  ExternalLink,
  ChevronRight,
  FolderPlus,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface CategoryExplorerProps {
  notes: Note[];
  tasks: Task[];
  onSelectNote: (note: Note) => void;
  onCreateNoteInCategory: (categoryName: string) => void;
  isOffline?: boolean;
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  sparkles: <Sparkles className="h-4 w-4" />,
  languages: <Languages className="h-4 w-4" />,
  code: <Code className="h-4 w-4" />,
  briefcase: <Briefcase className="h-4 w-4" />,
  heart: <Heart className="h-4 w-4" />,
  lightbulb: <Lightbulb className="h-4 w-4" />,
};

export const CategoryExplorer: React.FC<CategoryExplorerProps> = ({
  notes,
  tasks,
  onSelectNote,
  onCreateNoteInCategory,
  isOffline = false,
}) => {
  const [categories, setCategories] = useState<NoteCategory[]>(loadCategories());
  const [selectedCategoryName, setSelectedCategoryName] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"all" | "task" | "standalone">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreatingCat, setIsCreatingCat] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [newCatDesc, setNewCatDesc] = useState("");
  const [newCatColor, setNewCatColor] = useState("indigo");

  React.useEffect(() => {
    fetchCategoriesFromBackend().then((cats) => {
      if (cats && cats.length > 0) {
        setCategories(cats);
      }
    });
  }, []);

  // Task lookup map by ID
  const taskMap = useMemo(() => {
    const map = new Map<string, Task>();
    tasks.forEach((t) => map.set(t.id, t));
    return map;
  }, [tasks]);

  const { stats, uncategorized } = useMemo(() => {
    return calculateCategoryStats(categories, notes);
  }, [categories, notes]);

  const activeCategoryStat = useMemo(() => {
    if (!selectedCategoryName) return null;
    if (selectedCategoryName === "__uncategorized__") {
      return {
        category: {
          id: "uncategorized",
          name: "Uncategorized",
          color: "slate",
          icon: "tag",
          description: "Notes not assigned to any specific category.",
          isDefault: false,
        } as NoteCategory,
        totalNotes: uncategorized.totalNotes,
        taskLinkedNotes: uncategorized.taskLinkedNotes,
        standaloneNotes: uncategorized.standaloneNotes,
        notes: uncategorized.notes,
        taskNotes: uncategorized.notes.filter((n) => n.entity_type === "task" || !!n.entity_id),
        standaloneNoteList: uncategorized.notes.filter(
          (n) => n.entity_type !== "task" && !n.entity_id
        ),
      };
    }
    return (
      stats.find((s) => s.category.name.toLowerCase() === selectedCategoryName.toLowerCase()) ||
      null
    );
  }, [selectedCategoryName, stats, uncategorized]);

  const getIcon = (iconName?: string) => {
    if (!iconName || !CATEGORY_ICONS[iconName]) {
      return <Tag className="h-4 w-4" />;
    }
    return CATEGORY_ICONS[iconName];
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    await saveCustomCategoryAsync({
      name: newCatName.trim(),
      color: newCatColor,
      icon: "sparkles",
      description: newCatDesc.trim() || undefined,
    });

    const updated = loadCategories();
    setCategories(updated);
    setNewCatName("");
    setNewCatDesc("");
    setIsCreatingCat(false);
  };

  // Filter notes inside selected category by search & tab
  const filteredCategoryNotes = useMemo(() => {
    if (!activeCategoryStat) return [];
    let list: Note[] = [];
    if (activeTab === "task") {
      list = activeCategoryStat.taskNotes;
    } else if (activeTab === "standalone") {
      list = activeCategoryStat.standaloneNoteList;
    } else {
      list = activeCategoryStat.notes;
    }

    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter(
      (n) =>
        n.title.toLowerCase().includes(q) ||
        n.blocks?.some((b) => b.content?.toLowerCase().includes(q))
    );
  }, [activeCategoryStat, activeTab, searchQuery]);

  const getSnippet = (note: Note) => {
    const firstText = note.blocks?.find((b) => b.content && b.content.trim().length > 0);
    return firstText?.content || "No content yet...";
  };

  // DETAIL VIEW
  if (selectedCategoryName && activeCategoryStat) {
    const cat = activeCategoryStat.category;
    const style = getCategoryStyle(cat.color);

    return (
      <div className="space-y-6">
        {/* Category Detail Header */}
        <div className="bg-card border rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedCategoryName(null);
                  setSearchQuery("");
                }}
                className="gap-1.5 h-8 text-xs text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>All Categories</span>
              </Button>

              <div className="flex items-center gap-2.5">
                <div
                  className={cn(
                    "w-9 h-9 rounded-xl flex items-center justify-center border shadow-xs",
                    style.bg,
                    style.border,
                    style.text
                  )}
                >
                  {getIcon(cat.icon)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold text-foreground">{cat.name}</h2>
                    <span className={cn("px-2 py-0.5 rounded-full text-xs font-semibold border", style.badge)}>
                      {activeCategoryStat.totalNotes} {activeCategoryStat.totalNotes === 1 ? "Note" : "Notes"}
                    </span>
                  </div>
                  {cat.description && (
                    <p className="text-xs text-muted-foreground mt-0.5">{cat.description}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <Button
                onClick={() => onCreateNoteInCategory(cat.name === "Uncategorized" ? "" : cat.name)}
                disabled={isOffline}
                className="gap-1.5 h-8 text-xs bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>New Note in {cat.name}</span>
              </Button>
            </div>
          </div>

          {/* Stats Bar & Sub Tabs */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t">
            {/* Filter Tabs */}
            <div className="flex items-center gap-1.5 bg-muted/60 p-1 rounded-xl text-xs">
              <button
                onClick={() => setActiveTab("all")}
                className={cn(
                  "px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5",
                  activeTab === "all"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Layers className="h-3.5 w-3.5" />
                <span>All ({activeCategoryStat.totalNotes})</span>
              </button>

              <button
                onClick={() => setActiveTab("task")}
                className={cn(
                  "px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5",
                  activeTab === "task"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <LinkIcon className="h-3.5 w-3.5 text-indigo-500" />
                <span>Task Linked ({activeCategoryStat.taskLinkedNotes})</span>
              </button>

              <button
                onClick={() => setActiveTab("standalone")}
                className={cn(
                  "px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5",
                  activeTab === "standalone"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <FileText className="h-3.5 w-3.5 text-slate-500" />
                <span>Standalone ({activeCategoryStat.standaloneNotes})</span>
              </button>
            </div>

            {/* Quick Search */}
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                type="text"
                placeholder={`Search in ${cat.name}...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 pl-8 text-xs bg-background"
              />
            </div>
          </div>
        </div>

        {/* Notes Grid */}
        {filteredCategoryNotes.length === 0 ? (
          <div className="bg-card border border-dashed rounded-2xl p-12 text-center flex flex-col items-center justify-center gap-3">
            <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center border", style.bg, style.border, style.text)}>
              {getIcon(cat.icon)}
            </div>
            <div>
              <h4 className="text-base font-semibold text-foreground">No notes in this view</h4>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                {activeTab === "task"
                  ? `No task-linked notes found in ${cat.name}. You can link a note to a task in the editor or task drawer.`
                  : activeTab === "standalone"
                  ? `No standalone notes found in ${cat.name}.`
                  : `Get started by writing your first note in ${cat.name}!`}
              </p>
            </div>
            <Button
              onClick={() => onCreateNoteInCategory(cat.name === "Uncategorized" ? "" : cat.name)}
              disabled={isOffline}
              size="sm"
              className="gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white mt-1"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Create Note</span>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCategoryNotes.map((note) => {
              const isTaskLinked = note.entity_type === "task" || !!note.entity_id;
              const linkedTask = note.entity_id ? taskMap.get(note.entity_id) : undefined;

              return (
                <div
                  key={note.id}
                  onClick={() => onSelectNote(note)}
                  className="group bg-card hover:bg-accent/40 border border-border hover:border-indigo-500/40 rounded-2xl p-4 transition-all duration-200 cursor-pointer flex flex-col justify-between shadow-xs hover:shadow-md gap-3"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-sm text-foreground line-clamp-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        {note.title || "Untitled Note"}
                      </h3>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectNote(note);
                        }}
                        className="p-1 rounded-lg text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-indigo-600 hover:bg-indigo-500/10 transition-all"
                        title="Open in Editor"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {/* Content Snippet */}
                    <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                      {getSnippet(note)}
                    </p>
                  </div>

                  {/* Footer Badges & Metadata */}
                  <div className="pt-2 border-t flex flex-col gap-2">
                    {/* Task Link Badge if linked */}
                    {isTaskLinked && (
                      <div className="flex items-center gap-1.5 text-[11px] bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 px-2 py-1 rounded-lg">
                        <LinkIcon className="h-3 w-3 shrink-0" />
                        <span className="truncate font-medium">
                          Task: {linkedTask?.title || note.entity_id || "Linked Task"}
                        </span>
                        {linkedTask?.status === "completed" && (
                          <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0 ml-auto" />
                        )}
                      </div>
                    )}

                    <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3 opacity-70" />
                        {new Date(note.updated_at || note.created_at).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>

                      {!isTaskLinked ? (
                        <span className="px-1.5 py-0.5 rounded bg-slate-500/10 text-slate-600 dark:text-slate-400 font-medium">
                          Standalone
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 font-medium">
                          Task Linked
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // OVERVIEW / EXPLORER DASHBOARD
  return (
    <div className="space-y-6">
      {/* Overview Top Bar */}
      <div className="bg-card border rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
              <Layers className="h-5 w-5 text-indigo-500" />
              <span>Note Category Explorer</span>
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Organize and browse your notes by dedicated topics, with separated task-linked and standalone notes.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {!isCreatingCat && (
              <Button
                onClick={() => setIsCreatingCat(true)}
                variant="outline"
                size="sm"
                className="gap-1.5 h-8 text-xs border-dashed text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/10"
              >
                <FolderPlus className="h-3.5 w-3.5" />
                <span>New Category</span>
              </Button>
            )}
          </div>
        </div>

        {/* Create Category Inline Form */}
        {isCreatingCat && (
          <form
            onSubmit={handleCreateCategory}
            className="p-4 bg-muted/40 border rounded-xl space-y-3 animate-in fade-in duration-200"
          >
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold text-foreground">Create Custom Category</h4>
              <button
                type="button"
                onClick={() => setIsCreatingCat(false)}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Cancel
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                type="text"
                placeholder="Category Name (e.g. Japanese Learning, Python Backend)"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                className="h-8 text-xs bg-background"
                autoFocus
              />
              <Input
                type="text"
                placeholder="Optional short description..."
                value={newCatDesc}
                onChange={(e) => setNewCatDesc(e.target.value)}
                className="h-8 text-xs bg-background"
              />
            </div>
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>Color:</span>
                {["indigo", "emerald", "cyan", "blue", "amber", "purple", "rose", "slate"].map(
                  (col) => (
                    <button
                      key={col}
                      type="button"
                      onClick={() => setNewCatColor(col)}
                      className={cn(
                        "w-4 h-4 rounded-full transition-transform",
                        getCategoryStyle(col).dot,
                        newCatColor === col ? "ring-2 ring-foreground scale-110" : "opacity-70 hover:opacity-100"
                      )}
                    />
                  )
                )}
              </div>
              <Button
                type="submit"
                size="sm"
                disabled={!newCatName.trim()}
                className="h-7 text-xs bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                Save Category
              </Button>
            </div>
          </form>
        )}
      </div>

      {/* Categories Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {stats.map((stat) => {
          const cat = stat.category;
          const style = getCategoryStyle(cat.color);

          return (
            <div
              key={cat.id}
              onClick={() => {
                setSelectedCategoryName(cat.name);
                setActiveTab("all");
              }}
              className="group bg-card hover:bg-accent/30 border border-border hover:border-indigo-500/40 rounded-2xl p-5 transition-all duration-200 cursor-pointer flex flex-col justify-between shadow-xs hover:shadow-md relative overflow-hidden"
            >
              {/* Colored top gradient line */}
              <div className={cn("absolute top-0 left-0 right-0 h-1 bg-gradient-to-r", style.accent)} />

              <div className="space-y-3">
                {/* Header with Icon & Name */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center border shadow-xs transition-transform group-hover:scale-105",
                        style.bg,
                        style.border,
                        style.text
                      )}
                    >
                      {getIcon(cat.icon)}
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-foreground group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        {cat.name}
                      </h3>
                      <p className="text-[11px] text-muted-foreground line-clamp-1">
                        {cat.description || "Collection of notes"}
                      </p>
                    </div>
                  </div>

                  <span className={cn("px-2 py-0.5 rounded-full text-xs font-semibold border", style.badge)}>
                    {stat.totalNotes}
                  </span>
                </div>

                {/* Breakdown Stats */}
                <div className="grid grid-cols-2 gap-2 bg-muted/40 rounded-xl p-2.5 text-xs">
                  <div className="flex items-center gap-2">
                    <LinkIcon className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                    <div>
                      <div className="text-[10px] text-muted-foreground">Task Linked</div>
                      <div className="font-semibold text-foreground">{stat.taskLinkedNotes}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <FileText className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                    <div>
                      <div className="text-[10px] text-muted-foreground">Standalone</div>
                      <div className="font-semibold text-foreground">{stat.standaloneNotes}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Explore link */}
              <div className="pt-3 border-t mt-4 flex items-center justify-between text-xs font-medium text-indigo-600 dark:text-indigo-400">
                <span>Explore Notes</span>
                <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </div>
            </div>
          );
        })}

        {/* Uncategorized Card if any notes exist */}
        {uncategorized.totalNotes > 0 && (
          <div
            onClick={() => {
              setSelectedCategoryName("__uncategorized__");
              setActiveTab("all");
            }}
            className="group bg-card hover:bg-accent/30 border border-dashed rounded-2xl p-5 transition-all duration-200 cursor-pointer flex flex-col justify-between shadow-xs hover:shadow-md"
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center border bg-slate-500/10 border-slate-500/20 text-slate-600 dark:text-slate-400">
                    <Tag className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-foreground">Uncategorized Notes</h3>
                    <p className="text-[11px] text-muted-foreground">Notes without a category assigned</p>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-500/15 text-slate-700 dark:text-slate-300 border border-slate-500/30">
                  {uncategorized.totalNotes}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 bg-muted/40 rounded-xl p-2.5 text-xs">
                <div className="flex items-center gap-2">
                  <LinkIcon className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                  <div>
                    <div className="text-[10px] text-muted-foreground">Task Linked</div>
                    <div className="font-semibold text-foreground">{uncategorized.taskLinkedNotes}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <FileText className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                  <div>
                    <div className="text-[10px] text-muted-foreground">Standalone</div>
                    <div className="font-semibold text-foreground">{uncategorized.standaloneNotes}</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t mt-4 flex items-center justify-between text-xs font-medium text-slate-600 dark:text-slate-400">
              <span>View Uncategorized</span>
              <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
