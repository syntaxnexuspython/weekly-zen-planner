import React, { useState } from "react";
import type { NoteCategory } from "@/types";
import {
  loadCategories,
  fetchCategoriesFromBackend,
  saveCustomCategoryAsync,
  getCategoryStyle,
  findCategoryByName,
} from "@/lib/note-categories";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  Check,
  FolderPlus,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface CategorySelectorProps {
  value?: string | null;
  onChange: (categoryName: string | null) => void;
  disabled?: boolean;
  className?: string;
  size?: "sm" | "default";
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  sparkles: <Sparkles className="h-3.5 w-3.5" />,
  languages: <Languages className="h-3.5 w-3.5" />,
  code: <Code className="h-3.5 w-3.5" />,
  briefcase: <Briefcase className="h-3.5 w-3.5" />,
  heart: <Heart className="h-3.5 w-3.5" />,
  lightbulb: <Lightbulb className="h-3.5 w-3.5" />,
};

const AVAILABLE_COLORS = ["indigo", "emerald", "cyan", "blue", "amber", "purple", "rose", "slate"];

export const CategorySelector: React.FC<CategorySelectorProps> = ({
  value,
  onChange,
  disabled = false,
  className,
  size = "default",
}) => {
  const [categories, setCategories] = useState<NoteCategory[]>(loadCategories());
  const [isAdding, setIsAdding] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [newCatColor, setNewCatColor] = useState("indigo");
  const [isOpen, setIsOpen] = useState(false);

  React.useEffect(() => {
    fetchCategoriesFromBackend().then((cats) => {
      if (cats && cats.length > 0) {
        setCategories(cats);
      }
    });
  }, []);

  const activeCategory = findCategoryByName(categories, value);
  const activeStyle = getCategoryStyle(activeCategory?.color);

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    const created = await saveCustomCategoryAsync({
      name: newCatName.trim(),
      color: newCatColor,
      icon: "sparkles",
    });

    const updated = loadCategories();
    setCategories(updated);
    onChange(created.name);
    setNewCatName("");
    setIsAdding(false);
  };

  const getIcon = (cat?: NoteCategory) => {
    if (!cat?.icon || !CATEGORY_ICONS[cat.icon]) {
      return <Tag className="h-3.5 w-3.5" />;
    }
    return CATEGORY_ICONS[cat.icon];
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild disabled={disabled}>
        <Button
          type="button"
          variant="outline"
          size={size === "sm" ? "sm" : "default"}
          className={cn(
            "h-8 px-2.5 text-xs font-medium gap-1.5 border rounded-lg transition-all",
            value && activeCategory
              ? activeStyle.badge
              : "text-muted-foreground bg-muted/40 hover:bg-muted/70 hover:text-foreground",
            className
          )}
        >
          {activeCategory ? (
            <>
              <span className={cn("shrink-0", activeStyle.text)}>{getIcon(activeCategory)}</span>
              <span className="truncate max-w-[130px]">{activeCategory.name}</span>
            </>
          ) : value ? (
            <>
              <Tag className="h-3.5 w-3.5 shrink-0 text-indigo-500" />
              <span className="truncate max-w-[130px]">{value}</span>
            </>
          ) : (
            <>
              <Tag className="h-3.5 w-3.5 shrink-0 opacity-70" />
              <span>No Category</span>
            </>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-64 p-1.5 shadow-xl rounded-xl">
        <DropdownMenuLabel className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-2 py-1 flex items-center justify-between">
          <span>Note Category</span>
          {value && (
            <button
              onClick={() => {
                onChange(null);
                setIsOpen(false);
              }}
              className="text-[10px] text-muted-foreground hover:text-red-500 normal-case font-normal transition-colors"
            >
              Clear
            </button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        <div className="max-h-56 overflow-y-auto space-y-0.5 py-1">
          {/* None option */}
          <DropdownMenuItem
            onClick={() => {
              onChange(null);
              setIsOpen(false);
            }}
            className={cn(
              "flex items-center justify-between text-xs px-2 py-1.5 rounded-lg cursor-pointer",
              !value ? "bg-accent font-medium text-foreground" : "text-muted-foreground"
            )}
          >
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-700" />
              <span>No Category (Uncategorized)</span>
            </div>
            {!value && <Check className="h-3.5 w-3.5 text-indigo-600" />}
          </DropdownMenuItem>

          {/* Categories list */}
          {categories.map((cat) => {
            const isSelected = value?.toLowerCase() === cat.name.toLowerCase();
            const style = getCategoryStyle(cat.color);
            return (
              <DropdownMenuItem
                key={cat.id}
                onClick={() => {
                  onChange(cat.name);
                  setIsOpen(false);
                }}
                className={cn(
                  "flex items-center justify-between text-xs px-2 py-1.5 rounded-lg cursor-pointer group",
                  isSelected ? "bg-accent font-medium text-foreground" : "text-foreground hover:bg-accent/50"
                )}
              >
                <div className="flex items-center gap-2 truncate">
                  <div className={cn("w-2 h-2 rounded-full shrink-0", style.dot)} />
                  <span className={cn("shrink-0", style.text)}>{getIcon(cat)}</span>
                  <span className="truncate">{cat.name}</span>
                </div>
                {isSelected && <Check className="h-3.5 w-3.5 text-indigo-600 shrink-0" />}
              </DropdownMenuItem>
            );
          })}
        </div>

        <DropdownMenuSeparator />

        {/* Custom Category Creation */}
        {!isAdding ? (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              setIsAdding(true);
            }}
            className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/10 rounded-lg font-medium transition-colors"
          >
            <FolderPlus className="h-3.5 w-3.5" />
            <span>New Custom Category</span>
          </button>
        ) : (
          <form onSubmit={handleCreateCategory} className="p-2 space-y-2 bg-muted/40 rounded-lg">
            <div className="text-[11px] font-semibold text-foreground">Create Category</div>
            <Input
              type="text"
              placeholder="e.g. Spanish Learning"
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              className="h-7 text-xs bg-background"
              autoFocus
            />
            {/* Color picker */}
            <div className="flex items-center gap-1.5 pt-1">
              {AVAILABLE_COLORS.map((col) => (
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
              ))}
            </div>
            <div className="flex items-center justify-end gap-1.5 pt-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsAdding(false)}
                className="h-6 px-2 text-[11px]"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={!newCatName.trim()}
                className="h-6 px-2.5 text-[11px] bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                Add
              </Button>
            </div>
          </form>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
