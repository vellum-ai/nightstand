/**
 * Hardcover GraphQL API client.
 * Optional, requires a user API token from hardcover.app/account.
 * Used for enhanced features: reading lists, reviews, author following,
 * taste-based recommendations.
 * Docs: https://docs.hardcover.app
 */

const ENDPOINT = "https://api.hardcover.app/v1/graphql";

export interface HcBook {
  title: string;
  author: string;
  coverUrl?: string;
  rating?: number;
  pages?: number;
  description?: string;
  bookId?: number;
}

async function hcQuery<T>(
  token: string,
  query: string,
  variables?: Record<string, unknown>,
): Promise<T> {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new Error(`Hardcover API error: ${res.status}`);
  const json = await res.json();
  if (json.errors) throw new Error(`Hardcover GraphQL errors: ${JSON.stringify(json.errors)}`);
  return json.data as T;
}

export async function hcSearchBooks(
  token: string,
  query: string,
  limit = 5,
): Promise<HcBook[]> {
  const q = `
    query Search($query: String!, $limit: Int!) {
      search(query: $query, query_type: "books", per_page: $limit, page: 1) {
        results {
          book {
            id
            title
            cached_image_url
            pages
            description
            contributions {
              author {
                name
              }
            }
            rating
          }
        }
      }
    }`;
  const data = await hcQuery<{ search: { results: { book: { id: number; title: string; cached_image_url?: string; pages?: number; description?: string; contributions: { author: { name: string } }[]; rating?: number } }[] } }>(token, q, { query, limit });
  return data.search.results.map((r) => ({
    title: r.book.title,
    author: r.book.contributions?.[0]?.author?.name ?? "Unknown",
    coverUrl: r.book.cached_image_url,
    pages: r.book.pages,
    description: r.book.description,
    rating: r.book.rating,
    bookId: r.book.id,
  }));
}

export async function hcGetReadingList(
  token: string,
  listStatus: "to_read" | "reading" | "read",
): Promise<HcBook[]> {
  const q = `
    query ReadingList($status: String!) {
      me {
        user_books(status: $status) {
          book {
            id
            title
            cached_image_url
            pages
            contributions {
              author { name }
            }
            rating
          }
        }
      }
    }`;
  interface HcReadingListResponse {
    me: {
      user_books: {
        book: {
          id: number;
          title: string;
          cached_image_url?: string;
          pages?: number;
          contributions: { author: { name: string } }[];
          rating?: number;
        };
      }[];
    };
  }
  const data = await hcQuery<HcReadingListResponse>(token, q, { status: listStatus });
  return data.me.user_books.map((ub) => ({
    title: ub.book.title,
    author: ub.book.contributions?.[0]?.author?.name ?? "Unknown",
    coverUrl: ub.book.cached_image_url,
    pages: ub.book.pages,
    rating: ub.book.rating,
    bookId: ub.book.id,
  }));
}

export async function hcRecommendFromHistory(
  token: string,
  readBooks: { title: string; author: string; rating?: number }[],
): Promise<string> {
  // Hardcover doesn't have a direct "recommend from my history" endpoint,
  // so we build a taste profile string from the user's top-rated books
  // and search for similar books. The actual recommendation logic lives
  // in the read-next tool, which calls this to get candidate books.
  const topRated = readBooks
    .filter((b) => b.rating && b.rating >= 4)
    .slice(0, 5)
    .map((b) => `${b.title} ${b.author}`)
    .join(", ");
  return topRated || "popular fiction";
}
