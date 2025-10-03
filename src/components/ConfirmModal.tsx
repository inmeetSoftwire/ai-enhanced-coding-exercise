import React from 'react';

interface ConfirmModalProps {
  open: boolean;
  message: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmModal = ({
  open,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
}: ConfirmModalProps): JSX.Element | null => {
  if (open === false) return null;
  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal-content">
        <div className="saved-deck-confirm-text">{message}</div>
        <div className="modal-actions">
          <button type="button" className="saved-decks-refresh" onClick={onConfirm}>
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

export default ConfirmModal;
