import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import SearchBar from '../../src/components/SearchBar';

jest.mock('../../src/services/ragService', () => ({
  searchCardsForQuery: jest.fn(),
}));

import { searchCardsForQuery } from '../../src/services/ragService';

describe('SearchBar (global)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders, submits query, and shows results', async () => {
    (searchCardsForQuery as jest.Mock).mockResolvedValueOnce([
      { id: '1', question: 'What is a lake?', answer: 'A large inland body of water.' },
      { id: '2', question: 'Define river', answer: 'A natural flowing watercourse.' },
    ]);

    render(<SearchBar />);

    const input = screen.getByLabelText('Search flashcards');
    fireEvent.change(input, { target: { value: 'bodies of water, excluding seas' } });

    const button = screen.getByRole('button', { name: 'Search' });
    fireEvent.click(button);

    await waitFor(() => {
      expect(searchCardsForQuery).toHaveBeenCalledWith('bodies of water, excluding seas');
    });

    expect(await screen.findByText('2 result(s)')).toBeInTheDocument();
    expect(screen.getByText('What is a lake?')).toBeInTheDocument();
    expect(screen.getByText('Define river')).toBeInTheDocument();
  });

  test('shows error when search fails', async () => {
    (searchCardsForQuery as jest.Mock).mockRejectedValueOnce(new Error('Boom'));

    render(<SearchBar />);

    const input = screen.getByLabelText('Search flashcards');
    fireEvent.change(input, { target: { value: 'query' } });

    const button = screen.getByRole('button', { name: 'Search' });
    fireEvent.click(button);

    expect(await screen.findByText('Boom')).toBeInTheDocument();
  });
});
