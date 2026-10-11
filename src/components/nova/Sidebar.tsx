import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { BookOpen, Home, ImageIcon, LogIn, LogOut, MessageSquare, Plus, Search, Settings, Trash2, Wrench } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { deleteThread, loadThreads, newThreadId, type Thread } from "@/lib/threads";
import { NovaMark } from "./NovaMark";
import { SettingsDialog } from "./SettingsDialog";

const NAV = [
  { to: "/", label: "Home", icon: Home },
  { to: "/images", label: "Images", icon: ImageIcon },
  { to: "/study", label: "Study Hub", icon: BookOpen },
  { to: "/tools", label: "Tools", icon: Wrench },
] as const;

export function ThreadList({ activeId, onNavigate }: { activeId?: string; onNavigate?: () => void }) {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [q, setQ] = useState("");
  const [searching, setSearching] = useState(false);
  const [settings, setSettings] = useState(false);
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();

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

  const shown = q
    ? threads.filter((t) =>
        (t.title + " " + JSON.stringify(t.messages.map((m) => m.parts.map((p) => (p.type === "text" ? p.text : ""))))).toLowerCase().includes(q.toLowerCase()),
      )
    : threads;

  const name = profile?.display_name || (user?.user_metadata?.["full_name"] as string | undefined) || user?.email?.split("@")[0] || "";
  const avatar = profile?.avatar_url || (user?.user_metadata?.["avatar_url"] as string | undefined);

  return (
    <div className="flex h-full flex-col gap-2 p-3">
      <div className="flex items-center gap-2 px-2 py-1">
        <NovaMark className="size-7" />
        <span className="flex-1 font-display text-lg font-semibold tracking-tight">Nova</span>
        <Button size="icon" variant="ghost" aria-label="Search chats" onClick={() => setSearching((v) => !v)}>
          <Search className="size-4" />
        </Button>
      </div>
      {searching ? (
        <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search chats..."
          className="rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
      ) : null}
      <nav className="flex flex-col gap-0.5">
        {NAV.map((n) => (
          <Link key={n.to} to={n.to} onClick={onNavigate}
            className="flex items-center gap-3 rounded-md px-2 py-2 text-sm hover:bg-accent"
            activeProps={{ className: "bg-accent" }} activeOptions={{ exact: true }}>
            <n.icon className="size-4 text-primary" /> {n.label}
          </Link>
        ))}
      </nav>
      <p className="mt-2 px-2 text-xs font-medium text-muted-foreground">Chats</p>
      <nav className="-mx-1 flex-1 overflow-y-auto px-1">
        {shown.length === 0 ? <p className="px-2 py-3 text-xs text-muted-foreground">No chats yet.</p> : null}
        <ul className="flex flex-col gap-0.5">
          {shown.map((t) => (
            <li key={t.id} className={`nova-thread group ${t.id === activeId ? "is-active" : ""}`}>
              <Link to="/chat/$threadId" params={{ threadId: t.id }} onClick={onNavigate}
                className="flex min-w-0 flex-1 items-center gap-2 py-2 pl-2">
                <MessageSquare className="size-3.5 shrink-0 opacity-60" />
                <span className="truncate text-sm">{t.title}</span>
              </Link>
              <button type="button" aria-label="Delete chat"
                className="shrink-0 rounded p-1.5 opacity-60 hover:text-destructive hover:opacity-100"
                onClick={() => {
                  deleteThread(t.id);
                  if (t.id === activeId) startNew();
                }}>
                <Trash2 className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      </nav>
      <div className="flex items-center gap-2 border-t border-border pt-3">
        {user ? (
          <button type="button" onClick={() => setSettings(true)} className="flex min-w-0 flex-1 items-center gap-2 rounded-md p-1 hover:bg-accent" aria-label="Profile and settings">
            {avatar ? (
              <img src={avatar} alt="" className="size-8 rounded-full object-cover" />
            ) : (
              <span className="flex size-8 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                {name.slice(0, 2).toUpperCase()}
              </span>
            )}
            <span className="truncate text-sm">{name}</span>
          </button>
        ) : (
          <Link to="/login" onClick={onNavigate} className="flex flex-1 items-center gap-2 rounded-md p-2 text-sm hover:bg-accent">
            <LogIn className="size-4" /> Log in
          </Link>
        )}
        <Button size="icon" variant="ghost" aria-label="Settings" onClick={() => setSettings(true)}>
          <Settings className="size-4" />
        </Button>
        {user ? (
          <Button size="icon" variant="ghost" aria-label="Log out" onClick={() => void signOut()}>
            <LogOut className="size-4" />
          </Button>
        ) : null}
        <Button variant="nova" onClick={startNew} className="rounded-full">
          <Plus className="size-4" /> Chat
        </Button>
      </div>
      <SettingsDialog open={settings} onOpenChange={setSettings} />
    </div>
  );
}
