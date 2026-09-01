import React, { useId } from 'react';
import './ui.css';

function Field({ label, hint, error, id, as = 'input', children, ...props }) {
  const generatedId = useId();
  const fieldId = id || generatedId;
  const hintId = hint ? `${fieldId}-hint` : undefined;
  const errorId = error ? `${fieldId}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;
  const Control = as;

  return (
    <label className="ui-field" htmlFor={fieldId}>
      <span className="ui-field__label">{label}</span>
      <Control {...props} id={fieldId} aria-describedby={describedBy} aria-invalid={error ? 'true' : undefined}>
        {children}
      </Control>
      {hint && <span className="ui-field__hint" id={hintId}>{hint}</span>}
      {error && <span className="ui-field__error" id={errorId}>{error}</span>}
    </label>
  );
}

export default Field;
