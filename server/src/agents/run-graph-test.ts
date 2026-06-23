import { randomUUID } from "node:crypto";
import { app } from "@/agents/graph";
import { logger } from "@/lib/logger";

const SAMPLE_INPUTS = [
  "what's trending this week?",
  "write me a Reel script about glass skin",
  "what's on my calendar today?",
  "add a shoot on Monday at 10am in Milan",
  "any brand DMs I should look at?",
  "draft a contract for the Velour summer deal",
  "good morning!",
];

async function main(): Promise<void> {
  for (const input of SAMPLE_INPUTS) {
    const runId = randomUUID();
    const result = await app.invoke({ input, channel: "web", runId });
    logger.info("agents/run-graph-test", `"${input}" -> intent=${result.intent}`, {
      runId,
      response: result.response,
    });
  }
}

main().catch((error) => {
  logger.error("agents/run-graph-test", "Graph test run failed", error);
  process.exitCode = 1;
});
