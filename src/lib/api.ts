import type { AuthSession, Task, User, WeeklyStats } from "@/types";
import { mockDb } from "./mock-db";

const delay = (ms = 250) => new Promise((r) => setTimeout(r, ms));

export const api = {
  async login(email: string, _password: string): Promise<AuthSession> {
    await delay();
    const db = mockDb.load();
    const user = db.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (!user) throw new Error("Invalid credentials");
    return { user, token: `mock-${user.id}` };
  },

  async getUser(id: string): Promise<User> {
    await delay(100);
    const db = mockDb.load();
    const u = db.users.find((x) => x.id === id);
    if (!u) throw new Error("User not found");
    return u;
  },

  async listUsers(): Promise<User[]> {
    await delay(100);
    return mockDb.load().users;
  },

  async listTasks(userId: string): Promise<Task[]> {
    await delay(100);
    return mockDb.load().tasks.filter((t) => t.userId === userId);
  },

  async listAllTasks(): Promise<Task[]> {
    await delay(100);
    return mockDb.load().tasks;
  },

  async createTask(task: Omit<Task, "id" | "createdAt">): Promise<Task> {
    await delay();
    const db = mockDb.load();
    const newTask: Task = {
      ...task,
      id: `t_${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    db.tasks.push(newTask);
    mockDb.save(db);
    return newTask;
  },

  async updateTask(id: string, patch: Partial<Task>): Promise<Task> {
    await delay(100);
    const db = mockDb.load();
    const idx = db.tasks.findIndex((t) => t.id === id);
    if (idx === -1) throw new Error("Task not found");
    db.tasks[idx] = { ...db.tasks[idx], ...patch };
    mockDb.save(db);
    return db.tasks[idx];
  },

  async deleteTask(id: string): Promise<void> {
    await delay(100);
    const db = mockDb.load();
    db.tasks = db.tasks.filter((t) => t.id !== id);
    mockDb.save(db);
  },

  computeWeeklyStats(tasks: Task[]): WeeklyStats {
    const total = tasks.length;
    const completed = tasks.filter((t) => t.status === "completed").length;
    const pending = tasks.filter((t) => t.status === "pending").length;
    const skipped = tasks.filter((t) => t.status === "skipped").length;
    return {
      totalTasks: total,
      completed,
      pending,
      skipped,
      completionPct: total === 0 ? 0 : Math.round((completed / total) * 100),
    };
  },
};

const MOTIVATIONS = [
  "Small steps every day add up to big results.",
  "Discipline beats motivation. Show up.",
  "Done is better than perfect.",
  "Future-you is counting on present-you.",
  "Consistency compounds.",
  "One task at a time. Breathe.",
  "Energy follows action. Start.",
];

export function randomMotivation() {
  return MOTIVATIONS[Math.floor(Math.random() * MOTIVATIONS.length)];
}

export function getWeekRange(d = new Date()): { start: Date; end: Date; days: Date[] } {
  const day = d.getDay(); // 0..6 Sun..Sat
  const diffToMon = (day + 6) % 7;
  const start = new Date(d);
  start.setDate(d.getDate() - diffToMon);
  start.setHours(0, 0, 0, 0);
  const days = Array.from({ length: 7 }, (_, i) => {
    const x = new Date(start);
    x.setDate(start.getDate() + i);
    return x;
  });
  const end = days[6];
  return { start, end, days };
}

export function ymd(d: Date) {
  return d.toISOString().slice(0, 10);
}
