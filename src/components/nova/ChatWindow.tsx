import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { AudioLines, Box, ImageIcon, Mic, MicOff, Plus, Search, Sparkle, WifiOff, X } from "lucide-react";

import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputButton,
  PromptInputFooter,
  PromptInputHeader,
  PromptInputTools,
  usePromptInputAttachments,
  PromptInputSubmit,
  PromptInputTextarea,
  type PromptInputMessage,
} from "@/components/ai-elements/prompt-input";
import { Reasoning, ReasoningContent, ReasoningTrigger } from "@/components/ai-elements/reasoning";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { Tool, ToolContent, ToolHeader, ToolInput, ToolOutput } from "@/components/ai-elements/tool";
import { upsertThread } from "@/lib/threads";
import { Button } from "@/components/ui/button";
import { ImageCard, ModelCard } from "./ToolCards";
import type { Part } from "./Scene3D";
import { NovaMark } from "./NovaMark";
import { createRecognizer, offlineReply, speak } from "./Voice";

const SUGGESTIONS = [
  { icon: Box, text: "Show me the solar system in 3D" },
  { icon: ImageIcon, text: "Create an image of a futuristic Karachi" },
  { icon: Search, text: "How does a black hole form? Explain simply" },
  { icon: Box, text: "3D model of a water molecule (H₂O)" },
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
  const { messages, sendMessage, setMessages, status, stop } = useChat({
    id: threadId,
    messages: initialMessages,
    transport,
    onError: (e) => {
      const m = e.message || "";
      toast.error(
        m.includes("402") || m.toLowerCase().includes("credit")
          ? "AI credits have run out."
          : m.includes("429")
            ? "Too many requests — try again shortly."
            : "Couldn't get an answer. Please try again.",
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

  const [text, setText] = useState("");
  const [online, setOnline] = useState(true);
  const [listening, setListening] = useState(false);
  const [voice, setVoice] = useState<"off" | "listening" | "thinking" | "speaking">("off");
  const voiceRef = useRef(voice);
  voiceRef.current = voice;
  const recRef = useRef<ReturnType<typeof createRecognizer>>(null);

  useEffect(() => {
    const u = () => setOnline(navigator.onLine);
    u();
    window.addEventListener("online", u);
    window.addEventListener("offline", u);
    return () => {
      window.removeEventListener("online", u);
      window.removeEventListener("offline", u);
    };
  }, []);

  const send = useCallback(
    (t: string, files: PromptInputMessage["files"] = []) => {
      if (!navigator.onLine) {
        const mk = (role: "user" | "assistant", txt: string): UIMessage => ({
          id: Math.random().toString(36).slice(2),
          role,
          parts: [{ type: "text", text: txt }],
        });
        setMessages((m) => [...m, mk("user", t), mk("assistant", offlineReply(t))]);
        return;
      }
      void sendMessage(files.length ? { text: t || "What is in this image?", files } : { text: t });
    },
    [sendMessage, setMessages],
  );

  const submit = (msg: PromptInputMessage) => {
    const t = msg.text.trim();
    if ((!t && !msg.files.length) || busy) return;
    send(t, msg.files);
    setText("");
  };

  const listen = (onFinal: (t: string) => void, onStop?: () => void) => {
    const r = createRecognizer();
    if (!r) {
      toast.error("Voice isn't supported in this browser. Try Chrome.");
      return false;
    }
    recRef.current = r;
    let finalText = "";
    r.onresult = (e) => {
      let all = "";
      for (let i = 0; i < e.results.length; i++) all += e.results[i]![0]!.transcript;
      finalText = all;
      if (voiceRef.current === "off") setText(all);
    };
    r.onend = () => {
      onStop?.();
      if (finalText.trim()) onFinal(finalText.trim());
    };
    r.onerror = () => onStop?.();
    r.start();
    return true;
  };

  const toggleMic = () => {
    if (listening) return recRef.current?.stop();
    if (listen((t) => setText(t), () => setListening(false))) setListening(true);
  };

  const startVoiceTurn = () => {
    setVoice("listening");
    const ok = listen(
      (t) => {
        if (voiceRef.current === "off") return;
        setVoice("thinking");
        send(t);
      },
      () => {
        if (voiceRef.current === "listening") setVoice("off");
      },
    );
    if (!ok) setVoice("off");
  };

  const endVoice = () => {
    setVoice("off");
    recRef.current?.stop();
    window.speechSynthesis?.cancel();
    stop();
  };

  useEffect(() => {
    if (voice !== "thinking" || busy) return;
    const lastMsg = messages[messages.length - 1];
    if (lastMsg?.role !== "assistant") return;
    const reply = lastMsg.parts.map((p) => (p.type === "text" ? p.text : "")).join(" ");
    setVoice("speaking");
    speak(reply, () => {
      if (voiceRef.current === "speaking") startVoiceTurn();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voice, busy, messages]);

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
                Ask anything.
              </h1>
              <p className="mt-3 max-w-md text-muted-foreground">
                Answers, images and rotatable 3D models — all in one place.
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
                  if (part.type === "file") {
                    return part.mediaType?.startsWith("image/") ? (
                      <img key={i} src={part.url} alt="Attachment" className="max-h-60 rounded-lg" />
                    ) : (
                      <p key={i} className="text-xs opacity-70">📎 {part.filename ?? "File"}</p>
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
                          <ImageCard id={t.toolCallId} prompt={String(t.input?.["prompt"] ?? "")} />
                        ) : null}
                        {t.type === "tool-show_3d_model" ? (
                          <ModelCard
                            title={String(t.input?.["title"] ?? "")}
                            parts={(t.input?.["parts"] as Part[]) ?? []}
                            spin={Boolean(t.input?.["spin"])}
                            done={inputReady}
                          />
                        ) : null}
                        {t.type === "tool-generate_image" && !inputReady ? (
                          <Shimmer>Planning the image...</Shimmer>
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
              <Shimmer>Thinking...</Shimmer>
            </div>
          ) : null}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <div className="mx-auto w-full max-w-3xl px-3 pb-3 sm:pb-5">
        {!online ? (
          <p className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
            <WifiOff className="size-3.5" /> Offline mode — basic replies only until you reconnect.
          </p>
        ) : null}
        <PromptInput onSubmit={submit} accept="image/*" multiple maxFiles={4} maxFileSize={8 * 1024 * 1024}
          onError={(e) => toast.error(e.message)} className="nova-composer">
          <AttachmentPreview />
          <PromptInputTextarea
            ref={inputRef}
            value={text}
            onChange={(e) => setText(e.currentTarget.value)}
            placeholder={listening ? "Listening..." : "Ask anything, create an image, or explore in 3D..."}
          />
          <PromptInputFooter>
            <PromptInputTools>
              <AddPhotoButton />
              <PromptInputButton aria-label="Voice typing" onClick={toggleMic} className={listening ? "text-primary" : undefined}>
                {listening ? <MicOff className="size-4" /> : <Mic className="size-4" />}
              </PromptInputButton>
              <PromptInputButton aria-label="Live voice chat" onClick={startVoiceTurn} disabled={!online}>
                <AudioLines className="size-4" />
              </PromptInputButton>
            </PromptInputTools>
            <PromptInputSubmit status={status} onStop={stop} />
          </PromptInputFooter>
        </PromptInput>
      </div>

      {voice !== "off" ? (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-8 bg-background/95 backdrop-blur">
          <div className={`nova-voice-orb is-${voice}`}>
            <NovaMark className="size-20" />
          </div>
          <p className="font-display text-xl">
            {voice === "listening" ? "Listening..." : voice === "thinking" ? "Thinking..." : "Speaking..."}
          </p>
          <div className="flex gap-3">
            {voice === "speaking" ? (
              <Button variant="secondary" onClick={() => { window.speechSynthesis?.cancel(); startVoiceTurn(); }}>
                <Mic className="size-4" /> Interrupt
              </Button>
            ) : null}
            <Button variant="destructive" onClick={endVoice}>
              <X className="size-4" /> End
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function AddPhotoButton() {
  const a = usePromptInputAttachments();
  return (
    <PromptInputButton aria-label="Add photo" onClick={() => a.openFileDialog()}>
      <Plus className="size-4" />
    </PromptInputButton>
  );
}

function AttachmentPreview() {
  const a = usePromptInputAttachments();
  if (!a.files.length) return null;
  return (
    <PromptInputHeader className="flex flex-wrap gap-2 p-2">
      {a.files.map((f) => (
        <div key={f.id} className="relative">
          <img src={f.url} alt={f.filename ?? "Upload"} className="size-16 rounded-lg object-cover" />
          <button type="button" aria-label="Remove" onClick={() => a.remove(f.id)}
            className="absolute -right-1.5 -top-1.5 rounded-full bg-secondary p-0.5">
            <X className="size-3" />
          </button>
        </div>
      ))}
    </PromptInputHeader>
  );
}
