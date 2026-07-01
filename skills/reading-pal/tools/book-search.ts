import type { ToolContext, ToolExecutionResult } from "@vellumai/plugin-api";
import { searchBooks } from "../../../src/openlibrary-client";

export async function run(
  rawInput: Record<string, unknown>,
  _ctx: ToolContext,
): Promise<ToolExecutionResult> {
  const input = rawInput as { query: string; limit?: number };
  try {
    const results = await searchBooks(input.query, input.limit ?? 5);
    if (results.length === 0) {
      return { content: `No books found for "${input.query}".` };
    }
    const formatted = results.map(
      (b, i) =>
        `${i + 1}. "${b.title}" by ${b.author}${b.publishYear ? ` (${b.publishYear})` : ""}${b.isbn ? ` - ISBN: ${b.isbn}` : ""}`,
    );
    return { content: `Found ${results.length} books:\n\n${formatted.join("\n")}` };
  } catch (err) {
    return {
      content: `Search failed: ${err instanceof Error ? err.message : String(err)}`,
      isError: true,
    };
  }
}
