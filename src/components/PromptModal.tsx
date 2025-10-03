import React from 'react';

interface PromptModalProps {
  open: boolean;
  message: React.ReactNode;
  value: string;
  onChange: (next: string) => void;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmDisabled?: boolean;
}

const PromptModal = ({
  open,
  message,
  value,
  onChange,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  confirmDisabled = false,
}: PromptModalProps): JSX.Element | null => {
  if (open === false) return null;
  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal-content">
        <div className="saved-deck-confirm-text">
          {message}
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
          />
        </div>
        <div className="modal-actions">
          <button
            type="button"
            className="saved-decks-refresh"
            onClick={onConfirm}
            disabled={confirmDisabled}
          >
            {confirmLabel}
          </button>
          <button type="button" className="saved-decks-refresh" onClick={onCancel}>
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PromptModal;
