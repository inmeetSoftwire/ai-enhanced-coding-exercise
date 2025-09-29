import axios from 'axios';

import { Flashcard, FlashcardSet } from '../types';
import { indexCards, removeDeck } from './chromaService';

export type Deck = {
  id: string;
  title: string;
  source: string | null;
  createdAt: string;
  updatedAt: string;
};

const API_BASE = (process.env.PROXY_BASE_URL !== undefined && process.env.PROXY_BASE_URL !== '')
  ? process.env.PROXY_BASE_URL
  : 'http://localhost:3001';

const client = axios.create({ baseURL: `${API_BASE}/api/storage` });

export const listDecks = async (): Promise<Deck[]> => {
  const res = await client.get<Deck[]>('/decks');
  return res.data;
};

export const createDeck = async (
  title: string,
  source: string | null,
): Promise<Deck> => {
  const res = await client.post<Deck>('/decks', { title, source });
  return res.data;
};

export const createCards = async (
  deckId: string,
  cards: Flashcard[],
): Promise<Flashcard[]> => {
  const payload = { cards: cards.map((c) => ({ question: c.question, answer: c.answer })) };
  const res = await client.post<Flashcard[]>(`/decks/${deckId}/cards`, payload);
  return res.data;
};

export const getDeckCards = async (deckId: string): Promise<Flashcard[]> => {
  type ApiCard = {
    id: string;
    deckId: string;
    question: string;
    answer: string;
    metadata: string | null;
    createdAt: string;
    updatedAt: string;
  };
  const res = await client.get<ApiCard[]>(`/decks/${deckId}/cards`);
  return res.data.map((c) => ({ id: c.id, question: c.question, answer: c.answer }));
};

export const loadDeckAsSet = async (deck: Deck): Promise<FlashcardSet> => {
  const cards = await getDeckCards(deck.id);
  return {
    title: deck.title,
    source: deck.source ?? 'Saved deck',
    cards,
    createdAt: new Date(deck.createdAt),
  };
};

export const saveSetAsDeck = async (set: FlashcardSet): Promise<Deck> => {
  const deck = await createDeck(set.title, set.source);
  await createCards(deck.id, set.cards);
  await indexCards(deck.id, set.cards, set.source);
  return deck;
};

export const deleteDeck = async (deckId: string): Promise<void> => {
  await client.delete(`/decks/${deckId}`);
  await removeDeck(deckId);
};

export const updateDeck = async (
  deckId: string,
  patch: { title?: string; source?: string | null },
): Promise<Deck> => {
  const res = await client.patch<Deck>(`/decks/${deckId}`, patch);
  return res.data;
};
