const GAMIFICATION_STORAGE_KEY = "zen_planner_gamification_v1";

export interface UserGamificationState {
  xp: number;
  level: number;
  levelTitle: string;
  unlockedThemes: string[];
  unlockedBorders: string[];
  activeBorder: string;
}

export function getLevelTitle(level: number): string {
  if (level >= 10) return "Zen Grandmaster";
  if (level >= 5) return "Streak Knight";
  if (level >= 3) return "Focus Apprentice";
  return "Zen Novice";
}

const DEFAULT_STATE: UserGamificationState = {
  xp: 350, // Initial bonus XP
  level: 1,
  levelTitle: "Zen Novice",
  unlockedThemes: ["light", "dark", "system"],
  unlockedBorders: ["default"],
  activeBorder: "default",
};

let inMemoryState: UserGamificationState = { ...DEFAULT_STATE };

// Preload state from localStorage
if (typeof window !== "undefined") {
  try {
    const raw = localStorage.getItem(GAMIFICATION_STORAGE_KEY);
    if (raw) {
      inMemoryState = JSON.parse(raw);
    } else {
      localStorage.setItem(GAMIFICATION_STORAGE_KEY, JSON.stringify(DEFAULT_STATE));
    }
  } catch (e) {
    console.warn("Failed to load gamification state:", e);
  }
}

export function getGamificationState(): UserGamificationState {
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(GAMIFICATION_STORAGE_KEY);
      if (raw) {
        inMemoryState = JSON.parse(raw);
      }
    } catch {}
  }
  return inMemoryState;
}

type LevelUpCallback = (newLevel: number, levelTitle: string) => void;
const levelUpListeners: LevelUpCallback[] = [];

export function onLevelUp(callback: LevelUpCallback): () => void {
  levelUpListeners.push(callback);
  return () => {
    const idx = levelUpListeners.indexOf(callback);
    if (idx !== -1) levelUpListeners.splice(idx, 1);
  };
}

export function addXP(amount: number, reason?: string): { state: UserGamificationState; leveledUp: boolean } {
  const current = getGamificationState();
  const oldLevel = current.level;
  const newXP = current.xp + amount;
  const newLevel = Math.floor(newXP / 500) + 1;
  const leveledUp = newLevel > oldLevel;

  const unlockedThemes = [...current.unlockedThemes];
  const unlockedBorders = [...current.unlockedBorders];

  if (newLevel >= 3 && !unlockedThemes.includes("forest")) unlockedThemes.push("forest");
  if (newLevel >= 3 && !unlockedBorders.includes("golden_ring")) unlockedBorders.push("golden_ring");
  if (newLevel >= 5 && !unlockedThemes.includes("cyberpunk")) unlockedThemes.push("cyberpunk");
  if (newLevel >= 5 && !unlockedBorders.includes("neon_ring")) unlockedBorders.push("neon_ring");
  if (newLevel >= 7 && !unlockedThemes.includes("sunset")) unlockedThemes.push("sunset");
  if (newLevel >= 10 && !unlockedBorders.includes("diamond_frame")) unlockedBorders.push("diamond_frame");

  const updatedState: UserGamificationState = {
    ...current,
    xp: newXP,
    level: newLevel,
    levelTitle: getLevelTitle(newLevel),
    unlockedThemes,
    unlockedBorders,
  };

  inMemoryState = updatedState;
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(GAMIFICATION_STORAGE_KEY, JSON.stringify(updatedState));
      // Dispatch custom event for UI reactivity
      window.dispatchEvent(new CustomEvent("gamification_updated", { detail: updatedState }));
    } catch (e) {
      console.warn("Failed to persist gamification state:", e);
    }
  }

  if (leveledUp) {
    levelUpListeners.forEach((cb) => cb(newLevel, getLevelTitle(newLevel)));
  }

  return { state: updatedState, leveledUp };
}

export function setActiveAvatarBorder(borderId: string): UserGamificationState {
  const current = getGamificationState();
  const updatedState = { ...current, activeBorder: borderId };
  inMemoryState = updatedState;
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(GAMIFICATION_STORAGE_KEY, JSON.stringify(updatedState));
      window.dispatchEvent(new CustomEvent("gamification_updated", { detail: updatedState }));
    } catch {}
  }
  return updatedState;
}

export function shareStreak(streakCount: number): string {
  return `🔥 I've maintained a ${streakCount}-day productivity streak on Zen Planner! 🧘✨ Join me and supercharge your goals! #ZenPlanner #ProductivityStreak`;
}

export function shareAccountabilityInvite(): string {
  return `🧘 Hey! I invite you to be my Accountability Partner on Zen Planner. Let's stay focused, complete daily goals, and maintain our streaks together! 🚀`;
}
