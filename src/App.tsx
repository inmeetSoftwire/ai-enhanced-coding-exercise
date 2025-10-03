import React, { useState } from 'react';

import FlashcardViewer from './components/FlashcardViewer';
import InputForm from './components/InputForm';
import SavedDecksList from './components/SavedDecksList';
import SearchBar from './components/SearchBar';
import { FlashcardSet } from './types';
import './styles/App.css';

const App = () => {
  const [flashcardSet, setFlashcardSet] = useState<FlashcardSet | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="app-container">
      <header>
        <h1>Flashcard Extractor</h1>
        <p>Extract flashcards from Wikipedia articles or text</p>
        <SearchBar />
      </header>

      <main>
        {flashcardSet === null ? (
          <>
            <SavedDecksList onOpen={(set): void => setFlashcardSet(set)} />
            <InputForm
              setFlashcardSet={setFlashcardSet}
              setLoading={setLoading}
              setError={setError}
            />
          </>
        ) : (
          <FlashcardViewer
            flashcardSet={flashcardSet}
            onReset={() => setFlashcardSet(null)}
          />
        )}

        {loading === true && <div className="loader">Generating flashcards...</div>}
        {error !== null && <div className="error">{error}</div>}
      </main>

      <footer>
        <p>
          ©
          {' '}
          {new Date().getFullYear()}
          {' '}
          Flashcard Extractor
        </p>
      </footer>
    </div>
  );
};

export default App;
