import type { AgentState } from "@/agents/state";

export async function contractsAgent(state: AgentState): Promise<Partial<AgentState>> {
  return { response: "[contracts] stub response" };
}
