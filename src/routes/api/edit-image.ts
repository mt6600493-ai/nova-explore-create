import { createFileRoute } from "@tanstack/react-router";
import { imageSettings } from "@/lib/image-gateway.server";

export const Route = createFileRoute("/api/edit-image")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { prompt, image, stream = true } = (await request.json()) as {
          prompt?: string;
          image?: string;
          stream?: boolean;
        };
        if (!prompt || typeof prompt !== "string") return new Response("Prompt required", { status: 400 });
        if (!image || typeof image !== "string") return new Response("Source image required", { status: 400 });
        const apiKey = process.env["LOVABLE_API_KEY"];
        if (!apiKey) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

        const b64 = image.includes(",") ? image.slice(image.indexOf(",") + 1) : image;
        const upstream = await fetch(`${imageSettings.baseURL}/v1/images/edits`, {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: imageSettings.model,
            prompt: `Edit this exact image. Keep the same scene, structure, perspective, objects and composition — do NOT create a new scene. Only apply this change: ${prompt}`,
            image: [b64],
            ...(stream ? { stream: true, partial_images: 1 } : {}),
          }),
        });
        return new Response(upstream.body, {
          status: upstream.status,
          headers: {
            "Content-Type": upstream.headers.get("Content-Type") ?? "application/json",
            "Cache-Control": "no-cache",
          },
        });
      },
    },
  },
});
