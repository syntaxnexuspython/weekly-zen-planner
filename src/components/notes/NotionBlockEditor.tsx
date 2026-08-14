import React, { useState, useRef, useEffect, useCallback } from "react";
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
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? React.useLayoutEffect : React.useEffect;

interface AutoGrowTextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  value: string;
}

const AutoGrowTextarea = React.forwardRef<
  HTMLTextAreaElement,
  AutoGrowTextareaProps
>(({ value, className, onChange, onKeyDown, ...props }, forwardedRef) => {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const resize = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, []);

  useIsomorphicLayoutEffect(() => {
    resize();
  }, [value, resize]);

  return (
    <textarea
      ref={(node) => {
        textareaRef.current = node;
        if (typeof forwardedRef === "function") {
          forwardedRef(node);
        } else if (forwardedRef) {
          forwardedRef.current = node;
        }
      }}
      value={value}
      rows={1}
      onChange={(e) => {
        onChange?.(e);
      }}
      onInput={resize}
      onKeyDown={onKeyDown}
      className={cn(
        "w-full resize-none overflow-hidden bg-transparent leading-relaxed outline-none border-none",
        className
      )}
      {...props}
    />
  );
});
AutoGrowTextarea.displayName = "AutoGrowTextarea";

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
  const [focusTarget, setFocusTarget] = useState<{
    id: string;
    cursorPos?: number;
  } | null>(null);

  const textareaRefs = useRef<Map<string, HTMLTextAreaElement>>(new Map());

  const initialBlocks =
    blocks && blocks.length > 0
      ? blocks
      : [{ id: "b_" + Date.now(), type: "paragraph" as NoteBlockType, content: "" }];

  const registerRef = (id: string, el: HTMLTextAreaElement | null) => {
    if (el) {
      textareaRefs.current.set(id, el);
    } else {
      textareaRefs.current.delete(id);
    }
  };

  useEffect(() => {
    if (focusTarget) {
      const targetEl = textareaRefs.current.get(focusTarget.id);
      if (targetEl) {
        targetEl.focus();
        const pos = focusTarget.cursorPos ?? targetEl.value.length;
        try {
          targetEl.setSelectionRange(pos, pos);
        } catch {
          // ignore if setSelectionRange is not applicable
        }
      }
      setFocusTarget(null);
    }
  }, [initialBlocks, focusTarget]);

  const handleBlockChange = (index: number, content: string) => {
    const currentBlock = initialBlocks[index];

    // Markdown Shortcut Triggers (primarily for paragraph blocks)
    if (currentBlock.type === "paragraph") {
      if (content.startsWith("### ")) {
        const remaining = content.slice(4);
        handleTypeChange(index, "heading3", remaining);
        return;
      }
      if (content.startsWith("## ")) {
        const remaining = content.slice(3);
        handleTypeChange(index, "heading2", remaining);
        return;
      }
      if (content.startsWith("# ")) {
        const remaining = content.slice(2);
        handleTypeChange(index, "heading1", remaining);
        return;
      }
      if (content.startsWith("- ") || content.startsWith("* ")) {
        const remaining = content.slice(2);
        handleTypeChange(index, "bullet", remaining);
        return;
      }
      if (content.startsWith("1. ")) {
        const remaining = content.slice(3);
        handleTypeChange(index, "numbered", remaining);
        return;
      }
      if (content.startsWith("[] ") || content.startsWith("[ ] ")) {
        const prefixLen = content.startsWith("[ ] ") ? 4 : 3;
        const remaining = content.slice(prefixLen);
        handleTypeChange(index, "todo", remaining, false);
        return;
      }
      if (content.startsWith("[x] ")) {
        const remaining = content.slice(4);
        handleTypeChange(index, "todo", remaining, true);
        return;
      }
      if (content.startsWith("> ")) {
        const remaining = content.slice(2);
        handleTypeChange(index, "callout", remaining);
        return;
      }
      if (content.startsWith("```")) {
        const remaining = content.slice(3).trimStart();
        handleTypeChange(index, "code", remaining);
        return;
      }
      if (content === "---") {
        const updated = [...initialBlocks];
        const newParaId = "b_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6);
        updated[index] = { ...updated[index], type: "divider", content: "" };
        updated.splice(index + 1, 0, { id: newParaId, type: "paragraph", content: "" });
        onChange(updated);
        setFocusTarget({ id: newParaId, cursorPos: 0 });
        return;
      }
    }

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

  const handleTypeChange = (
    index: number,
    newType: NoteBlockType,
    customContent?: string,
    customChecked?: boolean
  ) => {
    const updated = [...initialBlocks];
    let content =
      customContent !== undefined ? customContent : updated[index].content;

    // Clean up ending slash if present
    if (content.endsWith("/")) {
      content = content.slice(0, -1);
    }

    const blockId = updated[index].id;
    updated[index] = {
      ...updated[index],
      type: newType,
      content,
      checked:
        newType === "todo"
          ? customChecked !== undefined
            ? customChecked
            : false
          : undefined,
    };
    setActiveSlashIndex(null);
    onChange(updated);
    setFocusTarget({ id: blockId, cursorPos: content.length });
  };

  const handleAddBlockBelow = (index: number, type: NoteBlockType = "paragraph") => {
    const updated = [...initialBlocks];
    const newBlockId = "b_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6);
    const newBlock: NoteBlock = {
      id: newBlockId,
      type,
      content: "",
      checked: type === "todo" ? false : undefined,
    };
    updated.splice(index + 1, 0, newBlock);
    setActiveSlashIndex(null);
    onChange(updated);
    setFocusTarget({ id: newBlockId, cursorPos: 0 });
  };

  const handleDeleteBlock = (index: number) => {
    if (initialBlocks.length <= 1) {
      // Keep at least 1 empty paragraph block
      const newId = "b_" + Date.now();
      onChange([{ id: newId, type: "paragraph", content: "" }]);
      setFocusTarget({ id: newId, cursorPos: 0 });
      return;
    }
    const targetFocusIndex = index > 0 ? index - 1 : 0;
    const targetId =
      initialBlocks[targetFocusIndex === index ? index + 1 : targetFocusIndex]?.id;

    const updated = [...initialBlocks];
    updated.splice(index, 1);
    onChange(updated);

    if (targetId) {
      setFocusTarget({ id: targetId });
    }
  };

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLTextAreaElement>,
    index: number
  ) => {
    if (readOnly) return;

    const currentBlock = initialBlocks[index];
    const textarea = e.currentTarget;
    const selectionStart = textarea.selectionStart ?? currentBlock.content.length;
    const selectionEnd = textarea.selectionEnd ?? currentBlock.content.length;

    if (e.key === "Enter" && !e.shiftKey) {
      if (currentBlock.type !== "code") {
        e.preventDefault();

        // If current block is a list item and content is empty, convert to paragraph
        if (
          ["todo", "bullet", "numbered"].includes(currentBlock.type) &&
          currentBlock.content.trim() === ""
        ) {
          handleTypeChange(index, "paragraph");
          return;
        }

        // Split content at cursor position
        const contentBefore = currentBlock.content.slice(0, selectionStart);
        const contentAfter = currentBlock.content.slice(selectionEnd);

        // Inherit list item type if bullet/todo/numbered
        const currentType = currentBlock.type;
        const nextType = ["todo", "bullet", "numbered"].includes(currentType)
          ? currentType
          : "paragraph";

        const newBlockId = "b_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6);
        const newBlock: NoteBlock = {
          id: newBlockId,
          type: nextType,
          content: contentAfter,
          checked: nextType === "todo" ? false : undefined,
        };

        const updated = [...initialBlocks];
        updated[index] = { ...currentBlock, content: contentBefore };
        updated.splice(index + 1, 0, newBlock);

        onChange(updated);
        setFocusTarget({ id: newBlockId, cursorPos: 0 });
      }
    } else if (e.key === "Backspace") {
      if (selectionStart === 0 && selectionEnd === 0) {
        // If current block is not paragraph and content is empty, convert to paragraph
        if (currentBlock.type !== "paragraph" && currentBlock.content === "") {
          e.preventDefault();
          handleTypeChange(index, "paragraph");
          return;
        }

        // Merge with previous block if index > 0
        if (index > 0) {
          e.preventDefault();
          const prevBlock = initialBlocks[index - 1];
          const prevLength = prevBlock.content.length;
          const mergedContent = prevBlock.content + currentBlock.content;

          const updated = [...initialBlocks];
          updated[index - 1] = {
            ...prevBlock,
            content: mergedContent,
          };
          updated.splice(index, 1);

          onChange(updated);
          setFocusTarget({ id: prevBlock.id, cursorPos: prevLength });
        }
      }
    } else if (e.key === "ArrowUp") {
      if (selectionStart === 0 && selectionEnd === 0 && index > 0) {
        e.preventDefault();
        const prevBlock = initialBlocks[index - 1];
        setFocusTarget({ id: prevBlock.id, cursorPos: prevBlock.content.length });
      }
    } else if (e.key === "ArrowDown") {
      if (
        selectionStart === currentBlock.content.length &&
        selectionEnd === currentBlock.content.length &&
        index < initialBlocks.length - 1
      ) {
        e.preventDefault();
        const nextBlock = initialBlocks[index + 1];
        setFocusTarget({ id: nextBlock.id, cursorPos: 0 });
      }
    } else if (e.key === "Escape") {
      if (activeSlashIndex !== null) {
        setActiveSlashIndex(null);
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
              <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity pt-1 gap-0.5 shrink-0">
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
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
                        type="button"
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
                  type="button"
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
                <AutoGrowTextarea
                  ref={(el) => registerRef(block.id, el)}
                  disabled={readOnly}
                  value={block.content}
                  onChange={(e) => handleBlockChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(e, index)}
                  placeholder="Heading 1"
                  className="text-2xl font-bold text-slate-900 dark:text-slate-100 placeholder:text-slate-300 dark:placeholder:text-slate-700"
                />
              )}

              {block.type === "heading2" && (
                <AutoGrowTextarea
                  ref={(el) => registerRef(block.id, el)}
                  disabled={readOnly}
                  value={block.content}
                  onChange={(e) => handleBlockChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(e, index)}
                  placeholder="Heading 2"
                  className="text-xl font-semibold text-slate-900 dark:text-slate-100 placeholder:text-slate-300 dark:placeholder:text-slate-700"
                />
              )}

              {block.type === "heading3" && (
                <AutoGrowTextarea
                  ref={(el) => registerRef(block.id, el)}
                  disabled={readOnly}
                  value={block.content}
                  onChange={(e) => handleBlockChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(e, index)}
                  placeholder="Heading 3"
                  className="text-lg font-medium text-slate-800 dark:text-slate-200 placeholder:text-slate-300 dark:placeholder:text-slate-700"
                />
              )}

              {block.type === "paragraph" && (
                <AutoGrowTextarea
                  ref={(el) => registerRef(block.id, el)}
                  disabled={readOnly}
                  value={block.content}
                  onChange={(e) => handleBlockChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(e, index)}
                  placeholder="Type '/' for commands or start typing..."
                  className="text-sm text-slate-700 dark:text-slate-300 placeholder:text-slate-400/60 dark:placeholder:text-slate-600"
                />
              )}

              {block.type === "todo" && (
                <div className="flex items-start gap-2 w-full">
                  <button
                    type="button"
                    disabled={readOnly}
                    onClick={() => handleToggleTodo(index)}
                    className="text-slate-500 hover:text-emerald-500 transition-colors pt-1 shrink-0"
                  >
                    {block.checked ? (
                      <CheckSquare className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <Square className="h-4 w-4" />
                    )}
                  </button>
                  <AutoGrowTextarea
                    ref={(el) => registerRef(block.id, el)}
                    disabled={readOnly}
                    value={block.content}
                    onChange={(e) => handleBlockChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, index)}
                    placeholder="To-do item..."
                    className={cn(
                      "text-sm text-slate-700 dark:text-slate-300 placeholder:text-slate-400/60 dark:placeholder:text-slate-600",
                      block.checked && "line-through text-slate-400 dark:text-slate-500"
                    )}
                  />
                </div>
              )}

              {block.type === "bullet" && (
                <div className="flex items-start gap-2 w-full">
                  <span className="text-slate-400 select-none text-base font-bold shrink-0 leading-none pt-1">
                    •
                  </span>
                  <AutoGrowTextarea
                    ref={(el) => registerRef(block.id, el)}
                    disabled={readOnly}
                    value={block.content}
                    onChange={(e) => handleBlockChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, index)}
                    placeholder="List item..."
                    className="text-sm text-slate-700 dark:text-slate-300 placeholder:text-slate-400/60 dark:placeholder:text-slate-600"
                  />
                </div>
              )}

              {block.type === "numbered" && (
                <div className="flex items-start gap-2 w-full">
                  <span className="text-slate-400 select-none text-xs font-semibold shrink-0 min-w-4 pt-1">
                    {index + 1}.
                  </span>
                  <AutoGrowTextarea
                    ref={(el) => registerRef(block.id, el)}
                    disabled={readOnly}
                    value={block.content}
                    onChange={(e) => handleBlockChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, index)}
                    placeholder="List item..."
                    className="text-sm text-slate-700 dark:text-slate-300 placeholder:text-slate-400/60 dark:placeholder:text-slate-600"
                  />
                </div>
              )}

              {block.type === "callout" && (
                <div className="flex items-start gap-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg w-full">
                  <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                  <AutoGrowTextarea
                    ref={(el) => registerRef(block.id, el)}
                    disabled={readOnly}
                    value={block.content}
                    onChange={(e) => handleBlockChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, index)}
                    placeholder="Important note or callout..."
                    className="text-sm font-medium text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                  />
                </div>
              )}

              {block.type === "code" && (
                <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 text-slate-100 font-mono text-xs w-full">
                  <AutoGrowTextarea
                    ref={(el) => registerRef(block.id, el)}
                    disabled={readOnly}
                    value={block.content}
                    onChange={(e) => handleBlockChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, index)}
                    placeholder="// Write or paste code snippet here..."
                    className="text-emerald-400 font-mono text-xs placeholder:text-slate-600"
                  />
                </div>
              )}

              {block.type === "divider" && (
                <div className="py-2 w-full">
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
                    type="button"
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
