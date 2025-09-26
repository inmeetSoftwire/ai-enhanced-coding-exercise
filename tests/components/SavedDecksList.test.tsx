import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';

import SavedDecksList from '../../src/components/SavedDecksList';
import type { Deck } from '../../src/services/storageService';
import type { FlashcardSet } from '../../src/types';

jest.mock('../../src/services/storageService', () => {
  return {
    __esModule: true,
    listDecks: jest.fn(),
    loadDeckAsSet: jest.fn(),
    deleteDeck: jest.fn(),
  };
});

const { listDecks, loadDeckAsSet, deleteDeck } = jest.requireMock('../../src/services/storageService') as {
  listDecks: jest.Mock;
  loadDeckAsSet: jest.Mock;
  deleteDeck: jest.Mock;
};

describe('SavedDecksList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('deletes a deck and refreshes list', async () => {
    const decks: Deck[] = [
      {
        id: 'd3',
        name: 'Deck To Delete',
        description: 'desc',
        createdAt: new Date('2024-03-01T00:00:00Z').toISOString(),
        updatedAt: new Date('2024-03-01T00:00:00Z').toISOString(),
      },
    ];
    (listDecks as jest.Mock).mockResolvedValueOnce(decks).mockResolvedValueOnce([]);
    (deleteDeck as jest.Mock).mockResolvedValueOnce(undefined);

    // Stub confirm to return true
    const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);

    const onOpen = jest.fn();
    render(<SavedDecksList onOpen={onOpen} />);

    await waitFor(() => {
      expect(screen.getByText('Deck To Delete')).toBeInTheDocument();
    });

    const deleteBtn = screen.getByRole('button', { name: 'Delete' });
    fireEvent.click(deleteBtn);

    await waitFor(() => {
      expect(deleteDeck).toHaveBeenCalledWith('d3');
      expect(listDecks).toHaveBeenCalledTimes(2);
      expect(screen.getByText('No saved decks yet')).toBeInTheDocument();
    });

    confirmSpy.mockRestore();
  });

  test('renders header and empty state', async () => {
    (listDecks as jest.Mock).mockResolvedValueOnce([] as Deck[]);

    const onOpen = jest.fn();
    render(<SavedDecksList onOpen={onOpen} />);

    expect(screen.getByText('Saved Decks')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Refresh' })).toBeInTheDocument();

    // Loading appears first
    expect(screen.getByText('Loading...')).toBeInTheDocument();

    // Then empty state
    await waitFor(() => {
      expect(screen.getByText('No saved decks yet')).toBeInTheDocument();
    });
  });

  test('renders a list of decks and opens one', async () => {
    const decks: Deck[] = [
      {
        id: 'd1',
        name: 'Custom Text Flashcards',
        description: 'Custom text',
        createdAt: new Date('2024-01-01T00:00:00Z').toISOString(),
        updatedAt: new Date('2024-01-01T00:00:00Z').toISOString(),
      },
    ];
    (listDecks as jest.Mock).mockResolvedValueOnce(decks);

    const set: FlashcardSet = {
      title: 'Custom Text Flashcards',
      source: 'Custom text',
      createdAt: new Date('2024-01-01T00:00:00Z'),
      cards: [
        { id: 'c1', question: 'Q1', answer: 'A1' },
        { id: 'c2', question: 'Q2', answer: 'A2' },
      ],
    };
    (loadDeckAsSet as jest.Mock).mockResolvedValueOnce(set);

    const onOpen = jest.fn();
    render(<SavedDecksList onOpen={onOpen} />);

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('Custom Text Flashcards')).toBeInTheDocument();
    });

    const openButton = screen.getByRole('button', { name: 'Open' });
    fireEvent.click(openButton);

    await waitFor(() => {
      expect(loadDeckAsSet).toHaveBeenCalledWith(decks[0]);
      expect(onOpen).toHaveBeenCalledWith(set);
    });
  });

  test('refresh button reloads decks', async () => {
    const decksFirst: Deck[] = [];
    const decksSecond: Deck[] = [
      {
        id: 'd2',
        name: 'Biology 101',
        description: 'Intro deck',
        createdAt: new Date('2024-02-01T00:00:00Z').toISOString(),
        updatedAt: new Date('2024-02-01T00:00:00Z').toISOString(),
      },
    ];

    (listDecks as jest.Mock)
      .mockResolvedValueOnce(decksFirst)
      .mockResolvedValueOnce(decksSecond);

    const onOpen = jest.fn();
    render(<SavedDecksList onOpen={onOpen} />);

    // Initial empty state
    await waitFor(() => {
      expect(screen.getByText('No saved decks yet')).toBeInTheDocument();
    });

    // Click refresh and expect new deck
    const refreshBtn = screen.getByRole('button', { name: 'Refresh' });
    fireEvent.click(refreshBtn);

    await waitFor(() => {
      expect(screen.getByText('Biology 101')).toBeInTheDocument();
    });
  });
});
