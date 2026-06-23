import { ChatGoogle } from "@langchain/google/node";
import { getLlmEnv } from "@/lib/env";

export const llm = new ChatGoogle({
  apiKey: getLlmEnv().GEMINI_API_KEY,
  model: "gemini-2.5-flash",
  temperature: 0.3,
});
