import React, { useEffect, useState } from 'react';

import {
  loadDeckAsSet, listDecks, deleteDeck, updateDeck, type Deck,
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

  const handleDelete = async (deck: Deck): Promise<void> => {
    setError(null);
    setLoading(true);
    try {
      await deleteDeck(deck.id);
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
                onClick={(): void => { handleOpen(d).catch(() => {}); }}
              >
                Open
              </button>
              <button
                type="button"
                className="saved-decks-refresh"
                onClick={(): void => {
                  setRenamingId(d.id);
                  setRenameValue(d.title);
                }}
              >
                Rename
              </button>
              <button
                type="button"
                className="saved-decks-refresh"
                onClick={(): void => { setConfirmingId(d.id); }}
              >
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>

      {confirmingId !== null && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal-content">
            <p className="saved-deck-confirm-text">
              {`Confirm delete "${(decks.find((x) => x.id === confirmingId) ?? { title: '' }).title}"?`}
            </p>
            <div className="modal-actions">
              <button
                type="button"
                className="saved-decks-refresh"
                onClick={(): void => {
                  const deck = decks.find((x) => x.id === confirmingId);
                  if (deck !== undefined) { handleDelete(deck).catch(() => {}); }
                }}
              >
                Confirm
              </button>
              <button
                type="button"
                className="saved-decks-refresh"
                onClick={(): void => { setConfirmingId(null); }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {renamingId !== null && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal-content">
            <div className="saved-deck-confirm-text">
              Enter new deck title
              <input
                type="text"
                value={renameValue}
                onChange={(e: React.ChangeEvent<HTMLInputElement>): void => {
                  setRenameValue(e.target.value);
                }}
              />
            </div>
            <div className="modal-actions">
              <button
                type="button"
                className="saved-decks-refresh"
                onClick={(): void => {
                  const deck = decks.find((x) => x.id === renamingId);
                  if (deck !== undefined) { handleRename(deck).catch(() => {}); }
                }}
                disabled={renameValue.trim().length === 0}
              >
                Confirm
              </button>
              <button
                type="button"
                className="saved-decks-refresh"
                onClick={(): void => { setRenamingId(null); setRenameValue(''); }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SavedDecksList;
