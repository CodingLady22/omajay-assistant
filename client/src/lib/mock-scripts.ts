export type ScriptStatus = "draft" | "posted";

type ScriptBase = {
  id: string;
  title: string;
  badgeLabel: string;
  // Carried for schema fidelity (mirrors the server's `scripts.status` field) —
  // not yet rendered; the mock's "· Draft" is literal title text, not a status badge.
  status: ScriptStatus;
  actionLabel: string;
  actionPrompt: string;
};

export type ReelScript = ScriptBase & {
  kind: "reel";
  hook: string;
  body: string;
  cta: string;
};

export type CaptionScript = ScriptBase & {
  kind: "caption";
  text: string;
};

export type CarouselScript = ScriptBase & {
  kind: "carousel";
  // Carried for schema fidelity, same reasoning as ScriptBase.status — ScriptCard
  // currently renders a "not yet implemented" placeholder for carousels and ignores this.
  text: string;
};

export type Script = ReelScript | CaptionScript | CarouselScript;

export const MOCK_SCRIPTS: Script[] = [
  {
    id: "glass-skin-reel",
    kind: "reel",
    title: "Glass Skin Reel · Draft",
    badgeLabel: "Reel · 30s",
    status: "draft",
    hook: "“POV: you finally found the secret to glass skin under €30…”",
    body: "3-step skincare + primer combo, fast cuts, trending audio",
    cta: "“Save this and try it this weekend 🫧”",
    actionLabel: "Expand script ↗",
    actionPrompt: "Expand the glass skin Reel script with on-screen text suggestions",
  },
  {
    id: "brand-caption-lumiere",
    kind: "caption",
    title: "Brand Caption · Lumière",
    badgeLabel: "IG Post",
    status: "draft",
    text: "“Obsessed with my new evening ritual ✨ @lumiere_beauty's overnight serum is doing something to my skin… tag a friend who needs this 🌙 #sponsored #LumiereGlow”",
    actionLabel: "Get 3 variations ↗",
    actionPrompt: "Write 3 variations of the Lumière caption: casual, luxury, educational",
  },
];
