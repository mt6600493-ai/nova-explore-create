import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { MessageSquare, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { deleteThread, loadThreads, newThreadId, type Thread } from "@/lib/threads";
import { NovaMark } from "./NovaMark";

export function ThreadList({ activeId, onNavigate }: { activeId: string; onNavigate?: () => void }) {
  const [threads, setThreads] = useState<Thread[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const sync = () => setThreads(loadThreads().sort((a, b) => b.updatedAt - a.updatedAt));
    sync();
    window.addEventListener("nova-threads", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("nova-threads", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const startNew = () => {
    onNavigate?.();
    void navigate({ to: "/chat/$threadId", params: { threadId: newThreadId() } });
  };

  return (
    <div className="flex h-full flex-col gap-3 p-3">
      <div className="flex items-center gap-2 px-2 py-1">
        <NovaMark className="size-7" />
        <span className="font-display text-lg font-semibold tracking-tight">Nova</span>
      </div>
      <Button variant="nova" onClick={startNew} className="justify-start">
        <Plus className="size-4" /> Nayi chat
      </Button>
      <nav className="-mx-1 flex-1 overflow-y-auto px-1">
        {threads.length === 0 ? (
          <p className="px-2 py-4 text-xs text-muted-foreground">Abhi koi chat nahi.</p>
        ) : null}
        <ul className="flex flex-col gap-0.5">
          {threads.map((t) => (
            <li key={t.id} className={`nova-thread group ${t.id === activeId ? "is-active" : ""}`}>
              <Link
                to="/chat/$threadId"
                params={{ threadId: t.id }}
                onClick={onNavigate}
                className="flex min-w-0 flex-1 items-center gap-2 py-2 pl-2"
              >
                <MessageSquare className="size-3.5 shrink-0 opacity-60" />
                <span className="truncate text-sm">{t.title}</span>
              </Link>
              <button
                type="button"
                aria-label="Delete chat"
                className="shrink-0 rounded p-1.5 opacity-60 hover:text-destructive hover:opacity-100"
                onClick={() => {
                  deleteThread(t.id);
                  if (t.id === activeId) startNew();
                }}
              >
                <Trash2 className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      </nav>
      <p className="px-2 text-[11px] text-muted-foreground">Chats isi browser mein save hoti hain.</p>
    </div>
  );
}
