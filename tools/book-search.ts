import type { ToolDefinition } from "@vellumai/plugin-api";
import { searchBooks } from "../src/openlibrary-client";

const tool: ToolDefinition = {
  description:
    "Search for books by title, author, or keyword. Returns matches with title, author, cover, ISBN, and publish year. Use this when the user wants to find a book, look up what something is about, or before adding to their TBR pile.",
  input_schema: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "Book title, author name, or keyword to search for.",
      },
      limit: {
        type: "number",
        description: "Max number of results to return (default 5).",
      },
    },
    required: ["query"],
  },
  defaultRiskLevel: "low",
  execute: async (input: { query: string; limit?: number }) => {
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
  },
};

export default tool;
