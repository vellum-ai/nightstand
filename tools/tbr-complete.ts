import type { ToolDefinition } from "@vellumai/plugin-api";
import {
  loadState,
  saveState,
  updateStreak,
  generateId,
  type CompletedBook,
} from "../src/store";

const tool: ToolDefinition = {
  description:
    "Mark a book as read/completed. Removes it from the TBR pile, logs it in reading history with rating and optional notes, and updates the reading streak. Use when the user says 'I finished [book]', 'I just read [book]', 'mark [book] as read', or 'I'm done with [book]'.",
  input_schema: {
    type: "object",
    properties: {
      title: {
        type: "string",
        description: "The title of the book you finished.",
      },
      rating: {
        type: "number",
        description: "Rating from 1 to 5 (optional).",
      },
      notes: {
        type: "string",
        description: "Optional thoughts or notes about the book.",
      },
    },
    required: ["title"],
  },
  defaultRiskLevel: "low",
  execute: async (
    input: { title: string; rating?: number; notes?: string },
    ctx,
  ) => {
    try {
      const state = await loadState(ctx.pluginStorageDir);

      // Find the book in TBR (fuzzy match on title)
      const tbrIdx = state.tbr.findIndex(
        (e) => e.title.toLowerCase().includes(input.title.toLowerCase()),
      );

      let completed: CompletedBook;
      let removedFromTbr = false;

      if (tbrIdx >= 0) {
        const tbrEntry = state.tbr[tbrIdx];
        completed = {
          id: generateId(),
          title: tbrEntry.title,
          author: tbrEntry.author,
          coverUrl: tbrEntry.coverUrl,
          rating: input.rating ?? 0,
          notes: input.notes,
          finishedAt: Date.now(),
        };
        state.tbr.splice(tbrIdx, 1);
        removedFromTbr = true;
      } else {
        // Not in TBR, just log it
        completed = {
          id: generateId(),
          title: input.title,
          author: "Unknown",
          rating: input.rating ?? 0,
          notes: input.notes,
          finishedAt: Date.now(),
        };
      }

      state.completed.push(completed);
      state.streak = updateStreak(state.streak);
      await saveState(ctx.pluginStorageDir, state);

      const parts = [
        `Marked "${completed.title}" as read.`,
        removedFromTbr
          ? "Removed from your TBR pile."
          : "(This book wasn't in your TBR, but I've logged it anyway.)",
        input.rating
          ? `Rating: ${"★".repeat(input.rating)}${"☆".repeat(5 - input.rating)}`
          : "",
        state.streak.current > 1
          ? `You're on a ${state.streak.current}-book streak!`
          : "",
        `Books finished: ${state.completed.length}. TBR remaining: ${state.tbr.length}.`,
      ].filter(Boolean);

      return { content: parts.join(" ") };
    } catch (err) {
      return {
        content: `Failed to mark book as read: ${err instanceof Error ? err.message : String(err)}`,
        isError: true,
      };
    }
  },
};

export default tool;
