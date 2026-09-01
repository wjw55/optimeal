import React, { useEffect, useId, useRef } from 'react';
import Button from './Button';
import './ui.css';

function Modal({ open, title, children, confirmLabel = 'Confirm', pending = false, onConfirm, onClose, danger = false }) {
  const titleId = useId();
  const cancelRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const previous = document.activeElement;
    cancelRef.current?.focus();
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !pending) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      previous?.focus?.();
    };
  }, [open, onClose, pending]);

  if (!open) return null;

  return (
    <div className="ui-modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && !pending && onClose()}>
      <section className="ui-modal" role="alertdialog" aria-modal="true" aria-labelledby={titleId}>
        <h2 id={titleId}>{title}</h2>
        {children}
        <div className="ui-modal__actions">
          <Button ref={cancelRef} variant="secondary" type="button" onClick={onClose} disabled={pending}>Cancel</Button>
          <Button variant={danger ? 'danger' : 'primary'} type="button" onClick={onConfirm} pending={pending}>{confirmLabel}</Button>
        </div>
      </section>
    </div>
  );
}

export default Modal;
