import { api } from "./api";

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

// Preload state from localStorage as immediate fallback
if (typeof window !== "undefined") {
  try {
    const raw = localStorage.getItem(GAMIFICATION_STORAGE_KEY);
    if (raw) {
      inMemoryState = JSON.parse(raw);
    }
  } catch (e) {
    console.warn("Failed to load local gamification state:", e);
  }
}

export async function syncGamificationFromDB(): Promise<UserGamificationState> {
  try {
    const data = await api.getGamificationProfile();
    if (data) {
      const calculatedLevel = data.level || Math.floor((data.xp || 350) / 500) + 1;
      const stateFromDB: UserGamificationState = {
        xp: data.xp ?? DEFAULT_STATE.xp,
        level: calculatedLevel,
        levelTitle: getLevelTitle(calculatedLevel),
        unlockedThemes: data.unlocked_themes && data.unlocked_themes.length > 0 ? data.unlocked_themes : DEFAULT_STATE.unlockedThemes,
        unlockedBorders: data.unlocked_borders && data.unlocked_borders.length > 0 ? data.unlocked_borders : DEFAULT_STATE.unlockedBorders,
        activeBorder: data.active_border || DEFAULT_STATE.activeBorder,
      };

      inMemoryState = stateFromDB;
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(GAMIFICATION_STORAGE_KEY, JSON.stringify(stateFromDB));
          window.dispatchEvent(new CustomEvent("gamification_updated", { detail: stateFromDB }));
        } catch {}
      }
      return stateFromDB;
    }
  } catch (e) {
    console.warn("Gamification DB sync skipped (offline or unauthenticated):", e);
  }
  return inMemoryState;
}

export function getGamificationState(): UserGamificationState {
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
      window.dispatchEvent(new CustomEvent("gamification_updated", { detail: updatedState }));
    } catch (e) {
      console.warn("Failed to persist gamification state locally:", e);
    }
  }

  // Persist to database so mobile & web stay synced!
  api.updateGamificationProfile({
    xp: newXP,
    level: newLevel,
    unlocked_themes: unlockedThemes,
    unlocked_borders: unlockedBorders,
    active_border: current.activeBorder,
  }).catch((e) => console.warn("Failed to sync XP to DB:", e));

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

  // Sync active border to database!
  api.updateGamificationProfile({
    active_border: borderId,
  }).catch((e) => console.warn("Failed to sync active border to DB:", e));

  return updatedState;
}

export function shareStreak(streakCount: number): string {
  return `🔥 I've maintained a ${streakCount}-day productivity streak on Zen Planner! 🧘✨ Join me and supercharge your goals! #ZenPlanner #ProductivityStreak`;
}

export function shareAccountabilityInvite(referralCode?: string): string {
  const code = referralCode || "ZEN-VIP2026";
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const link = `${origin}/register?ref=${encodeURIComponent(code)}`;
  return `🧘 Hey! I invite you to be my Accountability Partner on Zen Planner. Let's stay focused, complete daily goals, and maintain our streaks together!\n\n🔑 Referral Code: ${code}\n🔗 Sign up here: ${link}`;
}
