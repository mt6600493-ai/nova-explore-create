import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { AudioLines, Bookmark, Box, Camera, Check, Copy, FileText, ImageIcon, Mic, MicOff, Pencil, Plus, RefreshCw, Search, Share2, Sparkle, Square, Star, ThumbsDown, ThumbsUp, Volume2, WifiOff, X } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { loadFeedback, loadSettings, setFeedback, type Feedback } from "@/lib/settings";
import { useAuth } from "@/lib/auth";

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
import { loadThreads, upsertThread } from "@/lib/threads";
import { isForcedOffline } from "@/lib/offline";
import { Button } from "@/components/ui/button";
import { EditImageCard, ImageCard, ModelCard, VideoCard } from "./ToolCards";
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

const TIMES = "nova.times.v1";
function stampTime(id: string) {
  try {
    const all = JSON.parse(localStorage.getItem(TIMES) || "{}") as Record<string, number>;
    if (!all[id]) {
      all[id] = Date.now();
      localStorage.setItem(TIMES, JSON.stringify(all));
    }
    return all[id]!;
  } catch {
    return Date.now();
  }
}
function fmtTime(t: number) {
  const d = new Date(t);
  const today = new Date().toDateString() === d.toDateString();
  const y = new Date(Date.now() - 864e5).toDateString() === d.toDateString();
  const time = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  return `${today ? "Today" : y ? "Yesterday" : d.toLocaleDateString()}, ${time}`;
}
function textOf(m: UIMessage) {
  return m.parts.map((p) => (p.type === "text" ? p.text : "")).join("\n").trim();
}

export function ChatWindow({ threadId, initialMessages, initialPrompt }: { threadId: string; initialMessages: UIMessage[]; initialPrompt?: string | undefined }) {
  const { profile } = useAuth();
  const profileRef = useRef(profile);
  profileRef.current = profile;
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        body: () => ({ customInstructions: loadSettings().customInstructions || profileRef.current?.custom_instructions || "", memory: buildMemory(threadId) }),
      }),
    [],
  );
  const { messages, sendMessage, setMessages, status, stop, regenerate } = useChat({
    id: threadId,
    messages: initialMessages,
    transport,
    onError: (e) => {
      const m = e.message || "";
      console.error(m);
      toast.error("Nova is a little busy — please send your message again.");
    },
  });
  const busy = status === "submitted" || status === "streaming";
  const sentInitial = useRef(false);
  useEffect(() => {
    if (initialPrompt && !sentInitial.current && initialMessages.length === 0) {
      sentInitial.current = true;
      void sendMessage({ text: initialPrompt });
    }
  }, [initialPrompt, initialMessages.length, sendMessage]);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (messages.length && !busy) upsertThread(threadId, messages);
  }, [messages, busy, threadId]);

  useEffect(() => {
    if (!busy) inputRef.current?.focus();
  }, [busy, threadId]);

  const [text, setText] = useState("");
  const [online, setOnline] = useState(true);
  const [forced, setForced] = useState(false);
  useEffect(() => {
    const f = () => setForced(isForcedOffline());
    f();
    window.addEventListener("nova-offline", f);
    return () => window.removeEventListener("nova-offline", f);
  }, []);
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
      if (!navigator.onLine || isForcedOffline()) {
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
    if (dictating.current) { dictating.current = false; setListening(false); recRef.current?.stop(); }
    send(t, msg.files);
    setText("");
  };

  const dictating = useRef(false);
  const baseText = useRef("");
  const listen = (onFinal: (t: string) => void, onStop?: () => void) => {
    const r = createRecognizer(false);
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

  // Dictation: keeps listening through pauses; only the send button sends.
  const toggleMic = () => {
    if (listening) {
      dictating.current = false;
      setListening(false);
      recRef.current?.stop();
      return;
    }
    const startOnce = () => {
      const r = createRecognizer(true);
      if (!r) {
        toast.error("Voice typing isn't supported in this browser. Try Chrome.");
        dictating.current = false;
        setListening(false);
        return;
      }
      recRef.current = r;
      let session = "";
      r.onresult = (e) => {
        let all = "";
        for (let i = 0; i < e.results.length; i++) all += e.results[i]![0]!.transcript;
        session = all;
        setText((baseText.current ? baseText.current + " " : "") + all);
      };
      r.onend = () => {
        if (session.trim()) baseText.current = (baseText.current ? baseText.current + " " : "") + session.trim();
        if (dictating.current) startOnce(); // browser stopped after silence — keep listening
      };
      r.onerror = () => undefined;
      r.start();
    };
    baseText.current = text.trim();
    dictating.current = true;
    setListening(true);
    startOnce();
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

  const lastImageBefore = (id: string) => {
    const idx = messages.findIndex((x) => x.id === id);
    for (let i = idx; i >= 0; i--) {
      const f = [...messages[i]!.parts].reverse().find((p) => p.type === "file" && p.mediaType?.startsWith("image/"));
      if (f && f.type === "file") return f.url;
    }
    return null;
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
                        {t.type === "tool-edit_image" && inputReady ? (
                          <EditImageCard id={t.toolCallId} prompt={String(t.input?.["prompt"] ?? "")} sourceUrl={lastImageBefore(m.id)} />
                        ) : null}
                        {t.type === "tool-generate_video" && inputReady ? (
                          <VideoCard id={t.toolCallId} prompt={String(t.input?.["prompt"] ?? "")} seconds={Number(t.input?.["seconds"] ?? 6)} />
                        ) : null}
                        {t.type === "tool-generate_image" && !inputReady ? (
                          <Shimmer>Planning the image...</Shimmer>
                        ) : null}
                        <Tool defaultOpen={false}>
                          <ToolHeader
                            type={t.type as `tool-${string}`}
                            state={t.state as never}
                            title={TOOL_TITLES[t.type] ?? "Tool"}
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
              {!(busy && m.id === last?.id) ? (
                <MessageActions m={m} isLast={m.id === last?.id}
                  onEdit={() => {
                    setText(textOf(m));
                    setMessages((all) => all.slice(0, all.findIndex((x) => x.id === m.id)));
                    inputRef.current?.focus();
                  }}
                  onRegenerate={() => void regenerate({ messageId: m.id })}
                  onFollowUp={(q) => send(q)}
                />
              ) : null}
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
        {!online || forced ? (
          <p className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
            <WifiOff className="size-3.5" /> Offline mode — quick offline answers. Your chats are saved.
          </p>
        ) : null}
        <PromptInput onSubmit={submit} accept="image/*,application/pdf,text/plain,.txt,.md,.csv" multiple maxFiles={4} maxFileSize={8 * 1024 * 1024}
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
          <div className={`nova-voice-orb is-${voice}`} aria-hidden>
            <span className="cloud c1" /><span className="cloud c2" /><span className="cloud c3" />
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

const TOOL_TITLES: Record<string, string> = {
  "tool-generate_image": "Image generator",
  "tool-edit_image": "Photo editor",
  "tool-generate_video": "Video generator",
  "tool-show_3d_model": "3D builder",
};

function AddPhotoButton() {
  const a = usePromptInputAttachments();
  const cam = useRef<HTMLInputElement>(null);
  const gal = useRef<HTMLInputElement>(null);
  const pick = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) a.add(e.target.files);
    e.target.value = "";
  };
  return (
    <>
      <input ref={cam} type="file" accept="image/*" capture="environment" hidden onChange={pick} />
      <input ref={gal} type="file" accept="image/*" multiple hidden onChange={pick} />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <PromptInputButton aria-label="Add">
            <Plus className="size-4" />
          </PromptInputButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" side="top">
          <DropdownMenuItem onClick={() => cam.current?.click()}><Camera className="size-4" /> Camera</DropdownMenuItem>
          <DropdownMenuItem onClick={() => gal.current?.click()}><ImageIcon className="size-4" /> Gallery</DropdownMenuItem>
          <DropdownMenuItem onClick={() => a.openFileDialog()}><FileText className="size-4" /> Files / PDF</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}

function Act({ label, onClick, children, active }: { label: string; onClick: () => void; children: React.ReactNode; active?: boolean | undefined }) {
  return (
    <button type="button" aria-label={label} title={label} onClick={onClick}
      className={`rounded-md p-1.5 hover:bg-accent hover:text-foreground ${active ? "text-primary" : ""}`}>
      {children}
    </button>
  );
}

function MessageActions({ m, isLast, onEdit, onRegenerate, onFollowUp }: {
  m: UIMessage; isLast: boolean; onEdit: () => void; onRegenerate: () => void; onFollowUp: (q: string) => void;
}) {
  const [time, setTime] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [fb, setFb] = useState<Feedback>({});
  useEffect(() => {
    setTime(stampTime(m.id));
    setFb(loadFeedback()[m.id] ?? {});
  }, [m.id]);
  const update = (p: Feedback) => {
    setFeedback(m.id, p);
    setFb((f) => ({ ...f, ...p }));
  };
  const txt = textOf(m);
  const copy = () => {
    void navigator.clipboard.writeText(txt);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  const share = async () => {
    const data = { title: "Nova AI", text: txt.slice(0, 1000), url: "https://nova-explore-anything.com" };
    try {
      if (navigator.share) await navigator.share(data);
      else {
        await navigator.clipboard.writeText(`${data.text}\n\n— Nova AI ${data.url}`);
        toast.success("Copied to share");
      }
    } catch { /* cancelled */ }
  };
  const isUser = m.role === "user";
  return (
    <div className={`flex flex-col gap-1.5 ${isUser ? "items-end" : "items-start"}`}>
      <div className="flex flex-wrap items-center gap-0.5 text-muted-foreground">
        {time ? <span className="mr-1 text-[11px]">{fmtTime(time)}</span> : null}
        {txt ? <Act label="Copy" onClick={copy}>{copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}</Act> : null}
        {isUser ? (
          <Act label="Edit" onClick={onEdit}><Pencil className="size-3.5" /></Act>
        ) : (
          <>
            <Act label={speaking ? "Stop" : "Read aloud"} active={speaking} onClick={() => {
              if (speaking) { window.speechSynthesis?.cancel(); setSpeaking(false); return; }
              setSpeaking(true);
              speak(txt, () => setSpeaking(false));
            }}>{speaking ? <Square className="size-3.5" /> : <Volume2 className="size-3.5" />}</Act>
            {isLast ? <Act label="Regenerate" onClick={onRegenerate}><RefreshCw className="size-3.5" /></Act> : null}
            <Act label="Like" active={fb.vote === "up"} onClick={() => update({ vote: fb.vote === "up" ? undefined : "up" })}><ThumbsUp className="size-3.5" /></Act>
            <Act label="Dislike" active={fb.vote === "down"} onClick={() => { update({ vote: fb.vote === "down" ? undefined : "down" }); if (fb.vote !== "down") toast("Thanks — your feedback helps Nova improve."); }}><ThumbsDown className="size-3.5" /></Act>
            <Act label="Save" active={fb.saved} onClick={() => update({ saved: !fb.saved })}><Bookmark className={`size-3.5 ${fb.saved ? "fill-current" : ""}`} /></Act>
            <Act label="Share" onClick={() => void share()}><Share2 className="size-3.5" /></Act>
            <span className="ml-1 flex">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} type="button" aria-label={`Rate ${n} stars`} onClick={() => update({ stars: n })} className="p-0.5">
                  <Star className={`size-3 ${(fb.stars ?? 0) >= n ? "fill-primary text-primary" : ""}`} />
                </button>
              ))}
            </span>
          </>
        )}
      </div>
      {!isUser && isLast && txt ? (
        <div className="flex flex-wrap gap-1.5">
          {["Explain in more detail", "Give me an example", "Summarize in 3 points"].map((q) => (
            <button key={q} type="button" onClick={() => onFollowUp(q)}
              className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground hover:border-primary hover:text-foreground">
              {q}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function AttachmentPreview() {
  const a = usePromptInputAttachments();
  if (!a.files.length) return null;
  return (
    <PromptInputHeader className="flex flex-wrap gap-2 p-2">
      {a.files.map((f) => (
        <div key={f.id} className="relative">
          {f.mediaType?.startsWith("image/") ? (
            <img src={f.url} alt={f.filename ?? "Upload"} className="size-16 rounded-lg object-cover" />
          ) : (
            <div className="flex size-16 flex-col items-center justify-center rounded-lg bg-secondary p-1 text-[10px]">
              <FileText className="size-5" /><span className="w-full truncate text-center">{f.filename}</span>
            </div>
          )}
          <button type="button" aria-label="Remove" onClick={() => a.remove(f.id)}
            className="absolute -right-1.5 -top-1.5 rounded-full bg-secondary p-0.5">
            <X className="size-3" />
          </button>
        </div>
      ))}
    </PromptInputHeader>
  );
}

/** Short memory of the user's earlier chats so Nova can continue instead of repeating. */
function buildMemory(currentId: string) {
  try {
    return loadThreads()
      .filter((t) => t.id !== currentId)
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, 8)
      .map((t) => {
        const asked = t.messages.filter((m) => m.role === "user").slice(-3).map((m) => textOf(m).slice(0, 140)).join(" | ");
        return `- ${new Date(t.updatedAt).toLocaleDateString()}: "${t.title}" — user said: ${asked}`;
      })
      .join("\n");
  } catch {
    return "";
  }
}
