import { createOpenAI } from "@ai-sdk/openai";
import { convertToModelMessages, stepCountIs, streamText, tool, type UIMessage } from "ai";
import { z } from "zod";

import {
  createLovableAiGatewayRunIdFetch,
  getLovableAiGatewayRunId,
  withLovableAiGatewayRunIdHeader,
} from "./run-id.server";

const GATEWAY = "https://ai.gateway.lovable.dev/v1";
const MODEL = "openai/gpt-6-astra";

const INSTRUCTIONS = `You are Nova, a powerful all-in-one AI assistant. You answer any question on any topic clearly, accurately and in depth, using well-structured markdown (headings, lists, tables, code blocks when useful).
Always reply in the same language and script the user writes in (Hindi, Urdu, Hinglish, English, etc.).

You have two tools:
1. generate_image — call it whenever the user asks to create, draw, design or generate an image/picture/photo/logo/art. Write a rich, detailed English prompt.
2. show_3d_model — call it whenever the user asks to see something in 3D, or when a 3D visual would clearly help explain a topic (solar system, atom, molecule, DNA, planet, building, heart, machine, etc.). Build the model from simple shapes:
   - shapes: sphere, box, cylinder, cone, torus
   - position [x,y,z] in a scene roughly within -5..5, scale [x,y,z] (size of the shape; sphere uses x as radius-ish), rotation [x,y,z] in radians
   - color as hex like "#ff8800"; label: short name of the part, or "" for no label
   - use 5 to 40 parts, make it recognisable and colourful, center it around the origin.
   - set spin true for things that naturally rotate (planets, molecules).
After a tool call, briefly explain the result to the user. Do not mention tool names.`;

const shape = z.object({
  shape: z.enum(["sphere", "box", "cylinder", "cone", "torus"]),
  position: z.array(z.number()).describe("[x, y, z]"),
  scale: z.array(z.number()).describe("[x, y, z]"),
  rotation: z.array(z.number()).describe("[x, y, z] radians"),
  color: z.string().describe("hex color"),
  label: z.string().describe("part name or empty string"),
});

export async function handleChat(request: Request) {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) return new Response("AI is not configured", { status: 500 });

  let messages: UIMessage[];
  try {
    const body = (await request.json()) as { messages?: UIMessage[] };
    if (!Array.isArray(body.messages)) throw new Error("bad");
    messages = body.messages;
  } catch {
    return new Response("Invalid request", { status: 400 });
  }

  const runIdFetch = createLovableAiGatewayRunIdFetch(getLovableAiGatewayRunId(request));
  const provider = createOpenAI({
    baseURL: GATEWAY,
    apiKey,
    headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    fetch: runIdFetch.fetch,
  });

  const result = streamText({
    model: provider.responses(MODEL),
    instructions: INSTRUCTIONS,
    messages: await convertToModelMessages(messages),
    abortSignal: request.signal,
    stopWhen: stepCountIs(50),
    tools: {
      generate_image: tool({
        description: "Generate an image from a detailed text prompt. The app renders it for the user.",
        inputSchema: z.object({
          prompt: z.string().describe("Detailed English image prompt"),
        }),
        execute: async () => ({ status: "image is being rendered for the user" }),
      }),
      show_3d_model: tool({
        description: "Show an interactive, rotatable 3D model built from simple shapes.",
        inputSchema: z.object({
          title: z.string(),
          spin: z.boolean(),
          parts: z.array(shape),
        }),
        execute: async ({ parts }) => ({ status: "3D model shown", parts: parts.length }),
      }),
    },
    providerOptions: {
      openai: {
        store: false,
        forceReasoning: true,
        reasoningEffort: "medium",
        reasoningSummary: "auto",
        include: ["reasoning.encrypted_content"],
      },
    },
  });

  return withLovableAiGatewayRunIdHeader(
    result.toUIMessageStreamResponse({
      originalMessages: messages,
      sendReasoning: true,
      onError: (e) => {
        const err = e as { statusCode?: number; message?: string };
        if (err?.statusCode === 402) return "AI credits khatam ho gaye hain. Workspace billing mein credits add karein.";
        if (err?.statusCode === 429) return "Bahut zyada requests — thodi der baad try karein.";
        return err?.message ?? "Kuch galat ho gaya.";
      },
    }),
    runIdFetch,
  );
}
