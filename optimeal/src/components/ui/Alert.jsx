import React from 'react';
import './ui.css';

function Alert({ children, variant = 'success', className = '' }) {
  const isError = variant === 'error';
  return (
    <div
      className={`ui-alert ui-alert--${variant} ${className}`.trim()}
      role={isError ? 'alert' : 'status'}
      aria-live={isError ? 'assertive' : 'polite'}
    >
      {children}
    </div>
  );
}

export default Alert;
