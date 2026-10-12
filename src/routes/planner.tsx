import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Box } from "lucide-react";

import { AppShell } from "@/components/nova/AppShell";
import { Button } from "@/components/ui/button";
import { newThreadId } from "@/lib/threads";

export const Route = createFileRoute("/planner")({
  head: () => ({
    meta: [
      { title: "House Map & 3D Planner — Nova AI" },
      { name: "description", content: "Get a house floor plan for 3, 5, 10 marla or 1 kanal and see it as a rotatable 3D model." },
      { property: "og:title", content: "House Map & 3D Planner — Nova AI" },
      { property: "og:description", content: "Floor plans by marla or feet, turned into 3D." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Planner,
});

const SIZES = ["3 Marla", "5 Marla", "7 Marla", "10 Marla", "1 Kanal", "Custom (feet)"];

function Planner() {
  const navigate = useNavigate();
  const [size, setSize] = useState("5 Marla");
  const [feet, setFeet] = useState("");
  const [floors, setFloors] = useState("2");
  const [beds, setBeds] = useState("3");
  const [extra, setExtra] = useState("");

  const go = () => {
    const plot = size.startsWith("Custom") ? `${feet || "30x60"} feet` : size;
    const q = `Design a house floor plan (naqsha) for a ${plot} plot in Pakistan with ${floors} floor(s) and ${beds} bedrooms.${extra ? " Extra needs: " + extra + "." : ""} First give a clear room-by-room layout per floor with sizes in feet (bedrooms, bathrooms, kitchen, lounge, car porch, stairs). Then show the house as an interactive 3D model.`;
    void navigate({ to: "/chat/$threadId", params: { threadId: newThreadId() }, search: { q } });
  };

  const field = "w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary";
  return (
    <AppShell title="House Planner">
      <div className="mx-auto w-full max-w-xl overflow-y-auto px-4 py-10">
        <div className="mb-6 flex items-center gap-3">
          <Box className="size-8 text-primary" />
          <h1 className="font-display text-3xl font-semibold">House Map & 3D Planner</h1>
        </div>
        <p className="mb-6 text-muted-foreground">Choose your plot size — Nova will draw the floor plan and then turn it into a 3D house you can rotate.</p>
        <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {SIZES.map((s) => (
            <button key={s} type="button" onClick={() => setSize(s)}
              className={`rounded-lg border px-3 py-3 text-sm ${size === s ? "border-primary bg-primary/15 text-foreground" : "border-border text-muted-foreground"}`}>
              {s}
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-3">
          {size.startsWith("Custom") ? <input className={field} placeholder="Plot size in feet, e.g. 25x50" value={feet} onChange={(e) => setFeet(e.target.value)} /> : null}
          <label className="text-sm">Floors
            <select className={field} value={floors} onChange={(e) => setFloors(e.target.value)}>{["1", "2", "3"].map((n) => <option key={n}>{n}</option>)}</select>
          </label>
          <label className="text-sm">Bedrooms
            <select className={field} value={beds} onChange={(e) => setBeds(e.target.value)}>{["1", "2", "3", "4", "5", "6"].map((n) => <option key={n}>{n}</option>)}</select>
          </label>
          <textarea className={field} rows={3} placeholder="Anything else? (e.g. drawing room, basement, garden)" value={extra} onChange={(e) => setExtra(e.target.value)} />
          <Button variant="nova" size="lg" className="rounded-full" onClick={go}>Make my house map + 3D</Button>
        </div>
      </div>
    </AppShell>
  );
}
