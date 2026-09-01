import React, { forwardRef } from 'react';
import './ui.css';

const Button = forwardRef(function Button({ children, variant = 'primary', block = false, pending = false, disabled, ...props }, ref) {
  const className = [
    'ui-button',
    `ui-button--${variant}`,
    block ? 'ui-button--block' : '',
    props.className || ''
  ].filter(Boolean).join(' ');

  return (
    <button {...props} ref={ref} className={className} disabled={disabled || pending} aria-busy={pending || undefined}>
      {pending && <span className="ui-spinner" aria-hidden="true" />}
      {children}
    </button>
  );
});

export default Button;
