import type { AgentState } from "@/agents/state";

export async function contentAgent(state: AgentState): Promise<Partial<AgentState>> {
  return { response: "[content] stub response" };
}
