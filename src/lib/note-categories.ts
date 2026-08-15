import type { Note, NoteCategory } from "@/types";

export const DEFAULT_NOTE_CATEGORIES: NoteCategory[] = [
  {
    id: "cat_ai_learning",
    name: "AI Learning",
    color: "indigo",
    icon: "sparkles",
    description: "AI concepts, LLM prompts, model architectures & AI notes",
    isDefault: true,
  },
  {
    id: "cat_english_learning",
    name: "English Learning",
    color: "emerald",
    icon: "languages",
    description: "Vocabulary, grammar rules, conversation practice & notes",
    isDefault: true,
  },
  {
    id: "cat_tech_coding",
    name: "Tech & Coding",
    color: "cyan",
    icon: "code",
    description: "Code snippets, system design, frameworks & dev debugging",
    isDefault: true,
  },
  {
    id: "cat_work_projects",
    name: "Work & Projects",
    color: "blue",
    icon: "briefcase",
    description: "Project documentation, meetings, sprint tasks & updates",
    isDefault: true,
  },
  {
    id: "cat_personal_growth",
    name: "Personal Growth",
    color: "amber",
    icon: "heart",
    description: "Reflections, self-improvement, health, books & journal",
    isDefault: true,
  },
  {
    id: "cat_ideas_brainstorm",
    name: "Ideas & Brainstorm",
    color: "purple",
    icon: "lightbulb",
    description: "Quick inspirations, draft concepts & innovative brainstorms",
    isDefault: true,
  },
];

export const CATEGORY_COLOR_MAP: Record<
  string,
  {
    badge: string;
    text: string;
    border: string;
    bg: string;
    dot: string;
    accent: string;
  }
> = {
  indigo: {
    badge: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30",
    text: "text-indigo-600 dark:text-indigo-400",
    border: "border-indigo-500/30",
    bg: "bg-indigo-500/10",
    dot: "bg-indigo-500",
    accent: "from-indigo-500/20 to-indigo-500/5",
  },
  emerald: {
    badge: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
    text: "text-emerald-600 dark:text-emerald-400",
    border: "border-emerald-500/30",
    bg: "bg-emerald-500/10",
    dot: "bg-emerald-500",
    accent: "from-emerald-500/20 to-emerald-500/5",
  },
  cyan: {
    badge: "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-500/30",
    text: "text-cyan-600 dark:text-cyan-400",
    border: "border-cyan-500/30",
    bg: "bg-cyan-500/10",
    dot: "bg-cyan-500",
    accent: "from-cyan-500/20 to-cyan-500/5",
  },
  blue: {
    badge: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30",
    text: "text-blue-600 dark:text-blue-400",
    border: "border-blue-500/30",
    bg: "bg-blue-500/10",
    dot: "bg-blue-500",
    accent: "from-blue-500/20 to-blue-500/5",
  },
  amber: {
    badge: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
    text: "text-amber-600 dark:text-amber-400",
    border: "border-amber-500/30",
    bg: "bg-amber-500/10",
    dot: "bg-amber-500",
    accent: "from-amber-500/20 to-amber-500/5",
  },
  purple: {
    badge: "bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30",
    text: "text-purple-600 dark:text-purple-400",
    border: "border-purple-500/30",
    bg: "bg-purple-500/10",
    dot: "bg-purple-500",
    accent: "from-purple-500/20 to-purple-500/5",
  },
  rose: {
    badge: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30",
    text: "text-rose-600 dark:text-rose-400",
    border: "border-rose-500/30",
    bg: "bg-rose-500/10",
    dot: "bg-rose-500",
    accent: "from-rose-500/20 to-rose-500/5",
  },
  slate: {
    badge: "bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30",
    text: "text-slate-600 dark:text-slate-400",
    border: "border-slate-500/30",
    bg: "bg-slate-500/10",
    dot: "bg-slate-500",
    accent: "from-slate-500/20 to-slate-500/5",
  },
};

import { notesApi } from "@/lib/notes-api";

const STORAGE_KEY = "zen_planner_custom_note_categories_v1";

export function loadCategories(): NoteCategory[] {
  if (typeof window === "undefined") return DEFAULT_NOTE_CATEGORIES;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_NOTE_CATEGORIES;
    const custom: NoteCategory[] = JSON.parse(raw);
    const existingNames = new Set(DEFAULT_NOTE_CATEGORIES.map((c) => c.name.toLowerCase()));
    const validCustom = custom.filter((c) => !existingNames.has(c.name.toLowerCase()));
    return [...DEFAULT_NOTE_CATEGORIES, ...validCustom];
  } catch (e) {
    console.error("Failed to load custom categories:", e);
    return DEFAULT_NOTE_CATEGORIES;
  }
}

export async function fetchCategoriesFromBackend(): Promise<NoteCategory[]> {
  try {
    const res = await notesApi.getCategories();
    if (!res.isOffline && res.data && res.data.length > 0) {
      const formatted: NoteCategory[] = res.data.map((c) => ({
        id: c.id,
        name: c.name,
        color: c.color || "indigo",
        icon: c.icon || "sparkles",
        description: c.description || "",
        isDefault: c.is_default || false,
      }));
      // Cache in localStorage
      localStorage.setItem(STORAGE_KEY, JSON.stringify(formatted));
      return formatted;
    }
  } catch (err) {
    console.warn("Could not fetch categories from backend, using cache", err);
  }
  return loadCategories();
}

export async function saveCustomCategoryAsync(category: {
  name: string;
  color: string;
  icon?: string;
  description?: string;
}): Promise<NoteCategory> {
  // Sync to Backend Beanie collection
  try {
    const res = await notesApi.createCategory({
      name: category.name.trim(),
      color: category.color || "indigo",
      icon: category.icon || "sparkles",
      description: category.description || undefined,
    });
    if (!res.isOffline && res.data) {
      const created: NoteCategory = {
        id: res.data.id,
        name: res.data.name,
        color: res.data.color || "indigo",
        icon: res.data.icon || "sparkles",
        description: res.data.description || "",
        isDefault: res.data.is_default || false,
      };
      // update cache
      const current = loadCategories();
      const exists = current.some((c) => c.name.toLowerCase() === created.name.toLowerCase());
      if (!exists) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify([...current, created]));
      }
      return created;
    }
  } catch (err) {
    console.warn("Backend createCategory failed, saving to local fallback", err);
  }

  // Fallback to local save
  return saveCustomCategory(category);
}

export function saveCustomCategory(category: {
  name: string;
  color: string;
  icon?: string;
  description?: string;
}): NoteCategory {
  const all = loadCategories();
  const existing = all.find((c) => c.name.toLowerCase() === category.name.trim().toLowerCase());
  if (existing) return existing;

  const newCat: NoteCategory = {
    id: `cat_custom_${Date.now()}`,
    name: category.name.trim(),
    color: category.color || "indigo",
    icon: category.icon || "sparkles",
    description: category.description || "",
    isDefault: false,
  };

  const raw = localStorage.getItem(STORAGE_KEY);
  const currentCustom: NoteCategory[] = raw ? JSON.parse(raw) : [];
  currentCustom.push(newCat);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(currentCustom));

  // Trigger background sync to backend
  notesApi.createCategory({
    name: newCat.name,
    color: newCat.color,
    icon: newCat.icon,
    description: newCat.description,
  }).catch(() => {});

  return newCat;
}

export async function deleteCustomCategoryAsync(id: string): Promise<void> {
  deleteCustomCategory(id);
  try {
    await notesApi.deleteCategory(id);
  } catch (err) {
    console.warn("Backend deleteCategory failed", err);
  }
}

export function deleteCustomCategory(id: string): void {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const currentCustom: NoteCategory[] = JSON.parse(raw);
    const updated = currentCustom.filter((c) => c.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error("Failed to delete custom category:", e);
  }
}

export function getCategoryStyle(colorName?: string | null) {
  if (!colorName) return CATEGORY_COLOR_MAP.indigo;
  return CATEGORY_COLOR_MAP[colorName.toLowerCase()] || CATEGORY_COLOR_MAP.indigo;
}

export function findCategoryByName(
  categories: NoteCategory[],
  name?: string | null
): NoteCategory | undefined {
  if (!name) return undefined;
  return categories.find((c) => c.name.toLowerCase() === name.toLowerCase());
}

export interface CategoryStats {
  category: NoteCategory;
  totalNotes: number;
  taskLinkedNotes: number;
  standaloneNotes: number;
  notes: Note[];
  taskNotes: Note[];
  standaloneNoteList: Note[];
}

export function calculateCategoryStats(
  categories: NoteCategory[],
  allNotes: Note[]
): {
  stats: CategoryStats[];
  uncategorized: {
    totalNotes: number;
    taskLinkedNotes: number;
    standaloneNotes: number;
    notes: Note[];
  };
} {
  const statsMap = new Map<string, CategoryStats>();

  categories.forEach((cat) => {
    statsMap.set(cat.name.toLowerCase(), {
      category: cat,
      totalNotes: 0,
      taskLinkedNotes: 0,
      standaloneNotes: 0,
      notes: [],
      taskNotes: [],
      standaloneNoteList: [],
    });
  });

  const uncategorizedNotes: Note[] = [];

  allNotes.forEach((n) => {
    const catName = n.category?.trim().toLowerCase();
    const isTaskLinked = n.entity_type === "task" || !!n.entity_id;

    if (catName && statsMap.has(catName)) {
      const entry = statsMap.get(catName)!;
      entry.totalNotes += 1;
      entry.notes.push(n);
      if (isTaskLinked) {
        entry.taskLinkedNotes += 1;
        entry.taskNotes.push(n);
      } else {
        entry.standaloneNotes += 1;
        entry.standaloneNoteList.push(n);
      }
    } else {
      uncategorizedNotes.push(n);
    }
  });

  const uncategorized = {
    totalNotes: uncategorizedNotes.length,
    taskLinkedNotes: uncategorizedNotes.filter((n) => n.entity_type === "task" || !!n.entity_id)
      .length,
    standaloneNotes: uncategorizedNotes.filter(
      (n) => n.entity_type !== "task" && !n.entity_id
    ).length,
    notes: uncategorizedNotes,
  };

  return {
    stats: Array.from(statsMap.values()),
    uncategorized,
  };
}
