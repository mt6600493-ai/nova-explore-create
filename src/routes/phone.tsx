import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Phone } from "lucide-react";

import { AppShell } from "@/components/nova/AppShell";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/phone")({
  head: () => ({
    meta: [
      { title: "Phone Number Check — Nova AI" },
      { name: "description", content: "Check if a phone number is valid and see its country and mobile network." },
      { property: "og:title", content: "Phone Number Check — Nova AI" },
      { property: "og:description", content: "Validate a number and see its country and network." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PhonePage,
});

const PK: [RegExp, string][] = [
  [/^30|^32/, "Jazz (Mobilink)"],
  [/^31/, "Zong"],
  [/^33/, "Ufone"],
  [/^34/, "Telenor"],
  [/^355/, "SCO"],
];
const CC: Record<string, string> = { "92": "Pakistan 🇵🇰", "91": "India 🇮🇳", "1": "USA / Canada 🇺🇸", "44": "United Kingdom 🇬🇧", "971": "UAE 🇦🇪", "966": "Saudi Arabia 🇸🇦", "974": "Qatar 🇶🇦", "93": "Afghanistan 🇦🇫", "86": "China 🇨🇳", "90": "Turkey 🇹🇷" };

function check(raw: string) {
  let d = raw.replace(/[^\d+]/g, "");
  if (d.startsWith("00")) d = "+" + d.slice(2);
  if (d.startsWith("03") && d.length === 11) d = "+92" + d.slice(1);
  if (!d.startsWith("+")) return { ok: false, msg: "Write the number with country code (e.g. +92 300 1234567) or as 03XX XXXXXXX." };
  const n = d.slice(1);
  const code = ["971", "966", "974", "92", "91", "93", "86", "90", "44", "1"].find((c) => n.startsWith(c));
  if (!code) return { ok: false, msg: "Unknown country code." };
  const local = n.slice(code.length);
  const rows: [string, string][] = [["Country", CC[code]!], ["International format", `+${code} ${local}`]];
  let ok = local.length >= 7 && local.length <= 12;
  if (code === "92") {
    ok = local.length === 10 && local.startsWith("3");
    const net = PK.find(([r]) => r.test(local));
    rows.push(["Type", local.startsWith("3") ? "Mobile" : "Landline / other"]);
    rows.push(["Network (original)", net ? net[1] : "Unknown"]);
    rows.push(["Note", "If the number was ported (MNP), the current network may differ."]);
  }
  return { ok, rows, msg: ok ? "Valid number format ✓" : "This number looks incomplete or wrong ⚠️" };
}

function PhonePage() {
  const [v, setV] = useState("");
  const [res, setRes] = useState<ReturnType<typeof check> | null>(null);
  return (
    <AppShell title="Phone Check">
      <div className="mx-auto w-full max-w-xl overflow-y-auto px-4 py-10">
        <div className="mb-4 flex items-center gap-3">
          <Phone className="size-8 text-primary" />
          <h1 className="font-display text-3xl font-semibold">Phone Number Check</h1>
        </div>
        <p className="mb-6 text-sm text-muted-foreground">
          Check whether a number is valid and see its country, type and mobile network. For privacy and legal reasons,
          Nova does not show the owner's name, address or personal data.
        </p>
        <div className="flex gap-2">
          <input value={v} onChange={(e) => setV(e.target.value)} placeholder="+92 300 1234567" inputMode="tel"
            className="flex-1 rounded-md border border-border bg-background px-3 py-2 outline-none focus:border-primary" />
          <Button variant="nova" onClick={() => setRes(check(v))}>Check</Button>
        </div>
        {res ? (
          <div className="nova-card mt-6 p-5">
            <p className={`mb-3 font-semibold ${res.ok ? "text-primary" : "text-destructive"}`}>{res.msg}</p>
            {res.rows?.map(([k, val]) => (
              <div key={k} className="flex justify-between gap-4 border-t border-border py-2 text-sm">
                <span className="text-muted-foreground">{k}</span><span className="text-right">{val}</span>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </AppShell>
  );
}
