import { z } from "zod";
import { llm } from "@/lib/llm";
import { logger } from "@/lib/logger";
import type { AgentState } from "@/agents/state";

const intentSchema = z.enum([
  "trends",
  "content",
  "calendar_read",
  "calendar_add",
  "dms",
  "contract",
  "smalltalk",
]);

const ORCHESTRATOR_SYSTEM_PROMPT = `You are an intent classifier for Sofia's personal assistant.
Read the user's message and respond with exactly one of the following words - nothing else, no punctuation, no explanation:

trends
content
calendar_read
calendar_add
dms
contract
smalltalk

- trends: asking about trending content, viral videos/posts, what's popular right now
- content: asking for a script, caption, hashtags, or a content/post idea
- calendar_read: asking what's on the calendar or schedule
- calendar_add: asking to add or schedule a new event
- dms: asking about Instagram DMs, brand messages, or collabs
- contract: asking to draft, review, or send a contract
- smalltalk: anything else, including greetings or unclear requests

Respond with only the single matching word.`;

export async function orchestrator(state: AgentState): Promise<Partial<AgentState>> {
  try {
    const result = await llm.invoke([
      { role: "system", content: ORCHESTRATOR_SYSTEM_PROMPT },
      { role: "user", content: state.input },
    ]);
    const raw = typeof result.content === "string" ? result.content : String(result.content);
    const parsed = intentSchema.safeParse(raw.trim().toLowerCase());
    return { intent: parsed.success ? parsed.data : "smalltalk" };
  } catch (error) {
    logger.error("agents/orchestrator", "Intent classification failed", error);
    return { intent: "smalltalk" };
  }
}
