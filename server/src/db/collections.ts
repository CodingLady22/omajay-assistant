import { getDb } from "@/db/client";
import type {
  AgentLog,
  AgentRun,
  Briefing,
  ContractDoc,
  Dm,
  DocumentChunk,
  EventDoc,
  Profile,
  ScriptDoc,
  Trend,
} from "@/types";

export const collections = {
  profile: () => getDb().collection<Profile>("profile"),
  trends: () => getDb().collection<Trend>("trends"),
  scripts: () => getDb().collection<ScriptDoc>("scripts"),
  dms: () => getDb().collection<Dm>("dms"),
  events: () => getDb().collection<EventDoc>("events"),
  documents: () => getDb().collection<DocumentChunk>("documents"),
  contracts: () => getDb().collection<ContractDoc>("contracts"),
  briefings: () => getDb().collection<Briefing>("briefings"),
  agentRuns: () => getDb().collection<AgentRun>("agent_runs"),
  agentLogs: () => getDb().collection<AgentLog>("agent_logs"),
};
