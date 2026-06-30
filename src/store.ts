/**
 * Local persistence for Reading Pal.
 * Stores TBR pile, reading history, streaks, and followed authors
 * in a JSON file inside the plugin data directory.
 *
 * The plugin data directory is <workspaceDir>/plugins-data/reading-pal/.
 * InitContext provides pluginStorageDir to hooks, but ToolContext does not
 * expose it, so tools derive the path from ctx.workingDir.
 */

import { promises as fs } from "node:fs";
import * as path from "node:path";

export interface TbrEntry {
  id: string;
  title: string;
  author: string;
  coverUrl?: string;
  isbn?: string;
  olid?: string;
  source: string;
  addedAt: number;
}

export interface CompletedBook {
  id: string;
  title: string;
  author: string;
  coverUrl?: string;
  rating: number;
  notes?: string;
  finishedAt: number;
  pages?: number;
}

export interface ReadingState {
  tbr: TbrEntry[];
  completed: CompletedBook[];
  streak: {
    current: number;
    longest: number;
    lastReadDate: string | null;
  };
  followedAuthors: string[];
}

const STATE_FILE = "reading-pal-state.json";
const PLUGIN_NAME = "reading-pal";

function defaultState(): ReadingState {
  return {
    tbr: [],
    completed: [],
    streak: {
      current: 0,
      longest: 0,
      lastReadDate: null,
    },
    followedAuthors: [],
  };
}

/**
 * Resolve the plugin storage directory from the tool's workingDir.
 * Tools don't receive pluginStorageDir on their context (only hooks do),
 * so we derive it: <workspaceDir>/plugins-data/reading-pal/
 */
function resolveStorageDir(workingDir: string): string {
  return path.join(workingDir, "plugins-data", PLUGIN_NAME);
}

export async function loadState(workingDir: string): Promise<ReadingState> {
  const storageDir = resolveStorageDir(workingDir);
  const filePath = path.join(storageDir, STATE_FILE);
  try {
    const raw = await fs.readFile(filePath, "utf8");
    const parsed = JSON.parse(raw);
    return { ...defaultState(), ...parsed };
  } catch {
    return defaultState();
  }
}

export async function saveState(
  workingDir: string,
  state: ReadingState,
): Promise<void> {
  const storageDir = resolveStorageDir(workingDir);
  await fs.mkdir(storageDir, { recursive: true });
  const filePath = path.join(storageDir, STATE_FILE);
  await fs.writeFile(filePath, JSON.stringify(state, null, 2), "utf8");
}

export function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export function daysBetween(a: string, b: string): number {
  const ms = Math.abs(new Date(b).getTime() - new Date(a).getTime());
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

/**
 * Update the streak when a book is completed.
 * If the last read was yesterday, increment. If today, no change.
 * If more than 1 day gap, reset to 1.
 */
export function updateStreak(
  streak: ReadingState["streak"],
): ReadingState["streak"] {
  const today = todayStr();
  if (streak.lastReadDate === today) {
    return streak;
  }
  if (streak.lastReadDate) {
    const gap = daysBetween(streak.lastReadDate, today);
    if (gap === 1) {
      const newCurrent = streak.current + 1;
      return {
        current: newCurrent,
        longest: Math.max(streak.longest, newCurrent),
        lastReadDate: today,
      };
    }
  }
  return {
    current: 1,
    longest: Math.max(streak.longest, 1),
    lastReadDate: today,
  };
}

export function generateId(): string {
  return `bk_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
