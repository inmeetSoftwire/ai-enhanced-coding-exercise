import React, { useState } from 'react';

import type { Flashcard } from '../types';
import { searchCardsForQuery } from '../services/ragService';
import  '../styles/SearchBar.css';

type Props = {
  placeholder?: string;
};

const SearchBar: React.FC<Props> = ({ placeholder }): JSX.Element => {
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
    <section className='container' aria-label="Global search">
      <form onSubmit={onSubmit} className='form'>
        <input
          className='input'
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder ?? 'Search (e.g. "bodies of water, excluding seas")'}
          aria-label="Search flashcards"
        />
        <button className='button' type="submit" disabled={loading === true}>
          {loading === true ? 'Searching…' : 'Search'}
        </button>
      </form>

      {error !== null && <div className='error'>{error}</div>}

      {results.length > 0 && (
        <div className='results'>
          <div className='summary'>{results.length} result(s)</div>
          <ul className='list'>
            {results.map((c) => (
              <li key={c.id} className='item'>
                <div className='q'>{c.question}</div>
                <div className='a'>{c.answer}</div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
};

export default SearchBar;
