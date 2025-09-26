import axios from 'axios';

const mockGet = jest.fn();
const mockPost = jest.fn();
const mockDelete = jest.fn();

jest.mock('axios', () => {
  const create = jest.fn(() => ({ get: mockGet, post: mockPost, delete: mockDelete }));
  return {
    __esModule: true,
    default: { create },
  };
});

import {
  listDecks,
  createDeck,
  createCards,
  getDeckCards,
  loadDeckAsSet,
  saveSetAsDeck,
  type Deck,
} from '../../src/services/storageService';
import type { FlashcardSet } from '../../src/types';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('storageService', () => {
  test('listDecks calls GET /decks and returns decks', async () => {
    const decks: Deck[] = [
      {
        id: 'd1',
        title: 'Biology 101',
        source: 'Intro deck',
        createdAt: new Date('2024-01-01T00:00:00Z').toISOString(),
        updatedAt: new Date('2024-01-01T00:00:00Z').toISOString(),
      },
    ];
    mockGet.mockResolvedValueOnce({ data: decks });

    const res = await listDecks();

    expect(mockGet).toHaveBeenCalledWith('/decks');
    expect(res).toEqual(decks);
  });

  test('createDeck posts to /decks and returns created deck', async () => {
    const created: Deck = {
      id: 'd2',
      title: 'Custom Text Flashcards',
      source: 'Custom text',
      createdAt: new Date('2024-02-01T00:00:00Z').toISOString(),
      updatedAt: new Date('2024-02-01T00:00:00Z').toISOString(),
    };
    mockPost.mockResolvedValueOnce({ data: created });

    const res = await createDeck('Custom Text Flashcards', 'Custom text');

    expect(mockPost).toHaveBeenCalledWith('/decks', {
      title: 'Custom Text Flashcards',
      source: 'Custom text',
    });
    expect(res).toEqual(created);
  });

  test('createCards posts normalized cards and returns created', async () => {
    const deckId = 'd1';
    const cards = [
      { id: 'c1', question: 'Q1', answer: 'A1' },
      { id: 'c2', question: 'Q2', answer: 'A2' },
    ];
    const created = [
      { id: 'c1', question: 'Q1', answer: 'A1' },
      { id: 'c2', question: 'Q2', answer: 'A2' },
    ];
    mockPost.mockResolvedValueOnce({ data: created });

    const res = await createCards(deckId, cards);

    expect(mockPost).toHaveBeenCalledWith(`/decks/${deckId}/cards`, {
      cards: [
        { question: 'Q1', answer: 'A1' },
        { question: 'Q2', answer: 'A2' },
      ],
    });
    expect(res).toEqual(created);
  });

  test('getDeckCards maps API cards to Flashcard shape', async () => {
    const deckId = 'd3';
    const apiCards = [
      {
        id: 'x1', deckId, question: 'Q', answer: 'A', metadata: null,
        createdAt: new Date('2024-03-01T00:00:00Z').toISOString(),
        updatedAt: new Date('2024-03-01T00:00:00Z').toISOString(),
      },
    ];
    mockGet.mockResolvedValueOnce({ data: apiCards });

    const res = await getDeckCards(deckId);

    expect(mockGet).toHaveBeenCalledWith(`/decks/${deckId}/cards`);
    expect(res).toEqual([{ id: 'x1', question: 'Q', answer: 'A' }]);
  });

  test('loadDeckAsSet composes FlashcardSet from deck + cards', async () => {
    const deck: Deck = {
      id: 'd4',
      title: 'Chemistry',
      source: 'Saved deck',
      createdAt: new Date('2024-04-01T00:00:00Z').toISOString(),
      updatedAt: new Date('2024-04-01T00:00:00Z').toISOString(),
    };
    const apiCards = [
      {
        id: 'x1', deckId: deck.id, question: 'Q', answer: 'A', metadata: null,
        createdAt: new Date('2024-04-01T00:00:00Z').toISOString(),
        updatedAt: new Date('2024-04-01T00:00:00Z').toISOString(),
      },
    ];
    mockGet.mockResolvedValueOnce({ data: apiCards });

    const set = await loadDeckAsSet(deck);

    expect(mockGet).toHaveBeenCalledWith(`/decks/${deck.id}/cards`);
    expect(set).toEqual({
      title: 'Chemistry',
      source: 'Saved deck',
      createdAt: new Date(deck.createdAt),
      cards: [{ id: 'x1', question: 'Q', answer: 'A' }],
    });
  });

  test('saveSetAsDeck creates deck then posts cards', async () => {
    const set: FlashcardSet = {
      title: 'Physics',
      source: 'Custom text',
      createdAt: new Date('2024-05-01T00:00:00Z'),
      cards: [
        { id: 'a1', question: 'Q1', answer: 'A1' },
        { id: 'a2', question: 'Q2', answer: 'A2' },
      ],
    };

    const createdDeck: Deck = {
      id: 'deck-xyz',
      title: 'Physics',
      source: 'Custom text',
      createdAt: new Date('2024-05-01T00:00:00Z').toISOString(),
      updatedAt: new Date('2024-05-01T00:00:00Z').toISOString(),
    };

    // First POST: create deck
    mockPost.mockResolvedValueOnce({ data: createdDeck });
    // Second POST: create cards
    mockPost.mockResolvedValueOnce({ data: set.cards });

    const deck = await saveSetAsDeck(set);

    expect(mockPost).toHaveBeenNthCalledWith(1, '/decks', {
      title: 'Physics',
      source: 'Custom text',
    });
    expect(mockPost).toHaveBeenNthCalledWith(2, `/decks/${createdDeck.id}/cards`, {
      cards: [
        { question: 'Q1', answer: 'A1' },
        { question: 'Q2', answer: 'A2' },
      ],
    });
    expect(deck).toEqual(createdDeck);
  });

  test('deleteDeck calls DELETE /decks/:deckId', async () => {
    const { deleteDeck } = await import('../../src/services/storageService');
    const deckId = 'deck-xyz';
    mockDelete.mockResolvedValueOnce({ status: 204 });

    await deleteDeck(deckId);

    expect(mockDelete).toHaveBeenCalledWith(`/decks/${deckId}`);
  });
});
