import type { UIMessage } from "ai";

export type Thread = { id: string; title: string; updatedAt: number; messages: UIMessage[] };

const KEY = "nova.threads.v1";
const IMG_PREFIX = "nova.img.";

export function loadThreads(): Thread[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as Thread[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveThreads(threads: Thread[]) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(threads));
  } catch {
    /* storage full */
  }
  window.dispatchEvent(new Event("nova-threads"));
}

export function newThreadId() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

export function upsertThread(id: string, messages: UIMessage[]) {
  const threads = loadThreads();
  const firstText = messages
    .find((m) => m.role === "user")
    ?.parts.find((p) => p.type === "text") as { text?: string } | undefined;
  const title = firstText?.text?.slice(0, 48) || "New chat";
  const existing = threads.find((t) => t.id === id);
  const next: Thread = { id, title, updatedAt: Date.now(), messages };
  saveThreads(existing ? threads.map((t) => (t.id === id ? next : t)) : [next, ...threads]);
}

export function deleteThread(id: string) {
  saveThreads(loadThreads().filter((t) => t.id !== id));
}

export function getSavedImage(key: string) {
  try {
    return window.localStorage.getItem(IMG_PREFIX + key);
  } catch {
    return null;
  }
}

export function saveImage(key: string, dataUrl: string) {
  try {
    window.localStorage.setItem(IMG_PREFIX + key, dataUrl);
  } catch {
    /* too large for storage */
  }
}
