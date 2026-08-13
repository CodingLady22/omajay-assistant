import { z } from "zod";
import { DEFAULT_TOPIC } from "@/agents/trends-agent";
import { collections } from "@/db/collections";
import { getProfile } from "@/db/profile";
import { llm } from "@/lib/llm";
import { logger } from "@/lib/logger";
import { extractJson } from "@/lib/utils";
import type { AgentState } from "@/agents/state";
import type { CaptionScriptDoc, Profile, ReelScriptDoc } from "@/types";

const SCRIPT_TEMPERATURE = 0.7;

const kindSchema = z.enum(["reel", "caption"]);
type ScriptKind = z.infer<typeof kindSchema>;

const KIND_CLASSIFICATION_PROMPT = `You decide what kind of content a makeup/beauty content creator's assistant should write for her request.
Respond with exactly one word:
reel - she wants a Reel/video script, a hook, or a video idea
caption - she wants a caption, post copy, or text for a specific post/brand deal
If it's ambiguous, respond with reel.
Respond with only the single matching word - no punctuation, no explanation.`;

async function classifyKind(message: string): Promise<ScriptKind> {
  try {
    const result = await llm.invoke([
      { role: "system", content: KIND_CLASSIFICATION_PROMPT },
      { role: "user", content: message },
    ]);
    const raw = typeof result.content === "string" ? result.content : String(result.content);
    const parsed = kindSchema.safeParse(raw.trim().toLowerCase());
    return parsed.success ? parsed.data : "reel";
  } catch (error) {
    logger.error("agents/content-agent", "Kind classification failed, defaulting to reel", error);
    return "reel";
  }
}

const reelGenerationSchema = z.object({
  title: z.string(),
  hook: z.string(),
  body: z.string(),
  cta: z.string(),
  hashtags: z.array(z.string()),
});

const captionGenerationSchema = z.object({
  title: z.string(),
  variants: z.array(z.string()).min(1),
  hashtags: z.array(z.string()),
});

function buildGenerationPrompt(kind: ScriptKind, message: string, profile: Profile | null): string {
  const niche = profile?.niche ?? DEFAULT_TOPIC;
  const voice = profile?.style_notes ? ` Her voice/style: ${profile.style_notes}.` : "";

  if (kind === "reel") {
    return `You write short-form video scripts for a ${niche} content creator.${voice}
Her request: "${message}"

Write a Reel script with a punchy hook (0-3s), a short body describing the shots/steps, and a call to action. Also suggest a short title for this script and 5-8 relevant hashtags (no # symbol).

Respond with ONLY a JSON object, no markdown, no explanation, in this exact shape:
{"title": "...", "hook": "...", "body": "...", "cta": "...", "hashtags": ["...", "..."]}`;
  }

  return `You write Instagram captions for a ${niche} content creator.${voice}
Her request: "${message}"

Write 3 caption variations for this post. Also suggest a short title describing what the caption is for and 5-8 relevant hashtags (no # symbol).

Respond with ONLY a JSON object, no markdown, no explanation, in this exact shape:
{"title": "...", "variants": ["...", "...", "..."], "hashtags": ["...", "..."]}`;
}

type GeneratedReel = Pick<ReelScriptDoc, "title" | "hook" | "body" | "cta" | "hashtags">;
type GeneratedCaption = Pick<CaptionScriptDoc, "title" | "variants" | "hashtags">;

async function generateReel(message: string, profile: Profile | null): Promise<GeneratedReel> {
  const prompt = buildGenerationPrompt("reel", message, profile);
  const result = await llm.invoke([{ role: "user", content: prompt }], { temperature: SCRIPT_TEMPERATURE });
  const raw = typeof result.content === "string" ? result.content : String(result.content);
  return reelGenerationSchema.parse(JSON.parse(extractJson(raw)));
}

async function generateCaption(message: string, profile: Profile | null): Promise<GeneratedCaption> {
  const prompt = buildGenerationPrompt("caption", message, profile);
  const result = await llm.invoke([{ role: "user", content: prompt }], { temperature: SCRIPT_TEMPERATURE });
  const raw = typeof result.content === "string" ? result.content : String(result.content);
  return captionGenerationSchema.parse(JSON.parse(extractJson(raw)));
}

function buildConfirmation(kind: ScriptKind, title: string): string {
  const label = kind === "reel" ? "Reel script" : "caption";
  return `Here's your ${label}: "${title}" — saved to your scripts library. ✨`;
}

const SMALLTALK_SYSTEM_PROMPT = `You are Sofia's warm, concise AI assistant for her makeup/beauty content business.
Reply in 1-2 short sentences. If her message is a greeting or casual chat, reply warmly.
If it's unclear what she's asking for, gently ask her to clarify and mention you can help with trends, scripts, her calendar, brand DMs, or contracts.`;

async function smalltalkReply(message: string): Promise<string> {
  try {
    const result = await llm.invoke([
      { role: "system", content: SMALLTALK_SYSTEM_PROMPT },
      { role: "user", content: message },
    ]);
    const raw = typeof result.content === "string" ? result.content : String(result.content);
    return raw.trim();
  } catch (error) {
    logger.error("agents/content-agent", "Smalltalk reply failed", error);
    return "Hi! I can help with trends, scripts, your calendar, brand DMs, or contracts — what do you need?";
  }
}

export async function contentAgent(state: AgentState): Promise<Partial<AgentState>> {
  // "smalltalk" also routes here (see graph.ts) — only a genuine "content" intent
  // should attempt script generation, otherwise a greeting like "good morning"
  // would be sent through the generation prompt as if it were a content request.
  if (state.intent !== "content") {
    return { response: await smalltalkReply(state.input) };
  }

  try {
    const profile = await getProfile();
    const kind = await classifyKind(state.input);
    const now = new Date();

    if (kind === "reel") {
      const generated = await generateReel(state.input, profile);
      await collections.scripts().insertOne({
        kind: "reel",
        title: generated.title,
        hook: generated.hook,
        body: generated.body,
        cta: generated.cta,
        hashtags: generated.hashtags,
        status: "draft",
        created_at: now,
      });
      return { response: buildConfirmation("reel", generated.title) };
    }

    const generated = await generateCaption(state.input, profile);
    await collections.scripts().insertOne({
      kind: "caption",
      title: generated.title,
      variants: generated.variants,
      hashtags: generated.hashtags,
      status: "draft",
      created_at: now,
    });
    return { response: buildConfirmation("caption", generated.title) };
  } catch (error) {
    logger.error("agents/content-agent", "Failed to generate script", error);
    return { response: "Couldn't write that script right now — try again in a moment." };
  }
}
