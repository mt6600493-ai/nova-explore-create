import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth";
import { loadSettings, saveSettings, type NovaSettings } from "@/lib/settings";
import { speak } from "./Voice";

function Seg<T extends string>({ value, options, onChange }: { value: T; options: [T, string][]; onChange: (v: T) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map(([v, l]) => (
        <Button key={v} type="button" size="sm" variant={value === v ? "default" : "secondary"} onClick={() => onChange(v)}>
          {l}
        </Button>
      ))}
    </div>
  );
}

export function SettingsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { user, profile, saveProfile } = useAuth();
  const [s, setS] = useState<NovaSettings>(loadSettings);
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState("");
  const wallpaperInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const local = loadSettings();
    setS({ ...local, customInstructions: local.customInstructions || profile?.custom_instructions || "" });
    setName(profile?.display_name ?? "");
    setAvatar(profile?.avatar_url ?? "");
  }, [open, profile]);

  const save = async () => {
    saveSettings(s);
    if (user) await saveProfile({ custom_instructions: s.customInstructions, display_name: name || null, avatar_url: avatar || null });
    toast.success("Settings saved");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display">Settings</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-5">
          {user ? (
            <div className="flex flex-col gap-2">
              <Label>Your name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
              <Label>Profile picture link (optional)</Label>
              <Input value={avatar} onChange={(e) => setAvatar(e.target.value)} placeholder="https://..." />
            </div>
          ) : null}
          <div className="flex flex-col gap-2">
            <Label>Custom instructions for Nova</Label>
            <Textarea
              rows={4}
              value={s.customInstructions}
              onChange={(e) => setS({ ...s, customInstructions: e.target.value.slice(0, 2000) })}
              placeholder="e.g. Always answer in Roman Urdu, keep answers short, explain like I'm a student."
            />
            <p className="text-xs text-muted-foreground">Nova follows this in every chat.</p>
          </div>
          <div className="flex flex-col gap-2">
            <Label>Voice</Label>
            <Seg value={s.voiceGender} onChange={(v) => setS({ ...s, voiceGender: v })} options={[["female", "Female"], ["male", "Male"]]} />
          </div>
          <div className="flex flex-col gap-2">
            <Label>Speed</Label>
            <Seg value={s.voiceRate} onChange={(v) => setS({ ...s, voiceRate: v })} options={[["slow", "Slow"], ["normal", "Normal"], ["fast", "Fast"]]} />
          </div>
          <div className="flex flex-col gap-2">
            <Label>Voice language</Label>
            <Seg value={s.voiceLang} onChange={(v) => setS({ ...s, voiceLang: v })}
              options={[["auto", "Auto"], ["en-US", "English"], ["ur-PK", "Urdu"], ["ps-AF", "Pashto"]]} />
          </div>
          <div className="flex flex-col gap-2">
            <Label>Voice style</Label>
            <Seg value={s.voiceStyle} onChange={(v) => setS({ ...s, voiceStyle: v })}
              options={[["friendly", "Friendly"], ["professional", "Professional"], ["calm", "Calm"]]} />
          </div>
          <div className="flex flex-col gap-2">
            <Label>Theme</Label>
            <Seg value={s.themeMode} onChange={(v) => setS({ ...s, themeMode: v })} options={[["dark", "Dark"], ["light", "Light"]]} />
          </div>
          <div className="flex flex-col gap-2">
            <Label>Accent color</Label>
            <Seg value={s.accent} onChange={(v) => setS({ ...s, accent: v })}
              options={[["emerald", "Emerald"], ["blue", "Blue"], ["violet", "Violet"], ["amber", "Amber"], ["rose", "Rose"]]} />
          </div>
          <div className="flex flex-col gap-2">
            <Label>Chat wallpaper (your own photo)</Label>
            <div className="flex items-center gap-2">
              <Button type="button" variant="secondary" size="sm" onClick={() => wallpaperInput.current?.click()}>
                Choose from gallery
              </Button>
              {s.wallpaper ? (
                <Button type="button" variant="ghost" size="sm" onClick={() => setS({ ...s, wallpaper: "" })}>
                  Remove
                </Button>
              ) : null}
            </div>
            <input
              ref={wallpaperInput}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                if (f.size > 3 * 1024 * 1024) { toast.error("Please pick a photo under 3 MB"); return; }
                const r = new FileReader();
                r.onload = () => setS((prev) => ({ ...prev, wallpaper: String(r.result) }));
                r.readAsDataURL(f);
                e.target.value = "";
              }}
            />
            <p className="text-xs text-muted-foreground">Your photo stays on this device only.</p>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={() => { saveSettings(s); speak("Hello! I am Nova, your AI assistant.", () => {}); }}>
              Test voice
            </Button>
            <Button type="button" className="flex-1" onClick={() => void save()}>Save</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
