import React, { useEffect, useState } from 'react';

import {
  loadDeckAsSet,
  listDecks,
  deleteDeck,
  updateDeck,
  type Deck,
} from '../services/storageService';
import type { FlashcardSet } from '../types';
import '../styles/SavedDecksList.css';

interface SavedDecksListProps {
  onOpen: (set: FlashcardSet) => void;
}

const SavedDecksList: React.FC<SavedDecksListProps> = ({ onOpen }) => {
  const [decks, setDecks] = useState<Deck[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [renamingDeckId, setRenamingDeckId] = useState<string | null>(null);
  const [renameInput, setRenameInput] = useState<string>('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

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

  const handleDelete = async (deck: Deck): Promise<void> => {
    setError(null);
    setLoading(true);
    try {
      await deleteDeck(deck.id);
      await fetchDecks();
    } catch (e) {
      setError('Failed to delete deck');
    } finally {
      setLoading(false);
      setConfirmDeleteId(null);
    }
  };

  const handleRenameSave = async (deck: Deck): Promise<void> => {
    const trimmed = renameInput.trim();
    if (trimmed.length === 0) return;
    setError(null);
    setLoading(true);
    try {
      await updateDeck(deck.id, { title: trimmed });
      await fetchDecks();
    } catch (e) {
      setError('Failed to rename deck');
    } finally {
      setLoading(false);
      setRenamingDeckId(null);
      setRenameInput('');
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
                onClick={(): void => { handleOpen(d).catch(() => {}); }}
              >
                Open
              </button>
              {renamingDeckId === d.id ? (
                <>
                  <input
                    type="text"
                    className="saved-decks-rename-input"
                    value={renameInput}
                    onChange={(e): void => setRenameInput(e.target.value)}
                    placeholder="New title"
                  />
                  <button
                    type="button"
                    className="saved-decks-refresh"
                    onClick={(): void => { handleRenameSave(d).catch(() => {}); }}
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    className="saved-decks-refresh"
                    onClick={(): void => { setRenamingDeckId(null); setRenameInput(''); }}
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className="saved-decks-refresh"
                  onClick={(): void => { setRenamingDeckId(d.id); setRenameInput(d.title); }}
                >
                  Rename
                </button>
              )}
              {confirmDeleteId === d.id ? (
                <>
                  <button
                    type="button"
                    className="saved-decks-refresh"
                    onClick={(): void => { handleDelete(d).catch(() => {}); }}
                  >
                    Confirm delete
                  </button>
                  <button
                    type="button"
                    className="saved-decks-refresh"
                    onClick={(): void => { setConfirmDeleteId(null); }}
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className="saved-decks-refresh"
                  onClick={(): void => { setConfirmDeleteId(d.id); }}
                >
                  Delete
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default SavedDecksList;
