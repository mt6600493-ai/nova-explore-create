import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { ClientOnly } from "@tanstack/react-router";
import { Box, Download, ImageIcon, RefreshCw, Tag } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { streamImage } from "@/lib/stream-image";
import { getSavedImage, saveImage } from "@/lib/threads";
import type { Part } from "./Scene3D";

const Scene3D = lazy(() => import("./Scene3D"));
const started = new Set<string>();

async function compress(dataUrl: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const max = 1024;
      const r = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = img.width * r;
      c.height = img.height * r;
      c.getContext("2d")?.drawImage(img, 0, 0, c.width, c.height);
      resolve(c.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

export function ImageCard({ id, prompt }: { id: string; prompt: string }) {
  const [src, setSrc] = useState<string | null>(null);
  const [final, setFinal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async () => {
    setBusy(true);
    setError(null);
    setFinal(false);
    try {
      await streamImage("/api/generate-image", { prompt }, (url, isFinal) => {
        setSrc(url);
        setFinal(isFinal);
        if (isFinal) void compress(url).then((small) => saveImage(id, small));
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Image could not be created";
      setError(msg.includes("402") ? "AI credits have run out." : msg.includes("429") ? "Too many requests, please try again shortly." : "Image could not be created.");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    const saved = getSavedImage(id);
    if (saved) {
      setSrc(saved);
      setFinal(true);
      return;
    }
    if (started.has(id)) return;
    started.add(id);
    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  return (
    <div className="nova-card overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2.5 text-xs text-muted-foreground">
        <ImageIcon className="size-3.5 text-primary" />
        <span className="line-clamp-1 flex-1">{prompt}</span>
      </div>
      <div className="relative aspect-square w-full max-w-md bg-muted">
        {src ? (
          <img
            src={src}
            alt={prompt}
            className={`h-full w-full object-cover transition-[filter] duration-700 ${final ? "blur-0" : "blur-2xl"}`}
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            {busy ? <Shimmer>Creating image...</Shimmer> : <span className="text-sm text-muted-foreground">{error}</span>}
          </div>
        )}
      </div>
      <div className="flex items-center gap-2 px-4 py-2.5">
        {error ? <span className="flex-1 text-xs text-destructive">{error}</span> : <span className="flex-1" />}
        {src && final ? (
          <Button asChild size="sm" variant="ghost">
            <a href={src} download="nova-image.png">
              <Download className="size-4" /> Download
            </a>
          </Button>
        ) : null}
        {!busy ? (
          <Button size="sm" variant="ghost" onClick={() => void run()}>
            <RefreshCw className="size-4" /> {src ? "Regenerate" : "Generate"}
          </Button>
        ) : null}
      </div>
    </div>
  );
}

export function ModelCard({ title, parts, spin, done }: { title: string; parts: Part[]; spin: boolean; done: boolean }) {
  const [labels, setLabels] = useState(true);
  const wrap = useRef<HTMLDivElement>(null);
  return (
    <div className="nova-card overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2.5 text-sm">
        <Box className="size-4 text-primary" />
        <span className="flex-1 font-display font-medium">{title || "3D model"}</span>
        <Button size="sm" variant="ghost" onClick={() => setLabels((l) => !l)}>
          <Tag className="size-4" /> {labels ? "Labels off" : "Labels on"}
        </Button>
      </div>
      <div ref={wrap} className="relative h-80 w-full sm:h-[26rem]">
        {done && parts.length ? (
          <ClientOnly fallback={<div className="h-full" />}>
            <Suspense fallback={<div className="flex h-full items-center justify-center"><Shimmer>Loading 3D...</Shimmer></div>}>
              <Scene3D parts={parts} spin={spin} showLabels={labels} />
            </Suspense>
          </ClientOnly>
        ) : (
          <div className="flex h-full items-center justify-center">
            <Shimmer>Building 3D model...</Shimmer>
          </div>
        )}
      </div>
      <p className="px-4 py-2 text-xs text-muted-foreground">Drag to rotate · pinch or scroll to zoom</p>
    </div>
  );
}
