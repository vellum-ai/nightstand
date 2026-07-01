import type { ToolContext, ToolExecutionResult } from "@vellumai/plugin-api";
import { loadState } from "../../../src/store";
import { guiltMessage, guiltLevel } from "../../../src/guilt-engine";

export async function run(
  _input: Record<string, unknown>,
  ctx: ToolContext,
): Promise<ToolExecutionResult> {
  try {
    const state = await loadState(ctx.workingDir);
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
}
