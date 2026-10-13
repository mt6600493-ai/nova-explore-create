import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Navigation } from "lucide-react";

import { Button } from "@/components/ui/button";
import { speak } from "@/components/nova/Voice";
import { AppShell } from "@/components/nova/AppShell";

export const Route = createFileRoute("/map")({
  head: () => ({
    meta: [
      { title: "Map & Directions — Nova AI" },
      { name: "description", content: "Free map with turn-by-turn directions from start to destination." },
      { property: "og:title", content: "Map & Directions — Nova AI" },
      { property: "og:description", content: "Free map with turn-by-turn directions." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MapPage,
});

type Step = { text: string; dist: number };
type LL = [number, number];

async function geocode(q: string): Promise<LL> {
  const r = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`);
  const d = (await r.json()) as { lat: string; lon: string }[];
  if (!d[0]) throw new Error(`Place not found: ${q}`);
  return [Number(d[0].lat), Number(d[0].lon)];
}

function stepText(m: { type: string; modifier?: string }, name: string) {
  const road = name ? ` onto ${name}` : "";
  if (m.type === "depart") return `Start${name ? ` on ${name}` : ""}`;
  if (m.type === "arrive") return "You have arrived at your destination";
  if (m.modifier?.includes("left")) return `Turn left${road}`;
  if (m.modifier?.includes("right")) return `Turn right${road}`;
  if (m.type === "roundabout" || m.type === "rotary") return `Take the roundabout${road}`;
  return `Go straight${road}`;
}

function MapPage() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [steps, setSteps] = useState<Step[]>([]);
  const [box, setBox] = useState<string>("60.8,23.6,77.8,37.1");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);

  const useMyLocation = () =>
    navigator.geolocation?.getCurrentPosition((p) => setFrom(`${p.coords.latitude},${p.coords.longitude}`));

  const go = async () => {
    setBusy(true);
    setInfo("");
    try {
      const parse = async (s: string): Promise<LL> => {
        const m = s.match(/^\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*$/);
        return m ? [Number(m[1]), Number(m[2])] : geocode(s);
      };
      const a = await parse(from);
      const b = await parse(to);
      const r = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${a[1]},${a[0]};${b[1]},${b[0]}?steps=true&overview=false`,
      );
      const d = (await r.json()) as {
        routes?: { distance: number; duration: number; legs: { steps: { distance: number; name: string; maneuver: { type: string; modifier?: string } }[] }[] }[];
      };
      const route = d.routes?.[0];
      if (!route) throw new Error("No route found");
      const s = route.legs[0]!.steps.map((x) => ({ text: stepText(x.maneuver, x.name), dist: x.distance }));
      setSteps(s);
      setInfo(`${(route.distance / 1000).toFixed(1)} km · about ${Math.round(route.duration / 60)} min`);
      const pad = 0.02;
      setBox(`${Math.min(a[1], b[1]) - pad},${Math.min(a[0], b[0]) - pad},${Math.max(a[1], b[1]) + pad},${Math.max(a[0], b[0]) + pad}`);
      localStorage.setItem("nova.lastRoute", JSON.stringify({ from, to, steps: s }));
      if (s[0]) speak(s[0].text, () => undefined);
    } catch (e) {
      const saved = localStorage.getItem("nova.lastRoute");
      if (!navigator.onLine && saved) {
        const v = JSON.parse(saved) as { steps: Step[] };
        setSteps(v.steps);
        setInfo("Offline — showing your last saved route.");
      } else setInfo(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppShell title="Map & Directions">
    <div className="mx-auto flex max-w-3xl flex-col gap-4 p-4">
      <h1 className="flex items-center gap-2 font-display text-2xl font-semibold"><Navigation className="size-6 text-primary" /> Map & Directions</h1>
      <div className="flex flex-col gap-2">
        <div className="flex gap-2">
          <input value={from} onChange={(e) => setFrom(e.target.value)} placeholder="From (e.g. Peshawar Saddar)"
            className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm" />
          <Button variant="outline" onClick={useMyLocation}>My location</Button>
        </div>
        <input value={to} onChange={(e) => setTo(e.target.value)} placeholder="To (e.g. University of Peshawar)"
          className="rounded-md border border-border bg-background px-3 py-2 text-sm" />
        <Button variant="nova" disabled={busy || !from || !to} onClick={() => void go()}>{busy ? "Finding route..." : "Show route"}</Button>
      </div>
      {info ? <p className="text-sm font-medium">{info}</p> : null}
      <iframe title="Map" className="h-80 w-full rounded-lg border border-border"
        src={`https://www.openstreetmap.org/export/embed.html?bbox=${box}&layer=mapnik`} />
      <ol className="flex flex-col gap-1">
        {steps.map((s, i) => (
          <li key={i} className="flex justify-between rounded-md bg-accent px-3 py-2 text-sm">
            <span>{i + 1}. {s.text}</span>
            <span className="text-muted-foreground">{s.dist >= 1000 ? `${(s.dist / 1000).toFixed(1)} km` : `${Math.round(s.dist)} m`}</span>
          </li>
        ))}
      </ol>
    </div>
    </AppShell>
  );
}
