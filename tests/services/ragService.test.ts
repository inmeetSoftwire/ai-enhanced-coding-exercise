import { parseQuery, searchCardsForQuery } from '../../src/services/ragService';
import type { Flashcard } from '../../src/types';

jest.mock('../../src/services/chromaService', () => ({
  searchFlashcards: jest.fn(),
}));

import { searchFlashcards } from '../../src/services/chromaService';

describe('ragService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('parseQuery', () => {
    test('returns base query when no exclusions', () => {
      const res = parseQuery('bodies of water');
      expect(res).toEqual({ query: 'bodies of water', exclude: [] });
    });

    test('parses single exclusion term', () => {
      const res = parseQuery('bodies of water, excluding seas');
      expect(res.query).toBe('bodies of water');
      expect(res.exclude).toEqual(['seas']);
    });

    test('parses multiple exclusions separated by commas and and', () => {
      const res = parseQuery('plants, excluding trees, shrubs and moss');
      expect(res.query).toBe('plants');
      expect(res.exclude).toEqual(['trees', 'shrubs', 'moss']);
    });

    test('handles extra whitespace and casing', () => {
      const res = parseQuery('  Topic X  ,   ExClUdInG   Term A, term B  ');
      expect(res.query).toBe('Topic X');
      expect(res.exclude).toEqual(['term a', 'term b']);
    });

    test('empty input yields empty query', () => {
      const res = parseQuery('   ');
      expect(res).toEqual({ query: '', exclude: [] });
    });
  });

  describe('searchCardsForQuery', () => {
    test('delegates to searchFlashcards with extracted exclude and defaults', async () => {
      const mockCards: Flashcard[] = [
        { id: '1', question: 'Q1', answer: 'A1' },
      ];
      (searchFlashcards as jest.Mock).mockResolvedValueOnce(mockCards);

      const result = await searchCardsForQuery('topic, excluding x, y');

      expect(searchFlashcards).toHaveBeenCalledWith('topic', 10, { deckId: undefined, exclude: ['x', 'y'] });
      expect(result).toEqual(mockCards);
    });

    test('passes deckId and k when provided', async () => {
      (searchFlashcards as jest.Mock).mockResolvedValueOnce([]);

      await searchCardsForQuery('marine life, excluding seas', { deckId: 'deck-123', k: 25 });

      expect(searchFlashcards).toHaveBeenCalledWith('marine life', 25, { deckId: 'deck-123', exclude: ['seas'] });
    });
  });
});
