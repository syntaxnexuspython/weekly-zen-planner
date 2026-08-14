import React, { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import {
  Calendar,
  LayoutDashboard,
  ListTodo,
  ShieldCheck,
  FileText,
  User,
  Plus,
  Inbox,
  MessageSquare,
  Moon,
  Sun,
  Sparkles,
  Keyboard,
  LogOut,
  Shield,
  Clock,
  Search,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { notesApi } from "@/lib/notes-api";
import type { Task, Note } from "@/types";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNewTask?: () => void;
  onOpenPending?: () => void;
  onOpenFeedback?: () => void;
  onOpenShortcuts?: () => void;
  onOpenAIAssistant?: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  open,
  onOpenChange,
  onNewTask,
  onOpenPending,
  onOpenFeedback,
  onOpenShortcuts,
  onOpenAIAssistant,
}) => {
  const navigate = useNavigate();
  const { session, logout } = useAuth();
  const isAdmin = session?.role === "admin";

  const { data: allTasks = [] } = useQuery<Task[]>({
    queryKey: ["all-tasks"],
    queryFn: () => api.listTasks(),
    enabled: open && !!session?.access_token,
  });

  const { data: notesResponse } = useQuery({
    queryKey: ["all-notes-search"],
    queryFn: () => notesApi.getNotes({}),
    enabled: open && !!session?.access_token,
  });

  const notes: Note[] = notesResponse?.data || [];

  const runCommand = (command: () => void) => {
    onOpenChange(false);
    command();
  };

  const toggleTheme = () => {
    const isDark = document.documentElement.classList.contains("dark");
    if (isDark) {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    } else {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    }
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Type a command or search tasks, notes..." />
      <CommandList className="max-h-[380px] p-2">
        <CommandEmpty>No results found.</CommandEmpty>

        {/* Quick Actions */}
        <CommandGroup heading="Quick Actions">
          {onNewTask && (
            <CommandItem
              onSelect={() => runCommand(onNewTask)}
              className="cursor-pointer"
            >
              <Plus className="mr-2 h-4 w-4 text-emerald-500" />
              <span>Create New Task</span>
              <CommandShortcut>N</CommandShortcut>
            </CommandItem>
          )}

          <CommandItem
            onSelect={() =>
              runCommand(() => navigate({ to: "/notes" }))
            }
            className="cursor-pointer"
          >
            <FileText className="mr-2 h-4 w-4 text-indigo-500" />
            <span>Open Notes & Scratchpad</span>
            <CommandShortcut>M</CommandShortcut>
          </CommandItem>

          {onOpenAIAssistant && (
            <CommandItem
              onSelect={() => runCommand(onOpenAIAssistant)}
              className="cursor-pointer"
            >
              <Sparkles className="mr-2 h-4 w-4 text-purple-500" />
              <span>Ask AI Assistant</span>
            </CommandItem>
          )}

          {onOpenPending && (
            <CommandItem
              onSelect={() => runCommand(onOpenPending)}
              className="cursor-pointer"
            >
              <Inbox className="mr-2 h-4 w-4 text-amber-500" />
              <span>View Pending Tasks</span>
            </CommandItem>
          )}

          <CommandItem
            onSelect={() => runCommand(toggleTheme)}
            className="cursor-pointer"
          >
            <Sun className="mr-2 h-4 w-4 text-amber-400 dark:hidden" />
            <Moon className="mr-2 h-4 w-4 text-blue-400 hidden dark:inline" />
            <span>Toggle Dark / Light Mode</span>
          </CommandItem>

          {onOpenShortcuts && (
            <CommandItem
              onSelect={() => runCommand(onOpenShortcuts)}
              className="cursor-pointer"
            >
              <Keyboard className="mr-2 h-4 w-4 text-slate-400" />
              <span>Keyboard Shortcuts</span>
              <CommandShortcut>?</CommandShortcut>
            </CommandItem>
          )}
        </CommandGroup>

        <CommandSeparator className="my-1" />

        {/* Navigation */}
        <CommandGroup heading="Navigation">
          <CommandItem
            onSelect={() =>
              runCommand(() => navigate({ to: "/planner" }))
            }
            className="cursor-pointer"
          >
            <ListTodo className="mr-2 h-4 w-4 text-primary" />
            <span>Planner</span>
            <CommandShortcut>P</CommandShortcut>
          </CommandItem>

          <CommandItem
            onSelect={() =>
              runCommand(() => navigate({ to: "/dashboard" }))
            }
            className="cursor-pointer"
          >
            <LayoutDashboard className="mr-2 h-4 w-4 text-primary" />
            <span>Dashboard</span>
            <CommandShortcut>D</CommandShortcut>
          </CommandItem>

          <CommandItem
            onSelect={() =>
              runCommand(() => navigate({ to: "/habit-quitter" }))
            }
            className="cursor-pointer"
          >
            <ShieldCheck className="mr-2 h-4 w-4 text-primary" />
            <span>Habit Vault</span>
            <CommandShortcut>H</CommandShortcut>
          </CommandItem>

          <CommandItem
            onSelect={() =>
              runCommand(() => navigate({ to: "/profile" }))
            }
            className="cursor-pointer"
          >
            <User className="mr-2 h-4 w-4 text-slate-400" />
            <span>Profile & Settings</span>
          </CommandItem>

          {isAdmin && (
            <CommandItem
              onSelect={() =>
                runCommand(() => navigate({ to: "/admin" }))
              }
              className="cursor-pointer text-amber-500"
            >
              <Shield className="mr-2 h-4 w-4" />
              <span>Admin Console</span>
            </CommandItem>
          )}

          {onOpenFeedback && (
            <CommandItem
              onSelect={() => runCommand(onOpenFeedback)}
              className="cursor-pointer"
            >
              <MessageSquare className="mr-2 h-4 w-4 text-slate-400" />
              <span>Send Feedback</span>
            </CommandItem>
          )}
        </CommandGroup>

        {/* Search Results: Tasks */}
        {allTasks.length > 0 && (
          <>
            <CommandSeparator className="my-1" />
            <CommandGroup heading={`Tasks (${allTasks.slice(0, 10).length})`}>
              {allTasks.slice(0, 10).map((task) => (
                <CommandItem
                  key={task.id}
                  value={`task ${task.title} ${task.date} ${task.specializedTitle || ""}`}
                  onSelect={() =>
                    runCommand(() =>
                      navigate({
                        to: "/planner/$date",
                        params: { date: task.date },
                      })
                    )
                  }
                  className="cursor-pointer flex items-center justify-between"
                >
                  <div className="flex items-center gap-2 truncate">
                    <ListTodo className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="truncate">{task.title}</span>
                  </div>
                  <div className="flex items-center gap-1 text-[11px] text-muted-foreground shrink-0">
                    <Clock className="h-3 w-3" />
                    <span>{task.date}</span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {/* Search Results: Notes */}
        {notes.length > 0 && (
          <>
            <CommandSeparator className="my-1" />
            <CommandGroup heading={`Notes (${notes.slice(0, 6).length})`}>
              {notes.slice(0, 6).map((note) => (
                <CommandItem
                  key={note.id}
                  value={`note ${note.title || "Untitled"}`}
                  onSelect={() =>
                    runCommand(() => navigate({ to: "/notes" }))
                  }
                  className="cursor-pointer flex items-center gap-2"
                >
                  <FileText className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                  <span className="truncate">{note.title || "Untitled Note"}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        <CommandSeparator className="my-1" />
        <CommandGroup heading="Account">
          <CommandItem
            onSelect={() =>
              runCommand(() => {
                logout();
                navigate({ to: "/login" });
              })
            }
            className="cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10"
          >
            <LogOut className="mr-2 h-4 w-4" />
            <span>Log out</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
};
