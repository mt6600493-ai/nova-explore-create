import { useNavigate } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { Menu, Plus } from "lucide-react";

import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { newThreadId } from "@/lib/threads";
import { ThreadList } from "./Sidebar";
import { NovaMark } from "./NovaMark";

export function AppShell({ activeId, title = "Nova", children }: { activeId?: string | undefined; title?: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  return (
    <div className="nova-bg flex h-dvh overflow-hidden">
      <aside className="hidden w-72 shrink-0 border-r border-border bg-sidebar md:block">
        <ThreadList activeId={activeId} />
      </aside>
      <main className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-2 border-b border-border px-3 py-2 md:hidden">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button size="icon" variant="ghost" aria-label="Menu">
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-80 bg-sidebar p-0">
              <SheetTitle className="sr-only">Menu</SheetTitle>
              <ThreadList activeId={activeId} onNavigate={() => setOpen(false)} />
            </SheetContent>
          </Sheet>
          <NovaMark className="size-6" />
          <span className="flex-1 font-display font-semibold">{title}</span>
          <Button size="icon" variant="ghost" aria-label="New chat"
            onClick={() => void navigate({ to: "/chat/$threadId", params: { threadId: newThreadId() } })}>
            <Plus className="size-5" />
          </Button>
        </header>
        <div className="min-h-0 flex-1">{children}</div>
      </main>
    </div>
  );
}
