import React, { useState, useRef } from "react";
import type { NoteBlock, NoteBlockType } from "@/types";
import {
  Heading1,
  Heading2,
  Heading3,
  Type,
  List,
  ListOrdered,
  CheckSquare,
  Square,
  AlertCircle,
  Code,
  Minus,
  Trash2,
  Plus,
  GripVertical,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface NotionBlockEditorProps {
  blocks: NoteBlock[];
  onChange: (blocks: NoteBlock[]) => void;
  readOnly?: boolean;
}

const BLOCK_TYPES: { type: NoteBlockType; label: string; icon: React.ReactNode }[] = [
  { type: "paragraph", label: "Text", icon: <Type className="h-4 w-4" /> },
  { type: "heading1", label: "Heading 1", icon: <Heading1 className="h-4 w-4" /> },
  { type: "heading2", label: "Heading 2", icon: <Heading2 className="h-4 w-4" /> },
  { type: "heading3", label: "Heading 3", icon: <Heading3 className="h-4 w-4" /> },
  { type: "todo", label: "To-do list", icon: <CheckSquare className="h-4 w-4" /> },
  { type: "bullet", label: "Bulleted list", icon: <List className="h-4 w-4" /> },
  { type: "numbered", label: "Numbered list", icon: <ListOrdered className="h-4 w-4" /> },
  { type: "callout", label: "Callout", icon: <AlertCircle className="h-4 w-4" /> },
  { type: "code", label: "Code block", icon: <Code className="h-4 w-4" /> },
  { type: "divider", label: "Divider", icon: <Minus className="h-4 w-4" /> },
];

export const NotionBlockEditor: React.FC<NotionBlockEditorProps> = ({
  blocks,
  onChange,
  readOnly = false,
}) => {
  const [activeSlashIndex, setActiveSlashIndex] = useState<number | null>(null);

  const initialBlocks =
    blocks && blocks.length > 0
      ? blocks
      : [{ id: "b_" + Date.now(), type: "paragraph" as NoteBlockType, content: "" }];

  const handleBlockChange = (index: number, content: string) => {
    const updated = [...initialBlocks];
    updated[index] = { ...updated[index], content };

    // Check if slash command triggered
    if (content.endsWith("/")) {
      setActiveSlashIndex(index);
    } else {
      if (activeSlashIndex === index) {
        setActiveSlashIndex(null);
      }
    }

    onChange(updated);
  };

  const handleToggleTodo = (index: number) => {
    const updated = [...initialBlocks];
    updated[index] = { ...updated[index], checked: !updated[index].checked };
    onChange(updated);
  };

  const handleTypeChange = (index: number, newType: NoteBlockType) => {
    const updated = [...initialBlocks];
    let content = updated[index].content;

    // Clean up ending slash if present
    if (content.endsWith("/")) {
      content = content.slice(0, -1);
    }

    updated[index] = {
      ...updated[index],
      type: newType,
      content,
      checked: newType === "todo" ? false : undefined,
    };
    setActiveSlashIndex(null);
    onChange(updated);
  };

  const handleAddBlockBelow = (index: number, type: NoteBlockType = "paragraph") => {
    const updated = [...initialBlocks];
    const newBlock: NoteBlock = {
      id: "b_" + Date.now() + "_" + Math.random().toString(36).substr(2, 4),
      type,
      content: "",
    };
    updated.splice(index + 1, 0, newBlock);
    onChange(updated);
  };

  const handleDeleteBlock = (index: number) => {
    if (initialBlocks.length <= 1) {
      // Keep at least 1 empty paragraph block
      onChange([{ id: "b_" + Date.now(), type: "paragraph", content: "" }]);
      return;
    }
    const updated = [...initialBlocks];
    updated.splice(index, 1);
    onChange(updated);
  };

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (readOnly) return;

    if (e.key === "Enter" && !e.shiftKey) {
      if (initialBlocks[index].type !== "code") {
        e.preventDefault();
        // Inherit list item type if bullet/todo/numbered
        const currentType = initialBlocks[index].type;
        const nextType = ["todo", "bullet", "numbered"].includes(currentType)
          ? currentType
          : "paragraph";
        handleAddBlockBelow(index, nextType);
      }
    } else if (e.key === "Backspace" && initialBlocks[index].content === "") {
      if (initialBlocks.length > 1) {
        e.preventDefault();
        handleDeleteBlock(index);
      }
    }
  };

  return (
    <div className="w-full space-y-2 py-2">
      {initialBlocks.map((block, index) => {
        return (
          <div
            key={block.id}
            className="group relative flex items-start gap-1 py-1 rounded-md transition-colors hover:bg-slate-500/5 dark:hover:bg-slate-800/20"
          >
            {/* Left Actions / Drag handle */}
            {!readOnly && (
              <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity pt-1 gap-0.5">
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded cursor-pointer"
                      title="Add block"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent align="start" className="w-48 p-1">
                    <div className="text-xs font-semibold px-2 py-1 text-slate-400">
                      Insert Block
                    </div>
                    {BLOCK_TYPES.map((bt) => (
                      <button
                        key={bt.type}
                        onClick={() => handleAddBlockBelow(index, bt.type)}
                        className="w-full flex items-center gap-2 px-2 py-1.5 text-xs rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-left"
                      >
                        {bt.icon}
                        <span>{bt.label}</span>
                      </button>
                    ))}
                  </PopoverContent>
                </Popover>

                <button
                  onClick={() => handleDeleteBlock(index)}
                  className="p-1 text-slate-400 hover:text-red-500 rounded cursor-pointer"
                  title="Delete block"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            {/* Block Content Rendering */}
            <div className="flex-1 min-w-0">
              {block.type === "heading1" && (
                <input
                  type="text"
                  disabled={readOnly}
                  value={block.content}
                  onChange={(e) => handleBlockChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(e, index)}
                  placeholder="Heading 1"
                  className="w-full bg-transparent text-2xl font-bold text-slate-900 dark:text-slate-100 outline-none border-none placeholder:text-slate-300 dark:placeholder:text-slate-700"
                />
              )}

              {block.type === "heading2" && (
                <input
                  type="text"
                  disabled={readOnly}
                  value={block.content}
                  onChange={(e) => handleBlockChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(e, index)}
                  placeholder="Heading 2"
                  className="w-full bg-transparent text-xl font-semibold text-slate-900 dark:text-slate-100 outline-none border-none placeholder:text-slate-300 dark:placeholder:text-slate-700"
                />
              )}

              {block.type === "heading3" && (
                <input
                  type="text"
                  disabled={readOnly}
                  value={block.content}
                  onChange={(e) => handleBlockChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(e, index)}
                  placeholder="Heading 3"
                  className="w-full bg-transparent text-lg font-medium text-slate-800 dark:text-slate-200 outline-none border-none placeholder:text-slate-300 dark:placeholder:text-slate-700"
                />
              )}

              {block.type === "paragraph" && (
                <input
                  type="text"
                  disabled={readOnly}
                  value={block.content}
                  onChange={(e) => handleBlockChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(e, index)}
                  placeholder="Type '/' for commands or start typing..."
                  className="w-full bg-transparent text-sm text-slate-700 dark:text-slate-300 outline-none border-none placeholder:text-slate-400/60 dark:placeholder:text-slate-600"
                />
              )}

              {block.type === "todo" && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={readOnly}
                    onClick={() => handleToggleTodo(index)}
                    className="text-slate-500 hover:text-emerald-500 transition-colors"
                  >
                    {block.checked ? (
                      <CheckSquare className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <Square className="h-4 w-4" />
                    )}
                  </button>
                  <input
                    type="text"
                    disabled={readOnly}
                    value={block.content}
                    onChange={(e) => handleBlockChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, index)}
                    placeholder="To-do item..."
                    className={cn(
                      "w-full bg-transparent text-sm text-slate-700 dark:text-slate-300 outline-none border-none placeholder:text-slate-400/60 dark:placeholder:text-slate-600",
                      block.checked && "line-through text-slate-400 dark:text-slate-500"
                    )}
                  />
                </div>
              )}

              {block.type === "bullet" && (
                <div className="flex items-start gap-2 pt-0.5">
                  <span className="text-slate-400 select-none text-sm font-bold">•</span>
                  <input
                    type="text"
                    disabled={readOnly}
                    value={block.content}
                    onChange={(e) => handleBlockChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, index)}
                    placeholder="List item..."
                    className="w-full bg-transparent text-sm text-slate-700 dark:text-slate-300 outline-none border-none placeholder:text-slate-400/60 dark:placeholder:text-slate-600"
                  />
                </div>
              )}

              {block.type === "numbered" && (
                <div className="flex items-start gap-2 pt-0.5">
                  <span className="text-slate-400 select-none text-xs font-semibold min-w-4">
                    {index + 1}.
                  </span>
                  <input
                    type="text"
                    disabled={readOnly}
                    value={block.content}
                    onChange={(e) => handleBlockChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, index)}
                    placeholder="List item..."
                    className="w-full bg-transparent text-sm text-slate-700 dark:text-slate-300 outline-none border-none placeholder:text-slate-400/60 dark:placeholder:text-slate-600"
                  />
                </div>
              )}

              {block.type === "callout" && (
                <div className="flex items-start gap-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                  <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                  <input
                    type="text"
                    disabled={readOnly}
                    value={block.content}
                    onChange={(e) => handleBlockChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, index)}
                    placeholder="Important note or callout..."
                    className="w-full bg-transparent text-sm font-medium text-slate-800 dark:text-slate-200 outline-none border-none placeholder:text-slate-400 dark:placeholder:text-slate-500"
                  />
                </div>
              )}

              {block.type === "code" && (
                <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 text-slate-100 font-mono text-xs">
                  <textarea
                    rows={3}
                    disabled={readOnly}
                    value={block.content}
                    onChange={(e) => handleBlockChange(index, e.target.value)}
                    placeholder="// Write or paste code snippet here..."
                    className="w-full bg-transparent outline-none resize-none border-none text-emerald-400 font-mono text-xs placeholder:text-slate-600"
                  />
                </div>
              )}

              {block.type === "divider" && (
                <div className="py-2">
                  <hr className="border-t border-slate-200 dark:border-slate-800" />
                </div>
              )}
            </div>

            {/* Slash Command Popover */}
            {activeSlashIndex === index && !readOnly && (
              <div className="absolute left-6 top-8 z-50 w-56 p-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xl animate-in fade-in zoom-in-95">
                <div className="text-[10px] font-bold text-slate-400 px-2 py-1 uppercase tracking-wider">
                  Convert / Insert
                </div>
                {BLOCK_TYPES.map((bt) => (
                  <button
                    key={bt.type}
                    onClick={() => handleTypeChange(index, bt.type)}
                    className="w-full flex items-center gap-2.5 px-2.5 py-1.5 text-xs rounded-md text-slate-700 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors text-left"
                  >
                    {bt.icon}
                    <span className="font-medium">{bt.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
