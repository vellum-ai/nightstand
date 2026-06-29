import type { ToolDefinition } from "@vellumai/plugin-api";
import { loadState } from "../src/store";
import { backlogPurgeMessage } from "../src/guilt-engine";

const tool: ToolDefinition = {
  description:
    "Show the user's most neglected books ranked by how long they've been in the TBR pile. A 'rip through your backlog' mode that surfaces the top 3 most neglected books and asks which one they're committing to. Use when the user says 'what should I read next from my pile', 'help me pick from my backlog', 'my pile is too long', 'prioritize my TBR', or 'what's been sitting there the longest'.",
  input_schema: {
    type: "object",
    properties: {},
  },
  defaultRiskLevel: "low",
  execute: async (_input, ctx) => {
    try {
      const state = await loadState(ctx.workingDir);
      const now = Date.now();
      const entries = state.tbr
        .map((e) => ({
          title: e.title,
          daysInPile: Math.floor((now - e.addedAt) / (1000 * 60 * 60 * 24)),
        }))
        .sort((a, b) => b.daysInPile - a.daysInPile);

      return { content: backlogPurgeMessage(entries) };
    } catch (err) {
      return {
        content: `Failed to purge: ${err instanceof Error ? err.message : String(err)}`,
        isError: true,
      };
    }
  },
};

export default tool;
