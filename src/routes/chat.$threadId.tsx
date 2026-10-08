import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import type { UIMessage } from "ai";
import { Menu } from "lucide-react";

import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ChatWindow } from "@/components/nova/ChatWindow";
import { ThreadList } from "@/components/nova/Sidebar";
import { NovaMark } from "@/components/nova/NovaMark";
import { loadThreads } from "@/lib/threads";

export const Route = createFileRoute("/chat/$threadId")({
  head: () => ({
    meta: [
      { title: "Chat — Nova AI" },
      { name: "description", content: "Nova AI se kuch bhi poochho, images banao aur 3D models dekho." },
      { property: "og:title", content: "Chat — Nova AI" },
      { property: "og:description", content: "Answers, AI images and rotatable 3D models in one chat." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ChatPage,
});

function ChatPage() {
  const { threadId } = Route.useParams();
  const [initial, setInitial] = useState<UIMessage[] | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setInitial(loadThreads().find((t) => t.id === threadId)?.messages ?? []);
  }, [threadId]);

  return (
    <div className="nova-bg flex h-dvh overflow-hidden">
      <aside className="hidden w-72 shrink-0 border-r border-border bg-sidebar md:block">
        <ThreadList activeId={threadId} />
      </aside>
      <main className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-2 border-b border-border px-3 py-2 md:hidden">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button size="icon" variant="ghost" aria-label="Chats">
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 bg-sidebar p-0">
              <SheetTitle className="sr-only">Chats</SheetTitle>
              <ThreadList activeId={threadId} onNavigate={() => setOpen(false)} />
            </SheetContent>
          </Sheet>
          <NovaMark className="size-6" />
          <span className="font-display font-semibold">Nova</span>
        </header>
        <div className="min-h-0 flex-1">
          {initial ? <ChatWindow key={threadId} threadId={threadId} initialMessages={initial} /> : null}
        </div>
      </main>
    </div>
  );
}
