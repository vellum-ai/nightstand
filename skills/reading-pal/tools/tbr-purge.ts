import type { ToolContext, ToolExecutionResult } from "@vellumai/plugin-api";
import { loadState } from "../../../src/store";
import { backlogPurgeMessage } from "../../../src/guilt-engine";

export async function run(
  _input: Record<string, unknown>,
  ctx: ToolContext,
): Promise<ToolExecutionResult> {
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
}
