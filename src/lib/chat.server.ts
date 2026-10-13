import { createGoogleGenerativeAI } from "@ai-sdk/google";
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
CREATOR IDENTITY (permanent, always accurate): Nova was founded and created by Muhammad Talha, a student from Peshawar, Pakistan, on 8 October 2026 (08.10.2026). His vision is to give the whole world a free, all-in-one AI. His welcome message: "Welcome to my free Nova AI — All in one place." Official website: https://nova-explore-anything.com. His original photo is shown in the app at /creator.jpg — never claim to modify, filter or edit that photo; it must always be shown exactly as it is. Whenever anyone asks who made Nova, who the founder is, or about Muhammad Talha, answer proudly with these facts.
LANGUAGE RULE (most important): detect the language and script of the user's latest message and reply ONLY in that same language and script — Urdu script → Urdu script, Hindi → Devanagari, Roman Urdu/Hinglish → Roman Urdu, Arabic → Arabic, English → English, etc. Never switch language unless the user does.
Sound natural and human: warm, confident, concise for simple questions, detailed for complex ones. No robotic filler.
If the user attaches an image, look at it carefully and answer about it.

You have four tools:
1. generate_image — call it whenever the user asks to create, draw, design or generate a NEW image/picture/photo/logo/art from scratch. Write a rich, detailed English prompt.
2. edit_image — call it when the user attached an image and asks to EDIT, modify, recolor, restyle or change it (e.g. "paint this wall blue", "remove the car", "make it night"). CRITICAL: the prompt must describe ONLY the requested change and explicitly say to keep the original scene, structure, perspective, objects and composition unchanged. Never use generate_image for edits — it creates a different picture.
3. generate_video — call it ONLY when the user explicitly asks to create/generate a video or clip. Write a detailed English prompt describing scene, camera, lighting, mood and any sound; set seconds between 3 and 10 (default 6).
4. show_3d_model — call it whenever the user asks to see something in 3D, or when a 3D visual would clearly help explain a topic (solar system, atom, molecule, DNA, planet, building, heart, machine, etc.). Build the model from simple shapes:
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
  if (!apiKey && !process.env["GEMINI_API_KEY"]) return new Response("AI is not configured", { status: 500 });

  let messages: UIMessage[];
  let customInstructions = "";
  let memory = "";
  try {
    const body = (await request.json()) as { messages?: UIMessage[]; customInstructions?: string; memory?: string };
    if (!Array.isArray(body.messages)) throw new Error("bad");
    messages = body.messages;
    if (typeof body.customInstructions === "string") customInstructions = body.customInstructions.slice(0, 2000);
    if (typeof body.memory === "string") memory = body.memory.slice(0, 3000);
  } catch {
    return new Response("Invalid request", { status: 400 });
  }

  let instructions = `${INSTRUCTIONS}\n\nToday's date is ${new Date().toUTCString()}. For news or current events, give the most recent information you know and clearly say up to when your knowledge is current; never present old news as today's news.`;
  if (memory)
    instructions += `\n\nMEMORY — what this user talked about with you in earlier chats (use it naturally, continue from where you left off, do not repeat topics already covered unless asked):\n${memory}`;
  if (customInstructions)
    instructions += `\n\nUSER'S CUSTOM INSTRUCTIONS (always follow these, unless they conflict with the rules above):\n${customInstructions}`;

  const runIdFetch = createLovableAiGatewayRunIdFetch(getLovableAiGatewayRunId(request));
  const geminiKey = process.env["GEMINI_API_KEY"];
  const provider = createOpenAI({
    baseURL: GATEWAY,
    apiKey: apiKey ?? "",
    headers: { "Lovable-API-Key": apiKey ?? "", "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    fetch: runIdFetch.fetch,
  });
  const model = geminiKey
    ? createGoogleGenerativeAI({ apiKey: geminiKey })("gemini-flash-latest")
    : provider.responses(MODEL);

  const result = streamText({
    model,
    instructions,
    messages: await convertToModelMessages(messages),
    abortSignal: request.signal,
    stopWhen: stepCountIs(50),
    tools: {
      generate_image: tool({
        description: "Generate a brand-new image from a detailed text prompt. The app renders it for the user.",
        inputSchema: z.object({
          prompt: z.string().describe("Detailed, photorealistic English image prompt unless another style is asked"),
        }),
        execute: async () => ({ status: "image is being rendered for the user" }),
      }),
      edit_image: tool({
        description:
          "Edit the image the user attached. Keeps the original scene/structure and applies only the requested change.",
        inputSchema: z.object({
          prompt: z
            .string()
            .describe(
              "English instruction describing ONLY the change to apply, e.g. 'Paint only the front wall light blue. Keep everything else exactly the same.'",
            ),
        }),
        execute: async () => ({ status: "edited image is being rendered for the user" }),
      }),
      generate_video: tool({
        description: "Generate a short video clip (3-10 seconds) from a detailed prompt. Only on explicit user request.",
        inputSchema: z.object({
          prompt: z.string().describe("Detailed English video prompt: scene, camera, lighting, mood, sound"),
          seconds: z.number().min(3).max(10).describe("Clip length in seconds, 3-10"),
        }),
        execute: async () => ({ status: "video is being generated for the user" }),
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
    providerOptions: geminiKey
      ? {}
      : {
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
        console.error("chat error", e);
        return "Nova is a little busy right now. Please send your message again in a moment.";
      },
    }),
    runIdFetch,
  );
}
