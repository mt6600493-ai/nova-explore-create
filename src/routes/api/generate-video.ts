import { createFileRoute } from "@tanstack/react-router";

const GATEWAY = "https://ai.gateway.lovable.dev/v1";
const MODEL = "google/gemini-omni-1.1-flash";

async function requireUser(request: Request): Promise<Response | null> {
  const token = request.headers.get("authorization")?.replace(/^Bearer /i, "");
  if (!token) return new Response("Login required", { status: 401 });
  const base = process.env["VITE_SUPABASE_URL"];
  const key = process.env["VITE_SUPABASE_PUBLISHABLE_KEY"];
  if (!base || !key) return new Response("Auth not configured", { status: 500 });
  const res = await fetch(`${base}/auth/v1/user`, {
    headers: { apikey: key, Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return new Response("Login required", { status: 401 });
  return null;
}

export const Route = createFileRoute("/api/generate-video")({
  server: {
    handlers: {
      // Create a video job. Body: { prompt, seconds }
      POST: async ({ request }) => {
        const denied = await requireUser(request);
        if (denied) return denied;
        const { prompt, seconds = 6 } = (await request.json()) as { prompt?: string; seconds?: number };
        if (!prompt || typeof prompt !== "string") return new Response("Prompt required", { status: 400 });
        const apiKey = process.env["LOVABLE_API_KEY"];
        if (!apiKey) return new Response("Missing LOVABLE_API_KEY", { status: 500 });
        const dur = Math.min(10, Math.max(3, Math.round(seconds)));
        const upstream = await fetch(`${GATEWAY}/videos`, {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: MODEL,
            input: prompt,
            response_format: { type: "video", resolution: "720p", duration: `${dur}s` },
          }),
        });
        const json = (await upstream.json()) as { id?: string; error?: { message?: string } };
        if (!upstream.ok || !json.id) {
          return new Response(json.error?.message ?? "Video job could not be created", { status: upstream.status || 500 });
        }
        return Response.json({ id: json.id });
      },

      // Poll job status: GET ?id=...
      GET: async ({ request, params }) => {
        const denied = await requireUser(request);
        if (denied) return denied;
        const url = new URL(request.url);
        const id = url.searchParams.get("id");
        const wantContent = url.searchParams.get("content") === "1";
        if (!id) return new Response("id required", { status: 400 });
        const apiKey = process.env["LOVABLE_API_KEY"];
        if (!apiKey) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

        if (wantContent) {
          const res = await fetch(`${GATEWAY}/videos/${id}/content`, {
            headers: { Authorization: `Bearer ${apiKey}` },
          });
          if (!res.ok || !res.body) return new Response("Video not ready", { status: res.status || 502 });
          return new Response(res.body, {
            headers: { "Content-Type": "video/mp4", "Cache-Control": "no-cache" },
          });
        }

        const res = await fetch(`${GATEWAY}/videos/${id}`, {
          headers: { Authorization: `Bearer ${apiKey}` },
        });
        const job = (await res.json()) as {
          status?: string;
          progress?: number;
          error?: { message?: string };
        };
        if (!res.ok) return new Response(job.error?.message ?? "Status check failed", { status: res.status });
        return Response.json({
          status: job.status,
          progress: job.progress ?? 0,
          error: job.error?.message,
          url: job.status === "completed" ? `/api/generate-video?id=${id}&content=1` : undefined,
        });
      },
    },
  },
});
