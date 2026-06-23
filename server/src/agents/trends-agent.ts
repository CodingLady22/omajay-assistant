import type { AgentState } from "@/agents/state";

export async function trendsAgent(state: AgentState): Promise<Partial<AgentState>> {
  return { response: "[trends] stub response" };
}
