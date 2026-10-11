import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import type { UIMessage } from "ai";

import { ChatWindow } from "@/components/nova/ChatWindow";
import { AppShell } from "@/components/nova/AppShell";
import { loadThreads } from "@/lib/threads";

export const Route = createFileRoute("/chat/$threadId")({
  validateSearch: (s: Record<string, unknown>): { q?: string } => (typeof s["q"] === "string" ? { q: s["q"] as string } : {}),
  head: () => ({
    meta: [
      { title: "Chat — Nova AI" },
      { name: "description", content: "Ask Nova AI anything, create images and videos and explore 3D models." },
      { property: "og:title", content: "Chat — Nova AI" },
      { property: "og:description", content: "Answers, AI images, videos and rotatable 3D models in one chat." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ChatPage,
});

function ChatPage() {
  const { threadId } = Route.useParams();
  const { q } = Route.useSearch();
  const [loaded, setLoaded] = useState<{ id: string; messages: UIMessage[] } | null>(null);

  useEffect(() => {
    setLoaded({ id: threadId, messages: loadThreads().find((t) => t.id === threadId)?.messages ?? [] });
  }, [threadId]);
  const initial = loaded?.id === threadId ? loaded.messages : null;

  return (
    <AppShell activeId={threadId}>
      {initial ? <ChatWindow key={threadId} threadId={threadId} initialMessages={initial} initialPrompt={q} /> : null}
    </AppShell>
  );
}
