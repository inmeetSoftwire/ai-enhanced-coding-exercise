import React, { useEffect, useState } from 'react';
import {
  loadDeckAsSet, listDecks, deleteDeck, updateDeck, type Deck,
} from '../services/storageService';
import type { FlashcardSet } from '../types';
import '../styles/SavedDecksList.css';
import ConfirmModal from './ConfirmModal';
import PromptModal from './PromptModal';

interface SavedDecksListProps {
  onOpen: (set: FlashcardSet) => void;
}

const SavedDecksList = ({ onOpen } : SavedDecksListProps) => {
  const [decks, setDecks] = useState<Deck[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState<string>('');

  const fetchDecks = async (): Promise<void> => {
    setError(null);
    setLoading(true);
    try {
      const data = await listDecks();
      setDecks(data);
    } catch (e) {
      setError('Failed to load saved decks');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (deckId: string | null): Promise<void> => {
    if (!deckId) return;
    setError(null);
    setLoading(true);
    try {
      await deleteDeck(deckId);
      await fetchDecks();
      setConfirmingId(null);
    } catch (e) {
      setError('Failed to delete deck');
    } finally {
      setLoading(false);
    }
  };

  const handleRename = async (deck: Deck): Promise<void> => {
    const trimmed = renameValue.trim();
    if (trimmed.length === 0) return;
    setError(null);
    setLoading(true);
    try {
      await updateDeck(deck.id, { title: trimmed });
      await fetchDecks();
      setRenamingId(null);
      setRenameValue('');
    } catch (e) {
      setError('Failed to rename deck');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDecks().catch(() => {});
  }, []);

  const handleOpen = async (deck: Deck): Promise<void> => {
    setError(null);
    setLoading(true);
    try {
      const set = await loadDeckAsSet(deck);
      onOpen(set);
    } catch (e) {
      setError('Failed to open deck');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="saved-decks-container" data-component-name="SavedDecksList">
      <div className="saved-decks-header">
        <h3 className="saved-decks-title">Saved Decks</h3>
        <button
          type="button"
          className="saved-decks-refresh"
          onClick={(): void => { fetchDecks().catch(() => {}); }}
        >
          Refresh
        </button>
      </div>

      {loading === true && <p className="saved-decks-status">Loading...</p>}
      {error !== null && <p className="saved-decks-error">{error}</p>}
      {decks.length === 0 && loading === false && error === null && (
        <p className="saved-decks-status">No saved decks yet</p>
      )}

      <ul className="saved-decks-list">
        {decks.map((d) => (
          <li key={d.id} className="saved-decks-item">
            <div className="saved-deck-info">
              <span className="saved-deck-name" title={d.source ?? ''}>{d.title}</span>
              <span className="saved-deck-meta">
                {new Date(d.createdAt).toLocaleString()}
              </span>
            </div>
            <div className="saved-deck-actions">
              <button
                type="button"
                className="saved-deck-open"
                onClick={() => handleOpen(d)}
              >
                Open
              </button>
              <button
                type="button"
                className="saved-decks-refresh"
                onClick={() => {
                  setRenamingId(d.id);
                  setRenameValue(d.title);
                }}
              >
                Rename
              </button>
              <button
                type="button"
                className="saved-decks-refresh"
                onClick={() => setConfirmingId(d.id)}
              >
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>

      <ConfirmModal
        open={confirmingId !== null}
        message={`Confirm delete "${(decks.find((x) => x.id === confirmingId) ?? { title: '' }).title}"?`}
        onConfirm={() => handleDelete(confirmingId)}
        onCancel={(): void => { setConfirmingId(null); }}
      />

      <PromptModal
        open={renamingId !== null}
        message="Enter new deck title"
        value={renameValue}
        onChange={(next: string): void => { setRenameValue(next); }}
        onConfirm={(): void => {
          const deck = decks.find((x) => x.id === renamingId);
          if (deck !== undefined) { handleRename(deck).catch(() => {}); }
        }}
        onCancel={(): void => { setRenamingId(null); setRenameValue(''); }}
        confirmDisabled={renameValue.trim().length === 0}
      />
    </div>
  );
};

export default SavedDecksList;
