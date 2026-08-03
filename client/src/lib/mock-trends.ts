export type TrendPlatform = "instagram" | "youtube";

export type Trend = {
  id: string;
  platform: TrendPlatform;
  formatLabel: string;
  title: string;
  metric: string;
  emoji: string;
  thumbnailToken: string;
  prompt: string;
};

export const MOCK_TRENDS: Trend[] = [
  {
    id: "glass-skin-tutorial",
    platform: "instagram",
    formatLabel: "Instagram · Reel",
    title: "Glass skin tutorial",
    metric: "↑ 2.4M views · trending",
    emoji: "💎",
    thumbnailToken: "bg-pink-light",
    prompt: "Tell me more about the glass skin trend and content ideas around it",
  },
  {
    id: "mob-wife-glam",
    platform: "instagram",
    formatLabel: "Instagram · Carousel",
    title: "Mob wife glam",
    metric: "↑ 3.7M impressions",
    emoji: "🍯",
    thumbnailToken: "bg-success-bg",
    prompt: "Tie my makeup content to the mob wife aesthetic",
  },
  {
    id: "bold-graphic-eye",
    platform: "instagram",
    formatLabel: "Instagram · Carousel",
    title: "Bold graphic eye",
    metric: "↑ 1.9M saves",
    emoji: "👁️",
    thumbnailToken: "bg-info-bg",
    prompt: "Create an Instagram carousel for a bold graphic eye look",
  },
  {
    id: "grwm-life-update",
    platform: "youtube",
    formatLabel: "YouTube · Long-form",
    title: "GRWM + life update",
    metric: "↑ 890K avg views",
    emoji: "🎬",
    thumbnailToken: "bg-yt-bg",
    prompt: "Give me a GRWM YouTube video script outline",
  },
  {
    id: "everyday-glam-routine",
    platform: "youtube",
    formatLabel: "YouTube · Tutorial",
    title: "Everyday glam routine",
    metric: "↑ 640K views · trending",
    emoji: "✨",
    thumbnailToken: "bg-coral-light",
    prompt: "Write a YouTube tutorial script for an everyday glam routine",
  },
  {
    id: "repurchase-or-no",
    platform: "youtube",
    formatLabel: "YouTube · Long-form",
    title: "Full face: repurchase or no?",
    metric: "↑ 1.1M views",
    emoji: "🛍️",
    thumbnailToken: "bg-ig-bg",
    prompt: "Give me a YouTube video outline for a repurchase-or-no makeup review",
  },
];
