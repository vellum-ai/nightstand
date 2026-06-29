# Nightstand 📚

Your reading life in one Vellum plugin. Track your TBR pile, get guilt-tripped about your backlog, find your next read, run your book club, and never miss a new release.

## Features

- **TBR pile tracker** - add books, see how long they've been sitting there, get guilt ratings from "fresh" to "ash"
- **Guilt engine** - gentle Balkan-mom energy reminders about neglected books. not mean, just... disappointed
- **Backlog purge** - surfaces your 3 most neglected books and asks which one you're committing to
- **Reading streaks** - track consecutive books finished, longest streak, weekly stats
- **Goodreads sync (RSS)** - pull live data from your Goodreads shelves via RSS feed. no file export needed, updates existing entries with richer metadata
- **Goodreads import (CSV)** - migrate your entire Goodreads library (TBR + reading history + ratings) from a CSV export
- **Book search** - powered by Open Library (no auth needed) with optional Hardcover integration for enhanced features

## Installation

```bash
assistant plugins install nightstand
```

Then restart your assistant.

## Usage

Just talk to your assistant naturally:

- "Add *The Three-Body Problem* to my pile"
- "What's in my TBR?"
- "I just finished *Project Hail Mary*, 5 stars"
- "Help me pick from my backlog"
- "How am I doing on reading this year?"
- "Sync my Goodreads from my RSS feed"

## Data sources

| Source | Auth | Used for |
|---|---|---|
| [Open Library](https://openlibrary.org/developers/api) | None | Book search, metadata, covers |
| [Hardcover](https://docs.hardcover.app) | API token (optional) | Reading lists, reviews, author following, taste recommendations |

No credentials required for core functionality. Add a Hardcover API token to unlock enhanced features.

## Plugin structure

```
nightstand/
├── package.json
├── tools/
│   ├── book-search.ts        # Search Open Library
│   ├── tbr-add.ts            # Add to TBR pile
│   ├── tbr-list.ts           # List TBR with guilt ratings
│   ├── tbr-complete.ts       # Mark as read + update streak
│   ├── tbr-purge.ts            # Backlog prioritization
│   ├── reading-stats.ts        # Streak, books, avg rating
│   ├── sync-goodreads.ts       # Goodreads RSS live sync
│   └── import-goodreads.ts     # Goodreads CSV import
├── skills/
│   └── nightstand/SKILL.md   # Orchestration + personality
└── src/
    ├── store.ts              # Local persistence + streak logic
    ├── openlibrary-client.ts # Open Library API client
    ├── hardcover-client.ts   # Hardcover GraphQL client
    └── guilt-engine.ts       # The personality layer
```

## License

MIT
