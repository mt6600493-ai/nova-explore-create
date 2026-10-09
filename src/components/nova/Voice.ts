/* Browser speech helpers (Web Speech API). */
type Rec = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start: () => void;
  stop: () => void;
};

export function createRecognizer(): Rec | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as Record<string, unknown>;
  const C = (w["SpeechRecognition"] ?? w["webkitSpeechRecognition"]) as (new () => Rec) | undefined;
  if (!C) return null;
  const r = new C();
  r.lang = navigator.language || "en-US";
  r.interimResults = true;
  r.continuous = false;
  return r;
}

export function speak(text: string, onEnd: () => void) {
  if (typeof window === "undefined" || !window.speechSynthesis) return onEnd();
  const clean = text.replace(/[#*_`>|-]/g, " ").replace(/\s+/g, " ").slice(0, 1500);
  const u = new SpeechSynthesisUtterance(clean);
  if (/[\u0600-\u06FF]/.test(clean)) u.lang = "ur-PK";
  else if (/[\u0900-\u097F]/.test(clean)) u.lang = "hi-IN";
  u.onend = onEnd;
  u.onerror = onEnd;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(u);
}

export function offlineReply(q: string) {
  const t = q.toLowerCase();
  if (/\b(hi|hello|salam|assalam|hey)\b/.test(t)) return "Hello! You're offline right now, but I'm still here. Ask me simple things, and I'll give full answers once you're back online.";
  if (/time|waqt|baje/.test(t)) return `It's ${new Date().toLocaleTimeString()} right now.`;
  if (/date|tareekh|aaj/.test(t)) return `Today is ${new Date().toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" })}.`;
  const m = t.match(/^[\d\s+\-*/().]+$/);
  if (m) {
    try {
      // eslint-disable-next-line no-new-func
      return `= ${String(Function(`"use strict";return (${t})`)())}`;
    } catch { /* fallthrough */ }
  }
  return "**Offline mode** — there's no internet connection, so I can't reach the full AI right now. I can tell the time, the date and do quick maths. Your message is saved; ask again when you're back online.";
}
