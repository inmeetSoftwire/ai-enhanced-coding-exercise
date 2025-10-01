import axios, { AxiosInstance } from 'axios';

import type { Flashcard } from '../types';

const getClient: () => AxiosInstance = (): AxiosInstance => {
  const API_BASE = (process.env.PROXY_BASE_URL !== undefined && process.env.PROXY_BASE_URL !== '')
    ? process.env.PROXY_BASE_URL
    : 'http://localhost:3001';
  return axios.create({ baseURL: `${API_BASE}/api/rag` });
};

export async function indexCards(
  deckId: string,
  cards: Flashcard[],
  source?: string,
): Promise<void> {
  const client = getClient();
  await client.post('/index', { deckId, cards, source });
}

export async function removeDeck(deckId: string): Promise<void> {
  const client = getClient();
  await client.delete(`/decks/${deckId}`);
}

export async function searchFlashcards(
  query: string,
  k: number = 10,
  opts?: { deckId?: string; exclude?: string[] },
): Promise<Flashcard[]> {
  const client = getClient();
  const params = new URLSearchParams();
  params.set('q', query);
  params.set('k', String(k));
  if (opts?.deckId !== undefined) params.set('deckId', opts.deckId);
  if (opts?.exclude !== undefined && opts.exclude.length > 0) {
    params.set('exclude', opts.exclude.join(','));
  }
  const res = await client.get<{ cards: Flashcard[] }>(`/search?${params.toString()}`);
  return res.data.cards;
}
