import React from 'react';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';

import SavedDecksList from '../../src/components/SavedDecksList';
import type { Deck } from '../../src/services/storageService';
import type { FlashcardSet } from '../../src/types';

jest.mock('../../src/services/storageService', () => {
  return {
    __esModule: true,
    listDecks: jest.fn(),
    loadDeckAsSet: jest.fn(),
    deleteDeck: jest.fn(),
    updateDeck: jest.fn(),
  };
});

const { listDecks, loadDeckAsSet, deleteDeck, updateDeck } = jest.requireMock('../../src/services/storageService') as {
  listDecks: jest.Mock;
  loadDeckAsSet: jest.Mock;
  deleteDeck: jest.Mock;
  updateDeck: jest.Mock;
};

describe('SavedDecksList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renames a deck and refreshes list', async () => {
    const decks: Deck[] = [
      {
        id: 'd9',
        title: 'Old Title',
        source: 'desc',
        createdAt: new Date('2024-03-01T00:00:00Z').toISOString(),
        updatedAt: new Date('2024-03-01T00:00:00Z').toISOString(),
      },
    ];
    const renamed: Deck = { ...decks[0], title: 'New Title' };
    (listDecks as jest.Mock).mockResolvedValueOnce(decks).mockResolvedValueOnce([renamed]);
    (updateDeck as jest.Mock).mockResolvedValueOnce(renamed);

    const onOpen = jest.fn();
    render(<SavedDecksList onOpen={onOpen} />);

    await waitFor(() => {
      expect(screen.getByText('Old Title')).toBeInTheDocument();
    });

    const renameBtn = screen.getByRole('button', { name: 'Rename' });
    fireEvent.click(renameBtn);

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Enter new deck title')).toBeInTheDocument();
    });

    const dialog = screen.getByRole('dialog');
    const input = within(dialog).getByRole('textbox') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'New Title' } });

    const confirmBtn = screen.getByRole('button', { name: 'Confirm' });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(updateDeck).toHaveBeenCalledWith('d9', { title: 'New Title' });
      expect(listDecks).toHaveBeenCalledTimes(2);
      expect(screen.getByText('New Title')).toBeInTheDocument();
    });
  });

  test('deletes a deck and refreshes list', async () => {
    const decks: Deck[] = [
      {
        id: 'd3',
        title: 'Deck To Delete',
        source: 'desc',
        createdAt: new Date('2024-03-01T00:00:00Z').toISOString(),
        updatedAt: new Date('2024-03-01T00:00:00Z').toISOString(),
      },
    ];
    (listDecks as jest.Mock).mockResolvedValueOnce(decks).mockResolvedValueOnce([]);
    (deleteDeck as jest.Mock).mockResolvedValueOnce(undefined);

    const onOpen = jest.fn();
    render(<SavedDecksList onOpen={onOpen} />);

    await waitFor(() => {
      expect(screen.getByText('Deck To Delete')).toBeInTheDocument();
    });

    const deleteBtn = screen.getByRole('button', { name: 'Delete' });
    fireEvent.click(deleteBtn);

    // Confirmation UI should appear; confirm deletion
    await waitFor(() => {
      expect(screen.getByText('Confirm delete "Deck To Delete"?')).toBeInTheDocument();
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
    const confirmBtn = screen.getByRole('button', { name: 'Confirm' });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(deleteDeck).toHaveBeenCalledWith('d3');
      expect(listDecks).toHaveBeenCalledTimes(2);
      expect(screen.getByText('No saved decks yet')).toBeInTheDocument();
    });

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
        title: 'Custom Text Flashcards',
        source: 'Custom text',
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
        title: 'Biology 101',
        source: 'Intro deck',
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
