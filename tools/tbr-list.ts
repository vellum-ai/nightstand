import type { ToolDefinition } from "@vellumai/plugin-api";
import { loadState } from "../src/store";
import { guiltMessage, guiltLevel } from "../src/guilt-engine";

const tool: ToolDefinition = {
  description:
    "List the user's TBR (to-be-read) pile with guilt ratings showing how long each book has been waiting. Use when the user asks 'what's in my pile', 'show me my TBR', 'what should I read', or 'how many books do I have unread'. Sorted by how long each book has been sitting there (oldest first, most neglected first).",
  input_schema: {
    type: "object",
    properties: {},
  },
  defaultRiskLevel: "low",
  execute: async (_input, ctx) => {
    try {
      const state = await loadState(ctx.pluginStorageDir);
      if (state.tbr.length === 0) {
        return {
          content:
            "Your TBR pile is empty. Either you've read everything (impressive) or you haven't added anything yet (concerning). Try adding a book with 'add [title] to my pile'.",
        };
      }

      const now = Date.now();
      const entries = state.tbr
        .map((e) => ({
          ...e,
          daysInPile: Math.floor((now - e.addedAt) / (1000 * 60 * 60 * 24)),
        }))
        .sort((a, b) => b.daysInPile - a.daysInPile);

      const lines = entries.map((e) => {
        const level = guiltLevel(e.daysInPile);
        const guilt = guiltMessage(e.title, e.daysInPile);
        return `[${level.toUpperCase()}] ${e.title} by ${e.author}\n  ${guilt}`;
      });

      return {
        content: `Your TBR pile has ${state.tbr.length} book${state.tbr.length === 1 ? "" : "s"}:\n\n${lines.join("\n\n")}`,
      };
    } catch (err) {
      return {
        content: `Failed to list TBR: ${err instanceof Error ? err.message : String(err)}`,
        isError: true,
      };
    }
  },
};

export default tool;
