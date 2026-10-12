import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";

import { AppShell } from "@/components/nova/AppShell";
import { Button } from "@/components/ui/button";
import { isForcedOffline, setForcedOffline } from "@/lib/offline";
import { newThreadId } from "@/lib/threads";

export const Route = createFileRoute("/offline")({
  head: () => ({
    meta: [
      { title: "Offline Mode — Nova AI" },
      { name: "description", content: "Use Nova AI without internet: open saved chats and ask basic questions offline." },
      { property: "og:title", content: "Offline Mode — Nova AI" },
      { property: "og:description", content: "Nova AI keeps working without internet." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: OfflinePage,
});

function OfflinePage() {
  const [on, setOn] = useState(false);
  useEffect(() => setOn(isForcedOffline()), []);
  return (
    <AppShell title="Offline Mode">
      <div className="mx-auto flex w-full max-w-xl flex-col items-center gap-6 overflow-y-auto px-4 py-12 text-center">
        <WifiOff className="size-14 text-primary" />
        <h1 className="font-display text-3xl font-semibold">Offline Mode</h1>
        <p className="text-muted-foreground">
          When your internet is off, Nova still opens. You can read all your saved chats and ask basic questions —
          time, date, maths, study tips, and about Nova and its founder.
        </p>
        <Button size="lg" variant={on ? "destructive" : "nova"} className="h-14 w-full rounded-full text-lg"
          onClick={() => { setForcedOffline(!on); setOn(!on); }}>
          {on ? "Turn Offline Mode OFF" : "Turn Offline Mode ON"}
        </Button>
        <Link to="/chat/$threadId" params={{ threadId: newThreadId() }} className="text-primary underline-offset-4 hover:underline">
          Open chat →
        </Link>
      </div>
    </AppShell>
  );
}
