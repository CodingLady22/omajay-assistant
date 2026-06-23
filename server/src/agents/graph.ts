import { StateGraph, START, END } from "@langchain/langgraph";
import { AgentState } from "@/agents/state";
import { orchestrator } from "@/agents/orchestrator";
import { trendsAgent } from "@/agents/trends-agent";
import { contentAgent } from "@/agents/content-agent";
import { calendarAgent } from "@/agents/calendar-agent";
import { dmsAgent } from "@/agents/dms-agent";
import { contractsAgent } from "@/agents/contracts-agent";

function routeByIntent(state: AgentState): string {
  return state.intent;
}

const graph = new StateGraph(AgentState)
  .addNode("orchestrator", orchestrator)
  .addNode("trends", trendsAgent)
  .addNode("content", contentAgent)
  .addNode("calendar", calendarAgent)
  .addNode("dms", dmsAgent)
  .addNode("contracts", contractsAgent)
  .addEdge(START, "orchestrator")
  .addConditionalEdges("orchestrator", routeByIntent, {
    trends: "trends",
    content: "content",
    calendar_read: "calendar",
    calendar_add: "calendar",
    dms: "dms",
    contract: "contracts",
    smalltalk: "content",
  })
  .addEdge("trends", END)
  .addEdge("content", END)
  .addEdge("calendar", END)
  .addEdge("dms", END)
  .addEdge("contracts", END);

export const app = graph.compile();
