import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useEffect, useMemo, useRef } from "react";
import { toast } from "sonner";
import { Box, ImageIcon, Search, Sparkle } from "lucide-react";

import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
  type PromptInputMessage,
} from "@/components/ai-elements/prompt-input";
import { Reasoning, ReasoningContent, ReasoningTrigger } from "@/components/ai-elements/reasoning";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { Tool, ToolContent, ToolHeader, ToolInput, ToolOutput } from "@/components/ai-elements/tool";
import { upsertThread } from "@/lib/threads";
import { ImageCard, ModelCard } from "./ToolCards";
import type { Part } from "./Scene3D";
import { NovaMark } from "./NovaMark";

const SUGGESTIONS = [
  { icon: Box, text: "Solar system ko 3D mein dikhao" },
  { icon: ImageIcon, text: "Ek futuristic Karachi city ki image banao" },
  { icon: Search, text: "Black hole kaise banta hai? Simple mein samjhao" },
  { icon: Box, text: "Water molecule (H₂O) ka 3D model" },
];

type AnyToolPart = {
  type: string;
  toolCallId: string;
  state: string;
  input?: Record<string, unknown>;
  output?: unknown;
  errorText?: string;
};

export function ChatWindow({ threadId, initialMessages }: { threadId: string; initialMessages: UIMessage[] }) {
  const transport = useMemo(() => new DefaultChatTransport({ api: "/api/chat" }), []);
  const { messages, sendMessage, status, stop } = useChat({
    id: threadId,
    messages: initialMessages,
    transport,
    onError: (e) => {
      const m = e.message || "";
      toast.error(
        m.includes("402") || m.toLowerCase().includes("credit")
          ? "AI credits khatam ho gaye hain."
          : m.includes("429")
            ? "Bahut zyada requests — thodi der baad try karein."
            : "Jawab nahi aa saka. Dobara try karein.",
      );
    },
  });
  const busy = status === "submitted" || status === "streaming";
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (messages.length && !busy) upsertThread(threadId, messages);
  }, [messages, busy, threadId]);

  useEffect(() => {
    if (!busy) inputRef.current?.focus();
  }, [busy, threadId]);

  const submit = (msg: PromptInputMessage) => {
    const text = msg.text.trim();
    if (!text || busy) return;
    void sendMessage({ text });
  };

  const last = messages[messages.length - 1];
  const waiting = busy && (last?.role === "user" || !last?.parts.some((p) => p.type === "text" && p.text));

  return (
    <div className="flex h-full min-h-0 flex-col">
      <Conversation className="min-h-0 flex-1">
        <ConversationContent className="mx-auto w-full max-w-3xl gap-6 px-4 py-6">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center pt-10 text-center sm:pt-20">
              <NovaMark className="size-16 nova-glow" />
              <h1 className="mt-6 font-display text-3xl font-semibold tracking-tight sm:text-5xl">
                Kuch bhi poochho.
              </h1>
              <p className="mt-3 max-w-md text-muted-foreground">
                Jawab, images aur ghumaane wale 3D models — sab ek jagah.
              </p>
              <div className="mt-8 grid w-full gap-2 sm:grid-cols-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s.text}
                    type="button"
                    onClick={() => void sendMessage({ text: s.text })}
                    className="nova-suggestion"
                  >
                    <s.icon className="size-4 shrink-0 text-primary" />
                    <span>{s.text}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {messages.map((m) => (
            <Message key={m.id} from={m.role}>
              <MessageContent className={m.role === "assistant" ? "w-full" : undefined}>
                {m.parts.map((part, i) => {
                  if (part.type === "text") {
                    return m.role === "assistant" ? (
                      <MessageResponse key={i}>{part.text}</MessageResponse>
                    ) : (
                      <p key={i} className="whitespace-pre-wrap">{part.text}</p>
                    );
                  }
                  if (part.type === "reasoning") {
                    if (!part.text) return null;
                    return (
                      <Reasoning key={i} isStreaming={busy && m.id === last?.id && part.state === "streaming"}>
                        <ReasoningTrigger />
                        <ReasoningContent>{part.text}</ReasoningContent>
                      </Reasoning>
                    );
                  }
                  if (part.type.startsWith("tool-")) {
                    const t = part as unknown as AnyToolPart;
                    const inputReady = t.state === "input-available" || t.state === "output-available";
                    return (
                      <div key={i} className="flex flex-col gap-2">
                        {t.type === "tool-generate_image" && inputReady ? (
                          <ImageCard id={t.toolCallId} prompt={String(t.input?.prompt ?? "")} />
                        ) : null}
                        {t.type === "tool-show_3d_model" ? (
                          <ModelCard
                            title={String(t.input?.title ?? "")}
                            parts={(t.input?.parts as Part[]) ?? []}
                            spin={Boolean(t.input?.spin)}
                            done={inputReady}
                          />
                        ) : null}
                        {t.type === "tool-generate_image" && !inputReady ? (
                          <Shimmer>Image ka idea ban raha hai...</Shimmer>
                        ) : null}
                        <Tool defaultOpen={false}>
                          <ToolHeader
                            type={t.type as `tool-${string}`}
                            state={t.state as never}
                            title={t.type === "tool-generate_image" ? "Image generator" : "3D builder"}
                          />
                          <ToolContent>
                            <ToolInput input={t.input} />
                            <ToolOutput output={t.output as never} errorText={t.errorText} />
                          </ToolContent>
                        </Tool>
                      </div>
                    );
                  }
                  return null;
                })}
              </MessageContent>
            </Message>
          ))}

          {waiting ? (
            <div className="flex items-center gap-2">
              <Sparkle className="size-4 animate-spin text-primary" />
              <Shimmer>Soch raha hoon...</Shimmer>
            </div>
          ) : null}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <div className="mx-auto w-full max-w-3xl px-3 pb-3 sm:pb-5">
        <PromptInput onSubmit={submit} className="nova-composer">
          <PromptInputTextarea ref={inputRef} placeholder="Kuch bhi poochho, image banwao, ya 3D mein dekho..." />
          <PromptInputFooter className="justify-end">
            <PromptInputSubmit status={status} onStop={stop} />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </div>
  );
}
