import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { markVisited, VISITED } from "@/lib/offline";
import { loadThreads } from "@/lib/threads";
import { ArrowRight, Box, GraduationCap, Image as ImageIcon, Languages, MessageSquare, Mic, Sparkles, Video } from "lucide-react";

import { NovaMark } from "@/components/nova/NovaMark";
import { newThreadId } from "@/lib/threads";

const FEATURES = [
  { icon: MessageSquare, title: "Smart Chat", desc: "Ask anything — deep, well-structured answers in your own language." },
  { icon: ImageIcon, title: "Image AI", desc: "Generate stunning images and edit your own photos with a prompt." },
  { icon: Video, title: "Video Generation", desc: "Create short AI video clips from a simple description." },
  { icon: Box, title: "3D Studio", desc: "Explore interactive, rotatable 3D models — planets, molecules, machines." },
  { icon: Mic, title: "Voice Chat", desc: "Talk to Nova by voice and hear answers read aloud." },
  { icon: Languages, title: "Language Tutor", desc: "Learn English, Urdu, Arabic, German, Chinese and more — with voice classes." },
  { icon: GraduationCap, title: "Study Mode", desc: "Chapter-wise teaching, quizzes, revision and flashcards." },
  { icon: Sparkles, title: "All in One", desc: "Files, PDFs, camera understanding and more — all free." },
];

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Nova AI — Free All-in-One AI by Muhammad Talha" },
      { name: "description", content: "Nova AI is a free all-in-one AI assistant by Muhammad Talha: chat, image generation, video, 3D models, voice chat and language learning — all in one place." },
      { property: "og:title", content: "Nova AI — Free All-in-One AI" },
      { property: "og:description", content: "Ask anything, generate images and videos, explore 3D models and learn languages — free, all in one place." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebApplication",
          name: "Nova AI",
          alternateName: "Nova",
          applicationCategory: "AIAssistant",
          operatingSystem: "Web",
          offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
          creator: { "@type": "Person", name: "Muhammad Talha", address: { "@type": "PostalAddress", addressLocality: "Peshawar", addressCountry: "PK" } },
          url: "https://nova-explore-anything.com",
          description: "Free all-in-one AI assistant: chat, image generation, video, 3D models, voice chat and language learning.",
        }),
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  const navigate = useNavigate();
  const [checked, setChecked] = useState(false);
  const [chatId] = useState(() => newThreadId());
  useEffect(() => {
    let visited = false;
    try { visited = localStorage.getItem(VISITED) === "1"; } catch { /* ignore */ }
    if (visited) {
      const recent = loadThreads().sort((a, b) => b.updatedAt - a.updatedAt)[0];
      void navigate({ to: "/chat/$threadId", params: { threadId: recent?.id ?? newThreadId() }, replace: true });
      return;
    }
    setChecked(true);
  }, [navigate]);
  const chatTo = { to: "/chat/$threadId" as const, params: { threadId: chatId }, onClick: markVisited };
  if (!checked) return <div className="nova-bg min-h-dvh" />;
  return (
    <div className="nova-bg min-h-dvh">
      <header className="mx-auto flex max-w-5xl items-center gap-2 px-4 py-4">
        <NovaMark className="size-8" />
        <span className="font-display text-xl font-semibold">Nova AI</span>
        <nav className="ml-auto flex items-center gap-2">
          <Link to="/learn" className="rounded-md px-3 py-2 text-sm text-muted-foreground hover:text-foreground">Learn Languages</Link>
          <Link {...chatTo} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Start Chatting</Link>
        </nav>
      </header>

      <section className="mx-auto flex max-w-3xl flex-col items-center px-4 pb-16 pt-16 text-center md:pt-24">
        <NovaMark className="nova-glow size-20" />
        <h1 className="mt-6 font-display text-4xl font-bold tracking-tight md:text-6xl">
          Welcome to my free <span className="text-primary">Nova AI</span>
        </h1>
        <p className="mt-3 text-lg text-muted-foreground">All in one place.</p>
        <p className="mt-4 max-w-xl text-muted-foreground">
          Ask anything, generate images and videos, explore interactive 3D models, talk by voice and learn any language — completely free.
        </p>
        <Link {...chatTo} className="mt-8 inline-flex items-center gap-2 rounded-full bg-primary px-8 py-3.5 font-display text-lg font-semibold text-primary-foreground shadow-[var(--shadow-glow)] transition-transform hover:scale-105">
          Start Chatting <ArrowRight className="size-5" />
        </Link>
      </section>

      <section className="mx-auto max-w-5xl px-4 pb-16">
        <h2 className="mb-8 text-center font-display text-2xl font-semibold md:text-3xl">Everything in one app</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <div key={f.title} className="nova-card p-5">
              <f.icon className="size-6 text-primary" />
              <h3 className="mt-3 font-display font-semibold">{f.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 pb-20 text-center">
        <h2 className="font-display text-2xl font-semibold md:text-3xl">Meet the creator</h2>
        <div className="nova-card mx-auto mt-8 flex max-w-md flex-col items-center gap-4 p-8">
          <img src="/creator.jpg" alt="Muhammad Talha, Founder of Nova AI" className="size-32 rounded-full object-cover" />
          <div>
            <p className="font-display text-xl font-semibold">Muhammad Talha</p>
            <p className="text-sm text-muted-foreground">Founder & Creator of Nova — Student, Peshawar, Pakistan</p>
          </div>
          <p className="text-sm text-muted-foreground">
            His vision: a free, all-in-one AI for the whole world.
          </p>
        </div>
      </section>

      <footer className="border-t border-border py-6 text-center text-sm text-muted-foreground">
        Nova AI — Free for everyone, forever.
      </footer>
    </div>
  );
}
