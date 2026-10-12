import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Chrome, Loader2 } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NovaMark } from "@/components/nova/NovaMark";
import { useAuth } from "@/lib/auth";
import { useEffect } from "react";
import { markVisited } from "@/lib/offline";
import { loadThreads, newThreadId } from "@/lib/threads";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Login — Nova AI" },
      { name: "description", content: "Sign in to Nova AI to unlock offline mode, video generation and more." },
      { property: "og:title", content: "Login — Nova AI" },
      { property: "og:description", content: "Sign in to unlock more Nova AI features." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { session, loading } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && session) {
      markVisited();
      const recent = loadThreads().sort((a, b) => b.updatedAt - a.updatedAt)[0];
      void navigate({ to: "/chat/$threadId", params: { threadId: recent?.id ?? newThreadId() }, replace: true });
    }
  }, [loading, session, navigate]);

  const google = async () => {
    setBusy(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error("Google sign-in failed. Please try again.");
      setBusy(false);
    }
    // redirected → browser leaves the page
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: name || undefined } },
        });
        if (error) throw error;
        toast.success("Account created! Check your email to confirm, then log in.");
        setMode("login");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        void navigate({ to: "/", replace: true });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="nova-bg flex min-h-dvh items-center justify-center px-4">
      <div className="nova-card w-full max-w-sm p-6">
        <div className="flex flex-col items-center text-center">
          <NovaMark className="size-12 nova-glow" />
          <h1 className="mt-4 font-display text-2xl font-semibold">
            {mode === "login" ? "Welcome back" : "Create your account"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Login to unlock more features like Offline Mode & Video Generation.
          </p>
        </div>

        <Button type="button" variant="secondary" className="mt-6 w-full" onClick={() => void google()} disabled={busy}>
          <Chrome className="size-4" /> Continue with Google
        </Button>

        <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground">
          <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
        </div>

        <form onSubmit={(e) => void submit(e)} className="flex flex-col gap-3">
          {mode === "signup" ? (
            <Input value={name} onChange={(e) => setName(e.currentTarget.value)} placeholder="Your name" autoComplete="name" />
          ) : null}
          <Input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.currentTarget.value)}
            placeholder="Email"
            autoComplete="email"
          />
          <Input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.currentTarget.value)}
            placeholder="Password (min 6 characters)"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
          />
          <Button type="submit" variant="nova" disabled={busy}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : null}
            {mode === "login" ? "Log in" : "Sign up"}
          </Button>
        </form>

        <button
          type="button"
          className="mt-4 w-full text-center text-sm text-muted-foreground underline-offset-4 hover:underline"
          onClick={() => setMode(mode === "login" ? "signup" : "login")}
        >
          {mode === "login" ? "New here? Create an account" : "Already have an account? Log in"}
        </button>
        <Button type="button" variant="ghost" className="mt-2 w-full"
          onClick={() => { markVisited(); void navigate({ to: "/chat/$threadId", params: { threadId: newThreadId() } }); }}>
          Continue as Guest
        </Button>
      </div>
    </div>
  );
}
