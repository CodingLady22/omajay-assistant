import type { AgentState } from "@/agents/state";

export async function dmsAgent(state: AgentState): Promise<Partial<AgentState>> {
  return { response: "[dms] stub response" };
}
