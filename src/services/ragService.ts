import type { Flashcard } from '../types';
import { searchFlashcards } from './ragApi';

export type SearchOptions = {
  deckId?: string;
  k?: number;
};

export type ParsedQuery = {
  query: string;
  exclude: string[];
};

const splitTerms = (text: string): string[] => text
  .split(/,|\band\b/gi)
  .map((s) => s.trim())
  .filter((s) => s.length > 0)
  .map((s) => s.toLowerCase());

export const parseQuery = (raw: string): ParsedQuery => {
  const input = raw.trim();
  if (input.length === 0) {
    return { query: '', exclude: [] };
  }
  const m = input.match(/^(.*?)(?:,\s*excluding\s+(.+))?$/i);
  if (m === null) {
    return { query: input, exclude: [] };
  }
  const base = m[1].trim();
  const excludePart = m[2] !== undefined ? m[2].trim() : '';
  const exclude = excludePart.length > 0 ? splitTerms(excludePart) : [];
  return { query: base, exclude };
};

export const searchCardsForQuery = async (
  rawQuery: string,
  options?: SearchOptions,
): Promise<Flashcard[]> => {
  const { query, exclude } = parseQuery(rawQuery);
  const k = options?.k !== undefined ? options.k : 10;
  const deckId = options?.deckId;
  return searchFlashcards(query, k, { deckId, exclude });
};
