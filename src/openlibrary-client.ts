/**
 * Open Library API client.
 * Free, no auth required. Used as the primary book search + metadata source.
 * Docs: https://openlibrary.org/developers/api
 */

const BASE = "https://openlibrary.org";

export interface OlBook {
  title: string;
  author: string;
  coverUrl?: string;
  isbn?: string;
  olid?: string;
  publishYear?: number;
  pages?: number;
  description?: string;
  subjects?: string[];
}

export interface OlSearchResult {
  key: string;
  title: string;
  author_name?: string[];
  cover_i?: number;
  first_publish_year?: number;
  isbn?: string[];
  edition_count?: number;
}

export async function searchBooks(query: string, limit = 5): Promise<OlBook[]> {
  const url = `${BASE}/search.json?q=${encodeURIComponent(query)}&limit=${limit}&fields=key,title,author_name,cover_i,first_publish_year,isbn,edition_count`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Open Library search failed: ${res.status}`);
  const data = await res.json();
  return (data.docs as OlSearchResult[]).map(docToBook);
}

export async function getBookByIsbn(isbn: string): Promise<OlBook | null> {
  const url = `${BASE}/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Open Library ISBN lookup failed: ${res.status}`);
  const data = await res.json();
  const entry = data[`ISBN:${isbn}`];
  if (!entry) return null;
  return {
    title: entry.title,
    author: entry.authors?.[0]?.name ?? "Unknown",
    coverUrl: entry.cover?.medium,
    isbn,
    publishYear: entry.publish_date ? parseInt(entry.publish_date) : undefined,
    pages: entry.number_of_pages,
    subjects: entry.subjects?.map((s: { name: string }) => s.name).slice(0, 5),
  };
}

function docToBook(doc: OlSearchResult): OlBook {
  return {
    title: doc.title,
    author: doc.author_name?.[0] ?? "Unknown",
    coverUrl: doc.cover_i
      ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`
      : undefined,
    olid: doc.key,
    isbn: doc.isbn?.[0],
    publishYear: doc.first_publish_year,
  };
}
