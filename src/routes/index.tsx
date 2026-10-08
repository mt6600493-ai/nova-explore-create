import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

import { NovaMark } from "@/components/nova/NovaMark";
import { loadThreads, newThreadId } from "@/lib/threads";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Nova AI — Search, images aur 3D, sab ek jagah" },
      { name: "description", content: "Kisi bhi topic par poochho, AI images banao, aur ghumaane wale 3D models dekho." },
      { property: "og:title", content: "Nova AI — Search, images aur 3D" },
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
    const latest = loadThreads().sort((a, b) => b.updatedAt - a.updatedAt)[0];
    void navigate({ to: "/chat/$threadId", params: { threadId: latest?.id ?? newThreadId() }, replace: true });
  }, [navigate]);
  return (
    <div className="nova-bg flex h-dvh items-center justify-center">
      <NovaMark className="size-14 nova-glow animate-pulse" />
    </div>
  );
}
