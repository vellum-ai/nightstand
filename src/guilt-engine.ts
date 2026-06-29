/**
 * Guilt Engine.
 * The personality layer. Generates guilt-trip messages based on
 * how long a book has been sitting in the TBR pile.
 * Not mean, just... disappointed.
 */

export function guiltLevel(daysInPile: number): "fresh" | "warm" | "toasty" | "burnt" | "ash" {
  if (daysInPile < 30) return "fresh";
  if (daysInPile < 90) return "warm";
  if (daysInPile < 180) return "toasty";
  if (daysInPile < 365) return "burnt";
  return "ash";
}

export function guiltMessage(title: string, daysInPile: number): string {
  const level = guiltLevel(daysInPile);
  switch (level) {
    case "fresh":
      return `"${title}" is fresh in your pile. ${daysInPile} days. enjoy the honeymoon.`;
    case "warm":
      return `"${title}" has been sitting for ${daysInPile} days. it's on the shelf. waiting.`;
    case "toasty":
      return `"${title}" has been in your pile for ${daysInPile} days. it's starting to feel personal.`;
    case "burnt":
      return `"${title}" - ${daysInPile} days. this book came out, got reviewed, won awards, and you still haven't opened it.`;
    case "ash":
      return `"${title}" - ${Math.floor(daysInPile / 365)} year(s). you owe this book an apology.`;
  }
}

export function backlogPurgeMessage(entries: { title: string; daysInPile: number }[]): string {
  if (entries.length === 0) {
    return "your TBR is empty. either you've read everything (impressive) or you haven't added anything (concerning).";
  }
  const sorted = [...entries].sort((a, b) => b.daysInPile - a.daysInPile);
  const top3 = sorted.slice(0, 3);
  const lines = top3.map(
    (e, i) => `${i + 1}. ${guiltMessage(e.title, e.daysInPile)}`,
  );
  return [
    "here are your most neglected books, ranked by how long they've been gathering dust:",
    "",
    ...lines,
    "",
    "pick one. commit to it this week. the others can wait their turn.",
  ].join("\n");
}
