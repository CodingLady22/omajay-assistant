import type { AgentState } from "@/agents/state";

export async function calendarAgent(state: AgentState): Promise<Partial<AgentState>> {
  return { response: "[calendar] stub response" };
}
