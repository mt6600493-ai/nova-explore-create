import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { GraduationCap, Mic } from "lucide-react";

import { AppShell } from "@/components/nova/AppShell";
import { Button } from "@/components/ui/button";
import { newThreadId } from "@/lib/threads";

const LANGUAGES = [
  "English", "Urdu", "Pashto", "Arabic", "German", "Chinese (Mandarin)",
  "Spanish", "French", "Turkish", "Japanese", "Korean", "Hindi",
] as const;

const LEVELS = [
  ["beginner", "Beginner — start from basics"],
  ["intermediate", "Intermediate — I know some"],
  ["advanced", "Advanced — polish my fluency"],
] as const;

export const Route = createFileRoute("/learn")({
  head: () => ({
    meta: [
      { title: "Learn Languages — Nova AI" },
      { name: "description", content: "Learn English, Urdu, Arabic, German, Chinese and more with Nova AI's personal language tutor and voice classes." },
      { property: "og:title", content: "Learn Languages — Nova AI" },
      { property: "og:description", content: "Personal AI language tutor with voice classes, from basics to fluency." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LearnPage,
});

function LearnPage() {
  const [lang, setLang] = useState<string>("English");
  const [level, setLevel] = useState<string>("beginner");
  const [voice, setVoice] = useState(true);
  const navigate = useNavigate();

  const start = () => {
    const q = `I want to learn ${lang}. My level: ${level}. Please be my personal language tutor: start a structured class for me — teach step by step from the basics, give me small exercises, correct my mistakes, and use the microphone/voice features for speaking practice. Begin lesson 1 now.`;
    void navigate({ to: "/chat/$threadId", params: { threadId: newThreadId() }, search: { q } });
  };

  return (
    <AppShell title="Learn Languages">
      <div className="mx-auto flex h-full max-w-lg flex-col gap-6 overflow-y-auto px-4 py-8">
        <div className="text-center">
          <GraduationCap className="mx-auto size-10 text-primary" />
          <h1 className="mt-3 font-display text-2xl font-bold">Learn any language</h1>
          <p className="mt-1 text-sm text-muted-foreground">Your personal AI tutor — take a class anytime, as long as you want.</p>
        </div>

        <div>
          <p className="mb-2 text-sm font-medium">1. Which language do you want to learn?</p>
          <div className="flex flex-wrap gap-2">
            {LANGUAGES.map((l) => (
              <Button key={l} size="sm" variant={lang === l ? "default" : "secondary"} onClick={() => setLang(l)}>{l}</Button>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-2 text-sm font-medium">2. Your current level</p>
          <div className="flex flex-col gap-2">
            {LEVELS.map(([v, label]) => (
              <Button key={v} variant={level === v ? "default" : "secondary"} className="justify-start" onClick={() => setLevel(v)}>{label}</Button>
            ))}
          </div>
        </div>

        <label className="flex items-center gap-3 rounded-md border border-border p-3 text-sm">
          <input type="checkbox" checked={voice} onChange={(e) => setVoice(e.target.checked)} className="size-4 accent-[var(--primary)]" />
          <Mic className="size-4 text-primary" />
          Voice class — speak with Nova and hear the tutor read aloud
        </label>

        <Button size="lg" className="w-full font-display text-base" onClick={start}>
          Start my {lang} class
        </Button>
      </div>
    </AppShell>
  );
}
