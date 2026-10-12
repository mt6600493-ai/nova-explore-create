/* Browser speech helpers (Web Speech API). */
import { loadSettings } from "@/lib/settings";
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

export function createRecognizer(continuous = false): Rec | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as Record<string, unknown>;
  const C = (w["SpeechRecognition"] ?? w["webkitSpeechRecognition"]) as (new () => Rec) | undefined;
  if (!C) return null;
  const r = new C();
  const pref = loadSettings().voiceLang;
  r.lang = pref !== "auto" ? pref : navigator.language || "en-US";
  r.interimResults = true;
  r.continuous = continuous;
  return r;
}

export function speak(text: string, onEnd: () => void) {
  if (typeof window === "undefined" || !window.speechSynthesis) return onEnd();
  const s = loadSettings();
  const clean = text
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/[#*_`>|]/g, " ")
    .replace(/\p{Extended_Pictographic}/gu, "")
    .replace(/\s+/g, " ")
    .slice(0, 3000);
  const u = new SpeechSynthesisUtterance(clean);
  let lang = s.voiceLang === "auto" ? "" : s.voiceLang;
  if (!lang) {
    if (/[\u0600-\u06FF]/.test(clean)) lang = "ur-PK";
    else if (/[\u0900-\u097F]/.test(clean)) lang = "hi-IN";
    else lang = "en-US";
  }
  u.lang = lang;
  u.rate = s.voiceRate === "slow" ? 0.8 : s.voiceRate === "fast" ? 1.3 : 1;
  u.pitch = s.voiceStyle === "friendly" ? 1.1 : s.voiceStyle === "calm" ? 0.9 : 1;
  const voices = window.speechSynthesis.getVoices();
  const sameLang = voices.filter((v) => v.lang.toLowerCase().startsWith(lang.slice(0, 2).toLowerCase()));
  const pool = sameLang.length ? sameLang : voices;
  const male = /male|david|daniel|alex|fred|google uk english male|asad|uzma?/i;
  const pick =
    s.voiceGender === "male"
      ? pool.find((v) => /\bmale\b|david|daniel|alex|fred|asad/i.test(v.name) && !/female/i.test(v.name))
      : pool.find((v) => /female|zira|samantha|uzma|victoria|karen/i.test(v.name) || !male.test(v.name));
  if (pick) u.voice = pick;
  u.onend = onEnd;
  u.onerror = onEnd;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(u);
}

export function offlineReply(q: string) {
  const t = q.toLowerCase();
  if (/founder|creator|banaya|talha|kis ne|who made|who created/.test(t)) return "Nova AI was founded and created by **Muhammad Talha**, a student from Peshawar, Pakistan. His vision: a free, all-in-one AI for the whole world. *Welcome to my free Nova AI — All in one place.* 🌍";
  if (/nova|kya ho|what are you|tum kaun/.test(t)) return "I'm **Nova AI** — a free all-in-one assistant for chat, images, video, 3D models and language learning. Right now you're offline, so I'm answering from my offline brain.";
  if (/joke|latifa/.test(t)) return "😄 Why did the computer go to the doctor? Because it had a *virus*!";
  if (/tip|study|padh/.test(t)) return "📚 **Study tip:** study in 25-minute focus blocks, then take a 5-minute break. Revise yesterday's topic for 10 minutes before starting a new one.";
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
