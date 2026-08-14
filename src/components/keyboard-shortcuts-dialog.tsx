import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Keyboard, Sparkles, Navigation, Edit3, Command } from "lucide-react";

interface KeyboardShortcutsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const KeyboardShortcutsDialog: React.FC<KeyboardShortcutsDialogProps> = ({
  open,
  onOpenChange,
}) => {
  const isMac =
    typeof window !== "undefined" &&
    navigator.platform.toUpperCase().indexOf("MAC") >= 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md sm:max-w-lg p-6 max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-bold">
            <Keyboard className="h-5 w-5 text-primary" />
            Keyboard Shortcuts
          </DialogTitle>
          <DialogDescription className="text-xs">
            Boost your daily productivity with quick keyboard shortcuts
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 pt-2 text-sm">
          {/* General & Global Actions */}
          <div>
            <h4 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2.5">
              <Command className="h-3.5 w-3.5" /> General & Actions
            </h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-2 rounded-lg bg-accent/40 border border-border/50 text-xs">
                <span className="font-medium text-foreground">Command Palette / Global Search</span>
                <kbd className="px-2 py-0.5 rounded bg-muted border border-border text-[11px] font-mono font-semibold shadow-xs">
                  {isMac ? "⌘ K" : "Ctrl + K"}
                </kbd>
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-accent/40 border border-border/50 text-xs">
                <span className="font-medium text-foreground">Create New Task</span>
                <kbd className="px-2 py-0.5 rounded bg-muted border border-border text-[11px] font-mono font-semibold shadow-xs">
                  N
                </kbd>
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-accent/40 border border-border/50 text-xs">
                <span className="font-medium text-foreground">Open Shortcuts Help</span>
                <kbd className="px-2 py-0.5 rounded bg-muted border border-border text-[11px] font-mono font-semibold shadow-xs">
                  ?
                </kbd>
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-accent/40 border border-border/50 text-xs">
                <span className="font-medium text-foreground">Close Active Modal / Dropdown</span>
                <kbd className="px-2 py-0.5 rounded bg-muted border border-border text-[11px] font-mono font-semibold shadow-xs">
                  Esc
                </kbd>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <div>
            <h4 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2.5">
              <Navigation className="h-3.5 w-3.5" /> Fast Navigation
            </h4>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center justify-between p-2 rounded-lg bg-accent/40 border border-border/50 text-xs">
                <span className="font-medium text-foreground">Planner</span>
                <kbd className="px-2 py-0.5 rounded bg-muted border border-border text-[11px] font-mono font-semibold shadow-xs">
                  P
                </kbd>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-accent/40 border border-border/50 text-xs">
                <span className="font-medium text-foreground">Dashboard</span>
                <kbd className="px-2 py-0.5 rounded bg-muted border border-border text-[11px] font-mono font-semibold shadow-xs">
                  D
                </kbd>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-accent/40 border border-border/50 text-xs">
                <span className="font-medium text-foreground">Habit Vault</span>
                <kbd className="px-2 py-0.5 rounded bg-muted border border-border text-[11px] font-mono font-semibold shadow-xs">
                  H
                </kbd>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-accent/40 border border-border/50 text-xs">
                <span className="font-medium text-foreground">Notes</span>
                <kbd className="px-2 py-0.5 rounded bg-muted border border-border text-[11px] font-mono font-semibold shadow-xs">
                  M
                </kbd>
              </div>
            </div>
          </div>

          {/* Markdown Shortcuts */}
          <div>
            <h4 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2.5">
              <Edit3 className="h-3.5 w-3.5" /> Note Taking Markdown Shortcuts
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="flex items-center justify-between p-2 rounded-lg bg-accent/40 border border-border/50">
                <span className="text-foreground">Heading 1 / 2 / 3</span>
                <span className="font-mono text-primary font-semibold"># / ## / ###</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-accent/40 border border-border/50">
                <span className="text-foreground">Bullet List</span>
                <span className="font-mono text-primary font-semibold">-  or * </span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-accent/40 border border-border/50">
                <span className="text-foreground">Numbered List</span>
                <span className="font-mono text-primary font-semibold">1. </span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-accent/40 border border-border/50">
                <span className="text-foreground">To-do Checkbox</span>
                <span className="font-mono text-primary font-semibold">[]  or [ ] </span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-accent/40 border border-border/50">
                <span className="text-foreground">Callout Box</span>
                <span className="font-mono text-primary font-semibold">&gt; </span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-accent/40 border border-border/50">
                <span className="text-foreground">Code Snippet</span>
                <span className="font-mono text-primary font-semibold">```</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-accent/40 border border-border/50">
                <span className="text-foreground">Divider Line</span>
                <span className="font-mono text-primary font-semibold">---</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-accent/40 border border-border/50">
                <span className="text-foreground">Slash Commands</span>
                <span className="font-mono text-primary font-semibold">/</span>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
