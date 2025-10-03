import React, { useState } from 'react';

import { searchCardsForQuery } from '../services/ragService';
import type { Flashcard } from '../types';

import '../styles/SearchBar.css';

type SearchBarProps = {
  placeholder?: string;
};

const SearchBar = ({ placeholder } : SearchBarProps) => {
  const [query, setQuery] = useState<string>('');
  const [results, setResults] = useState<Flashcard[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const cards = await searchCardsForQuery(query);
      setResults(cards);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Search failed';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="container" aria-label="Global search">
      <form onSubmit={(e): void => { onSubmit(e).catch(() => {}); }} className="form">
        <input
          className="input"
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder ?? 'Search (e.g. "bodies of water, excluding seas")'}
          aria-label="Search flashcards"
        />
        <button className="button" type="submit" disabled={loading === true}>
          {loading === true ? 'Searching…' : 'Search'}
        </button>
      </form>

      {error !== null && <div className="error">{error}</div>}

      {results.length > 0 && (
        <div className="results">
          <div className="summary">
            {results.length}
            {' '}
            result(s)
          </div>
          <ul className="list">
            {results.map((card) => (
              <li key={card.id} className="item">
                <div className="q">{card.question}</div>
                <div className="a">{card.answer}</div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
};

export default SearchBar;
