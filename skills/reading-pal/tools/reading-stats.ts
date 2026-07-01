import type { ToolContext, ToolExecutionResult } from "@vellumai/plugin-api";
import { loadState } from "../../../src/store";

export async function run(
  _input: Record<string, unknown>,
  ctx: ToolContext,
): Promise<ToolExecutionResult> {
  try {
    const state = await loadState(ctx.workingDir);
    const year = new Date().getFullYear();
    const booksThisYear = state.completed.filter(
      (b) => new Date(b.finishedAt).getFullYear() === year,
    );
    const ratedBooks = state.completed.filter((b) => b.rating > 0);
    const avgRating =
      ratedBooks.length > 0
        ? (ratedBooks.reduce((sum, b) => sum + b.rating, 0) / ratedBooks.length).toFixed(1)
        : "N/A";

    // Top authors
    const authorCounts: Record<string, number> = {};
    for (const b of state.completed) {
      authorCounts[b.author] = (authorCounts[b.author] || 0) + 1;
    }
    const topAuthor = Object.entries(authorCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name, count]) => `${name} (${count})`)
      .join(", ");

    return {
      content: [
        `Reading Stats for ${year}`,
        ``,
        `Books finished this year: ${booksThisYear.length}`,
        `Total books finished: ${state.completed.length}`,
        `Average rating: ${avgRating}/5`,
        `Current streak: ${state.streak.current} book${state.streak.current === 1 ? "" : "s"}`,
        `Longest streak: ${state.streak.longest} book${state.streak.longest === 1 ? "" : "s"}`,
        `TBR pile: ${state.tbr.length} book${state.tbr.length === 1 ? "" : "s"}`,
        topAuthor ? `Most-read authors: ${topAuthor}` : "",
      ]
        .filter(Boolean)
        .join("\n"),
    };
  } catch (err) {
    return {
      content: `Failed to get stats: ${err instanceof Error ? err.message : String(err)}`,
      isError: true,
    };
  }
}
