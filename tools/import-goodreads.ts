import type { ToolDefinition } from "@vellumai/plugin-api";
import { promises as fs } from "node:fs";
import {
  loadState,
  saveState,
  generateId,
  type TbrEntry,
  type CompletedBook,
} from "../src/store";

const tool: ToolDefinition = {
  description:
    "Import books from a Goodreads CSV export. Reads the exported file and backfills the TBR pile and reading history with titles, authors, ratings, and dates. Use when the user says 'import my Goodreads', 'I exported my Goodreads library', 'migrate from Goodreads', or 'load my reading history from CSV'. The user should export from Goodreads via My Books > Import/Export > Export Library.",
  input_schema: {
    type: "object",
    properties: {
      csvPath: {
        type: "string",
        description: "Absolute path to the exported Goodreads CSV file.",
      },
    },
    required: ["csvPath"],
  },
  defaultRiskLevel: "low",
  execute: async (input: { csvPath: string }, ctx) => {
    try {
      const raw = await fs.readFile(input.csvPath, "utf8");

      // Parse CSV - Goodreads format has specific columns we care about:
      // Title, Author, ISBN, My Rating, Date Read, Bookshelves, Date Added
      const lines = raw.split("\n").filter((l) => l.trim());
      if (lines.length < 2) {
        return { content: "CSV file appears to be empty or has no data rows." };
      }

      const headers = parseCsvLine(lines[0]);
      const titleIdx = headers.findIndex((h) => h.toLowerCase().includes("title"));
      const authorIdx = headers.findIndex((h) => h.toLowerCase().includes("author"));
      const ratingIdx = headers.findIndex((h) => h.toLowerCase().includes("my rating"));
      const dateReadIdx = headers.findIndex((h) => h.toLowerCase().includes("date read"));
      const shelvesIdx = headers.findIndex((h) => h.toLowerCase().includes("bookshelves"));
      const dateAddedIdx = headers.findIndex((h) => h.toLowerCase().includes("date added"));

      if (titleIdx < 0) {
        return { content: "Could not find a Title column in the CSV. Make sure this is a Goodreads export." };
      }

      const state = await loadState(ctx.workingDir);
      let importedTbr = 0;
      let importedRead = 0;
      let skipped = 0;

      for (let i = 1; i < lines.length; i++) {
        const cols = parseCsvLine(lines[i]);
        const title = cols[titleIdx]?.trim();
        if (!title) {
          skipped++;
          continue;
        }
        const author = authorIdx >= 0 ? cols[authorIdx]?.trim() ?? "Unknown" : "Unknown";
        const dateRead = dateReadIdx >= 0 ? cols[dateReadIdx]?.trim() : "";
        const shelves = shelvesIdx >= 0 ? cols[shelvesIdx]?.trim() ?? "" : "";
        const rating = ratingIdx >= 0 ? parseInt(cols[ratingIdx]?.trim() ?? "0", 10) || 0 : 0;
        const dateAdded = dateAddedIdx >= 0 ? cols[dateAddedIdx]?.trim() : "";

        // If it has a "read" date, it goes to completed
        if (dateRead) {
          const finishedAt = new Date(dateRead).getTime() || Date.now();
          // Check for duplicate
          const exists = state.completed.find(
            (c) => c.title.toLowerCase() === title.toLowerCase(),
          );
          if (exists) {
            skipped++;
            continue;
          }
          state.completed.push({
            id: generateId(),
            title,
            author,
            rating,
            finishedAt,
          } as CompletedBook);
          importedRead++;
        } else if (shelves.toLowerCase().includes("to-read") || shelves.toLowerCase().includes("to_read")) {
          const exists = state.tbr.find(
            (e) => e.title.toLowerCase() === title.toLowerCase(),
          );
          if (exists) {
            skipped++;
            continue;
          }
          state.tbr.push({
            id: generateId(),
            title,
            author,
            source: "goodreads import",
            addedAt: dateAdded ? new Date(dateAdded).getTime() || Date.now() : Date.now(),
          } as TbrEntry);
          importedTbr++;
        } else {
          skipped++;
        }
      }

      await saveState(ctx.workingDir, state);

      return {
        content: `Goodreads import complete.\n- ${importedRead} books added to reading history\n- ${importedTbr} books added to TBR pile\n- ${skipped} entries skipped (duplicates or no shelf info)\n\nYour pile now has ${state.tbr.length} books. You've finished ${state.completed.length} total.`,
      };
    } catch (err) {
      return {
        content: `Import failed: ${err instanceof Error ? err.message : String(err)}`,
        isError: true,
      };
    }
  },
};

// Simple CSV parser that handles quoted fields with commas inside
function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

export default tool;
