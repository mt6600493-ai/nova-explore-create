import { useEffect, useState } from "react";

export type NovaSettings = {
  customInstructions: string;
  voiceGender: "female" | "male";
  voiceRate: "slow" | "normal" | "fast";
  voiceLang: "auto" | "en-US" | "ur-PK" | "ps-AF";
  voiceStyle: "friendly" | "professional" | "calm";
  themeMode: "dark" | "light";
  accent: "emerald" | "blue" | "violet" | "amber" | "rose";
  wallpaper: string; // data URL from user's gallery, "" = none
};

const KEY = "nova.settings.v1";
export const DEFAULT_SETTINGS: NovaSettings = {
  customInstructions: "",
  voiceGender: "female",
  voiceRate: "normal",
  voiceLang: "auto",
  voiceStyle: "friendly",
  themeMode: "dark",
  accent: "emerald",
  wallpaper: "",
};

export function loadSettings(): NovaSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    return { ...DEFAULT_SETTINGS, ...(JSON.parse(localStorage.getItem(KEY) || "{}") as Partial<NovaSettings>) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(s: NovaSettings) {
  localStorage.setItem(KEY, JSON.stringify(s));
  window.dispatchEvent(new Event("nova-settings"));
}

export function useSettings() {
  const [s, setS] = useState<NovaSettings>(DEFAULT_SETTINGS);
  useEffect(() => {
    const sync = () => setS(loadSettings());
    sync();
    window.addEventListener("nova-settings", sync);
    return () => window.removeEventListener("nova-settings", sync);
  }, []);
  return s;
}

/* Message feedback: likes, ratings, bookmarks — kept in this browser. */
export type Feedback = { vote?: "up" | "down" | undefined; stars?: number; saved?: boolean };
const FB = "nova.feedback.v1";
export function loadFeedback(): Record<string, Feedback> {
  try {
    return JSON.parse(localStorage.getItem(FB) || "{}") as Record<string, Feedback>;
  } catch {
    return {};
  }
}
export function setFeedback(id: string, patch: Feedback) {
  const all = loadFeedback();
  all[id] = { ...all[id], ...patch };
  localStorage.setItem(FB, JSON.stringify(all));
  window.dispatchEvent(new Event("nova-feedback"));
}

/* Study streak + XP */
const ST = "nova.streak.v1";
export function bumpStreak(xp = 5) {
  const today = new Date().toDateString();
  let d = { last: "", streak: 0, xp: 0 };
  try {
    d = { ...d, ...(JSON.parse(localStorage.getItem(ST) || "{}") as typeof d) };
  } catch {
    /* ignore */
  }
  if (d.last !== today) {
    const y = new Date(Date.now() - 864e5).toDateString();
    d.streak = d.last === y ? d.streak + 1 : 1;
    d.last = today;
  }
  d.xp += xp;
  localStorage.setItem(ST, JSON.stringify(d));
  return d;
}
export function loadStreak() {
  try {
    return { streak: 0, xp: 0, ...(JSON.parse(localStorage.getItem(ST) || "{}") as object) } as { streak: number; xp: number };
  } catch {
    return { streak: 0, xp: 0 };
  }
}
