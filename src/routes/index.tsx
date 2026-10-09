import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

import { NovaMark } from "@/components/nova/NovaMark";
import { newThreadId } from "@/lib/threads";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Nova AI — Answers, images and 3D in one place" },
      { name: "description", content: "Ask anything, generate AI images and explore rotatable 3D models." },
      { property: "og:title", content: "Nova AI — Answers, images and 3D" },
      { property: "og:description", content: "An all-in-one AI: answers, image generation and interactive 3D models." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const navigate = useNavigate();
  useEffect(() => {
    void navigate({ to: "/chat/$threadId", params: { threadId: newThreadId() }, replace: true });
  }, [navigate]);
  return (
    <div className="nova-bg flex h-dvh items-center justify-center">
      <NovaMark className="size-14 nova-glow animate-pulse" />
    </div>
  );
}
