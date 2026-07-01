import type { ToolContext, ToolExecutionResult } from "@vellumai/plugin-api";
import { loadState, saveState, generateId, type TbrEntry } from "../../../src/store";
import { searchBooks } from "../../../src/openlibrary-client";

export async function run(
  rawInput: Record<string, unknown>,
  ctx: ToolContext,
): Promise<ToolExecutionResult> {
  const input = rawInput as { title: string; author?: string; source?: string };
  try {
    const state = await loadState(ctx.workingDir);

    // Try to enrich with Open Library data
    const searchQuery = input.author
      ? `${input.title} ${input.author}`
      : input.title;
    const results = await searchBooks(searchQuery, 1);
    const match = results[0];

    const entry: TbrEntry = {
      id: generateId(),
      title: match?.title ?? input.title,
      author: match?.author ?? input.author ?? "Unknown",
      coverUrl: match?.coverUrl,
      isbn: match?.isbn,
      olid: match?.olid,
      source: input.source ?? "manual",
      addedAt: Date.now(),
    };

    // Check for duplicates
    const existing = state.tbr.find(
      (e) =>
        e.title.toLowerCase() === entry.title.toLowerCase() &&
        e.author.toLowerCase() === entry.author.toLowerCase(),
    );
    if (existing) {
      return {
        content: `"${entry.title}" by ${entry.author} is already in your pile. It's been sitting there since ${new Date(existing.addedAt).toLocaleDateString()}.`,
      };
    }

    state.tbr.push(entry);
    await saveState(ctx.workingDir, state);

    return {
      content: `Added "${entry.title}" by ${entry.author} to your TBR pile. ${entry.source !== "manual" ? `Source: ${entry.source}. ` : ""}Your pile now has ${state.tbr.length} book${state.tbr.length === 1 ? "" : "s"}.`,
    };
  } catch (err) {
    return {
      content: `Failed to add book: ${err instanceof Error ? err.message : String(err)}`,
      isError: true,
    };
  }
}
