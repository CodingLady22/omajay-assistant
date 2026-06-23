import { Annotation } from "@langchain/langgraph";

export const AgentState = Annotation.Root({
  input: Annotation<string>,
  channel: Annotation<"whatsapp" | "web">,
  intent: Annotation<string>,
  response: Annotation<string>,
  runId: Annotation<string>,
  approval: Annotation<boolean>,
});

export type AgentState = typeof AgentState.State;
