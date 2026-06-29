import type { ToolDefinition } from "@vellumai/plugin-api";
import {
  loadState,
  saveState,
  generateId,
  type TbrEntry,
  type CompletedBook,
} from "../src/store";

interface GoodreadsItem {
  title: string;
  author: string;
  coverUrl?: string;
  isbn?: string;
  pageCount?: number;
  averageRating?: number;
  userRating?: number;
  readAt?: string;
  dateAdded?: string;
  shelves?: string;
  bookPublished?: number;
}

/**
 * Parse a Goodreads RSS feed into structured items.
 * The feed wraps most fields in custom <book_*> tags inside each <item>,
 * plus an HTML blob in <description> with author/rating/read-at/shelves.
 */
function parseRss(xml: string): GoodreadsItem[] {
  const items: GoodreadsItem[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match: RegExpExecArray | null;

  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];

    const title = extractTag(block, "title") ?? "Unknown";
    const author = extractTag(block, "book:author") ?? extractFromDescription(block, "author") ?? "Unknown";
    const coverUrl = extractTag(block, "book:small_image_url") ?? extractImgFromDescription(block);
    const isbn = extractTag(block, "book:isbn");
    const pageCount = parseInt(extractTag(block, "book:num_pages") ?? "0", 10) || undefined;
    const averageRating = parseFloat(extractTag(block, "book:average_rating") ?? "0") || undefined;
    const userRating = parseInt(extractFromDescription(block, "rating") ?? "0", 10) || undefined;
    const readAt = extractFromDescription(block, "read at") || undefined;
    const dateAdded = extractFromDescription(block, "date added") || extractTag(block, "pubDate") || undefined;
    const shelves = extractFromDescription(block, "shelves") ?? "";
    const bookPublished = parseInt(extractTag(block, "book:published") ?? "0", 10) || undefined;

    items.push({
      title: title.trim(),
      author: author.trim(),
      coverUrl,
      isbn,
      pageCount,
      averageRating,
      userRating,
      readAt,
      dateAdded,
      shelves: shelves.trim(),
      bookPublished,
    });
  }

  return items;
}

function extractTag(block: string, tag: string): string | undefined {
  const regex = new RegExp(`<${tag}>([^<]*)</${tag}>`, "i");
  const m = block.match(regex);
  return m ? m[1].trim() : undefined;
}

function extractFromDescription(block: string, field: string): string | undefined {
  // Fields are in CDATA as "field: value<br/>"
  const regex = new RegExp(`${field}:\\s*([^<\\n]+)`, "i");
  const m = block.match(regex);
  return m ? m[1].trim() : undefined;
}

function extractImgFromDescription(block: string): string | undefined {
  const m = block.match(/src="([^"]*gr-assets[^"]*)"/i);
  return m ? m[1] : undefined;
}

function parseDate(s: string | undefined): number | undefined {
  if (!s || s.trim() === "") return undefined;
  // Goodreads uses "2020/01/01" format
  const d = new Date(s.trim());
  return isNaN(d.getTime()) ? undefined : d.getTime();
}

const tool: ToolDefinition = {
  description:
    "Sync books from a Goodreads RSS feed. Pulls live data from the user's Goodreads shelves (read, to-read, currently-reading) and updates the local TBR pile and reading history. Use when the user says 'sync my Goodreads', 'pull my Goodreads shelves', 'import from Goodreads RSS', or 'update my books from Goodreads'. The user provides their Goodreads RSS URL (format: https://www.goodreads.com/review/list_rss/<USER_ID>?key=<KEY>&shelf=%23ALL%23).",
  input_schema: {
    type: "object",
    properties: {
      rssUrl: {
        type: "string",
        description:
          "The full Goodreads RSS feed URL. Find it at Goodreads > My Books > RSS (bottom of page). Format: https://www.goodreads.com/review/list_rss/<USER_ID>?key=<KEY>&shelf=%23ALL%23",
      },
      shelf: {
        type: "string",
        description:
          "Optional shelf filter: 'read', 'to-read', 'currently-reading', or '#ALL#' (default). Use #ALL# to sync everything.",
      },
    },
    required: ["rssUrl"],
  },
  defaultRiskLevel: "low",
  execute: async (input: { rssUrl: string; shelf?: string }, ctx) => {
    try {
      const url = input.shelf
        ? input.rssUrl.replace(/shelf=[^&]*/, `shelf=${encodeURIComponent(input.shelf)}`)
        : input.rssUrl;

      const res = await fetch(url);
      if (!res.ok) {
        return {
          content: `Goodreads RSS fetch failed: ${res.status} ${res.statusText}. Check that the RSS URL and key are valid.`,
          isError: true,
        };
      }

      const xml = await res.text();
      const items = parseRss(xml);

      if (items.length === 0) {
        return {
          content: "No books found in the RSS feed. Check the URL and shelf filter.",
        };
      }

      const state = await loadState(ctx.workingDir);
      let addedToTbr = 0;
      let addedToRead = 0;
      let skipped = 0;
      let updated = 0;

      for (const item of items) {
        const isRead = item.readAt && item.readAt.trim() !== "";
        const isToRead = item.shelves?.toLowerCase().includes("to-read") ?? false;

        if (isRead) {
          // Check for duplicates in completed
          const existingIdx = state.completed.findIndex(
            (c) => c.title.toLowerCase() === item.title.toLowerCase(),
          );

          const finishedAt = parseDate(item.readAt) ?? Date.now();
          const addedAt = parseDate(item.dateAdded) ?? finishedAt;

          if (existingIdx >= 0) {
            // Update existing entry with richer data
            const existing = state.completed[existingIdx];
            state.completed[existingIdx] = {
              ...existing,
              author: existing.author === "Unknown" ? item.author : existing.author,
              coverUrl: existing.coverUrl ?? item.coverUrl,
              rating: existing.rating || item.userRating || 0,
              pages: existing.pages ?? item.pageCount,
            };
            updated++;
          } else {
            state.completed.push({
              id: generateId(),
              title: item.title,
              author: item.author,
              coverUrl: item.coverUrl,
              rating: item.userRating ?? 0,
              finishedAt,
            } as CompletedBook);
            addedToRead++;
          }
        } else if (isToRead) {
          // Check for duplicates in TBR
          const existingIdx = state.tbr.findIndex(
            (e) => e.title.toLowerCase() === item.title.toLowerCase(),
          );

          const addedAt = parseDate(item.dateAdded) ?? Date.now();

          if (existingIdx >= 0) {
            // Update with richer data if missing
            const existing = state.tbr[existingIdx];
            state.tbr[existingIdx] = {
              ...existing,
              author: existing.author === "Unknown" ? item.author : existing.author,
              coverUrl: existing.coverUrl ?? item.coverUrl,
              isbn: existing.isbn ?? item.isbn,
            };
            updated++;
          } else {
            state.tbr.push({
              id: generateId(),
              title: item.title,
              author: item.author,
              coverUrl: item.coverUrl,
              isbn: item.isbn,
              source: "goodreads sync",
              addedAt,
            } as TbrEntry);
            addedToTbr++;
          }
        } else {
          skipped++;
        }
      }

      await saveState(ctx.workingDir, state);

      return {
        content: [
          `Goodreads sync complete. Processed ${items.length} books from the feed.`,
          ``,
          `Added to reading history: ${addedToRead}`,
          `Added to TBR pile: ${addedToTbr}`,
          `Updated with richer data: ${updated}`,
          `Skipped (no shelf match): ${skipped}`,
          ``,
          `Your pile now has ${state.tbr.length} books. You've finished ${state.completed.length} total.`,
        ].join("\n"),
      };
    } catch (err) {
      return {
        content: `Goodreads sync failed: ${err instanceof Error ? err.message : String(err)}`,
        isError: true,
      };
    }
  },
};

export default tool;
